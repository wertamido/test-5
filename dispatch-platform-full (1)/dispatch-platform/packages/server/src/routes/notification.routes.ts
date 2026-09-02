// ============================================================================

const notificationRoutes = Router();

// GET /notifications - List notifications
notificationRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { unreadOnly, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = FALSE';
    }

    const result = await database.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [...params, limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// POST /notifications/:id/read - Mark as read
notificationRoutes.post(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await database.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    res.json({ success: true });
  })
);

// POST /notifications/read-all - Mark all as read
notificationRoutes.post(
  '/read-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await database.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user!.id]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

// GET /notifications/settings - Get notification preferences
notificationRoutes.get(
  '/settings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const prefs = await database.queryOne(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.user!.id]
    );

    res.json({ success: true, data: prefs });
  })
);

// PUT /notifications/settings - Update preferences
notificationRoutes.put(
  '/settings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body;

    const setClauses = Object.keys(updates)
      .map((key, i) => `${snakeCase(key)} = $${i + 2}`)
      .join(', ');

    await database.query(
      `UPDATE notification_preferences SET ${setClauses}, updated_at = NOW() WHERE user_id = $1`,
      [userId, ...Object.values(updates)]
    );

    res.json({ success: true, message: 'Preferences updated' });
  })
);

export { notificationRoutes };
