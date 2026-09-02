// ============================================================================
// SUBSCRIPTION ROUTES
// ============================================================================

const subscriptionRoutes = Router();

// GET /subscriptions/current - Get current subscription
subscriptionRoutes.get(
  '/current',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sub = await database.queryOne(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [req.user!.id]
    );

    if (!sub) {
      // Create free subscription if none exists
      const newSub = await database.queryOne(
        `INSERT INTO subscriptions (user_id, plan, status, features)
         VALUES ($1, 'free', 'active', $2)
         RETURNING *`,
        [req.user!.id, JSON.stringify({
          maxActiveLoads: 3,
          maxVehicles: 1,
          maxTeamMembers: 1,
          hasAdvancedAnalytics: false,
          hasApiAccess: false,
          hasPrioritySupport: false,
          hasCustomBranding: false,
          hasEscrowService: true,
          hasBackgroundChecks: false,
          hasRouteOptimization: false,
        })]
      );
      return res.json({ success: true, data: newSub });
    }

    res.json({ success: true, data: sub });
  })
);

// POST /subscriptions/upgrade - Upgrade plan
subscriptionRoutes.post(
  '/upgrade',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { plan, interval = 'monthly' } = req.body;

    if (!['pro', 'business', 'enterprise'].includes(plan)) {
      throw new AppError('INVALID_PLAN', 'Invalid subscription plan', 400);
    }

    const planFeatures: Record<string, any> = {
      pro: {
        maxActiveLoads: 50,
        maxVehicles: 10,
        maxTeamMembers: 5,
        hasAdvancedAnalytics: true,
        hasApiAccess: false,
        hasPrioritySupport: true,
        hasCustomBranding: false,
        hasEscrowService: true,
        hasBackgroundChecks: true,
        hasRouteOptimization: true,
      },
      business: {
        maxActiveLoads: 500,
        maxVehicles: 100,
        maxTeamMembers: 50,
        hasAdvancedAnalytics: true,
        hasApiAccess: true,
        hasPrioritySupport: true,
        hasCustomBranding: true,
        hasEscrowService: true,
        hasBackgroundChecks: true,
        hasRouteOptimization: true,
      },
      enterprise: {
        maxActiveLoads: 999999,
        maxVehicles: 999999,
        maxTeamMembers: 999999,
        hasAdvancedAnalytics: true,
        hasApiAccess: true,
        hasPrioritySupport: true,
        hasCustomBranding: true,
        hasEscrowService: true,
        hasBackgroundChecks: true,
        hasRouteOptimization: true,
      },
    };

    const result = await database.queryOne(
      `UPDATE subscriptions 
       SET plan = $1, interval = $2, status = 'active', features = $3,
           current_period_start = NOW(), current_period_end = NOW() + INTERVAL '1 month',
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [plan, interval, JSON.stringify(planFeatures[plan]), req.user!.id]
    );

    res.json({ success: true, data: result, message: `Upgraded to ${plan}` });
  })
);

// POST /subscriptions/cancel - Cancel subscription
subscriptionRoutes.post(
  '/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    await database.query(
      `UPDATE subscriptions 
       SET cancel_at_period_end = TRUE, cancellation_reason = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [reason, req.user!.id]
    );

    res.json({ success: true, message: 'Subscription will be cancelled at the end of the billing period' });
  })
);

// GET /subscriptions/plans - Get all available plans
subscriptionRoutes.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    const plans = {
      free: {
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        features: {
          maxActiveLoads: 3,
          maxVehicles: 1,
          maxTeamMembers: 1,
          hasAdvancedAnalytics: false,
          hasApiAccess: false,
          hasPrioritySupport: false,
          hasCustomBranding: false,
          hasEscrowService: true,
          hasBackgroundChecks: false,
          hasRouteOptimization: false,
        },
        limitations: 'Limited to 3 active loads and 1 vehicle',
      },
      pro: {
        name: 'Pro',
        price: { monthly: 49, yearly: 490 },
        features: {
          maxActiveLoads: 50,
          maxVehicles: 10,
          maxTeamMembers: 5,
          hasAdvancedAnalytics: true,
          hasApiAccess: false,
          hasPrioritySupport: true,
          hasCustomBranding: false,
          hasEscrowService: true,
          hasBackgroundChecks: true,
          hasRouteOptimization: true,
        },
        popular: true,
      },
      business: {
        name: 'Business',
        price: { monthly: 199, yearly: 1990 },
        features: {
          maxActiveLoads: 500,
          maxVehicles: 100,
          maxTeamMembers: 50,
          hasAdvancedAnalytics: true,
          hasApiAccess: true,
          hasPrioritySupport: true,
          hasCustomBranding: true,
          hasEscrowService: true,
          hasBackgroundChecks: true,
          hasRouteOptimization: true,
        },
      },
      enterprise: {
        name: 'Enterprise',
        price: { monthly: 'Custom', yearly: 'Custom' },
        features: {
          maxActiveLoads: 'Unlimited',
          maxVehicles: 'Unlimited',
          maxTeamMembers: 'Unlimited',
          hasAdvancedAnalytics: true,
          hasApiAccess: true,
          hasPrioritySupport: true,
          hasCustomBranding: true,
          hasEscrowService: true,
          hasBackgroundChecks: true,
          hasRouteOptimization: true,
        },
        contact: 'sales@freightconnect.com',
      },
    };

    res.json({ success: true, data: plans });
  })
);

export { subscriptionRoutes };
