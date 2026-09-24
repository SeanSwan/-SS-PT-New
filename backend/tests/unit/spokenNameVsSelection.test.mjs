/**
 * THE WRONG-CLIENT SEAM — finding F-05a (GLM 5.3 hostile round 1, 2026-09-03).
 *
 * The catastrophe this whole program exists to prevent: the operator SAYS one
 * client's name while a DIFFERENT client is selected, and the write lands on
 * the selection with no alarm anywhere.
 *
 * Why every previous guard missed it:
 *   - `stepResolveClient` sets `clientRef = selectedClientId ? null : ...`, so
 *     with a selection active the spoken name was discarded WITHOUT COMPARISON.
 *     The selection winning is correct (C0.5's law); discarding the disagreement
 *     unread is not.
 *   - Card 1.2's "pre-collapse pair" compared `ctx.resolvedClient.id` against
 *     `params.clientId` — but that same step injects the former into the latter,
 *     so the comparison was a number against itself. `cross_client` could not
 *     fire, and its tests passed because they set both fields by hand.
 *
 * The two identities that can actually disagree are the SELECTION and the
 * SPOKEN NAME, and those are what `ctx.clientIdentity` now carries.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveVoiceConfirmationTier, TIER_DELIBERATE, TIER_FIRE_AND_FORGET,
} from '../../services/ai/voiceConfirmationTier.mjs';

const cmd = (over = {}) => ({
  type: 'cancel_session',
  description: 'Cancel a session',
  roleRequired: ['admin', 'trainer'],
  ...over,
});

describe('spoken name vs selection', () => {
  it('THE CASE: a different client is NAMED while one is selected → deliberate', () => {
    // "Cancel Jordan's session" with Kayla (61) selected, Jordan resolving to 47.
    const r = resolveVoiceConfirmationTier(cmd(), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: 47,
    });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('cross_client');
  });

  it('by VOICE, that case demands a physical confirm — the mishearing channel cannot authorize', () => {
    const r = resolveVoiceConfirmationTier(cmd(), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: 47, inputMode: 'voice',
    });
    expect(r.physical).toBe(true);
    expect(r.requiresSpokenYes).toBe(false);
  });

  it('a spoken name that could NOT be placed still escalates — never silence, never a tautological match', () => {
    // The name was heard, a selection exists, and the lookup failed. We cannot
    // prove agreement, so we must not assume it.
    const r = resolveVoiceConfirmationTier(cmd(), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: null,
      unplaceableSpokenRef: true,
    });
    expect(r.tier).toBe(TIER_DELIBERATE);
    expect(r.reasons).toContain('unplaceable_spoken_ref');
  });

  it('an unplaceable spoken name BY VOICE also demands the physical channel', () => {
    const r = resolveVoiceConfirmationTier(cmd(), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: null,
      unplaceableSpokenRef: true, inputMode: 'voice',
    });
    expect(r.physical).toBe(true);
  });

  it('the name AGREEING with the selection stays quiet — over-escalation is its own bug', () => {
    // "Log Kayla's bench" with Kayla selected. Same id both sides: no ceremony,
    // or the alarm becomes wallpaper by session 200.
    const r = resolveVoiceConfirmationTier(cmd({ roleRequired: ['trainer'], destructive: false }), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: 61, inputMode: 'voice',
    });
    expect(r.tier).toBe(TIER_FIRE_AND_FORGET);
    expect(r.physical).toBe(false);
    expect(r.reasons).not.toContain('cross_client');
  });

  it('no name spoken at all, selection active → quiet: silence is agreement with the selection', () => {
    const r = resolveVoiceConfirmationTier(cmd({ roleRequired: ['trainer'], destructive: false }), {}, {
      actorRole: 'trainer', lockedClientId: 61, targetClientId: null, inputMode: 'voice',
    });
    expect(r.physical).toBe(false);
    expect(r.reasons).not.toContain('unplaceable_spoken_ref');
  });
});
