/**
 * spineLib.mjs — durable, single-writer, tamper-evident append primitives for the
 * Hermes runs/ lane (E2 spine hardening — closes G-2 / G-3 / G-6).
 *
 *  G-2 single-writer: withLock() serializes id-allocation + append across
 *      PROCESSES. Acquisition is ALWAYS an atomic O_EXCL create (openSync 'wx') —
 *      the sole mutual-exclusion gate. A stale lock is broken only if it is older
 *      than staleMs AND its holder pid is dead (process.kill(pid,0) → ESRCH), via
 *      a guarded unlink re-checked against the same inode/mtime immediately
 *      before removal; release is inode-safe (only unlinks a lock still carrying
 *      OUR pid). A live-but-slow holder (GC pause, laptop sleep) is never stolen.
 *      Documented residuals, both fail CLOSED (a loud lock-timeout, never a
 *      silent double-writer, and any resulting fork is caught by the G-3 chain):
 *      a microsecond decide→unlink window, and pid-reuse making a hard-crashed
 *      holder's lock look live until the recycled pid exits.
 *  G-3 tamper-evidence: chainedAppend() links every record to SHA-256 of the
 *      previous raw line (`prev`); verifyChain() reports the first break. A
 *      monotonic `.head` anchor catches crash-truncation, torn tails, and
 *      last-line edits while the anchor is intact, and stops verify-chain's own
 *      in-stream receipt from healing a pure truncation.
 *  G-6 durability: durableAppend() fsyncs (+ parent dir on file create);
 *      atomicWriteFileSync() is temp + fsync + rename (retried on Windows EPERM);
 *      a torn crash-append (no trailing newline) is truncated back before the
 *      next append so it can never merge into a subsequent legit record.
 *
 * Threat model (honest — hardened against adversarial review):
 *  - The prev-chain is the SOUND, self-contained guarantee: it detects any edit,
 *    reorder, or deletion of a MIDDLE line, and mid-stream corruption.
 *  - The `.head` anchor is a BEST-EFFORT heuristic: it catches crash-truncation,
 *    torn tails, and last-line edits WHILE the anchor is intact. It is NOT a
 *    defense against an attacker with vault WRITE access, who can (a) append
 *    correctly-prev-chained forged records — a later legit append re-anchors them
 *    clean — or (b) delete the `.head` then truncate. Un-anchored trailing lines
 *    are surfaced as WARNINGS (never a silent clean OK), but a warning can be
 *    cleared by subsequent writes.
 *  - Forgery-resistance against a write-capable attacker and anchor-deletion
 *    detection require an EXTERNAL, tamper-resistant anchor (a signed / off-box
 *    daily head-hash) — that is E4 / hermes-doctor's job, not this self-contained
 *    module's. E2 delivers the sound prev-chain + an honest heuristic anchor.
 *
 * Pure local file I/O — no LLM, no network, no product DB, no shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const GENESIS = 'GENESIS';
const LOCK_TIMEOUT_MS = 8000;
const LOCK_STALE_MS = 30000;
const LOCK_POLL_MS = 15;
const RENAME_RETRIES = 20;

// Re-entrancy within THIS process: a nested withLock on the same path (e.g.
// writeReceipt holds receiptsFile.lock, then chainedAppend re-acquires it) must
// not self-deadlock. Cross-process exclusion is still the OS lockfile.
const _held = new Map(); // lockPath -> depth

/** Synchronous sleep without a hot CPU spin (used only under lock contention). */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function lockHolderPid(lockPath) {
  try { return Number(fs.readFileSync(lockPath, 'utf8').trim()) || null; } catch { return null; }
}

/** true if pid is (probably) alive. ESRCH = dead; EPERM = alive under another user. */
function pidAlive(pid) {
  if (!pid || !Number.isInteger(pid)) return false; // unknown owner + already-stale ⇒ breakable
  try { process.kill(pid, 0); return true; }
  catch (err) { return err.code === 'EPERM'; }
}

