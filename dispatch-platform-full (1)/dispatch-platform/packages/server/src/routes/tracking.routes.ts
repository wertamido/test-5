// ============================================================================
// TRACKING ROUTES
// ============================================================================

const trackingRoutes = Router();
const { LocationCache } = require('../config/redis');

// POST /tracking/location - Update live location
trackingRoutes.post(
  '/location',
  authenticate,
  requireRole('trucker', 'admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { tripId, latitude, longitude, speed, heading, accuracy } = req.body;

    if (!tripId || !latitude || !longitude) {
      throw new AppError('MISSING_FIELDS', 'tripId, latitude, and longitude are required', 400);
    }

    // Verify trip ownership
    const trip = await database.queryOne<{ trucker_id: string }>(
      'SELECT trucker_id FROM trips WHERE id = $1',
      [tripId]
    );

    if (!trip) throw new AppError('TRIP_NOT_FOUND', 'Trip not found', 404);
    if (trip.trucker_id !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    const locationCache = LocationCache.getInstance();

    // Store live location
    await locationCache.setLiveLocation(tripId, {
      latitude, longitude, speed: speed || 0, heading: heading || 0,
    });

    // Add to history
    await locationCache.addLocationHistory(tripId, {
      latitude, longitude, speed: speed || 0, heading: heading || 0,
    });

    // Update database (throttled - every 5 minutes)
    await database.query(
      `UPDATE trips 
       SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           current_speed = $3, heading = $4, last_location_update = NOW()
       WHERE id = $5`,
      [longitude, latitude, speed || 0, heading || 0, tripId]
    );

    // Emit via WebSocket
    const { websocketService } = require('../services/websocket.service');
    const load = await database.queryOne<{ load_id: string; client_id: string }>(
      'SELECT load_id, client_id FROM trips WHERE id = $1',
      [tripId]
    );
    if (load) {
      websocketService.emitToUser(load.client_id, 'trip:location_update', {
        tripId,
        location: { latitude, longitude, speed, heading, accuracy, timestamp: Date.now() },
      });
    }

    res.json({ success: true, message: 'Location updated' });
  })
);

// GET /tracking/:tripId/live - Get live location
trackingRoutes.get(
  '/:tripId/live',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { tripId } = req.params;

    // Verify access
    const trip = await database.queryOne<{ trucker_id: string; client_id: string }>(
      `SELECT t.trucker_id, l.client_id 
       FROM trips t JOIN loads l ON l.id = t.load_id 
       WHERE t.id = $1`,
      [tripId]
    );

    if (!trip) throw new AppError('TRIP_NOT_FOUND', 'Trip not found', 404);
    if (
      trip.trucker_id !== req.user!.id &&
      trip.client_id !== req.user!.id &&
      req.user!.role !== 'admin'
    ) {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    const locationCache = LocationCache.getInstance();
    const live = await locationCache.getLiveLocation(tripId);

    if (!live) {
      // Fallback to database
      const dbTrip = await database.queryOne<{ current_location: any; current_speed: number; heading: number }>(
        'SELECT current_location, current_speed, heading FROM trips WHERE id = $1',
        [tripId]
      );

      if (!dbTrip?.current_location) {
        return res.json({ success: true, data: null });
      }

      return res.json({
        success: true,
        data: {
          latitude: dbTrip.current_location.coordinates[1],
          longitude: dbTrip.current_location.coordinates[0],
          speed: dbTrip.current_speed,
          heading: dbTrip.heading,
          timestamp: Date.now(),
          source: 'database',
        },
      });
    }

    res.json({ success: true, data: { ...live, source: 'live' } });
  })
);

// GET /tracking/:tripId/history - Get location history
trackingRoutes.get(
  '/:tripId/history',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const { startTime, endTime } = req.query;

    // Verify access (same as above)
    const trip = await database.queryOne<{ trucker_id: string; client_id: string }>(
      `SELECT t.trucker_id, l.client_id 
       FROM trips t JOIN loads l ON l.id = t.load_id 
       WHERE t.id = $1`,
      [tripId]
    );

    if (!trip) throw new AppError('TRIP_NOT_FOUND', 'Trip not found', 404);
    if (
      trip.trucker_id !== req.user!.id &&
      trip.client_id !== req.user!.id &&
      req.user!.role !== 'admin'
    ) {
      throw new AppError('FORBIDDEN', 'Permission denied', 403);
    }

    const locationCache = LocationCache.getInstance();
    const start = startTime ? new Date(startTime as string).getTime() : Date.now() - 24 * 60 * 60 * 1000;
    const end = endTime ? new Date(endTime as string).getTime() : Date.now();

    const history = await locationCache.getLocationHistory(tripId, start, end);

    res.json({ success: true, data: history });
  })
);

// GET /tracking/fleet - Get all active fleet locations (business/enterprise)
trackingRoutes.get(
  '/fleet/all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'client' && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only clients can view fleet tracking', 403);
    }

    // Get all active trips for loads posted by this client
    const trips = await database.queryMany(
      `SELECT 
        t.id, t.current_location, t.current_speed, t.heading,
        l.reference_number, l.pickup, l.delivery,
        u.first_name, u.last_name, u.avatar_url
       FROM trips t
       JOIN loads l ON l.id = t.load_id
       JOIN users u ON u.id = t.trucker_id
       WHERE l.client_id = $1
       AND t.status NOT IN ('completed', 'cancelled')`,
      [req.user!.id]
    );

    const locations = trips.rows.map((trip: any) => ({
      tripId: trip.id,
      referenceNumber: trip.reference_number,
      trucker: {
        name: `${trip.first_name} ${trip.last_name}`,
        avatar: trip.avatar_url,
      },
      location: trip.current_location ? {
        latitude: trip.current_location.coordinates[1],
        longitude: trip.current_location.coordinates[0],
      } : null,
      speed: trip.current_speed,
      heading: trip.heading,
      pickup: trip.pickup,
      delivery: trip.delivery,
    }));

    res.json({ success: true, data: locations });
  })
);

export { trackingRoutes };