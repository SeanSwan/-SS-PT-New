/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-probe.worker.mjs
 * PURPOSE: Run the engine's BLOCKING `selfCheck()` off the bridge's event loop.
 * PART OF: Creator Brains Console (A1-10, Astra adjudication 2026-09-20)
 * ============================================================================
 *
 * WHY THIS THREAD EXISTS. `selfCheck()` → `runCaptured()` → `execFileSync`
 * (`ytdlp.mjs:184`), with a **60 s** timeout. MEASURED 2026-09-20 on this
 * machine: a cold `GET /api/status` took **1709 ms**, of which **1699 ms** was
 * the event loop being frozen — 99.4% of the request was the bridge unable to
 * answer anything else. The TTL cache bounds how OFTEN that happens and does
 * nothing about how LONG, which is exactly what A1-10 says: "caching reduces
 * blocking frequency, not blocking duration."
 *
 * A worker thread is the only way to keep the engine's own synchronous
 * implementation — which this console must not fork and must not modify, the
 * engine being additive-only — while giving the event loop back.
 *
 * THE PORT ARRIVES VIA `workerData`, transferred. The main thread holds the
 * other end and polls it with `receiveMessageOnPort`, which is synchronous and
 * does NOT block, so `healthReading` stays a synchronous function and the ~40
 * call sites that depend on that keep working.
 *
 * @module creator-brains-console/lib/health-probe.worker
 */

import { workerData } from 'node:worker_threads';
import { selfCheck } from '../../../scripts/creator-brains/lib/ytdlp.mjs';

const port = workerData.port;

port.on('message', (msg) => {
  if (!msg || msg.go !== true) return;

  let value;
  try {
    value = selfCheck();
  } catch (e) {
    // A throw must still produce a message. The main thread is waiting on this
    // port, and silence is indistinguishable from "the probe never ran" — which
    // is the failure mode that would turn a crash into an infinite "unknown".
    value = { ok: false, reason: `the probe threw: ${e.message}`, version: null };
  }
  port.postMessage({ value, atMs: Date.now() });
});
