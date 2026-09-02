/**
 * 404 Not Found Handler
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@dispatch/shared';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, 404));
}
