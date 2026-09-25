#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/lock.mjs
 * PURPOSE: One cross-process ownership protocol for the whole store.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair, HR14)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS EXISTS (reproduced defect HR14):
 *   `writeTextAtomic` renames a temp file over the target, which makes a single
 *   write crash-safe — and does nothing at all about TWO writers. The review
 *   reproduced both halves:
 *     - two runs on one store fetched the same video twice (budget and state
 *       both read before either wrote);
 *     - a second writer's newly added video disappeared when the first run saved
 *       its stale in-memory map over it (lost update).
 *   Every write in the old engine also used the SAME `<path>.tmp` name, so two
 *   processes could interleave on one temp file.
 *
 * THE PROTOCOL:
 *   1. Exclusive create of `<store>/.lock` with `wx`. That is the atomic test —
 *      not `existsSync` then write, which is a race.
 *   2. The lock body carries an owner token, pid, host and start time.
 *   3. A held lock is NEVER stolen on age alone. Reclaim requires positive
 *      evidence the owner is gone: same host AND the pid is not alive. An
 *      ambiguous owner (different host, or a pid we cannot probe) is reported
 *      as `ambiguous` and the caller must decide — the default is to refuse.
 *   4. RECLAIM IS BOUND TO THE HOLDER THAT WAS READ (E3, 2026-09-22). Removing a
 *      dead owner's lock is guarded by an EXCLUSIVE CREATE at a name derived from
 *      the token that was OBSERVED, so only one process can be mid-reclaim for a
 *      given dead holder. The lock is never MOVED: it leaves its path only through
 *      a guarded `unlink`, so no window exists in which the path is ABSENT for a
 *      third writer, and a reclaimer that finds a LIVE lock where it expected the
 *      dead one FAILS CLOSED rather than destroying it. Two earlier schemes acted
 *      on a STALE observation (`unlink` after a read, then `rename` to a corpse);
 *      `test/lock-reclaim-ordering.test.mjs` + ENGINE-HANDOFF §E3 carry the account.
 *   5. Unique temp names (`<path>.<pid>.<rand>.tmp`) so two writers that do
 *      somehow overlap cannot corrupt one temp file.
 *
 * @module creator-brains/lock
 */

import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { ensureDir, retryTransientSync } from './paths.mjs';
import { releaseStore } from './lock-release.mjs';

export const LOCK_NAME = '.lock';

/** Locks older than this are only reclaimed with positive liveness evidence —
 *  never by age alone. Kept as a reporting threshold, not a steal timer. */
export const STALE_REPORT_MS = 6 * 3_600_000;

export class LockError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'LockError';
    this.detail = detail;
  }
}

export const lockPath = (r) => join(r, LOCK_NAME);

function readLock(r) {
  try {
    const raw = readFileSync(lockPath(r), 'utf-8');
    const doc = JSON.parse(raw);
    // A lock file we cannot parse is NOT assumed absent — it is ambiguous, and
    // stealing it is how two writers end up on one store.
    if (!doc || typeof doc !== 'object' || !doc.token) return { ambiguous: true, raw };
    return doc;
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    return { ambiguous: true, error: e.message };
  }
}

/** Is a pid alive on THIS host? `EPERM` means alive-but-not-ours. */
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e && e.code === 'EPERM') return true;
    return false;
  }
}

/** Read a claim's body: `null` when absent, `{ambiguous:true}` when unreadable. */
function readClaim(p) {
  try {
    const doc = JSON.parse(readFileSync(p, 'utf-8'));
    if (!doc || typeof doc !== 'object' || !Number.isInteger(doc.pid)) return { ambiguous: true };
    return doc;
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    return { ambiguous: true };
  }
}

/**
 * Take the EXCLUSIVE reclaim claim for ONE dead token; return its fd (the caller
 * closes it) or `null` when a LIVE reclaimer already owns it. The NAME is derived
 * from the OBSERVED token, so exclusivity is per dead holder — the mechanism
 * Astra R1 required, covering the observation, the removal AND `attempt()`.
 */
