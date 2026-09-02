import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

export interface TokenPayload {
  userId: string;
  role: string;
}

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId, role, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return { userId: decoded.userId, role: decoded.role };
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return { userId: decoded.userId, role: decoded.role };
}
