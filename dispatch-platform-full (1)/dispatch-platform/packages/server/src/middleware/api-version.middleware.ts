/**
 * API Versioning Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function apiVersion(req: Request, res: Response, next: NextFunction): void {
  // Check custom header
  const requestedVersion = req.headers['x-api-version'] as string;
  const supportedVersions = ['v1'];
  const defaultVersion = 'v1';

  let version = defaultVersion;

  if (requestedVersion && supportedVersions.includes(requestedVersion)) {
    version = requestedVersion;
  }

  // Also check URL path
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch && supportedVersions.includes(pathMatch[1])) {
    version = pathMatch[1];
  }

  (req as any).apiVersion = version;
  res.setHeader('X-API-Version', version);

  next();
}
