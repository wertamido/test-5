/**
 * Integration Tests — Loads & Bids
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/config/database';

const BASE_URL = '/api/v1';
let carrierToken: string;
let shipperToken: string;
let loadId: string;

// Test users
const carrier = {
  email: `carrier_${Date.now()}@test.com`,
  password: 'CarrierPass123!',
  role: 'carrier' as const,
  firstName: 'Carrier',
  lastName: 'Test',
};

const shipper = {
  email: `shipper_${Date.now()}@test.com`,
  password: 'ShipperPass123!',
  role: 'shipper' as const,
  firstName: 'Shipper',
  lastName: 'Test',
  companyName: 'Test Shipping Co',
};

beforeAll(async () => {
  // Register and login carrier
  const cReg = await request(app).post(`${BASE_URL}/auth/register`).send(carrier);
  carrierToken = cReg.body.accessToken;

  // Register and login shipper
  const sReg = await request(app).post(`${BASE_URL}/auth/register`).send(shipper);
  shipperToken = sReg.body.accessToken;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  await pool.end();
});

describe('Loads', () => {
  describe('POST /loads', () => {
    it('should create a load (shipper only)', async () => {
      const loadData = {
        origin: { address: '123 Main St', city: 'Montreal', state: 'QC', zip: 'H1A 1A1', latitude: 45.5017, longitude: -73.5673 },
        destination: { address: '456 King St', city: 'Toronto', state: 'ON', zip: 'M5V 1K1', latitude: 43.6532, longitude: -79.3832 },
        pickupDate: new Date(Date.now() + 86400000).toISOString(),
        deliveryDate: new Date(Date.now() + 172800000).toISOString(),
        weight: 42000,
        rate: 2500,
        equipmentType: 'dry_van',
        commodity: 'General Freight',
      };

      const response = await request(app)
        .post(`${BASE_URL}/loads`)
        .set('Authorization', `Bearer ${shipperToken}`)
        .send(loadData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.origin.city).toBe('Montreal');
      expect(response.body.rate).toBe(2500);
      loadId = response.body.id;
    });

    it('should reject load creation for carrier', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/loads`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send({})
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/loads`)
        .set('Authorization', `Bearer ${shipperToken}`)
        .send({ rate: 1000 }) // Missing origin, destination
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /loads', () => {
    it('should list available loads', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/loads`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/loads?status=posted`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .expect(200);

      expect(response.body.data.every((l: any) => l.status === 'posted')).toBe(true);
    });

    it('should search by origin city', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/loads?origin=Montreal`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /loads/:id', () => {
    it('should return load details', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/loads/${loadId}`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .expect(200);

      expect(response.body.id).toBe(loadId);
      expect(response.body).toHaveProperty('origin');
      expect(response.body).toHaveProperty('destination');
    });

    it('should return 404 for non-existent load', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/loads/nonexistent-id`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .expect(404);
    });
  });
});

describe('Bids', () => {
  describe('POST /bids', () => {
    it('should create a bid on a load (carrier only)', async () => {
      const bidData = { loadId, amount: 2200, message: 'Available immediately!' };

      const response = await request(app)
        .post(`${BASE_URL}/bids`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send(bidData)
        .expect(201);

      expect(response.body.amount).toBe(2200);
      expect(response.body.status).toBe('pending');
      expect(response.body.loadId).toBe(loadId);
    });

    it('should reject bid from shipper', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/bids`)
        .set('Authorization', `Bearer ${shipperToken}`)
        .send({ loadId, amount: 2000 })
        .expect(403);
    });

    it('should reject bid below minimum', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/bids`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send({ loadId, amount: 50 }) // Too low
        .expect(400);
    });
  });

  describe('POST /bids/:id/accept', () => {
    it('should allow shipper to accept bid', async () => {
      // First create a bid
      const bid = await request(app)
        .post(`${BASE_URL}/bids`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send({ loadId, amount: 2300 });

      const bidId = bid.body.id;

      const response = await request(app)
        .post(`${BASE_URL}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${shipperToken}`)
        .expect(200);

      expect(response.body.status).toBe('accepted');

      // Load should now be assigned
      const loadResponse = await request(app)
        .get(`${BASE_URL}/loads/${loadId}`)
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(loadResponse.body.status).toBe('assigned');
    });

    it('should reject acceptance by non-owner shipper', async () => {
      // Create another shipper
      const otherShipper = {
        email: `other_${Date.now()}@test.com`,
        password: 'OtherPass123!',
        role: 'shipper' as const,
      };
      const reg = await request(app).post(`${BASE_URL}/auth/register`).send(otherShipper);
      const otherToken = reg.body.accessToken;

      // Create a new load owned by otherShipper
      const newLoad = await request(app)
        .post(`${BASE_URL}/loads`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          origin: { city: 'Boston', state: 'MA', latitude: 42.3601, longitude: -71.0589 },
          destination: { city: 'NYC', state: 'NY', latitude: 40.7128, longitude: -74.0060 },
          pickupDate: new Date(Date.now() + 86400000).toISOString(),
          deliveryDate: new Date(Date.now() + 172800000).toISOString(),
          weight: 30000, rate: 1500, equipmentType: 'dry_van',
        });

      const otherLoadId = newLoad.body.id;

      // Carrier bids
      const bid = await request(app)
        .post(`${BASE_URL}/bids`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send({ loadId: otherLoadId, amount: 1300 });

      // Original shipper tries to accept — should fail
      const response = await request(app)
        .post(`${BASE_URL}/bids/${bid.body.id}/accept`)
        .set('Authorization', `Bearer ${shipperToken}`)
        .expect(403);

      expect(response.body.code).toBe('NOT_OWNER');
    });
  });
});
