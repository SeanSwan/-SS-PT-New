/**
 * attemptLock — one attempt at a time, across processes.
 * @module scripts/swan-brain-console/attemptLock
 *
 * WHY A FENCE WAS NOT ENOUGH (round 15, Astra K01), AND THE THREE SCHEDULES IT LEFT OPEN.
 * `renderAttempt.mjs`'s fence decides the order of two writes that have BOTH ALREADY HAPPENED,
 * from a clock. Equal timestamps, a cross-process stale read, and a baseline written before the
 * fence refused the result all survive it. The common cause: a timestamp records WHEN something
 * happened and does not establish WHO owns the resource. **The three schedules are written out in
 * full in the suite's header**, with the executed consequence of each, because that is where a
 * reader meets the defect.
 *
 * THE MECHANISM, AND WHY NOT A NAMED MUTEX. A Windows named mutex has no permanent stale-file
 * problem, and it is unreachable from here: creating one needs a native addon or a helper binary,
 * and this subsystem is zero-dependency by doctrine. So the lock is an exclusively-created FILE —
 * which DOES have a stale-lock failure mode — and this module attacks that failure mode rather
 * than inheriting it. The rules, each with the function that carries its reasoning:
 *
 *   - The lock records the holder's pid, label, start time and a per-acquisition TOKEN.
 *   - `ESRCH` means ABANDONED, and it is REPORTED rather than reclaimed (round 16, Astra L02).
 *   - A live holder past `staleMs` is SUSPECT, not reclaimed — stealing from a live process is
 *     how a lock turns back into a race, so the refusal names the file instead.
 *   - Any other probe failure is NOT death (round 16, Astra L04). Only `ESRCH` authorizes a
 *     reclamation; everything else is held.
 *   - ONE ACQUISITION, ONE TOKEN (round 16, Astra L07): the release compares tokens, not pids,
 *     and is idempotent, so a stale handle cannot delete the current acquisition.
 *   - ONE ATTEMPT, POSSIBLY SEVERAL LOCKS (round 16, Astra L01). The resource set comes from the
 *     RUN MODE — see `baselineLock.mjs` — rather than from a `??` fallback at the call site.
 *
 * THE RESIDUAL, NAMED RATHER THAN GLOSSED. Pid reuse can make a dead holder look alive, and a
 * holder that is alive but wedged blocks a second attempt until `staleMs` elapses. Both are
 * stated in the refusal text. A stale lock is a worse failure mode than the race ONLY if it is
 * silent, and this one is loud, bounded, and carries the path to delete.
 *
 * BUSY IS NOT FAILED. `acquireAttemptLock` distinguishes "another attempt holds the resource"
 * from "this attempt ran and died", because the caller must not publish a failure artifact for
 * a run that never started — that would overwrite the holder's own in-progress state, which is
 * the K01 defect one level up.
 *
 * BOUNDS: `node:fs` and `process.pid` only. No browser, no argv, no network, no clock of its
 * own (`now` and `sleep` are injected so the timeout path is testable without waiting).
 */
