// ============================================================================
// TRIP ROUTES — Trip lifecycle (scheduled → pickup → in_transit → delivered)
// ============================================================================

import { Router, Request, Response } from 'express';
import { database } from '../config/database';
import { AppError } from '@dispatch/shared';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireRole } from '../middleware/auth.middleware';

const tripRoutes = Router();

// GET /trips — List trips for current user
tripRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status } = req.query;

    let query = '';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (req.user!.role === 'trucker') {
      query = `SELECT t.*, l.title, l.origin, l.destination, l.cargo_type,
               u.first_name as client_fn, u.last_name as client_ln, u.company_name as client_co
               FROM trips t JOIN loads l ON l.id = t.load_id JOIN users u ON u.id = t.client_id
               WHERE t.trucker_id = $1`;
    } else if (req.user!.role === 'client') {
      query = `SELECT t.*, l.title, l.origin, l.destination,
               u.first_name as trucker_fn, u.last_name as trucker_ln, u.company_name as trucker_co
               FROM trips t JOIN loads l ON l.id = t.load_id JOIN users u ON u.id = t.trucker_id
               WHERE t.client_id = $1`;
    } else {
      query = 'SELECT t.* FROM trips t WHERE 1=1';
      params[0] = '%';
    }

    if (status) { query += ` AND t.status = $${paramIndex++}`; params.push(status); }
    query += ' ORDER BY t.created_at DESC LIMIT 100';

    const result = await database.queryMany(query, params);
    res.json({ success: true, data: result });
  })
);

// GET /trips/:id — Trip details
tripRoutes.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const trip = await database.queryOne<any>(
      `SELECT t.*, l.*,
               tc.first_name as client_fn, tc.last_name as client_ln,
               tt.first_name as trucker_fn, tt.last_name as trucker_ln,
               v.make, v.model, v.license_plate
       FROM trips t JOIN loads l ON l.id = t.load_id
       JOIN users tc ON tc.id = t.client_id
       JOIN users tt ON tt.id = t.trucker_id
       LEFT JOIN vehicles v ON v.id = t.vehicle_id
       WHERE t.id = $1`, [id]
    );

    if (!trip) throw new AppError('TRIP_NOT_FOUND', 'Trip not found', 404);
    if (trip.client_id !== userId && trip.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    const events = await database.queryMany(
      'SELECT * FROM trip_events WHERE trip_id = $1 ORDER BY created_at ASC', [id]
    );

    res.json({ success: true, data: { ...trip, events } });
  })
);

// POST /trips/:id/status — Update trip status (state machine)
tripRoutes.post(
  '/:id/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, location } = req.body;
    const userId = req.user!.id;

    const trip = await database.queryOne<{ trucker_id: string; status: string }>(
      'SELECT trucker_id, status FROM trips WHERE id = $1', [id]
    );
    if (!trip) throw new AppError('TRIP_NOT_FOUND', 'Trip not found', 404);
    if (trip.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only the trucker can update status', 403);
    }

    const validTransitions: Record<string, string[]> = {
      scheduled: ['en_route_pickup', 'cancelled'],
      en_route_pickup: ['arrived_pickup', 'cancelled'],
      arrived_pickup: ['loaded', 'cancelled'],
      loaded: ['in_transit', 'cancelled'],
      in_transit: ['arrived_delivery', 'cancelled'],
      arrived_delivery: ['unloaded', 'delivered'],
      unloaded: ['delivered'],
      delivered: ['completed'],
    };

    const allowed = validTransitions[trip.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError('INVALID_TRANSITION', `Cannot go from ${trip.status} to ${status}`, 400);
    }

    await database.query('UPDATE trips SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

    if (status === 'delivered' || status === 'completed') {
      await database.query(
        "UPDATE loads SET status = 'delivered' WHERE id = (SELECT load_id FROM trips WHERE id = $1)",
        [id]
      );
    }

    await database.query(
      `INSERT INTO trip_events (trip_id, event_type, status, notes, location, created_by)
       VALUES ($1, 'status_change', $2, $3, $4, $5)`,
      [id, status, notes || null, location ? JSON.stringify(location) : null, userId]
    );

    res.json({ success: true, message: `Status updated to ${status}` });
  })
);

