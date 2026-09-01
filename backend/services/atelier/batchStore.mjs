/**
 * batchStore.mjs — the in-process record of a local still batch in flight.
 * ============================================================================
 *
 * A 4-up on a 27s/frame model is ~2 minutes of GPU. Holding one HTTP request
 * open for that long is the defect every seat of the ladder panel named: a
 * proxy or browser cuts the socket at 30–100s, the GPU keeps rendering for a
 * client that is gone, and the retry contends with single-flight for a batch
 * nobody is listening to. So the local lane answers `202 {batchId}` at once and
 * renders in the background; the client polls this store.
 *
 * WHAT IS IN HERE AND WHAT IS NOT. A batch is owner-scoped, holds the stills as
 * they land (each one already persisted, so a poll sees an asset id, not a
 * promise), the failures with codes, and a terminal state. It is PROCESS-LOCAL
 * on purpose: one backend process is today's deployment shape, and a batch that
 * dies with the process is reported as such by its absence — the client gets a
 * 404 and a clear line, not a phantom "still running". A durable store is a
 * later slice, and this file's contract does not change when it arrives.
 *
 * Entries expire an hour after they finish so the map cannot grow without bound.
 */

import { randomUUID } from 'node:crypto';
import { ComposeError } from './composeLimits.mjs';

export const BATCH_TTL_MS = 60 * 60 * 1000;
export const BATCH_STATES = Object.freeze(['queued', 'running', 'done', 'partial', 'failed']);

const batches = new Map();

/** Test hook. */
export function _resetBatches() { batches.clear(); }

export function createBatch({ userId, lane, count, key, promptSource, model }) {
  const id = randomUUID();
  const b = {
    id, userId, lane, count, key, promptSource, model,
    status: 'queued', stills: [], failures: [], persistence: null,
    startedAt: Date.now(), finishedAt: null, error: null,
  };
  batches.set(id, b);
  return b;
}

/** Owner-scoped read. A batch that belongs to someone else is indistinguishable from none. */
export function getBatch(id, userId) {
  prune();
  const b = batches.get(String(id || ''));
  if (!b || b.userId !== userId) return null;
  return snapshot(b);
}

export function markRunning(b) { b.status = 'running'; }

/** Taste metadata — the seed, how many prompts the laws rejected, which profile judged.
 *  The synchronous result has carried it since the taste slice; the batch did not, and
 *  taste is LOCAL-ONLY, so the only lane it actually runs on was the one that never
 *  reported it. */
export function setTasteMeta(b, meta) { b.tasteMeta = meta; }

/** One still landed (already persisted). The poll sees it on the next read. */
export function pushStill(b, still) { b.stills.push(still); }
export function pushFailure(b, failure) { b.failures.push(failure); }

export function finishBatch(b, { persistence = null, error = null } = {}) {
  b.persistence = persistence;
  b.finishedAt = Date.now();
  if (error) { b.status = 'failed'; b.error = { code: error.code || 'E_BATCH_FAILED', message: error.message || String(error) }; return b; }
  b.status = b.stills.length === 0 ? 'failed' : b.failures.length ? 'partial' : 'done';
  if (b.stills.length === 0 && !b.error) b.error = { code: 'E_ALL_FAILED', message: `All ${b.count} images failed.` };
  return b;
}

export function snapshot(b) {
  return {
    batchId: b.id, lane: b.lane, status: b.status, count: b.count, promptSource: b.promptSource, model: b.model,
    stills: b.stills, failures: b.failures, persistence: b.persistence,
    rendered: b.stills.length + b.failures.length, error: b.error,
    startedAt: b.startedAt, finishedAt: b.finishedAt,
    ...(b.tasteMeta ? { tasteMeta: b.tasteMeta } : {}),
    terminal: b.status === 'done' || b.status === 'partial' || b.status === 'failed',
  };
}

/**
 * Drop finished batches older than the TTL. Running batches are never pruned.
 *
 * RETURNS THE KEYS IT DROPPED. The idempotency store retains a client-keyed stub pointing
 * at a batch by `statusUrl`, and those were two independent clocks: the row expired after
 * an hour, the stub lived until it was evicted for room. In between, a retry got a stub
 * saying "here is your batch" and a URL that 404s — forever, since the stub outlives every
 * retry. Both panel seats found that window independently. Handing the keys back makes the
 * caller able to expire the stub on the same clock as the row it describes.
 *
 * Each entry is `{ key, id }`, not a bare key: keys are deterministic and reusable, so the
 * caller must be able to check that the stub it is about to drop actually describes THIS
 * row rather than a live claim that reused the name.
 */
export function prune(now = Date.now()) {
  const dropped = [];
  for (const [id, b] of batches) {
    if (b.finishedAt && now - b.finishedAt > BATCH_TTL_MS) { batches.delete(id); if (b.key) dropped.push({ key: b.key, id }); }
  }
  return dropped;
}

/** A real UUID, not any 36 hex-ish characters. A malformed id is a bad REQUEST (400). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assertBatchId(id) {
  if (!UUID.test(String(id || ''))) throw new ComposeError('E_BAD_BATCH_ID', 'That is not a batch id.');
}
