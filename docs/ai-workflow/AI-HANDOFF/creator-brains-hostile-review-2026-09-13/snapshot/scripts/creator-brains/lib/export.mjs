#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/export.mjs
 * PURPOSE: Copy DERIVED brain artifacts to the vault staging area. This is the
 *          module that decides what is allowed to leave the machine.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * THE TIER LAW IS AN IMPORT-GRAPH FACT HERE, NOT A PROMISE:
 *   This file deliberately does not import the Lane B reader module and does
 *   not call any transcript-loading function. It reads the DERIVED directory
 *   and writes the staging directory, and there is no code path from it to
 *   owner-private transcript text — even if a later edit here were careless,
 *   there is nothing in scope to leak. A test asserts the import graph directly.
 *
 * WHY STAGING AND NOT A DIRECT WRITE INTO THE VAULT:
 *   `scripts/swan-brain.mjs` states in its own header that it "reads; it never
 *   writes and never exports", and the live vault (`~/hermes2/brain-vault`)
 *   lives on a WSL machine that is not reachable from this one. Writing into a
 *   vault we cannot see would also be writing into a vault we cannot verify.
 *   So the engine stages, and the copy step is explicit and owner-run.
 *
 * @module creator-brains/export
 */

import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, listDir, paths, writeTextAtomic } from './paths.mjs';

/** Files that may be exported. Anything not on this list stays home. */
export const EXPORTABLE = ['index.md', 'topics.md', 'timeline.md', 'rules.jsonl'];

/** A vault collection front page, listed so Hermes/Obsidian can find the set. */
function collectionIndex(brains) {
  const L = [
    '---',
    'collection: creator-brains',
    'tier: derived (Lane C)',
    `generated_at: ${new Date().toISOString()}`,
    '---',
    '',
    '# Creator Brains',
    '',
    'One brain per creator, derived from their published videos. Every claim links',
    'to the creator\'s own video at the second it was made. Raw transcripts are',
    'owner-private and are never part of this collection.',
    '',
    '| Creator | Videos | Claims | Brain |',
    '|---|---|---|---|',
  ];
  for (const b of brains) {
    L.push(`| ${b.title} | ${b.videos} | ${b.claims} | [[${b.slug}]] |`);
  }
  L.push('');
  return L.join('\n');
}

/** Read a brain's own index to pull its summary line — derived data only. */
function summarize(slug, dir) {
  const p = join(dir, 'index.md');
  if (!existsSync(p)) return { slug, title: slug, videos: 0, claims: 0 };
  const text = readFileSync(p, 'utf-8');
  const title = (text.match(/^title:\s*(.+)$/m) || [, slug])[1].replace(/^"|"$/g, '');
  const videos = Number((text.match(/videos_covered:\s*(\d+)/) || [, 0])[1]);
  const claims = Number((text.match(/^claims:\s*(\d+)$/m) || [, 0])[1]);
  return { slug, title, videos, claims };
}

/**
 * Stage every brain into the vault collection directory.
 * Returns `{written, skipped, dir, brains}` — every skip carries a reason.
 */
export function exportBrains({ r, now = null } = {}) {
  const src = paths(r).brainsDir;
  const dest = ensureDir(paths(r).vaultDir);
  // `now` arrives as a clock FUNCTION from tests and a timestamp from the
  // runner. Normalise once, here, so the two callers cannot disagree.
  const at = typeof now === 'function' ? now() : (now || Date.now());
  const written = [];
  const skipped = [];
  const brains = [];

  for (const slug of listDir(src)) {
    const dir = join(src, slug);
    const names = listDir(dir);
    if (!names.includes('index.md')) { skipped.push({ slug, reason: 'no_index' }); continue; }
    brains.push(summarize(slug, dir));
    for (const name of names) {
      if (!EXPORTABLE.includes(name)) { skipped.push({ slug, file: name, reason: 'not_exportable' }); continue; }
      const from = join(dir, name);
      // THE EXTENSION IS PRESERVED. The first version rewrote every name to
      // `.md`, so `rules.jsonl` — the declared contract that downstream
      // consumers (SwanGuard CB4b) glob for — arrived in the vault as
      // `slug.rules.md` and a `*.jsonl` glob found nothing. An export that
      // silently changes the artifact's type is worse than one that refuses.
      const to = name === 'index.md'
        ? join(dest, `${slug}.md`)
        : join(dest, `${slug}.${name.replace(/\.(md|jsonl)$/, '')}${name.endsWith('.jsonl') ? '.jsonl' : '.md'}`);
      copyFileSync(from, to);
      written.push(to);
    }
  }

  const idx = join(dest, '_collection.md');
  writeTextAtomic(idx, collectionIndex(brains.sort((a, b) => a.title.localeCompare(b.title))));
  written.push(idx);

  // REAP WHAT WE PREVIOUSLY STAGED BUT NO LONGER PRODUCE.
  //
  //   Without this the staging directory only ever grows: a renamed artifact
  //   (`slug.rules.md` from the pre-F5 naming), a creator that lost its last
  //   document, or a re-slugged brain all leave orphans behind, and the README
  //   tells the owner to copy the WHOLE directory into the wiki vault — so
  //   orphans become permanent vault content that nothing regenerates.
  //
  //   The scope is deliberately narrow: only files whose name begins with a slug
  //   THIS RUN produced, plus `_collection.md`. A file that does not match a
  //   known slug is somebody else's and is left alone — the same rule the scout
  //   cache's pruner follows, and for the same reason: a delete primitive
  //   pointed at a shared directory must be aimed, not swept.
  const produced = new Set(written);
  const owned = new Set([...brains.map((b) => b.slug), '_collection']);
  const reaped = [];
  for (const name of listDir(dest)) {
    const full = join(dest, name);
    if (produced.has(full)) continue;
    const stem = name.replace(/\.(md|jsonl)$/, '').split('.')[0];
    if (!owned.has(stem)) continue;
    try { unlinkSync(full); reaped.push(full); } catch { /* best effort */ }
  }

  return {
    written, skipped, reaped, dir: dest, brains, at: new Date(at).toISOString(),
  };
}

/** What the owner must run to publish the staged collection into the real vault. */
export function publishInstructions(vaultUser = '<wsl-user>') {
  return [
    'Staged locally. The live vault is not reachable from this machine.',
    'To publish (run inside WSL):',
    `  mkdir -p ~/hermes2/brain-vault/creator-brains`,
    `  cp -r "<repo>/.ai-workflow/creator-brains/vault/creator-brains/." ~/hermes2/brain-vault/creator-brains/`,
    `Then confirm from the repo:  node scripts/swan-brain.mjs -c creator-brains "<topic>"`,
    `(swan-brain resolves the vault as /home/${vaultUser}/hermes2/brain-vault)`,
  ].join('\n');
}
