/**
 * marketingSuppressionService
 * ===========================
 *
 * Proves confirmed email opt-out and phone STOP opt-out both suppress sends.
 * Lookup errors return checked:false so callers fail closed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscriberFindOne, smsSuppressionFindOne } = vi.hoisted(() => ({
  subscriberFindOne: vi.fn(),
  smsSuppressionFindOne: vi.fn(),
}));

vi.mock('../models/Subscriber.mjs', () => ({ default: { findOne: subscriberFindOne } }));
vi.mock('../models/SmsSuppression.mjs', () => ({ default: { findOne: smsSuppressionFindOne } }));

const { resolveMarketingSuppression } = await import('../services/marketingSuppressionService.mjs');

describe('resolveMarketingSuppression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns suppressed:true on a confirmed unsubscribe', async () => {
    subscriberFindOne.mockResolvedValue({ id: 1 });
    const r = await resolveMarketingSuppression({ email: 'unsub@x.com' });
    expect(r).toEqual({ suppressed: true, reason: 'unsubscribed', checked: true });
  });

  it('returns allowed (suppressed:false, checked:true) when there is no opt-out row', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue(null);
    const r = await resolveMarketingSuppression({ email: 'active@x.com' });
    expect(r).toEqual({ suppressed: false, reason: null, checked: true });
  });

  it('skips the query entirely when there is no email or phone', async () => {
    const r = await resolveMarketingSuppression({});
    expect(r).toEqual({ suppressed: false, reason: null, checked: true });
    expect(subscriberFindOne).not.toHaveBeenCalled();
    expect(smsSuppressionFindOne).not.toHaveBeenCalled();
  });

  it('normalizes the email before the lookup', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue(null);
    await resolveMarketingSuppression({ email: '  Unsub@X.COM  ' });
    expect(subscriberFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'unsub@x.com', status: 'unsubscribed' },
    }));
  });

  it('returns suppressed:true when the recipient phone has a STOP opt-out', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue({ id: 9 });

    const r = await resolveMarketingSuppression({ phone: '(555) 123-4567' });

    expect(r).toEqual({ suppressed: true, reason: 'sms_opt_out', checked: true });
    expect(smsSuppressionFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone: '+15551234567' },
      attributes: ['id'],
    }));
  });

  it('FAILS CLOSED (checked:false) when the lookup throws', async () => {
    subscriberFindOne.mockRejectedValue(new Error('db down'));
    const r = await resolveMarketingSuppression({ email: 'active@x.com' });
    expect(r).toMatchObject({ suppressed: false, checked: false, reason: 'suppression_check_failed' });
  });
});
