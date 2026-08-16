# Hostile review — Slice 1, POST-FIX and already in production

**Date:** 2026-08-16 · **Reviewer:** GLM-5.3 · **Supersedes:** `PACKET-slice1-hostile-review-2026-08-13.md`
(which embedded the pre-fix v1 source and must not be reviewed again).

**Verdict needed:** for each finding — CRITICAL / HIGH / MEDIUM / LOW, with an exploit path or a
concrete failing input. This code is **already shipped to `origin/main`**, so "do not ship" is not an
available verdict; the useful output is "what is still wrong, and how bad."

---

## What this is

Two modules that form the shared foundation of a 25-file hostile-review gate system. Every future
gate stands on them. They are **command-line Node modules run by git/agent hooks** — there is no UI,
no user-facing surface, no accessibility or design dimension. Reviews that produce a touch-target or
visual-hierarchy audit of this code are worthless; a previous reviewer's default persona did exactly
that.

- `gate-common.mjs` — telemetry, typed JSON I/O, atomic writes, the disable mechanism, freshness.
- `gate-lock.mjs` — the counter lock: mutual exclusion between two AI agents sharing one worktree.

## The system's core rule

> Gate decisions may depend ONLY on (i) hook-written state, (ii) tool-written state, (iii) git itself.
> **Agent-written state is a claim, never evidence.**

The system exists because hostile reviews kept declaring "nothing left to fix" and the next reviewer
immediately found real defects. The prior gate matched a *string* in the agent's own closing message,
so a typed claim and a genuine six-round loop were indistinguishable. Judge every primitive below
against the question: **can the examinee forge this?**

## Already found and fixed — do NOT re-report these as new

A previous review round (Kimi K3 S1–S8, HY3 D1–D4) returned DO-NOT-SHIP on v1. All of the following
are already corrected in the source below. Re-reporting them is noise; **finding that a fix is
incomplete is exactly what is wanted.**

| id | v1 defect | fix now in the source |
|---|---|---|
| S1 CRITICAL | stale-lock steal was TOCTOU; two agents could hold the lock | atomic rename **plus inode identity binding** — rename alone was insufficient (A renames L1 away and creates L2; B then renames L2 away — same bug one step later) |
| S2 CRITICAL | `releaseCounterLock` unlinked unconditionally, so a slow-but-alive holder deleted the *thief's* lock | locks carry `{pid, token, ts}`; release verifies ownership |
| S3 / D3 HIGH | `failOpen` discarded the telemetry return → **silent allow** | `failOpen` returns TRUTHY on logging failure |
| S4 / D2 HIGH | `touchSessionStart(new Date(0))` made every artifact ever written "fresh" — a one-line bypass | `stampSessionStart` clamps backwards + carries contents; mtime freshness demoted to `mtimeLooksFresh` |
| S5 / D1 HIGH | kill switch silent and traversable (`isDisabled('../../x')` escaped) | sanitized, lowercased, telemetered once/process, `listDisabled()`, `SWAN_DISABLE_ROOT` |
| S6 MEDIUM | `readJsonSafe` collapsed missing/corrupt/unreadable; EACCES read as "no data yet" | discriminated result type |
| S8 | no atomic write helper | `writeJsonAtomic` (temp-then-rename) |
| — | Windows: `fstatSync` reports `dev=1417332449` where `statSync` reports `dev=0` for the same file, so comparing `dev` made the true owner unable to release its own lock. **Would have passed on Linux CI.** | token is identity; inode corroborates; `dev` never compared |

## Amendments the code is supposed to satisfy

- **A2** — freshness is **consumer-checked `subject_sha`**, not mtime. *"Producers don't enforce
  freshness on themselves; consumers enforce it on producers."*
- **A4** — temp-then-rename writes; status taxonomy `completed|timeout|killed|crash`.
- **A6** — trust root written only by hooks; hash manifest verified at session start.

## Environment

Windows 11, Node 22.14, Git Bash, NTFS. Two agents commit to one shared worktree concurrently. The
hard precondition already documented: same machine, same filesystem. Test suites currently pass
15/15 and 10/10 (verified this session, green baseline).

---

## Hostile-review questions

Answer each explicitly. Where you claim a defect, give the **exploit path or the input that breaks
it**, not a category name.

1. **`SWAN_GATE_ROOT` / `SWAN_DISABLE_ROOT` as bypass surfaces.** `gateRoot()` resolves from an
   environment variable at call time, and every path — telemetry, counter, lock, session anchor —
   derives from it. The examinee is an AI agent that can set environment variables in the shell it
   spawns. Does one `export SWAN_GATE_ROOT=/tmp/empty` relocate the entire trust root and neutralise
   the system? If so, what is the minimum fix that keeps the tests' ability to retarget?

