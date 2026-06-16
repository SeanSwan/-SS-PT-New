/**
 * marketingSuppressionService — the unified "may we contact this person?" check.
 * Proves: confirmed opt-out → suppressed; no match → allowed; no email → no query;
 * email normalized before lookup; a lookup ERROR returns checked:false so callers
 * FAIL CLOSED (never send when consent cannot be verified). Subscriber is mocked.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('../models/Subscriber.mjs', () => ({ default: { findOne } }));

const { resolveMarketingSuppression } = await import('../services/marketingSuppressionService.mjs');

describe('resolveMarketingSuppression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns suppressed:true on a confirmed unsubscribe', async () => {
    findOne.mockResolvedValue({ id: 1 });
    const r = await resolveMarketingSuppression({ email: 'unsub@x.com' });
    expect(r).toEqual({ suppressed: true, reason: 'unsubscribed', checked: true });
  });

  it('returns allowed (suppressed:false, checked:true) when there is no unsubscribe row', async () => {
    findOne.mockResolvedValue(null);
    const r = await resolveMarketingSuppression({ email: 'active@x.com' });
    expect(r).toEqual({ suppressed: false, reason: null, checked: true });
  });

  it('skips the query entirely when there is no email (nothing to match)', async () => {
    const r = await resolveMarketingSuppression({});
    expect(r).toEqual({ suppressed: false, reason: null, checked: true });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('normalizes the email (trim + lowercase) before the lookup', async () => {
    findOne.mockResolvedValue(null);
    await resolveMarketingSuppression({ email: '  Unsub@X.COM  ' });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'unsub@x.com', status: 'unsubscribed' },
    }));
  });

  it('FAILS CLOSED (checked:false) when the lookup throws — caller must not send', async () => {
    findOne.mockRejectedValue(new Error('db down'));
    const r = await resolveMarketingSuppression({ email: 'active@x.com' });
    expect(r).toMatchObject({ suppressed: false, checked: false, reason: 'suppression_check_failed' });
  });
});
