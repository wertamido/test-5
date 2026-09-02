// ============================================================================
// BID ROUTES — Bidding system for truckers
// ============================================================================

import { Router, Request, Response } from 'express';
import { database } from '../config/database';
import { AppError } from '@dispatch/shared';
import { CreateBidSchema, UpdateBidSchema } from '@dispatch/shared';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireRole } from '../middleware/auth.middleware';

const bidRoutes = Router();

// GET /bids — List bids (filtered by user role)
bidRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { role, status, loadId } = req.query;

    let query = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (req.user!.role === 'trucker') {
      // Trucker sees their own bids
      query = 'SELECT b.*, l.title, l.origin, l.destination, l.status as load_status FROM bids b JOIN loads l ON l.id = b.load_id WHERE b.trucker_id = $1';
      params.push(userId);
      paramIndex++;
    } else if (req.user!.role === 'client') {
      // Client sees bids on their loads
      query = 'SELECT b.*, u.first_name, u.last_name, u.company_name, u.rating FROM bids b JOIN users u ON u.id = b.trucker_id JOIN loads l ON l.id = b.load_id WHERE l.client_id = $1';
      params.push(userId);
      paramIndex++;
    } else {
      query = 'SELECT b.* FROM bids b WHERE 1=1';
    }

    if (status) { query += ` AND b.status = $${paramIndex++}`; params.push(status); }
    if (loadId) { query += ` AND b.load_id = $${paramIndex++}`; params.push(loadId); }

    query += ' ORDER BY b.created_at DESC LIMIT 100';

    const result = await database.queryMany(query, params);
    res.json({ success: true, data: result });
  })
);

// POST /bids — Create bid on a load
bidRoutes.post(
  '/',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreateBidSchema.parse(req.body);
    const truckerId = req.user!.id;

    // Verify load exists and is open
    const load = await database.queryOne<{ status: string; client_id: string }>(
      'SELECT status, client_id FROM loads WHERE id = $1',
      [validated.loadId]
    );
    if (!load) throw new AppError('LOAD_NOT_FOUND', 'Load not found', 404);
    if (load.status !== 'open' && load.status !== 'bidding') {
      throw new AppError('LOAD_NOT_OPEN', 'Load is not accepting bids', 400);
    }

    // Check for existing bid from this trucker
    const existing = await database.queryOne(
      'SELECT id FROM bids WHERE load_id = $1 AND trucker_id = $2',
      [validated.loadId, truckerId]
    );
    if (existing) {
      throw new AppError('BID_EXISTS', 'You already have a bid on this load', 409);
    }

    const result = await database.queryOne(
      `INSERT INTO bids (
        load_id, trucker_id, amount, currency, message,
        estimated_pickup, estimated_delivery, vehicle_id,
        counter_offer, expires_at, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
      RETURNING *`,
      [
        validated.loadId, truckerId, validated.amount, validated.currency || 'USD',
        validated.message || null, validated.estimatedPickup || null,
        validated.estimatedDelivery || null, validated.vehicleId || null,
        validated.counterOffer || null, validated.expiresAt || null,
      ]
    );

    // Update load status to bidding
    await database.query("UPDATE loads SET status = 'bidding' WHERE id = $1 AND status = 'open'", [validated.loadId]);

    res.status(201).json({ success: true, data: result, message: 'Bid placed successfully' });
  })
);

