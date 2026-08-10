/**
 * ============================================================================
 * FILE: mcp-lifecycle-leases.mjs
 * PURPOSE: Persist validated session leases and startup claims atomically.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores active leases, pending SessionStart claims,
 * sanitized incomplete-cleanup evidence, and per-owner lifecycle locks.
 * HOW IT FITS IN THE APP: Claude hooks -> lease registry -> cleanup safety gate.
 * KEY DECISIONS: Host-wide storage, atomic rename, and strict schema validation.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  lstatSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { MANAGED_LABELS } from './mcp-lifecycle-core.mjs';
import { rotateEvidenceDirectory, writeBoundedEvidence } from './mcp-lifecycle-evidence.mjs';
import { withOwnerFileLock } from './mcp-lifecycle-locks.mjs';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Stable hash of this repository path stored in sanitized lease evidence. */
export const CURRENT_SCOPE_ID = shortHash(REPO);
/** Host-wide production state, or a PID-scoped namespace under Node's test runner. */
export const CURRENT_STATE_DIR = process.env.NODE_TEST_CONTEXT
  ? join(tmpdir(), 'swan-mcp-lifecycle-tests', String(process.pid))
  : join(tmpdir(), 'swan-mcp-lifecycle', 'host-v2');
const LEASE_DIR = join(CURRENT_STATE_DIR, 'leases');
const PENDING_DIR = join(CURRENT_STATE_DIR, 'pending');
function boundedJsonNames(directory) {
  const names = readdirSync(directory).filter((name) => name.endsWith('.json'));
  if (names.length > 256 || names.some((name) => {
    const stat = lstatSync(join(directory, name));
    return !stat.isFile() || stat.size > 64 * 1024;
  })) throw new Error('lifecycle state bound exceeded');
  return names;
}

function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 20);
}
function validSessionId(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 256;
}
// SECTION: Schema and identity validation
// PURPOSE: Reject malformed hooks and lease state before it influences cleanup.
// WHY: Missing or corrupt concurrency state must never appear as no concurrency.

/** Validate a Claude hook event and return its bounded session identifier. */
export function validateHookInput(input, expectedEvent) {
  if (input?.hook_event_name !== expectedEvent) throw new Error('unexpected hook event');
  if (!validSessionId(input.session_id)) throw new Error('invalid session identifier');
  return input.session_id;
}
/** Return whether a validated lease belongs to the exact observed owner identity. */
export function leaseMatchesOwner(lease, owner) {
  return lease?.agentKind === 'claude'
    && lease.agentPid === owner.pid
    && lease.agentCreatedAt === owner.createdAt;
}
/** Prove one session is the only active or pending state for an owner, regardless of repo scope. */
export function sessionOwnsExclusiveState(sessionId, owner, current, activeLeases, pendingStarts, tombstones = []) {
  const ownerLeases = activeLeases.filter((item) => leaseMatchesOwner(item, owner));
  const ownerPending = pendingStarts.filter((item) => leaseMatchesOwner(item, owner));
  const quarantined = tombstones.some((item) => item?.ownerPid === owner?.pid
    && item.ownerCreatedAt === owner?.createdAt);
  return Boolean(current && leaseMatchesOwner(current, owner)
    && !quarantined
    && ownerLeases.every((item) => item.sessionId === sessionId)
    && ownerPending.length === 0);
}
/** Validate the full lease schema and optionally bind it to an expected session. */
export function validateLease(lease, expectedSessionId = null) {
  const keepValid = Array.isArray(lease?.keep)
    && lease.keep.every((name) => typeof name === 'string' && MANAGED_LABELS.has(name))
    && new Set(lease.keep).size === lease.keep.length;
  const rootsValid = Array.isArray(lease?.roots) && lease.roots.length <= 256
    && lease.roots.every((root) => Number.isInteger(root?.pid) && root.pid > 0
      && Number.isFinite(root.createdAt))
    && new Set(lease.roots.map((root) => `${root.pid}:${root.createdAt}`)).size === lease.roots.length;
  const valid = lease && typeof lease === 'object'
    && validSessionId(lease.sessionId)
    && typeof lease.scopeId === 'string' && /^[a-f0-9]{20}$/.test(lease.scopeId)
    && (expectedSessionId === null || lease.sessionId === expectedSessionId)
    && lease.agentKind === 'claude'
    && Number.isInteger(lease.agentPid) && lease.agentPid > 0
    && Number.isFinite(lease.agentCreatedAt)
    && keepValid
    && rootsValid
    && typeof lease.startedAt === 'string' && Number.isFinite(Date.parse(lease.startedAt));
  if (!valid) throw new Error('invalid lease state');
  return lease;
}
/** Parse serialized lease state without exposing its contents on failure. */
export function parseLeaseText(text, expectedSessionId = null) {
  try {
    return validateLease(JSON.parse(text), expectedSessionId);
  } catch {
    throw new Error('invalid lease state');
  }
}
/** Validate one expiring pre-lock SessionStart publication. */
export function validatePendingStart(value) {
  const valid = value && typeof value === 'object'
    && value.schemaVersion === 1 && validSessionId(value.sessionId)
    && typeof value.scopeId === 'string' && /^[a-f0-9]{20}$/.test(value.scopeId)
    && value.agentKind === 'claude'
    && Number.isInteger(value.agentPid) && value.agentPid > 0
    && Number.isFinite(value.agentCreatedAt)
    && Number.isInteger(value.holderPid) && value.holderPid > 0
    && Number.isFinite(value.holderCreatedAt)
    && Number.isFinite(value.publishedAt) && Number.isFinite(value.expiresAt)
    && value.expiresAt > value.publishedAt
    && typeof value.nonce === 'string' && /^[a-f0-9]{32}$/.test(value.nonce);
  if (!valid) throw new Error('invalid pending state');
  return value;
}

