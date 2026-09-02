// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

const analyticsRoutes = Router();

// GET /analytics/earnings - Detailed earnings report
analyticsRoutes.get(
  '/earnings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const earnings = await database.queryOne<any>(
      `SELECT 
        COALESCE(SUM(p.amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN p.type = 'escrow_release' THEN p.amount ELSE 0 END), 0) as net_earnings,
        COALESCE(SUM(CASE WHEN p.type = 'platform_fee' THEN p.amount ELSE 0 END), 0) as platform_fees,
        COUNT(DISTINCT p.load_id) as total_loads,
        COALESCE(AVG(p.amount), 0) as avg_per_load
       FROM payments p
       WHERE p.payee_id = $1 
       AND p.status = 'completed'
       AND p.completed_at BETWEEN $2 AND $3`,
      [userId, start, end]
    );

    // Get daily breakdown
    const daily = await database.queryMany(
      `SELECT 
        DATE(completed_at) as date,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as loads
       FROM payments
       WHERE payee_id = $1 
       AND status = 'completed'
       AND completed_at BETWEEN $2 AND $3
       GROUP BY DATE(completed_at)
       ORDER BY date`,
      [userId, start, end]
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalEarnings: parseFloat(earnings?.total_earnings || '0'),
          netEarnings: parseFloat(earnings?.net_earnings || '0'),
          platformFees: parseFloat(earnings?.platform_fees || '0'),
          totalLoads: parseInt(earnings?.total_loads || '0', 10),
          averagePerLoad: parseFloat(earnings?.avg_per_load || '0'),
          period: { start, end },
        },
        daily: daily.rows.map((d: any) => ({
          date: d.date,
          amount: parseFloat(d.amount),
          loads: parseInt(d.loads, 10),
        })),
      },
    });
  })
);

// GET /analytics/performance - Performance metrics
analyticsRoutes.get(
  '/performance',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const metrics = await database.queryOne<any>(
      `SELECT 
        -- On-time delivery rate
        COALESCE(
          (SELECT COUNT(*)::float FROM trips 
           WHERE trucker_id = $1 AND status = 'completed' 
           AND actual_delivery <= scheduled_delivery) /
          NULLIF((SELECT COUNT(*) FROM trips 
                  WHERE trucker_id = $1 AND status = 'completed'), 0)
        , 0) * 100 as on_time_rate,
        -- Average rating
        COALESCE((SELECT AVG(rating)::numeric(10,1) FROM ratings WHERE reviewee_id = $1), 0) as avg_rating,
        -- Total loads completed
        (SELECT COUNT(*) FROM trips WHERE trucker_id = $1 AND status = 'completed') as total_completed,
        -- Total miles
        COALESCE((SELECT SUM(total_distance) FROM trips t JOIN loads l ON l.id = t.load_id WHERE t.trucker_id = $1), 0) as total_miles,
        -- Acceptance rate (simplified)
        COALESCE(
          (SELECT COUNT(*) FROM trips WHERE trucker_id = $1)::float /
          NULLIF((SELECT COUNT(*) FROM bids WHERE trucker_id = $1), 0)
        , 0) * 100 as acceptance_rate,
        -- Completion rate
        COALESCE(
          (SELECT COUNT(*) FROM trips WHERE trucker_id = $1 AND status = 'completed')::float /
          NULLIF((SELECT COUNT(*) FROM trips WHERE trucker_id = $1), 0)
        , 0) * 100 as completion_rate
      `,
      [userId]
    );

    res.json({
      success: true,
      data: {
        onTimeDeliveryRate: Math.round(parseFloat(metrics?.on_time_rate || '0') * 100) / 100,
        averageRating: parseFloat(metrics?.avg_rating || '0'),
        totalLoadsCompleted: parseInt(metrics?.total_completed || '0', 10),
        totalMilesDriven: Math.round(parseFloat(metrics?.total_miles || '0')),
        acceptanceRate: Math.round(parseFloat(metrics?.acceptance_rate || '0') * 100) / 100,
        completionRate: Math.round(parseFloat(metrics?.completion_rate || '0') * 100) / 100,
      },
    });
  })
);

// GET /analytics/dashboard - Combined dashboard data
analyticsRoutes.get(
  '/dashboard',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === 'trucker') {
      // Trucker dashboard
      const [activeTrips, pendingBids, earnings, notifications] = await Promise.all([
        database.queryMany(
          `SELECT * FROM trips WHERE trucker_id = $1 AND status NOT IN ('completed', 'cancelled') ORDER BY scheduled_pickup ASC LIMIT 5`,
          [userId]
        ),
        database.queryMany(
          `SELECT b.*, l.reference_number, l.pickup, l.delivery 
           FROM bids b JOIN loads l ON l.id = b.load_id 
           WHERE b.trucker_id = $1 AND b.status = 'pending' ORDER BY b.created_at DESC LIMIT 10`,
          [userId]
        ),
        database.queryOne<any>(
          `SELECT COALESCE(SUM(amount), 0) as month_earnings, COUNT(*) as month_loads
           FROM payments 
           WHERE payee_id = $1 AND status = 'completed' 
           AND completed_at > NOW() - INTERVAL '30 days'`,
          [userId]
        ),
        database.queryMany(
          'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 10',
          [userId]
        ),
      ]);

      res.json({
        success: true,
        data: {
          activeTrips: activeTrips.rows,
          pendingBids: pendingBids.rows,
          earnings: {
            thisMonth: parseFloat(earnings?.month_earnings || '0'),
            loadsThisMonth: parseInt(earnings?.month_loads || '0', 10),
          },
          notifications: notifications.rows,
        },
      });
    } else {
      // Client dashboard
      const [activeLoads, pendingBids, spent, notifications] = await Promise.all([
        database.queryMany(
          `SELECT l.* FROM loads l WHERE l.client_id = $1 AND l.status NOT IN ('completed', 'cancelled', 'delivered') ORDER BY l.created_at DESC LIMIT 5`,
          [userId]
        ),
        database.queryMany(
          `SELECT b.*, u.first_name, u.last_name, u.company_name
           FROM bids b JOIN users u ON u.id = b.trucker_id
           WHERE b.load_id IN (SELECT id FROM loads WHERE client_id = $1)
           AND b.status = 'pending' ORDER BY b.created_at DESC LIMIT 10`,
          [userId]
        ),
        database.queryOne<any>(
          `SELECT COALESCE(SUM(amount), 0) as month_spent, COUNT(*) as month_loads
           FROM payments 
           WHERE payer_id = $1 AND status = 'completed' 
           AND completed_at > NOW() - INTERVAL '30 days'`,
          [userId]
        ),
        database.queryMany(
          'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 10',
          [userId]
        ),
      ]);

      res.json({
        success: true,
        data: {
          activeLoads: activeLoads.rows,
          pendingBids: pendingBids.rows,
          spent: {
            thisMonth: parseFloat(spent?.month_spent || '0'),
            loadsThisMonth: parseInt(spent?.month_loads || '0', 10),
          },
          notifications: notifications.rows,
        },
      });
    }
  })
);

export { analyticsRoutes };
