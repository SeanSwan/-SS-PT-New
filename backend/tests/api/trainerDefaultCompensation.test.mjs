/**
 * Per-Trainer Default Compensation Inheritance Tests
 * ==================================================
 * New assignments inherit the trainer's default mode/rate when the admin
 * doesn't specify compensation. Explicit input always wins; a flat
 * default WITHOUT a valid rate falls back to revenue_share (drag-drop
 * assignment must never 400 on a misconfigured default).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getClientTrainerAssignment: () => ({}),
  getUser: () => ({}),
  getModel: () => ({}),
  Op: { in: Symbol('in'), ne: Symbol('ne') },
}));
vi.mock('../../database.mjs', () => ({ default: { query: vi.fn() } }));

const { resolveInheritedCompensation } = await import('../../routes/clientTrainerAssignmentRoutes.mjs');

describe('resolveInheritedCompensation', () => {
  it('inherits a flat default (mode + rate) when admin specifies nothing', () => {
    const r = resolveInheritedCompensation({}, { defaultCompensationMode: 'per_session_flat', defaultFlatSessionRate: '50.00' });
    expect(r).toMatchObject({ mode: 'per_session_flat', rate: 50, inherited: true });
  });

  it('explicit admin input always wins over the trainer default', () => {
    const r = resolveInheritedCompensation(
      { mode: 'revenue_share' },
      { defaultCompensationMode: 'per_session_flat', defaultFlatSessionRate: '50.00' }
    );
    expect(r.mode).toBe('revenue_share');
    expect(r.inherited).toBeUndefined();
  });

  it('falls back to revenue_share when the flat default has no valid rate (never blocks assignment)', () => {
    for (const badRate of [null, undefined, '0', '-5', 'banana']) {
      const r = resolveInheritedCompensation({}, { defaultCompensationMode: 'per_session_flat', defaultFlatSessionRate: badRate });
      expect(r.mode).toBe('revenue_share');
    }
  });

  it('defaults to revenue_share for trainers with no defaults set', () => {
    expect(resolveInheritedCompensation({}, {}).mode).toBe('revenue_share');
    expect(resolveInheritedCompensation({}, null).mode).toBe('revenue_share');
  });

  it('an explicit rate with an inherited flat mode uses the explicit rate', () => {
    const r = resolveInheritedCompensation(
      { rate: 65 },
      { defaultCompensationMode: 'per_session_flat', defaultFlatSessionRate: '50.00' }
    );
    expect(r).toMatchObject({ mode: 'per_session_flat', rate: 65 });
  });
});
