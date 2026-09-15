#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/docs.mjs
 * PURPOSE: Lane B — the durable transcript documents: their identity hash,
 *          their validation, and their atomic write.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR04/11/17)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THIS IS THE TIER BOUNDARY. Everything in this module reads or writes
 * owner-private transcript text. `export.mjs` does not import it, and neither
 * does anything on the publication path — the fidelity gate receives raw source
 * text as an ARGUMENT rather than fetching it.
 *
 * WHY IT IS SEPARATE FROM store.mjs:
 *   Rule 4's 300-line cap, and a real seam: `store.mjs` owns the maps and the
 *   run bookkeeping, this module owns the documents. Re-exported from
 *   `store.mjs` so that module stays the single import surface for the store.
 *
 * THE TWO FIXES THAT LIVE HERE:
 *   HR11 — `docHash` covers cue text AND timings AND the joined `text`, and the
 *     prior hash is RECOMPUTED from the stored bytes before it is trusted, so a
 *     tampered document is repaired rather than reported unchanged.
 *   HR17 — `listDocsChecked` partitions documents into valid and invalid; a
 *     caller cannot obtain an unvalidated list, which is how an unusable
 *     document used to be counted as read.
 *
 * @module creator-brains/docs
 */

import { createHash } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  listDir, nowIso, paths, readJson, writeJsonAtomic,
} from './paths.mjs';

/** Schema version of a stored transcript document. Bump when the shape changes. */
export const DOC_SCHEMA_VERSION = 2;

/** Where a video's durable transcript document lives. Channel-partitioned so a
 *  per-creator purge is a single directory delete. */
export function docPath(r, channelId, videoId) {
  return join(paths(r).docsDir, channelId || 'unknown', `${videoId}.json`);
}
export function readDoc(r, channelId, videoId) {
  return readJson(docPath(r, channelId, videoId), null);
}

/** Deterministic JSON: object keys sorted, so the hash is stable across writers. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * The canonical payload a document's identity is derived from — cue TEXT and
 * TIMINGS, the joined `text`, language, provenance and schema version. Fetch
 * metadata (when we fetched, which run) is deliberately excluded: it changes on
 * every attempt and would make every unchanged document look new.
 *
 * `text` is included even though it is derived from `cues`, because it IS
 * persisted and it IS what the extractor tokenizes for the topic map. Leaving it
 * out meant a document whose `text` was tampered with still hashed to its stored
 * value, so a correct refetch reported `unchanged` and the damaged text stayed —
 * the second half of review finding HR11, found by the regression test for it.
 */
export function docPayload(doc) {
  return {
    v: DOC_SCHEMA_VERSION,
    videoId: doc.videoId,
    channelId: doc.channelId,
    language: doc.language ?? null,
    source: doc.source ?? null,
    originalTrack: doc.originalTrack === true,
    text: String(doc.text ?? ''),
    cues: (doc.cues || []).map((c) => [Number(c && c.ms), String((c && c.text) || '')]),
  };
}

/** sha256 over the canonical payload (review HR11). */
export function docHash(doc) {
  return createHash('sha256').update(canonicalJson(docPayload(doc)), 'utf-8').digest('hex').slice(0, 32);
}

/** Does this document have a shape we can trust? Returns a list of problems. */
export function validateDoc(doc, { channelId = null, videoId = null } = {}) {
  const problems = [];
  if (!doc || typeof doc !== 'object') return ['document is not an object'];
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(doc.videoId || ''))) problems.push('videoId is not a video id');
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(String(doc.channelId || ''))) problems.push('channelId is not a channel id');
  if (channelId && doc.channelId !== channelId) problems.push(`document belongs to ${doc.channelId}, not ${channelId}`);
  if (videoId && doc.videoId !== videoId) problems.push(`document is for ${doc.videoId}, not ${videoId}`);
  if (!Array.isArray(doc.cues) || doc.cues.length === 0) problems.push('no cues');
  else {
    let last = -1;
    for (let i = 0; i < doc.cues.length; i += 1) {
      const cue = doc.cues[i];
      const ms = Number(cue && cue.ms);
      if (!Number.isFinite(ms) || ms < 0) { problems.push(`cue ${i} has a non-finite or negative time`); break; }
      if (ms < last) { problems.push(`cue ${i} is out of order`); break; }
      last = ms;
      if (typeof cue.text !== 'string' || !cue.text.trim()) { problems.push(`cue ${i} has no text`); break; }
    }
  }
  if (typeof doc.text !== 'string' || !doc.text.trim()) problems.push('no text');
  if (doc.schemaVersion !== undefined && doc.schemaVersion !== DOC_SCHEMA_VERSION) {
    problems.push(`unsupported document schema ${doc.schemaVersion}`);
  }
  return problems;
}

