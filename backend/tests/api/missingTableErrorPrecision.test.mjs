/**
 * isMissingTableError must catch ONLY a missing TABLE.
 *
 * GLM-5.2 (2026-08-16, FINDING 9) argued the /active degradation path could mask
 * schema drift if this predicate were a loose substring match on "does not exist" —
 * a dropped COLUMN would then be swallowed as a 200 with an empty list, which is the
 * exact failure class the schema-truth campaign exists to prevent.
 *
 * Verification showed the implementation already checks SQLSTATE 42P01 first and its
 * regex is relation-specific, so the finding was REFUTED on substance. These tests
 * exist so a future loosening of that predicate fails loudly instead of silently
 * re-opening the hole.
 */
import { describe, it, expect } from 'vitest';
import { isMissingTableError } from '../../routes/featureAvailability.mjs';

const pgErr = (code, message) => Object.assign(new Error(message), { parent: { code, message } });

describe('isMissingTableError precision', () => {
  it('catches a missing table by SQLSTATE 42P01', () => {
    expect(isMissingTableError(pgErr('42P01', 'relation "ChallengeTeams" does not exist'))).toBe(true);
  });

  it('catches a missing table by message when no SQLSTATE is present', () => {
    expect(isMissingTableError(new Error('relation "challenges" does not exist'))).toBe(true);
  });

  it('does NOT catch a missing COLUMN (42703) — that is drift and must stay a 500', () => {
    expect(isMissingTableError(pgErr('42703', 'column "isPublic" does not exist'))).toBe(false);
  });

  it('does NOT catch an undefined column by message alone', () => {
    expect(isMissingTableError(new Error('column "endDate" does not exist'))).toBe(false);
  });

  it('does NOT catch unrelated database failures', () => {
    expect(isMissingTableError(pgErr('23505', 'duplicate key value violates unique constraint'))).toBe(false);
    expect(isMissingTableError(pgErr('57014', 'canceling statement due to statement timeout'))).toBe(false);
    expect(isMissingTableError(new Error('connection terminated unexpectedly'))).toBe(false);
  });

  it('does not throw on null/undefined input', () => {
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError(undefined)).toBe(false);
  });
});
