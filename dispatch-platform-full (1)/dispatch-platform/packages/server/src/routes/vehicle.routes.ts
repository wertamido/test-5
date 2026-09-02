// ============================================================================
// VEHICLE ROUTES
// ============================================================================

import { CreateVehicleSchema } from '@dispatch/shared';
import { requireRole } from '../middleware/auth.middleware';

const vehicleRoutes = Router();

// GET /vehicles - List user's vehicles
vehicleRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await database.queryMany(
      `SELECT * FROM vehicles 
       WHERE trucker_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result });
  })
);

// POST /vehicles - Add vehicle
vehicleRoutes.post(
  '/',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreateVehicleSchema.parse(req.body);

    // Check subscription vehicle limit
    const count = await database.queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM vehicles WHERE trucker_id = $1',
      [req.user!.id]
    );

    const sub = await database.queryOne<{ plan: string }>(
      'SELECT plan FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user!.id, 'active']
    );

    const limits: Record<string, number> = { free: 1, pro: 10, business: 100, enterprise: 999999 };
    const limit = limits[sub?.plan || 'free'] || 1;

    if (parseInt(count?.count || '0', 10) >= limit) {
      throw new AppError('VEHICLE_LIMIT', `Vehicle limit reached (${limit}). Upgrade your plan.`, 402);
    }

    const result = await database.queryOne(
      `INSERT INTO vehicles (
        trucker_id, type, make, model, year, color, vin, license_plate,
        jurisdiction, specifications, status, registration_expiry,
        inspection_expiry, insurance_expiry, trailers, maintenance_records
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.user!.id,
        validated.type,
        validated.make,
        validated.model,
        validated.year,
        validated.color,
        validated.vin,
        validated.licensePlate,
        validated.jurisdiction,
        JSON.stringify(validated.specifications),
        validated.status,
        validated.registrationExpiry,
        validated.inspectionExpiry,
        validated.insuranceExpiry,
        JSON.stringify(validated.trailers || []),
        JSON.stringify(validated.maintenanceRecords || []),
      ]
    );

    res.status(201).json({ success: true, data: result, message: 'Vehicle added successfully' });
  })
);

// PUT /vehicles/:id - Update vehicle
vehicleRoutes.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const vehicle = await database.queryOne<{ trucker_id: string }>(
      'SELECT trucker_id FROM vehicles WHERE id = $1',
      [id]
    );

    if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404);
    if (vehicle.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'You can only update your own vehicles', 403);
    }

    // Dynamic update
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(req.body)) {
      if (value === undefined || key === 'id' || key === 'trucker_id') continue;
      updates.push(`${snakeCase(key)} = $${paramIndex++}`);
      params.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }

    if (updates.length === 0) throw new AppError('NO_UPDATES', 'No valid updates', 400);

    updates.push('updated_at = NOW()');
    params.push(id);

    const query = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await database.queryOne(query, params);

    res.json({ success: true, data: result, message: 'Vehicle updated' });
  })
);

// DELETE /vehicles/:id - Delete vehicle
vehicleRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const vehicle = await database.queryOne<{ trucker_id: string }>(
      'SELECT trucker_id FROM vehicles WHERE id = $1',
      [id]
    );

    if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 'Vehicle not found', 404);
    if (vehicle.trucker_id !== userId && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    await database.query("UPDATE vehicles SET status = 'inactive' WHERE id = $1", [id]);

    res.json({ success: true, message: 'Vehicle deactivated' });
  })
);

// POST /vehicles/:id/maintenance - Add maintenance record
vehicleRoutes.post(
  '/:id/maintenance',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, description, mileage, cost, performedBy } = req.body;

    const record = {
      id: require('uuid').v4(),
      type,
      description,
      mileage,
      cost,
      performedBy,
      performedAt: new Date().toISOString(),
    };

    await database.query(
      `UPDATE vehicles 
       SET maintenance_records = COALESCE(maintenance_records, '[]'::jsonb) || $1::jsonb,
           current_mileage = GREATEST(COALESCE(current_mileage, 0), $2),
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(record), mileage || 0, id]
    );

    res.status(201).json({ success: true, data: record });
  })
);

export { vehicleRoutes };
