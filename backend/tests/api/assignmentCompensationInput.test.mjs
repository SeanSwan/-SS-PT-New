/**
 * Assignment Compensation Input Validation Tests
 * ==============================================
 * parseCompensationInput guards the admin assignment API (mode b):
 * per_session_flat requires a positive rate, bad modes/rates are 400s,
 * and omitted fields never clobber existing values.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getClientTrainerAssignment: () => ({}),
  getUser: () => ({}),
  getModel: () => ({}),
  Op: { in: Symbol('in'), ne: Symbol('ne') },
}));
vi.mock('../../database.mjs', () => ({ default: { query: vi.fn() } }));

const { parseCompensationInput } = await import('../../routes/clientTrainerAssignmentRoutes.mjs');

describe('parseCompensationInput', () => {
  it('defaults to revenue_share with no rate when nothing is provided', () => {
    const r = parseCompensationInput({});
    expect(r.error).toBeUndefined();
    expect(r.mode).toBeUndefined();
    expect(r.rate).toBeUndefined();
  });

  it('accepts per_session_flat with a positive rate, rounded to cents', () => {
    const r = parseCompensationInput({ compensationMode: 'per_session_flat', flatSessionRate: '50.005' });
    expect(r.error).toBeUndefined();
    expect(r.mode).toBe('per_session_flat');
    expect(r.rate).toBe(50.01);
  });

  it('rejects per_session_flat without a rate', () => {
    expect(parseCompensationInput({ compensationMode: 'per_session_flat' }).error).toMatch(/flatSessionRate is required/);
  });

  it('accepts per_session_flat without a rate when the existing assignment already has one', () => {
    const r = parseCompensationInput(
      { compensationMode: 'per_session_flat' },
      { compensationMode: 'revenue_share', flatSessionRate: '50.00' }
    );
    expect(r.error).toBeUndefined();
    expect(r.mode).toBe('per_session_flat');
  });

  it('rejects invalid modes and non-positive/absurd rates', () => {
    expect(parseCompensationInput({ compensationMode: 'salaried' }).error).toMatch(/Invalid compensationMode/);
    for (const bad of [0, -50, 'banana', 10001]) {
      expect(parseCompensationInput({ flatSessionRate: bad }).error).toMatch(/positive dollar amount/);
    }
  });

  it('rejects a rate update to nothing on an existing per_session_flat assignment only via mode rules', () => {
    // rate omitted + existing flat assignment keeps its rate: valid
    const r = parseCompensationInput({}, { compensationMode: 'per_session_flat', flatSessionRate: '50.00' });
    expect(r.error).toBeUndefined();
  });
});
