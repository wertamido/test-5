// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

import { UploadDocumentSchema } from '@dispatch/shared';

const documentRoutes = Router();

// GET /documents - List user's documents
documentRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.role === 'admin' ? (req.query.userId as string) || req.user!.id : req.user!.id;

    const result = await database.queryMany(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, data: result });
  })
);

// POST /documents - Upload document (metadata)
documentRoutes.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = UploadDocumentSchema.parse(req.body);

    const document = await database.queryOne(
      `INSERT INTO documents (user_id, type, status, filename, url, expires_at, metadata)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user!.id,
        validated.type,
        validated.filename,
        validated.url,
        validated.expiresAt || null,
        JSON.stringify(validated.metadata || {}),
      ]
    );

    res.status(201).json({ success: true, data: document, message: 'Document uploaded for review' });
  })
);

// POST /documents/:id/verify - Admin verifies document
documentRoutes.post(
  '/:id/verify',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admins can verify documents', 403);
    }

    const { id } = req.params;
    const { approved, rejectionReason } = req.body;

    if (approved) {
      await database.query(
        'UPDATE documents SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
        ['approved', req.user!.id, id]
      );

      // Update user verification level
      const doc = await database.queryOne<{ user_id: string; type: string }>(
        'SELECT user_id, type FROM documents WHERE id = $1',
        [id]
      );

      if (doc && doc.type === 'cdl_license') {
        await database.query(
          "UPDATE users SET verification_level = 'verified' WHERE id = $1",
          [doc.user_id]
        );
      }
    } else {
      await database.query(
        'UPDATE documents SET status = $1, rejection_reason = $2 WHERE id = $3',
        ['rejected', rejectionReason, id]
      );
    }

    res.json({ success: true, message: approved ? 'Document approved' : 'Document rejected' });
  })
);

// DELETE /documents/:id - Delete document
documentRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const doc = await database.queryOne<{ user_id: string }>(
      'SELECT user_id FROM documents WHERE id = $1',
      [id]
    );

    if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    if (doc.user_id !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    await database.query('DELETE FROM documents WHERE id = $1', [id]);

    res.json({ success: true, message: 'Document deleted' });
  })
);

export { documentRoutes };
