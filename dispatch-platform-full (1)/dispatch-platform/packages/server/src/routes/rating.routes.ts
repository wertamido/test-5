// ============================================================================
// RATING ROUTES
// ============================================================================

const ratingRoutes = Router();

// POST /ratings - Create rating
ratingRoutes.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { loadId, revieweeId, rating, categories, comment, isPublic } = req.body;

    if (!loadId || !revieweeId || !rating) {
      throw new AppError('MISSING_FIELDS', 'loadId, revieweeId, and rating are required', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('INVALID_RATING', 'Rating must be between 1 and 5', 400);
    }

    // Verify the load exists and user was involved
    const load = await database.queryOne<{ client_id: string; assigned_trucker_id: string | null }>(
      'SELECT client_id, assigned_trucker_id FROM loads WHERE id = $1',
      [loadId]
    );

    if (!load) throw new AppError('LOAD_NOT_FOUND', 'Load not found', 404);

    const isClient = load.client_id === req.user!.id;
    const isTrucker = load.assigned_trucker_id === req.user!.id;

    if (!isClient && !isTrucker) {
      throw new AppError('FORBIDDEN', 'You can only rate users you completed a load with', 403);
    }

    // Prevent self-rating
    if (revieweeId === req.user!.id) {
      throw new AppError('SELF_RATING', 'You cannot rate yourself', 400);
    }

    const result = await database.queryOne(
      `INSERT INTO ratings (
        load_id, reviewer_id, reviewee_id, rating, categories, comment, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (load_id, reviewer_id, reviewee_id) 
      DO UPDATE SET rating = $4, categories = $5, comment = $6, updated_at = NOW()
      RETURNING *`,
      [
        loadId,
        req.user!.id,
        revieweeId,
        rating,
        JSON.stringify(categories || {}),
        comment || null,
        isPublic !== false,
      ]
    );

    res.status(201).json({ success: true, data: result, message: 'Rating submitted' });
  })
);

// GET /ratings/user/:id - Get ratings for a user
ratingRoutes.get(
  '/user/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const result = await database.query(
      `SELECT r.*, u.first_name, u.last_name, u.avatar_url, l.reference_number
       FROM ratings r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN loads l ON l.id = r.load_id
       WHERE r.reviewee_id = $1 AND r.is_public = TRUE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    // Get aggregate stats
    const stats = await database.queryOne<any>(
      `SELECT 
        COALESCE(AVG(rating), 0)::numeric(10,1) as avg_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM ratings
       WHERE reviewee_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ratings: result.rows,
        stats: {
          averageRating: parseFloat(stats?.avg_rating || '0'),
          totalRatings: parseInt(stats?.total_ratings || '0', 10),
          distribution: {
            5: parseInt(stats?.five_star || '0', 10),
            4: parseInt(stats?.four_star || '0', 10),
            3: parseInt(stats?.three_star || '0', 10),
            2: parseInt(stats?.two_star || '0', 10),
            1: parseInt(stats?.one_star || '0', 10),
          },
        },
      },
    });
  })
);

export { ratingRoutes };
