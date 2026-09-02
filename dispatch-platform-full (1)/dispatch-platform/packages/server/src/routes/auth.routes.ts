// ============================================================================
// AUTH ROUTES — Registration, Login, Logout, Refresh, Password Reset, Verification
// ============================================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { database } from '../config/database';
import { AppError } from '@dispatch/shared';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  VerifyPhoneSchema,
  RefreshTokenSchema,
} from '@dispatch/shared';
import { asyncHandler } from '../middleware/error.middleware';
import { generateTokens, verifyRefreshToken } from '../utils/tokens';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';

const authRoutes = Router();

// ============================================================================
// POST /auth/register — Create new account
// ============================================================================
authRoutes.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = RegisterSchema.parse(req.body);
    const { email, phone, password, role, firstName, lastName, companyName, preferredLanguage } = validated;

    // Check if user already exists
    const existing = await database.queryOne<any>(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existing) {
      throw new AppError('USER_EXISTS', 'Email or phone already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification codes
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    const user = await database.queryOne<any>(
      `INSERT INTO users (
        email, phone, password_hash, role, first_name, last_name,
        company_name, preferred_language, email_verification_code,
        phone_verification_code, status, verification_level
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending','unverified')
      RETURNING id, email, phone, role, first_name, last_name, verification_level, status`,
      [email, phone, passwordHash, role, firstName, lastName, companyName || null, preferredLanguage || 'en', emailCode, phoneCode]
    );

    // Send verification emails/SMS
    try {
      await emailService.sendVerificationCode(email, emailCode, firstName);
      await smsService.sendVerificationCode(phone, phoneCode);
    } catch (err) {
      // Log but don't fail registration
      console.warn('[Auth] Failed to send verification:', err);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Store refresh token
    await database.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.first_name} ${user.last_name}`,
          verificationLevel: user.verification_level,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
      message: 'Registration successful. Please verify your email and phone.',
    });
  })
);

// ============================================================================
// POST /auth/login — Authenticate user
// ============================================================================
authRoutes.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = LoginSchema.parse(req.body);
    const { email, password, deviceId, deviceName } = validated;

    // Find user
    const user = await database.queryOne<any>(
      'SELECT id, email, password_hash, role, first_name, last_name, status, verification_level FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (user.status === 'suspended') {
      throw new AppError('ACCOUNT_SUSPENDED', 'Account suspended. Contact support.', 403);
    }

    if (user.status === 'banned') {
      throw new AppError('ACCOUNT_BANNED', 'Account permanently banned', 403);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Store refresh token with device info
    await database.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, device_id, device_name) VALUES ($1, $2, $3, $4, $5)',
      [user.id, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), deviceId || null, deviceName || null]
    );

    // Update last login
    await database.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.first_name} ${user.last_name}`,
          verificationLevel: user.verification_level,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
    });
  })
);

// ============================================================================
// POST /auth/logout — Invalidate refresh token
// ============================================================================
authRoutes.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await database.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// ============================================================================
// POST /auth/refresh — Exchange refresh token for new access token
// ============================================================================
authRoutes.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = RefreshTokenSchema.parse(req.body);
    const { refreshToken } = validated;

    const stored = await database.queryOne<any>(
      'SELECT user_id, revoked_at, expires_at FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
      throw new AppError('INVALID_TOKEN', 'Refresh token expired or revoked', 401);
    }

    const user = await database.queryOne<any>(
      'SELECT id, role FROM users WHERE id = $1',
      [stored.user_id]
    );

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);

    // Rotate refresh token
    await database.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1', [refreshToken]);
    await database.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  })
);

// ============================================================================
// POST /auth/forgot-password — Send reset code
// ============================================================================
authRoutes.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = ForgotPasswordSchema.parse(req.body);
    const { email } = validated;

    const user = await database.queryOne<any>(
      'SELECT id, first_name FROM users WHERE email = $1',
      [email]
    );

    if (user) {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = crypto.randomBytes(32).toString('hex');

      await database.query(
        'UPDATE users SET reset_code = $1, reset_token = $2, reset_expires_at = $3 WHERE id = $4',
        [resetCode, resetToken, new Date(Date.now() + 15 * 60 * 1000), user.id]
      );

      try {
        await emailService.sendPasswordReset(email, resetCode, user.first_name);
      } catch (err) {
        console.warn('[Auth] Failed to send reset email:', err);
      }
    }

    // Always return success (don't reveal if email exists)
    res.json({ success: true, message: 'If the email exists, a reset code has been sent' });
  })
);

