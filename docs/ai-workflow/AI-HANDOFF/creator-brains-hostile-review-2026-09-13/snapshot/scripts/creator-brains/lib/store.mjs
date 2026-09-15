#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/store.mjs
 * PURPOSE: The two persistent maps the engine reasons over — the creator
 *          registry and the per-video state map — plus the transcript document
 *          reader/writer that owns the Lane B boundary.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S1)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * DESIGN NOTE — WHY PLANE JSON AND NOT SQLITE:
 *   The upstream plan puts this in Postgres. That is right for SwanGuard and
 *   wrong for this engine: a single owner, tens of thousands of rows, one
 *   writer, and a hard requirement that the bytes stay readable without a
 *   server. A JSON map per concern is atomic, diffable, and survives the
 *   machine being reinstalled. The seam is deliberate — `store.mjs` is the only
 *   module that knows the storage shape, so a later SQLite or Postgres backend
 *   is a rewrite of THIS file, not of the engine.
 *
 * THE ONE RULE THIS FILE ENFORCES:
 *   `writeDoc`/`readDoc` are the only functions that touch Lane B transcript
 *   text. `export.mjs` deliberately does not import this module (blueprint
 *   INV-4, CB-12) — the tier boundary is an import-graph fact, not a promise.
 *
 * @module creator-brains/store
 */

import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  contentHash, ensureDir, listDir, nowIso, paths, readJson, readJsonl, readJsonStrict, appendJsonl,
  writeJsonAtomic, writeTextAtomic,
} from './paths.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Registry — the creator catalog
// ─────────────────────────────────────────────────────────────────────────────

export function loadRegistry(r) {
  const doc = readJson(paths(r).registry, null);
  if (!doc || typeof doc !== 'object') return { version: 1, creators: {} };
  return { version: doc.version || 1, creators: doc.creators && typeof doc.creators === 'object' ? doc.creators : {} };
}

export function saveRegistry(reg, r) {
  return writeJsonAtomic(paths(r).registry, { version: 1, creators: reg.creators || {} });
}

/** Upsert a creator. `enabled` is excluded from the update patch on purpose:
 *  could the owner have changed this since the source was authored? — yes, and
 *  re-syncing a catalog must never silently re-enable a creator Sean disabled. */
export function upsertCreator(reg, creator, { now = Date.now() } = {}) {
  const existing = reg.creators[creator.channelId];
  const base = existing || {
    enabled: false,
    addedAt: nowIso(() => now),
    highWaterMark: null,
    lastDiscoverAt: null,
  };
  reg.creators[creator.channelId] = {
    ...base,
    ...creator,
    enabled: existing ? existing.enabled : (creator.enabled ?? false),
    addedAt: base.addedAt,
  };
  return reg.creators[creator.channelId];
}

export function enabledCreators(reg) {
  return Object.values(reg.creators || {}).filter((c) => c.enabled);
}

// ─────────────────────────────────────────────────────────────────────────────
// Video state map
// ─────────────────────────────────────────────────────────────────────────────

export function loadState(r) {
  const doc = readJson(paths(r).state, null);
  if (!doc || typeof doc !== 'object') return { version: 1, videos: {} };
  return { version: doc.version || 1, videos: doc.videos && typeof doc.videos === 'object' ? doc.videos : {} };
}

export function saveState(state, r) {
  return writeJsonAtomic(paths(r).state, { version: 1, videos: state.videos || {} });
}

