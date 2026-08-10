/**
 * ============================================================================
 * FILE: mcp-lifecycle-state.mjs
 * PURPOSE: Persist bounded fail-safe MCP lifecycle control state.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores and validates private dirty-latch state atomically.
 * HOW IT FITS IN THE APP: Lifecycle manager -> state root -> runtime mode gate.
 * KEY DECISIONS: Missing is clean; malformed is ambiguity and throws.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';

const DIRTY_REASONS = new Set(['release-started', 'state-ambiguous', 'journal-failed']);
const JOURNAL_KEYS = [
  'timestamp', 'mode', 'label', 'running', 'released', 'incomplete',
  'protected', 'result', 'reason',
];
const JOURNAL_REASONS = new Set([
  'mode-audit', 'release-complete', 'release-incomplete', 'state-ambiguous',
  'budget-low', 'journal-failed', 'concurrency', 'ownership', 'rearmed',
]);
const TOMBSTONE_REASONS = new Set(['audit-ended', 'release-incomplete', 'release-refused']);

function atomicText(target, text) {
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}
function atomicWrite(target, value) { atomicText(target, `${JSON.stringify(value)}\n`); }
function shortHash(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 20); }
function boundedText(path, maxBytes = 64 * 1024) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.size > maxBytes) throw new Error('lifecycle state bound exceeded');
  return readFileSync(path, 'utf8');
}
function boundedJsonNames(directory) {
  const names = readdirSync(directory).filter((name) => name.endsWith('.json'));
  if (names.length > 256) throw new Error('lifecycle state bound exceeded');
  return names;
}

function dirtyPath(root) { return join(root, 'dirty.json'); }
function clearDirtyLatch(root) { rmSync(dirtyPath(root), { force: true }); }

/** Persist the latch before entering an enforcement mutation boundary. */
export function writeDirtyLatch(root, reason) {
  if (!DIRTY_REASONS.has(reason)) throw new Error('invalid dirty reason');
  atomicWrite(dirtyPath(root), {
    schemaVersion: 1, dirty: true, reason, recordedAt: new Date().toISOString(),
  });
}

/** Return false only when absent; malformed latch state is fail-closed. */
export function readDirtyLatch(root) {
  const path = dirtyPath(root);
  if (!existsSync(path)) return false;
  try {
    const value = JSON.parse(boundedText(path, 16 * 1024));
    if (value?.schemaVersion !== 1 || value.dirty !== true
      || !DIRTY_REASONS.has(value.reason) || !Number.isFinite(Date.parse(value.recordedAt))) throw new Error();
    return true;
  } catch {
    throw new Error('invalid dirty latch');
  }
}

/** Keep enforcement dirty through release; clear only after durable clean evidence. */
export function runEnforcementTransaction(root, options) {
  if (typeof options?.release !== 'function' || typeof options?.journalEntry !== 'function') {
    throw new Error('enforcement transaction dependencies unavailable');
  }
  writeDirtyLatch(root, 'release-started');
  const result = options.release();
  if (!Number.isInteger(result?.released) || result.released < 0
    || !Number.isInteger(result?.incomplete) || result.incomplete < 0) {
    throw new Error('invalid release result');
  }
  appendJournal(root, options.journalEntry(result));
  if (result.incomplete === 0) clearDirtyLatch(root);
  return result;
}

/** Build the exact sanitized journal shape for one enforcement result. */
export function releaseJournalEntry(result, running, protectedCount) {
  const incomplete = result.incomplete > 0;
  return {
    timestamp: new Date().toISOString(), mode: 'enforce', label: 'playwright',
    running, released: result.released, incomplete: result.incomplete,
    protected: protectedCount, result: incomplete ? 'incomplete' : 'complete',
    reason: incomplete ? 'release-incomplete' : 'release-complete',
  };
}

/** Clear a dirty latch only after explicit approval, clean diagnostics, and a durable receipt. */
export function rearmDirtyLatch(root, options = {}) {
  if (options.approved !== true) throw new Error('rearm approval required');
  if (options.doctorClean !== true) throw new Error('clean doctor result required');
  if (readDirtyLatch(root) !== true) throw new Error('dirty latch unavailable');
  appendJournal(root, {
    timestamp: new Date().toISOString(), mode: 'audit', label: 'none',
    running: 0, released: 0, incomplete: 0, protected: 0,
    result: 'rearmed', reason: 'rearmed',
  });
  clearDirtyLatch(root);
}

function validateJournalEntry(entry) {
  const keys = Object.keys(entry || {}).sort();
  const counts = ['running', 'released', 'incomplete', 'protected'];
  const valid = keys.join(',') === [...JOURNAL_KEYS].sort().join(',')
    && Number.isFinite(Date.parse(entry.timestamp))
    && ['audit', 'enforce'].includes(entry.mode)
    && ['playwright', 'none'].includes(entry.label)
    && counts.every((key) => Number.isInteger(entry[key]) && entry[key] >= 0)
    && ['audit-only', 'complete', 'incomplete', 'refused', 'rearmed'].includes(entry.result)
    && JOURNAL_REASONS.has(entry.reason);
  if (!valid) throw new Error('invalid journal entry');
  return entry;
}

