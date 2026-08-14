/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-lock.mjs
 * PURPOSE: The counter lock — mutual exclusion between two agents sharing one
 *          worktree. Split out of gate-common.mjs after a hostile review found
 *          the original could be held by two processes at once.
 * AUTHOR: Opus 5 | CREATED: 2026-08-13 | FIXES: Kimi K3 hostile review S1, S2, S7
 * ============================================================================
 *
 * THE BUG THIS FILE EXISTS TO NOT HAVE (Kimi S1, CRITICAL):
 * v1 stole a stale lock with `statSync` then `unlinkSync` then `openSync(wx)`.
 * With two processes and one stale lock:
 *   1. A stats -> stale.        2. B stats -> stale.
 *   3. A unlinks, opens 'wx' -> A HOLDS IT.
 *   4. B unlinks -- and succeeds, because it deletes A's BRAND-NEW lock.
 *   5. B opens 'wx' -> B HOLDS IT TOO.
 * Both believe they hold it, both write the counter, one write silently loses —
 * the exact failure the lock exists to prevent, delivered by the lock. The v1
 * comment ("another process reclaimed it first") only handled unlink FAILURE;
 * unlink SUCCESS against a file that is no longer the one you statted is the bug.
 *
 * THE FIX: steal by `renameSync`, which is atomic. Only one stealer can win the
 * source path; the loser gets ENOENT and correctly reports contention. Note this
 * also means the retry LIMIT was never the safety mechanism — rename is. One
 * retry is provably sufficient once the steal is atomic.
 *
 * IDENTITY (Kimi S2, CRITICAL): v1's lock was an empty file, so release was an
 * unconditional unlink. A slow-but-alive holder whose lock got stolen would then
 * delete the THIEF's lock on release, letting a third process in mid-write. The
 * lock now carries {pid, token, ts} and release verifies dev/ino/token before
 * unlinking. A sub-millisecond race remains between stat and unlink; bound
 * critical sections well under the TTL rather than pretending it is closed.
 *
 * HARD PRECONDITION: same machine, same filesystem. mtime-based staleness across
 * a synced mount (containers sharing a network volume) is simply broken.
 */
import { closeSync, fstatSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

/** A lock older than this is presumed abandoned. */
export const LOCK_STALE_MS = 120_000;

/**
 * Try to create the lock file and stamp our identity into it.
 * Returns {ok:true, token, dev, ino} or {err} — never throws.
 */
function claim(lockPath, nowMs) {
  const token = randomUUID();
  let fd;
  try {
    fd = openSync(lockPath, 'wx');
  } catch (err) {
    return { err };
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, token, ts: nowMs }), 'utf8');
    const st = fstatSync(fd);
    return { ok: true, token, dev: st.dev, ino: st.ino };
  } catch (err) {
    return { err };
  } finally {
    try { closeSync(fd); } catch { /* already closed */ }
  }
}

/**
 * Acquire the counter lock.
 *
 * @returns {{ok:boolean, path:string, reason:string, stolen:boolean, token?:string, dev?:number, ino?:number}}
 *   reason ∈ acquired | stale-reclaimed | contention | mkdir-failed | <errno>
 *   `stolen:true` means a lock past its TTL was reclaimed — always telemeter it,
 *   because it means some process died holding it.
 *
 * `now` and `statFn` are injectable so the TTL boundary is testable. v1 hid
 * Date.now() inside, which let the reviewer's boundary mutant be waved through as
 * "equivalent" when the honest answer was "unkillable without clock injection".
 */
