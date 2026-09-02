/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens, attaches user to request,
 * and provides role-based access control.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '@dispatch/shared';

// ============================================================================
// EXTEND EXPRESS REQUEST TYPE
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'trucker' | 'client' | 'admin' | 'dispatcher';
  status: string;
  verificationLevel: string;
  permissions?: string[];
}

// ============================================================================
// JWT PAYLOAD INTERFACE
// ============================================================================

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti: string;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Authenticate JWT token from Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Authentication token is required', 401);
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret',
      {
        algorithms: ['HS256'],
        issuer: 'freight-connect',
        audience: 'freight-connect-api',
      }
    ) as JWTPayload;

    // Check if token is blacklisted (logged out)
    const cache = new (await import('../config/redis')).Cache('blacklist:');
    const isBlacklisted = await cache.exists(payload.jti);
    if (isBlacklisted) {
      throw new AppError('UNAUTHORIZED', 'Token has been revoked', 401);
    }

    // Fetch user from database
    const user = await database.queryOne<{
      id: string;
      email: string;
      role: string;
      status: string;
      verification_level: string;
    }>(
      `SELECT id, email, role, status, verification_level 
       FROM users 
       WHERE id = $1`,
      [payload.userId]
    );

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      throw new AppError(
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended. Please contact support.',
        403
      );
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as any,
      status: user.status,
      verificationLevel: user.verification_level,
    };

    // Update last activity (fire and forget)
    database
      .query('UPDATE users SET last_activity_at = NOW() WHERE id = $1', [user.id])
      .catch(() => {});

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('TOKEN_EXPIRED', 'Authentication token has expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('INVALID_TOKEN', 'Invalid authentication token', 401));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    await authenticate(req, res, next);
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Role access denied: user=${req.user.id} role=${req.user.role} required=${roles.join(',')}`
      );
      return next(
        new AppError(
          'FORBIDDEN',
          `Access denied. Required role: ${roles.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Require specific permission(s)
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (req.user.role === 'admin') {
      return next(); // Super admin has all permissions
    }

    // Fetch user permissions from database
    const result = await database.queryOne<{ permissions: string[] }>(
      `SELECT permissions FROM admin_users WHERE user_id = $1`,
      [req.user.id]
    );

    const userPermissions = result?.permissions || [];

    const hasAllPermissions = permissions.every((p) =>
      userPermissions.includes(p) || userPermissions.includes('*')
    );

    if (!hasAllPermissions) {
      return next(
        new AppError(
          'FORBIDDEN',
          `Access denied. Required permissions: ${permissions.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Require verified account
 */
export function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  }

  if (req.user.verificationLevel === 'unverified') {
    return next(
      new AppError(
        'VERIFICATION_REQUIRED',
        'Please verify your account to access this feature',
        403
      )
    );
  }

  next();
}

/**
 * Require active subscription for premium features
 */
export function requireSubscription(...features: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    const subscription = await database.queryOne<{
      plan: string;
      status: string;
      features: any;
    }>(
      `SELECT plan, status, features 
       FROM subscriptions 
       WHERE user_id = $1 AND status = 'active'`,
      [req.user.id]
    );

    if (!subscription) {
      return next(
        new AppError(
          'SUBSCRIPTION_REQUIRED',
          'Active subscription required for this feature',
          402
        )
      );
    }

    // Check if plan has required features
    for (const feature of features) {
      if (!subscription.features?.[feature]) {
        return next(
          new AppError(
            'FEATURE_NOT_AVAILABLE',
            `Feature "${feature}" is not available in your current plan`,
            402
          )
        );
      }
    }

    next();
  };
}

// ============================================================================
// RESOURCE OWNERSHIP CHECK
// ============================================================================

/**
 * Check if user owns the resource or is admin
 */
export function requireOwnership(resourceTable: string, resourceIdParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    // Admins can access everything
    if (req.user.role === 'admin') return next();

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return next(new AppError('BAD_REQUEST', 'Resource ID is required', 400));
    }

    const result = await database.queryOne<{ user_id: string }>(
      `SELECT user_id FROM ${resourceTable} WHERE id = $1`,
      [resourceId]
    );

    if (!result) {
      return next(new AppError('NOT_FOUND', 'Resource not found', 404));
    }

    if (result.user_id !== req.user.id) {
      return next(
        new AppError(
          'FORBIDDEN',
          'You do not have permission to access this resource',
          403
        )
      );
    }

    next();
  };
}
