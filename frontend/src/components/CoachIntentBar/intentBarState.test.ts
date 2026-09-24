/**
 * Intent bar state — the safety logic behind the client chip.
 *
 * Two failures are guarded here and they pull in opposite directions:
 *   1. A cross-client command that does NOT raise the alarm → a write to the
 *      wrong person's record. This was live in production (C0.5).
 *   2. An alarm that fires on routine actions → habituation. A confirmation
 *      that always fires is equivalent to no confirmation, and the chip becomes
 *      wallpaper by the 200th session.
 *
 * Most of these tests exist to keep (2) from being "fixed" into existence while
 * defending against (1).
 */
import { describe, expect, it } from 'vitest';
import {
  audiencePath,
  effectiveClientId,
  resolveIntentBarState,
  toClientId,
} from './intentBarState';

const state = (input = {}) => resolveIntentBarState(input);

describe('audience resolution', () => {
  it('keeps an admin in the admin shell', () => {
    // Hardcoding a role path does not navigate — it DEMOTES an admin.
    expect(state({ pathname: '/dashboard/admin/clients' }).audience).toBe('admin');
  });

  it('keeps a trainer in the trainer shell', () => {
    expect(state({ pathname: '/dashboard/trainer/clients' }).audience).toBe('trainer');
  });

  it('fails safe to admin with no path', () => {
    expect(state({}).audience).toBe('admin');
  });

  it('does not let a client id containing "trainer" flip the audience', () => {
    expect(state({ pathname: '/dashboard/admin/clients/trainer-84' }).audience).toBe('admin');
  });
});

describe('cross-client detection — must be HARD to trigger', () => {
  it('raises the alarm when the command acts on a different client', () => {
    const s = state({ lockedClientId: 42, targetClientId: 99 });
    expect(s.crossClient).toBe(true);
    expect(s.chipTone).toBe('cross-client');
  });

  it('does NOT raise on a stringified id from a different transport', () => {
    // 42 and '42' are the same client. A transport quirk must never
    // manufacture an alarm — same guard as voiceConfirmationTier.
    expect(state({ lockedClientId: 42, targetClientId: '42' }).crossClient).toBe(false);
  });

  it('treats a missing target as the locked client, not as someone else', () => {
    expect(state({ lockedClientId: 42 }).crossClient).toBe(false);
  });

  it('cannot be cross-client when nothing is locked', () => {
    expect(state({ targetClientId: 99 }).crossClient).toBe(false);
  });
});

describe('chip tone — quiet in the common case', () => {
  it('stays quiet for ordinary same-client work', () => {
    expect(state({ lockedClientId: 42, targetClientId: 42 }).chipTone).toBe('locked');
  });

  it('reports unlocked rather than pretending a client is selected', () => {
    expect(state({}).chipTone).toBe('unlocked');
    expect(state({}).unresolvedClient).toBe(true);
  });
});

describe('client id canonicalization', () => {
  it('matches the backend guard — positive safe integers only', () => {
    for (const bad of [0, -1, 'abc', 1.5, null, undefined, '', Number.NaN]) {
      expect(toClientId(bad)).toBeNull();
    }
  });

  it('accepts a numeric string', () => {
    expect(toClientId('84')).toBe(84);
  });
});

describe('effective client', () => {
  it('gives the locked client precedence, matching resolveCommandClientId', () => {
    expect(effectiveClientId(state({ lockedClientId: 42, targetClientId: 99 }))).toBe(42);
  });

  it('falls back to the target when nothing is locked', () => {
    expect(effectiveClientId(state({ targetClientId: 99 }))).toBe(99);
  });
});

describe('audiencePath', () => {
  it('never hardcodes a role segment', () => {
    expect(audiencePath(state({ pathname: '/dashboard/admin/x' }), 'workout-planner'))
      .toBe('/dashboard/admin/workout-planner');
    expect(audiencePath(state({ pathname: '/dashboard/trainer/x' }), '/workout-planner'))
      .toBe('/dashboard/trainer/workout-planner');
  });
});

describe('the named-but-unlocked chip (card 1.4, findings F16g/FF19)', () => {
  it('a client named while NOTHING is locked alarms — it used to read as "nothing selected"', () => {
    // Before card 1.4 this produced chipTone 'unlocked' (quiet) while
    // effectiveClientId returned 47 — a neutral chip over a targeted write.
    const state = resolveIntentBarState({ lockedClientId: null, targetClientId: 47 });
    expect(state.unlockedTarget).toBe(true);
    expect(state.identityCrossing).toBe(true);
    expect(state.chipTone).toBe('cross-client');
    expect(effectiveClientId(state)).toBe(47);
  });

  it('genuinely nothing selected stays quiet — the alarm must not become wallpaper', () => {
    const state = resolveIntentBarState({ lockedClientId: null, targetClientId: null });
    expect(state.identityCrossing).toBe(false);
    expect(state.chipTone).toBe('unlocked');
    expect(state.unresolvedClient).toBe(true);
  });

  it('the ordinary locked case stays quiet', () => {
    const state = resolveIntentBarState({ lockedClientId: 61, targetClientId: 61 });
    expect(state.identityCrossing).toBe(false);
    expect(state.chipTone).toBe('locked');
  });

  it('a true cross-client action still alarms, and is reported as BOTH crossClient and identityCrossing', () => {
    const state = resolveIntentBarState({ lockedClientId: 61, targetClientId: 47 });
    expect(state.crossClient).toBe(true);
    expect(state.unlockedTarget).toBe(false);
    expect(state.identityCrossing).toBe(true);
    expect(state.chipTone).toBe('cross-client');
  });

  it('the chip agrees with the SERVER: the shapes it alarms on are the shapes the tier escalates', () => {
    // Backend: cross_client (both ids, differing) and unlocked_target (target,
    // no lock). If these two lists ever diverge the surfaces disagree about
    // what "safe" means, which is worse than either being wrong alone.
    const escalatingShapes = [
      { lockedClientId: 61, targetClientId: 47 },
      { lockedClientId: null, targetClientId: 47 },
    ];
    for (const shape of escalatingShapes) {
      expect(resolveIntentBarState(shape).chipTone).toBe('cross-client');
    }
    const quietShapes = [
      { lockedClientId: 61, targetClientId: 61 },
      { lockedClientId: 61, targetClientId: null },
      { lockedClientId: null, targetClientId: null },
    ];
    for (const shape of quietShapes) {
      expect(resolveIntentBarState(shape).chipTone).not.toBe('cross-client');
    }
  });
});
