#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/backup.mjs
 * PURPOSE: Back up the private store, verify it by hash, and restore it into an
 *          isolated root — plus a NON-DESTRUCTIVE rollback for derived output.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR25)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (review finding HR25): the blueprint's rollback instruction was
 *   **"delete `.ai-workflow/creator-brains/`"** — a directory holding the only
 *   durable transcripts in existence. A rollback that destroys the archive is
 *   not a rollback; it is a second incident, written by someone thinking of
 *   derived output while pointing at the source of truth.
 *
 * THE DISTINCTION THIS MODULE ENFORCES:
 *   DURABLE — cannot be regenerated: transcript documents (Lane B), the registry
 *     (owner decisions), the state map (retry history, content hashes), the
 *     reservation journal, the ownership manifest.
 *   DERIVED — rebuildable: brains, vault staging, digests, runs. Deleting these
 *     costs CPU, not truth.
 *
 *   **Rolling back the ENGINE means re-pointing derived output. It never means
 *   deleting durable input.** `rollbackDerived` implements exactly that and
 *   cannot reach `docs/`.
 *
 * A BACKUP NOBODY HAS RESTORED IS A HYPOTHESIS: `verifyBackup` re-hashes every
 *   file against the manifest, and `restoreStore` verifies AGAIN at the
 *   destination, so "the backup is good" is a measurement, not a belief.
 *
 * @module creator-brains/backup
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { listDir, paths, writeJsonAtomic } from './paths.mjs';

export const BACKUP_SCHEMA_VERSION = 1;
export const MANIFEST_NAME = 'backup-manifest.json';

/** Regenerable from the durable set. Losing these costs time, not truth. */
export const DERIVED_DIRS = ['brains', 'vault', 'digest', 'runs'];

/** Cannot be regenerated: transcript text and owner decisions. */
export const DURABLE_FILES = [
  'registry.json', 'state.json', 'reservations.jsonl', 'ledger.jsonl',
  'manifest.json', 'journal.json', 'last-success.json', 'canary.json',
];

/** Durable DIRECTORIES, walked recursively. `docs/` is the only one that holds
 *  Lane B text, and it is the reason this module exists. */
export const DURABLE_DIRS = ['docs'];

export class BackupError extends Error {}

/** sha256 of a file's bytes. */
export function hashFile(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

/** Every file under `dir`, relative to it, POSIX-separated for a stable manifest. */
function walk(dir, base = dir) {
  const out = [];
  for (const name of listDir(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full).split('\\').join('/'));
  }
  return out;
}

/**
 * What is in the store, split by whether it can be regenerated.
 * Returns `{ durable: [{rel, bytes}], derived: [...] }`.
 */
export function listStoreFiles(r) {
  const p = paths(r);
  const durable = [];
  const derived = [];

  for (const name of DURABLE_FILES) {
    const full = join(p.base, name);
    if (!existsSync(full)) continue;
    durable.push({ rel: name, bytes: statSync(full).size });
  }
  for (const dir of DURABLE_DIRS) {
    const full = join(p.base, dir);
    for (const rel of walk(full)) {
      durable.push({ rel: `${dir}/${rel}`, bytes: statSync(join(full, rel)).size });
    }
  }
  for (const dir of DERIVED_DIRS) {
    const full = join(p.base, dir);
    for (const rel of walk(full)) derived.push({ rel: `${dir}/${rel}` });
  }
  return { durable, derived };
}

/**
 * Back up the DURABLE set into `dest`.
 *
 * Derived output is excluded by default: including it would inflate every backup
 * with files that can be rebuilt and blur the line this module exists to draw.
 * `includeDerived` is available for a full snapshot.
 *
 * Returns `{ ok, dir, files, manifestPath, durableHash, derivedIncluded }`.
 */