function takeReclaimClaim(claimPath, observedToken) {
  for (let round = 0; round < 3; round += 1) {
    try {
      // The exclusive CREATE is the gate. Transient contention (E1 class) is
      // retried via the SHARED policy; `EEXIST` is not, so a taken claim lands here.
      const fd = retryTransientSync(() => openSync(claimPath, 'wx'));
      try {
        writeSync(fd, JSON.stringify({ token: observedToken, pid: process.pid, host: hostname(), at: new Date().toISOString() }));
      } catch { /* the body is ADVISORY — the CREATE is the gate */ }
      return fd;
    } catch (e) {
      if (!e || e.code !== 'EEXIST') {
        // NOT a race, and not relabelled as one: the old bare `catch` mapped every
        // error, including a transient E1-class EPERM, to `lock_raced` (Astra R1).
        throw new LockError(`could not claim a dead lock for reclaim: ${e && e.message}`, { code: e && e.code, claimPath });
      }
      // A claim exists. Break it ONLY on positive evidence its owner is gone —
      // otherwise a reclaimer killed mid-reclaim blocks this token FOREVER (the E4
      // stranding class, one level up). Safe because the CREATE stays the gate.
      const owner = readClaim(claimPath);
      if (owner && !owner.ambiguous && pidAlive(owner.pid)) return null; // live reclaimer at work
      try { unlinkSync(claimPath); } catch { /* another reclaimer broke it first */ }
    }
  }
  return null;
}

/**
 * Try to take the lock.
 * Returns `{ ok: true, token, release() }` or `{ ok: false, reason, holder }`.
 * Never throws for a held lock — that is a normal outcome for a second writer.
 */
export function acquireLock(r, { runId = null, now = () => Date.now() } = {}) {
  ensureDir(r);
  const token = randomUUID();
  const body = JSON.stringify({
    token, pid: process.pid, host: hostname(), runId, startedAt: new Date(now()).toISOString(),
  });

  const attempt = () => {
    const fd = openSync(lockPath(r), 'wx'); // atomic: fails if it exists
    try {
      writeSync(fd, body);
    } finally {
      closeSync(fd);
    }
  };

  try {
    attempt();
  } catch (e) {
    if (!e || e.code !== 'EEXIST') throw new LockError(`could not create lock: ${e && e.message}`, { code: e && e.code });
    const holder = readLock(r);

    if (holder && holder.ambiguous) {
      return { ok: false, reason: 'lock_ambiguous', holder: { unreadable: true } };
    }
    if (!holder) {
      // It vanished between EEXIST and read — a completed release. One retry.
      try { attempt(); } catch { return { ok: false, reason: 'lock_raced', holder: null }; }
    } else {
      const sameHost = holder.host === hostname();
      const alive = sameHost && pidAlive(holder.pid);
      if (alive) return { ok: false, reason: 'lock_held', holder };
      if (!sameHost) {
        // We cannot probe another host's pid. Do NOT steal on age.
        return { ok: false, reason: 'lock_other_host', holder };
      }
      // Same host, pid provably gone => the owner died without releasing.
      //
      // ⚠️ THE RECLAIM MUST BE BOUND TO THE HOLDER THAT WAS READ (E3, 2026-09-22).
      //
      //   Two earlier schemes failed here, both by acting on a STALE observation:
      //   `readLock` → `unlinkSync` (two reclaimers can both delete), then
      //   `renameSync` to a private corpse. The rename's "exactly one winner,
      //   because it fails ENOENT for everyone else" only holds while the path
      //   stays ABSENT — and the WINNER recreates it, so the loser's rename lands
      //   on the winner's LIVE lock and succeeds. A rename is atomic for one
      //   pathname transition; it is not bound to the holder that was READ. That
      //   is a TOCTOU on the OBSERVATION. Retrying it is not a fix (Astra R1).
      //
      //   The exclusion covering all three steps (observe → remove → attempt) is an
      //   EXCLUSIVE CREATE at a name derived from the observed token. Nothing MOVES:
      //   the lock leaves its path only through the guarded `unlink` below.
      const claimPath = `${lockPath(r)}.reclaim.${holder.token}`;
      const claimFd = takeReclaimClaim(claimPath, holder.token);
      if (claimFd === null) {
        // A LIVE reclaimer owns this dead token. Do NOT act on the stale read.
        return { ok: false, reason: 'lock_raced', holder: readLock(r) };
      }
      closeSync(claimFd);
      try {
        // While the path holds THIS token and its owner is gone, only this
        // claim-holder can remove it, so this re-read and the `unlink` below
        // cannot be split by another reclaimer — the gap the rename left open.
        const still = readLock(r);
        if (!still || still.ambiguous || still.token !== holder.token) {
          // Not the holder we observed: a LIVE lock is there. Fail closed — we never moved anything.
          return { ok: false, reason: 'lock_raced', holder: still };
        }
        try {
          unlinkSync(lockPath(r));
        } catch (e) {
          // ENOENT: already gone — treat as done. Anything else is NOT a race.
          if (!e || e.code !== 'ENOENT') throw e;
        }
        try { attempt(); } catch { return { ok: false, reason: 'lock_raced', holder: readLock(r) }; }
      } finally {
        // A leaked claim is breakable by pid, so this is tidiness, not safety.
        try { unlinkSync(claimPath); } catch { /* leaked claim is breakable by pid */ }
      }
    }
  }

  let released = false;
  return {
    ok: true,
    token,
    holder: { pid: process.pid, host: hostname(), runId },
    release() {
      if (released) return false;
      // Only remove OUR lock, and only when the path is PROVABLY ours: a reclaim
      // writes a new body (deleting that hands the store to a third writer), and an
      // UNREADABLE lock is `ambiguous` — never assumed absent. Both latch `released`:
      // this handle no longer owns anything, and must not act on a path it does not own.
      const cur = readLock(r);
      if (!cur || cur.ambiguous || cur.token !== token) {
        released = true;
        return false;
      }
      // A TRANSIENT unlink failure (Windows: a concurrent readLock holding the file
      // open) would strand a live-looking lock under THIS pid. Same E1 class as the
      // rename publish: retry the transient codes through the shared policy, then
      // report honestly (false = the lock is still there).
      //
      // E4 (2026-09-22): `released` is latched ONLY once the deletion SUCCEEDED. It
      // used to be set before the attempt, so an exhausted ~92 ms budget left it
      // permanently true — the handle could never release the lock it still owned,
      // which is the exact stranding the paragraph above was written to prevent.
      // Staying unlatched keeps the release RETRYABLE through this same handle.
      try {
        const done = retryTransientSync(() => { unlinkSync(lockPath(r)); return true; });
        released = true;
        return done;
      } catch { return false; }
    },
  };
}