// PUT /bids/:id — Update own bid
bidRoutes.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const validated = UpdateBidSchema.parse(req.body);

    const bid = await database.queryOne<{ trucker_id: string; status: string }>(
      'SELECT trucker_id, status FROM bids WHERE id = $1', [id]
    );
    if (!bid) throw new AppError('BID_NOT_FOUND', 'Bid not found', 404);
    if (bid.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'You can only update your own bids', 403);
    }
    if (bid.status !== 'pending') {
      throw new AppError('BID_LOCKED', 'Cannot update accepted/rejected bid', 400);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (validated.amount !== undefined) { updates.push(`amount = $${paramIndex++}`); params.push(validated.amount); }
    if (validated.message !== undefined) { updates.push(`message = $${paramIndex++}`); params.push(validated.message); }
    if (validated.counterOffer !== undefined) { updates.push(`counter_offer = $${paramIndex++}`); params.push(validated.counterOffer); }
    if (validated.estimatedPickup !== undefined) { updates.push(`estimated_pickup = $${paramIndex++}`); params.push(validated.estimatedPickup); }
    if (validated.estimatedDelivery !== undefined) { updates.push(`estimated_delivery = $${paramIndex++}`); params.push(validated.estimatedDelivery); }

    if (updates.length === 0) throw new AppError('NO_UPDATES', 'No valid updates', 400);

    updates.push('updated_at = NOW()');
    params.push(id);

    const query = `UPDATE bids SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await database.queryOne(query, params);

    res.json({ success: true, data: result, message: 'Bid updated' });
  })
);

// DELETE /bids/:id — Withdraw bid
bidRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const bid = await database.queryOne<{ trucker_id: string }>(
      'SELECT trucker_id FROM bids WHERE id = $1', [id]
    );
    if (!bid) throw new AppError('BID_NOT_FOUND', 'Bid not found', 404);
    if (bid.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    await database.query("UPDATE bids SET status = 'withdrawn' WHERE id = $1", [id]);
    res.json({ success: true, message: 'Bid withdrawn' });
  })
);

// POST /bids/:id/accept — Client accepts a bid
bidRoutes.post(
  '/:id/accept',
  authenticate,
  requireRole('client', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const bid = await database.queryOne<any>(
      `SELECT b.*, l.client_id, l.status as load_status 
       FROM bids b JOIN loads l ON l.id = b.load_id 
       WHERE b.id = $1`,
      [id]
    );
    if (!bid) throw new AppError('BID_NOT_FOUND', 'Bid not found', 404);
    if (bid.client_id !== userId) throw new AppError('FORBIDDEN', 'Only the client can accept bids', 403);
    if (bid.load_status !== 'open' && bid.load_status !== 'bidding') {
      throw new AppError('LOAD_NOT_OPEN', 'Load no longer accepting bids', 400);
    }

    // Accept this bid
    await database.query("UPDATE bids SET status = 'accepted' WHERE id = $1", [id]);

    // Reject all other bids
    await database.query(
      "UPDATE bids SET status = 'rejected' WHERE load_id = $1 AND id != $2",
      [bid.load_id, id]
    );

    // Update load
    await database.query(
      "UPDATE loads SET status = 'assigned', assigned_trucker_id = $1, final_price = $2, updated_at = NOW() WHERE id = $3",
      [bid.trucker_id, bid.amount, bid.load_id]
    );

    // Create trip automatically
    await database.query(
      `INSERT INTO trips (load_id, client_id, trucker_id, status, agreed_price)
       VALUES ($1, $2, $3, 'scheduled', $4)`,
      [bid.load_id, userId, bid.trucker_id, bid.amount]
    );

    res.json({ success: true, message: 'Bid accepted. Trip created.' });
  })
);

// POST /bids/:id/counter — Client makes counter offer
bidRoutes.post(
  '/:id/counter',
  authenticate,
  requireRole('client', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user!.id;

    const bid = await database.queryOne<any>(
      `SELECT b.*, l.client_id FROM bids b JOIN loads l ON l.id = b.load_id WHERE b.id = $1`,
      [id]
    );
    if (!bid) throw new AppError('BID_NOT_FOUND', 'Bid not found', 404);
    if (bid.client_id !== userId) throw new AppError('FORBIDDEN', 'Only the client can counter', 403);

    await database.query(
      "UPDATE bids SET counter_offer = $1, status = 'countered', updated_at = NOW() WHERE id = $2",
      [amount, id]
    );

    res.json({ success: true, message: 'Counter offer sent' });
  })
);

export { bidRoutes };
