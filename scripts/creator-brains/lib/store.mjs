#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/store.mjs
 * PURPOSE: The store's maps, transcript documents, ledger, run records and
 *          ownership manifest — all behind STRICT reads.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR04/05/08/11/25)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13 | SPLIT 2026-09-21 (A1-06)
 * ============================================================================
 *
 * NOT HERE ANY MORE: the RUN JOURNAL. It moved to ./run-journal.mjs when the
 * A1-06 ownership repair pushed this module past rule 4's 300-line cap. The
 * three journal verbs are re-exported below, so callers are unaffected; read
 * that file for journal semantics and ownership.
 *
 * WHAT CHANGED AND WHY:
 *
 *   HR04/HR05 — every reader goes through `schema.mjs` and returns a STATUS.
 *     There is no `loadRegistry()` that quietly hands back `{creators:{}}` for a
 *     corrupt file, because that is exactly how the reviewer turned a damaged
 *     registry into a green run that then overwrote it. `defaultValue()` throws
 *     on a damaged read, so no caller can substitute by accident.
 *
 *   HR11 — the document hash covers the CANONICAL PAYLOAD, not just the text.
 *     The old hash was `sha256(text)`, so a re-fetch that moved a cue from 1s to
 *     9s reported "unchanged" and the corrected timing was discarded; and a
 *     tampered document kept its old hash, so a correct refetch was rejected as a
 *     no-op and the damaged text stayed. The hash now includes cue text AND
 *     timings, language, provenance and schema version, and the prior hash is
 *     RECOMPUTED from the stored bytes before it is trusted.
 *
 *   HR08/HR25 — an ownership MANIFEST records what this engine published, so
 *     stale artifacts are reaped from HISTORY rather than guessed from the
 *     current slug list — and a renamed or removed creator leaves no trace in
 *     that list, which is precisely the case cleanup exists for.
 *
 * @module creator-brains/store
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ensureDir, listDir, nowIso, paths, readJson, readJsonl, appendJsonl,
  writeJsonAtomic, writeTextAtomic,
} from './paths.mjs';
import {
  READ, readStore, isAbsent, isDamaged, describe as describeRead, defaultValue,
} from './schema.mjs';

// Re-exported so existing importers keep working; the implementation lives in
// its own module so export.mjs can read the manifest WITHOUT importing the
// module that can reach Lane B (review HR08/HR09).
export { readManifest, saveManifest, ownedPaths } from './manifest.mjs';

// Lane B lives in its own module; re-exported here so store.mjs stays the
// single import surface for callers that already depend on it.
export {
  DOC_SCHEMA_VERSION, docPath, readDoc, docPayload, docHash, validateDoc, writeDoc,
  docExists, readValidDoc, listDocs, listDocsChecked, purgeCreatorDocs,
} from './docs.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Strict reads (HR04, HR05)
// ─────────────────────────────────────────────────────────────────────────────

export function readRegistry(r) {
  return readStore('registry', paths(r).registry);
}

export function readState(r) {
  return readStore('state', paths(r).state);
}

export function readCanaryHistory(r) {
  return readStore('canary', paths(r).canary);
}

/**
 * Lenient-looking NAMES for the strict readers, kept because callers and
 * external instruments use them — but they THROW on damage instead of
 * substituting an empty map.
 *
 *   The repaired contract is "a damaged store is a named failure". The old
 *   function names are preserved so that a caller written against the previous
 *   API still gets the NEW behaviour rather than an AttributeError, and so that
 *   the only way to obtain a value from a damaged file is to catch an exception
 *   saying so. This is a rename, not a relaxation (review HR04/HR05).
 */
export function loadState(r) {
  return stateOrDefault(readState(r));
}

export function loadRegistry(r) {
  return registryOrDefault(readRegistry(r));
}

export const ABSENT = { status: READ.ABSENT, errors: [] };

/** Registry value for a read that is `ok` or genuinely absent. Throws on damage. */
export function registryOrDefault(read) {
  return defaultValue(read || ABSENT, { version: 1, creators: {} });
}

export function stateOrDefault(read) {
  return defaultValue(read || ABSENT, { version: 1, videos: {} });
}

export { READ, isAbsent, isDamaged, describeRead, defaultValue };

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────

export function saveRegistry(reg, r) {
  return writeJsonAtomic(paths(r).registry, { version: 1, creators: reg.creators || {} });
}

