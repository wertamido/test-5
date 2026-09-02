// ============================================================================
// ADMIN ROUTES
// ============================================================================

import { AdminActionSchema } from '@dispatch/shared';
import { requirePermission } from '../middleware/auth.middleware';

const adminRoutes = Router();

// GET /admin/dashboard - Dashboard stats
adminRoutes.get(
  '/dashboard',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await database.queryOne<any>(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'trucker') as total_truckers,
        (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
        (SELECT COUNT(*) FROM users WHERE status = 'pending_verification') as pending_verification,
        (SELECT COUNT(*) FROM loads) as total_loads,
        (SELECT COUNT(*) FROM loads WHERE status IN ('posted', 'bidding')) as active_loads,
        (SELECT COUNT(*) FROM trips WHERE status NOT IN ('completed', 'cancelled')) as active_trips,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_volume,
        (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes`
    );

    // Get recent activity
    const recentUsers = await database.queryMany(
      'SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );

    const recentLoads = await database.queryMany(
      `SELECT l.id, l.reference_number, l.status, l.freight_type, u.email as client_email
       FROM loads l JOIN users u ON u.id = l.client_id
       ORDER BY l.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(stats?.total_users || '0', 10),
          totalTruckers: parseInt(stats?.total_truckers || '0', 10),
          totalClients: parseInt(stats?.total_clients || '0', 10),
          pendingVerification: parseInt(stats?.pending_verification || '0', 10),
          totalLoads: parseInt(stats?.total_loads || '0', 10),
          activeLoads: parseInt(stats?.active_loads || '0', 10),
          activeTrips: parseInt(stats?.active_trips || '0', 10),
          totalVolume: parseFloat(stats?.total_volume || '0'),
          openDisputes: parseInt(stats?.open_disputes || '0', 10),
        },
        recentUsers: recentUsers.rows,
        recentLoads: recentLoads.rows,
      },
    });
  })
);

// GET /admin/users - List all users (with filters)
adminRoutes.get(
  '/users',
  authenticate,
  requirePermission('users.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { role, status, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (role) { whereConditions.push(`role = $${paramIndex++}`); params.push(role); }
    if (status) { whereConditions.push(`status = $${paramIndex++}`); params.push(status); }
    if (search) {
      whereConditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await database.query(
      `SELECT id, email, phone, role, status, verification_level, first_name, last_name, company_name, created_at, last_login_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await database.queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult?.count || '0', 10),
      },
    });
  })
);

// POST /admin/users/:id/ban - Ban user
adminRoutes.post(
  '/users/:id/ban',
  authenticate,
  requirePermission('users.ban'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, duration } = req.body;

    await database.transaction(async (client) => {
      await client.query(
        "UPDATE users SET status = 'banned', banned_at = NOW(), ban_reason = $1 WHERE id = $2",
        [reason, id]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
         VALUES ($1, 'user.banned', 'user', $2, $3)`,
        [req.user!.id, id, JSON.stringify({ reason, duration })]
      );
    });

    res.json({ success: true, message: 'User banned' });
  })
);

// POST /admin/users/:id/suspend - Suspend user
adminRoutes.post(
  '/users/:id/suspend',
  authenticate,
  requirePermission('users.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    await database.query(
      "UPDATE users SET status = 'suspended', suspended_at = NOW(), suspension_reason = $1 WHERE id = $2",
      [reason, id]
    );

    res.json({ success: true, message: 'User suspended' });
  })
);

// GET /admin/loads - List all loads (admin)
adminRoutes.get(
  '/loads',
  authenticate,
  requirePermission('loads.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause = `WHERE status = ANY($${paramIndex++})`;
      params.push((status as string).split(','));
    }

    const result = await database.query(
      `SELECT l.*, u.email as client_email, u.company_name
       FROM loads l JOIN users u ON u.id = l.client_id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// DELETE /admin/loads/:id - Delete load (admin)
adminRoutes.delete(
  '/loads/:id',
  authenticate,
  requirePermission('loads.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await database.query('DELETE FROM loads WHERE id = $1', [id]);

    await database.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id)
       VALUES ($1, 'load.deleted', 'load', $2)`,
      [req.user!.id, id]
    );

    res.json({ success: true, message: 'Load deleted' });
  })
);

// GET /admin/disputes - List disputes
adminRoutes.get(
  '/disputes',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status = 'open' } = req.query;

    const result = await database.queryMany(
      `SELECT d.*, 
        u1.first_name as initiator_first_name, u1.last_name as initiator_last_name,
        l.reference_number
       FROM disputes d
       JOIN users u1 ON u1.id = d.initiated_by
       JOIN loads l ON l.id = d.load_id
       WHERE d.status = $1
       ORDER BY d.created_at DESC`,
      [status]
    );

    res.json({ success: true, data: result });
  })
);

// POST /admin/disputes/:id/resolve - Resolve dispute
adminRoutes.post(
  '/disputes/:id/resolve',
  authenticate,
  requirePermission('payments.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolution, releaseEscrow } = req.body;

    await database.transaction(async (client) => {
      await client.query(
        `UPDATE disputes SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = NOW()
         WHERE id = $3`,
        [resolution, req.user!.id, id]
      );

      if (releaseEscrow) {
        const dispute = await client.queryOne<{ load_id: string }>(
          'SELECT load_id FROM disputes WHERE id = $1',
          [id]
        );
        if (dispute) {
          await client.query(
            "UPDATE payments SET status = 'released' WHERE load_id = $1 AND status = 'held_in_escrow'",
            [dispute.load_id]
          );
        }
      }
    });

    res.json({ success: true, message: 'Dispute resolved' });
  })
);

// GET /admin/audit-logs - View audit logs
adminRoutes.get(
  '/audit-logs',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const result = await database.query(
      `SELECT a.*, u.email as admin_email
       FROM audit_logs a
       JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

export { adminRoutes };
