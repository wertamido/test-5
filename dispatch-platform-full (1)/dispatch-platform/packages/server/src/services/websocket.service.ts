/**
 * WebSocket Service
 * 
 * Handles all real-time communication:
 * - Live location tracking
 * - Load updates
 * - Bid notifications
 * - Trip status updates
 * - Chat messages
 * - Push notifications
 * 
 * Supports horizontal scaling via Redis pub/sub
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { authenticate } from '../middleware/auth.middleware';
import { database } from '../config/database';
import { LocationCache, PubSub } from '../config/redis';
import { SOCKET_EVENTS } from '@dispatch/shared';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

class WebSocketService {
  private io: Server | null = null;
  private pubsub: PubSub | null = null;
  private locationCache: LocationCache | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds

  /**
   * Initialize WebSocket server with HTTP server
   */
  initialize(server: HTTPServer): void {
    this.io = new Server(server, {
      cors: {
        origin: (process.env.WS_CORS_ORIGIN || 'http://localhost:3000').split(','),
        credentials: true,
      },
      pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '20000', 10),
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for file uploads via socket
    });

    // Initialize Redis pub/sub for scaling
    this.pubsub = new PubSub();
    this.locationCache = LocationCache.getInstance();

    // Middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          // Allow anonymous connections (limited access)
          socket.data.userId = null;
          return next();
        }

        // Verify JWT
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', {
          algorithms: ['HS256'],
          issuer: 'freight-connect',
          audience: 'freight-connect-api',
        });

        // Fetch user
        const user = await database.queryOne<{ id: string; role: string; status: string }>(
          'SELECT id, role, status FROM users WHERE id = $1',
          [payload.userId]
        );

        if (!user || user.status !== 'active') {
          return next(new Error('Authentication failed'));
        }

        socket.data.userId = user.id;
        socket.data.userRole = user.role;
        next();
      } catch (error) {
        logger.warn('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => this.handleConnection(socket as AuthenticatedSocket));

    // Subscribe to Redis channels for cross-instance communication
    this.subscribeToChannels();

    logger.info('✅ WebSocket service initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.data.userId;

    if (userId) {
      // Track connected sockets
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Update user online status
      this.updateUserOnlineStatus(userId, true);

      logger.debug(`User ${userId} connected (socket: ${socket.id})`);
    }

    // ==========================================================================
    // LOCATION TRACKING
    // ==========================================================================

    socket.on(SOCKET_EVENTS.LOCATION_UPDATE, async (data) => {
      if (!userId) return;

      try {
        const { tripId, latitude, longitude, speed, heading, accuracy } = data;

        // Validate data
        if (!tripId || !latitude || !longitude) return;

        // Store in Redis (fast access for live tracking)
        await this.locationCache!.setLiveLocation(tripId, {
          latitude, longitude, speed: speed || 0, heading: heading || 0,
        });

        // Add to history
        await this.locationCache!.addLocationHistory(tripId, {
          latitude, longitude, speed: speed || 0, heading: heading || 0,
        });

        // Broadcast to load/client room
        const trip = await database.queryOne<{ load_id: string; trucker_id: string }>(
          'SELECT load_id, trucker_id FROM trips WHERE id = $1',
          [tripId]
        );

        if (trip) {
          // Emit to load-specific room
          this.io!.to(`load:${trip.load_id}`).emit(SOCKET_EVENTS.LOCATION_UPDATE, {
            tripId,
            location: { latitude, longitude, speed, heading, accuracy },
            timestamp: Date.now(),
          });

          // Also emit to client
          const load = await database.queryOne<{ client_id: string }>(
            'SELECT client_id FROM loads WHERE id = $1',
            [trip.load_id]
          );
          if (load) {
            this.emitToUser(load.client_id, SOCKET_EVENTS.LOCATION_UPDATE, {
              tripId,
              location: { latitude, longitude, speed, heading, accuracy },
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        logger.error('Location update error:', error);
      }
    });

    // ==========================================================================
    // JOIN ROOMS
    // ==========================================================================

    socket.on('room:join', async (data) => {
      const { room, type } = data; // type: 'load', 'trip', 'conversation'

      if (!userId) return;

      // Verify permission to join the room
      const hasAccess = await this.verifyRoomAccess(userId, room, type);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to room' });
        return;
      }

      socket.join(`${type}:${room}`);
      logger.debug(`User ${userId} joined room: ${type}:${room}`);
    });

    socket.on('room:leave', (data) => {
      const { room, type } = data;
      socket.leave(`${type}:${room}`);
    });

    // ==========================================================================
    // TYPING INDICATORS
    // ==========================================================================

    socket.on(SOCKET_EVENTS.TYPING_START, (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_START, {
        userId,
        conversationId,
        timestamp: Date.now(),
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
        userId,
        conversationId,
        timestamp: Date.now(),
      });
    });

    // ==========================================================================
    // MESSAGE READ RECEIPTS
    // ==========================================================================

    socket.on('message:read', async (data) => {
      const { conversationId, messageId } = data;
      if (!userId) return;

      // Mark as read in database
      await database.query(
        `UPDATE messages SET is_read = TRUE, read_by = array_append(COALESCE(read_by, '{}'), $1::uuid)
         WHERE conversation_id = $2 AND id = $3`,
        [userId, conversationId, messageId]
      );

      // Notify other participants
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
        conversationId,
        messageId,
        userId,
        timestamp: Date.now(),
      });
    });

    // ==========================================================================
    // TRIP STATUS UPDATES
    // ==========================================================================

    socket.on('trip:status', async (data) => {
      if (!userId) return;
      const { tripId, status } = data;

      // Validate permission
      const trip = await database.queryOne<{ trucker_id: string; load_id: string }>(
        'SELECT trucker_id, load_id FROM trips WHERE id = $1',
        [tripId]
      );

      if (!trip || trip.trucker_id !== userId) return;

      // Update database
      await database.query(
        'UPDATE trips SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, tripId]
      );

      // Broadcast
      this.io!.to(`load:${trip.load_id}`).emit(SOCKET_EVENTS.TRIP_UPDATED, {
        tripId,
        status,
        timestamp: Date.now(),
      });

      // Notify client
      const load = await database.queryOne<{ client_id: string }>(
        'SELECT client_id FROM loads WHERE id = $1',
        [trip.load_id]
      );
      if (load) {
        this.emitToUser(load.client_id, SOCKET_EVENTS.TRIP_UPDATED, {
          tripId,
          status,
          timestamp: Date.now(),
        });
      }
    });

    // ==========================================================================
    // HOS (Hours of Service) UPDATES
    // ==========================================================================

    socket.on('hos:update', async (data) => {
      if (!userId) return;
      const { tripId, hosStatus } = data;

      await database.query(
        `UPDATE trips SET hos_status = $1, updated_at = NOW() WHERE id = $2 AND trucker_id = $3`,
        [hosStatus, tripId, userId]
      );
    });

    // ==========================================================================
    // DISCONNECT
    // ==========================================================================

    socket.on('disconnect', (reason) => {
      if (userId) {
        const sockets = this.connectedUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.connectedUsers.delete(userId);
            this.updateUserOnlineStatus(userId, false);
          }
        }
        logger.debug(`User ${userId} disconnected (${reason})`);
      }
    });

    // ==========================================================================
    // ERROR HANDLING
    // ==========================================================================

    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  /**
   * Subscribe to Redis channels for cross-server communication
   */
  private async subscribeToChannels(): Promise<void> {
    if (!this.pubsub) return;

    // Subscribe to global events
    await this.pubsub.subscribe('global:events', (message) => {
      if (this.io) {
        this.io.emit(message.event, message.data);
      }
    });

    // Subscribe to user-specific events
    await this.pubsub.subscribe('user:events', (message) => {
      if (this.io && message.userId) {
        this.io.to(`user:${message.userId}`).emit(message.event, message.data);
      }
    });
  }

  /**
   * Emit event to all connected clients
   */
  emit(event: string, data: any): void {
    if (!this.io) return;

    // Local emit
    this.io.emit(event, data);

    // Cross-server emit via Redis
    this.pubsub?.publish('global:events', { event, data });
  }

  /**
   * Emit event to a specific user (all their devices)
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    // Local emit
    this.io.to(`user:${userId}`).emit(event, data);

    // Cross-server emit via Redis
    this.pubsub?.publish('user:events', { userId, event, data });
  }

  /**
   * Emit to a room
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get online users count
   */
  getOnlineCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Update user online status in database
   */
  private async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await database.query(
        'UPDATE users SET is_online = $1, last_seen_at = NOW() WHERE id = $2',
        [isOnline, userId]
      );
    } catch (error) {
      logger.error('Failed to update online status:', error);
    }
  }

  /**
   * Verify user has access to a room
   */
  private async verifyRoomAccess(
    userId: string,
    roomId: string,
    type: string
  ): Promise<boolean> {
    try {
      switch (type) {
        case 'load': {
          const load = await database.queryOne<{ client_id: string; assigned_trucker_id: string | null }>(
            'SELECT client_id, assigned_trucker_id FROM loads WHERE id = $1',
            [roomId]
          );
          return load
            ? load.client_id === userId || load.assigned_trucker_id === userId
            : false;
        }
        case 'trip': {
          const trip = await database.queryOne<{ trucker_id: string; load_id: string }>(
            'SELECT t.trucker_id, l.client_id FROM trips t JOIN loads l ON l.id = t.load_id WHERE t.id = $1',
            [roomId]
          );
          return trip
            ? trip.trucker_id === userId || trip.client_id === userId
            : false;
        }
        case 'conversation': {
          const conv = await database.queryOne<{ participants: string[] }>(
            'SELECT participants FROM conversations WHERE id = $1',
            [roomId]
          );
          return conv ? conv.participants.includes(userId) : false;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }

  /**
   * Get Socket.IO instance (for use in routes)
   */
  getIO(): Server | null {
    return this.io;
  }
}

// Export singleton
export const websocketService = new WebSocketService();