/** Build an exact-holder pending claim with a bounded expiry and nonce. */
export function nextPendingStart(sessionId, owner, holder, options = {}) {
  const publishedAt = Number.isFinite(options.now) ? options.now : Date.now();
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 30_000;
  return validatePendingStart({
    schemaVersion: 1, sessionId, scopeId: CURRENT_SCOPE_ID,
    agentKind: owner?.kind, agentPid: owner?.pid, agentCreatedAt: owner?.createdAt,
    holderPid: holder?.pid, holderCreatedAt: holder?.createdAt,
    publishedAt, expiresAt: publishedAt + ttlMs,
    nonce: options.nonce ?? randomBytes(16).toString('hex'),
  });
}

function parsePendingText(text) {
  try { return validatePendingStart(JSON.parse(text)); }
  catch { throw new Error('invalid pending state'); }
}

/** Prove a pending record is unchanged, expired, and its exact holder is dead. */
export function canQuarantinePending(before, current, processes, now = Date.now()) {
  validatePendingStart(before);
  validatePendingStart(current);
  if (before.nonce !== current.nonce || current.expiresAt > now) return false;
  const occupant = processes.find((item) => Number(item.pid ?? item.ProcessId) === current.holderPid);
  if (!occupant) return true;
  const createdAt = Number(occupant.createdAt ?? occupant.CreationDate);
  return Number.isFinite(createdAt) && createdAt !== current.holderCreatedAt;
}

/** Preserve a matching lease or create the initial lease for a new session. */
export function nextLease(existing, sessionId, owner, roots = []) {
  if (existing) {
    validateLease(existing, sessionId);
    if (!leaseMatchesOwner(existing, owner)) throw new Error('existing session lease identity mismatch');
    const known = new Map(existing.roots.map((root) => [`${root.pid}:${root.createdAt}`, root]));
    for (const root of roots) known.set(`${root.pid}:${root.createdAt}`, root);
    existing.roots = [...known.values()];
    return existing;
  }
  return {
    sessionId, agentKind: owner.kind, agentPid: owner.pid,
    agentCreatedAt: owner.createdAt, scopeId: CURRENT_SCOPE_ID,
    keep: [], roots: [...roots], startedAt: new Date().toISOString(),
  };
}

function leasePath(sessionId) {
  return join(LEASE_DIR, `${shortHash(sessionId)}.json`);
}
function pendingPath(sessionId) {
  return join(PENDING_DIR, `${shortHash(sessionId)}.json`);
}

