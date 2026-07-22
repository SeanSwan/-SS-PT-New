/**
 * leadFollowUp.test.mjs — P0-1 (SWA-29) SLA computation + no-stomp guarantee.
 * Pure/DB-free: exercises the logic the Lead beforeCreate hook delegates to.
 */
import { describe, it, expect } from 'vitest';
import {
  initialFollowUpAt,
  resolveFollowUpAt,
  HOT_SCORE_THRESHOLD,
  HOT_SLA_HOURS,
  DEFAULT_SLA_HOURS,
} from '../../utils/leadFollowUp.mjs';

const NOW = new Date('2026-07-22T12:00:00.000Z');
const plusHours = (n) => new Date(NOW.getTime() + n * 60 * 60 * 1000);

describe('initialFollowUpAt — speed-to-lead tiering', () => {
  it('hot lead (score >= 70: consult/booking/checkout intent) → 2h SLA', () => {
    expect(initialFollowUpAt(70, NOW)).toEqual(plusHours(HOT_SLA_HOURS));
    expect(initialFollowUpAt(100, NOW)).toEqual(plusHours(2));
  });

  it('normal lead (score < 70) → 24h SLA', () => {
    expect(initialFollowUpAt(69, NOW)).toEqual(plusHours(DEFAULT_SLA_HOURS));
    expect(initialFollowUpAt(0, NOW)).toEqual(plusHours(24));
  });

  it('exact threshold is hot (>=, not >)', () => {
    expect(initialFollowUpAt(HOT_SCORE_THRESHOLD, NOW)).toEqual(plusHours(HOT_SLA_HOURS));
  });

  it('missing/invalid score is treated as cold (24h), never throws', () => {
    expect(initialFollowUpAt(null, NOW)).toEqual(plusHours(24));
    expect(initialFollowUpAt(undefined, NOW)).toEqual(plusHours(24));
    expect(initialFollowUpAt('nonsense', NOW)).toEqual(plusHours(24));
  });
});

describe('resolveFollowUpAt — no-stomp guarantee (the hook decision)', () => {
  it('NEVER overwrites an explicit value a caller/admin already set', () => {
    const explicit = new Date('2026-08-01T09:00:00.000Z');
    expect(resolveFollowUpAt(explicit, 100, NOW)).toBe(explicit);
    expect(resolveFollowUpAt(explicit, 0, NOW)).toBe(explicit);
  });

  it('fills only when null/undefined, tiered by score', () => {
    expect(resolveFollowUpAt(null, 80, NOW)).toEqual(plusHours(HOT_SLA_HOURS));
    expect(resolveFollowUpAt(undefined, 10, NOW)).toEqual(plusHours(DEFAULT_SLA_HOURS));
  });
});