/**
 * Run `fn` under the lock, releasing on every exit path including a throw.
 * `onBusy` decides what a second writer does: by default it refuses rather than
 * waiting, because a scheduled run queueing behind a manual run is how a store
 * gets two writers "safely" and a stale in-memory map.
 */
export async function withLock(r, fn, { runId = null, now = () => Date.now(), onBusy = null } = {}) {
  const lock = acquireLock(r, { runId, now });
  if (!lock.ok) {
    if (onBusy) return onBusy(lock);
    throw new LockError(
      `store is locked by another run (${lock.reason}${lock.holder && lock.holder.pid ? `, pid ${lock.holder.pid}` : ''})`,
      lock,
    );
  }
  try {
    return await fn(lock);
  } finally {
    // Retried, not discarded (F03). A false verdict surfaces on stderr, never a throw:
    // the write already committed (S1-H9); a throwing finally would mask it. G9 major 3.
    if (!releaseStore(lock)) console.error(`[withLock] store lock for ${r} may still be held: release exhausted its retries`);
  }
}

/** Describe the current holder without taking the lock — for `status`. */
export function lockStatus(r) {
  const holder = readLock(r);
  if (!holder) return { held: false };
  if (holder.ambiguous) return { held: true, ambiguous: true };
  const sameHost = holder.host === hostname();
  const alive = sameHost ? pidAlive(holder.pid) : null;
  const ageMs = Date.now() - Date.parse(holder.startedAt || 0);
  return {
    held: true,
    ...holder,
    sameHost,
    alive,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    stale: Number.isFinite(ageMs) && ageMs > STALE_REPORT_MS,
  };
}
