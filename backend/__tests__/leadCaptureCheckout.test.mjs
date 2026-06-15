/**
 * Focused checkout lead-capture hardening.
 * Locks guest-checkout idempotency outside the larger legacy combined service test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { leadFindOrCreate, leadActivityCreate } = vi.hoisted(() => ({
  leadFindOrCreate: vi.fn(),
  leadActivityCreate: vi.fn(),
}));

vi.mock('../models/Lead.mjs', () => ({ default: { findOrCreate: leadFindOrCreate } }));
vi.mock('../models/LeadActivity.mjs', () => ({ default: { create: leadActivityCreate } }));

const { captureLeadFromCheckout } = await import('../services/leadCaptureService.mjs');

describe('captureLeadFromCheckout guest idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not duplicate conversion activity for an already-converted guest lead', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    leadFindOrCreate.mockResolvedValue([{
      id: 31,
      status: 'converted',
      convertedUserId: null,
      convertedAt: new Date('2026-06-01T00:00:00.000Z'),
      update,
    }, false]);

    const result = await captureLeadFromCheckout({
      cart: { id: 91, customerInfo: JSON.stringify({ email: 'guest@example.com' }) },
      user: null,
      session: {
        id: 'cs_guest_repeat',
        amount_total: 12000,
        customer_details: { email: 'guest@example.com' },
      },
    });

    expect(update).not.toHaveBeenCalled();
    expect(leadActivityCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ leadId: 31, created: false, alreadyConverted: true });
  });
});
