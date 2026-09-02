/**
 * Integration Tests — Authentication
 * Tests registration, login, token refresh, and password reset flows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/config/database';

const BASE_URL = '/api/v1';

describe('Auth Integration Tests', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    role: 'carrier' as const,
    firstName: 'Test',
    lastName: 'Driver',
  };

  let accessToken: string;
  let refreshToken: string;

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%@example.com']);
    await pool.end();
  });

  // ─── Registration ────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new carrier successfully', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('carrier');
      expect(response.body.user).not.toHaveProperty('password');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send(testUser)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/register`)
        .send({ ...testUser, email: 'new@example.com', password: '123' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({ email: testUser.email, password: 'WrongPassword!' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should rate limit after too many attempts', async () => {
      // Attempt 10+ logins with wrong password
      for (let i = 0; i < 11; i++) {
        await request(app)
          .post(`${BASE_URL}/auth/login`)
          .send({ email: testUser.email, password: 'WrongPassword!' });
      }

      const response = await request(app)
        .post(`${BASE_URL}/auth/login`)
        .send({ email: testUser.email, password: 'WrongPassword!' })
        .expect(429);

      expect(response.body.message).toContain('Too many');
    });
  });

  // ─── Token Refresh ────────────────────────────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      // Tokens should be different from before
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken: 'invalid_token' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject reused refresh token (rotation)', async () => {
      // Use the first refresh token again
      const response = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken })
        .expect(401);

      expect(response.body.code).toBe('TOKEN_REUSED');
    });
  });

  // ─── Protected Route ──────────────────────────────────────────────────────────
  describe('GET /users/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/users/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/users/me`)
        .expect(401);

      expect(response.body.code).toBe('NO_TOKEN');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature';
      const response = await request(app)
        .get(`${BASE_URL}/users/me`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  // ─── Password Reset ──────────────────────────────────────────────────────────
  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/forgot-password`)
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toContain('reset');
    });

    it('should reset password with valid token', async () => {
      // In real test, fetch reset token from database or email service mock
      const resetToken = 'mock_reset_token_from_db';
      const response = await request(app)
        .post(`${BASE_URL}/auth/reset-password`)
        .send({ token: resetToken, newPassword: 'NewSecurePass456!' })
        .expect(200);

      expect(response.body.message).toContain('success');
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/auth/logout`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toContain('success');

      // Refresh token should no longer work
      const refreshResponse = await request(app)
        .post(`${BASE_URL}/auth/refresh`)
        .send({ refreshToken })
        .expect(401);

      expect(refreshResponse.body.code).toBe('INVALID_TOKEN');
    });
  });
});
