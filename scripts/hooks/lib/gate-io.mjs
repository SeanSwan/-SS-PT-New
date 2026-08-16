/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-io.mjs
 * PURPOSE: Filesystem primitives the gates read and write through — typed JSON
 *          reads, JSONL append/read/audit, atomic whole-file writes, hashing.
 * AUTHOR: Opus 5 | CREATED: 2026-08-16 (split from gate-common.mjs, Rule 4)
 * REVIEW:  Kimi K3 (S6, S8) + GLM-5.3 (Q5, Q8) — see each docblock.
 * ============================================================================
 *
 * These take explicit paths and know nothing about the trust root, so they are
 * safe to import from anywhere without dragging gate state along. The policy
 * decisions live with the callers; what is encoded here is that a caller must
 * be ABLE to tell missing from corrupt from unreadable, and damaged from empty.
 */
import {
  appendFileSync, closeSync, fsyncSync, mkdirSync, openSync,
  readFileSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

/**
 * Typed JSON read (Kimi S6). v1 collapsed missing/corrupt/unreadable into one
 * fallback, so an EACCES read as "no data yet" and fell open — while the
 * architecture requires fail-CLOSED on a corrupt counter.
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

/**
 * Collapse missing/corrupt/unreadable into one fallback.
 *
 * RENAMED from `readJsonOrDefault` (GLM Q8): the friendly name was a loaded
 * footgun. `readJsonOrDefault(counterPath(), {rounds: 0})` silently resets the
 * round counter to zero on a corrupt file — and `: > review-counter.json` is one
 * keystroke for the examinee. The name now states the hazard so no slice-2
 * author reaches for it at a decision site. Use `readJsonResult` there.
 */
export function readJsonUnsafeCollapse(path, fallback = null) {
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
  return auditJsonl(path).lines;
}

/**
 * GLM Q5: skip-malformed is right for availability and wrong as the ONLY
 * reader. On a channel whose silence is defined as the crash signal, damage and
 * death are the same event, so a consumer must be able to see that damage
 * occurred. Returns counts alongside the data; the crash detector should treat
 * `malformed > 0` as an alarm at least as loud as silence.
 * @returns {{lines:any[], malformed:number, status:'ok'|'missing'|'unreadable'}}
 */
export function auditJsonl(path) {
  const lines = [];
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    return { lines, malformed: 0, status: err?.code === 'ENOENT' ? 'missing' : 'unreadable' };
  }
  let malformed = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { lines.push(JSON.parse(line)); } catch { malformed += 1; }
  }
  return { lines, malformed, status: 'ok' };
}

/**
 * Atomic whole-file JSON write (Kimi S8 / amendment A4): temp-then-rename, so an
 * artifact either fully exists or does not.
 *
 * GLM Q8: `fsyncSync` added. NTFS journals metadata but flushes file data
 * lazily, so a power loss after the rename commits and before the data flush
 * left the target present and ZERO-LENGTH. Directory fsync does not exist on
 * Windows, so durability of the rename itself is the filesystem's problem; the
 * data flush is ours and is now done.
 */
export function writeJsonAtomic(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${randomUUID()}`;
  let fd;
  try {
    mkdirSync(dirname(path), { recursive: true });
    fd = openSync(tmp, 'wx');
    writeFileSync(fd, JSON.stringify(obj), 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(tmp, path);
    return true;
  } catch {
    if (fd !== undefined) { try { closeSync(fd); } catch { /* already closed */ } }
    try { unlinkSync(tmp); } catch { /* best effort */ }
    return false;
  }
}

/** sha256 of a file's bytes, or null if unreadable. */
export function fileSha256(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex'); } catch { return null; }
}
