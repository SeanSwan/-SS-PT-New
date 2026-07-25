/**
 * ============================================================================
 * FILE: utils/coachIntentRecorder.ts
 * PURPOSE: The one seam where every Coach intent becomes a recorded fact.
 * CREATED: 2026-07-25 (Coach Hive-Mind C2)
 * ============================================================================
 *
 * WHAT THIS IS
 *   A thin, ambient binding between `aiWorkoutEvents.dispatchWithAcknowledgement`
 *   and the pure `CoachEventLog`. Every dispatch — voice, palette, or tap,
 *   across all four AI_* families — passes through here and is recorded with
 *   its origin, its subject client, and whether it actually landed.
 *
 * WHY A SEPARATE FILE
 *   `aiWorkoutEvents.ts` is the shared event vocabulary and must stay close to
 *   its 193-line size and its zero-dependency character. The recorder holds the
 *   ambient state (who is acting, about whom, from what input mode), which is
 *   the part that will grow when offline queueing lands. Keeping them apart
 *   means the later slice extends this file, not the vocabulary.
 *
 * WHY AMBIENT CONTEXT RATHER THAN PER-CALL ARGUMENTS
 *   There are ~30 dispatch call sites across four surfaces. Threading actor,
 *   client and origin through every one of them would be a large, risky diff
 *   whose only purpose is passing values that are constant for the duration of
 *   a session. The context is set once when the trainer selects a client or
 *   opens the mic, and read at the seam.
 *
 *   The cost is honest and bounded: if context is never set, intents are
 *   recorded with `clientId: null` and `inputOrigin: 'manual'`. Null client is
 *   NOT silently folded into anyone's memory — `projectCoachMemory` surfaces
 *   those separately, because an unattributed intent is the shape a
 *   wrong-client write takes, and C0.5 proved that path was live in production.
 *
 * FAIL-OPEN BY DESIGN
 *   Recording is observability. It must never break a trainer mid-session, so
 *   every entry point swallows its own errors. A lost log line is acceptable;
 *   a logger that breaks the workout logger is not.
 */
import {
  CoachEventLog,
  resolveOutcome,
  type InputOrigin,
  type IntentEvent,
  type IntentOutcome,
} from './coachEventLog';

/** Ambient context for the current session. */
export interface CoachIntentContext {
  actorId: number | null;
  /** Who the intents are ABOUT. Null means unattributed — never assumed. */
  clientId: number | null;
  inputOrigin: InputOrigin;
}

const log = new CoachEventLog();

let context: CoachIntentContext = {
  actorId: null,
  clientId: null,
  inputOrigin: 'manual',
};

/** Monotonic clock — injectable so tests and replay stay deterministic. */
let now: () => number = () => Date.now();

/** Test/replay seam. Not for production use. */
export function __setCoachIntentClock(fn: () => number): void {
  now = fn;
}

/**
 * Set who is acting and about whom. Call on client selection / session start.
 * Passing a different clientId is the moment a client-lock re-anchor is owed
 * (that confirmation UX is a later slice; this records the switch either way).
 */
export function setCoachIntentContext(next: Partial<CoachIntentContext>): void {
  context = { ...context, ...next };
}

export function getCoachIntentContext(): Readonly<CoachIntentContext> {
  return context;
}

/**
 * Declare the input mode for subsequent dispatches.
 * `inputOrigin` is the voice-vs-manual telemetry axis that existed nowhere
 * before this slice — it is a field on the event, not a parallel system.
 */
export function setCoachInputOrigin(origin: InputOrigin): void {
  context.inputOrigin = origin;
}

/**
 * Record one dispatch. Called from the single seam in aiWorkoutEvents.ts.
 *
 * @param acknowledged whether any effector invoked the ack callback at all
 * @param handled      the value it passed (false = saw it, declined)
 */
export function recordCoachIntent(
  name: string,
  payload: unknown,
  acknowledged: boolean,
  handled: boolean,
): IntentEvent | null {
  try {
    return log.record({
      name,
      payload,
      inputOrigin: context.inputOrigin,
      actorId: context.actorId,
      clientId: context.clientId,
      ts: now(),
      outcome: resolveOutcome(acknowledged, handled),
    });
  } catch {
    return null; // observability must never break the session
  }
}

/** Settle an intent whose real outcome arrives later (a server write, an undo). */
export function reconcileCoachIntent(
  id: string,
  outcome: IntentOutcome,
  meta: { reason?: string; supersededBy?: string } = {},
): boolean {
  try {
    return log.reconcile(id, outcome, meta);
  } catch {
    return false;
  }
}

export function getCoachEventLog(): CoachEventLog {
  return log;
}

/** Session teardown / client hand-off. */
export function resetCoachIntentLog(): void {
  try {
    log.clear();
    context = { actorId: null, clientId: null, inputOrigin: 'manual' };
  } catch { /* fail-open */ }
}