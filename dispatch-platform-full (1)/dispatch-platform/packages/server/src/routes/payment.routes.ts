// ============================================================================
// PAYMENT ROUTES
// ============================================================================

import { CreatePaymentIntentSchema, CreatePayoutSchema } from '@dispatch/shared';

const paymentRoutes = Router();

// POST /payments/intent - Create payment intent
paymentRoutes.post(
  '/intent',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreatePaymentIntentSchema.parse(req.body);

    const load = await database.queryOne<{ client_id: string; pricing: any }>(
      'SELECT client_id, pricing FROM loads WHERE id = $1',
      [validated.loadId]
    );

    if (!load) throw new AppError('LOAD_NOT_FOUND', 'Load not found', 404);

    if (load.client_id !== req.user!.id) {
      throw new AppError('FORBIDDEN', 'Only the client can create payment', 403);
    }

    // Create payment record (in production, integrate with Stripe)
    const payment = await database.queryOne(
      `INSERT INTO payments (
        load_id, payer_id, payee_id, status, type,
        amount, currency, method, is_escrow, description
      ) VALUES ($1, $2, $3, 'pending', 'load_payment', $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        validated.loadId,
        req.user!.id,
        // payee will be set when trucker is assigned
        validated.loadId, // placeholder
        validated.amount,
        validated.currency,
        validated.paymentMethodId ? 'credit_card' : 'bank_transfer',
        validated.useEscrow,
        `Payment for load ${validated.loadId}`,
      ]
    );

    // In production: create Stripe PaymentIntent
    // const stripeIntent = await stripe.paymentIntents.create({...});

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        clientSecret: `pi_mock_${payment.id}`, // In production: stripeIntent.client_secret
      },
      message: 'Payment intent created',
    });
  })
);

// POST /payments/:id/confirm - Confirm payment (webhook simulation)
paymentRoutes.post(
  '/:id/confirm',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const payment = await database.queryOne<{ status: string; is_escrow: boolean }>(
      'SELECT status, is_escrow FROM payments WHERE id = $1',
      [id]
    );

    if (!payment) throw new AppError('PAYMENT_NOT_FOUND', 'Payment not found', 404);

    const newStatus = payment.is_escrow ? 'held_in_escrow' : 'completed';
    const updates: any = { status: newStatus, updated_at: 'NOW()' };
    if (newStatus === 'completed') updates.completed_at = 'NOW()';

    await database.query(
      `UPDATE payments SET status = $1, completed_at = ${payment.is_escrow ? 'NULL' : 'NOW()'}, updated_at = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    res.json({ success: true, message: `Payment ${newStatus === 'held_in_escrow' ? 'held in escrow' : 'completed'}` });
  })
);

// POST /payments/:id/release - Release escrow
paymentRoutes.post(
  '/:id/release',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const payment = await database.queryOne<{ status: string; is_escrow: boolean; payer_id: string }>(
      'SELECT status, is_escrow, payer_id FROM payments WHERE id = $1',
      [id]
    );

    if (!payment) throw new AppError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    if (!payment.is_escrow) throw new AppError('NOT_ESCROW', 'This payment is not in escrow', 400);
    if (payment.status !== 'held_in_escrow') {
      throw new AppError('INVALID_STATUS', 'Escrow is not in held status', 400);
    }

    // Only client (payer) or admin can release
    if (payment.payer_id !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only the payer can release escrow', 403);
    }

    await database.transaction(async (client) => {
      // Release escrow
      await client.query(
        "UPDATE payments SET status = 'released', escrow_released_at = NOW(), updated_at = NOW() WHERE id = $1",
        [id]
      );

      // Create payout to trucker
      const payment_data = await client.queryOne<{ payee_id: string; amount: number; currency: string; load_id: string; trip_id: string | null }>(
        'SELECT payee_id, amount, currency, load_id, trip_id FROM payments WHERE id = $1',
        [id]
      );

      if (payment_data) {
        await client.query(
          `INSERT INTO payments (
            load_id, trip_id, payer_id, payee_id, status, type,
            amount, currency, method
          ) VALUES ($1, $2, $3, $4, 'completed', 'escrow_release', $5, $6, 'bank_transfer')`,
          [
            payment_data.load_id,
            payment_data.trip_id,
            payment_data.payee_id, // from escrow account
            payment_data.payee_id,
            payment_data.amount,
            payment_data.currency,
          ]
        );
      }
    });

    res.json({ success: true, message: 'Escrow released successfully' });
  })
);

// GET /payments - List payments
paymentRoutes.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { type, status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE (payer_id = $1 OR payee_id = $1)';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (type) { whereClause += ` AND type = $${paramIndex++}`; params.push(type); }
    if (status) { whereClause += ` AND status = $${paramIndex++}`; params.push(status); }

    const result = await database.query(
      `SELECT * FROM payments ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// POST /payments/payout - Request payout
paymentRoutes.post(
  '/payout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreatePayoutSchema.parse(req.body);

    // Get available balance
    const balance = await database.queryOne<{ available: number }>(
      `SELECT COALESCE(SUM(amount), 0) as available
       FROM payments
       WHERE payee_id = $1 AND status = 'released' AND type = 'escrow_release'`,
      [req.user!.id]
    );

    const available = parseFloat(balance?.available?.toString() || '0');

    if (validated.amount > available) {
      throw new AppError('INSUFFICIENT_FUNDS', `Available balance: $${available.toFixed(2)}`, 400);
    }

    const payout = await database.queryOne(
      `INSERT INTO payments (
        payee_id, status, type, amount, currency, method, description
      ) VALUES ($1, 'processing', 'payout', $2, $3, $4, 'Payout to bank account')
      RETURNING *`,
      [req.user!.id, validated.amount, validated.currency, validated.paymentMethodId]
    );

    // In production: process via Stripe Connect
    res.status(201).json({ success: true, data: payout, message: 'Payout initiated' });
  })
);

// GET /payments/earnings/summary - Earnings summary
paymentRoutes.get(
  '/earnings/summary',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { period = 'month' } = req.query;

    let interval: string;
    switch (period) {
      case 'week': interval = '7 days'; break;
      case 'year': interval = '1 year'; break;
      default: interval = '30 days';
    }

    const summary = await database.queryOne<any>(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_earnings,
        COUNT(*) as total_payments,
        COALESCE(AVG(amount), 0) as avg_payment
       FROM payments
       WHERE payee_id = $1 
       AND type = 'escrow_release'
       AND status = 'completed'
       AND completed_at > NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    // Get previous period for comparison
    const previous = await database.queryOne<any>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE payee_id = $1 
       AND type = 'escrow_release'
       AND status = 'completed'
       AND completed_at BETWEEN NOW() - INTERVAL '${interval}' * 2 AND NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    const current = parseFloat(summary?.total_earnings || '0');
    const prev = parseFloat(previous?.total || '0');
    const growth = prev > 0 ? ((current - prev) / prev * 100) : 0;

    res.json({
      success: true,
      data: {
        period,
        totalEarnings: current,
        totalPayments: parseInt(summary?.total_payments || '0', 10),
        averagePayment: parseFloat(summary?.avg_payment || '0'),
        growthPercentage: Math.round(growth * 100) / 100,
      },
    });
  })
);

export { paymentRoutes };
