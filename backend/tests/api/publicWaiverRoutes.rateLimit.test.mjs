/**
 * Public Waiver Routes — Rate Limit Test (Phase 5W-G)
 * ====================================================
 * Route-level test using supertest + express to verify waiverLimiter (10 req / 15 min).
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §12.6
 */
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { waiverLimiter } from '../../middleware/rateLimiter.mjs';

describe('publicWaiverRoutes rate limit', () => {

  it('returns 429 after exceeding max (10) requests', async () => {
    const app = express();
    app.use(express.json());

    // Mount a minimal route with the real waiverLimiter
    app.post('/api/public/waivers/submit', waiverLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    // Send 10 requests (should all pass)
    for (let i = 0; i < 10; i++) {
      const resp = await request(app).post('/api/public/waivers/submit').send({});
      expect(resp.status).toBe(200);
    }

    // 11th request should be rate-limited
    const limited = await request(app).post('/api/public/waivers/submit').send({});
    expect(limited.status).toBe(429);
    expect(limited.body.retryAfter).toBeDefined();
  });
});
