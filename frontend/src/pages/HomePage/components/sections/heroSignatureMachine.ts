/**
 * heroSignatureMachine.ts — A9's lifecycle decisions, as pure functions.
 * ======================================================================
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT. Every interesting thing A9 must get right is a
 * DECISION, not a render: may we import yet, is this late success still valid, does this
 * failure latch, did the deadline expire. Leaving those inside `useEffect` makes them
 * reachable only through a mounted component with a real `IntersectionObserver` and a real
 * WebGL context — which is exactly the shape of test that gets skipped, and then the
 * decisions go unverified. Pulled out here they are ordinary functions with ordinary inputs.
 *
 * This is the same move A8 made when `swanMarkScene.ts` went 281 → 427 → 277 lines: the
 * extraction is what let the loop get its own suite. It is also the trap A8 hit — extracting
 * code moved it OUTSIDE the suite's reach and two deliberate mutations survived while the
 * suite stayed green. So this module is tested directly, not merely through the component.
 *
 * THE INVARIANT THE WHOLE SLICE PROTECTS. The poster is the truth until the WebGL mark has
 * actually presented a frame. Never before. Anything that goes wrong — a failed import, a
 * downgrade, a lost context, an expired deadline, an unmount — resolves to "the poster is
 * still there", never to a blank hole in the hero.
 */
import {
  mayAttemptEnhancement,
  type CapabilityState,
} from '../../../../core/perf/performanceTierPolicy';

/**
 * The lifecycle, as the hero actually experiences it.
 *
 * `idle` and `disabled` look identical on screen (poster, no canvas) but are NOT the same
 * state, and collapsing them is the bug A1 was written to prevent one layer down: `idle`
 * means "not yet, ask again", `disabled` means "never, stop asking". A single boolean here
 * would re-introduce the latch the provider's `pending` phase exists to avoid.
 */
export type SignaturePhase =
  | 'idle'
  | 'loading'
  | 'revealing'
  | 'presented'
  | 'disabled';

export interface MachineInput {
  /** The provider's full capability state — `pending` must be distinguishable. */
  readonly capability: CapabilityState;
  /** Has the hero been intersected at least once? */
  readonly everVisible: boolean;
  /** Is the hero on screen right now? */
  readonly visible: boolean;
  /** False when the environment has no IntersectionObserver. */
  readonly observerAvailable: boolean;
}

/**
 * May we START a load?
 *
 * Four conditions, and each one is a named acceptance case:
 *
 *  - `mayAttemptEnhancement` — `phase === 'ready' && tier === 'full'`. While the provider is
 *    `pending` this is false, which is L1's *pending detection never latches disabled*: we
 *    return false WITHOUT moving to `disabled`, so a later `ready` still gets its chance.
 *  - `observerAvailable` — L4's *missing observer retains poster*. With no observer we cannot
 *    know whether the hero is on screen, and guessing "probably visible" would download ~600 KB
 *    of `three` for a hero the user may never scroll to. The poster is the correct answer.
 *  - `everVisible` — L1's *initially offscreen does not import*.
 *  - `visible` — do not begin work for something that has already scrolled away.
 */
export function mayStartLoad(input: MachineInput): boolean {
  if (!input.observerAvailable) return false;
  if (!mayAttemptEnhancement(input.capability)) return false;
  if (!input.everVisible) return false;
  return input.visible;
}

/**
 * Is a load that has ALREADY RESOLVED still allowed to create a controller?
 *
 * The gap between "we started importing" and "the import resolved" is unbounded — a cold cache
 * on a slow connection can make it seconds. Everything can change inside it, so eligibility is
 * re-asked rather than assumed, which is L2's *late import after downgrade creates no
 * controller*.
 *
 * `generation` is the guard for StrictMode and for remounts. React 18 StrictMode runs every
 * effect twice in development; without a generation the second run's import would resolve
 * against the first run's teardown and build a controller nobody owns. L5's *StrictMode effect
 * replay permits one valid reveal* is this check.
 *
 * The deadline is separate on purpose — see `deadlineExpired`.
 */
export function mayCreateController(args: {
  readonly input: MachineInput;
  readonly cancelled: boolean;
  readonly startedGeneration: number;
  readonly currentGeneration: number;
  readonly deadlineExpired: boolean;
}): boolean {
  if (args.cancelled) return false;
  if (args.startedGeneration !== args.currentGeneration) return false;
  if (args.deadlineExpired) return false;
  // Re-ask, do not trust the answer we got before the await.
  return mayStartLoad(args.input);
}