export function backupStore({
  r, dest, now = Date.now(), includeDerived = false,
} = {}) {
  if (!dest) throw new BackupError('a destination directory is required');
  const base = paths(r).base;
  if (resolve(dest).startsWith(resolve(base))) {
    throw new BackupError('the backup destination must be OUTSIDE the store being backed up');
  }
  mkdirSync(dest, { recursive: true });

  const { durable, derived } = listStoreFiles(r);
  const files = [];
  for (const entry of durable) {
    const from = join(base, entry.rel);
    const to = join(dest, entry.rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    files.push({ rel: entry.rel, bytes: entry.bytes, sha256: hashFile(to) });
  }
  const derivedFiles = [];
  if (includeDerived) {
    for (const entry of derived) {
      const from = join(base, entry.rel);
      const to = join(dest, entry.rel);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      derivedFiles.push({ rel: entry.rel, sha256: hashFile(to) });
    }
  }

  const manifest = {
    schema_version: BACKUP_SCHEMA_VERSION,
    createdAt: new Date(now).toISOString(),
    source: base,
    derivedIncluded: !!includeDerived,
    durableFiles: files.length,
    durableHash: hashOf(files),
    files,
    ...(includeDerived ? { derivedFiles } : {}),
  };
  const manifestPath = join(dest, MANIFEST_NAME);
  writeJsonAtomic(manifestPath, manifest);

  return {
    ok: true,
    dir: dest,
    manifestPath,
    files: files.map((f) => f.rel),
    durableHash: manifest.durableHash,
    derivedIncluded: !!includeDerived,
  };
}

/** A single hash over a manifest's file list — the backup's identity. */
export function hashOf(files) {
  return createHash('sha256')
    .update(files.map((f) => `${f.rel}:${f.sha256}`).join('\n'))
    .digest('hex')
    .slice(0, 32);
}

/** Read a backup manifest, or throw with a named reason. */
export function readBackupManifest(dir) {
  const p = join(dir, MANIFEST_NAME);
  if (!existsSync(p)) throw new BackupError(`no backup manifest at ${p}`);
  let doc;
  try { doc = JSON.parse(readFileSync(p, 'utf-8')); } catch (e) {
    throw new BackupError(`backup manifest at ${p} is unreadable: ${e.message}`);
  }
  if (!doc || !Array.isArray(doc.files)) throw new BackupError(`backup manifest at ${p} has no file list`);
  if (doc.schema_version !== BACKUP_SCHEMA_VERSION) {
    throw new BackupError(`backup schema ${doc.schema_version} is not supported by this build`);
  }
  return doc;
}

/**
 * Re-hash every file against the manifest.
 * Returns `{ ok, checked, problems }` — a missing or altered file is a PROBLEM,
 * not a warning.
 */
export function verifyBackup(dir) {
  const manifest = readBackupManifest(dir);
  const problems = [];
  let checked = 0;
  for (const entry of manifest.files) {
    const full = join(dir, entry.rel);
    if (!existsSync(full)) { problems.push({ rel: entry.rel, problem: 'missing from the backup' }); continue; }
    const actual = hashFile(full);
    if (actual !== entry.sha256) { problems.push({ rel: entry.rel, problem: 'hash mismatch' }); continue; }
    checked += 1;
  }
  const recomputed = hashOf(manifest.files);
  if (recomputed !== manifest.durableHash) {
    problems.push({ rel: MANIFEST_NAME, problem: 'the manifest does not hash to its own recorded identity' });
  }
  return { ok: problems.length === 0, checked, total: manifest.files.length, problems, manifest };
}

/**
 * Restore a backup INTO AN ISOLATED ROOT.
 *
 *   It refuses to restore over a non-empty target. The packet asks to "prove
 *   restore into an isolated destination", and the reason is that a restore which
 *   overwrites the live store is the destructive operation this module exists to
 *   prevent.
 */
export function restoreStore({ backupDir, target, now = Date.now(), force = false } = {}) {
  if (!target) throw new BackupError('a target directory is required');
  const verdict = verifyBackup(backupDir);
  if (!verdict.ok) {
    return { ok: false, reason: 'backup failed verification', problems: verdict.problems };
  }

  const existing = existsSync(target) ? walk(target) : [];
  if (existing.length && !force) {
    return {
      ok: false,
      reason: `target '${target}' is not empty (${existing.length} entries) — restore refuses to overwrite; pass force to replace deliberately`,
    };
  }

  let restored = 0;
  for (const entry of verdict.manifest.files) {
    const from = join(backupDir, entry.rel);
    const to = join(target, entry.rel);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    restored += 1;
  }

  // VERIFY AT THE DESTINATION. A copy that silently truncated is the failure a
  // hash comparison at the source cannot see.
  const problems = [];
  for (const entry of verdict.manifest.files) {
    const to = join(target, entry.rel);
    if (!existsSync(to)) { problems.push({ rel: entry.rel, problem: 'missing after restore' }); continue; }
    if (hashFile(to) !== entry.sha256) problems.push({ rel: entry.rel, problem: 'hash mismatch after restore' });
  }

  return {
    ok: problems.length === 0,
    restored,
    target,
    restoredAt: new Date(now).toISOString(),
    sourceHash: verdict.manifest.durableHash,
    problems,
  };
}

/**
 * Roll back DERIVED output without touching durable input (HR25).
 *
 *   `unpublish` removes a creator's published pointer, so their brain reports
 *   "nothing" instead of stale content, while the transcripts stay where they
 *   are. It CANNOT reach `docs/` — the path is built from `brainsDir` only, and
 *   the guard below refuses anything outside it.
 *
 *   This is what the blueprint's "delete the store" instruction should have been.
 */
export function rollbackDerived({ r, namespace = null, all = false } = {}) {
  const brains = paths(r).brainsDir;
  const removed = [];
  const namespaces = all ? listDir(brains) : (namespace ? [namespace] : []);
  if (!namespaces.length) {
    return { ok: false, reason: 'nothing selected — pass a namespace or all: true' };
  }
  for (const ns of namespaces) {
    const pointer = join(brains, ns, 'current.json');
    if (!pointer.startsWith(brains)) continue; // belt: never step outside derived output
    if (existsSync(pointer)) { unlinkSync(pointer); removed.push(pointer); }
  }
  return {
    ok: true,
    unpublished: removed,
    durableUntouched: true,
    note: 'Transcript documents, the registry and the reservation journal are untouched. '
      + 'Re-run `build` to regenerate the brains from them.',
  };
}

