#!/usr/bin/env node
/**
 * build-archetype-index.mjs — A7 recall generator for the Swan Atelier Studio.
 *
 * Generates, from the CANONICAL monolith `website-archetypes.md`:
 *   1. archetypes/<nn>-<id>.md   — one generated split per numbered archetype
 *   2. archetypes/index.json     — a compact routing table (target ≤2KB)
 *
 * DOCTRINE (R2 rulings, 2026-08-18 — reconciled with the monolith's own
 * consolidation note): the monolith REMAINS the canonical, hand-edited source.
 * The splits and index are GENERATED BUILD ARTIFACTS for agent recall — they
 * cannot rot against the source because they carry its hash and are never
 * hand-edited. Hand edits go to the monolith ONLY; then re-run this script.
 *
 * Usage:  node scripts/design-brain/build-archetype-index.mjs [--check]
 *   --check: verify generated artifacts match the current monolith (exit 2 on drift)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'website-archetypes.md');
const OUT_DIR = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'archetypes');

export function parseMonolith(raw) {
  const text = raw.replace(/^﻿/, ''); // a BOM would silently unmatch /^## / at offset 0
  const srcSha = createHash('sha256').update(text).digest('hex').slice(0, 12);
  // Numbered archetype sections: "## <n>. <title>"
  const re = /^## (\d+)\. (.+)$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(text)) !== null) heads.push({ n: Number(m[1]), title: m[2].trim(), at: m.index });
  const sections = heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].at : text.indexOf('\n## Closing rules') !== -1 ? text.indexOf('\n## Closing rules') : text.length;
    return { ...h, body: text.slice(h.at, end).trim() };
  });
  return { srcSha, sections };
}

export function slug(title) {
  return title.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-').slice(0, 4).join('-');
}

export function extractMeta(section) {
  // Thesis: the "Use when:" line, tightly clipped.
  const use = section.body.match(/\*\*Use when:\*\*\s*([^\n]+)/);
  let thesis = use ? use[1].replace(/\s+/g, ' ').trim() : section.title;
  // First sentence if it fits; else word-boundary clip. Keep the index tiny.
  const firstSentence = thesis.match(/^.{10,72}?[.!?](?=\s|$)/);
  if (firstSentence) thesis = firstSentence[0].replace(/[.!?]$/, '');
  if (thesis.length > 72) thesis = thesis.slice(0, 69).replace(/\s+\S*$/, '') + '...';
  // Motion budget: first M0-M3 mention.
  const motion = (section.body.match(/\bM[0-3](?:[–-]M?[0-3])?\b/) || [null])[0];
  // Triggers: distinctive title words + a few from "Use when".
  const stop = new Set(['the', 'a', 'an', 'or', 'and', 'of', 'for', 'any', 'own', 'with', 'site', 'website', 'page', 'surface', 'mode']);
  const words = (section.title + ' ' + (use ? use[1] : ''))
    .toLowerCase().replace(/[^a-z0-9\s/-]/g, ' ').split(/[\s/]+/)
    .filter(w => w.length > 2 && !stop.has(w));
  const triggers = [...new Set(words)].slice(0, 3);
  return { thesis, motion, triggers };
}

export function generate(text) {
  const { srcSha, sections } = parseMonolith(text);
  const seenIds = new Set();
  const files = sections.map(s => {
    const id = slug(s.title);
    if (seenIds.has(id)) throw new Error(`slug collision: two archetypes resolve to id "${id}" — retitle one in the monolith`);
    seenIds.add(id);
    const name = `${String(s.n).padStart(2, '0')}-${id}.md`;
    const meta = extractMeta(s);
    const content = [
      `<!-- GENERATED from website-archetypes.md @ ${srcSha} — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->`,
      '',
      s.body,
      '',
    ].join('\n');
    return { name, id, n: s.n, content, ...meta };
  });
  const index = {
    generated_from: 'website-archetypes.md',
    source_sha: srcSha,
    note: 'GENERATED routing table. Read this first; load <=3 matching splits. File = <nn>-<id>.md (zero-padded n). Monolith stays canonical.',
    archetypes: files.map(f => ({ n: f.n, id: f.id, thesis: f.thesis, motion: f.motion, triggers: f.triggers })),
  };
  return { srcSha, files, index };
}

function main() {
  const check = process.argv.includes('--check');
  const text = readFileSync(SOURCE, 'utf8');
  let srcSha, files, index;
  try { ({ srcSha, files, index } = generate(text)); }
  catch (e) { console.error(`[archetype-index] REFUSED — ${e.message}`); process.exit(3); }
  const indexJson = JSON.stringify(index);

  if (check) {
    // Regenerate in memory and BYTE-COMPARE every artifact (final-review blocker, both
    // reviewers: a hash stamp nothing recomputes is decorative; a poisoned split or a
    // missing/extra file must fail here, or the D2 exemption's "stronger freshness
    // proof" is a shipped falsehood).
    const idxPath = join(OUT_DIR, 'index.json');
    if (!existsSync(idxPath)) { console.error('[archetype-index] DRIFT: index.json missing — run the generator'); process.exit(2); }
    const drift = [];
    if (readFileSync(idxPath, 'utf8') !== indexJson) drift.push('index.json content differs from in-memory regeneration');
    const expected = new Set(files.map(f => f.name));
    const onDisk = existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter(f => f.endsWith('.md')) : [];
    for (const f of onDisk) if (!expected.has(f)) drift.push(`extra file not produced by generator: ${f}`);
    for (const f of files) {
      const fp = join(OUT_DIR, f.name);
      if (!existsSync(fp)) { drift.push(`missing split: ${f.name}`); continue; }
      if (readFileSync(fp, 'utf8') !== f.content) drift.push(`split content differs: ${f.name}`);
    }
    if (drift.length) {
      console.error(`[archetype-index] DRIFT — ${drift.length} finding(s):`);
      for (const d of drift) console.error(`  - ${d}`);
      process.exit(2);
    }
    console.log(`[archetype-index] CLEAN — index + ${files.length} splits byte-match regeneration from monolith @ ${srcSha}`);
    return;
  }

  // Destructive-regen guard (final-review HIGH): if a heading-format drift parses to
  // near-zero sections, refuse to wipe 20+ good splits and write an empty index.
  if (files.length < 10) {
    console.error(`[archetype-index] REFUSED — parsed only ${files.length} archetype(s) from the monolith; expected 20+. Heading format drift? No files were deleted.`);
    process.exit(3);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  // Remove stale generated splits (renames leave orphans otherwise).
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('.md')) rmSync(join(OUT_DIR, f));
  for (const f of files) writeFileSync(join(OUT_DIR, f.name), f.content);
  writeFileSync(join(OUT_DIR, 'index.json'), indexJson);
  const kb = (Buffer.byteLength(indexJson) / 1024).toFixed(2);
  console.log(`[archetype-index] generated ${files.length} splits + index.json (${kb} KB) from monolith @ ${srcSha}`);
  if (Buffer.byteLength(indexJson) > 2048) console.warn(`[archetype-index] WARN: index.json is ${kb} KB — over the 2KB routing-table target`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
