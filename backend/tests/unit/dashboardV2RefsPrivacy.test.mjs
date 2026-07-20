/**
 * Regression coverage for dashboard display-ref salt handling.
 *
 * A configured secret remains deterministic. With no configured secret, each
 * module/process gets a fresh salt so the public source cannot precompute IDs.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionRowStatus } from '../../services/dashboardV2/refs.mjs';

const originalMaskSalt = process.env.MASK_SALT;
const originalDashboardMaskSalt = process.env.DASHBOARD_MASK_SALT;
const originalJwtSecret = process.env.JWT_SECRET;
const originalSessionSecret = process.env.SESSION_SECRET;

const restoreEnv = () => {
  if (originalMaskSalt === undefined) delete process.env.MASK_SALT;
  else process.env.MASK_SALT = originalMaskSalt;
  if (originalDashboardMaskSalt === undefined) delete process.env.DASHBOARD_MASK_SALT;
  else process.env.DASHBOARD_MASK_SALT = originalDashboardMaskSalt;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
};

describe('dashboard v2 display-ref salt', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('does not reuse a public static salt when both mask env vars are absent', async () => {
    delete process.env.MASK_SALT;
    delete process.env.DASHBOARD_MASK_SALT;

    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    const refs = [];
    for (let i = 0; i < 4; i += 1) {
      vi.resetModules();
      const { maskRef } = await import('../../services/dashboardV2/refs.mjs');
      refs.push(maskRef(42, 'C'));
    }

    expect(new Set(refs).size).toBeGreaterThan(1);
  });

  it('keeps refs deterministic when MASK_SALT is configured', async () => {

    process.env.MASK_SALT = 'test-only-configured-mask-salt';
    delete process.env.DASHBOARD_MASK_SALT;

    vi.resetModules();
    const first = await import('../../services/dashboardV2/refs.mjs');
    vi.resetModules();
    const second = await import('../../services/dashboardV2/refs.mjs');

    expect(first.maskRef(42, 'C')).toBe(second.maskRef(42, 'C'));
  });

  it('keeps refs stable across instances when the required platform secret is configured', async () => {
    delete process.env.MASK_SALT;
    delete process.env.DASHBOARD_MASK_SALT;
    process.env.JWT_SECRET = 'test-platform-secret-with-domain-separation';
    delete process.env.SESSION_SECRET;

    vi.resetModules();
    const first = await import('../../services/dashboardV2/refs.mjs');
    vi.resetModules();
    const second = await import('../../services/dashboardV2/refs.mjs');

    expect(first.maskRef(42, 'C')).toBe(second.maskRef(42, 'C'));
  });
});

describe('dashboard v2 session display status', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a scheduled session active only inside its real time window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T16:00:00.000Z'));

    expect(sessionRowStatus('scheduled', '2026-07-19T16:30:00.000Z', null, '2026-07-19T17:30:00.000Z'))
      .toBe('upcoming');
    expect(sessionRowStatus('confirmed', '2026-07-19T15:30:00.000Z', null, '2026-07-19T16:30:00.000Z'))
      .toBe('active');
    expect(sessionRowStatus('scheduled', '2026-07-19T14:00:00.000Z', null, '2026-07-19T15:00:00.000Z'))
      .toBe('missed');
  });
});
