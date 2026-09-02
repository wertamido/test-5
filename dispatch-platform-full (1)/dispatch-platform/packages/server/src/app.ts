/**
 * Express Application Configuration
 * 
 * Sets up all middleware, routes, error handlers, and security configurations.
 * This is the core of the API server.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { sanitizeInput } from './middleware/sanitization.middleware';
import { apiVersion } from './middleware/api-version.middleware';
import { healthCheck } from './routes/health.route';

// Route imports
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { loadRoutes } from './routes/load.routes';
import { bidRoutes } from './routes/bid.routes';
import { tripRoutes } from './routes/trip.routes';
import { vehicleRoutes } from './routes/vehicle.routes';
import { paymentRoutes } from './routes/payment.routes';
import { messageRoutes } from './routes/message.routes';
import { notificationRoutes } from './routes/notification.routes';
import { documentRoutes } from './routes/document.routes';
import { ratingRoutes } from './routes/rating.routes';
import { adminRoutes } from './routes/admin.routes';
import { searchRoutes } from './routes/search.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { subscriptionRoutes } from './routes/subscription.routes';
import { uploadRoutes } from './routes/upload.routes';
import { trackingRoutes } from './routes/tracking.routes';

export function createServer(): Application {
  const app = express();

  // ==========================================================================
  // TRUST PROXY (for accurate IP addresses behind load balancer)
  // ==========================================================================
  app.set('trust proxy', 1);

  // ==========================================================================
  // SECURITY MIDDLEWARE
  // ==========================================================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // ==========================================================================
  // CORS CONFIGURATION
  // ==========================================================================
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With',
      'X-API-Version', 'X-Request-ID', 'X-Device-ID', 'X-Language'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit', 'X-Has-More'],
    maxAge: 86400, // 24 hours
  }));

  // ==========================================================================
  // COMPRESSION
  // ==========================================================================
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6,
  }));

  // ==========================================================================
  // BODY PARSING
  // ==========================================================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================================================
  // INPUT SANITIZATION
  // ==========================================================================
  app.use(sanitizeInput);

  // ==========================================================================
  // SESSION CONFIGURATION (for OAuth flows)
  // ==========================================================================
  app.use(session({
    name: 'freight.sid',
    secret: process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
    store: new (require('connect-redis').default)({
      client: connectRedis(),
      prefix: 'session:',
    }),
  }));

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================
  const standardLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/health'),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many authentication attempts, please try again later.' },
    skipSuccessfulRequests: true,
  });

  app.use('/api', standardLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);

  // ==========================================================================
  // LOGGING
  // ==========================================================================
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.LOG_FORMAT === 'json' ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }));
  }
  app.use(requestLogger);

  // ==========================================================================
  // API VERSIONING
  // ==========================================================================
  app.use(apiVersion);

  // ==========================================================================
  // HEALTH CHECK (no auth required)
  // ==========================================================================
  app.get('/health', healthCheck);
  app.get('/health/deep', healthCheck); // Detailed health with DB/Redis checks

  // ==========================================================================
  // API ROUTES
  // ==========================================================================
  const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/loads`, loadRoutes);
  app.use(`${API_PREFIX}/bids`, bidRoutes);
  app.use(`${API_PREFIX}/trips`, tripRoutes);
  app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
  app.use(`${API_PREFIX}/payments`, paymentRoutes);
  app.use(`${API_PREFIX}/messages`, messageRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/documents`, documentRoutes);
  app.use(`${API_PREFIX}/ratings`, ratingRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/search`, searchRoutes);
  app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
  app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
  app.use(`${API_PREFIX}/upload`, uploadRoutes);
  app.use(`${API_PREFIX}/tracking`, trackingRoutes);

  // ==========================================================================
  // ROOT ENDPOINT
  // ==========================================================================
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'FreightConnect API',
      version: '1.0.0',
      status: 'running',
      documentation: '/api/docs',
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        users: `${API_PREFIX}/users`,
        loads: `${API_PREFIX}/loads`,
        bids: `${API_PREFIX}/bids`,
        trips: `${API_PREFIX}/trips`,
        vehicles: `${API_PREFIX}/vehicles`,
        payments: `${API_PREFIX}/payments`,
        messages: `${API_PREFIX}/messages`,
        notifications: `${API_PREFIX}/notifications`,
        documents: `${API_PREFIX}/documents`,
        ratings: `${API_PREFIX}/ratings`,
        admin: `${API_PREFIX}/admin`,
        search: `${API_PREFIX}/search`,
        analytics: `${API_PREFIX}/analytics`,
        webhooks: `${API_PREFIX}/webhooks`,
        subscriptions: `${API_PREFIX}/subscriptions`,
        upload: `${API_PREFIX}/upload`,
        tracking: `${API_PREFIX}/tracking`,
      },
    });
  });

  // ==========================================================================
  // 404 HANDLER
  // ==========================================================================
  app.use(notFoundHandler);

  // ==========================================================================
  // GLOBAL ERROR HANDLER (must be last)
  // ==========================================================================
  app.use(errorHandler);

  return app;
}
