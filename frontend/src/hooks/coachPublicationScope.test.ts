/**
 * ============================================================================
 * FILE: coachPublicationScope.test.ts
 * PURPOSE: Plan 55 C4/C1 — direct tests for the shared admission predicates.
 * ============================================================================
 *
 * These live beside the module they test. Four security-relevant consumers
 * (notebook, composer draft, voice staging, pending food) now gate on these
 * predicates, and a FAIL-CLOSED branch with no test is exactly where a later
 * refactor silently turns it fail-open. Two branches in particular are only
 * reachable by a mistake in the CALLER, which is why they need direct coverage:
 *
 *  - `isPublicationAdmitted` with a request that declares NEITHER actor nor
 *    target must refuse. Remove that line and a bindless request is admitted.
 *  - `hasLivePublication` must refuse a binding whose snapshot is null,
 *    malformed, disabled or throwing. Make it return true and the pending-food
 *    query consumes and sends a legacy payload while the selection is blocked.
 *
 * Both were demonstrated fail-open by reverting the branch in place; see the
 * can-fail proof in the plan 55 C4/C1 report.
 *
 * These characterise behaviour that already shipped, so no behavioural RED was
 * available for them — falsifiability comes from that branch revert, not from a
 * first-run failure. Every refusal is paired with an admitted control so neither
 * a blanket allow nor a blanket deny can pass.
 *
 * PARENT-APPROVED SCOPE AMENDMENT — relocation from the pending-food admission
 * test file, where a placement note recorded that this is their proper home.
 */
import { describe, expect, it } from 'vitest';
import {
  hasLivePublication,
  isPublicationAdmitted,
  type PublicationBinding,
  type PublicationSnapshot,
} from './coachPublicationScope';

const ACTOR = 7;
const CLIENT = 84;

function snapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: ACTOR,
    rawRole: 'trainer',
    audienceRole: 'client',
    generation: 1,
    targetUserId: CLIENT,
    threadId: 11,
    enabled: true,
    ...overrides,
  });
}

function binding(getSnapshot: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot };
}

describe('isPublicationAdmitted fails closed', () => {
  it('refuses a request that declares NEITHER actor nor target instead of allowing everything', () => {
    const live = binding(() => snapshot());

    expect(isPublicationAdmitted(live, {})).toBe(false);
  });

  it('CONTROL: the same binding admits a request that declares the dimension it owns', () => {
    const live = binding(() => snapshot());

    expect(isPublicationAdmitted(live, { targetUserId: CLIENT })).toBe(true);
    expect(isPublicationAdmitted(live, { actorId: ACTOR })).toBe(true);
    expect(isPublicationAdmitted(live, { actorId: ACTOR, targetUserId: CLIENT })).toBe(true);
  });

  it('refuses an actor mismatch or a target mismatch even when the other dimension matches', () => {
    const live = binding(() => snapshot());

    expect(isPublicationAdmitted(live, { actorId: 999, targetUserId: CLIENT })).toBe(false);
    expect(isPublicationAdmitted(live, { targetUserId: 43 })).toBe(false);
    expect(isPublicationAdmitted(live, { targetUserId: null })).toBe(false);
  });

  it('CONTROL: the explicit unscoped lane matches a null-target admission', () => {
    const live = binding(() => snapshot({ targetUserId: null }));

    expect(isPublicationAdmitted(live, { targetUserId: null })).toBe(true);
    expect(isPublicationAdmitted(live, { targetUserId: CLIENT })).toBe(false);
  });

  it('refuses a disabled admission and a malformed, null or non-integer request', () => {
    const disabled = binding(() => snapshot({ enabled: false }));

    expect(isPublicationAdmitted(disabled, { targetUserId: CLIENT })).toBe(false);
    expect(isPublicationAdmitted(binding(() => snapshot()), { targetUserId: 0 })).toBe(false);
    expect(isPublicationAdmitted(binding(() => snapshot()), { targetUserId: -1 })).toBe(false);
    expect(isPublicationAdmitted(binding(() => snapshot()), { targetUserId: 8.4 })).toBe(false);
    expect(isPublicationAdmitted(binding(() => snapshot()), { actorId: '007' })).toBe(false);
  });

  it('treats a null, malformed or throwing snapshot as no admission at all', () => {
    expect(isPublicationAdmitted({ getSnapshot: () => null }, { targetUserId: CLIENT })).toBe(false);
    expect(isPublicationAdmitted({ getSnapshot: () => ({}) as never }, { targetUserId: CLIENT })).toBe(false);
    expect(isPublicationAdmitted(
      { getSnapshot: () => { throw new Error('binding down'); } },
      { targetUserId: CLIENT },
    )).toBe(false);
  });

  it('CONTROL: an absent binding stays dormant-admitted for compatibility', () => {
    // The same rule B1/B2 used: no admission signal wired yet = unchanged
    // behaviour for every existing caller.
    expect(isPublicationAdmitted(undefined, { targetUserId: CLIENT })).toBe(true);
  });
});

describe('hasLivePublication fails closed', () => {
  it('refuses an absent, malformed, disabled or throwing snapshot', () => {
    expect(hasLivePublication({ getSnapshot: () => null })).toBe(false);
    expect(hasLivePublication({ getSnapshot: () => ({}) as never })).toBe(false);
    expect(hasLivePublication({ getSnapshot: () => { throw new Error('binding down'); } })).toBe(false);
    expect(hasLivePublication(binding(() => snapshot({ enabled: false })))).toBe(false);
  });

  it('CONTROL: true for a live snapshot, and dormant-true with no binding', () => {
    expect(hasLivePublication(binding(() => snapshot()))).toBe(true);
    expect(hasLivePublication(undefined)).toBe(true);
  });
});
