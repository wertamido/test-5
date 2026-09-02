// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

import { Request, Response } from 'express';
import { database } from '../config/database';
import { connectRedis } from '../config/redis';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const checks: Record<string, any> = {
    api: { status: 'ok', uptime: process.uptime() },
  };

  // Check database
  try {
    await database.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', message: (err as Error).message };
  }

  // Check Redis
  try {
    const redis = connectRedis();
    await redis.ping();
    checks.redis = { status: 'ok' };
  } catch (err) {
    checks.redis = { status: 'error', message: (err as Error).message };
  }

  const allHealthy = Object.values(checks).every((c: any) => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    checks,
  });
}