/**
 * Has the budget run out?
 *
 * L2's *expired deadline rejects late success* and L5's *synchronous preparation exceeding the
 * deadline never presents late* are the same rule applied at two moments, so they share one
 * function. `>=` not `>`: a preparation that consumed exactly the whole budget has spent it.
 *
 * The honesty this enforces is that a reveal arriving after the user has read the hero and
 * moved on is not a feature — it is a jarring late animation, and the poster was already fine.
 */
export function deadlineExpired(startedAt: number, now: number, budgetMs: number): boolean {
  return now - startedAt >= budgetMs;
}

/**
 * Where does a failure leave us?
 *
 * Always `disabled`, and `disabled` is terminal. L3's *failure remains latched after provider
 * upgrade* depends on the caller never transitioning out of it — see `nextPhaseForCapability`,
 * which refuses to revive it.
 *
 * A retry loop here would be worse than useless: the common causes (no WebGL, a blocked chunk,
 * a GPU driver that refuses a context) do not fix themselves within a page view, so retrying
 * burns battery and bandwidth to arrive at the same poster.
 */
export function phaseAfterFailure(): SignaturePhase {
  return 'disabled';
}

/**
 * Should the poster be painted?
 *
 * Exactly one state hides it. This is L3's *poster remains until first presentation* — note it
 * keys on `presented`, not on `revealing`: during the reveal the canvas has not yet blitted a
 * frame, and hiding the poster then is precisely the one-frame hole this slice exists to
 * prevent.
 */
export function posterVisible(phase: SignaturePhase): boolean {
  return phase !== 'presented';
}

/**
 * Recompute the phase when the capability state changes underneath us.
 *
 * Two rules, both of which are acceptance cases:
 *
 *  - `disabled` is terminal. An upgrade to `full` after a failure does NOT restart anything —
 *    L3's *failure remains latched after provider upgrade*.
 *  - A downgrade while work is in flight goes to `disabled`, because the controller is about to
 *    be disposed and the poster is the resting state.
 *
 * `presented` deliberately survives a downgrade: the frame is already on screen, and tearing it
 * down to show a poster of the same mark would be a visible regression for no benefit. A9 stops
 * the DRIFT under reduced motion; A10 owns that, not this function.
 */
export function nextPhaseForCapability(
  phase: SignaturePhase,
  capability: CapabilityState,
): SignaturePhase {
  /*
   * MEASURED 2026-09-21: this guard is REDUNDANT today. A mutation that deletes it does not
   * fail a single test, and enumerating all six `{phase} x {tier}` capability combinations
   * against `phase === 'disabled'` shows every remaining path already returns `'disabled'`.
   *
   * It is kept deliberately, and the redundancy is recorded rather than hidden, because the
   * property is currently an ACCIDENT of the branches below: change the `!mayAttemptEnhancement`
   * branch to return anything other than `phase` for a non-idle phase and `disabled` escapes.
   * The guard makes the invariant explicit and cheap; the comment stops a future reader from
   * "simplifying" it away on the (correct but temporary) grounds that nothing covers it.
   */
  if (phase === 'disabled') return 'disabled';
  if (phase === 'presented') return 'presented';
  if (capability.phase === 'pending') return phase;
  if (!mayAttemptEnhancement(capability)) {
    // Nothing started yet → stay idle so a later upgrade is still possible.
    // Work in flight → the controller is going away, so latch.
    return phase === 'idle' ? 'idle' : 'disabled';
  }
  return phase;
}

/**
 * Does going hidden end the attempt?
 *
 * L4 splits this by phase and the split is the point:
 *
 *  - hidden while `loading` → `disabled` (*hidden during loading latches disabled*). The import
 *    may still be in flight; committing to it for an offscreen hero wastes the download.
 *  - hidden while `revealing` → `disabled`, and the caller disposes (*hidden during reveal
 *    disposes controller*). An animation nobody can see still holds a WebGL context and still
 *    schedules frames.
 *  - hidden while `presented` → unchanged. The frame is drawn and costs nothing to keep; A10
 *    governs whether it keeps animating.
 */
export function phaseWhenHidden(phase: SignaturePhase): SignaturePhase {
  if (phase === 'loading' || phase === 'revealing') return 'disabled';
  return phase;
}

/** Does this phase own a controller that must be disposed? */
export function ownsController(phase: SignaturePhase): boolean {
  return phase === 'revealing' || phase === 'presented';
}
