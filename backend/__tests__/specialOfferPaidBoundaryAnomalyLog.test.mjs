/**
 * FILE: specialOfferPaidBoundaryAnomalyLog.test.mjs
 * PURPOSE: Lock the defense-in-depth visibility layer on the paid special boundary
 *          (hostile-review finding #2, 2026-07-11). The boundary CANNOT throw on a
 *          cancelled/expired special (the customer has already been charged — throwing
 *          would strand them and 500-loop the webhook), so it HONORS the payment but
 *          must make the anomaly LOUD so an admin can review/refund. This guards that
 *          the loud log never silently regresses back to a silent give-away.
 * OWNER: Claude/Fable
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('../utils/logger.mjs', () => ({ default: logger }));

const { recordDirectSpecialRedemption } = await import('../services/specialOfferService.mjs');

const transaction = { LOCK: { UPDATE: 'UPDATE' } };

function makeRow(overrides) {
  return {
    id: 7, storefrontItemId: 500, clientId: 100, status: 'active',
    expiresAt: null, remainingRedemptions: 1, validityType: 'one_time',
    update: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('paid-boundary anomaly logging (finding #2 visibility)', () => {
  beforeEach(() => { logger.error.mockClear(); });

  it('logs a loud ANOMALY when a CANCELLED special is redeemed after payment', async () => {
    const row = makeRow({ status: 'cancelled' });
    await recordDirectSpecialRedemption({
      storefrontItemId: 500, userId: 100,
      CustomPackage: { findOne: vi.fn(async () => row) }, transaction,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toMatch(/ANOMALY.*PAID_AFTER_REVOKE_OR_EXPIRY|PAID_AFTER_REVOKE_OR_EXPIRY/);
  });

  it('logs a loud ANOMALY when an EXPIRED special is redeemed after payment', async () => {
    const row = makeRow({ status: 'active', expiresAt: new Date(Date.now() - 60_000) });
    await recordDirectSpecialRedemption({
      storefrontItemId: 500, userId: 100,
      CustomPackage: { findOne: vi.fn(async () => row) }, transaction,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('does NOT log an anomaly for a normal active, unexpired redemption', async () => {
    const row = makeRow();
    await recordDirectSpecialRedemption({
      storefrontItemId: 500, userId: 100,
      CustomPackage: { findOne: vi.fn(async () => row) }, transaction,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });
});