export function videosForChannel(state, channelId) {
  return Object.values(state.videos || {}).filter((v) => v.channelId === channelId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lane B — transcript documents (owner-private)
// ─────────────────────────────────────────────────────────────────────────────

/** Where a video's durable transcript document lives. Channel-partitioned so a
 *  per-creator purge is a single directory delete. */
export function docPath(r, channelId, videoId) {
  return join(paths(r).docsDir, channelId || 'unknown', `${videoId}.json`);
}

export function readDoc(r, channelId, videoId) {
  return readJson(docPath(r, channelId, videoId), null);
}

/**
 * Persist a transcript document. Idempotent by content hash: a re-fetch that
 * produces identical text rewrites nothing and reports `unchanged`, so the
 * caller can distinguish "already had it" from "captions were edited".
 *
 * A CHANGED HASH KEEPS A REVISION RECORD, NOT JUST THE NEW TEXT.
 *   Captions do get edited after upload, and a re-fetch of a video that had been
 *   marked deleted-and-restored would otherwise replace the archived text with
 *   no trace that anything changed — an archive with no revision history cannot
 *   answer "did the creator change this, or did we?" The revision entry stores
 *   the hash, size and timestamp rather than the old text: enough to detect and
 *   describe the change, cheap enough to keep forever, and honest about the
 *   fact that the previous generation's bytes are not retained.
 */
export function writeDoc(r, doc) {
  const p = docPath(r, doc.channelId, doc.videoId);
  const hash = contentHash(doc.text);
  const prior = readJson(p, null);
  if (prior && prior.contentHash === hash) {
    return { path: p, hash, wrote: false, reason: 'unchanged' };
  }
  const revisions = Array.isArray(prior?.revisions) ? prior.revisions.slice(-20) : [];
  if (prior) {
    revisions.push({
      contentHash: prior.contentHash,
      chars: prior.chars ?? (typeof prior.text === 'string' ? prior.text.length : null),
      cueCount: prior.cueCount ?? null,
      replacedAt: doc.fetchedAt || new Date().toISOString(),
    });
  }
  writeJsonAtomic(p, { ...doc, contentHash: hash, revisions });
  return { path: p, hash, wrote: true, reason: prior ? 'updated' : 'created' };
}

export function docExists(r, channelId, videoId) {
  return !!readJson(docPath(r, channelId, videoId), null);
}

/** Every stored document, optionally scoped to one channel. Reads Lane B. */
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

/** Delete every stored document for one creator. The deletion cascade's first
 *  step — a creator removed from the registry must take its Lane B text with it. */
export function purgeCreatorDocs(r, channelId) {
  const dir = join(paths(r).docsDir, channelId);
  let n = 0;
  for (const file of listDir(dir)) {
    try {
      unlinkSync(join(dir, file));
      n += 1;
    } catch { /* best effort */ }
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger + run records (Lane C — safe to read, digest, and report)
// ─────────────────────────────────────────────────────────────────────────────

export function appendLedger(r, entry) {
  return appendJsonl(paths(r).ledger, { ts: new Date().toISOString(), ...entry });
}

export function readLedger(r, { limit = 500 } = {}) {
  const all = readJsonl(paths(r).ledger);
  return limit > 0 ? all.slice(-limit) : all;
}

export function saveRun(r, record) {
  const p = join(paths(r).runsDir, `${record.runId}.json`);
  writeJsonAtomic(p, record);
  return p;
}

export function listRuns(r, { limit = 20 } = {}) {
  const dir = paths(r).runsDir;
  return listDir(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .slice(-limit)
    .map((f) => readJson(join(dir, f), null))
    .filter(Boolean);
}

export function saveDigest(r, runId, markdown) {
  return writeTextAtomic(join(paths(r).digestDir, `${runId}.md`), markdown);
}

export function readCanary(r) {
  return readJson(paths(r).canary, []) || [];
}

export function appendCanary(r, entry) {
  const all = readCanary(r);
  all.push(entry);
  return writeJsonAtomic(paths(r).canary, all.slice(-90));
}

export function ensureStore(r) {
  const p = paths(r);
  for (const d of [p.base, p.runsDir, p.digestDir, p.docsDir, p.brainsDir, p.vaultDir]) ensureDir(d);
  return p;
}

/**
 * A CORRUPT STATE MAP IS A STOP, NOT AN EMPTY MAP.
 *
 *   `loadState` cannot tell "no file yet" from "the file is truncated", and a
 *   run writes state back unconditionally — so a partial write, an AV lock or
 *   an EACCES read would silently replace years of attempt counts, retry times
 *   and content hashes with `{}`. Worse, the brain's coverage-gap table is
 *   state-driven, so an empty map makes it report NO gaps: a brain that reports
 *   silence as agreement. Refusing costs one run; proceeding costs the history.
 *
 * Returns `{ ok, reason }` — `ok: true` when there is nothing there yet.
 */
export function checkStateReadable(r) {
  const check = readJsonStrict(paths(r).state);
  if (check.present && !check.ok) {
    return {
      ok: false,
      reason: `state.json is present but unreadable (${check.error}) — refusing to run rather than `
        + 'overwrite the video state map with an empty one. Move it aside to start fresh.',
    };
  }
  return { ok: true, reason: null };
}