export function acquireCounterLock({
  lockPath,
  staleMs = LOCK_STALE_MS,
  now = Date.now(),
  statFn = statSync,
} = {}) {
  if (!lockPath) throw new TypeError('acquireCounterLock requires lockPath');
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
  } catch {
    return { ok: false, path: lockPath, reason: 'mkdir-failed', stolen: false };
  }

  const first = claim(lockPath, now);
  if (first.ok) {
    return { ok: true, path: lockPath, reason: 'acquired', stolen: false, ...first };
  }
  // Any error that is NOT "already exists" is an I/O fault, not contention.
  // Collapsing these into "contention" would make a permissions failure look
  // retryable forever — the error-domain collapse this system exists to kill.
  if (first.err?.code !== 'EEXIST') {
    return { ok: false, path: lockPath, reason: first.err?.code || 'open-failed', stolen: false };
  }

  // Held. Reclaim ONLY if demonstrably stale. An unstattable lock is UNKNOWN,
  // and unknown is not stale — treat it as contention.
  let staleStat = null;
  try { staleStat = statFn(lockPath); } catch { staleStat = null; }
  const ageMs = staleStat ? now - staleStat.mtimeMs : null;
  if (ageMs === null || ageMs <= staleMs) {
    return { ok: false, path: lockPath, reason: 'contention', stolen: false };
  }

  // Atomic steal by rename — but rename ALONE does not close the race.
  //
  // Reviewer's fix was "rename, so the loser ENOENTs". That only holds if the
  // loser's rename lands inside the window between the winner's rename and its
  // re-create. It usually does not:
  //   A renames L1 away, creates fresh L2  ->  B renames L2 away, creates L3.
  // Both now believe they hold the lock — the same double-hold, one step later.
  // The reviewer named the missing piece without carrying it into the fix:
  // "statSync at T1 and unlinkSync at T2 are not asserted to be the same file."
  //
  // So: after taking the corpse, prove it is the file we judged stale. If a
  // different inode is sitting there, someone re-created between our stat and our
  // rename — put it back and report contention.
  const corpse = `${lockPath}.stale.${process.pid}.${randomUUID()}`;
  try {
    renameSync(lockPath, corpse);
  } catch {
    return { ok: false, path: lockPath, reason: 'contention', stolen: false };
  }
  let corpseStat = null;
  try { corpseStat = statSync(corpse); } catch { corpseStat = null; }
  const sameFile = corpseStat
    && corpseStat.dev === staleStat.dev
    && corpseStat.ino === staleStat.ino;
  if (!sameFile) {
    try { renameSync(corpse, lockPath); } catch { /* best effort restore */ }
    return { ok: false, path: lockPath, reason: 'contention', stolen: false };
  }
  try { unlinkSync(corpse); } catch { /* corpse cleanup is best-effort */ }

  const second = claim(lockPath, now);
  if (second.ok) {
    return { ok: true, path: lockPath, reason: 'stale-reclaimed', stolen: true, ...second };
  }
  return { ok: false, path: lockPath, reason: 'contention', stolen: false };
}

/**
 * Release a lock we hold. Pass the handle returned by acquireCounterLock —
 * release then verifies dev/ino/token and refuses to unlink someone else's lock.
 *
 * Passing a bare path string is the UNCHECKED legacy path: it unlinks whatever
 * is there. It exists only for cleanup tooling that never held the lock, and it
 * is exactly the behaviour that let v1 delete a thief's lock (S2). Do not use it
 * from a gate.
 *
 * @returns {boolean} true if WE removed OUR lock.
 */
export function releaseCounterLock(handleOrPath) {
  if (typeof handleOrPath === 'string') {
    try { unlinkSync(handleOrPath); return true; } catch { return false; }
  }
  const handle = handleOrPath;
  if (!handle?.path) return false;
  if (!handle.token) return false; // never blind-unlink from a handle-shaped call

  let st;
  try { st = statSync(handle.path); } catch { return false; }

  // The TOKEN is the identity. A re-created lock always carries a new UUID, so a
  // token match is proof the file is the one we created.
  //
  // Inode is corroboration ONLY, and `dev` is deliberately NOT compared: on
  // Windows `fstatSync` reports a real device id while `statSync` reports 0 for
  // the same file, so a dev comparison makes the true owner unable to release its
  // own lock. Measured 2026-08-13 (fstat dev=1417332449 vs stat dev=0, ino equal).
  // On Linux both agree and this would have passed CI while being broken here.
  const inoKnown = handle.ino !== undefined && st.ino !== undefined && st.ino !== 0 && handle.ino !== 0;
  if (inoKnown && st.ino !== handle.ino) return false; // a different file occupies the path

  let body;
  try { body = JSON.parse(readFileSync(handle.path, 'utf8')); } catch { return false; }
  if (body?.token !== handle.token) return false; // stolen and re-held by someone else

  try { unlinkSync(handle.path); return true; } catch { return false; }
}

/** Read the current holder's identity, or null. For diagnostics and telemetry. */
export function readLockHolder(lockPath) {
  try { return JSON.parse(readFileSync(lockPath, 'utf8')); } catch { return null; }
}
