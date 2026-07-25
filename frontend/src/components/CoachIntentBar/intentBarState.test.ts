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
