/**
 * heroSignatureMachine.test.ts — the decisions, tested directly.
 * ==============================================================
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM `HeroSignature.test.tsx`. A8 learned this the expensive
 * way: extracting three modules out of `swanMarkScene.ts` moved code OUTSIDE the suite's reach,
 * the suite stayed green at 46/46, and two deliberate mutations planted in the new modules
 * survived unnoticed. Component tests reach these functions only through the paths the component
 * happens to take, which leaves the edges — exact-deadline, terminal states, the downgrade
 * matrix — unexercised and un-mutated.
 *
 * So the same extraction gets the same treatment: its own suite, aimed at the boundaries.
 */
import { describe, expect, it } from 'vitest';
import {
  deadlineExpired,
  mayCreateController,
  mayStartLoad,
  nextPhaseForCapability,
  ownsController,
  phaseAfterFailure,
  phaseWhenHidden,
  posterVisible,
  type SignaturePhase,
} from './heroSignatureMachine';
import type { CanonicalTier, CapabilityState } from '../../../../core/perf/performanceTierPolicy';

const cap = (phase: 'pending' | 'ready', tier: CanonicalTier): CapabilityState =>
  ({ phase, tier } as unknown as CapabilityState);

const base = {
  capability: cap('ready', 'full'),
  everVisible: true,
  visible: true,
  observerAvailable: true,
};

describe('mayStartLoad — the four gates', () => {
  it('permits the one fully eligible combination', () => {
    expect(mayStartLoad(base)).toBe(true);
  });

  it('refuses while capability is pending, without latching', () => {
    // `pending` carries tier `reduced`. Reading the bare tier would say "never"; the phase says
    // "not yet". This function returns false; it does NOT return a terminal state.
    expect(mayStartLoad({ ...base, capability: cap('pending', 'reduced') })).toBe(false);
  });

  it.each<CanonicalTier>(['lean', 'reduced'])('refuses tier %s', (tier) => {
    expect(mayStartLoad({ ...base, capability: cap('ready', tier) })).toBe(false);
  });

  it('refuses when never visible, and when not visible now', () => {
    expect(mayStartLoad({ ...base, everVisible: false, visible: false })).toBe(false);
    expect(mayStartLoad({ ...base, everVisible: true, visible: false })).toBe(false);
  });

  it('refuses with no IntersectionObserver even when everything else is eligible', () => {
    // The tempting default is "assume visible". That downloads ~900 KB for a hero the visitor
    // may never scroll to, on exactly the old browsers least able to afford it.
    expect(mayStartLoad({ ...base, observerAvailable: false })).toBe(false);
  });
});

describe('mayCreateController — the post-await re-check', () => {
  const ok = {
    input: base,
    cancelled: false,
    startedGeneration: 1,
    currentGeneration: 1,
    deadlineExpired: false,
  };

  it('permits a timely, uncancelled, same-generation success', () => {
    expect(mayCreateController(ok)).toBe(true);
  });

  it('refuses after cancellation', () => {
    expect(mayCreateController({ ...ok, cancelled: true })).toBe(false);
  });

  it('refuses across a generation change (StrictMode replay / remount)', () => {
    expect(mayCreateController({ ...ok, currentGeneration: 2 })).toBe(false);
  });

  it('refuses once the deadline has expired', () => {
    expect(mayCreateController({ ...ok, deadlineExpired: true })).toBe(false);
  });

  it('re-asks eligibility rather than trusting the pre-await answer', () => {
    // The whole reason this function takes `input` again: a downgrade during the import must
    // prevent construction even though the load was started legitimately.
    expect(
      mayCreateController({ ...ok, input: { ...base, capability: cap('ready', 'reduced') } }),
    ).toBe(false);
  });
});

describe('deadlineExpired — boundary behaviour', () => {
  it('is false strictly inside the budget', () => {
    expect(deadlineExpired(1000, 1999, 1000)).toBe(false);
  });

  it('is TRUE exactly at the budget', () => {
    // `>=`, not `>`. Preparation that consumed exactly the whole budget has spent it; treating
    // the boundary as "still fine" is how a deadline drifts by one frame forever.
    expect(deadlineExpired(1000, 2000, 1000)).toBe(true);
  });

  it('is true past the budget', () => {
    expect(deadlineExpired(1000, 5000, 1000)).toBe(true);
  });
});

describe('posterVisible — exactly one state hides it', () => {
  const all: SignaturePhase[] = ['idle', 'loading', 'revealing', 'presented', 'disabled'];
  it.each(all)('%s', (phase) => {
    expect(posterVisible(phase)).toBe(phase !== 'presented');
  });

  it('keeps the poster during revealing, not just before it', () => {
    // The one-frame hole: during `revealing` no frame has been blitted yet.
    expect(posterVisible('revealing')).toBe(true);
  });
});

describe('nextPhaseForCapability — what survives a capability change', () => {
  it('disabled is terminal for EVERY capability state, not just an upgrade to full', () => {
    /*
     * Exhaustive on purpose. A single-case assertion here passed even with the terminal guard
     * deleted, because the fall-through happens to return `disabled` too — so that assertion was
     * describing an accident, not testing the guard. Enumerating all six combinations states the
     * invariant the hero actually depends on: once failed, nothing revives it.
     */
    for (const phase of ['pending', 'ready'] as const) {
      for (const tier of ['full', 'lean', 'reduced'] as CanonicalTier[]) {
        expect(
          nextPhaseForCapability('disabled', cap(phase, tier)),
          `disabled escaped via ${phase}/${tier}`,
        ).toBe('disabled');
      }
    }
  });

  it('presented survives a downgrade', () => {
    // The frame is already on screen. Replacing it with a poster of the same mark is a visible
    // regression for no benefit; A10 governs whether it keeps moving.
    expect(nextPhaseForCapability('presented', cap('ready', 'reduced'))).toBe('presented');
  });

  it('pending leaves every phase untouched', () => {
    for (const p of ['idle', 'loading', 'revealing'] as SignaturePhase[]) {
      expect(nextPhaseForCapability(p, cap('pending', 'reduced'))).toBe(p);
    }
  });

  it('idle stays idle on an ineligible ready state, so a later upgrade still works', () => {
    expect(nextPhaseForCapability('idle', cap('ready', 'lean'))).toBe('idle');
  });

  it('in-flight work latches disabled on downgrade', () => {
    expect(nextPhaseForCapability('loading', cap('ready', 'lean'))).toBe('disabled');
    expect(nextPhaseForCapability('revealing', cap('ready', 'reduced'))).toBe('disabled');
  });
});

describe('phaseWhenHidden — the split by phase is the point', () => {
  it('latches disabled when hidden while loading or revealing', () => {
    expect(phaseWhenHidden('loading')).toBe('disabled');
    expect(phaseWhenHidden('revealing')).toBe('disabled');
  });

  it('leaves idle, presented and disabled alone', () => {
    expect(phaseWhenHidden('idle')).toBe('idle');
    expect(phaseWhenHidden('presented')).toBe('presented');
    expect(phaseWhenHidden('disabled')).toBe('disabled');
  });
});

describe('ownsController / phaseAfterFailure', () => {
  it('only revealing and presented own a controller', () => {
    expect(ownsController('revealing')).toBe(true);
    expect(ownsController('presented')).toBe(true);
    expect(ownsController('idle')).toBe(false);
    expect(ownsController('loading')).toBe(false);
    expect(ownsController('disabled')).toBe(false);
  });

  it('failure is always terminal', () => {
    expect(phaseAfterFailure()).toBe('disabled');
  });
});