/**
 * Break a lock ONLY if it is stale AND its holder pid is dead. Guarded: re-stat
 * immediately before unlink and remove only if it is still the SAME inode+mtime
 * we judged dead, so a fresh lock created in the meantime is never removed.
 * O_EXCL acquisition (in withLock) remains the sole exclusion gate regardless.
 */
function breakIfStaleDead(lockPath, staleMs) {
  let st;
  try { st = fs.statSync(lockPath); } catch { return; } // vanished — the next openSync will win
  if (Date.now() - st.mtimeMs <= staleMs) return;        // fresh — never break
  if (pidAlive(lockHolderPid(lockPath))) return;         // live holder — never break
  try {
    const again = fs.statSync(lockPath);
    if (again.mtimeMs === st.mtimeMs && again.ino === st.ino) fs.unlinkSync(lockPath);
  } catch { /* already gone / replaced — leave it, O_EXCL will arbitrate */ }
}

export function withLock(lockPath, fn, { timeoutMs = LOCK_TIMEOUT_MS, staleMs = LOCK_STALE_MS } = {}) {
  const depth = _held.get(lockPath) || 0;
  if (depth > 0) {
    _held.set(lockPath, depth + 1);
    try { return fn(); } finally { _held.set(lockPath, _held.get(lockPath) - 1); }
  }
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const start = Date.now();
  let fd = null;
  for (;;) {
    if (Date.now() - start > timeoutMs) throw new Error(`lock timeout after ${timeoutMs}ms: ${lockPath}`);
    try { fd = fs.openSync(lockPath, 'wx'); fs.writeSync(fd, String(process.pid)); break; } // O_EXCL create = acquire (sole gate)
    catch (err) {
      if (err.code !== 'EEXIST') throw err;
      breakIfStaleDead(lockPath, staleMs);
      sleepMs(LOCK_POLL_MS);
    }
  }
  _held.set(lockPath, 1);
  try { return fn(); }
  finally {
    _held.delete(lockPath);
    try { fs.closeSync(fd); } catch { /* already closed */ }
    // Inode-safe release: never remove a lock a DIFFERENT process now holds
    // (possible only after a stale-break replaced the path under us).
    try { if (lockHolderPid(lockPath) === process.pid) fs.unlinkSync(lockPath); } catch { /* already gone */ }
  }
}

/** Best-effort fsync of a file's parent directory so a create/rename is durable (no-op on Windows). */
function fsyncDir(file) {
  try {
    const dfd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch { /* Windows / EPERM / EISDIR — directory fsync unsupported */ }
}

/** Append `data` and fsync so a completed write survives a power cut (G-6). */
export function durableAppend(file, data) {
  const isNew = !fs.existsSync(file);
  const fd = fs.openSync(file, 'a');
  try { fs.writeSync(fd, data); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  if (isNew) fsyncDir(file);
}

function renameWithRetry(src, dst) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(src, dst); return; }
    catch (err) {
      // Windows: a concurrent reader's open handle on dst can block the replace.
      if ((err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') && i < RENAME_RETRIES) { sleepMs(10); continue; }
      throw err;
    }
  }
}

/** Whole-file write that is atomic on crash: temp + fsync + rename-replace (G-6). */
export function atomicWriteFileSync(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, data); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  renameWithRetry(tmp, file);
  fsyncDir(file);
}

export function hashLine(line) {
  return crypto.createHash('sha256').update(line, 'utf8').digest('hex');
}

function headPath(file) { return `${file}.head`; }
function readAnchor(file) {
  try { return JSON.parse(fs.readFileSync(headPath(file), 'utf8')); } catch { return null; }
}

function readLines(file) {
  if (!fs.existsSync(file)) return { lines: [] };
  return { lines: fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length > 0) };
}

/** Drop an incomplete trailing fragment (a crash mid-append with no newline) so it
 *  can never merge into the next legit record. Recovery, not tampering. */
function repairTornTail(file) {
  let buf;
  try { buf = fs.readFileSync(file); } catch { return; }
  if (buf.length === 0 || buf[buf.length - 1] === 0x0a) return; // ends in \n — clean
  fs.truncateSync(file, buf.lastIndexOf(0x0a) + 1); // 0 when there is no newline at all
}

