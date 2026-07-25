/**
 * ============================================================================
 * FILE: utils/coachEventLog.ts
 * PURPOSE: The Coach event log — what was intended, and whether it landed.
 * CREATED: 2026-07-25 (Coach Hive-Mind C2)
 * ============================================================================
 *
 * WHY THIS EXISTS
 *   Swan Coach dispatches typed intents through `aiWorkoutEvents.ts`, whose
 *   `dispatchWithAcknowledgement` already returns whether a mounted effector
 *   handled the event. That boolean is the only truth signal in the system —
 *   and every caller currently discards it. Nothing is recorded.
 *
 *   Recording it at that one seam yields the event log for free, without
 *   touching any of the four event families or any handler.
 *
 * THE RULE THAT SHAPES EVERYTHING
 *   Memory must NEVER be a chat log. If Coach proposes an edit, the trainer
 *   moves surfaces, and the edit silently failed, a conversation-shaped memory
 *   now holds a belief the database contradicts — and every later proposal
 *   compounds it. A confident, continuous lie is worse than amnesia, because
 *   amnesia at least fails visibly.
 *
 *   So: memory is a PROJECTION over this log. An intent is only believed when
 *   it is `applied`. Everything else is explicitly pending or failed and must
 *   never be stated as fact.
 *
 * THE INFORMATION THE EXISTING CONTRACT LOSES
 *   `dispatchWithAcknowledgement` returns one boolean, which conflates two
 *   materially different outcomes:
 *     - no effector was mounted   → nobody was listening
 *     - an effector acked `false` → it looked and declined / no-op
 *       (real instance: useWorkoutAiEvents.ts:160 acks `next !== prev`)
 *   "Nobody heard you" and "it was considered and changed nothing" are
 *   different facts about the world. We distinguish them by observing whether
 *   the ack callback was INVOKED, separately from the value it carried.
 *
 * PURE + DEPENDENCY-FREE. No React, no DOM, no storage. That keeps it testable
 * in an environment where the frontend test runner cannot be installed, and it
 * is what lets the offline queue (a later slice) wrap this without a rewrite.
 */

/** Where the intent came from. The telemetry axis that exists nowhere today. */
export type InputOrigin = 'voice' | 'manual' | 'coach_tool';

/**
 * Reconciliation state. Only `applied` may be treated as fact.
 *
 * applied         — an effector handled it and reported a real change
 * noop            — an effector saw it and deliberately changed nothing
 * unhandled       — no effector was mounted; the intent reached nothing
 * failed          — an effector threw, or a later write rejected it
 * superseded      — a newer intent replaced this one before it settled
 * awaiting-confirm— staged, pending explicit human confirmation
 */
export type IntentOutcome =
  | 'applied'
  | 'noop'
  | 'unhandled'
  | 'failed'
  | 'superseded'
  | 'awaiting-confirm';

/** Outcomes that are settled — no further reconciliation will occur. */
const TERMINAL: ReadonlySet<IntentOutcome> = new Set<IntentOutcome>([
  'applied', 'noop', 'unhandled', 'failed', 'superseded',
]);

/** The ONLY outcome that may be asserted as having changed the world. */
const BELIEVABLE: ReadonlySet<IntentOutcome> = new Set<IntentOutcome>(['applied']);

export interface IntentEvent {
  id: string;
  name: string;
  payload: unknown;
  inputOrigin: InputOrigin;
  /** Who issued it (trainer/admin user id). */
  actorId: number | null;
  /** Who it is ABOUT. Null is a red flag, not a default — see resolveOutcome. */
  clientId: number | null;
  ts: number;
  outcome: IntentOutcome;
  /** Set when outcome === 'superseded'. */
  supersededBy?: string;
  /** Free-form reason for `failed`. Never contains PII (rule 8). */
  reason?: string;
}

/**
 * Translate the dispatch seam's raw signals into an outcome.
 *
 * @param ackCalled whether any effector invoked the acknowledge callback
 * @param ackValue  the value it passed (false = saw it, declined)
 */
export function resolveOutcome(ackCalled: boolean, ackValue: boolean): IntentOutcome {
  if (!ackCalled) return 'unhandled';
  return ackValue ? 'applied' : 'noop';
}

export const isTerminal = (o: IntentOutcome): boolean => TERMINAL.has(o);
export const isBelievable = (o: IntentOutcome): boolean => BELIEVABLE.has(o);

/** Deterministic id — no Date.now()/Math.random(), so the log is replayable. */
function makeId(seq: number, ts: number): string {
  return `evt_${ts.toString(36)}_${seq.toString(36)}`;
}

export interface CoachEventLogOptions {
  /** Ring-buffer bound. A memory that grows forever is its own outage. */
  limit?: number;
}

const DEFAULT_LIMIT = 200;

/**
 * Append-only, bounded intent log.
 *
 * Append-only is the point: an intent that failed stays in the record. Deleting
 * or mutating history is how a memory starts lying.
 */
export class CoachEventLog {
  private events: IntentEvent[] = [];
  private seq = 0;
  private readonly limit: number;

  constructor(opts: CoachEventLogOptions = {}) {
    this.limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  }

  record(input: {
    name: string;
    payload?: unknown;
    inputOrigin: InputOrigin;
    actorId?: number | null;
    clientId?: number | null;
    ts: number;
    outcome: IntentOutcome;
    reason?: string;
  }): IntentEvent {
    const event: IntentEvent = {
      id: makeId(this.seq++, input.ts),
      name: input.name,
      payload: input.payload ?? null,
      inputOrigin: input.inputOrigin,
      actorId: input.actorId ?? null,
      clientId: input.clientId ?? null,
      ts: input.ts,
      outcome: input.outcome,
      ...(input.reason ? { reason: input.reason } : {}),
    };
    this.events.push(event);
    if (this.events.length > this.limit) {
      this.events.splice(0, this.events.length - this.limit);
    }
    return event;
  }

  /** Settle a previously-recorded intent. Terminal states never change again. */
  reconcile(id: string, outcome: IntentOutcome, meta: { reason?: string; supersededBy?: string } = {}): boolean {
    const event = this.events.find((e) => e.id === id);
    if (!event || isTerminal(event.outcome)) return false;
    event.outcome = outcome;
    if (meta.reason) event.reason = meta.reason;
    if (meta.supersededBy) event.supersededBy = meta.supersededBy;
    return true;
  }

  all(): readonly IntentEvent[] {
    return this.events;
  }

  /** Client-scoped view. Entries with a null clientId belong to no client. */
  forClient(clientId: number): IntentEvent[] {
    return this.events.filter((e) => e.clientId === clientId);
  }

  clear(): void {
    this.events = [];
  }
}