// ============================================================================
// POST /auth/reset-password — Reset password with code
// ============================================================================
authRoutes.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = ResetPasswordSchema.parse(req.body);
    const { email, code, newPassword } = validated;

    const user = await database.queryOne<any>(
      'SELECT id, reset_code, reset_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (!user || user.reset_code !== code || new Date(user.reset_expires_at) < new Date()) {
      throw new AppError('INVALID_RESET_CODE', 'Invalid or expired reset code', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await database.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_token = NULL, reset_expires_at = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    // Revoke all refresh tokens
    await database.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [user.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  })
);

// ============================================================================
// POST /auth/verify-email — Verify email with code
// ============================================================================
authRoutes.post(
  '/verify-email',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = VerifyEmailSchema.parse(req.body);
    const { code } = validated;
    const userId = req.user?.id; // From optional auth middleware

    if (!userId) {
      // Allow verification by code only (from registration flow)
      const user = await database.queryOne<any>(
        'SELECT id, email_verification_code FROM users WHERE email_verification_code = $1',
        [code]
      );
      if (!user) throw new AppError('INVALID_CODE', 'Invalid verification code', 400);

      await database.query(
        "UPDATE users SET email_verified = TRUE, email_verification_code = NULL, verification_level = CASE WHEN phone_verified THEN 'basic' ELSE 'unverified' END WHERE id = $1",
        [user.id]
      );
    } else {
      const user = await database.queryOne<any>(
        'SELECT email_verification_code FROM users WHERE id = $1',
        [userId]
      );
      if (user?.email_verification_code !== code) {
        throw new AppError('INVALID_CODE', 'Invalid verification code', 400);
      }

      await database.query(
        "UPDATE users SET email_verified = TRUE, email_verification_code = NULL, verification_level = CASE WHEN phone_verified THEN 'basic' ELSE 'unverified' END WHERE id = $1",
        [userId]
      );
    }

    res.json({ success: true, message: 'Email verified successfully' });
  })
);

// ============================================================================
// POST /auth/verify-phone — Verify phone with code
// ============================================================================
authRoutes.post(
  '/verify-phone',
  asyncHandler(async (req: Request, res: Response) => {
    const validated = VerifyPhoneSchema.parse(req.body);
    const { code } = validated;

    const user = await database.queryOne<any>(
      'SELECT id, phone_verification_code FROM users WHERE phone_verification_code = $1',
      [code]
    );

    if (!user) throw new AppError('INVALID_CODE', 'Invalid verification code', 400);

    await database.query(
      "UPDATE users SET phone_verified = TRUE, phone_verification_code = NULL, verification_level = CASE WHEN email_verified THEN 'basic' ELSE 'unverified' END WHERE id = $1",
      [user.id]
    );

    res.json({ success: true, message: 'Phone verified successfully' });
  })
);

// ============================================================================
// POST /auth/resend-verification — Resend verification codes
// ============================================================================
authRoutes.post(
  '/resend-verification',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.body; // 'email' | 'phone'
    const userId = req.user?.id;

    if (!userId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const user = await database.queryOne<any>(
      'SELECT email, phone, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (type === 'email' || !type) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await database.query('UPDATE users SET email_verification_code = $1 WHERE id = $2', [code, userId]);
      try { await emailService.sendVerificationCode(user.email, code, user.first_name); } catch (e) { /* ignore */ }
    }

    if (type === 'phone' || !type) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await database.query('UPDATE users SET phone_verification_code = $1 WHERE id = $2', [code, userId]);
      try { await smsService.sendVerificationCode(user.phone, code); } catch (e) { /* ignore */ }
    }

    res.json({ success: true, message: 'Verification codes resent' });
  })
);

export { authRoutes };
