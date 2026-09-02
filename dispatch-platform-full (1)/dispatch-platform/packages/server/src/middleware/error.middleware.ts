/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and formats them consistently.
 * Includes security measures to prevent information leakage.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { AppError, createErrorResponse } from '@dispatch/shared';
import { database } from '../config/database';

/**
 * Global error handler - must be the last middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Generate request ID for tracking
  const requestId = (req as any).requestId || 'unknown';

  // ==========================================================================
  // APPERROR (custom application errors)
  // ==========================================================================
  if (error instanceof AppError) {
    logger.warn(`[${requestId}] AppError: ${error.code} - ${error.message}`, {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    });
    return;
  }

  // ==========================================================================
  // ZOD VALIDATION ERRORS
  // ==========================================================================
  if (error instanceof ZodError) {
    logger.warn(`[${requestId}] Validation Error: ${error.message}`, {
      path: req.path,
      errors: error.errors,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      },
    });
    return;
  }

  // ==========================================================================
  // JWT ERRORS
  // ==========================================================================
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.message,
      },
    });
    return;
  }

  // ==========================================================================
  // DATABASE ERRORS
  // ==========================================================================
  if ((error as any).code) {
    const dbError = error as any;

    // Unique violation
    if (dbError.code === '23505') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
          ...(process.env.NODE_ENV === 'development' && { detail: dbError.detail }),
        },
      });
      return;
    }

    // Foreign key violation
    if (dbError.code === '23503') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced record does not exist',
          ...(process.env.NODE_ENV === 'development' && { detail: dbError.detail }),
        },
      });
      return;
    }

    // Not null violation
    if (dbError.code === '23502') {
      res.status(400).json({
        success: false,
        error: {
          code: 'NOT_NULL_VIOLATION',
          message: `Field "${dbError.column}" cannot be null`,
        },
      });
      return;
    }

    // Check constraint violation
    if (dbError.code === '23514') {
      res.status(400).json({
        success: false,
        error: {
          code: 'CHECK_CONSTRAINT_VIOLATION',
          message: 'Data validation constraint failed',
        },
      });
      return;
    }

    // Connection error
    if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
      logger.error(`[${requestId}] Database connection error:`, dbError);
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Service temporarily unavailable. Please try again later.',
        },
      });
      return;
    }
  }

  // ==========================================================================
  // MULTER ERRORS (file upload)
  // ==========================================================================
  if (error.name === 'MulterError') {
    const multerError = error as any;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Uploaded file exceeds maximum size limit',
        },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: multerError.message,
      },
    });
    return;
  }

  // ==========================================================================
  // UNHANDLED ERRORS
  // ==========================================================================
  logger.error(`[${requestId}] Unhandled Error:`, {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: req.user?.id,
  });

  // Log to database for critical errors
  if (process.env.NODE_ENV === 'production') {
    database
      .query(
        `INSERT INTO error_logs (request_id, message, stack, path, method, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          requestId,
          error.message,
          error.stack,
          req.path,
          req.method,
          req.user?.id || null,
        ]
      )
      .catch(() => {});
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred. Please try again later.',
      ...(isDevelopment && { stack: error.stack }),
      ...(isDevelopment && { details: (error as any).details }),
    },
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T extends Request = Request, U extends Response = Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
