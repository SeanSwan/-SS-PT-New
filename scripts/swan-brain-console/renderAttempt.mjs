/**
 * renderAttempt — the lifecycle of ONE render attempt, and why an older success must stop
 * being authoritative the moment a newer attempt starts.
 * @module scripts/swan-brain-console/renderAttempt
 *
 * WHY THIS EXISTS (Astra round 13, H03)
 * `shot-diff.mjs` published its artifact only AFTER the browser work completed. The write sat
 * below the `try/finally` that closes Chromium, so every failure path — a screenshot
 * exception, an unreadable baseline, a launch failure — left the process before reaching it.
 * The consequence is the worst shape this subsystem can produce: run the gate, it passes and
 * writes a green artifact; run it again, the new attempt dies; the green artifact from the
 * PREVIOUS run is still on disk, still fresh, still stamped `mode: "compare"`, and the console
 * reports PASS. **The console is not lying about the file. The file is lying about now.**
 *
 * This is the same defect class Astra named twice in round 13 — "evidence attached to the
 * wrong revision or observation time" — and it is the reason the fix is not "wrap the write in
 * a `finally`". A `finally` that publishes a PARTIAL run's results would be worse: a run that
 * measured three of twenty variants and then died would persist `3 passed, 0 failed` as a
 * green full-fleet gate, which is precisely the subset-certifying-the-fleet failure round 11's
 * F04 removed. An interrupted attempt is not a smaller run. It is a FAILED run.
 *
 * SO THE RULE IS TWO-STAGE, AND THE ORDER IS THE FIX
 *   1. Before any measurement, publish an IN-PROGRESS artifact. It cannot be read as green
 *      (`mode: "in-progress"` is refused by `evidenceMode.mjs`), so the instant an attempt
 *      starts, the previous attempt's green stops being the console's answer. A process killed
 *      outright leaves this state behind — which is the point: silence about a killed run is
 *      what the stale green was made of.
 *   2. On a handled error, publish a TERMINAL FAILURE. It carries a failed row, so the console
 *      reports `fail` rather than "nothing happened here".
 *   3. On success, the caller publishes the real result with the same attempt id attached, so
 *      the artifact records WHICH attempt produced it.
 *
 * WHAT THIS DOES NOT DO, NAMED RATHER THAN IMPLIED
 * An aborted `--update` attempt persists `mode: "update"`, which the reader classifies
 * `not_evidence` — the same state every `--update` artifact lands in, because an update run
 * never was a passing comparison. So an aborted update is not RED on the console; it is
 * not-green, with `attempt.state: "failed"` in the file. That is a real limitation of the
 * six-state vocabulary, not a claim that the case is handled, and it is recorded here so the
 * next reader does not have to rediscover it.
 *
 * ROUND 14 (Astra J02) — THE LIFECYCLE ABOVE ORDERS ATTEMPTS ONLY IF THEY RUN ONE AT A TIME.
 * `attemptId` was recorded but never consulted, so publication was unconditional and the
 * supersession held only for serial runs. Astra produced both schedules with controlled
 * promises, and both are real:
 *
 *     A starts → B starts → B fails → A finishes and publishes   => PASS from attempt A
 *     C starts → D starts → C finishes and publishes (D still running) => PASS from attempt C
 *
 * The fix is `publicationDefect`: a publish is REFUSED when the artifact already on disk was
 * started by a NEWER attempt. Because every attempt stamps `attempt.startedAt` at its start,
 * the file itself says which attempt is newest, and an older attempt can no longer overwrite it.
 *
 * THE LIMITATION, STATED RATHER THAN LEFT FOR A REVIEWER: this fences publication, it does not
 * LOCK it. Within one process the read-and-write in `publishIfNewest` cannot interleave — there
 * is no `await` between them — but two separate PROCESSES whose read/write windows overlap can
 * still land in the wrong order. Closing that needs OS-level locking, which this subsystem does
 * not have and which would introduce a stale-lock failure mode worse than the race. Recorded so
 * the next reviewer does not have to rediscover it, and so the claim here is not overstated.
 *
 * BOUNDS: pure except for the `write` callback it is handed, and the `read` callback it uses to
 * fence. No browser, no argv, no clock of its own — `now` is injected so the two instants an
 * attempt has are both testable.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/** The closed set of attempt states. `in-progress` is never evidence; see the header. */
export const ATTEMPT_STATES = Object.freeze(['in-progress', 'complete', 'failed']);