2. **The injectable clock in `acquireCounterLock`.** `now` and `statFn` are injectable so the TTL
   boundary is testable. The same injection point is reachable by any caller. Does a caller passing a
   crafted `now` mint a lock that is instantly stale, or steal a live lock? Is test observability
   worth this, and if not, what is the alternative that keeps the boundary testable?

3. **`isFreshForSha` proves recency, not review.** An artifact is "fresh" if it *states* a
   `subject_sha` matching the sha the consumer computed from git. But the agent writes the artifact,
   and the agent can read `git rev-parse HEAD`. What stops it from emitting an artifact that claims
   the current sha without having performed the review it attests to? Is A2 solving the problem it
   claims to solve, or only the weaker mtime-forgery problem?

4. **The unenforced `failOpen` contract.** `failOpen` now returns a truthy object when telemetry
   failed, and the docblock instructs consumers to treat it as a block at any fail-closed boundary.
   No consumer exists yet. Is a contract that depends on 24 future call sites remembering to check a
   return value a real fix, or S3 deferred? What construction would make it unignorable?

5. **Telemetry line tearing.** `appendTelemetry` comments that lines must stay "well under 4096
   bytes" because concurrent `appendFileSync` from two agents can tear longer lines — and `readJsonl`
   silently skips malformed lines. Nothing bounds `reason`. Construct the input that tears a line, and
   say what evidence is silently lost when it happens. Is skip-malformed the right policy for a
   channel whose *silence is defined as the crash signal*?

6. **The residual release race, self-declared.** `gate-lock.mjs` admits: *"A sub-millisecond race
   remains between stat and unlink; bound critical sections well under the TTL rather than pretending
   it is closed."* Is that honest accounting or an excuse? Give the interleaving that loses a write,
   and say whether it is closable on Node/Windows without a native lock.

7. **`isDisabled` returns `false` for malformed names.** A name containing a slash or `..` returns
   false — indistinguishable from "no marker present". A caller reading `!isDisabled(x)` as "the gate
   is on" gets the same answer for "not disabled" and "your query was rejected". Does this reproduce
   the error-domain collapse the system was built to eliminate?

8. **`writeJsonAtomic` durability.** temp-then-rename with no `fsync` on the temp file or the parent
   directory. On a crash or power loss, can the rename land while the contents are still zero-length?
   Does that defeat A4 on NTFS specifically?

9. **Test adequacy.** 25 tests total. Name the mutants you would plant that these suites would NOT
   kill, and the untested branch that worries you most.

10. **Anything the previous two reviewers and I have all missed.** Be specific; this is the question
    the whole system exists to answer.

---

## SOURCE (byte-exact from `origin/main`, the deployed state)

### scripts/hooks/lib/gate-common.mjs

```javascript
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.mjs
 * PURPOSE: Shared primitives for the hostile-review gate system — telemetry,
 *          typed JSON I/O, atomic writes, the disable mechanism, and freshness.
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | REVISED: 2026-08-13
 * REVIEW:  Kimi K3 (S3-S9) + HY3 (D1-D4) hostile review — both DO-NOT-SHIP on v1.
 *          The lock moved to gate-lock.mjs (Kimi S1/S2, CRITICAL).
 * ============================================================================
 *
 * TRUST BOUNDARY: gate decisions may depend only on hook-written state,
 * tool-written state, and git. Agent-written state is a CLAIM, never evidence.
 * Several v1 primitives violated this while appearing to enforce it; the
 * corrections are marked inline so nobody re-introduces them.
 *
 * TELEMETRY IS THE CRASH SIGNAL. Every gate run appends one line, so silence
 * means a dead gate rather than a satisfied one. v1 broke this at the single
 * place it mattered: `failOpen` discarded `appendTelemetry`'s return value, so a
 * telemetry failure produced a silent allow — manufactured silence, which is the
 * failure the contract claims to detect (Kimi S3 / HY3 D3). `failOpen` now
 * returns a TRUTHY object when logging failed; a truthy return means DO NOT
 * SILENTLY ALLOW. Consumers must treat it as a block at any fail-closed boundary.
 */
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync,
  readdirSync, readFileSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..', '..');

/** Paths resolve at call time so tests can retarget via SWAN_GATE_ROOT. */
export function gateRoot() {
  return process.env.SWAN_GATE_ROOT ? resolve(process.env.SWAN_GATE_ROOT) : DEFAULT_ROOT;
}
export function qaDir() { return join(gateRoot(), '.ai-workflow', 'qa'); }
export function coordDir() { return join(gateRoot(), '.ai-workflow', 'coordination'); }
export function telemetryPath() { return join(qaDir(), 'gate-telemetry.jsonl'); }
export function counterPath() { return join(coordDir(), 'review-counter.json'); }
export function counterLockPath() { return join(coordDir(), 'review-counter.lock'); }
export function sessionAnchorPath() { return join(qaDir(), '.session-start'); }

/**
 * Disable markers. HY3 D1 (BLOCKER): an in-tree directory is a kill switch the
 * examinee can throw. SWAN_DISABLE_ROOT lets a privileged hook host it outside
 * agent-writable space; the in-tree default remains only so the rollback drill
 * works today, and `listDisabled()` exists so the push gate can REFUSE while any
 * gate is disabled — a disable must be loud at the trust boundary, not silent.
 */
export function disabledDir() {
  return process.env.SWAN_DISABLE_ROOT
    ? resolve(process.env.SWAN_DISABLE_ROOT)
    : join(qaDir(), 'disabled');
}

/** Append exactly one telemetry line. Key ORDER is contract. Never throws. */
export function appendTelemetry(entry) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      gate: String(entry?.gate ?? 'unknown'),
      boundary: String(entry?.boundary ?? 'unknown'),
      result: String(entry?.result ?? 'unknown'),
      reason: String(entry?.reason ?? ''),
      latency_ms: Number.isFinite(Number(entry?.latency_ms)) ? Math.round(Number(entry.latency_ms)) : 0,
    });
    // Keep lines well under 4096 bytes: concurrent appendFileSync from two agents
    // can tear longer lines, and readJsonl's skip-malformed policy would silently
    // absorb the evidence (Kimi S3 corollary).
    appendFileSync(telemetryPath(), `${line}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a fail-open.
 * @returns {null} when the telemetry line landed — safe to allow.
 * @returns {object} TRUTHY when logging failed — the caller must NOT silently
 *          allow; at a fail-closed boundary this is a block (HY3 D3).
 */
