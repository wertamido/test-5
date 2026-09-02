/**
 * Request Logger Middleware
 * 
 * Adds request ID tracking and performance monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  // Log request
  logger.debug(`[${requestId}] ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';

    logger[level](`[${requestId}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id,
    });

    // Add performance header
    res.setHeader('X-Response-Time', `${duration}ms`);

    return originalEnd.apply(res, args as any);
  } as any;

  next();
}
