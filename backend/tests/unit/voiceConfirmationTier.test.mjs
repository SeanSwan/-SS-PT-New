/**
 * Voice confirmation tier — one contract, and it only ever escalates.
 *
 * Without a shared rule each surface invents its own confirmation behaviour and
 * the four-registry drift returns at the interaction layer. The property that
 * matters most: a command can never be SOFTENED by a later rule — that is how a
 * destructive action ends up silent.
 */
import { describe, expect, it } from 'vitest';
import {
  TIER_DELIBERATE,
  TIER_FIRE_AND_FORGET,
  TIER_READ_BACK,
  escalate,
  resolveVoiceConfirmationTier as resolveTier,
} from '../../services/ai/voiceConfirmationTier.mjs';

const cmd = (over = {}) => ({
  destructive: false,
  requiresConfirmation: false,
  requiresClientRef: false,
  roleRequired: ['admin', 'trainer'],
  ...over,
});

describe('escalation', () => {
  it('always returns the stricter tier regardless of order', () => {
    expect(escalate(TIER_FIRE_AND_FORGET, TIER_DELIBERATE)).toBe(TIER_DELIBERATE);
    expect(escalate(TIER_DELIBERATE, TIER_FIRE_AND_FORGET)).toBe(TIER_DELIBERATE);
    expect(escalate(TIER_READ_BACK, TIER_FIRE_AND_FORGET)).toBe(TIER_READ_BACK);
  });
});

describe('fire-and-forget', () => {
  it('keeps a plain reversible command silent', () => {
    // "next exercise" — no numbers, not destructive, same client.
    const r = resolveTier(cmd(), {}, { lockedClientId: 42, targetClientId: 42, actorRole: 'trainer' });
    expect(r.tier).toBe(TIER_FIRE_AND_FORGET);
    expect(r.requiresSpokenYes).toBe(false);
  });
});

describe('read-back', () => {
  it('reads back parsed numbers — the highest-error class in gym noise', () => {
    const r = resolveTier(cmd(), { weight: 185, reps: 8 }, { lockedClientId: 42, targetClientId: 42, actorRole: 'trainer' });
    expect(r.tier).toBe(TIER_READ_BACK);
    expect(r.readBackSlots.sort()).toEqual(['reps', 'weight']);
  });

  it('reads back clinical free text before recording it', () => {
    const r = resolveTier(cmd(), { painNote: 'right knee, twinge on the descent' }, { lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_READ_BACK);
    expect(r.readBackSlots).toContain('painNote');
  });

  it('ignores absent and null-valued slots', () => {
    const r = resolveTier(cmd(), { weight: undefined, reps: null }, { lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_FIRE_AND_FORGET);
  });
});

describe('deliberate', () => {
  it('escalates a destructive command', () => {
    const r = resolveTier(cmd({ destructive: true }), {}, { lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.requiresSpokenYes).toBe(true);
  });

  it('escalates a confirmation-gated command', () => {
    const r = resolveTier(cmd({ requiresConfirmation: true }), {}, { lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_DELIBERATE);
  });

  // The catastrophic case: a misheard pronoun acting on someone else.
  it('escalates ANY cross-client action, however harmless the command looks', () => {
    const r = resolveTier(cmd(), {}, { lockedClientId: 42, targetClientId: 99, actorRole: 'trainer' });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('cross_client');
  });

  it('escalates when a client-scoped command has no client resolved at all', () => {
    const r = resolveTier(cmd({ requiresClientRef: true }), {}, { lockedClientId: null, targetClientId: null });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('unresolved_client');
  });

  it('escalates a trainer-only command reached by a client', () => {
    // A client joking "delete the workout" into a propped-up phone.
    const r = resolveTier(cmd({ roleRequired: ['admin', 'trainer'] }), {}, { actorRole: 'client', lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('role_not_permitted');
  });
});

describe('escalation can never be undone', () => {
  it('stays deliberate even when only numeric slots would suggest read-back', () => {
    // Numbers are evaluated AFTER the deliberate triggers; the result must not soften.
    const r = resolveTier(cmd({ destructive: true }), { weight: 185, reps: 8 }, { lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.requiresSpokenYes).toBe(true);
    // Slots are still reported so the confirmation can read the numbers aloud.
    expect(r.readBackSlots.sort()).toEqual(['reps', 'weight']);
  });

  it('stays deliberate for a cross-client numeric log', () => {
    const r = resolveTier(cmd(), { weight: 185 }, { lockedClientId: 42, targetClientId: 99 });
    expect(r.tier).toBe(TIER_DELIBERATE);
  });
});

describe('defensive defaults', () => {
  it('does not throw on empty input', () => {
    expect(resolveTier().tier).toBe(TIER_FIRE_AND_FORGET);
    expect(resolveTier({}, {}, {}).tier).toBe(TIER_FIRE_AND_FORGET);
  });

  it('treats a same-client string/number id mismatch as same client', () => {
    // Ids arrive as strings from some transports; a spurious cross-client
    // escalation would train trainers to confirm reflexively.
    const r = resolveTier(cmd(), {}, { lockedClientId: 42, targetClientId: '42' });
    expect(r.tier).toBe(TIER_FIRE_AND_FORGET);
  });
});
