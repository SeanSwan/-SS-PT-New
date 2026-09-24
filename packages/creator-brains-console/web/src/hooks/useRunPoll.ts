/*
 * useRunPoll — the polling coordinator for the RunConsole (S4, D3 as amended).
 *
 * ── THE CADENCE IS A DECISION WITH A REASON, NOT A NUMBER SOMEBODY LIKED ─────
 *
 * `02 §5 D3` was amended 2026-09-20 to one coordinator with four rates, and each rate answers a
 * different question:
 *
 *   active                      2 s   — something IS happening; the operator is watching it
 *   active beyond 10 min        5 s   — still happening, but a long run is not a fast-changing one
 *   idle                        5 s   — the last read found nothing running; catch a new run soon
 *   hidden                     15 s   — nobody is looking; do not spend the store's file reads
 *   visibility returns      immediate — the operator looked, so the staleness is now theirs to act on
 *
 * ── WHY THIS IS A COORDINATOR AND NOT A `useEffect` WITH `setInterval` ──────
 *
 * Three separate defects are possible in a poll loop, and all three are silent in review:
 *
 * 1. **Overlapping requests.** A 2 s timer with a 6 s response stacks three in-flight reads. The
 *    guard is a latch that is released in `finally` — never by the timer — so a slow response
 *    delays the next poll instead of duplicating it. (The same lesson as `useStatus` S1-H4, and it
 *    is repeated rather than shared because the two loops have different cadences and different
 *    stop conditions; a shared abstraction would take a policy argument, which is how a coordinator
 *    becomes a place nobody can read the policy from.)
 *
 * 2. **A loop that outlives its component.** `setInterval` survives unmount unless cleared, and in
 *    React 18 StrictMode the mount/unmount/mount cycle makes an uncleared timer fire against a
 *    torn-down component. Cleared in the effect's cleanup, always.
 *
 * 3. **A loop that never stops because a run FAILED.** This is the one worth the ink. A failed
 *    journal status is a *record of something that ended*. If the poll condition were "not
 *    completed", a failed run would poll forever — reading the store's files every 2 s until the
 *    tab closed, for a run that is not happening. So the loop is driven by `active`, which is true
 *    for `running` and NOTHING else. (`runVerdict.ts` derives it; this file only obeys it.)
 *
 * ── AND WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────
 *
 * It does not stop when the response says "no run". It does not accumulate history. It does not
 * hold the request id — the id is the caller's, and this hook is about the store, not about one
 * accepted request (A1-05: there is no correlation between them anyway).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError, type ErrorCode } from '../adapters';
import type { RunState } from '../adapters';

export const ACTIVE_MS = 2_000;
export const ACTIVE_SLOW_MS = 5_000;
/** Beyond this, a run is long rather than fast, and 2 s buys nothing a 5 s poll does not. */
export const SLOW_AFTER_MS = 10 * 60 * 1000;
export const HIDDEN_MS = 15_000;

export interface RunPollState {
  state: RunState | null;
  error: { code: ErrorCode; message: string } | null;
  /** When OUR last successful read landed — the only timestamp the bridge gives us. */
  readAt: string | null;
  /** True while a read is in flight; the panel uses it for "reading…", not for a verdict. */
  reading: boolean;
}

export interface UseRunPollOptions {
  /**
   * Whether a run is currently visible. Raises the cadence; never stops the loop.
   *
   * It is a CADENCE input, not an on/off switch. Making it the switch was a defect: the hook is
   * told `active` before it has produced the reading that determines `active`, so the caller must
   * derive it from a ref written during render — and a ref written during render does not schedule
   * a re-render, so the transition the effect waits for never arrives. Measured as exactly one read
   * after mount and never a second, which is what T-W6's polling case caught.
   */
  active: boolean;
  /** 0 disables polling entirely (tests, and the reduced-motion/static case). */
  pollMs?: number;
  now?: () => number;
}

/** Milliseconds since the epoch, as an ISO string — what the panel renders. */
function stamp(now: () => number): string {
  return new Date(now()).toISOString();
}

