/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-probe.mjs
 * PURPOSE: The main-thread end of the off-loop yt-dlp probe (A1-10, R2-04).
 * PART OF: Creator Brains Console (A1-10; R2-04 worker failure lifecycle)
 * ============================================================================
 *
 * TWO FUNCTIONS, AND THE ASYMMETRY IS THE POINT.
 *
 *   requestProbe()  asks the worker to run `selfCheck()`. Returns immediately.
 *   takeProbe()     collects a FINISHED result, or `null`. Never waits.
 *
 * There is deliberately no "run it and wait" function. Waiting is what the
 * bridge must never do, and a helper that offered it would be used.
 *
 * THE WORKER IS LAZY AND UNREF'D. Lazily, because every unit test injects its
 * own `probe` and must not pay for a subprocess it never uses. Unref'd, because
 * a health probe is never a reason for the bridge to stay alive — without that,
 * `node --test` would hang waiting for a worker whose only job is to answer a
 * question nobody is asking any more.
 *
 * ── R2-04: THE WORKER NOW HAS AN OWNED FAILURE LIFECYCLE ────────────────────
 *
 * The first version created a worker and then stopped thinking about it. Astra
 * round 2 named the consequences, and each is a way for the health probe to take
 * down — or silently misreport — the very process whose health it reports:
 *
 *   OWNERSHIP      the `Worker` and its port live in one `channel` record, which
 *                  is what makes closure possible at all.
 *   ERROR / EXIT   with no `'error'` handler, a worker that cannot START emits
 *   / WATCHDOG     an unhandled `'error'` event and Node treats that as an
 *                  uncaught exception: THE BRIDGE DIES. `'exit'` covers a worker
 *                  that dies mid-probe; the deadline covers one that neither
 *                  answers nor dies. ALL THREE BECOME A READING.
 *   EPOCH TAGGING  messages carry the epoch of the channel that produced them,
 *                  and a result from a retired epoch is DISCARDED rather than
 *                  adopted as a fresh reading.
 *   CLOSURE        `resetProbeChannel()` terminates the worker and closes the
 *                  port. A thread nobody is awaiting should not exist.
 *
 * `test/health.lifecycle.test.mjs` CONSTRUCTS each failure — a worker that throws
 * at load, one that exits, one that stays silent — rather than asserting that the
 * handlers exist, because a structural pin is not a behavioural proof.
 *
 * @module creator-brains-console/lib/health-probe
 */

import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';

/**
 * How long a started probe may stay silent before it is declared failed.
 *
 * Deliberately below the engine's own 60 s `execFileSync` timeout: the engine's
 * timeout covers the SUBPROCESS, this one covers the WORKER. A worker wedged
 * before it ever spawns anything would otherwise be awaited forever.
 */
export const PROBE_TIMEOUT_MS = 45_000;

/** The live channel: the worker, the main-thread port, and the epoch owning both. */
let channel = null;

/** Is a probe already running? One in flight at a time, per read of the TTL. */
let inFlight = false;

/** When the in-flight probe stops being believable. */
let deadlineMs = 0;

/** The current epoch. Bumped whenever a channel is retired. */
let epoch = 0;

/** A failure waiting to be taken as a reading, or `null`. */
let failure = null;

/**
 * A result drained from the port but not yet handed to a caller.
 *
 * It exists for one race: a worker may post its answer and THEN exit. The answer
 * is already in the port buffer when `'exit'` runs, so declaring "exited before
 * answering" would discard a good result in favour of a worse one.
 */
let result = null;

/** The worker script. Injectable so a FAILING worker can be constructed (R2-04). */
let workerUrl = new URL('./health-probe.worker.mjs', import.meta.url);

/** The reading a failed worker produces — a verdict, never a thrown error. */
function failureReading(reason, now) {
  return { value: { ok: false, version: null, reason, workerFailed: true }, atMs: now };
}

/**
 * Drain the port, discarding obsolete epochs. Returns a current result or `null`.
 * The loop is the point: one `receiveMessageOnPort` call would leave a stale
 * message in front of a live one and starve the live result for another read.
 */
function drain(ch) {
  for (;;) {
    let msg;
    try { msg = receiveMessageOnPort(ch.port); } catch { return null; }
    if (!msg) return null;
    const m = msg.message;
    if (m && m.epoch === ch.epoch) return m;
    // An obsolete epoch: removed from the port and thrown away.
  }
}

/**
 * Terminate a channel and close its port. Idempotent, and it bumps the epoch.
 *
 * The bump is the version tag R2-04 asks for: anything the retired worker had
 * queued, or is about to emit, belongs to an epoch that is no longer current and
 * is therefore discarded rather than adopted.
 */
function retire(ch) {
  if (!ch) return;
  ch.closing = true;
  epoch += 1;
  try { ch.port.close(); } catch { /* already closed */ }
  try { ch.worker.terminate(); } catch { /* already gone */ }
  if (channel === ch) channel = null;
}

/**
 * Record a worker failure as the next reading, and retire the channel.
 *
 * A FAILURE FROM A STALE EPOCH IS DISCARDED. After a reset, the old worker's
 * death is not news about the current probe, and adopting it would attribute a
 * previous caller's crash to the store being read now.
 */
function recordFailure(ch, reason, now = Date.now()) {
  if (ch.closing || ch.epoch !== epoch) return;
  // A DEATH WE ARE NOT WAITING ON IS NOT NEWS. With no probe in flight the
  // result has either been collected already or was never asked for, so retiring
  // the channel is enough. Recording a failure here would report a healthy
  // answer as a crash — which is the mirror image of the defect being fixed.
  if (inFlight) {
    failure = failureReading(reason, now);
    inFlight = false;
    deadlineMs = 0;
  }
  retire(ch);
}

