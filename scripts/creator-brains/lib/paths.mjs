#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/paths.mjs
 * PURPOSE: Store layout, atomic writes, and small shared helpers for the
 *          Creator Brains engine. Every module that touches disk goes through
 *          here, so the tier boundary (Lane B owner-private vs Lane C derived)
 *          has exactly one definition.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S1)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY ATOMIC WRITES (and why rename, not "write and hope"):
 *   The daily job can be killed by a reboot mid-write. `writeFileSync` straight
 *   onto a live path leaves a truncated JSON file that the next run reads as
 *   "corrupt" — and a store that is corrupt on every boot is a store that gets
 *   deleted. Writing to `<path>.tmp` and renaming is atomic within a directory
 *   on every filesystem this runs on, so a kill leaves at most a stray `.tmp`.
 *
 * WHY THE ROOT IS OVERRIDABLE:
 *   Tests must not touch the real store, and the same engine may later be
 *   pointed at a different drive. `CREATOR_BRAINS_ROOT` is the single knob.
 *
 * TIER LAW (blueprint §1.5 INV-4): everything under `docs/` is Lane B —
 * owner-private transcript text. It is gitignored, it is never exported, and
 * `export.mjs` must not import the module that reads it.
 *
 * @module creator-brains/paths
 */

import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, rmSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root — this file is `<root>/scripts/creator-brains/lib/paths.mjs`. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const ENGINE_VERSION = 1;

/**
 * The store root. Tests pass an explicit dir; otherwise the env override wins,
 * and only then the repo default. Never resolved lazily inside a hot loop —
 * every caller gets the same answer for the life of the process.
 */
export function root(explicit) {
  return explicit || process.env.CREATOR_BRAINS_ROOT || join(REPO_ROOT, '.ai-workflow', 'creator-brains');
}

/** Named sub-paths, so no module hand-builds a path segment. */
export function paths(r) {
  const base = root(r);
  return {
    base,
    registry: join(base, 'registry.json'),
    state: join(base, 'state.json'),
    ledger: join(base, 'ledger.jsonl'),
    runsDir: join(base, 'runs'),
    digestDir: join(base, 'digest'),
    canary: join(base, 'canary.json'),
    manifest: join(base, 'manifest.json'),
    journal: join(base, 'journal.json'),
    lastSuccess: join(base, 'last-success.json'),
    reservations: join(base, 'reservations.jsonl'),
    // The shared cooldown written after a 429/bot-check (HR23). Not DURABLE in
    // the backup sense: losing it costs one refused request, never a transcript.
    throttle: join(base, 'throttle.json'),
    // Partially-walked channel sweeps (HR22). Also not DURABLE: losing it costs
    // one re-walk of one tab, and it is explicitly NOT truth.
    checkpoints: join(base, 'checkpoints.json'),
    // LANE B — owner-private. Never exported, never rendered into a brain page.
    docsDir: join(base, 'docs'),
    // LANE C — derived. Safe to surface and to export.
    brainsDir: join(base, 'brains'),
    vaultDir: join(base, 'vault', 'creator-brains'),
  };
}

export function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

/** Read JSON, or return `fallback` for absent/corrupt. Corrupt ≠ fatal. */
export function readJson(p, fallback = null) {
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

/**
 * Read JSON, distinguishing "there is no file" from "there is a file and it is
 * broken".
 *
 * `readJson` collapses both into a fallback, which is fine for a cache and
 * catastrophic for the state map: a truncated `state.json` would read as an
 * empty map, and the next save would then write that emptiness back over the
 * real thing — every fetch attempt count, retry time and content hash gone.
 * A corrupt file must be a STOP, not a silent zero.
 *
 * Returns `{ present, ok, value, error }`.
 */
export function readJsonStrict(p) {
  let raw;
  try {
    raw = readFileSync(p, 'utf-8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return { present: false, ok: false, value: null, error: null };
    return { present: true, ok: false, value: null, error: `unreadable: ${e.message}` };
  }
  try {
    return { present: true, ok: true, value: JSON.parse(raw), error: null };
  } catch (e) {
    return { present: true, ok: false, value: null, error: `invalid JSON: ${e.message}` };
  }
}

/**
 * Write text via temp-file + rename.
 *
 * THE TEMP NAME IS UNIQUE PER WRITER (review HR14). It used to be `<path>.tmp`
 * for every writer, so two processes — the interactive CLI and the scheduled
 * run — could interleave inside ONE temp file and produce a target containing a
 * mix of both. `rename` is only atomic with respect to readers; it does nothing
 * to separate two writers sharing a temp path. pid + random keeps them apart;
 * the rename stays the atomic publication step.
 *
 * The temp file is also removed on failure, so a full disk or a throw does not
 * litter the store with half-written candidates.
 */
export function writeTextAtomic(p, text) {
  ensureDir(dirname(p));
  const tmp = `${p}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(tmp, text, 'utf-8');
    renameSync(tmp, p);
  } catch (e) {
    try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    throw e;
  }
  return Buffer.byteLength(text, 'utf-8');
}

export function writeJsonAtomic(p, obj) {
  return writeTextAtomic(p, `${JSON.stringify(obj, null, 2)}\n`);
}

/** Append one JSON line. Append is not atomic, but a partial trailing line is
 *  tolerated on read (see readJsonl) — losing the newest ledger line is
 *  survivable; corrupting the whole ledger is not. */
export function appendJsonl(p, obj) {
  ensureDir(dirname(p));
  writeFileSync(p, `${JSON.stringify(obj)}\n`, { encoding: 'utf-8', flag: 'a' });
}

/** Remove a file if it is there. Used for scratch state that must leave no
 *  trace when it becomes empty (a checkpoint file with no checkpoints). */
export function deleteFileIfPresent(p) {
  try {
    rmSync(p, { force: true });
    return true;
  } catch {
    return false;
  }
}

/** Parse a JSONL file, skipping blank and truncated trailing lines. */
export function readJsonl(p) {
  try {
    return readFileSync(p, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** A filesystem-safe slug for a creator name. Falls back to the channel id. */
export function slugify(name) {
  const s = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'creator';
}

/** Content hash for idempotency. sha256, not the scout cache's FNV token —
 *  this hash decides whether a document is re-written, so collisions matter. */
export function contentHash(text) {
  return createHash('sha256').update(String(text ?? ''), 'utf-8').digest('hex').slice(0, 32);
}

/** ISO timestamp, injectable so tests can freeze time. */
export function nowIso(clock) {
  return new Date(clock ? clock() : Date.now()).toISOString();
}

export function nowMs(clock) {
  return clock ? clock() : Date.now();
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** List a directory's entries, or [] when it does not exist. */
export function listDir(p) {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}