/**
 * Save the video state map — UNION-MERGED with whatever is on disk.
 *
 * WHY THIS IS NOT A PLAIN OVERWRITE (review HR14b):
 *   The reviewer's probe wrote a new video into `state.json` DURING a run. The
 *   run then saved its in-memory map and the new video vanished: a textbook lost
 *   update. The lock does not help, because the writer was not a second runner —
 *   it was any process touching the file.
 *
 *   A run that started before a row existed must not be able to erase it. So the
 *   save re-reads the current file and unions in any row we do not know about,
 *   while rows we DO know about keep our (newer) version. Deletion in this engine
 *   is a STATE CHANGE, never a row removal, so a union can never resurrect
 *   something a caller deliberately removed.
 *
 *   The merge is REPORTED, not silent: a caller that wants to know its map was
 *   stale gets a count.
 */
export function saveState(state, r, { merge = true } = {}) {
  let merged = 0;
  if (merge) {
    const read = readState(r);
    if (read.status === READ.OK && read.value && read.value.videos) {
      for (const [id, row] of Object.entries(read.value.videos)) {
        if (!state.videos[id]) { state.videos[id] = row; merged += 1; }
      }
    }
  }
  writeJsonAtomic(paths(r).state, { version: 1, videos: state.videos || {} });
  return { merged, total: Object.keys(state.videos || {}).length };
}

/** Upsert a creator. `enabled` is excluded from the update patch on purpose:
 *  could the owner have changed this since the source was authored? — yes, and
 *  re-syncing a catalog must never silently re-enable a creator Sean disabled. */
export function upsertCreator(reg, creator, { now = Date.now() } = {}) {
  const existing = reg.creators[creator.channelId];
  const base = existing || {
    enabled: false, addedAt: nowIso(() => now), highWaterMark: null, lastDiscoverAt: null,
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
  return Object.values((reg && reg.creators) || {}).filter((c) => c.enabled);
}

export function videosForChannel(state, channelId) {
  return Object.values((state && state.videos) || {}).filter((v) => v.channelId === channelId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lane B — transcript documents live in `docs.mjs` and are re-exported above.
// ─────────────────────────────────────────────────────────────────────────────

// Ledger + runs
// ─────────────────────────────────────────────────────────────────────────────

export function appendLedger(r, entry) {
  return appendJsonl(paths(r).ledger, { ts: new Date().toISOString(), ...entry });
}

export function readLedger(r, { limit = 500 } = {}) {
  const all = readJsonl(paths(r).ledger);
  return limit > 0 ? all.slice(-limit) : all;
}

/** Save a run record and report whether it replaced an existing one. Run ids now
 *  carry a UUID (HR21) so a collision is not expected — and if one ever happens,
 *  the caller learns about it instead of losing a record silently. */
export function saveRun(r, record) {
  const p = join(paths(r).runsDir, `${record.runId}.json`);
  const overwrote = existsSync(p);
  writeJsonAtomic(p, record);
  return { path: p, overwrote };
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
  const read = readCanaryHistory(r);
  return read.status === READ.OK ? read.value : [];
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

// ─────────────────────────────────────────────────────────────────────────────
// Run journal — EXTRACTED to ./run-journal.mjs (rule 4 seam, A1-06)
// ─────────────────────────────────────────────────────────────────────────────
//
//   The ownership repair pushed this module over the 300-line cap. The journal
//   is a self-contained cluster with its own contract, so it moved rather than
//   the cap moving. These re-exports keep every existing import site working:
//   `run.mjs`, `cli.mjs`, `status-command.mjs` and both journal test files all
//   still reach it through this barrel, unchanged.
//
//   Do NOT re-implement a journal write here. There is exactly one writer, and
//   ownership (the slot belongs to the run holding the store) is enforced there.

export {
  writeRunJournal, finalizeRunJournal, readRunJournal,
} from './run-journal.mjs';

/** Record the last SUCCESSFUL acquisition, separately from the last attempt.
 *  Staleness must be answerable even when every recent run failed (HR16). */
export function markSuccess(r, tick) {
  try {
    return writeJsonAtomic(paths(r).lastSuccess, { at: nowIso(tick) });
  } catch {
    return null;
  }
}

export function readLastSuccess(r) {
  return readJson(paths(r).lastSuccess, null);
}