/**
 * The `attempt` field, shaped in ONE place.
 *
 * All three artifacts this lifecycle publishes — start, failure, and the caller's completed
 * result — carry this field, so a reader can tell which attempt produced the file it is
 * looking at. Defining it here rather than inline at three call sites is what stops the three
 * from drifting into three slightly different records that no single check can reason about.
 *
 * `startedAt` IS NORMALISED TO AN ISO STRING, AND THAT IS LOAD-BEARING (round 14, found by
 * `renderFence.test.mjs` while testing the J02 fence).
 *
 * `runAttempt` takes `now()` as an injected CLOCK returning a Date, and `buildAttemptStart`
 * converts it with `.toISOString()`. But `buildAttemptFailure` and `shot-diff.mjs` both pass
 * `attempt.startedAt` straight through — a Date. On disk that was harmless, because
 * `JSON.stringify` turns it into a string; in memory it was not. `publicationDefect` compares
 * the artifact on disk (a string, having been round-tripped) with the document about to be
 * written (a Date), found two different types, and declined to fence — so the J02 fix would
 * have been INERT in production while every test that used the serialised artifact passed.
 *
 * One record, one representation. A Date becomes its ISO string; anything else is passed
 * through, and a value that is neither is left for `publicationDefect` to ignore.
 */
export function attemptRecord({ attemptId, startedAt, state = 'complete', detail = null }) {
  return {
    id: attemptId,
    startedAt: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
    state,
    ...(detail === null ? {} : { detail }),
  };
}

/**
 * The write half, in one place so the script and the suite cannot diverge on the format.
 *
 * Returns a `(file, doc) => void` callback. `shot-diff.mjs` passes it to `runAttempt`; the
 * regression suite passes it too, so the artifact the test reads back from disk is written by
 * the same code the gate uses — not by a stub that happens to produce similar JSON.
 */
export function fileWriter() {
  return (file, doc) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(doc, null, 2));
  };
}

/**
 * The read half, for the publication fence. Never throws: a missing or unparseable file is
 * "nothing is there", which is exactly the state in which publication must proceed.
 */
export function fileReader() {
  return (file) => {
    if (!existsSync(file)) return null;
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  };
}

/**
 * May `mine` be published over `existing`?
 *
 * Returns a message when it may NOT, or null. The rule is one comparison and it is monotonic:
 * every attempt stamps `attempt.startedAt` when it begins, so the artifact on disk already
 * records which attempt is the newest, and an attempt whose start is OLDER than the one on disk
 * has been superseded. See the header for the two schedules this closes (Astra round 14, J02).
 *
 * A file with no `attempt` field is published over without complaint: artifacts written before
 * round 14 carry no id, and refusing to replace one would break the gate rather than protect it.
 */
export function publicationDefect(existing, mine) {
  const previous = existing?.attempt?.startedAt;
  const current = mine?.attempt?.startedAt;
  if (typeof previous !== 'string' || typeof current !== 'string') return null;
  const at = Date.parse(previous);
  const now = Date.parse(current);
  if (!Number.isFinite(at) || !Number.isFinite(now)) return null;
  if (at <= now) return null;
  return `attempt ${JSON.stringify(existing.attempt.id)} started at ${previous}, which is NEWER `
    + `than this attempt (${JSON.stringify(mine.attempt.id)} at ${current}) — a superseded attempt `
    + 'must not overwrite the evidence of the attempt that superseded it';
}

/**
 * Publish `doc` only if it is not older than what is already at `resultPath`.
 *
 * Returns the refusal message, or null when the write happened (or was unnecessary). The read
 * and the write are adjacent with no `await` between them, so no other task in THIS process can
 * interleave. See the header for the cross-process limitation, which is named rather than
 * claimed away.
 */
export function publishIfNewest({ resultPath, doc, read = fileReader(), write }) {
  if (!resultPath) return null;
  const defect = publicationDefect(read(resultPath), doc);
  if (defect) return defect;
  write(resultPath, doc);
  return null;
}

/**
 * The artifact published the moment an attempt begins, before anything is measured.
 *
 * `summary` is all zeros and `variants` is empty, and neither matters: `mode: "in-progress"`
 * is not a recognised evidence mode, so the reader refuses the document before it ever looks
 * at a count. The zeros are there so the document has the same shape as every other artifact
 * at this path, which keeps a human reading the file from having to know two schemas.
 */
