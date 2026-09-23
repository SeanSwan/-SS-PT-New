/**
 * Sprint generation-claim LEASE semantics (H04).
 *
 * Regression for the interrupted-generation deadlock: `assertSprintIdle` used to
 * reject any sprint with `status === 'generating'` unconditionally, without ever
 * consulting the claim's `expiresAt`. Once a runner died without releasing its
 * claim, updateSprint / updateWeek / updateSlot / confirm / archive threw 409
 * forever — even though `claimSprint` would have reclaimed the very same expired
 * claim. The lease only means something if every path honours it.
 *
 * These exercise the real exported predicates. The production model/database
 * module edges are stubbed so the fixture never loads application DB config.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../models/index.mjs', () => ({ getBootcampSprint: () => ({}) }));

const { assertSprintIdle, sprintClaimIsLive, validateGenerationRequest } = await import(
  '../../services/bootcamp/sprintGenerationClaim.mjs'
);

const NOW = Date.parse('2026-09-14T10:00:00Z');
const sprintWith = (metadata, status = 'generating') => ({ status, metadata });

describe('sprint generation claim lease', () => {
  it('treats an EXPIRED claim as idle so an interrupted generation is recoverable', () => {
    const sprint = sprintWith({
      generationClaimV1: { expiresAt: new Date(NOW - 1).toISOString() },
    });

    expect(sprintClaimIsLive(sprint, NOW)).toBe(false);
    expect(() => assertSprintIdle(sprint, NOW)).not.toThrow();
  });

  it('still rejects a LIVE claim', () => {
    const sprint = sprintWith({
      generationClaimV1: { expiresAt: new Date(NOW + 60_000).toISOString() },
    });

    expect(sprintClaimIsLive(sprint, NOW)).toBe(true);
    expect(() => assertSprintIdle(sprint, NOW)).toThrow(/in progress/);
  });

  it('treats an exactly-expired lease as expired, matching claimSprint', () => {
    const sprint = sprintWith({
      generationClaimV1: { expiresAt: new Date(NOW).toISOString() },
    });

    expect(sprintClaimIsLive(sprint, NOW)).toBe(false);
  });

  it('recovers a generating sprint whose claim metadata is missing or unparseable', () => {
    // withSprintClaim can never match these, so the generation is definitionally
    // dead and refusing every mutation would be an unrecoverable deadlock.
    for (const metadata of [{}, { generationClaimV1: null }, { generationClaimV1: { expiresAt: 'not-a-date' } }]) {
      const sprint = sprintWith(metadata);
      expect(sprintClaimIsLive(sprint, NOW)).toBe(false);
      expect(() => assertSprintIdle(sprint, NOW)).not.toThrow();
    }
  });

  it('never lets an archived sprint through, even with an expired claim', () => {
    expect(() => assertSprintIdle(sprintWith({
      generationClaimV1: { expiresAt: new Date(NOW - 1).toISOString() },
    }, 'archived'), NOW)).toThrow(/archived/);
  });

  it('treats every non-generating status as idle', () => {
    for (const status of ['draft', 'active', 'complete']) {
      const sprint = sprintWith({}, status);
      expect(sprintClaimIsLive(sprint, NOW)).toBe(false);
      expect(() => assertSprintIdle(sprint, NOW)).not.toThrow();
    }
  });
});

describe('F06: generation request validation is decidable before SSE headers', () => {
  const VALID = { expectedGenerationVersion: 3, operationId: '11111111-1111-4111-8111-111111111111' };

  it('accepts a well-formed request', () => {
    expect(validateGenerationRequest(VALID)).toBeNull();
  });

  it('returns 428 when the generation version is missing', () => {
    const err = validateGenerationRequest({ operationId: VALID.operationId });
    expect(err).toMatchObject({ status: 428 });
  });

  it('returns 400 for a non-safe-integer version or malformed operation id', () => {
    expect(validateGenerationRequest({ expectedGenerationVersion: 1.5, operationId: VALID.operationId }).status).toBe(400);
    expect(validateGenerationRequest({ expectedGenerationVersion: 'x', operationId: VALID.operationId }).status).toBe(400);
    expect(validateGenerationRequest({ expectedGenerationVersion: 3, operationId: 'nope' }).status).toBe(400);
  });
});
