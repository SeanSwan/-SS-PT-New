/**
 * marketingSuppressionService
 * ===========================
 *
 * Proves confirmed email opt-out and phone STOP opt-out both suppress sends.
 * Lookup errors return checked:false so callers fail closed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { subscriberFindOne, smsSuppressionFindOne, leadFindByPk } = vi.hoisted(() => ({
  subscriberFindOne: vi.fn(),
  smsSuppressionFindOne: vi.fn(),
  leadFindByPk: vi.fn(),
}));

vi.mock('../models/Subscriber.mjs', () => ({ default: { findOne: subscriberFindOne } }));
vi.mock('../models/SmsSuppression.mjs', () => ({ default: { findOne: smsSuppressionFindOne } }));
vi.mock('../models/Lead.mjs', () => ({ default: { findByPk: leadFindByPk } }));

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

  it('suppresses lead SMS when the lead has no positive SMS consent record', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue(null);
    leadFindByPk.mockResolvedValue({ id: 777, smsConsentStatus: 'unknown', smsConsentAt: null, smsOptOutAt: null });

    const r = await resolveMarketingSuppression({ phone: '+15550007777', leadId: 777 });

    expect(r).toEqual({ suppressed: true, reason: 'lead_sms_consent_missing', checked: true });
    expect(leadFindByPk).toHaveBeenCalledWith(777, expect.objectContaining({
      attributes: ['id', 'smsConsentStatus', 'smsConsentAt', 'smsOptOutAt'],
    }));
  });

  it('allows lead SMS only when the lead has an opted-in SMS consent record', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue(null);
    leadFindByPk.mockResolvedValue({
      id: 777,
      smsConsentStatus: 'opted_in',
      smsConsentAt: new Date('2030-01-01T00:00:00Z'),
      smsOptOutAt: null,
    });

    const r = await resolveMarketingSuppression({ phone: '+15550007777', leadId: 777 });

    expect(r).toEqual({ suppressed: false, reason: null, checked: true });
  });

  it('suppresses lead SMS when the lead opted out directly', async () => {
    subscriberFindOne.mockResolvedValue(null);
    smsSuppressionFindOne.mockResolvedValue(null);
    leadFindByPk.mockResolvedValue({
      id: 777,
      smsConsentStatus: 'opted_out',
      smsConsentAt: new Date('2030-01-01T00:00:00Z'),
      smsOptOutAt: new Date('2030-01-02T00:00:00Z'),
    });

    const r = await resolveMarketingSuppression({ phone: '+15550007777', leadId: 777 });

    expect(r).toEqual({ suppressed: true, reason: 'lead_sms_opt_out', checked: true });
  });

  it('FAILS CLOSED (checked:false) when the lookup throws', async () => {
    subscriberFindOne.mockRejectedValue(new Error('db down'));
    const r = await resolveMarketingSuppression({ email: 'active@x.com' });
    expect(r).toMatchObject({ suppressed: false, checked: false, reason: 'suppression_check_failed' });
  });
});
