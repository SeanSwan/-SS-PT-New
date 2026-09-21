/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/creator-add.worker.mjs
 * PURPOSE: Run the engine's BLOCKING add-creator resolution OFF the bridge's
 *          event loop (S1-H12).
 * PART OF: Creator Brains Console (S1-H12; unblocks slice S2)
 * ============================================================================
 *
 * WHY THIS THREAD EXISTS. `POST /api/creators` resolves a ref to a channel id
 * through the engine, and the engine's resolution path is SYNCHRONOUS:
 * `lib/registry.mjs:112` calls the resolver without awaiting, and the default
 * resolver runs `execFileSync` via `runCaptured` (`lib/ytdlp.mjs:184`). The
 * engine's own timeout ceiling is 180 s.
 *
 * MEASURED 2026-09-20 on the S1 build (16-s1-hostile-review.md, S1-H12), with a
 * 10 ms tick counter against an idle baseline of ~64 ticks/s:
 *
 *     POST /api/creators {ref:"UCaaa…"} -> 422 in 1577 ms, loop ticks: 0
 *
 * ZERO ticks in 1.6 s. During the freeze the bridge answers nothing — not
 * `/api/status`, not the static page — so a status poll queued behind an add is
 * delayed by the WHOLE add, and the S1 `useStatus` watchdog (15 s, S1-H4) then
 * reports `TRANSPORT` for a poll that was merely queued. The operator reads that
 * as "the console is broken". That is why this is the S2 gate rather than a
 * known cost: the Roster's add button cannot ship on top of it.
 *
 * ── WHY A WORKER RATHER THAN AN ENGINE PATCH ────────────────────────────────
 *
 * The engine is ADDITIVE-ONLY; `addCreator` must keep its current synchronous
 * resolver for CLI callers who rely on it. A worker thread is the only way to
 * keep the engine's implementation untouched while giving the event loop back.
 * This is the pattern A1-10 already established for `selfCheck()` in
 * `health-probe.worker.mjs`, and the reasoning there applies verbatim.
 *
 * ── WHAT THIS WORKER IS GIVEN, AND WHAT IT IS NOT ───────────────────────────
 *
 * The worker receives a REF and a STORE ROOT, and calls `addCreator` itself. It
 * does NOT receive `deps`, so it always uses the engine's real resolver. That is
 * deliberate: the `deps` seam exists so the TEST SUITE can inject a resolver, and
 * a worker that honoured an injected `deps` would let a caller supply arbitrary
 * code to execute on a thread — a seam that is harmless in-process becomes an
 * execution path once it crosses a thread boundary with serialised payloads.
 * The main thread therefore uses this worker ONLY when no `deps` is supplied, and
 * falls back to in-process `addCreator` when one is (a test seam, where blocking
 * is not a concern because the injected resolver does not shell out).
 *
 * @module creator-brains-console/lib/creator-add.worker
 */

import { workerData } from 'node:worker_threads';
import { addCreator } from '../../../scripts/creator-brains/lib/registry.mjs';

const port = workerData.port;

port.on('message', async (msg) => {
  if (!msg || msg.go !== true) return;

  // A STRUCTURED RESULT, NEVER A THROW (the same discipline the engine's own
  // `addCreator` uses). The main thread is awaiting this message; a throw here
  // would arrive as a worker 'error' event and lose the reason string that the
  // console is supposed to surface verbatim as its 422.
  let value;
  try {
    value = await addCreator({ ref: msg.ref, r: msg.r });
  } catch (e) {
    value = { ok: false, reason: `the resolver threw: ${e.message}` };
  }

  // THE EPOCH COMES BACK, for the same reason health-probe.worker.mjs echoes it
  // (R2-04): the main thread must be able to tell a result belonging to the call
  // it is still waiting for from one produced by a channel it has retired.
  port.postMessage({ value, atMs: Date.now(), epoch: msg.epoch });
});