/**
 * Persist a transcript document.
 *
 * Idempotent by CANONICAL PAYLOAD hash (HR11): a re-fetch that changes only a
 * cue's timing, the language or the provenance is a real change and IS written.
 * The prior hash is recomputed from the stored bytes rather than trusted, so a
 * tampered document cannot masquerade as current.
 *
 * Revision entries state what they preserve — identity and shape, NOT the
 * replaced bytes. The earlier comment implied recoverability; a hash is not a
 * backup, and saying so is the point (review HR25).
 */
export function writeDoc(r, doc) {
  const p = docPath(r, doc.channelId, doc.videoId);
  const payloadHash = docHash(doc);
  const prior = readJson(p, null);

  if (prior && prior.videoId === doc.videoId) {
    const priorRecomputed = docHash(prior);
    const revisions = (Array.isArray(prior.revisions) ? prior.revisions : []).slice(-20);

    if (priorRecomputed !== prior.contentHash) {
      revisions.push({
        reason: 'stored_hash_mismatch',
        claimedHash: prior.contentHash ?? null,
        recomputedHash: priorRecomputed,
        replacedAt: doc.fetchedAt || nowIso(),
      });
      writeJsonAtomic(p, { ...doc, schemaVersion: DOC_SCHEMA_VERSION, contentHash: payloadHash, revisions });
      return { path: p, hash: payloadHash, wrote: true, reason: 'repaired_tampered_document' };
    }
    if (prior.contentHash === payloadHash) {
      return { path: p, hash: payloadHash, wrote: false, reason: 'unchanged' };
    }
    revisions.push({
      preserves: 'hash-and-shape-only',
      contentHash: prior.contentHash,
      chars: prior.chars ?? null,
      cueCount: prior.cueCount ?? null,
      replacedAt: doc.fetchedAt || nowIso(),
    });
    writeJsonAtomic(p, { ...doc, schemaVersion: DOC_SCHEMA_VERSION, contentHash: payloadHash, revisions });
    return { path: p, hash: payloadHash, wrote: true, reason: 'updated' };
  }

  writeJsonAtomic(p, {
    ...doc, schemaVersion: DOC_SCHEMA_VERSION, contentHash: payloadHash, revisions: [],
  });
  return { path: p, hash: payloadHash, wrote: true, reason: 'created' };
}

export function docExists(r, channelId, videoId) {
  return existsSync(docPath(r, channelId, videoId));
}

/** Read one document and validate it against its namespace. Returns
 *  `{ ok, doc, problems }` — callers MUST handle `ok: false` (review HR17). */
export function readValidDoc(r, channelId, videoId) {
  const doc = readJson(docPath(r, channelId, videoId), null);
  if (!doc) return { ok: false, doc: null, problems: ['document is missing'] };
  const problems = validateDoc(doc, { channelId, videoId });
  return { ok: problems.length === 0, doc, problems };
}

export function listDocs(r, { channelId = null } = {}) {
  const base = paths(r).docsDir;
  const channels = channelId ? [channelId] : listDir(base);
  const out = [];
  for (const ch of channels) {
    for (const file of listDir(join(base, ch))) {
      if (!file.endsWith('.json')) continue;
      const doc = readJson(join(base, ch, file), null);
      if (doc && doc.videoId) out.push(doc);
    }
  }
  return out;
}

/** Every document for one creator, partitioned by validity (review HR17). */
export function listDocsChecked(r, channelId) {
  const dir = join(paths(r).docsDir, channelId);
  const valid = [];
  const invalid = [];
  for (const file of listDir(dir)) {
    if (!file.endsWith('.json')) continue;
    const videoId = file.replace(/\.json$/, '');
    const doc = readJson(join(dir, file), null);
    if (!doc) { invalid.push({ videoId, problems: ['unreadable or invalid JSON'] }); continue; }
    const problems = validateDoc(doc, { channelId, videoId });
    if (problems.length) invalid.push({ videoId, problems });
    else valid.push(doc);
  }
  return { valid, invalid };
}

/** Delete every stored document for one creator. The deletion cascade's first
 *  step — a creator removed from the registry must take its Lane B text with it. */
export function purgeCreatorDocs(r, channelId) {
  const dir = join(paths(r).docsDir, channelId);
  let n = 0;
  for (const file of listDir(dir)) {
    try { unlinkSync(join(dir, file)); n += 1; } catch { /* best effort */ }
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ownership manifest (HR08, HR25)
// ─────────────────────────────────────────────────────────────────────────────
