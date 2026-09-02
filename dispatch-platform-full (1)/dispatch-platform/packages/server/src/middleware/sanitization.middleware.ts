/**
 * Input Sanitization Middleware
 * 
 * Protects against XSS, NoSQL injection, and other injection attacks.
 * Recursively sanitizes all input data.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<embed\b/gi,
  /<object\b/gi,
  /expression\s*\(/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /('|"|;|--|\/\*|\*\/)/g,
];

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
  let sanitized = value;

  // Remove XSS patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key itself
      const cleanKey = sanitizeString(key);
      // Skip potentially dangerous keys
      if (cleanKey.startsWith('$') || cleanKey.includes('.')) continue;
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    next(error);
  }
}

/**
 * Detect potential SQL injection in raw query strings
 */
export function detectSQLInjection(req: Request): boolean {
  const url = req.originalUrl;
  const body = JSON.stringify(req.body || {});
  const query = JSON.stringify(req.query || {});

  const combined = `${url} ${body} ${query}`;

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(combined)) {
      return true;
    }
  }

  return false;
}

/**
 * SQL injection detection middleware (additional layer)
 */
export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction): void {
  if (detectSQLInjection(req)) {
    logger.warn('Potential SQL injection detected', {
      ip: req.ip,
      path: req.path,
      body: req.body,
      userAgent: req.get('user-agent'),
    });
    return res.status(400).json({
      success: false,
      error: {
        code: 'MALICIOUS_INPUT_DETECTED',
        message: 'Potentially malicious input detected',
      },
    });
  }
  next();
}