/** Append one sanitized record by atomically replacing a bounded NDJSON journal. */
export function appendJournal(root, entry, options = {}) {
  validateJournalEntry(entry);
  const maxBytes = Number.isInteger(options.maxBytes) ? options.maxBytes : 128 * 1024;
  const path = join(root, 'journal.ndjson');
  const previous = readJournal(root, maxBytes).map((item) => JSON.stringify(item));
  const lines = [...previous, JSON.stringify(entry)];
  while (lines.length > 1 && Buffer.byteLength(`${lines.join('\n')}\n`) > maxBytes) lines.shift();
  const text = `${lines.join('\n')}\n`;
  if (Buffer.byteLength(text) > maxBytes) throw new Error('journal entry exceeds bound');
  atomicText(path, text);
}

/** Validate every existing journal row before it can influence control state. */
export function readJournal(root, maxBytes = 128 * 1024) {
  const path = join(root, 'journal.ndjson');
  if (!existsSync(path)) return [];
  try {
    const text = boundedText(path, maxBytes).trim();
    if (!text) throw new Error();
    return text.split(/\r?\n/).map((line) => validateJournalEntry(JSON.parse(line)));
  } catch {
    throw new Error('invalid lifecycle journal');
  }
}

function validateTombstone(value) {
  const rootsValid = Array.isArray(value?.roots) && value.roots.length <= 256 && value.roots.every((item) =>
    Number.isInteger(item?.pid) && item.pid > 0 && Number.isFinite(item.createdAt));
  const valid = value?.schemaVersion === 1
    && typeof value.sessionHash === 'string' && /^[a-f0-9]{20}$/.test(value.sessionHash)
    && Number.isInteger(value.ownerPid) && value.ownerPid > 0
    && Number.isFinite(value.ownerCreatedAt) && rootsValid
    && TOMBSTONE_REASONS.has(value.reason)
    && Number.isFinite(Date.parse(value.recordedAt));
  if (!valid) throw new Error('invalid tombstone');
  return value;
}

function tombstonePath(root, value) {
  return join(root, 'tombstones', `${shortHash(`${value.ownerPid}:${value.ownerCreatedAt}`)}.json`);
}

function writeTombstone(root, value) {
  const directory = join(root, 'tombstones');
  const target = tombstonePath(root, value);
  let merged = validateTombstone(value);
  if (existsSync(target)) {
    const prior = validateTombstone(JSON.parse(boundedText(target)));
    if (prior.ownerPid !== value.ownerPid || prior.ownerCreatedAt !== value.ownerCreatedAt) {
      throw new Error('tombstone owner collision');
    }
    const roots = new Map(prior.roots.map((item) => [`${item.pid}:${item.createdAt}`, item]));
    for (const item of value.roots) roots.set(`${item.pid}:${item.createdAt}`, item);
    merged = validateTombstone({ ...value, roots: [...roots.values()] });
  }
  mkdirSync(directory, { recursive: true });
  atomicWrite(target, merged);
}

/** Read every tombstone; one malformed record makes the state ambiguous. */
export function readTombstones(root) {
  const directory = join(root, 'tombstones');
  if (!existsSync(directory)) return [];
  return boundedJsonNames(directory).map((name) => {
    try { return validateTombstone(JSON.parse(boundedText(join(directory, name)))); }
    catch { throw new Error('invalid tombstone'); }
  });
}

/** Return whether private state quarantines this exact owner generation. */
export function ownerHasTombstone(tombstones, owner) {
  return tombstones.some((item) => item.ownerPid === owner?.pid
    && item.ownerCreatedAt === owner?.createdAt);
}

function identityMayExist(processes, pid, createdAt) {
  const live = processes.find((item) => item.pid === pid);
  return Boolean(live && (!Number.isFinite(live.createdAt) || live.createdAt === createdAt));
}

/** Remove only tombstones whose exact owner and root generations are proven gone. */
export function pruneExitedTombstones(root, processes) {
  const tombstones = readTombstones(root);
  let removed = 0;
  for (const item of tombstones) {
    const ownerLive = identityMayExist(processes, item.ownerPid, item.ownerCreatedAt);
    const rootLive = item.roots.some((entry) => identityMayExist(processes, entry.pid, entry.createdAt));
    if (!ownerLive && !rootLive) {
      rmSync(tombstonePath(root, item), { force: true });
      removed += 1;
    }
  }
  return removed;
}

/** Persist and read back a tombstone before removing the ended active lease. */
export function recordTombstoneAndRemove(options) {
  const { root, lease, reason, removeLease, write = writeTombstone } = options;
  if (typeof removeLease !== 'function') throw new Error('lease remover required');
  const value = validateTombstone({
    schemaVersion: 1, sessionHash: shortHash(lease?.sessionId),
    ownerPid: lease?.agentPid, ownerCreatedAt: lease?.agentCreatedAt,
    roots: lease?.roots, reason, recordedAt: new Date().toISOString(),
  });
  write(root, value);
  const saved = readTombstones(root).find((item) => item.sessionHash === value.sessionHash);
  if (!saved) throw new Error('tombstone read-back failed');
  removeLease(lease.sessionId);
  return saved;
}

/** Return an honest sanitized status for the tombstone-before-removal transaction. */
export function tombstoneLeaseStatus(root, lease, reason, removeLease) {
  try {
    recordTombstoneAndRemove({ root, lease, reason, removeLease });
    return 'removed';
  } catch {
    return 'retained';
  }
}
