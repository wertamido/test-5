// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

import { CreateWebhookSchema } from '@dispatch/shared';

const webhookRoutes = Router();

// GET /webhooks - List user's webhooks
webhookRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await database.queryMany(
      'SELECT id, url, events, is_active, last_triggered_at, failure_count, created_at FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    res.json({ success: true, data: result });
  })
);

// POST /webhooks - Create webhook
webhookRoutes.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreateWebhookSchema.parse(req.body);

    const webhook = await database.queryOne(
      `INSERT INTO webhooks (user_id, url, events, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, events, is_active, created_at`,
      [
        req.user!.id,
        validated.url,
        validated.events,
        validated.secret || require('crypto').randomBytes(32).toString('hex'),
      ]
    );

    res.status(201).json({ success: true, data: webhook, message: 'Webhook created' });
  })
);

// DELETE /webhooks/:id - Delete webhook
webhookRoutes.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await database.query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    res.json({ success: true, message: 'Webhook deleted' });
  })
);

// POST /webhooks/:id/test - Test webhook
webhookRoutes.post(
  '/:id/test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const webhook = await database.queryOne<{ url: string; secret: string }>(
      'SELECT url, secret FROM webhooks WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (!webhook) throw new AppError('WEBHOOK_NOT_FOUND', 'Webhook not found', 404);

    // Send test payload
    const crypto = require('crypto');
    const payload = JSON.stringify({ event: 'test', timestamp: Date.now() });
    const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: payload,
      });

      await database.query(
        'UPDATE webhooks SET last_triggered_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        data: { statusCode: response.status, ok: response.ok },
        message: response.ok ? 'Webhook test successful' : 'Webhook test failed',
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'Failed to deliver webhook',
        error: (error as Error).message,
      });
    }
  })
);

export { webhookRoutes };