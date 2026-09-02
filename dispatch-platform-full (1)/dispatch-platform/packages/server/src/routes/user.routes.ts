// ============================================================================
// USER ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import { database } from '../config/database';
import { AppError } from '@dispatch/shared';
import { UpdateProfileSchema } from '@dispatch/shared';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const userRoutes = Router();

// GET /users/:id - Get public profile
userRoutes.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await database.queryOne<any>(
      `SELECT 
        id, email, phone, role, verification_level,
        first_name, last_name, company_name, avatar_url, bio,
        preferred_language, created_at,
        (
          SELECT COALESCE(AVG(rating), 0)::numeric(10,1)
          FROM ratings WHERE reviewee_id = $1
        ) as avg_rating,
        (
          SELECT COUNT(*) FROM ratings WHERE reviewee_id = $1
        ) as total_ratings,
        (
          SELECT COUNT(*) FROM trips t 
          WHERE t.trucker_id = $1 AND t.status = 'completed'
        ) as completed_trips
       FROM users WHERE id = $1`,
      [id]
    );

    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

    res.json({
      success: true,
      data: {
        id: user.id,
        role: user.role,
        verificationLevel: user.verification_level,
        name: `${user.first_name} ${user.last_name}`,
        company: user.company_name,
        avatar: user.avatar_url,
        bio: user.bio,
        language: user.preferred_language,
        rating: parseFloat(user.avg_rating) || 0,
        totalRatings: parseInt(user.total_ratings, 10),
        completedTrips: parseInt(user.completed_trips, 10),
        memberSince: user.created_at,
      },
    });
  })
);

// PUT /users/profile - Update own profile
userRoutes.put(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = UpdateProfileSchema.parse(req.body);

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.firstName) { updates.push(`first_name = $${paramIndex++}`); params.push(validated.firstName); }
    if (validated.lastName) { updates.push(`last_name = $${paramIndex++}`); params.push(validated.lastName); }
    if (validated.companyName !== undefined) { updates.push(`company_name = $${paramIndex++}`); params.push(validated.companyName); }
    if (validated.bio !== undefined) { updates.push(`bio = $${paramIndex++}`); params.push(validated.bio); }
    if (validated.avatar !== undefined) { updates.push(`avatar_url = $${paramIndex++}`); params.push(validated.avatar); }
    if (validated.address) { updates.push(`address = $${paramIndex++}`); params.push(JSON.stringify(validated.address)); }
    if (validated.languages) { updates.push(`preferred_language = $${paramIndex++}`); params.push(validated.languages[0]); }
    if (validated.emergencyContact) { updates.push(`emergency_contact = $${paramIndex++}`); params.push(JSON.stringify(validated.emergencyContact)); }

    if (updates.length === 0) {
      throw new AppError('NO_UPDATES', 'No valid fields to update', 400);
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await database.queryOne(query, params);

    res.json({ success: true, data: result, message: 'Profile updated successfully' });
  })
);

// GET /users/:id/ratings - Get user ratings
userRoutes.get(
  '/:id/ratings',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const result = await database.query(
      `SELECT r.*, 
        u.first_name, u.last_name, u.avatar_url,
        l.reference_number
       FROM ratings r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN loads l ON l.id = r.load_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// DELETE /users/:id - Admin only - Delete/suspend user
userRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, permanent } = req.body;

    if (req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admins can delete users', 403);
    }

    if (permanent) {
      await database.query('DELETE FROM users WHERE id = $1', [id]);
    } else {
      await database.query(
        "UPDATE users SET status = 'suspended', suspended_at = NOW(), suspension_reason = $1 WHERE id = $2",
        [reason, id]
      );
    }

    res.json({ success: true, message: permanent ? 'User deleted' : 'User suspended' });
  })
);

export { userRoutes };