export function buildAttemptStart({ attemptId, now = new Date() } = {}) {
  const at = now.toISOString();
  return {
    gate: 'three-worlds-render',
    timestamp: at,
    mode: 'in-progress',
    attempt: attemptRecord({ attemptId, startedAt: at, state: 'in-progress' }),
    summary: { total: 0, passed: 0, failed: 0 },
    variants: [],
  };
}

/**
 * The artifact published when an attempt dies, so the console reports a failure rather than
 * the previous attempt's green.
 *
 * The failed row is what makes this RED: `summary.failed` is 1 and the row carries the reason,
 * and the two agree by construction, so `gateIdentity.mjs`'s reconciliation sees a coherent
 * document. `mode` is the mode the attempt WAS, not a mode invented for failure — see the
 * header's note on aborted `--update` runs.
 */
export function buildAttemptFailure({
  attemptId, startedAt, error, update = false, now = new Date(),
} = {}) {
  const detail = String(error && error.message ? error.message : error);
  return {
    gate: 'three-worlds-render',
    timestamp: now.toISOString(),
    mode: update ? 'update' : 'compare',
    attempt: attemptRecord({ attemptId, startedAt, state: 'failed', detail }),
    summary: { total: 1, passed: 0, failed: 1 },
    variants: [{ id: 'attempt-aborted', status: 'fail', detail: `the run did not complete: ${detail}` }],
  };
}

/**
 * Run one attempt under the lifecycle above.
 *
 * ORDER IS THE FIX, and it is the only thing this function has to get right:
 *
 *   publish(in-progress)  →  await run()  →  on error publish(failed)
 *
 * The start artifact is written BEFORE `run` is invoked. If it were written after — or in a
 * `finally` alongside the failure — the window in which a previous green is still the
 * console's answer would be the whole duration of the failing attempt, which is exactly the
 * window Astra found.
 *
 * ROUND 14 (Astra J02) — EVERY PUBLISH GOES THROUGH THE FENCE. The failure branch is the one
 * that matters most: an attempt that dies while a NEWER attempt is running must not publish its
 * own failure over that newer attempt's in-progress state, any more than an older success may
 * overwrite a newer failure. `superseded` carries the refusal so a caller can report it instead
 * of believing it published.
 *
 * ROUND 16 (Astra L03) — A REFUSED START RETURNS BEFORE `run()` IS INVOKED, AND REPORTS WHY.
 * The `try` block below used to be `return { ..., value: await run() }` and the fence's message
 * was carried in `superseded` with nothing branching on it. So a REFUSED in-progress publish —
 * the artifact on disk was started by a NEWER attempt — still called `run()`, which means the
 * browser work, the baseline comparison AND (in `--update`) the baseline writes all happened for
 * an attempt whose evidence had already been declared superseded. A correctly-refused write does
 * not undo a side effect that preceded it, which is Astra's K01 in one sentence; here it was a
 * whole measurement.
 *
 * The outcome is `'not-started'` rather than `'failed'` because the two are different facts and
 * a caller acts differently on them: a failed attempt MEASURED and failed, so the gate is red; a
 * not-started attempt measured NOTHING, so the gate's answer is whatever the newer attempt says.
 * Reporting it as `'failed'` would publish a failure artifact over the newer attempt's state —
 * the K01 defect one level up, and the exact confusion exit code 3 exists to prevent.
 *
 * Returns an outcome instead of throwing, so the exit-code decision stays in `main()` where
 * the process's contract lives, and so a test can assert the outcome and the file together.
 */
export async function runAttempt({
  resultPath = null, run, write, read = fileReader(), now = () => new Date(),
  attemptId = null, update = false,
} = {}) {
  const startedAt = now();
  const id = attemptId ?? `render-${startedAt.toISOString()}`;
  const publish = (doc) => publishIfNewest({ resultPath, doc, read, write });

  const atStart = publish(buildAttemptStart({ attemptId: id, now: startedAt }));
  if (atStart) {
    return {
      attemptId: id, startedAt, outcome: 'not-started', value: null, superseded: atStart, ran: false,
    };
  }

  try {
    return {
      attemptId: id, startedAt, outcome: 'complete', value: await run(), superseded: null, ran: true,
    };
  } catch (error) {
    const atFailure = publish(buildAttemptFailure({
      attemptId: id, startedAt, error, update, now: now(),
    }));
    return {
      attemptId: id, startedAt, outcome: 'failed', error, superseded: atFailure, ran: true,
    };
  }
}
