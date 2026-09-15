#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/export.mjs
 * PURPOSE: Stage PUBLISHED generations into the vault collection directory,
 *          reaping only artifacts this engine is recorded as having written.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR07/08/25)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG:
 *
 *   HR08 — cleanup used the CURRENT slug list. A creator that was renamed or
 *     removed had no entry in that list, so its old staged files were never
 *     reaped and stayed in a directory the README tells the owner to copy
 *     wholesale into the wiki vault. The set that needs cleaning is precisely the
 *     set the old code could not see. Ownership is recorded in a MANIFEST now,
 *     and cleanup reads HISTORY.
 *
 *   HR07 — filenames were `<label>.<ext>`, so two channels with the same display
 *     name collided in the vault as well as in `brains/`. Every staged file
 *     carries the full channel id.
 *
 *   HR25 — export wrote straight into the live collection. It now reads the
 *     registry of published generations and copies only the files that pointer
 *     names, so a half-built or quarantined generation is never staged.
 *
 * THE TIER LAW IS STILL AN IMPORT-GRAPH FACT: this module does not import the
 * Lane B reader and has no path to transcript text. The fidelity gate in
 * render.mjs makes the BYTES safe; this file only moves already-validated files.
 *
 * @module creator-brains/export
 */

import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, listDir, paths, writeTextAtomic } from './paths.mjs';
import { listPublished } from './render.mjs';
import { readManifest, saveManifest } from './manifest.mjs';

/** Files a published generation may contribute to the vault. */
export const EXPORTABLE = ['index.md', 'topics.md', 'timeline.md', 'rules.jsonl'];

/** Vault filename for a published file. The channel id is ALWAYS present, so two
 *  creators sharing a display name cannot collide (review HR07). */
export function vaultName(label, channelId, fileName) {
  const ext = fileName.endsWith('.jsonl') ? '.jsonl' : '.md';
  const stem = fileName.replace(/\.(md|jsonl)$/, '');
  const suffix = fileName === 'index.md' ? '' : `.${stem}`;
  return `${label}-${channelId}${suffix}${ext}`;
}

function collectionIndex(brains, at) {
  const L = [
    '---',
    'collection: creator-brains',
    'tier: derived (Lane C)',
    `generated_at: ${new Date(at).toISOString()}`,
    '---',
    '',
    '# Creator Brains',
    '',
    'One brain per creator, derived from their published videos. Every claim links to',
    "the creator's own video at the second it was made. Raw transcripts are",
    'owner-private and are never part of this collection.',
    '',
    'Claims are CANDIDATES produced by a deterministic extractor, not validated',
    "statements of the creator's position.",
    '',
    '| Creator | Channel | Videos | Claims | Gaps | Brain |',
    '|---|---|---|---|---|---|',
  ];
  for (const b of brains) {
    L.push(`| ${b.title} | \`${b.channelId}\` | ${b.videos} | ${b.claims} | ${b.gaps} | [[${b.file}]] |`);
  }
  L.push('');
  return L.join('\n');
}

/**
 * Stage every live generation into the vault collection directory.
 *
 * Returns `{ written, reaped, skipped, dir, brains }`. `reaped` lists files
 * removed because the manifest says this engine wrote them and no live
 * generation claims them any more.
 */
export function exportBrains({ r, now = null } = {}) {
  const dest = ensureDir(paths(r).vaultDir);
  const at = typeof now === 'function' ? now() : (now || Date.now());
  const published = listPublished(r);
  const manifest = readManifest(r);

  const written = [];
  const skipped = [];
  const brains = [];
  const previouslyOwned = new Set(Object.keys(manifest.artifacts || {}));
  const nowOwned = new Set();

  for (const pub of published) {
    const { namespace, dir, pointer } = pub;
    const label = pointer.label || namespace;
    const names = Array.isArray(pointer.files) && pointer.files.length ? pointer.files : EXPORTABLE;

    for (const name of names) {
      if (!EXPORTABLE.includes(name)) { skipped.push({ namespace, file: name, reason: 'not_exportable' }); continue; }
      const from = join(dir, name);
      if (!existsSync(from)) { skipped.push({ namespace, file: name, reason: 'missing from the generation' }); continue; }
      const to = join(dest, vaultName(label, namespace, name));
      copyFileSync(from, to);
      written.push(to);
      nowOwned.add(to);
    }
    brains.push({
      channelId: namespace,
      title: pointer.title || label,
      label,
      file: vaultName(label, namespace, 'index.md'),
      videos: (pointer.stats && pointer.stats.videos) || 0,
      claims: (pointer.stats && pointer.stats.claims) || 0,
      gaps: (pointer.stats && pointer.stats.gaps) || 0,
      generation: pointer.generation,
    });
  }

  const idx = join(dest, '_collection.md');
  writeTextAtomic(idx, collectionIndex(brains.slice().sort((a, b) => a.title.localeCompare(b.title)), at));
  written.push(idx);
  nowOwned.add(idx);

  // ── Reap from HISTORY, not from the current list (review HR08) ────────────
  //
  //   A renamed or removed creator has no entry in `brains`, so a current-list
  //   sweep cannot see its old files — exactly the case that leaves orphans in a
  //   directory the owner is told to copy into the wiki.
  const reaped = [];
  for (const owned of previouslyOwned) {
    if (nowOwned.has(owned)) continue;
    if (!existsSync(owned)) continue;
    // Only ever delete inside our own staging directory. A manifest entry that
    // points elsewhere is a defect, not an instruction.
    if (!owned.startsWith(dest)) {
      skipped.push({ file: owned, reason: 'manifest path outside the staging dir — not reaped' });
      continue;
    }
    try { unlinkSync(owned); reaped.push(owned); } catch { /* best effort */ }
  }

  // A file in the staging dir that no generation produced and the manifest does
  // not own is somebody else's; it is REPORTED, never deleted.
  for (const name of listDir(dest)) {
    const full = join(dest, name);
    if (!nowOwned.has(full) && !previouslyOwned.has(full)) {
      skipped.push({ file: full, reason: 'present but not owned by this engine — left alone' });
    }
  }

  const nextArtifacts = {};
  for (const p of nowOwned) nextArtifacts[p] = { writtenAt: new Date(at).toISOString() };
  // Keep one generation of history so a rename is still reapable on the next run.
  for (const p of previouslyOwned) if (!nextArtifacts[p]) nextArtifacts[p] = manifest.artifacts[p];
  saveManifest({ artifacts: nextArtifacts, generations: manifest.generations }, r);

  return { written, reaped, skipped, dir: dest, brains, at: new Date(at).toISOString() };
}

/** What the owner must run to publish the staged collection into the real vault. */
export function publishInstructions(vaultUser = '<wsl-user>') {
  return [
    'Staged locally. The live vault is not reachable from this machine.',
    'To publish (run inside WSL):',
    '  mkdir -p ~/hermes2/brain-vault/creator-brains',
    '  cp -r "<repo>/.ai-workflow/creator-brains/vault/creator-brains/." ~/hermes2/brain-vault/creator-brains/',
    'Then confirm from the repo:  node scripts/creator-brains/cli.mjs query "<topic>"',
    `(swan-brain resolves the vault as /home/${vaultUser}/hermes2/brain-vault)`,
  ].join('\n');
}
