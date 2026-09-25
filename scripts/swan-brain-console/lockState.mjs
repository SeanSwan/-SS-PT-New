/**
 * lockState — read a lock, and ask the OS about its holder.
 * @module scripts/swan-brain-console/lockState
 *
 * WHY THIS IS ITS OWN MODULE (the tenth Rule 4 split in this subsystem)
 * Round 16 grew `attemptLock.mjs` by four repairs at once — the abandoned-lock reclaim (Astra L02),
 * the errno classification (L04), the acquisition token (L07) and the multi-resource plan (L01, which
 * moved to `baselineLock.mjs`). The remaining file was 340 lines against a 300-line cap, and the
 * previous eight splits in this subsystem all took the same shape: the budget was NOT met by
 * deleting reasoning, it was met by finding a boundary that was already real.
 *
 * This one is real. There are two subjects, and they fail differently:
 *   `lockState.mjs`     OBSERVATION — what is on disk, and what the OS says about the pid that wrote
 *                       it. Pure functions of the filesystem and `process.kill`. No decision.
 *   `attemptLock.mjs`   OWNERSHIP — who may create, reclaim or remove a lock. Every branch here is a
 *                       decision that can steal another process's claim.
 *
 * A bug in observation produces a wrong ANSWER; a bug in ownership produces a RACE. Keeping them in
 * one file made the second read as if it were the first, which is how `probeHolder`'s four errno
 * cases ended up sharing a predicate with the reclaim loop.
 *
 * BOUNDS: `node:fs` reads and `process.kill(pid, 0)`. No clock, no argv, no network, no browser.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';

/** A holder older than this, still alive, is reported SUSPECT rather than reclaimed. */
export const DEFAULT_STALE_MS = 30 * 60 * 1000;

/**
 * What the OS said about a pid: `'dead'`, `'alive'`, or `'unknown'`, plus the errno.
 *
 * ROUND 16 (Astra L04) — ONLY `ESRCH` ESTABLISHES DEATH. The previous predicate returned `false`
 * for every errno except `EPERM`, so `EACCES`, `EIO`, `EINVAL` and any throw with no `code` all
 * read as "the holder is gone" — and that is what AUTHORIZES RECLAIMING A LIVE LOCK. A transient
 * probe failure became a licence to delete another process's claim, silently, which is the race
 * `attemptLock.mjs` exists to close.
 *
 * The three verdicts imply three different actions: `ESRCH` -> the pid does not exist, the lock is
 * a leftover; `EPERM`/`EACCES` -> it exists and is not ours, so it is HELD; anything else -> we
 * could not tell, which is NOT death and must be reported as such. **The `unknown` case cannot be
 * arranged with a real process** — a suite cannot make `kill` fail with `EIO` on demand — so the
 * probe is injected and the suite drives all four answers against a synthetic one.
 *
 * `pid <= 0` is `'dead'`: `kill(0, 0)` signals the process GROUP and `kill(-1, 0)` signals
 * everything the user may signal, so a non-positive pid is not a holder. There is nothing to be
 * uncertain about.
 */
export function probeHolder(pid, kill = (target, signal) => process.kill(target, signal)) {
  if (!Number.isInteger(pid) || pid <= 0) return { verdict: 'dead', code: 'ESRCH', detail: 'not a pid' };
  try {
    kill(pid, 0);
    return { verdict: 'alive', code: null, detail: 'signalled successfully' };
  } catch (err) {
    const code = err && err.code ? err.code : null;
    if (code === 'ESRCH') return { verdict: 'dead', code, detail: 'no such process' };
    if (code === 'EPERM' || code === 'EACCES') return { verdict: 'alive', code, detail: 'exists, not ours' };
    return { verdict: 'unknown', code, detail: `the probe failed with ${code ?? 'no code'}` };
  }
}

/**
 * The boolean face of `probeHolder`, for callers that only branch on liveness.
 *
 * `'unknown'` counts as ALIVE, because reclaiming a lock we merely failed to probe is the race
 * again, and a stale lock is a loud bounded failure while a race is a silent one. Callers that
 * must report WHY should use `probeHolder` directly — every shipped one does.
 */
export function holderIsAlive(pid, kill = (target, signal) => process.kill(target, signal)) {
  return probeHolder(pid, kill).verdict !== 'dead';
}

/**
 * The lock document, or `{ malformed: true }` when it cannot be read as one.
 *
 * TWO ANSWERS, AND THEY MUST NOT COLLAPSE. `null` means "there is no lock, proceed"; `malformed`
 * means "something is there and it is not a lock document", which `attemptLock.mjs` REFUSES on,
 * because a file it cannot parse may belong to a process mid-write. Returning `null` for both would
 * turn an unreadable lock into a free resource, which is the race.
 *
 * **A JSON ARRAY IS MALFORMED, AND ROUND 16 FOUND IT WAS NOT BEING CAUGHT.** `typeof [] === 'object'`
 * is true, so a lock file containing `["a","list"]` — or any list a shell redirect or a partial write
 * left behind — was returned as the holder document. Every consumer then reads `holder.pid`,
 * gets `undefined`, and `probeHolder(undefined)` answers `'dead'`: an array at the lock path read as
 * an ABANDONED LOCK. That is the one verdict that authorizes removal, so the defect converts
 * arbitrary junk at a path into a licence to reclaim it. `Array.isArray` is what separates the two,
 * and it is not cosmetic — `null` and arrays are the two shapes `JSON.parse` returns that
 * `typeof` cannot distinguish from a document.
 */
export function readLock(lockPath) {
  if (!existsSync(lockPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { malformed: true };
    return parsed;
  } catch {
    return { malformed: true };
  }
}

/**
 * How old the recorded holder says it is, in ms, or null when `startedAt` is not a timestamp.
 *
 * Null rather than 0, and that distinction is load-bearing: `Number.isFinite(age) && age > staleMs`
 * in the caller treats a missing `startedAt` as "not suspect", so a lock document without one is
 * never reclaimed on age. Returning 0 would make every such lock look brand new instead, which is
 * the same decidable answer for the wrong reason.
 */
export function holderAgeMs(holder, nowMs) {
  const age = nowMs - Date.parse(holder?.startedAt ?? '');
  return Number.isFinite(age) ? age : null;
}

/** The size of a lock file, for a test that asserts it is never used as a data channel. */
export function lockSize(lockPath) {
  try {
    return statSync(lockPath).size;
  } catch {
    return -1;
  }
}
