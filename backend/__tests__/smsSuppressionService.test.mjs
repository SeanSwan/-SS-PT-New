/**
 * smsSuppressionService
 * =====================
 *
 * Locks Twilio STOP handling and normalized phone-keyed opt-out persistence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOrCreate: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../models/SmsSuppression.mjs', () => ({
  default: { findOrCreate: mocks.findOrCreate },
}));

const {
  isStopKeyword,
  normalizePhone,
  recordSmsOptOut,
} = await import('../services/smsSuppressionService.mjs');

describe('smsSuppressionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOrCreate.mockResolvedValue([
      { id: 12, update: mocks.update },
      true,
    ]);
  });

  it('normalizes common phone shapes to E.164-ish storage', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('detects Twilio STOP-family keywords only', () => {
    expect(isStopKeyword(' STOP ')).toBe(true);
    expect(isStopKeyword('unsubscribe')).toBe(true);
    expect(isStopKeyword('cancel')).toBe(true);
    expect(isStopKeyword('stop texting me')).toBe(false);
    expect(isStopKeyword('hello')).toBe(false);
  });

  it('persists a STOP opt-out keyed by normalized sender phone', async () => {
    const result = await recordSmsOptOut({
      from: '(555) 123-4567',
      body: 'STOP',
      messageSid: 'SMstop123',
    });

    expect(result).toMatchObject({ recorded: true, phone: '+15551234567', created: true });
    expect(mocks.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone: '+15551234567' },
      defaults: expect.objectContaining({
        phone: '+15551234567',
        source: 'twilio_inbound',
        reason: 'stop_keyword',
        messageSid: 'SMstop123',
      }),
    }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refreshes the opt-out evidence when the phone already exists', async () => {
    mocks.findOrCreate.mockResolvedValueOnce([
      { id: 12, update: mocks.update },
      false,
    ]);

    const result = await recordSmsOptOut({
      from: '+15551234567',
      body: 'UNSUBSCRIBE',
      messageSid: 'SMagain123',
    });

    expect(result).toMatchObject({ recorded: true, phone: '+15551234567', created: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      source: 'twilio_inbound',
      reason: 'stop_keyword',
      messageSid: 'SMagain123',
    }));
  });

  it('ignores non-STOP inbound texts without creating an opt-out', async () => {
    const result = await recordSmsOptOut({
      from: '+15551234567',
      body: 'YES',
      messageSid: 'SMyes123',
    });

    expect(result).toEqual({ recorded: false, reason: 'not_stop_keyword' });
    expect(mocks.findOrCreate).not.toHaveBeenCalled();
  });
});
