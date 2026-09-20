/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-probe.mjs
 * PURPOSE: The main-thread end of the off-loop yt-dlp probe (A1-10).
 * PART OF: Creator Brains Console (A1-10, Astra adjudication 2026-09-20)
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
 * @module creator-brains-console/lib/health-probe
 */

import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';

/** The main-thread port, or `null` before the first probe is requested. */
let port = null;

/** Is a probe already running? One in flight at a time, per read of the TTL. */
let inFlight = false;

function ensurePort() {
  if (port) return port;
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL('./health-probe.worker.mjs', import.meta.url), {
    workerData: { port: port2 },
    transferList: [port2],
  });
  worker.unref();
  port1.unref();
  port = port1;
  return port;
}

/**
 * Ask for a probe. Returns `true` if one was started, `false` if one is already
 * running — the caller reports the difference honestly rather than pretending a
 * second probe would help.
 */
export function requestProbe() {
  const p = ensurePort();
  if (inFlight) return false;
  inFlight = true;
  p.postMessage({ go: true });
  return true;
}

/**
 * Collect a completed probe, or `null` when none has arrived.
 *
 * `receiveMessageOnPort` is the whole reason this design works: it is
 * SYNCHRONOUS and NON-BLOCKING, so `healthReading` can stay synchronous while
 * the subprocess runs on another thread.
 */
export function takeProbe() {
  const p = ensurePort();
  const msg = receiveMessageOnPort(p);
  if (!msg) return null;
  inFlight = false;
  return msg.message;
}

/** Test seam: forget the worker so a fresh one is created on the next request. */
export function resetProbeChannel() {
  inFlight = false;
}