export function failOpen(name, boundary, reason, latencyMs = 0) {
  const logged = appendTelemetry({ gate: name, boundary, result: 'fail-open', reason, latency_ms: latencyMs });
  if (logged) return null;
  try { process.stderr.write(`GATE-TELEMETRY-FAILURE ${name} ${reason}\n`); } catch { /* last resort */ }
  return { failOpen: true, telemetrySound: false, gate: name, reason };
}

/**
 * Typed JSON read (Kimi S6). v1 collapsed missing/corrupt/unreadable into one
 * fallback, so an EACCES read as "no data yet" and fell open — while the
 * architecture requires fail-CLOSED on a corrupt counter. Callers must opt into
 * collapsing rather than inherit it.
 * @returns {{ok:true,value:any}|{ok:false,error:'missing'|'corrupt'|'unreadable',code?:string}}
 */
export function readJsonResult(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return { ok: false, error: 'missing' };
    return { ok: false, error: 'unreadable', code: err?.code };
  }
  try { return { ok: true, value: JSON.parse(raw) }; } catch { return { ok: false, error: 'corrupt' }; }
}

/** Convenience collapse. NEVER use where missing-vs-corrupt changes the decision. */
export function readJsonOrDefault(path, fallback = null) {
  const r = readJsonResult(path);
  return r.ok ? r.value : fallback;
}

/** Append one object as a single JSONL line, creating parent dirs. */
export function appendJsonl(path, obj) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(obj)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Read JSONL, skipping malformed lines — one torn line must not blind a gate. */
export function readJsonl(path) {
  const out = [];
  let raw = '';
  try { raw = readFileSync(path, 'utf8'); } catch { return out; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip torn line */ }
  }
  return out;
}

/**
 * Atomic whole-file JSON write (Kimi S8 / amendment A4): temp-then-rename, so an
 * artifact either fully exists or does not. Without this, slice-2 authors reach
 * for writeFileSync and a killed write leaves a truncated file that passes an
 * existence-plus-non-empty check — the exact incident this system was built after.
 */
