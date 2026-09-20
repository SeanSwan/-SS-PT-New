/*
 * R2-01 — `healthText`, the provenance-aware health renderer.
 *
 * WHY THIS FILE EXISTS ALONGSIDE THE COMPONENT TESTS. `StatusBoard.test.tsx`
 * renders the four states through the board, which is the end-to-end evidence.
 * This file covers the BRANCH COMBINATIONS that the fixtures do not reach —
 * history-with-no-age, probe-with-a-stale-cache, and the `age()` boundaries —
 * because a branch no fixture exercises is a branch nobody has run. The function
 * is pure, so the coverage is cheap and the failures name the branch.
 */

import { describe, expect, it } from 'vitest';
import { age, healthText } from './healthText';
import type { HealthReading } from '../adapters';

const base: HealthReading = {
  ok: true,
  version: '2025.09.17',
  reason: '',
  checkedAt: '2026-09-18T11:40:00.000Z',
  ageMs: 420_000,
  source: 'probe',
  stale: false,
  note: null,
};

describe('R2-01 healthText', () => {
  it('unknown is the ABSENCE of a verdict, not a failure', () => {
    const text = healthText({ ...base, ok: false, version: null, checkedAt: null, ageMs: null, source: 'unknown', stale: true });
    expect(text).toMatch(/not yet checked/);
    expect(text).not.toMatch(/failed|not resolved/);
  });

  it('a live probe renders ok with its version and no staleness note', () => {
    expect(healthText(base)).toBe('ok · 2025.09.17');
  });

  it('a live probe with a stale cache says so', () => {
    const text = healthText({ ...base, stale: true, ageMs: 7_200_000 });
    expect(text).toMatch(/cached, 2h old/);
  });

  it('a live probe that is stale but has no age omits the note rather than inventing one', () => {
    // `ageMs` is null when the bridge has no reading time — it must not render
    // "cached, NaNs old" or a fabricated age.
    expect(healthText({ ...base, stale: true, ageMs: null })).toBe('ok · 2025.09.17');
  });

  it('a history success is labelled as not live, with its age', () => {
    const text = healthText({ ...base, source: 'history', stale: true, ageMs: 113_280_000 });
    expect(text).toMatch(/from the last recorded check, not a live one/);
    expect(text).toMatch(/as of 2026-09-18T11:40:00\.000Z/);
    // 113_280_000 ms is 31.47 h — under the two-day threshold, so it renders in
    // hours. Asserted exactly rather than loosely: the first version of this
    // expectation said "1d", which is the arithmetic error a boundary test is
    // supposed to catch, and did.
    expect(text).toMatch(/\(31h ago\)/);
  });

  it('a history FAILURE is distinguishable from a live failure and from unknown', () => {
    const text = healthText({ ...base, ok: false, version: null, reason: 'exited 1', source: 'history', stale: true, ageMs: 60_000 });
    expect(text).toMatch(/^last check failed/);
    expect(text).toMatch(/exited 1/);
    expect(text).not.toMatch(/not yet checked/);
  });

  it('a live failure names the reason', () => {
    const text = healthText({ ...base, ok: false, version: null, reason: 'exited 1' });
    expect(text).toMatch(/^failed — exited 1/);
  });

  it('age() is coarse and never negative', () => {
    expect(age(0)).toBe('0s');
    expect(age(89_000)).toBe('89s');
    expect(age(90_000)).toBe('2m');
    expect(age(5_399_000)).toBe('90m');
    expect(age(5_400_000)).toBe('2h');
    expect(age(172_799_000)).toBe('48h');
    expect(age(172_800_000)).toBe('2d');
    // A clock skew between the bridge and the browser can make this negative;
    // a negative age would render "-3s ago", which reads as a bug in the tool.
    expect(age(-5000)).toBe('0s');
  });
});
