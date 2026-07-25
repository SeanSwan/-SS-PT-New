/**
 * ============================================================================
 * FILE: utils/coachMemoryProjection.ts
 * PURPOSE: Coach's cross-surface memory, derived — never narrated.
 * CREATED: 2026-07-25 (Coach Hive-Mind C2)
 * ============================================================================
 *
 * THE LAW THIS FILE ENFORCES
 *   Memory is a PROJECTION over the intent log, not a transcript.
 *
 *   The failure it prevents: Coach proposes a plan edit in the Planner, the
 *   trainer moves to the Logger, and that edit silently failed — validation,
 *   permission, an unmounted effector. A conversation-shaped memory now holds a
 *   belief the database contradicts, and every later proposal is built on it.
 *   A confident, continuous lie is worse than four amnesiac docks, because
 *   amnesia at least fails visibly.
 *
 *   So the projection separates three things and never blurs them:
 *     believed  — `applied` only. Safe to state as fact.
 *     pending   — not yet settled. State as intent, never as outcome.
 *     failed    — reached nothing or was rejected. Must be surfaced, not hidden.
 *
 *   A caller that wants "what do we know" gets `believed`. Nothing else is
 *   allowed to masquerade as knowledge.
 *
 * CLIENT SCOPING IS A SAFETY BOUNDARY, NOT A FILTER
 *   Every projection is built for exactly one client. Intents with a null
 *   clientId are NEVER folded into a client's memory — an unattributed intent
 *   is the shape a wrong-client write takes, and C0.5 proved that path was live
 *   in production. Unattributed entries are surfaced separately so they are
 *   visible rather than silently absorbed.
 *
 * PURE + DEPENDENCY-FREE, like the log it reads.
 */
import {
  type IntentEvent,
  type IntentOutcome,
  type InputOrigin,
  isBelievable,
  isTerminal,
} from './coachEventLog';

export interface CoachMemory {
  /** The client this projection is scoped to. */
  clientId: number;
  /** Applied intents — the only entries that may be stated as fact. */
  believed: IntentEvent[];
  /** Not yet settled. State as intent ("I tried to…"), never as outcome. */
  pending: IntentEvent[];
  /** Reached nothing or was rejected. Must be surfaced. */
  failed: IntentEvent[];
  /**
   * Recorded against no client. NOT folded into this client's memory — an
   * unattributed intent is how a wrong-client write looks in the log.
   */
  unattributed: IntentEvent[];
  /** Voice-origination telemetry, derived rather than separately instrumented. */
  originCounts: Record<InputOrigin, number>;
  /**
   * True when nothing is believed. Callers MUST treat this as "I don't know",
   * not as "nothing happened" — the distinction C1 had to fix in the intake
   * layer for exactly the same reason.
   */
  isEmpty: boolean;
}

const FAILED_OUTCOMES: ReadonlySet<IntentOutcome> = new Set<IntentOutcome>([
  'unhandled', 'failed',
]);

function emptyOriginCounts(): Record<InputOrigin, number> {
  return { voice: 0, manual: 0, coach_tool: 0 };
}

/**
 * Build the memory for ONE client from the full intent log.
 *
 * `noop` and `superseded` are deliberately in neither `believed` nor `failed`:
 * nothing went wrong, and nothing changed. Reporting them as failures would
 * manufacture false alarm; reporting them as applied would be a lie.
 */
export function projectCoachMemory(
  events: readonly IntentEvent[],
  clientId: number,
): CoachMemory {
  const believed: IntentEvent[] = [];
  const pending: IntentEvent[] = [];
  const failed: IntentEvent[] = [];
  const unattributed: IntentEvent[] = [];
  const originCounts = emptyOriginCounts();

  for (const event of events) {
    if (event.clientId === null) {
      unattributed.push(event);
      continue;
    }
    if (event.clientId !== clientId) continue;

    if (event.inputOrigin in originCounts) originCounts[event.inputOrigin] += 1;

    if (isBelievable(event.outcome)) believed.push(event);
    else if (FAILED_OUTCOMES.has(event.outcome)) failed.push(event);
    else if (!isTerminal(event.outcome)) pending.push(event);
    // noop / superseded: settled, harmless, deliberately uncounted.
  }

  return {
    clientId,
    believed,
    pending,
    failed,
    unattributed,
    originCounts,
    isEmpty: believed.length === 0,
  };
}

/**
 * One-line honest summary for a prompt or a dock.
 *
 * Never claims an unsettled intent landed, and says "I don't know" rather than
 * implying nothing happened — the same absence-vs-emptiness distinction the C1
 * intake-coverage block draws.
 */
export function summarizeCoachMemory(memory: CoachMemory): string {
  const parts: string[] = [];

  if (memory.isEmpty) {
    parts.push(`No confirmed actions on record for client ${memory.clientId} in this session — this means nothing is known, not that nothing happened.`);
  } else {
    parts.push(`${memory.believed.length} confirmed action(s) for client ${memory.clientId}.`);
  }
  if (memory.pending.length > 0) {
    parts.push(`${memory.pending.length} not yet confirmed — do not state these as done.`);
  }
  if (memory.failed.length > 0) {
    parts.push(`${memory.failed.length} did NOT land and must be retried or reported.`);
  }
  if (memory.unattributed.length > 0) {
    parts.push(`${memory.unattributed.length} recorded against no client — excluded from this client's memory.`);
  }
  return parts.join(' ');
}

/** Voice-origination rate over settled, attributed intents. Null when no data. */
export function voiceOriginationRate(memory: CoachMemory): number | null {
  const total = memory.originCounts.voice + memory.originCounts.manual + memory.originCounts.coach_tool;
  if (total === 0) return null;
  return memory.originCounts.voice / total;
}