export function writeJsonAtomic(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${randomUUID()}`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, JSON.stringify(obj), 'utf8');
    renameSync(tmp, path);
    return true;
  } catch {
    try { unlinkSync(tmp); } catch { /* best effort */ }
    return false;
  }
}

const disabledAnnounced = new Set();

/**
 * Is a component disabled? Emits `disabled-honored` telemetry the first time per
 * process (Kimi S5) — v1 honored a kill switch and told nobody.
 * Names are sanitized: v1 joined an unsanitized name, so `isDisabled('../../x')`
 * traversed. Names are lowercased because macOS/Windows filesystems are
 * case-insensitive and Linux is not (Kimi Q6e).
 */
export function isDisabled(name) {
  const raw = String(name);
  if (!raw || /[\\/]/.test(raw) || raw.includes('..')) return false;
  const key = raw.toLowerCase();
  let present = false;
  try { present = existsSync(join(disabledDir(), key)); } catch { return false; }
  if (present && !disabledAnnounced.has(key)) {
    disabledAnnounced.add(key);
    appendTelemetry({ gate: key, boundary: 'tool', result: 'disabled-honored', reason: 'disable marker present', latency_ms: 0 });
  }
  return present;
}

/** Every active disable marker. The push gate must refuse PASS while any exists. */
export function listDisabled() {
  try { return readdirSync(disabledDir()).filter((f) => !f.startsWith('.')).sort(); } catch { return []; }
}

/** Current HEAD sha, or null. `exec` is injectable so the empty-output branch is testable. */
export function headSha(cwd = gateRoot(), { exec = execFileSync } = {}) {
  try {
    const out = exec('git', ['-C', cwd, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out).trim() || null; // '' is falsy but poisons `sha === null` checks
  } catch {
    return null;
  }
}

/** Session id from the harness, or null. Null means UNKNOWN — never invent one. */
export function sessionId() {
  return process.env.CLAUDE_SESSION_ID || process.env.SWAN_GATE_SESSION_ID || null;
}

/**
 * Stamp the session anchor. **SessionStart hook only** — this is trust-root state.
 *
 * v1 exported `touchSessionStart(when)` with an attacker-controlled timestamp, so
 * `touchSessionStart(new Date(0))` made every artifact ever written "fresh" — a
 * one-line bypass of the whole freshness contract (Kimi S4 / HY3 D2). The anchor
 * now (a) never moves backwards, (b) carries {sessionId, headSha, ts} so consumers
 * verify contents rather than a bare mtime.
 */
export function stampSessionStart({ when = new Date(), id = sessionId(), sha = null } = {}) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const path = sessionAnchorPath();
    let existingMs = null;
    try { existingMs = statSync(path).mtimeMs; } catch { existingMs = null; }
    const clamped = existingMs !== null && when.getTime() < existingMs;
    const effective = clamped ? new Date(existingMs) : when;
    writeFileSync(path, JSON.stringify({ sessionId: id, headSha: sha, ts: effective.toISOString() }), 'utf8');
    utimesSync(path, effective, effective);
    return { ok: true, clamped, ts: effective.toISOString() };
  } catch {
    return { ok: false, clamped: false, ts: null };
  }
}

/** The anchor's contents, or null when absent/corrupt. */
export function sessionAnchor() {
  const r = readJsonResult(sessionAnchorPath());
  return r.ok ? r.value : null;
}

/** Anchor mtime in epoch ms, or null (UNKNOWN). */
export function sessionStartMs() {
  try { return statSync(sessionAnchorPath()).mtimeMs; } catch { return null; }
}

/** sha256 of a file's bytes, or null if unreadable. */
export function fileSha256(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex'); } catch { return null; }
}

/**
 * A2 — the load-bearing freshness primitive. An artifact is fresh for a subject
 * only if it *states* the sha it covers and that matches the sha the consumer
 * computed from git. Unforgeable by mtime games: the agent cannot mint a binding
 * for code it did not review, because HEAD is recomputed on the trust side.
 * Missing or mismatched → false, and consumers must treat that as a hard block.
 */
export function isFreshForSha(artifactSubjectSha, currentSha) {
  if (!artifactSubjectSha || !currentSha) return false;
  return String(artifactSubjectSha) === String(currentSha);
}

/**
 * HEURISTIC ONLY — never a gate decision (Kimi's A2 ruling / HY3 D2).
 * mtime is agent-writable via utimesSync, so this fails OPEN against forgery even
 * though it fails closed against absence. Legitimate uses: a human-facing
 * "claims sha X but is 3 days old" tripwire, and cheap pre-filtering before the
 * sha check. Deliberately renamed from `isFreshThisSession` so no consumer can
 * mistake it for proof.
 */
export function mtimeLooksFresh(path) {
  const start = sessionStartMs();
  if (start === null) return false;
  try { return statSync(path).mtimeMs >= start; } catch { return false; }
}

export { LOCK_STALE_MS, acquireCounterLock, releaseCounterLock, readLockHolder } from './gate-lock.mjs';
```

### scripts/hooks/lib/gate-lock.mjs

```javascript
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
```

### scripts/hooks/lib/gate-common.test.mjs

```javascript
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.test.mjs
 * PURPOSE: Prove the gate primitives hold their contracts, including every
 *          defect found by the Kimi K3 (S1-S9) and HY3 (D1-D4) hostile reviews.
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | REVISED: 2026-08-13
 * ============================================================================
 *
 * Run: node scripts/hooks/lib/gate-common.test.mjs   -> RESULT: PASS (n/n)
 *
 * Test count changed from 14 to 20: the reviews forced API changes (typed JSON
 * reads, clamped session anchor, ownership-checked release) and named seven
 * mutants the v1 suite could not express. Each regression test below cites the
 * finding it kills, so a future edit cannot quietly drop one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appendTelemetry, readJsonResult, readJsonOrDefault, appendJsonl, readJsonl,
  writeJsonAtomic, isDisabled, listDisabled, failOpen, headSha, sessionId,
  stampSessionStart, sessionAnchor, sessionStartMs, mtimeLooksFresh, fileSha256,
  isFreshForSha, telemetryPath, counterLockPath, disabledDir, qaDir,
  acquireCounterLock, releaseCounterLock, LOCK_STALE_MS,
} from './gate-common.mjs';

let total = 0;
let passed = 0;
const made = [];

function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-gate-'));
  made.push(dir);
  process.env.SWAN_GATE_ROOT = dir;
  delete process.env.SWAN_DISABLE_ROOT;
  return dir;
}
function lastLine() {
  const lines = readFileSync(telemetryPath(), 'utf8').trim().split(/\r?\n/);
  return JSON.parse(lines[lines.length - 1]);
}
function check(name, fn) {
  total += 1;
  test(name, async (t) => { await fn(t); passed += 1; });
}

check('appendTelemetry writes one line with the contracted key order', () => {
  freshRoot();
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', reason: 'r', latency_ms: 7 }), true);
  const raw = readFileSync(telemetryPath(), 'utf8');
  assert.equal(raw.split('\n').filter(Boolean).length, 1);
  assert.deepEqual(Object.keys(JSON.parse(raw)), ['ts', 'gate', 'boundary', 'result', 'reason', 'latency_ms']);
});

check('appendTelemetry rounds fractional latency and preserves an empty gate name', () => {
  freshRoot();
  // mutant 1: Math.round -> identity. v1 only ever passed integers.
  appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', latency_ms: 7.6 });
  assert.equal(lastLine().latency_ms, 8);
  appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', latency_ms: 'nope' });
  assert.equal(lastLine().latency_ms, 0, 'non-numeric must not emit NaN');
  // mutant 2: ?? -> ||. An empty-string gate name must stay '', not become 'unknown'.
  appendTelemetry({ gate: '', boundary: 'turn', result: 'allow' });
  assert.equal(lastLine().gate, '');
  appendTelemetry({ boundary: 'turn', result: 'allow' });
  assert.equal(lastLine().gate, 'unknown', 'absent gate still defaults');
});

check('appendTelemetry returns false instead of throwing when the qa dir cannot exist', () => {
  const dir = freshRoot();
  writeFileSync(join(dir, '.ai-workflow'), 'blocker', 'utf8'); // forces ENOTDIR
  assert.doesNotThrow(() => appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }));
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }), false);
});

check('KIMI S3 / HY3 D3: failOpen returns TRUTHY when telemetry fails, null when it lands', () => {
  freshRoot();
  assert.equal(failOpen('review-round-gate', 'turn', 'disabled', 12), null, 'logged fail-open allows');
  const line = lastLine();
  assert.equal(line.result, 'fail-open');
  assert.equal(line.latency_ms, 12);

  // mutant 3, the most important in the module: a failOpen that ignores telemetry
  // failure is indistinguishable from shipped v1 under every other test.
  const dir = freshRoot();
  writeFileSync(join(dir, '.ai-workflow'), 'blocker', 'utf8');
  const res = failOpen('review-round-gate', 'turn', 'disabled', 3);
  assert.ok(res, 'unlogged fail-open must NOT return the allow sentinel');
  assert.equal(res.telemetrySound, false);
  assert.equal(res.failOpen, true);
});

check('KIMI S6: readJsonResult discriminates missing / corrupt / unreadable', () => {
  const dir = freshRoot();
  const good = join(dir, 'good.json');
  const bad = join(dir, 'bad.json');
  writeFileSync(good, '{"a":1}', 'utf8');
  writeFileSync(bad, '{not json', 'utf8');
  assert.deepEqual(readJsonResult(good), { ok: true, value: { a: 1 } });
  assert.equal(readJsonResult(bad).error, 'corrupt', 'corrupt must not read as missing');
  assert.equal(readJsonResult(join(dir, 'nope.json')).error, 'missing');
  const asDir = join(dir, 'adir');
  mkdirSync(asDir);
  const r = readJsonResult(asDir);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'unreadable', 'an I/O fault is not "missing"');
  assert.equal(readJsonOrDefault(bad, 'FB'), 'FB', 'explicit collapse still available');
});

check('appendJsonl creates dirs and appends one line per call; readJsonl skips torn lines', () => {
  const dir = freshRoot();
  const p = join(dir, 'nested', 'deep', 'ledger.jsonl');
  assert.equal(appendJsonl(p, { round: 1 }), true);
  assert.equal(appendJsonl(p, { round: 2 }), true);
  assert.equal(readFileSync(p, 'utf8').trim().split('\n').length, 2);
  const t = join(dir, 'torn.jsonl');
  writeFileSync(t, '{"a":1}\nTORN\n\n{"a":3}\n', 'utf8');
  assert.deepEqual(readJsonl(t), [{ a: 1 }, { a: 3 }]);
  assert.deepEqual(readJsonl(join(dir, 'absent.jsonl')), []);
});

check('KIMI S8: writeJsonAtomic lands the file and leaves no temp behind', () => {
  const dir = freshRoot();
  const p = join(dir, 'out', 'verdict.json');
  assert.equal(writeJsonAtomic(p, { verdict: 'CLEAN' }), true);
  assert.deepEqual(JSON.parse(readFileSync(p, 'utf8')), { verdict: 'CLEAN' });
  assert.equal(readdirSync(join(dir, 'out')).filter((f) => f.includes('.tmp.')).length, 0);
  writeFileSync(join(dir, 'blocked'), 'x', 'utf8');
  assert.equal(writeJsonAtomic(join(dir, 'blocked', 'nope.json'), { a: 1 }), false, 'failure reports false');
});

check('KIMI S5: isDisabled rejects traversal, is case-insensitive, and telemeters the honor', () => {
  freshRoot();
  assert.equal(isDisabled('some-gate'), false);
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'some-gate'), '', 'utf8');
  assert.equal(isDisabled('some-gate'), true);
  const line = lastLine();
  assert.equal(line.result, 'disabled-honored', 'honoring a kill switch must not be silent');
  // Memoized: honoring a disable must be announced ONCE per process, not on every
  // call, or a hot gate floods the telemetry that is meant to be the crash signal.
  const before = readFileSync(telemetryPath(), 'utf8').split('\n').filter((l) => l.includes('disabled-honored')).length;
  isDisabled('some-gate'); isDisabled('some-gate');
  const after = readFileSync(telemetryPath(), 'utf8').split('\n').filter((l) => l.includes('disabled-honored')).length;
  assert.equal(after, before, 'repeat calls must not re-announce');
  assert.equal(isDisabled('SOME-GATE'), true, 'case-insensitive filesystems must not split the name');
  assert.equal(isDisabled('other-gate'), false, 'disable is per-component');
  assert.equal(isDisabled('../../../../tmp/x'), false, 'path traversal must be refused');
  assert.equal(isDisabled('a/b'), false);
});

check('HY3 D1: listDisabled enumerates markers, and SWAN_DISABLE_ROOT moves them out of the tree', () => {
  const dir = freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'gate-a'), '', 'utf8');
  writeFileSync(join(disabledDir(), 'gate-b'), '', 'utf8');
  assert.deepEqual(listDisabled(), ['gate-a', 'gate-b']);
  const outside = join(dir, 'privileged');
  mkdirSync(outside, { recursive: true });
  process.env.SWAN_DISABLE_ROOT = outside;
  assert.deepEqual(listDisabled(), [], 'override reads the privileged root, not the in-tree one');
  assert.equal(isDisabled('gate-a'), false);
  delete process.env.SWAN_DISABLE_ROOT;
});






check('headSha returns null on empty output, and a sha otherwise', () => {
  freshRoot();
  // mutant 6: `.trim() || null` -> `.trim()`. '' is falsy but poisons `=== null`.
  assert.equal(headSha(process.cwd(), { exec: () => '  \n' }), null);
  assert.equal(headSha(process.cwd(), { exec: () => 'a'.repeat(40) }), 'a'.repeat(40));
  assert.equal(headSha(process.cwd(), { exec: () => { throw new Error('no git'); } }), null);
  const real = headSha(process.cwd());
  assert.ok(real === null || /^[0-9a-f]{40,64}$/.test(real));
});

check('KIMI S4 / HY3 D2: the session anchor never moves backwards and carries contents', () => {
  freshRoot();
  const t1 = new Date(Date.now() - 60_000);
  const first = stampSessionStart({ when: t1, id: 'sess-1', sha: 'abc123' });
  assert.equal(first.ok, true);
  assert.equal(first.clamped, false);
  assert.deepEqual(sessionAnchor(), { sessionId: 'sess-1', headSha: 'abc123', ts: t1.toISOString() });

  // v1 exported touchSessionStart(when) — touchSessionStart(new Date(0)) made
  // every artifact ever written "fresh". A backwards move must be refused.
  const back = stampSessionStart({ when: new Date(0), id: 'sess-1' });
  assert.equal(back.clamped, true, 'a backwards stamp must be clamped, not honored');
  assert.equal(Math.round(sessionStartMs()), Math.round(t1.getTime()));
  const fwd = new Date(t1.getTime() + 30_000);
  assert.equal(stampSessionStart({ when: fwd, id: 'sess-1' }).clamped, false, 'forward moves still allowed');
});

check('sessionStartMs reads mtime, not atime', () => {
  freshRoot();
  const when = new Date(Date.now() - 60_000);
  stampSessionStart({ when, id: 's' });
  // mutant 5: mtimeMs -> atimeMs. stampSessionStart sets both, so skew them.
  const atime = new Date(Date.now() - 5_000);
  const mtime = new Date(when.getTime());
  utimesSync(join(qaDir(), '.session-start'), atime, mtime);
  assert.equal(Math.round(sessionStartMs()), Math.round(mtime.getTime()));
});

check('mtimeLooksFresh is a heuristic: unknown anchor is never fresh', () => {
  const dir = freshRoot();
  const target = join(dir, 'artifact.md');
  writeFileSync(target, 'x', 'utf8');
  assert.equal(mtimeLooksFresh(target), false, 'no anchor means UNKNOWN, which is not fresh');
  const start = new Date(Date.now() - 60_000);
  stampSessionStart({ when: start, id: 's' });
  assert.equal(mtimeLooksFresh(target), true);
  const older = new Date(start.getTime() - 60_000);
  utimesSync(target, older, older);
  assert.equal(mtimeLooksFresh(target), false, 'a previous run leftover is not fresh');
  utimesSync(target, start, start);
  assert.equal(mtimeLooksFresh(target), true, 'boundary is inclusive by contract');
  assert.equal(mtimeLooksFresh(join(dir, 'absent.md')), false);
});

check('A2: isFreshForSha is the load-bearing check and refuses missing bindings', () => {
  freshRoot();
  assert.equal(isFreshForSha('abc', 'abc'), true);
  assert.equal(isFreshForSha('abc', 'def'), false);
  assert.equal(isFreshForSha(null, 'abc'), false, 'an artifact with no subject_sha is never fresh');
  assert.equal(isFreshForSha('abc', null), false, 'unknown HEAD can never confirm freshness');
  assert.equal(isFreshForSha('', ''), false);
});

check('fileSha256 hashes bytes and reports null for unreadable paths', () => {
  const dir = freshRoot();
  const p = join(dir, 'a.txt');
  writeFileSync(p, 'hello', 'utf8');
  assert.equal(fileSha256(p), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  assert.equal(fileSha256(join(dir, 'missing.txt')), null);
  assert.equal(typeof sessionId(), sessionId() === null ? 'object' : 'string');
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
```

### scripts/hooks/lib/gate-lock.test.mjs

```javascript
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-lock.test.mjs
 * PURPOSE: Regression tests for the counter lock — the module whose v1 could be
 *          held by two processes at once.
 * AUTHOR: Opus 5 | CREATED: 2026-08-13 | KILLS: Kimi S1, S2, S7 + the Windows
 *          fstat/stat `dev` divergence found while testing the S2 fix.
 * ============================================================================
 *
 * Run: node scripts/hooks/lib/gate-lock.test.mjs   -> RESULT: PASS (n/n)
 *
 * The v1 suite had ZERO multi-process coverage in a module whose entire reason to
 * exist is two-agent contention, so the interesting interleavings were
 * inexpressible. `statFn` and `now` are injectable precisely so they can be
 * expressed here without spawning processes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acquireCounterLock, releaseCounterLock, readLockHolder, LOCK_STALE_MS } from './gate-lock.mjs';

let total = 0;
let passed = 0;
const made = [];

function freshDir() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-lock-'));
  made.push(dir);
  return dir;
}
function check(name, fn) {
  total += 1;
  test(name, async (t) => { await fn(t); passed += 1; });
}

check('acquires when free, reports contention while held, and carries an identity token', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  assert.equal(a.reason, 'acquired');
  assert.equal(a.stolen, false);
  assert.ok(a.token, 'an empty lock file cannot prove ownership on release');
  assert.equal(readLockHolder(p).token, a.token);
  const b = acquireCounterLock({ lockPath: p });
  assert.equal(b.ok, false);
  assert.equal(b.reason, 'contention');
});

check('classifies non-EEXIST failures distinctly from contention', () => {
  const dir = freshDir();
  // NUL built from a char code, not an escape sequence: writing "\u0000" as a
  // literal has twice been converted into a real control byte by the tooling
  // between here and disk. A space was the accidental substitute the first time,
  // and a space is a perfectly legal filename — the test then proved nothing.
  const bad = acquireCounterLock({ lockPath: join(dir, `lock${String.fromCharCode(0)}name`) });
  assert.equal(bad.ok, false);
  assert.notEqual(bad.reason, 'contention', 'a real I/O fault must keep its own code');
  writeFileSync(join(dir, 'blocker'), 'x', 'utf8');
  assert.equal(acquireCounterLock({ lockPath: join(dir, 'blocker', 'x.lock') }).reason, 'mkdir-failed');
});

check('KIMI S7: the stale TTL boundary is exact, via injected clock', () => {
  const p = join(freshDir(), 'c.lock');
  assert.equal(acquireCounterLock({ lockPath: p }).ok, true);
  const base = statSync(p).mtimeMs;
  // v1 hid Date.now() inside, so this mutant was waved through as "equivalent"
  // when the honest label was "unkillable without clock injection".
  assert.equal(acquireCounterLock({ lockPath: p, now: base + LOCK_STALE_MS }).ok, false, 'age == TTL is not yet stale');
  const past = acquireCounterLock({ lockPath: p, now: base + LOCK_STALE_MS + 1 });
  assert.equal(past.ok, true, 'one ms past the TTL reclaims');
  assert.equal(past.stolen, true);
});

check('KIMI S1 (CRITICAL): a stealer that statted a different file must not double-hold', () => {
  const p = join(freshDir(), 'c.lock');
  const holder = acquireCounterLock({ lockPath: p });
  assert.equal(holder.ok, true);
  // B statted the OLD lock (stale, foreign inode) before A re-created a fresh one.
  // Rename alone would let B steal A's fresh lock — both would then believe they
  // hold it and both would write the counter. The identity check must refuse.
  const staleGhost = () => ({ dev: 999999, ino: 999999, mtimeMs: Date.now() - LOCK_STALE_MS * 10 });
  const b = acquireCounterLock({ lockPath: p, statFn: staleGhost });
  assert.equal(b.ok, false, 'two processes must never hold the lock simultaneously');
  assert.equal(b.reason, 'contention');
  assert.equal(readLockHolder(p).token, holder.token, "A's lock must be restored intact");
});

check('KIMI S2 (CRITICAL): release refuses to delete a lock we no longer own', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  const past = new Date(Date.now() - (LOCK_STALE_MS + 60_000));
  utimesSync(p, past, past);
  const b = acquireCounterLock({ lockPath: p });
  assert.equal(b.ok, true);
  assert.equal(b.stolen, true);
  // A is slow-but-alive; its lock was stolen. Its release must not delete B's.
  assert.equal(releaseCounterLock(a), false, "A must not delete B's live lock");
  assert.equal(readLockHolder(p).token, b.token, "B's lock survives A's release");
  assert.equal(releaseCounterLock(b), true, 'the true owner releases');
  assert.equal(acquireCounterLock({ lockPath: p }).ok, true, 'the path is free again');
});

check('release tolerates a vanished lock and refuses a handle with no token', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(releaseCounterLock(a), true);
  assert.equal(releaseCounterLock(a), false, 'releasing an already-gone lock reports false, not a throw');
  assert.equal(releaseCounterLock({ path: p }), false, 'a tokenless handle must never blind-unlink');
  assert.equal(releaseCounterLock(undefined), false);
});

check('PORTABILITY: ownership survives the Windows fstat/stat dev divergence', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // Measured on Windows 2026-08-13: fstatSync reports dev=1417332449 while
  // statSync reports dev=0 for the SAME file. A dev comparison therefore made the
  // true owner unable to release its own lock — and would have passed on Linux.
  const viaFstat = a.dev;
  const viaStat = statSync(p).dev;
  if (viaFstat !== viaStat) {
    assert.equal(releaseCounterLock(a), true, 'dev divergence must not block the real owner');
  } else {
    assert.equal(releaseCounterLock(a), true);
  }
  assert.equal(readLockHolder(p), null, 'lock is gone after a successful release');
});

check('an UNSTATTABLE lock is UNKNOWN, and unknown is never stale', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // Mutation vantage found this unguarded: with `ageMs === null` treated as
  // stale, a lock we merely failed to stat gets stolen from a live holder.
  const blindStat = () => { throw new Error('EIO'); };
  const b = acquireCounterLock({ lockPath: p, statFn: blindStat });
  assert.equal(b.ok, false, 'a lock we cannot measure must not be reclaimed');
  assert.equal(b.reason, 'contention');
  assert.equal(readLockHolder(p).token, a.token, 'the live holder keeps its lock');
});

check('token mismatch alone blocks release, even when the inode is unchanged', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // The S2 test above passes on the INODE check alone, so a mutant that drops the
  // token comparison survived it. Rewriting the lock in place keeps the inode and
  // changes only the token — which is what an in-place re-claim looks like.
  writeFileSync(p, JSON.stringify({ pid: 1, token: 'a-different-token', ts: Date.now() }), 'utf8');
  assert.equal(releaseCounterLock(a), false, 'the token is the identity, not the path');
  assert.equal(readLockHolder(p).token, 'a-different-token', "the other holder's lock survives");
});

check('a corrupted lock file cannot be released by a stale handle', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  writeFileSync(p, 'NOT JSON', 'utf8');
  assert.equal(releaseCounterLock(a), false, 'an unparseable holder record is not proof of ownership');
  assert.equal(readFileSync(p, 'utf8'), 'NOT JSON', 'and the file is left alone');
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
```
