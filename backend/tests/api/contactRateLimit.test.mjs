import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { contactLimiter } from '../../middleware/rateLimiter.mjs';

/**
 * POST /api/contact is PUBLIC and the storefront "Ask About Pricing" button
 * makes it trivially reachable. Every accepted submission fans out to SendGrid
 * email + Twilio SMS (real per-message cost, to the owners' phones) and creates
 * a CRM lead. Unthrottled, a flood burns spend and poisons the lead pipeline.
 * These tests lock the throttle in place.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const contactSource = readFileSync(resolve(__dirname, '../../routes/contactRoutes.mjs'), 'utf8');
const limiterSource = readFileSync(resolve(__dirname, '../../middleware/rateLimiter.mjs'), 'utf8');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/api/contact', contactLimiter, (_req, res) => res.status(200).json({ success: true }));
  return app;
};

describe('public contact/inquiry rate limiting', () => {
  it('allows a genuine prospect to submit several inquiries, then throttles the flood', async () => {
    const app = buildApp();
    const agent = request(app);

    // 5 allowed inside the window (room for asking about multiple packages)
    for (let i = 0; i < 5; i += 1) {
      const ok = await agent.post('/api/contact').send({ name: 'A', email: 'a@b.test', message: 'hi' });
      expect(ok.status, `request ${i + 1} should be allowed`).toBe(200);
    }

    // 6th from the same IP is rejected — no email, no SMS, no lead row
    const blocked = await agent.post('/api/contact').send({ name: 'A', email: 'a@b.test', message: 'hi' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(String(blocked.body.error)).toMatch(/too many inquiries/i);
  });

  it('mounts the limiter on the public POST (and leaves the admin GET protected)', () => {
    expect(contactSource).toContain("import { contactLimiter } from '../middleware/rateLimiter.mjs'");
    expect(contactSource).toContain('router.post("/", contactLimiter,');
    // admin listing stays auth-gated — the limiter must not replace authz
    expect(contactSource).toContain('router.get("/", protect, adminOnly');
  });

  it('keeps the public inquiry cap stricter than the waiver cap', () => {
    expect(limiterSource).toContain('export const contactLimiter');
    // waiver = 10/15min; contact costs money per submission, so it is tighter
    expect(limiterSource).toMatch(/contactLimiter = rateLimit\(\{[\s\S]*?max: 5,/);
  });
});
