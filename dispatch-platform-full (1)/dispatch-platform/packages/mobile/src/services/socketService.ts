/**
 * Socket Service — Real-time communication
 * Handles: chat messages, location updates, notifications, trip status changes
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  addMessage,
  setTyping,
  setOnline,
  incrementUnread,
} from '../store/slices/messagesSlice';
import {
  addNotification,
  setUnreadCount,
} from '../store/slices/notificationsSlice';
import {
  setCurrentLocation,
  updateTripInList,
} from '../store/slices/tripsSlice';
import { selectAuth } from '../store/slices/authSlice';
import { WS_URL } from './api';

let socket: Socket | null = null;
let isConnecting = false;

export const connect = (token: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket);
      return;
    }

    if (isConnecting) {
      // Wait for existing connection
      const checkInterval = setInterval(() => {
        if (socket?.connected) {
          clearInterval(checkInterval);
          resolve(socket);
        }
      }, 100);
      return;
    }

    isConnecting = true;

    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[SocketService] Connected:', socket?.id);
      isConnecting = false;
      resolve(socket!);
    });

    socket.on('connect_error', (error) => {
      console.error('[SocketService] Connect error:', error.message);
      isConnecting = false;
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
    });

    socket.on('reconnect', (attempt) => {
      console.log('[SocketService] Reconnected after', attempt, 'attempts');
    });

    // ─── Event Handlers ─────────────────────────────────────────────────────

    // New chat message
    socket.on('message:new', (message) => {
      const state = store.getState();
      const currentConvId = state.messages.currentConversation?.id;

      store.dispatch(addMessage(message));

      // If not in the active conversation, increment unread
      if (message.conversationId !== currentConvId) {
        store.dispatch(incrementUnread(message.conversationId));
      }
    });

    // Typing indicator
    socket.on('message:typing', ({ userId, conversationId, isTyping }) => {
      store.dispatch(setTyping({ userId, isTyping }));
    });

    // User online/offline
    socket.on('user:online', ({ userId }) => {
      store.dispatch(setOnline({ userId, isOnline: true }));
    });

    socket.on('user:offline', ({ userId }) => {
      store.dispatch(setOnline({ userId, isOnline: false }));
    });

    // Notifications
    socket.on('notification:new', (notification) => {
      store.dispatch(addNotification(notification));
    });

    // Trip updates
    socket.on('trip:status_changed', ({ tripId, status, trip }) => {
      store.dispatch(updateTripInList(trip));
    });

    // Location updates (for fleet tracking / active trip)
    socket.on('location:update', (location) => {
      store.dispatch(setCurrentLocation(location));
    });

    // Bid updates
    socket.on('bid:new', (bid) => {
      // Handled by notifications, but could update bids slice
    });

    socket.on('bid:accepted', ({ bidId, trip }) => {
      // Navigate or show notification
    });

    // Payment updates
    socket.on('payment:completed', (payment) => {
      // Refresh payments list
    });

    // Document verification
    socket.on('document:verified', ({ documentId, status }) => {
      // Refresh documents
    });
  });
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[SocketService] Disconnected manually');
  }
};

export const joinConversation = (conversationId: string) => {
  socket?.emit('conversation:join', { conversationId });
};

export const leaveConversation = (conversationId: string) => {
  socket?.emit('conversation:leave', { conversationId });
};

export const emitTyping = (conversationId: string, isTyping: boolean) => {
  socket?.emit('message:typing', { conversationId, isTyping });
};

export const emitLocation = (data: {
  tripId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}) => {
  socket?.emit('location:update', data);
};

export const subscribeToTrip = (tripId: string) => {
  socket?.emit('trip:subscribe', { tripId });
};

export const unsubscribeFromTrip = (tripId: string) => {
  socket?.emit('trip:unsubscribe', { tripId });
};

export const getSocket = () => socket;

export const isConnected = () => socket?.connected || false;

export default {
  connect,
  disconnect,
  joinConversation,
  leaveConversation,
  emitTyping,
  emitLocation,
  subscribeToTrip,
  unsubscribeFromTrip,
  getSocket,
  isConnected,
};
