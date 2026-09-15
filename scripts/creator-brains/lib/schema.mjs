#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/schema.mjs
 * PURPOSE: One strict, schema-validated store reader used by every command and
 *          helper — so a damaged file is a NAMED failure, never a silent empty.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair, HR04/HR05)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS EXISTS (reproduced defects HR04 and HR05):
 *   The old reader collapsed "no file yet" and "the file is broken" into the
 *   same `null`, and every caller substituted an empty default. Two probes:
 *     - a `state.json` containing valid JSON `null` became an empty state map in
 *       a run that reported `ok: true`, and the run then WROTE that emptiness
 *       back over the damaged file;
 *     - calling `discoverChannel` directly replaced an unparseable `{bad` file
 *       with an empty map — the preflight guard only covered `runDaily`.
 *   The guard was syntax-only and lived in one caller, so it protected one path
 *   and missed the rest.
 *
 * THE RULE THIS FILE ENFORCES:
 *   Absent is a first run. Everything else — unparseable, wrong shape, wrong
 *   version, invalid rows — is a NAMED failure that carries the original bytes'
 *   fate. No caller may substitute a default for a failed read, and no caller
 *   may write over a file this module rejected.
 *
 * @module creator-brains/schema
 */

import { readFileSync } from 'node:fs';

/** Statuses a read can return. `absent` is the ONLY benign non-ok status. */
export const READ = Object.freeze({
  ABSENT: 'absent',
  OK: 'ok',
  CORRUPT: 'corrupt', // present, unparseable
  INVALID: 'invalid', // parses, fails shape validation
  UNSUPPORTED: 'unsupported', // parses, but a version we do not understand
  UNREADABLE: 'unreadable', // present, could not be read at all
});

export const SUPPORTED_VERSION = 1;

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Read + parse, WITHOUT validating shape. Never throws. */
export function readRaw(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return { status: READ.ABSENT, path, raw: null, value: null, errors: [] };
    return { status: READ.UNREADABLE, path, raw: null, value: null, errors: [`${e.code || 'error'}: ${e.message}`] };
  }
  try {
    return { status: READ.OK, path, raw, value: JSON.parse(raw), errors: [] };
  } catch (e) {
    return { status: READ.CORRUPT, path, raw, value: null, errors: [`invalid JSON: ${e.message}`] };
  }
}

/** Wrap a parsed-but-invalid document so the message names the shape problem. */
function invalid(path, raw, errors) {
  return { status: READ.INVALID, path, raw, value: null, errors };
}

