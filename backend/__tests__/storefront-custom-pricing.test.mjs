/**
 * storefront-custom-pricing.test.mjs - Backend Tests for Custom Package Pricing
 * ==============================================================================
 * Tests the /api/storefront/calculate-price endpoint
 *
 * Test Coverage:
 * - Volume discount tier calculations (Bronze, Silver, Gold)
 * - Business rule validation (min/max sessions)
 * - Edge cases and error handling
 * - Performance and response times
 *
 * AI Village: Testing Strategy by ChatGPT-5 (QA Lead)
 */

import request from 'supertest';
import express from 'express';
import storeFrontRoutes from '../routes/storeFrontRoutes.mjs';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/storefront', storeFrontRoutes);

describe('Custom Package Pricing Endpoint - /api/storefront/calculate-price', () => {

  // ===================== BRONZE TIER TESTS (10-19 sessions) =====================

  describe('Bronze Tier Pricing (10-19 sessions)', () => {
    it('should calculate correct pricing for 10 sessions (minimum bronze)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pricing).toMatchObject({
        sessions: 10,
        pricePerSession: 165,
        volumeDiscount: 10,
        discountTier: 'bronze',
        subtotal: 1750,
        totalDiscount: 100,
        finalTotal: 1650
      });
    });

    it('should calculate correct pricing for 15 sessions (mid-bronze)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 15 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 15,
        pricePerSession: 165,
        volumeDiscount: 10,
        discountTier: 'bronze',
        subtotal: 2625,
        totalDiscount: 150,
        finalTotal: 2475
      });
    });

    it('should calculate correct pricing for 19 sessions (maximum bronze)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 19 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 19,
        pricePerSession: 165,
        volumeDiscount: 10,
        discountTier: 'bronze',
        finalTotal: 3135
      });
    });

    it('should provide metadata with next tier info for bronze', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 15 });

      expect(response.body.pricing.metadata).toMatchObject({
        nextTierSessions: 20,
        nextTierDiscount: 13,
        nextTierMessage: expect.stringContaining('Silver tier')
      });
    });
  });

  // ===================== SILVER TIER TESTS (20-39 sessions) =====================

  describe('Silver Tier Pricing (20-39 sessions)', () => {
    it('should calculate correct pricing for 20 sessions (minimum silver)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 20 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 20,
        pricePerSession: 162,
        volumeDiscount: 13,
        discountTier: 'silver',
        subtotal: 3500,
        totalDiscount: 260,
        finalTotal: 3240
      });
    });

    it('should calculate correct pricing for 25 sessions (mid-silver)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 25,
        pricePerSession: 162,
        volumeDiscount: 13,
        discountTier: 'silver',
        subtotal: 4375,
        totalDiscount: 325,
        finalTotal: 4050
      });
    });

    it('should calculate correct pricing for 39 sessions (maximum silver)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 39 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 39,
        pricePerSession: 162,
        volumeDiscount: 13,
        discountTier: 'silver',
        finalTotal: 6318
      });
    });

    it('should include silver tier badge in savings message', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(response.body.pricing.savingsMessage).toContain('🥈');
      expect(response.body.pricing.savingsMessage).toContain('Silver tier discount unlocked');
    });

    it('should provide metadata with next tier info for silver', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(response.body.pricing.metadata).toMatchObject({
        nextTierSessions: 40,
        nextTierDiscount: 15,
        nextTierMessage: expect.stringContaining('Gold tier')
      });
    });
  });

  // ===================== GOLD TIER TESTS (40-100 sessions) =====================

  describe('Gold Tier Pricing (40-100 sessions)', () => {
    it('should calculate correct pricing for 40 sessions (minimum gold)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 40 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 40,
        pricePerSession: 160,
        volumeDiscount: 15,
        discountTier: 'gold',
        subtotal: 7000,
        totalDiscount: 600,
        finalTotal: 6400
      });
    });

    it('should calculate correct pricing for 50 sessions (mid-gold)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 50 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 50,
        pricePerSession: 160,
        volumeDiscount: 15,
        discountTier: 'gold',
        subtotal: 8750,
        totalDiscount: 750,
        finalTotal: 8000
      });
    });

    it('should calculate correct pricing for 100 sessions (maximum gold)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 100 });

      expect(response.status).toBe(200);
      expect(response.body.pricing).toMatchObject({
        sessions: 100,
        pricePerSession: 160,
        volumeDiscount: 15,
        discountTier: 'gold',
        subtotal: 17500,
        totalDiscount: 1500,
        finalTotal: 16000
      });
    });

    it('should include gold tier badge in savings message', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 50 });

      expect(response.body.pricing.savingsMessage).toContain('🥇');
      expect(response.body.pricing.savingsMessage).toContain('Gold tier discount - best value');
    });

    it('should indicate no next tier for gold', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 50 });

      expect(response.body.pricing.metadata).toMatchObject({
        nextTierSessions: null,
        nextTierDiscount: null,
        nextTierMessage: expect.stringContaining('best pricing')
      });
    });
  });

  // ===================== BUSINESS RULE VALIDATION TESTS =====================

  describe('Business Rule Validation', () => {
    it('should reject requests with missing sessions parameter', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Sessions parameter is required');
    });

    it('should reject sessions below minimum (< 10)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Minimum 10 sessions required');
      expect(response.body.businessRule).toContain('Profitability threshold');
    });

    it('should reject sessions above maximum (> 100)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 105 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum 100 sessions allowed');
      expect(response.body.businessRule).toContain('Capacity planning');
    });

    it('should reject non-numeric sessions parameter', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject negative sessions', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: -10 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject zero sessions', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ===================== EDGE CASE TESTS =====================

  describe('Edge Cases', () => {
    it('should handle tier boundary at 19→20 sessions', async () => {
      const response19 = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 19 });

      const response20 = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 20 });

      expect(response19.body.pricing.discountTier).toBe('bronze');
      expect(response20.body.pricing.discountTier).toBe('silver');

      // Verify discount increases at tier boundary
      expect(response20.body.pricing.volumeDiscount).toBeGreaterThan(
        response19.body.pricing.volumeDiscount
      );
    });

    it('should handle tier boundary at 39→40 sessions', async () => {
      const response39 = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 39 });

      const response40 = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 40 });

      expect(response39.body.pricing.discountTier).toBe('silver');
      expect(response40.body.pricing.discountTier).toBe('gold');

      // Verify discount increases at tier boundary
      expect(response40.body.pricing.volumeDiscount).toBeGreaterThan(
        response39.body.pricing.volumeDiscount
      );
    });

    it('should handle custom base price per session', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 20, pricePerSession: 200 });

      expect(response.status).toBe(200);
      expect(response.body.pricing.pricePerSession).toBe(187); // 200 - 13
      expect(response.body.pricing.subtotal).toBe(4000); // 20 * 200
    });

    it('should handle decimal sessions (should round)', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 15.7 });

      expect(response.status).toBe(200);
      expect(response.body.pricing.sessions).toBe(15); // parseInt rounds down
    });

    it('should calculate correct discount percentage', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      const expectedPercentage = (325 / 4375) * 100;
      expect(parseFloat(response.body.pricing.discountPercentage)).toBeCloseTo(expectedPercentage, 1);
    });
  });

  // ===================== PERFORMANCE TESTS =====================

  describe('Performance', () => {
    it('should respond within 100ms', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/api/storefront/calculate-price')
          .query({ sessions: 10 + (i * 5) })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.pricing.sessions).toBe(10 + (index * 5));
      });
    });
  });

  // ===================== RESPONSE FORMAT TESTS =====================

  describe('Response Format', () => {
    it('should return all required pricing fields', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(response.body.pricing).toHaveProperty('sessions');
      expect(response.body.pricing).toHaveProperty('pricePerSession');
      expect(response.body.pricing).toHaveProperty('volumeDiscount');
      expect(response.body.pricing).toHaveProperty('discountPercentage');
      expect(response.body.pricing).toHaveProperty('discountTier');
      expect(response.body.pricing).toHaveProperty('subtotal');
      expect(response.body.pricing).toHaveProperty('totalDiscount');
      expect(response.body.pricing).toHaveProperty('finalTotal');
      expect(response.body.pricing).toHaveProperty('savingsMessage');
      expect(response.body.pricing).toHaveProperty('metadata');
    });

    it('should return metadata with all required fields', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 15 });

      expect(response.body.pricing.metadata).toHaveProperty('nextTierSessions');
      expect(response.body.pricing.metadata).toHaveProperty('nextTierDiscount');
      expect(response.body.pricing.metadata).toHaveProperty('nextTierMessage');
    });

    it('should return numeric types for pricing values', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(typeof response.body.pricing.sessions).toBe('number');
      expect(typeof response.body.pricing.pricePerSession).toBe('number');
      expect(typeof response.body.pricing.volumeDiscount).toBe('number');
      expect(typeof response.body.pricing.discountPercentage).toBe('number');
      expect(typeof response.body.pricing.subtotal).toBe('number');
      expect(typeof response.body.pricing.totalDiscount).toBe('number');
      expect(typeof response.body.pricing.finalTotal).toBe('number');
    });

    it('should return string types for text fields', async () => {
      const response = await request(app)
        .get('/api/storefront/calculate-price')
        .query({ sessions: 25 });

      expect(typeof response.body.pricing.discountTier).toBe('string');
      expect(typeof response.body.pricing.savingsMessage).toBe('string');
      expect(typeof response.body.pricing.metadata.nextTierMessage).toBe('string');
    });
  });
});