/**
 * Append `record` with a prev-hash link + durable write + MONOTONIC head anchor,
 * all under the file's lock. Returns the stored record (record + prev). MUST be
 * the only append path for a chained stream, or the chain breaks.
 */
export function chainedAppend(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withLock(`${file}.lock`, () => {
    repairTornTail(file);
    const { lines } = readLines(file);
    const prev = lines.length ? hashLine(lines[lines.length - 1]) : GENESIS;
    const stored = { ...record, prev };
    const line = JSON.stringify(stored);
    durableAppend(file, `${line}\n`);
    // Anchor count = "lines ever durably appended". If the recorded count is BEHIND
    // the file (recorded < lines) it is a crash that skipped an anchor write → catch
    // up to the exact new length. If it is AHEAD (recorded > lines) the file was
    // TRUNCATED → keep the count ahead so the truncation stays flagged forever and a
    // later write (incl. verify-chain's own receipt) can never heal it.
    const recorded = readAnchor(file)?.count ?? 0;
    const count = recorded >= lines.length ? recorded + 1 : lines.length + 1;
    atomicWriteFileSync(headPath(file), `${JSON.stringify({ count, head: hashLine(line) })}\n`);
    return stored;
  });
}

/**
 * Walk a chained stream and report the first integrity break.
 * Returns { ok, file, count, head, breakAt?, reason?, recoverable?, warn? }.
 */
export function verifyChain(file) {
  if (!fs.existsSync(file)) return { ok: true, file, count: 0, head: GENESIS };
  // Read the anchor BEFORE the log: a concurrent append can then only leave the
  // anchor BEHIND the log (a benign lag-warn), never AHEAD (a false TRUNCATED).
  const anchor = readAnchor(file);
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length > 0);
  let expectedPrev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    let rec;
    try { rec = JSON.parse(lines[i]); }
    catch {
      if (i === lines.length - 1) return { ok: false, file, breakAt: i + 1, recoverable: true, reason: 'torn final line (incomplete crash-append) — repaired on next write' };
      return { ok: false, file, breakAt: i + 1, reason: `line ${i + 1} is unparseable (corrupted mid-stream)` };
    }
    if (rec.prev !== expectedPrev) {
      return { ok: false, file, breakAt: i + 1, reason: `chain break at line ${i + 1}: prev mismatch (a prior line was edited, reordered, or removed)` };
    }
    expectedPrev = hashLine(lines[i]);
  }
  const result = { ok: true, file, count: lines.length, head: lines.length ? expectedPrev : GENESIS };
  if (anchor && typeof anchor.count === 'number') {
    if (anchor.count > lines.length) {
      return { ok: false, file, breakAt: lines.length + 1, reason: `TRUNCATED: head anchor recorded ${anchor.count} lines, file has ${lines.length}` };
    }
    if (anchor.count === lines.length && anchor.head !== result.head) {
      return { ok: false, file, breakAt: lines.length, reason: 'last line altered: head-anchor hash mismatch' };
    }
    if (anchor.count < lines.length) {
      // The last anchored line must still hash to the anchor, else a line beneath
      // the un-anchored tail was altered (hard break).
      if (anchor.count >= 1 && anchor.head !== hashLine(lines[anchor.count - 1])) {
        return { ok: false, file, breakAt: anchor.count, reason: 'anchored line altered beneath a trailing append' };
      }
      // Un-anchored trailing line(s): 1 = ordinary crash-lag; ≥2 = multi-crash, a
      // persistent .head-write failure, OR forgery — genuinely ambiguous, so a
      // loud WARN (never a clean OK), adjudicated by E4's external anchor.
      result.warn = `${lines.length - anchor.count} un-anchored trailing line(s) — crash-lag or an un-anchored append; E4's external anchor is authoritative`;
    }
  } else if (lines.length >= 1) {
    result.warn = 'head anchor missing/unreadable — truncation/forgery cannot be ruled out for this stream (E4 external anchor required)';
  }
  return result;
}
