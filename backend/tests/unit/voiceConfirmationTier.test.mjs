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
  TIER_REFUSAL,} from '../../services/ai/voiceConfirmationTier.mjs';

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

  it('REFUSES a trainer-only command reached by a client — it does not negotiate', () => {
    // A client joking "delete the workout" into a propped-up phone.
    //
    // CONTRACT CHANGE (card 1.2, finding FF20 — GLM 5.3-flash, 2026-09-01). This
    // case previously asserted TIER_DELIBERATE, i.e. "requires an explicit spoken
    // yes". That is a category error: an authorization failure became a
    // negotiation, and the confirmation UI would have rendered "say yes to cancel
    // the session" at an actor who may never run it — teaching every actor that
    // gates are persuadable. Confirmation is not authorization.
    const r = resolveTier(cmd({ roleRequired: ['admin', 'trainer'] }), {}, { actorRole: 'client', lockedClientId: 42, targetClientId: 42 });
    expect(r.tier).toBe(TIER_REFUSAL);
    expect(r.reasons).toContain('role_not_permitted');
    // A refusal collects nothing — no spoken yes, no physical tap.
    expect(r.requiresSpokenYes).toBe(false);
    expect(r.physical).toBe(false);
  });

  it('a refusal outranks every other escalation — a destructive command a client may not run is REFUSED, not confirmed', () => {
    const r = resolveTier(
      cmd({ destructive: true, requiresConfirmation: true, roleRequired: ['admin'] }),
      { weight: 185 },
      { actorRole: 'client', lockedClientId: 42, targetClientId: 99, inputMode: 'voice' },
    );
    expect(r.tier).toBe(TIER_REFUSAL);
    expect(r.requiresSpokenYes).toBe(false);
  });
});

describe('the named-but-unlocked hole (F16g) and channel split (M3)', () => {
  it('a target named while NOTHING is locked escalates to deliberate', () => {
    // Neither cross_client (needs both ids) nor unresolved_client (needs both
    // null) fired for this shape before card 1.2 — yet it is precisely the
    // misheard-name case, arriving without a lock to compare against.
    const r = resolveTier(cmd({}), { clientId: 47 }, { lockedClientId: null, targetClientId: 47 });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('unlocked_target');
  });

  it('an identity-crossing write BY VOICE demands a physical confirm', () => {
    const r = resolveTier(cmd({}), {}, { lockedClientId: 42, targetClientId: 47, inputMode: 'voice' });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.physical).toBe(true);
    expect(r.requiresSpokenYes).toBe(false);   // the mishearing channel cannot authorize
    expect(r.reasons).toContain('voice_identity_crossing');
  });

  it('the SAME command by text keeps the ordinary ceremony — over-escalation is its own bug', () => {
    const r = resolveTier(cmd({}), {}, { lockedClientId: 42, targetClientId: 47, inputMode: 'text' });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.physical).toBe(false);
    expect(r.requiresSpokenYes).toBe(true);
  });

  it('voice on a NON-crossing command does not demand a physical confirm', () => {
    const r = resolveTier(cmd({ destructive: true }), {}, { lockedClientId: 42, targetClientId: 42, inputMode: 'voice' });
    expect(r.physical).toBe(false);
    expect(r.requiresSpokenYes).toBe(true);
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
