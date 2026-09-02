// ============================================================================
// SEARCH ROUTES
// ============================================================================

import { LoadSearchSchema } from '@dispatch/shared';

const searchRoutes = Router();

// POST /search/loads - Advanced load search
searchRoutes.post(
  '/loads',
  asyncHandler(async (req: Request, res: Response) => {
    const filters = LoadSearchSchema.parse(req.body);
    const { page, limit, sortBy, sortOrder } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ["l.status IN ('posted', 'bidding')"];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.freightTypes?.length) {
      whereConditions.push(`l.freight_type = ANY($${paramIndex++})`);
      params.push(filters.freightTypes);
    }

    if (filters.minWeight) {
      whereConditions.push(`l.weight >= $${paramIndex++}`);
      params.push(filters.minWeight);
    }

    if (filters.maxWeight) {
      whereConditions.push(`l.weight <= $${paramIndex++}`);
      params.push(filters.maxWeight);
    }

    if (filters.minRate) {
      whereConditions.push(`(l.pricing->>'offeredRate')::numeric >= $${paramIndex++}`);
      params.push(filters.minRate);
    }

    if (filters.maxRate) {
      whereConditions.push(`(l.pricing->>'offeredRate')::numeric <= $${paramIndex++}`);
      params.push(filters.maxRate);
    }

    if (filters.pickupDateStart) {
      whereConditions.push(`l.pickup_date >= $${paramIndex++}`);
      params.push(filters.pickupDateStart);
    }

    if (filters.pickupDateEnd) {
      whereConditions.push(`l.pickup_date <= $${paramIndex++}`);
      params.push(filters.pickupDateEnd);
    }

    if (filters.urgency?.length) {
      whereConditions.push(`l.urgency = ANY($${paramIndex++})`);
      params.push(filters.urgency);
    }

    if (filters.verifiedOnly) {
      whereConditions.push(`u.verification_level IN ('verified', 'premium')`);
    }

    const whereClause = whereConditions.join(' AND ');

    const sortMap: Record<string, string> = {
      date: 'l.posted_at',
      rate: "(l.pricing->>'offeredRate')::numeric",
      distance: 'l.total_distance',
      rating: 'u.avg_rating',
    };
    const orderBy = sortMap[sortBy || 'date'] || 'l.posted_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        l.*,
        u.first_name, u.last_name, u.company_name, u.avatar_url,
        COALESCE((
          SELECT AVG(rating)::numeric(10,1)
          FROM ratings WHERE reviewee_id = l.client_id
        ), 0) as client_rating,
        (SELECT COUNT(*) FROM bids WHERE load_id = l.id) as bid_count
      FROM loads l
      JOIN users u ON u.id = l.client_id
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await database.query(query, [...params, limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM loads l JOIN users u ON u.id = l.client_id WHERE ${whereClause}`;
    const countResult = await database.queryOne<{ count: string }>(countQuery, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        page,
        limit,
        total: parseInt(countResult?.count || '0', 10),
        hasMore: offset + result.rows.length < parseInt(countResult?.count || '0', 10),
      },
    });
  })
);

// POST /search/truckers - Find truckers
searchRoutes.post(
  '/truckers',
  asyncHandler(async (req: Request, res: Response) => {
    const { location, radius, equipmentTypes, minRating, verifiedOnly, page = 1, limit = 20 } = req.body;
    const offset = (page - 1) * limit;

    let whereConditions = ["u.role = 'trucker'"];
    let params: any[] = [];
    let paramIndex = 1;

    if (equipmentTypes?.length) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.trucker_id = u.id AND v.type = ANY($${paramIndex})
      )`);
      params.push(equipmentTypes);
      paramIndex++;
    }

    if (minRating) {
      whereConditions.push(`(
        SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE reviewee_id = u.id
      ) >= $${paramIndex++}`);
      params.push(minRating);
    }

    if (verifiedOnly) {
      whereConditions.push(`u.verification_level IN ('verified', 'premium')`);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await database.query(
      `SELECT 
        u.id, u.first_name, u.last_name, u.company_name, u.avatar_url,
        u.verification_level, u.created_at,
        COALESCE((SELECT AVG(rating)::numeric(10,1) FROM ratings WHERE reviewee_id = u.id), 0) as rating,
        (SELECT COUNT(*) FROM trips WHERE trucker_id = u.id AND status = 'completed') as completed_trips,
        (SELECT json_agg(json_build_object('type', v.type, 'make', v.make, 'model', v.model)) 
         FROM vehicles v WHERE v.trucker_id = u.id AND v.status = 'active') as vehicles
       FROM users u
       WHERE ${whereClause}
       ORDER BY rating DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// GET /search/suggestions - Autocomplete
searchRoutes.get(
  '/suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    const { q, type = 'all' } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: [] });
    }

    const search = `%${q}%`;
    const results: any[] = [];

    if (type === 'all' || type === 'cities') {
      const cities = await database.queryMany(
        `SELECT DISTINCT pickup_city as name, 'city' as type FROM loads WHERE pickup_city ILIKE $1
         UNION SELECT DISTINCT delivery_city as name, 'city' as type FROM loads WHERE delivery_city ILIKE $1
         LIMIT 5`,
        [search]
      );
      results.push(...cities.rows);
    }

    if (type === 'all' || type === 'companies') {
      const companies = await database.queryMany(
        'SELECT DISTINCT company_name as name, role as type FROM users WHERE company_name ILIKE $1 AND company_name IS NOT NULL LIMIT 5',
        [search]
      );
      results.push(...companies.rows);
    }

    res.json({ success: true, data: results });
  })
);

export { searchRoutes };