// POST /trips/:id/pickup — Confirm pickup with BOL
tripRoutes.post(
  '/:id/pickup',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { bolNumber, bolDocumentId, pieces, weight, notes } = req.body;

    await database.query(
      `UPDATE trips SET status = 'loaded', pickup_time = NOW(),
        bol_number = $1, bol_document_id = $2, actual_pieces = $3, actual_weight = $4,
        pickup_notes = $5, updated_at = NOW() WHERE id = $6`,
      [bolNumber || null, bolDocumentId || null, pieces || null, weight || null, notes || null, id]
    );

    await database.query(
      `INSERT INTO trip_events (trip_id, event_type, status, notes) VALUES ($1, 'pickup', 'loaded', $2)`,
      [id, notes || 'Cargo picked up']
    );

    res.json({ success: true, message: 'Pickup confirmed' });
  })
);

// POST /trips/:id/deliver — Confirm delivery with POD
tripRoutes.post(
  '/:id/deliver',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { podNumber, podDocumentId, pieces, notes, signature } = req.body;

    await database.query(
      `UPDATE trips SET status = 'delivered', delivery_time = NOW(),
        pod_number = $1, pod_document_id = $2, delivery_notes = $3, signature_data = $4,
        updated_at = NOW() WHERE id = $5`,
      [podNumber || null, podDocumentId || null, notes || null, signature || null, id]
    );

    await database.query(
      `INSERT INTO trip_events (trip_id, event_type, status, notes) VALUES ($1, 'delivery', 'delivered', $2)`,
      [id, notes || 'Cargo delivered']
    );

    res.json({ success: true, message: 'Delivery confirmed' });
  })
);

// POST /trips/:id/start — Start trip (en route)
tripRoutes.post(
  '/:id/start',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await database.query(
      "UPDATE trips SET status = 'in_transit', actual_departure = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'loaded'",
      [id]
    );
    await database.query(
      `INSERT INTO trip_events (trip_id, event_type, status) VALUES ($1, 'departure', 'in_transit')`, [id]
    );
    res.json({ success: true, message: 'Trip started' });
  })
);

// GET /trips/:id/timeline — Event timeline
tripRoutes.get(
  '/:id/timeline',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const events = await database.queryMany(
      `SELECT te.*, u.first_name, u.last_name
       FROM trip_events te LEFT JOIN users u ON u.id = te.created_by
       WHERE te.trip_id = $1 ORDER BY te.created_at ASC`, [id]
    );
    res.json({ success: true, data: events });
  })
);

// POST /trips/:id/issue — Report issue
tripRoutes.post(
  '/:id/issue',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, severity, description, location } = req.body;

    await database.query(
      `INSERT INTO trip_events (trip_id, event_type, severity, notes, location, created_by)
       VALUES ($1, 'issue', $2, $3, $4, $5)`,
      [id, severity || 'medium', description, location ? JSON.stringify(location) : null, req.user!.id]
    );

    res.json({ success: true, message: 'Issue reported' });
  })
);

// GET /trips/active — Active trips
tripRoutes.get(
  '/active',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await database.queryMany(
      `SELECT t.*, l.title, l.origin, l.destination
       FROM trips t JOIN loads l ON l.id = t.load_id
       WHERE (t.trucker_id = $1 OR t.client_id = $1)
       AND t.status IN ('scheduled','en_route_pickup','arrived_pickup','loaded','in_transit','arrived_delivery','unloaded')
       ORDER BY t.updated_at DESC`, [userId]
    );
    res.json({ success: true, data: result });
  })
);

export { tripRoutes };