function atomicWrite(target, value) {
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

// SECTION: Active and pending session state
// PURPOSE: Make concurrency visible before either hook waits on the owner lock.
// WHY: A pending SessionStart must block an older SessionEnd from mutating trees.

/** Atomically persist a fully validated active session lease. */
export function saveLease(lease) {
  validateLease(lease);
  atomicWrite(leasePath(lease.sessionId), lease);
}

/** Read and validate one active lease, returning null only when it is absent. */
export function readLease(sessionId) {
  if (!validSessionId(sessionId)) throw new Error('invalid session identifier');
  const path = leasePath(sessionId);
  if (!existsSync(path)) return null;
  return parseLeaseText(readFileSync(path, 'utf8'), sessionId);
}

/** Remove one ended active lease without affecting archived evidence. */
export function removeLease(sessionId) {
  if (!validSessionId(sessionId)) throw new Error('invalid session identifier');
  rmSync(leasePath(sessionId), { force: true });
}

/** Persist sanitized evidence for an incomplete cleanup attempt. */
export function archiveIncompleteLease(lease, result = null) {
  validateLease(lease);
  const directory = join(LEASE_DIR, 'evidence');
  const recordedAt = new Date().toISOString();
  const evidence = {
    sessionHash: shortHash(lease.sessionId), scopeId: lease.scopeId,
    ownerHash: shortHash(`${lease.agentPid}:${lease.agentCreatedAt}`),
    released: Number.isInteger(result?.released) ? result.released : 0,
    incomplete: Number.isInteger(result?.incomplete) ? result.incomplete : null,
    recordedAt,
  };
  writeBoundedEvidence(
    directory, `${shortHash(lease.sessionId)}-${Date.now()}-${process.pid}.json`, evidence,
  );
}

/** Read every active lease; any malformed sibling causes a fail-closed error. */
export function allLeases() {
  if (!existsSync(LEASE_DIR)) return [];
  return boundedJsonNames(LEASE_DIR).map((name) => {
    return parseLeaseText(readFileSync(join(LEASE_DIR, name), 'utf8'));
  });
}

/** Publish a pre-lock SessionStart claim so an ending session can see it. */
export function savePendingStart(lease) {
  validatePendingStart(lease);
  atomicWrite(pendingPath(lease.sessionId), lease);
}

/** Read one exact pending generation, returning null only when absent. */
export function readPendingStart(sessionId) {
  if (!validSessionId(sessionId)) throw new Error('invalid session identifier');
  const path = pendingPath(sessionId);
  return existsSync(path) ? parsePendingText(readFileSync(path, 'utf8')) : null;
}

/** Remove only the exact pending generation published by this hook. */
export function removePendingStart(sessionId, expectedNonce) {
  if (!validSessionId(sessionId)) throw new Error('invalid session identifier');
  const path = pendingPath(sessionId);
  if (!existsSync(path)) return false;
  const current = parsePendingText(readFileSync(path, 'utf8'));
  if (current.nonce !== expectedNonce) return false;
  rmSync(path, { force: true });
  return true;
}

/** Move one exact expired/dead-holder pending record out of active enumeration. */
export function quarantinePendingStart(sessionId, before, processes, now = Date.now()) {
  const current = readPendingStart(sessionId);
  if (!current || !canQuarantinePending(before, current, processes, now)) return false;
  const directory = join(LEASE_DIR, 'pending-quarantine');
  mkdirSync(directory, { recursive: true });
  const target = join(directory, `${shortHash(sessionId)}-${current.nonce}.json`);
  renameSync(pendingPath(sessionId), target);
  rotateEvidenceDirectory(directory);
  return true;
}

/** Read every pending startup claim; malformed state fails closed. */
export function allPendingStarts() {
  if (!existsSync(PENDING_DIR)) return [];
  return boundedJsonNames(PENDING_DIR).map((name) => {
    return parsePendingText(readFileSync(join(PENDING_DIR, name), 'utf8'));
  });
}

function withNamedOwnerLock(owner, purpose, action, waitMs) {
  if (owner?.kind !== 'claude' || !Number.isInteger(owner.pid) || !Number.isFinite(owner.createdAt)) {
    throw new Error('valid Claude owner required');
  }
  return withOwnerFileLock(
    LEASE_DIR, shortHash(`${owner.pid}:${owner.createdAt}`), purpose, action, waitMs,
  );
}

/** Run an action while holding the lifecycle lock for one exact owner identity. */
export function withOwnerLock(owner, action, waitMs = 12_000) {
  return withNamedOwnerLock(owner, 'lifecycle', action, waitMs);
}

/** Serialize startup-claim publication against an entire SessionEnd cleanup. */
export function withOwnerStartupGate(owner, action, waitMs = 12_000) {
  return withNamedOwnerLock(owner, 'startup', action, waitMs);
}
