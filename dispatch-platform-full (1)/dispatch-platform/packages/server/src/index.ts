/**
 * Freight Dispatch Platform - Server Entry Point
 * 
 * This is the main entry point for the backend API server.
 * It initializes all middleware, routes, WebSocket handlers, and background services.
 */

import 'dotenv/config';
import { createServer } from './app';
import { logger } from './config/logger';
import { database } from './config/database';
import { redis } from './config/redis';
import { websocketService } from './services/websocket.service';
import { schedulerService } from './services/scheduler.service';

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  try {
    // ==========================================================================
    // 1. CONNECT TO DATABASE
    // ==========================================================================
    logger.info('📡 Connecting to database...');
    await database.connect();
    logger.info('✅ Database connected');

    // ==========================================================================
    // 2. CONNECT TO REDIS
    // ==========================================================================
    logger.info('📡 Connecting to Redis...');
    await redis.connect();
    logger.info('✅ Redis connected');

    // ==========================================================================
    // 3. RUN DATABASE MIGRATIONS (if in development)
    // ==========================================================================
    if (NODE_ENV === 'development') {
      logger.info('🔄 Running database migrations...');
      await database.migrate();
      logger.info('✅ Migrations complete');
    }

    // ==========================================================================
    // 4. CREATE EXPRESS APP
    // ==========================================================================
    const app = createServer();

    // ==========================================================================
    // 5. START HTTP SERVER
    // ==========================================================================
    const server = app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║          🚛  FREIGHT DISPATCH PLATFORM - API SERVER                         ║
║                                                                              ║
║          Environment: ${NODE_ENV.padEnd(56)} ║
║          Port: ${PORT.toString().padEnd(60)} ║
║          Status: RUNNING ✅                                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
    });

    // ==========================================================================
    // 6. INITIALIZE WEBSOCKET
    // ==========================================================================
    websocketService.initialize(server);
    logger.info('✅ WebSocket server initialized');

    // ==========================================================================
    // 7. START BACKGROUND SCHEDULERS
    // ==========================================================================
    schedulerService.start();
    logger.info('✅ Background schedulers started');

    // ==========================================================================
    // 8. GRACEFUL SHUTDOWN HANDLERS
    // ==========================================================================
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(() => {
        logger.info('✅ HTTP server closed');
      });

      // Close WebSocket connections
      websocketService.close();
      logger.info('✅ WebSocket connections closed');

      // Stop schedulers
      schedulerService.stop();
      logger.info('✅ Schedulers stopped');

      // Close database connections
      try {
        await database.disconnect();
        logger.info('✅ Database disconnected');
      } catch (err) {
        logger.error('❌ Error disconnecting database:', err);
      }

      // Close Redis
      try {
        await redis.disconnect();
        logger.info('✅ Redis disconnected');
      } catch (err) {
        logger.error('❌ Error disconnecting Redis:', err);
      }

      logger.info('👋 Graceful shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('❌ Uncaught Exception:', err);
      gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// START THE SERVER
// ============================================================================

bootstrap();