import {
  openSync, writeSync, closeSync, unlinkSync, mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';
/*
 * THE OBSERVATION HALF LIVES IN `lockState.mjs` (the tenth Rule 4 split in this subsystem): what
 * is on disk, and what the OS says about the pid that wrote it. Everything left in THIS file is a
 * decision about OWNERSHIP — who may create, reclaim or remove a lock — and every branch here can
 * steal another process's claim. Re-exported below so this module's public surface is unchanged.
 */
import {
  DEFAULT_STALE_MS, holderAgeMs, holderIsAlive, lockSize, probeHolder, readLock,
} from './lockState.mjs';

export {
  DEFAULT_STALE_MS, holderAgeMs, holderIsAlive, lockSize, probeHolder, readLock,
};

/** A token that identifies ONE acquisition. Held in the lock document and required to release. */
const newToken = () => `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const defaultSleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** The lock file for a protected resource. One resource, one path, computed one way. */
export function lockPathFor(resourcePath) {
  return `${resourcePath}.lock`;
}

/** One non-blocking acquisition attempt. `ok: false` carries WHY, because the caller branches. */
function tryAcquire({
  lockPath, label, now, staleMs,
}) {
  const token = newToken();
  let fd;
  try {
    // 'wx' is the atomic step: create-or-fail, with no window between a test and a create.
    fd = openSync(lockPath, 'wx');
  } catch (err) {
    if (!err || err.code !== 'EEXIST') {
      return { ok: false, kind: 'unwritable', detail: String(err && err.message) };
    }
    const holder = readLock(lockPath);
    if (!holder || holder.malformed) {
      /*
       * A lock we cannot parse is not a lock we can reason about. Refusing is the safe reading:
       * deleting it might delete a live holder's file, and ignoring it would let two attempts
       * run at once, which is the whole defect.
       */
      return { ok: false, kind: 'unreadable', holder: null };
    }
    /*
     * ROUND 16 (Astra L02) — AN ABANDONED LOCK IS REPORTED, NOT RECLAIMED. The reclaim used to be
     * `unlinkSync(lockPath)` guarded by `reclaims < 5`, which is the `guard-that-admits-the-
     * opposite` shape: the liveness decision and the delete were separate operations, so two
     * contenders waiting on the same abandoned lock both observe the dead pid, both conclude
     * "abandoned", and the SECOND unlink removes the FIRST reclaimer's freshly-taken lock — the
     * reclaimer deletes a live claim and becomes the race it exists to prevent. **The schedule is
     * executed in the suite's header.**
     *
     * The smallest safe repair is to stop deleting by pathname from an earlier observation. So the
     * condition is REPORTED, and `reclaimLock` below is the deliberate act. The cost is named
     * rather than glossed: an abandoned lock now blocks the gate until someone removes it. It is
     * loud (the refusal names the path and the pid), bounded, and cannot silently put two attempts
     * on one resource — the same trade the header already makes for a SUSPECT lock.
     */
    const probe = probeHolder(holder.pid);
    if (probe.verdict === 'dead') return { ok: false, kind: 'abandoned', holder, probe };
    if (probe.verdict === 'unknown') return { ok: false, kind: 'unprobeable', holder, probe };
    const age = holderAgeMs(holder, now());
    if (age !== null && age > staleMs) {
      return { ok: false, kind: 'suspect', holder, ageMs: age };
    }
    return { ok: false, kind: 'busy', holder };
  }

  const doc = {
    pid: process.pid, token, label, startedAt: new Date(now()).toISOString(),
  };
  writeSync(fd, JSON.stringify(doc));
  closeSync(fd);
  return { ok: true, holder: doc };
}

/**
 * Remove an ABANDONED lock, deliberately. The operator-facing half of Astra's L02 repair.
 *
 * Refuses unless the lock is unreadable, or its holder is provably gone (`ESRCH`). It re-reads and
 * re-probes immediately before the unlink, so it cannot act on an observation that has since
 * changed — but it is still a non-atomic operation, which is exactly why it is not called
 * automatically by `acquireAttemptLock`: the caller is asserting that contenders have stopped.
 */
export function reclaimLock(lockPath) {
  const holder = readLock(lockPath);
  if (!holder) return { ok: false, reason: `${lockPath} does not exist — nothing to reclaim` };
  if (!holder.malformed) {
    const probe = probeHolder(holder.pid);
    if (probe.verdict === 'alive') {
      return { ok: false, reason: `${lockPath} is held by LIVE pid ${holder.pid} — refusing to steal it` };
    }
    if (probe.verdict === 'unknown') {
      return {
        ok: false,
        reason: `${lockPath}: pid ${holder.pid} could not be probed (${probe.detail}) — refusing, because `
          + 'a lock we merely failed to probe may be live',
      };
    }
  }
  try {
    unlinkSync(lockPath);
    return { ok: true, holder };
  } catch (err) {
    return { ok: false, reason: `${lockPath} could not be removed: ${String(err && err.message)}` };
  }
}

/**
 * Release the lock ONLY if this acquisition still owns it.
 *
 * ROUND 16 (Astra L07) — THE HANDLE IS BOUND TO THE ACQUISITION, AND IT IS IDEMPOTENT. The old
 * release compared `holder.pid !== process.pid` and nothing else, so within ONE process two
 * acquisitions of the same path were indistinguishable. The failing sequence is ordinary, not
 * exotic: acquire #1 (token A), acquire #2 after #1 was abandoned (token B), then release #1's
 * stale handle — PIDs match, so it deletes acquisition #2's LIVE lock and every later attempt
 * walks in. Each acquisition now writes a unique `token`, and the release compares tokens.
 */
export function releaseLock(lockPath, token = null) {
  const holder = readLock(lockPath);
  if (!holder || holder.malformed) return false;
  if (holder.pid !== process.pid) return false;
  /*
   * A token-less call is the pre-round-16 signature. It is allowed ONLY for a lock this process
   * created without one — which no shipped path does, so in practice it is REFUSED. Conservative
   * in the right direction: the alternative lets an unbound handle delete a live claim.
   */
  if (token === null) {
    if (holder.token !== undefined) return false;
  } else if (holder.token !== token) {
    return false;
  }
  try {
    unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  }
}

/** The operator-facing refusal, naming the holder and the file to delete. */
function refusalText(last, lockPath, staleMs) {
  const who = last?.holder
    ? `held by pid ${last.holder.pid} (${JSON.stringify(last.holder.label ?? 'unknown')}) since ${JSON.stringify(last.holder.startedAt ?? 'unknown')}`
    : 'held by a lock that could not be read';
  const why = {
    unreadable: 'the lock file exists but is not a readable lock document, so it was not '
      + 'reclaimed — deleting a file another process may own is the race this lock prevents',
    abandoned: `the recorded holder (pid ${last?.holder?.pid}) is NOT RUNNING, so this lock is a leftover — `
      + 'but it was NOT removed automatically, because deleting by pathname from an earlier observation '
      + 'lets a second contender delete the first one\'s fresh lock. Remove the file once no other attempt '
      + 'is starting, or call `reclaimLock(path)`',
    unprobeable: `the recorded holder (pid ${last?.holder?.pid}) could not be probed `
      + `(${last?.probe?.detail ?? 'unknown error'}), which is NOT the same as being gone — refusing `
      + 'rather than reclaiming a lock that may be live',
    suspect: `the holder is still running but has held the lock for ${Math.round((last.ageMs ?? 0) / 1000)}s `
      + `(over the ${Math.round(staleMs / 1000)}s stale threshold), so it was NOT reclaimed — `
      + 'a live holder may be a hung browser, and stealing from a live process is a race',
    unwritable: `the lock could not be created: ${last.detail}`,
    busy: 'another attempt is running',
  }[last?.kind] ?? 'another attempt is running';
  return `${why} — ${who}. Lock file: ${lockPath}. This run did NOT start.`;
}

/**
 * Take the lock for one attempt, or refuse.
 *
 * Returns `{ ok: true, lockPath, holder, token, release }` or `{ ok: false, lockPath, reason }`.
 *
 * `timeoutMs` defaults to 0, which is a single non-blocking try. That default is deliberate:
 * a second CI attempt must not queue behind a browser run that may take fifteen minutes, and
 * "busy" is a legitimate answer the caller reports rather than waits out.
 *
 * ROUND 16 (Astra L02) — THE LOOP NO LONGER RECLAIMS. An abandoned or unprobeable lock is
 * reported and the call returns; see `tryAcquire` for why, and `reclaimLock` for the deliberate
 * act that replaces the automatic one.
 */
export async function acquireAttemptLock({
  resourcePath,
  label = 'attempt',
  timeoutMs = 0,
  pollMs = 100,
  staleMs = DEFAULT_STALE_MS,
  now = () => Date.now(),
  sleep = defaultSleep,
} = {}) {
  if (!resourcePath) return { ok: false, lockPath: null, reason: 'no resource path was supplied, so there is nothing to lock' };
  const lockPath = lockPathFor(resourcePath);
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
  } catch {
    // The openSync below reports the real failure with a better message.
  }

  const deadline = now() + timeoutMs;
  let attempts = 0;
  let last = null;
  for (;;) {
    attempts += 1;
    last = tryAcquire({
      lockPath, label, now, staleMs,
    });
    if (last.ok) {
      /*
       * IDEMPOTENT, AND BOUND TO THIS ACQUISITION (round 16, Astra L07). `released` is per-handle
       * state, so a second call is a no-op rather than a second unlink that could reach a
       * successor's file; `token` is per-acquisition, so a STALE handle from an earlier
       * acquisition of the same path cannot delete this one.
       */
      const token = last.holder.token;
      let released = false;
      return {
        ok: true,
        lockPath,
        holder: last.holder,
        token,
        release: () => {
          if (released) return false;
          const removed = releaseLock(lockPath, token);
          if (removed) released = true;
          return removed;
        },
      };
    }
    // A lock that exists but cannot be used is a terminal answer, not a retry: waiting would not
    // change an abandoned pid, an unprobeable one, or an unparseable file.
    if (last.kind === 'abandoned' || last.kind === 'unprobeable' || last.kind === 'unreadable') break;
    if (now() >= deadline) break;
    await sleep(pollMs);
  }
  return {
    ok: false, lockPath, reason: refusalText(last, lockPath, staleMs), holder: last?.holder ?? null, attempts,
  };
}