function ensureChannel() {
  if (channel) return channel;
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(workerUrl, {
    workerData: { port: port2 },
    transferList: [port2],
  });
  const ch = { worker, port: port1, epoch, closing: false };
  // THE HANDLERS ARE NOT DEFENSIVE PADDING (R2-04) — see the header. Without the
  // first, a worker that cannot start is an uncaught exception in the bridge.
  worker.on('error', (err) => recordFailure(
    ch,
    `the yt-dlp probe worker failed: ${err && err.message ? err.message : err}`,
  ));
  worker.on('messageerror', () => recordFailure(
    ch, 'the yt-dlp probe worker sent a message that could not be deserialised',
  ));
  worker.on('exit', (code) => {
    // DRAIN BEFORE DECLARING FAILURE. A worker may post its answer and then exit;
    // that answer is already in the port buffer, and announcing "exited before
    // answering" would discard a good result in favour of a worse one.
    const queued = ch.closing ? null : drain(ch);
    if (queued) {
      result = queued;
      inFlight = false;
      deadlineMs = 0;
      retire(ch);
      return;
    }
    recordFailure(ch, `the yt-dlp probe worker exited before answering (code ${code})`);
  });
  worker.unref();
  port1.unref();
  channel = ch;
  return ch;
}

/**
 * Ask for a probe. Returns `true` if one was started, `false` if one is already
 * running — the caller reports the difference honestly rather than pretending a
 * second probe would help.
 *
 * A WORKER THAT CANNOT EVEN BE CONSTRUCTED IS A READING, NOT A THROW (R2-04).
 * The failure is recorded for `takeProbe` to hand back through the same path a
 * real probe result travels, so the caller has one code path rather than two.
 */
export function requestProbe() {
  if (inFlight) return false;
  let ch;
  try {
    ch = ensureChannel();
  } catch (err) {
    failure = failureReading(
      `the yt-dlp probe worker could not be started: ${err && err.message ? err.message : err}`,
      Date.now(),
    );
    inFlight = false;
    return false;
  }
  inFlight = true;
  deadlineMs = Date.now() + PROBE_TIMEOUT_MS;
  ch.port.postMessage({ go: true, epoch: ch.epoch });
  return true;
}

/**
 * Collect a completed probe, or `null` when none has arrived.
 *
 * `receiveMessageOnPort` is the whole reason this design works: it is
 * SYNCHRONOUS and NON-BLOCKING, so `healthReading` can stay synchronous while
 * the subprocess runs on another thread. Obsolete-epoch messages are discarded by
 * `drain` rather than adopted (R2-04).
 */
export function takeProbe(now = Date.now()) {
  // AN ANSWER BEATS A DEATH. A result drained by the `'exit'` handler is a real
  // verdict and is handed over before any recorded failure.
  if (result) {
    const r = result;
    result = null;
    return r;
  }
  // A RECORDED WORKER FAILURE IS A RESULT. It travels the same channel as a
  // probe so the caller never has to know which one it is holding.
  if (failure) {
    const f = failure;
    failure = null;
    return { value: f.value, atMs: f.atMs, epoch };
  }

  let ch;
  try {
    ch = ensureChannel();
  } catch (err) {
    inFlight = false;
    deadlineMs = 0;
    return failureReading(
      `the yt-dlp probe worker could not be started: ${err && err.message ? err.message : err}`,
      now,
    );
  }

  const m = drain(ch);
  if (m) {
    inFlight = false;
    deadlineMs = 0;
    return m;
  }

  // THE WATCHDOG. A probe that has neither answered nor died is still a fact the
  // console must report, and silence is the one outcome the port cannot express.
  if (inFlight && now >= deadlineMs) {
    inFlight = false;
    deadlineMs = 0;
    const reading = failureReading(
      `the yt-dlp probe did not answer within ${PROBE_TIMEOUT_MS} ms`, now,
    );
    retire(ch);
    return reading;
  }
  return null;
}

/**
 * Test seam and shutdown path: forget the worker so a fresh one is created on
 * the next request.
 *
 * IT NOW ACTUALLY CLOSES THINGS (R2-04). Clearing the Boolean alone left the
 * thread running and the port open, so the seam's promise — no inherited probe —
 * was false for the thread even while it was true for the flag.
 */
export function resetProbeChannel() {
  inFlight = false;
  failure = null;
  result = null;
  deadlineMs = 0;
  const ch = channel;
  channel = null;
  retire(ch);
}

/**
 * Test seam: point the probe at a different worker script. `null` restores the
 * real one.
 *
 * WHY THIS SEAM EXISTS AT ALL (R2-04). The property "a worker that cannot start
 * becomes a reading" lives entirely in the `'error'` and `'exit'` handlers, and
 * the real worker starts perfectly — so no test can reach that code through it.
 * Without a way to CONSTRUCT the failure, a test could only assert that the
 * handler is present, which is a structural pin rather than a behavioural proof.
 * Supplying a worker that throws at load, or exits immediately, is what makes the
 * behaviour observable; see `test/health.lifecycle.test.mjs`.
 */
export function setProbeWorkerForTest(url) {
  resetProbeChannel();
  workerUrl = url ? new URL(url) : new URL('./health-probe.worker.mjs', import.meta.url);
}