export function useRunPoll(
  adapter: { getRunState(): Promise<RunState> },
  opts: UseRunPollOptions,
): RunPollState & { refresh: () => void } {
  const { active, pollMs = ACTIVE_SLOW_MS } = opts;
  const enabled = pollMs > 0;

  /**
   * The clock, held in a ref.
   *
   * `now` defaults to an inline arrow, so it is a NEW function identity on every render. If it were
   * a dependency of `load`, then `load` — and therefore the polling effect — would be torn down and
   * re-armed on every single render. That is an infinite loop, and it arrives silently: an injected
   * clock is a test affordance, so the loop only appears under test, where a re-armed effect looks
   * like a busy poll until the fake clock stops settling and the runner hangs forever.
   *
   * Stabilising the identity here rather than at every call site means a caller cannot reintroduce
   * it by passing an inline clock.
   */
  const nowRef = useRef(opts.now ?? (() => Date.now()));
  nowRef.current = opts.now ?? nowRef.current;
  const now = useCallback(() => nowRef.current(), []);

  const [state, setState] = useState<RunState | null>(null);
  const [error, setError] = useState<RunPollState['error']>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const mounted = useRef(true);
  const inFlight = useRef(false);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  /**
   * The current value of `active`, readable from inside the timer tick.
   *
   * `active` changes on almost every read (it is derived from the verdict), so as a dependency it
   * would restart the cadence timer roughly once per poll — making the interval a property of the
   * polling rather than of the run. A ref carries the value into the tick instead, which is the
   * bounded one-read lag the cadence is supposed to have: the rate describes the run we have SEEN.
   */
  const activeRef = useRef(active);
  activeRef.current = active;
  /**
   * When the CURRENT run was first observed. Reset when `active` goes false, so the 10-minute
   * escalation measures one run rather than the age of the page — a console left open overnight
   * would otherwise start every new run already "slow".
   *
   * ASSIGNED DURING RENDER, not in an effect. An effect that assigns this runs AFTER the polling
   * effect has already armed its first timer, so the first tick reads the previous value — or, on
   * the very first run, `null` — and the escalation is applied a tick late or not at all. Same
   * class as `useStatus`'s latch: state the loop reads must be correct before the loop is armed.
   */
  const activeSince = useRef<number | null>(null);
  if (active && activeSince.current === null) activeSince.current = now();
  if (!active) activeSince.current = null;

  const load = useCallback(async () => {
    if (inFlight.current) return; // never stack reads
    inFlight.current = true;
    setReading(true);
    try {
      const next = await adapterRef.current.getRunState();
      if (!mounted.current) return;
      setState(next);
      setError(null);
      setReadAt(stamp(now));
    } catch (err) {
      if (!mounted.current) return;
      // The PREVIOUS reading is kept, and the panel says the last read failed. Dropping `state`
      // here would turn a transport blip into "there is no run", which is a claim about the store.
      setError(describeError(err));
    } finally {
      inFlight.current = false;
      if (mounted.current) setReading(false);
    }
  }, [now]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  /**
   * Re-arm, or stop.
   *
   * `pollMs > 0` is the ONLY switch. It is a stable boolean, so it is safe as a dependency — which
   * is the whole reason the earlier versions of this hook misbehaved. Both `enabled` and `active`
   * were once derived from refs written during render, and a ref written during render does not
   * schedule a re-render: the transition the effect was waiting for could never arrive. Measured as
   * exactly one read after mount and never a second. The cadence now carries the policy instead —
   * a run in flight polls at 2 s, an idle store at 5 s — and the loop is never silently unarmed.
   */
  useEffect(() => {
    mounted.current = true;

    // ── THE CLEANUP IS RETURNED ON BOTH PATHS (Astra round 1, P2f) ───────────
    //
    //   `if (!enabled) return undefined` used to skip the cleanup below, so with
    //   polling disabled NOTHING ever set `mounted.current = false`. The initial
    //   read at `load()` is awaited across the unmount, so it would then pass its
    //   own mounted check and write state into a component that no longer exists —
    //   the exact class of leak the flag exists to prevent, left open on the one
    //   path where the flag was most likely to be exercised (a disabled test).
    //
    //   The flag and the cleanup are one thing, so they are returned together and
    //   the loop-specific teardown is layered on top only when a loop exists.
    const teardown = () => { mounted.current = false; };

    // ── THE FIRST READ IS NOT GATED ON THE LOOP ──────────────────────────────
    //
    // The guard used to be `if (!enabled) return` placed BEFORE this call, which put the initial
    // load inside the enablement it was supposed to inform. The two are different questions:
    // `enabled` answers "should there be a recurring loop?"; the initial read answers "what is the
    // state right now?" — and a caller who disabled polling for a test still wants one answer.
    void load();

    if (!enabled) return teardown;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const tickMs = () => {
      if (typeof document !== 'undefined' && document.hidden) return HIDDEN_MS;
      if (!activeRef.current) return ACTIVE_SLOW_MS;
      const since = activeSince.current;
      return since !== null && now() - since > SLOW_AFTER_MS ? ACTIVE_SLOW_MS : ACTIVE_MS;
    };

    const schedule = () => {
      // A `setTimeout` chain rather than `setInterval`, because the cadence CHANGES with the verdict
      // and with visibility. An interval is a fixed rate; re-arming is how the rate moves without
      // leaving a second timer behind.
      clearTimeout(timer);
      timer = setTimeout(() => {
        void load();
        schedule();
      }, tickMs());
    };

    schedule();

    // Returning to the tab refreshes IMMEDIATELY rather than waiting out the hidden cadence: the
    // operator is looking now, and a 15 s old reading is the one thing they cannot tell is old.
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void load();
        schedule();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      teardown();
      clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [enabled, load, now]); // `enabled` is pollMs > 0: stable, so this is safe

  return { state, error, readAt, reading, refresh };
}
