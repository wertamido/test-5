/**
 * Database Seed Script
 * 
 * Populates the database with realistic test data:
 * - Admin user
 * - Truckers with vehicles
 * - Clients with companies
 * - Sample loads
 * - Bids
 * - Completed trips
 * - Ratings
 */

import 'dotenv/config';
import { database } from '../config/database';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;
const PASSWORD_HASH = bcrypt.hashSync('Password123!', SALT_ROUNDS);

async function seed() {
  logger.info('🌱 Starting database seeding...');

  try {
    await database.connect();

    // ==========================================================================
    // 1. ADMIN USER
    // ==========================================================================
    logger.info('Creating admin user...');
    const adminId = uuidv4();
    await database.query(
      `INSERT INTO users (
        id, email, phone, password_hash, role, status, verification_level,
        first_name, last_name, preferred_language, timezone,
        address, email_verified_at, phone_verified_at
      ) VALUES ($1, $2, $3, $4, 'admin', 'active', 'premium', $5, $6, 'en', 'UTC', $7, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING`,
      [
        adminId,
        'admin@freightconnect.com',
        '+15555550000',
        PASSWORD_HASH,
        'System',
        'Administrator',
        JSON.stringify({
          street1: '123 Admin St',
          city: 'Admin City',
          state: 'AD',
          postalCode: '00000',
          country: 'US',
        }),
      ]
    );

    await database.query(
      `INSERT INTO admin_users (user_id, role, permissions) VALUES ($1, 'super_admin', ARRAY['*'])
       ON CONFLICT (user_id) DO NOTHING`,
      [adminId]
    );

    // ==========================================================================
    // 2. TRUCKERS (20)
    // ==========================================================================
    logger.info('Creating truckers...');
    const truckerIds: string[] = [];
    const truckerNames = [
      ['John', 'Smith'], ['Maria', 'Garcia'], ['Robert', 'Johnson'], ['Wei', 'Zhang'],
      ['Carlos', 'Rodriguez'], ['Ahmed', 'Hassan'], ['Sergei', 'Volkov'], ['Pierre', 'Dubois'],
      ['Hans', 'Müller'], ['Giuseppe', 'Rossi'], ['James', 'Wilson'], ['Fatima', 'Al-Sayed'],
      ['Diego', 'Hernandez'], ['Olga', 'Petrov'], ['Lucas', 'Silva'], ['Emma', 'Brown'],
      ['Mohammed', 'Khan'], ['Chen', 'Wei'], ['Andre', 'Moreau'], ['Katarina', 'Novak'],
    ];
    const companies = [
      'Smith Transport', 'Garcia Logistics', 'RJ Trucking', 'Zhang Freight',
      'Rodriguez Hauling', 'Hassan Transport', 'Volkov Express', 'Dubois Shipping',
      'Müller Logistics', 'Rossi Transport', 'Wilson Freight', 'Al-Sayed Hauling',
      'Hernandez Express', 'Petrov Logistics', 'Silva Transport', 'Brown Trucking',
      'Khan Freight', 'Wei Shipping', 'Moreau Express', 'Novak Logistics',
    ];

    for (let i = 0; i < 20; i++) {
      const id = uuidv4();
      truckerIds.push(id);
      const [firstName, lastName] = truckerNames[i];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@truck.example.com`;

      await database.query(
        `INSERT INTO users (
          id, email, phone, password_hash, role, status, verification_level,
          first_name, last_name, company_name, preferred_language, timezone,
          license_number, license_class, license_expiry, years_of_experience,
          address, email_verified_at, phone_verified_at
        ) VALUES ($1, $2, $3, $4, 'trucker', 'active', 'verified', $5, $6, $7, 'en', 'UTC', $8, 'A', $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING`,
        [
          id, email, `+1555555${String(i).padStart(4, '0')}`, PASSWORD_HASH,
          firstName, lastName, companies[i],
          `CDL${String(i).padStart(6, '0')}`, 'A',
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          Math.floor(Math.random() * 20) + 2,
          JSON.stringify({
            street1: `${i + 100} Main St`,
            city: ['Chicago', 'Dallas', 'Atlanta', 'Phoenix', 'Denver', 'Seattle', 'Miami', 'Boston'][i % 8],
            state: ['IL', 'TX', 'GA', 'AZ', 'CO', 'WA', 'FL', 'MA'][i % 8],
            postalCode: `${10000 + i * 111}`,
            country: 'US',
            coordinates: {
              latitude: 37.7749 + (Math.random() - 0.5) * 10,
              longitude: -122.4194 + (Math.random() - 0.5) * 10,
            },
          }),
        ]
      );

      // Add subscription
      await database.query(
        `INSERT INTO subscriptions (user_id, plan, status, features) VALUES ($1, 'pro', 'active', $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, JSON.stringify({
          maxActiveLoads: 50, maxVehicles: 10, maxTeamMembers: 5,
          hasAdvancedAnalytics: true, hasApiAccess: false, hasPrioritySupport: true,
          hasCustomBranding: false, hasEscrowService: true, hasBackgroundChecks: true,
          hasRouteOptimization: true,
        })]
      );

      // Add vehicles
      const vehicleTypes = ['tractor', 'straight_truck', 'van', 'reefer', 'flatbed'];
      const makes = ['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack'];
      const models = ['Cascadia', '579', 'T680', 'VNL 860', 'Anthem'];

      for (let v = 0; v < 2; v++) {
        await database.query(
          `INSERT INTO vehicles (
            trucker_id, type, make, model, year, color, vin, license_plate,
            jurisdiction, specifications, status, registration_expiry,
            inspection_expiry, insurance_expiry
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'US', $9, 'active', $10, $11, $12)
          ON CONFLICT (vin) DO NOTHING`,
          [
            id,
            vehicleTypes[(i + v) % vehicleTypes.length],
            makes[(i + v) % makes.length],
            models[(i + v) % models.length],
            2018 + (i % 6),
            ['Red', 'Blue', 'White', 'Black', 'Silver'][(i + v) % 5],
            `VIN${String(i).padStart(3, '0')}${String(v).padStart(3, '0')}${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            `${1000 + i * 10 + v}`,
            JSON.stringify({
              grossWeight: 36000,
              payloadCapacity: 25000,
              fuelCapacity: 300,
              fuelType: 'diesel',
              horsepower: 450,
              trailerType: ['dry_van', 'reefer', 'flatbed'][(i + v) % 3],
              trailerLength: 53,
              trailerWidth: 8.5,
              trailerHeight: 13.5,
              maxPallets: 26,
              hasLiftgate: i % 3 === 0,
              hasAirRide: true,
              hasRefrigeration: vehicleTypes[(i + v) % vehicleTypes.length] === 'reefer',
            }),
            new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            new Date(Date.now() + 270 * 24 * 60 * 60 * 1000),
          ]
        );
      }

      // Add documents
      const docTypes = ['cdl_license', 'vehicle_registration', 'insurance', 'dot_medical_card'];
      for (const docType of docTypes) {
        await database.query(
          `INSERT INTO documents (user_id, type, status, filename, url) VALUES ($1, $2, 'approved', $3, $4)`,
          [id, docType, `${docType}_${id}.pdf`, `https://storage.freightconnect.com/documents/${id}/${docType}.pdf`]
        );
      }
    }

    // ==========================================================================
    // 3. CLIENTS (15)
    // ==========================================================================
    logger.info('Creating clients...');
    const clientIds: string[] = [];
    const clientCompanies = [
      'Walmart Distribution', 'Amazon Fulfillment', 'FedEx Logistics', 'UPS Supply Chain',
      'Home Depot', 'Lowes Companies', 'Target Corporation', 'Costco Wholesale',
      'Coca-Cola Bottling', 'PepsiCo', 'Kraft Heinz', 'Nestle USA',
      'Procter & Gamble', 'Johnson & Johnson', 'General Mills',
    ];

    for (let i = 0; i < 15; i++) {
      const id = uuidv4();
      clientIds.push(id);
      const companyName = clientCompanies[i];

      await database.query(
        `INSERT INTO users (
          id, email, phone, password_hash, role, status, verification_level,
          first_name, last_name, company_name, company_type,
          preferred_language, timezone, address, email_verified_at, phone_verified_at
        ) VALUES ($1, $2, $3, $4, 'client', 'active', 'verified', $5, $6, $7, 'shipper', 'en', 'UTC', $8, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING`,
        [
          id, `logistics@${companyName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
          `+1555566${String(i).padStart(4, '0')}`, PASSWORD_HASH,
          ['David', 'Sarah', 'Michael', 'Jennifer', 'William', 'Linda'][i % 6],
          ['Anderson', 'Thompson', 'Williams', 'Davis', 'Miller', 'Wilson'][i % 6],
          companyName,
          JSON.stringify({
            street1: `${i * 10 + 1} Industrial Pkwy`,
            city: ['Chicago', 'Dallas', 'Atlanta', 'Phoenix', 'Denver'][i % 5],
            state: ['IL', 'TX', 'GA', 'AZ', 'CO'][i % 5],
            postalCode: `${20000 + i * 111}`,
            country: 'US',
            coordinates: {
              latitude: 41.8781 + (Math.random() - 0.5) * 5,
              longitude: -87.6298 + (Math.random() - 0.5) * 5,
            },
          }),
        ]
      );

      await database.query(
        `INSERT INTO subscriptions (user_id, plan, status, features) VALUES ($1, 'business', 'active', $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, JSON.stringify({
          maxActiveLoads: 500, maxVehicles: 100, maxTeamMembers: 50,
          hasAdvancedAnalytics: true, hasApiAccess: true, hasPrioritySupport: true,
          hasCustomBranding: true, hasEscrowService: true, hasBackgroundChecks: true,
          hasRouteOptimization: true,
        })]
      );
    }

    // ==========================================================================
    // 4. LOADS (50)
    // ==========================================================================
    logger.info('Creating loads...');
    const loadIds: string[] = [];
    const freightTypes = ['dry_van', 'reefer', 'flatbed', 'step_deck', 'container', 'tanker'];
    const commodities = [
      'Electronics', 'Fresh Produce', 'Construction Materials', 'Automotive Parts',
      'Consumer Goods', 'Pharmaceuticals', 'Beverages', 'Paper Products',
      'Machinery', 'Textiles', 'Frozen Foods', 'Chemicals',
    ];
    const cities = [
      { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
      { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
      { city: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 },
      { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
      { city: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
      { city: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
      { city: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
      { city: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 },
      { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
      { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 },
    ];

    for (let i = 0; i < 50; i++) {
      const id = uuidv4();
      loadIds.push(id);
      const clientId = clientIds[i % clientIds.length];
      const pickup = cities[i % cities.length];
      const delivery = cities[(i + 3) % cities.length];
      const freightType = freightTypes[i % freightTypes.length];
      const commodity = commodities[i % commodities.length];
      const weight = Math.floor(Math.random() * 40000) + 5000;
      const distance = Math.floor(Math.random() * 2000) + 200;
      const rate = Math.floor(distance * (2 + Math.random() * 3));
      const refNum = `FC-2026-${String(i + 1).padStart(6, '0')}`;

      const status = i < 20 ? 'posted' : i < 30 ? 'bidding' : i < 40 ? 'assigned' : 'completed';
      const assignedTrucker = status !== 'posted' && status !== 'bidding' ? truckerIds[i % truckerIds.length] : null;

      const result = await database.queryOne<{ id: string }>(
        `INSERT INTO loads (
          id, reference_number, client_id, status, urgency, freight_type, category,
          pickup, delivery, stops, total_distance, estimated_duration,
          description, commodity, weight, dimensions, pieces, pallets,
          equipment_required, pricing, pickup_date, delivery_date,
          assigned_trucker_id, posted_at, current_location,
          pickup_city, delivery_city, pickup_state, delivery_state
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW() - INTERVAL '${Math.floor(Math.random() * 48)} hours', $24, $25, $26, $27, $28)
        RETURNING id`,
        [
          id, refNum, clientId, status,
          ['standard', 'expedited', 'urgent'][i % 3],
          freightType,
          [freightType, commodity.toLowerCase().replace(/\s/g, '_')],
          JSON.stringify({
            name: `${pickup.city} Warehouse`,
            address: {
              street1: `${i * 10 + 1} ${pickup.city} St`,
              city: pickup.city, state: pickup.state,
              postalCode: `${10000 + i}`, country: 'US',
              coordinates: { latitude: pickup.lat, longitude: pickup.lon },
            },
          }),
          JSON.stringify({
            name: `${delivery.city} Distribution Center`,
            address: {
              street1: `${i * 20 + 5} ${delivery.city} Ave`,
              city: delivery.city, state: delivery.state,
              postalCode: `${20000 + i}`, country: 'US',
              coordinates: { latitude: delivery.lat, longitude: delivery.lon },
            },
          }),
          JSON.stringify([]),
          distance,
          Math.floor(distance / 60),
          `${commodity} - ${weight} lbs, ${Math.floor(weight / 2000)} pallets`,
          commodity,
          weight,
          JSON.stringify({ length: 48, width: 40, height: 48 }),
          Math.floor(weight / 2000) * 20,
          Math.floor(weight / 2000),
          JSON.stringify([{
            type: freightType,
            minLength: 48,
            features: freightType === 'reefer' ? ['refrigeration'] : [],
          }]),
          JSON.stringify({
            offeredRate: rate,
            currency: 'USD',
            pricingModel: 'flat',
            tollsIncluded: true,
            escrowRequired: true,
            escrowAmount: rate,
          }),
          new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + (Math.random() * 5 + 2) * 24 * 60 * 60 * 1000),
          assignedTrucker,
          JSON.stringify({ type: 'Point', coordinates: [pickup.lon, pickup.lat] }),
          pickup.city, delivery.city, pickup.state, delivery.state,
        ]
      );
    }

    // ==========================================================================
    // 5. BIDS
    // ==========================================================================
    logger.info('Creating bids...');
    for (let i = 0; i < 30; i++) {
      const loadId = loadIds[i % 20]; // Bids on first 20 loads
      const truckerId = truckerIds[(i * 3) % truckerIds.length];
      const baseRate = 500 + Math.floor(Math.random() * 2000);

      await database.query(
        `INSERT INTO bids (
          load_id, trucker_id, status, amount, currency,
          estimated_pickup_time, estimated_delivery_time, message
        ) VALUES ($1, $2, $3, $4, 'USD', NOW() + INTERVAL '${i} hours', NOW() + INTERVAL '${i + 24} hours', $5)
        ON CONFLICT (load_id, trucker_id) DO NOTHING`,
        [loadId, truckerId, i % 5 === 0 ? 'accepted' : 'pending', baseRate, `I can deliver this load on time. Available ${i % 2 === 0 ? 'reefer' : 'dry van'} trailer.`]
      );
    }

    // ==========================================================================
    // 6. TRIPS (for assigned/completed loads)
    // ==========================================================================
    logger.info('Creating trips...');
    for (let i = 30; i < 50; i++) {
      const loadId = loadIds[i];
      const load = await database.queryOne<{
        client_id: string; assigned_trucker_id: string | null; pickup_date: Date; delivery_date: Date;
      }>('SELECT client_id, assigned_trucker_id, pickup_date, delivery_date FROM loads WHERE id = $1', [loadId]);

      if (!load?.assigned_trucker_id) continue;

      const vehicle = await database.queryOne<{ id: string }>(
        'SELECT id FROM vehicles WHERE trucker_id = $1 LIMIT 1',
        [load.assigned_trucker_id]
      );

      if (!vehicle) continue;

      const status = i < 40 ? 'completed' : ['en_route_pickup', 'loading', 'en_route_delivery', 'at_delivery'][i % 4];
      const actualPickup = i < 40 ? load.pickup_date : null;
      const actualDelivery = i < 40 ? load.delivery_date : null;

      const trip = await database.queryOne<{ id: string }>(
        `INSERT INTO trips (
          load_id, trucker_id, vehicle_id, status,
          scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery,
          route, driver_hours_today, driver_hours_week
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          loadId, load.assigned_trucker_id, vehicle.id, status,
          load.pickup_date, load.delivery_date, actualPickup, actualDelivery,
          JSON.stringify([]),
          Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 50),
        ]
      );

      // Add ratings for completed trips
      if (i < 40) {
        await database.query(
          `INSERT INTO ratings (load_id, trip_id, reviewer_id, reviewee_id, rating, categories, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (load_id, reviewer_id, reviewee_id) DO NOTHING`,
          [
            loadId, trip?.id, load.client_id, load.assigned_trucker_id,
            3 + Math.floor(Math.random() * 3),
            JSON.stringify({
              communication: 3 + Math.floor(Math.random() * 3),
              punctuality: 3 + Math.floor(Math.random() * 3),
              professionalism: 4 + Math.floor(Math.random() * 2),
              cargoCare: 4 + Math.floor(Math.random() * 2),
              paymentPromptness: 5,
            }),
            ['Great service!', 'On time and professional.', 'Would use again.', 'Excellent communication.', 'Smooth transaction.'][i % 5],
          ]
        );

        // Create completed payment
        await database.query(
          `INSERT INTO payments (load_id, trip_id, payer_id, payee_id, status, type, amount, currency, method, completed_at)
           SELECT l.id, $2, l.client_id, l.assigned_trucker_id, 'completed', 'escrow_release',
                  (l.pricing->>'offeredRate')::numeric, 'USD', 'bank_transfer', NOW()
           FROM loads l WHERE l.id = $1`,
          [loadId, trip?.id]
        );
      }
    }

    // ==========================================================================
    // 7. CONVERSATIONS & MESSAGES
    // ==========================================================================
    logger.info('Creating conversations...');
    for (let i = 0; i < 10; i++) {
      const conv = await database.queryOne<{ id: string }>(
        `INSERT INTO conversations (type, participants, load_id, title) 
         VALUES ('load_group', $1, $2, $3)
         RETURNING id`,
        [
          [clientIds[i % clientIds.length], truckerIds[i % truckerIds.length]],
          loadIds[i],
          `Load Discussion - ${loadIds[i].substring(0, 8)}`,
        ]
      );

      // Add messages
      for (let m = 0; m < 5; m++) {
        await database.query(
          `INSERT INTO messages (conversation_id, sender_id, type, content)
           VALUES ($1, $2, 'text', $3)`,
          [
            conv?.id,
            m % 2 === 0 ? clientIds[i % clientIds.length] : truckerIds[i % truckerIds.length],
            ['Hi, is this load still available?', 'Yes, are you interested?', 'What time can you pickup?', 'I can be there by 10 AM tomorrow.', 'Perfect, see you then!'][m],
          ]
        );
      }
    }

    // ==========================================================================
    // 8. NOTIFICATIONS
    // ==========================================================================
    logger.info('Creating notifications...');
    for (const userId of [...truckerIds.slice(0, 10), ...clientIds.slice(0, 5)]) {
      await database.query(
        `INSERT INTO notifications (user_id, type, priority, title, body, is_read)
         VALUES ($1, 'load_alert', 'normal', 'New Load Available', 'A new load matching your preferences has been posted.', $2)`,
        [userId, Math.random() > 0.5]
      );
    }

    logger.info('✅ Database seeding completed successfully!');
    logger.info(`
┌─────────────────────────────────────────────────────────────────┐
│                    SEED DATA SUMMARY                            │
├─────────────────────────────────────────────────────────────────┤
│  Admin Users:    1                                             │
│  Truckers:       20                                            │
│  Clients:        15                                            │
│  Vehicles:       40                                            │
│  Loads:          50                                            │
│  Bids:           ~30                                           │
│  Trips:          ~20                                           │
│  Ratings:        ~10                                           │
│  Conversations:  10                                            │
│  Messages:       50                                            │
├─────────────────────────────────────────────────────────────────┤
│  Login: admin@freightconnect.com / Password123!                 │
│  Or any trucker/client email / Password123!                     │
└─────────────────────────────────────────────────────────────────┘
    `);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