function checkVersion(doc, path, raw, errors) {
  const v = doc.version;
  if (v === undefined) return null;
  if (!Number.isInteger(v) || v < 1) {
    errors.push(`version must be a positive integer, got ${JSON.stringify(v)}`);
    return invalid(path, raw, errors);
  }
  if (v > SUPPORTED_VERSION) {
    errors.push(`unsupported version ${v} (this build understands up to ${SUPPORTED_VERSION})`);
    return { status: READ.UNSUPPORTED, path, raw, value: null, errors };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/**
 * Validate a registry document.
 * Creator rows are OWNER-CONTROLLED state (enable choices, labels, discovery
 * bookkeeping), so every field is checked rather than coerced.
 */
export function validateRegistry(doc, path, raw) {
  const errors = [];
  if (!isPlainObject(doc)) return invalid(path, raw, ['registry must be an object']);
  const ver = checkVersion(doc, path, raw, errors);
  if (ver) return ver;
  if (!isPlainObject(doc.creators)) return invalid(path, raw, ['registry.creators must be an object map']);

  for (const [key, row] of Object.entries(doc.creators)) {
    if (!CHANNEL_ID.test(key)) { errors.push(`creators['${key}']: key is not a channel id`); continue; }
    if (!isPlainObject(row)) { errors.push(`creators['${key}']: row must be an object`); continue; }
    if (row.channelId !== key) errors.push(`creators['${key}']: channelId '${row.channelId}' does not match its key`);
    if (row.enabled !== undefined && typeof row.enabled !== 'boolean') errors.push(`creators['${key}'].enabled must be a boolean`);
    if (row.title !== undefined && row.title !== null && typeof row.title !== 'string') errors.push(`creators['${key}'].title must be a string`);
  }
  if (errors.length) return invalid(path, raw, errors);
  return { status: READ.OK, path, raw, value: doc, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Video state map
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const STATE_ENUM = new Set([
  'pending', 'fetched', 'no_track_confirmed', 'no_track_retry', 'unavailable',
  'failed_transient', 'failed_permanent', 'deleted_upstream', 'missing_document',
]);

/**
 * Validate a video state map. Rows carry the retry schedule and content
 * identity, so a coerced field here silently changes acquisition behaviour.
 */
export function validateState(doc, path, raw) {
  const errors = [];
  if (!isPlainObject(doc)) return invalid(path, raw, ['state must be an object']);
  const ver = checkVersion(doc, path, raw, errors);
  if (ver) return ver;
  if (!isPlainObject(doc.videos)) return invalid(path, raw, ['state.videos must be an object map']);

  for (const [key, row] of Object.entries(doc.videos)) {
    const where = `videos['${key}']`;
    if (!VIDEO_ID.test(key)) { errors.push(`${where}: key is not a video id`); continue; }
    if (!isPlainObject(row)) { errors.push(`${where}: row must be an object`); continue; }
    if (row.videoId !== key) errors.push(`${where}: videoId '${row.videoId}' does not match its key`);
    if (!CHANNEL_ID.test(String(row.channelId || ''))) errors.push(`${where}: channelId is not a channel id`);
    if (!STATE_ENUM.has(row.state)) errors.push(`${where}: unknown state '${row.state}'`);
    if (row.attempts !== undefined && (!Number.isInteger(row.attempts) || row.attempts < 0)) {
      errors.push(`${where}: attempts must be a non-negative integer`);
    }
    if (row.nextRetryAt !== undefined && row.nextRetryAt !== null && !Number.isFinite(Date.parse(row.nextRetryAt))) {
      errors.push(`${where}: nextRetryAt is not a timestamp`);
    }
    if (row.missingStreak !== undefined && (!Number.isInteger(row.missingStreak) || row.missingStreak < 0)) {
      errors.push(`${where}: missingStreak must be a non-negative integer`);
    }
  }
  if (errors.length) return invalid(path, raw, errors.slice(0, 20));
  return { status: READ.OK, path, raw, value: doc, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canary history
// ─────────────────────────────────────────────────────────────────────────────

export function validateCanary(doc, path, raw) {
  const errors = [];
  if (!Array.isArray(doc)) return invalid(path, raw, ['canary history must be an array']);
  for (const [i, row] of doc.entries()) {
    if (!isPlainObject(row)) { errors.push(`canary[${i}] must be an object`); continue; }
    if (typeof row.ok !== 'boolean') errors.push(`canary[${i}].ok must be a boolean`);
  }
  if (errors.length) return invalid(path, raw, errors.slice(0, 20));
  return { status: READ.OK, path, raw, value: doc, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATORS = {
  registry: validateRegistry,
  state: validateState,
  canary: validateCanary,
};

/** Strict read of a named store document. Never throws, never substitutes. */
export function readStore(kind, path) {
  const validator = VALIDATORS[kind];
  if (!validator) throw new Error(`no validator for store kind '${kind}'`);
  const raw = readRaw(path);
  if (raw.status !== READ.OK) return raw;
  return validator(raw.value, path, raw.raw);
}

/** True only for a read that may be treated as "nothing here yet". */
export function isAbsent(read) {
  return read.status === READ.ABSENT;
}

/** True when the caller MUST refuse to write over this file. */
export function isDamaged(read) {
  return read.status !== READ.OK && read.status !== READ.ABSENT;
}

/** A one-line reason suitable for a digest or a CLI refusal. */
export function describe(read) {
  if (read.status === READ.OK) return 'ok';
  if (read.status === READ.ABSENT) return 'absent (first run)';
  return `${read.status}: ${(read.errors || []).join('; ') || 'unknown'}`;
}

/**
 * The default value for an ABSENT file only. Calling this on a damaged read is a
 * programming error, and it throws — that is the whole point of the module.
 */
export function defaultValue(read, fallback) {
  if (read.status === READ.OK) return read.value;
  if (read.status === READ.ABSENT) return fallback;
  throw new Error(`refusing to substitute a default for a ${read.status} store file: ${describe(read)}`);
}
