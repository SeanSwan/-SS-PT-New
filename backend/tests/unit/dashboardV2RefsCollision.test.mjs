/**
 * ============================================================================
 * DISPLAY-REF UNIQUENESS  (admin-surface audit, 2026-07-28, SWA-75)
 * ============================================================================
 *
 * THE DEFECT THIS LOCKS OUT
 * `maskRef` derived a 4-DIGIT code (`% 10000`) for every kind. These refs are
 * not decoration — they REPLACE the person's name in the Dashboards v2 privacy
 * layer, and `dashboardV2Service` uses trainer refs as CHART LABELS. Two people
 * sharing a code are therefore indistinguishable to the operator, and in a chart
 * they visually merge into one series.
 *
 * Measured against the real HMAC before the fix: 100 clients -> 1 colliding ref,
 * 250 -> 3, 500 -> 13. A launch-window problem, not a someday problem.
 *
 * The pre-existing `dashboardV2RefsPrivacy.test.mjs` covered determinism and
 * non-reversibility — both still required — but never uniqueness, which is why
 * this went unnoticed.
 *
 * Refs are computed at projection time and never persisted (no DB column stores
 * one, nothing looks a record up by ref), so widening the space is safe.
 */
import { describe, it, expect, beforeAll } from 'vitest';

let maskRef;
let maskClient;
let maskTrainer;

beforeAll(async () => {
  process.env.MASK_SALT = 'collision-test-fixed-salt';
  const mod = await import('../../services/dashboardV2/refs.mjs');
  maskRef = mod.maskRef;
  maskClient = mod.maskClient;
  maskTrainer = mod.maskTrainer;
});

/** Distinct refs produced for ids 1..n. */
const refsFor = (n, kind) => {
  const set = new Set();
  for (let i = 1; i <= n; i += 1) set.add(maskRef(i, kind));
  return set;
};

describe('client refs stay unique across a realistic roster', () => {
  it.each([[50], [100], [250], [500]])('produces %i distinct refs for that many clients', (n) => {
    expect(refsFor(n, 'C').size).toBe(n);
  });

  // The pre-fix implementation produced 13 collisions here. Guard the property
  // rather than the exact number so a future salt change cannot silently pass.
  it('keeps collisions at zero for a 500-client roster', () => {
    const refs = refsFor(500, 'C');
    expect(500 - refs.size).toBe(0);
  });

  it('degrades gracefully well beyond the expected roster', () => {
    const refs = refsFor(2000, 'C');
    // Not zero at this scale, but must stay negligible — a regression to a
    // 4-digit space would put this in the hundreds.
    expect(2000 - refs.size).toBeLessThan(20);
  });
});

describe('trainer refs stay unique across a realistic roster', () => {
  // This case is why trainers were widened too. The first fix left them on the
  // 4-digit space ("the roster is small") and FIFTY trainers already collided.
  // Trainer refs are the ones used as chart labels, where a collision merges
  // two series into one.
  it.each([[10], [50], [200]])('produces %i distinct refs for that many trainers', (n) => {
    expect(refsFor(n, 'T').size).toBe(n);
  });
});

describe('properties the widening must not break', () => {
  it('is deterministic for the same id', () => {
    expect(maskRef(42, 'C')).toBe(maskRef(42, 'C'));
  });

  it('keeps the role prefix', () => {
    expect(maskClient(42).startsWith('C-')).toBe(true);
    expect(maskTrainer(42).startsWith('T-')).toBe(true);
  });

  it('gives client and trainer DIFFERENT refs for the same underlying id', () => {
    expect(maskClient(42)).not.toBe(maskTrainer(42));
  });

  it('emits a fixed width so table columns do not jitter', () => {
    const widths = new Set();
    for (let i = 1; i <= 200; i += 1) widths.add(maskClient(i).length);
    expect(widths.size).toBe(1);
  });

  it('never leaks the raw id into the ref', () => {
    // A 6-digit ref could coincidentally contain a short id, so assert on a
    // long, distinctive id instead.
    const id = 987654321;
    expect(maskClient(id)).not.toContain(String(id));
  });

  it('handles null and undefined without throwing', () => {
    expect(maskClient(null)).toContain('C-');
    expect(maskClient(undefined)).toContain('C-');
  });

  it('treats numeric and string ids as the same person', () => {
    expect(maskClient(42)).toBe(maskClient('42'));
  });
});
