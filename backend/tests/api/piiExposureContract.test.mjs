/**
 * piiExposureContract — PII / data-exposure locks (data-exposure sweep 2026-07-15)
 * ================================================================================
 * (1) GET /api/profile/:userId is reachable by an assigned trainer, not just
 *     self/admin. The old 2-field exclude blocklist leaked reset-token hashes,
 *     Stripe customer id, and login IPs to trainers — the blocklist now covers
 *     all credential/security/billing fields.
 * (2) Public leaderboards must honor the leaderboardOptIn privacy control.
 * (3) Client emails (incl. minors) must not be written to persistent logs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, rel), 'utf8');

describe('profile endpoint excludes credential/security fields', () => {
  it('getUserProfile excludes reset-token, Stripe id, and login IPs', () => {
    const src = read('../../controllers/profileController.mjs');
    for (const field of ['resetPasswordToken', 'stripeCustomerId', 'lastLoginIP', 'registrationIP', 'claimTokenHash']) {
      expect(src).toContain(`'${field}'`);
    }
  });
});

describe('leaderboards honor the opt-out', () => {
  it('both leaderboard queries filter leaderboardOptIn: true', () => {
    expect(read('../../controllers/gamificationController.mjs')).toMatch(/whereClause = \{ leaderboardOptIn: true \}/);
    expect(read('../../services/gamification/GamificationLeaderboardService.mjs')).toMatch(/whereClause = \{ leaderboardOptIn: true \}/);
  });
});

describe('client emails are not logged', () => {
  it('workout-summary + gallery VIP logs carry ids, not emails', () => {
    const summary = read('../../routes/workoutSummaryRoutes.mjs');
    expect(summary).not.toMatch(/email: client\.email/);
    const gallery = read('../../routes/galleryRoutes.mjs');
    expect(gallery).not.toMatch(/logged in: \$\{email\}/);
    expect(gallery).not.toMatch(/New user created: \$\{email\}/);
  });
});
