/*
 * runVerdict.ts — "what is the store's run state, and what may the console SAY about it" (S4, R7).
 *
 * ── WHY THIS IS A SEPARATE MODULE AND NOT A BRANCH INSIDE THE COMPONENT ──────
 *
 * `19 §5` (A1-05, A1-13) is the hardest rule in this console, and it is a rule about a
 * DERIVATION, not about rendering:
 *
 *   acceptance is not completion — `POST /api/run/daily` answers `202 {requestId, runId: null}`,
 *   and `runId` is null because the engine accepts no caller-supplied id. There is therefore NO
 *   correlation between the id the console was handed and the run the engine is executing.
 *
 *   process exit is not completion either, and NEITHER IS A LOCK DISAPPEARING. A lock is released
 *   by a crashed runner, by a refused runner, and by a runner whose store went away. "the lock is
 *   free" is a fact about a file, not a verdict about a run.
 *
 * So the console cannot conclude anything from the request it made. It can only read the engine's
 * own record — `GET /api/run` → `journal.{status, runId}` — and report THAT, with the caveat that it
 * cannot attribute the journal entry to its own request.
 *
 * Splitting it out means the honesty rules are unit-testable without rendering, and it keeps the
 * component about layout. It is also where the two failure classes (`19 §5`) are applied: a refused
 * *request* is a different thing from an *unknown outcome*, and only one of them may claim
 * "nothing changed".
 */

import type { RunState } from '../adapters';

/** The engine's own journal statuses, plus the console's "no journal entry" state. */
export type VerdictKind = 'in-flight' | 'completed' | 'failed' | 'interrupted' | 'none' | 'unknown';

export interface Verdict {
  kind: VerdictKind;
  /** The engine's status string, verbatim — never normalised into our own vocabulary. */
  raw: string | null;
  runId: string | null;
  /** The sentence the panel shows. Derived here so it cannot drift from `kind`. */
  sentence: string;
  /** True only for `kind === 'in-flight'`. Drives the poll cadence, and nothing else. */
  active: boolean;
}

/**
 * The engine writes `status: 'running'` while a run holds the store, and a concluding record on top
 * of it. `runs/` carries more, but the journal is a single slot and this is what it exposes.
 *
 * `'running'` is the ONLY status that means "something is happening now" — everything else is a
 * record of something that has ENDED, including `failed`. That asymmetry is the whole point: a
 * failed run must never drive a poll loop, because polling a store reads files and a console that
 * polls because a run failed is a console that never stops.
 */
const IN_FLIGHT = 'running';

export function verdictOf(state: RunState | null, requestId: string | null): Verdict {
  const journal = state?.journal ?? null;

  if (!journal || typeof journal.status !== 'string') {
    return {
      kind: 'none',
      raw: null,
      runId: null,
      sentence: requestId
        ? `Request ${requestId} was accepted. The engine's journal has no entry — it may not have started yet.`
        : 'The engine has no run journal entry for this store.',
      active: false,
    };
  }

  const raw = journal.status;
  const runId = journal.runId ?? null;

  if (raw === IN_FLIGHT) {
    return {
      kind: 'in-flight',
      raw,
      runId,
      // Naming OUR request id would be a fabricated correlation: the engine never saw it (A1-05).
      // So the sentence names only what is checkable — the journal's own run id, if it has one.
      sentence: runId
        ? `A run is in flight (${runId}).`
        : 'A run is in flight, and the engine has not named it yet.',
      active: true,
    };
  }

  if (raw === 'completed' || raw === 'failed' || raw === 'interrupted') {
    return {
      kind: raw,
      raw,
      runId,
      sentence: runId
        ? `The last recorded run ${raw}: ${runId}.`
        : `The last recorded run ${raw}.`,
      active: false,
    };
  }

  // An unrecognised status is REPORTED AS UNRECOGNISED rather than coerced into one of ours. If a
  // future engine adds a status, this panel must say "I do not know what this means" instead of
  // silently filing it under `failed` — which would be a verdict nobody took.
  return {
    kind: 'unknown',
    raw,
    runId,
    sentence: `The engine reports a run status this console does not recognise: "${raw}".`,
    active: false,
  };
}

/**
 * `perHour` validation, client-side, deliberately MIRRORING the bridge's rule rather than
 * re-inventing one (`05 §2b`: "`perHour` integer ≥ 1 (both client and server)").
 *
 * It returns `null` for a valid value and a sentence for an invalid one. The sentence is the
 * panel's own, because this is a pre-request check — there is no engine reason to quote yet, and
 * saying "the engine refused it" about a request that was never sent would be a lie about what
 * happened.
 *
 * The empty string is invalid rather than "0": the field starts empty, and a submit of an empty
 * field is the operator having not decided yet, not the operator asking for zero.
 */
export function validatePerHour(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return 'Enter an operations-per-hour budget.';
  // Reject BEFORE Number() would coerce: `Number('3.5')` is 3.5 and `Number('')` is 0, and both
  // would otherwise reach a check that only looks at the parsed value.
  if (!/^\d+$/.test(trimmed)) return 'The budget must be a whole number, 1 or more.';
  const n = Number(trimmed);
  if (n < 1) return 'The budget must be at least 1 per hour.';
  return null;
}

/**
 * How long ago THIS CONSOLE last read the run state, in the operator's language.
 *
 * ── IT MEASURES THE READ, NOT THE RUN, AND THE DISTINCTION IS LOAD-BEARING ────
 *
 * `runState` (`lib/status.mjs:167`) returns `journal: {status, runId}` and nothing else — the
 * journal carries **no timestamp**. So there is no "when did that run end?" to render, and inventing
 * one would be exactly the fabricated measurement R3 forbids.
 *
 * What IS known is when we asked. That is still worth showing, because the panel's real job here is
 * to stop the operator reading a *reading* as a *live value*: "observed 2 s ago" tells them the
 * sentence above is as fresh as the last poll and no fresher. A missing timer would leave an
 * in-flight run looking like a live stream.
 *
 * Against the journal's own absence the sentence says "never" — meaning "this console has not read
 * the run state yet", not "no run has ever happened". Those are different, and the panel says the
 * first one because it is the one we measured.
 */
export function sinceText(iso: string | null, nowMs: number): string {
  if (!iso) return 'never';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'at an unreadable time';
  const secs = Math.max(0, Math.round((nowMs - t) / 1000));
  if (secs < 2) return 'just now';
  if (secs < 60) return `${secs} s ago`;
  const mins = Math.round(secs / 60);
  return mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
}
