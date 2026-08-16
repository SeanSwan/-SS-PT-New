#!/usr/bin/env node
/**
 * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
 *
 * The Design Brain is markdown that agents load at task time. Three failure modes rot it
 * silently, and all three have shipped to `main` at least once:
 *
 *   D1 DANGLING   a satellite cites `design.md §N` for an N that no longer exists.
 *                 A canon rewrite renumbered §1-28 down to §1-17 and no satellite followed.
 *                 An agent that follows a dead pointer resolves safely by SKIPPING the
 *                 doctrine it could not find — so canon supremacy becomes fiction.
 *   D2 UNINDEXED  `index.md` declares "every file in this folder is listed here", then
 *                 does not list the folder's newest files. Index-driven loaders never see them.
 *   D3 ORPHANED   `index.md` lists a file that no longer exists.
 *
 * This checker is deliberately dumb and deterministic: it parses headings and references,
 * it never calls a model, and it exits non-zero so CI and pre-commit can gate on it.
 *
 * It does NOT judge whether a resolvable reference points at the RIGHT section — that is a
 * semantic call. `--titles` prints every reference beside its target's heading so a human
 * (or a review agent) can audit wrong-target refs, which are more dangerous than dangling
 * ones because they resolve confidently to the wrong doctrine.
 *
 * Usage:
 *   node scripts/design-brain/check-brain-links.mjs            # gate: exit 1 on any defect
 *   node scripts/design-brain/check-brain-links.mjs --titles   # audit aid: ref -> target heading
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'ai-workflow', 'design-brain');
const CANON = 'design.md';
const showTitles = process.argv.includes('--titles');

if (!existsSync(join(BRAIN, CANON))) {
  console.error(`[brain-links] canon not found: ${join(BRAIN, CANON)}`);
  process.exit(2);
}

/**
 * Split on either line ending. This repo is CRLF; in JavaScript `.` does NOT match `\r`
 * (it is a line terminator), so a trailing `\r` silently defeats any `$`-anchored regex.
 * Normalising here rather than per-regex is the difference between this checker working
 * and it reporting CLEAN on a broken corpus.
 */
const lines = (text) => text.split(/\r?\n/);

/** Section numbers + headings declared by the canon. */
const canonText = readFileSync(join(BRAIN, CANON), 'utf8');
const sections = new Map();
for (const line of lines(canonText)) {
  const m = /^##\s+§(\d+)\s+(.*)$/.exec(line);
  if (m) sections.set(m[1], m[2].trim());
}
if (!sections.size) {
  console.error('[brain-links] parsed zero sections from canon — heading format changed; fix this checker before trusting it');
  process.exit(2);
}

/**
 * Every reference to a canon section, including the `§§14, 18` multi-form.
 * Returns [{ n, raw }] for one line.
 */
function refsIn(line) {
  const out = [];
  // Match `design.md §N`, `design.md §§N, M`, `design.md §§N and M`.
  const re = /design\.md\s+§{1,2}\s*(\d+(?:\s*(?:,|and)\s*§?\s*\d+)*)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    for (const n of m[1].match(/\d+/g) ?? []) out.push({ n, raw: m[0] });
  }
  return out;
}

const mdFiles = [];
(function walk(dir, rel = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, rel ? `${rel}/${e.name}` : e.name);
    else if (e.name.endsWith('.md')) mdFiles.push(rel ? `${rel}/${e.name}` : e.name);
  }
})(BRAIN);

const dangling = [];
const resolved = [];
for (const rel of mdFiles) {
  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
  fileLines.forEach((line, i) => {
    for (const { n, raw } of refsIn(line)) {
      const rec = { file: rel, line: i + 1, n, raw, ctx: line.trim().slice(0, 110) };
      if (sections.has(n)) resolved.push(rec);
      else dangling.push(rec);
    }
  });
}

// D2/D3: index.md must list exactly the folder's markdown files (excluding itself + backups).
const indexText = existsSync(join(BRAIN, 'index.md')) ? readFileSync(join(BRAIN, 'index.md'), 'utf8') : '';
const IGNORE = new Set(['index.md']);
const isBackup = (f) => /\.(pre-redo|bak|orig)$/.test(f) || f.endsWith('.pre-redo');
const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !indexText.includes(basename(f)));
// index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
// the world-factory skill). Those are cross-references, not orphans — resolve any listed
// path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
const REPO = join(BRAIN, '..', '..', '..');

/** Basenames of every markdown file under docs/_attic — the documented home for retired docs. */
const atticBasenames = new Set();
(function walkAttic(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walkAttic(join(dir, e.name));
    else if (e.name.endsWith('.md')) atticBasenames.add(e.name);
  }
})(join(REPO, 'docs', '_attic'));

const listedNames = [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1]);
const orphaned = [...new Set(listedNames)].filter((name) => {
  if (mdFiles.some((f) => f === name || basename(f) === basename(name))) return false; // in this folder
  if (existsSync(join(BRAIN, name))) return false;                                     // folder-relative
  if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
  // Bare names may cite the two source-of-truth docs, which live in references/.
  if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
  // Retired docs move to docs/_attic/. An index row that HONESTLY records a file as
  // atticked (with its new home) is documentation, not an orphan — the D3 defect is an
  // index pointing at nothing, not an index admitting something moved.
  if (atticBasenames.has(basename(name))) return false;
  return true;
});

if (showTitles) {
  console.log('REFERENCE AUDIT — check each ref against its target heading (wrong-target refs resolve, but mislead):\n');
  for (const r of resolved) {
    console.log(`  ${r.file}:${r.line}  §${r.n} = ${sections.get(r.n)}`);
    console.log(`      ${r.ctx}`);
  }
  console.log('');
}

let bad = 0;
if (dangling.length) {
  bad += dangling.length;
  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a canon section that does not exist (canon has §1–§${Math.max(...[...sections.keys()].map(Number))}):`);
  for (const d of dangling) console.log(`  ${d.file}:${d.line}  "${d.raw}"\n      ${d.ctx}`);
  console.log('');
}
if (unindexed.length) {
  bad += unindexed.length;
  console.log(`D2 UNINDEXED — ${unindexed.length} file(s) present but absent from index.md, whose own law is "every file in this folder is listed here":`);
  for (const f of unindexed) console.log(`  ${f}`);
  console.log('');
}
if (orphaned.length) {
  bad += orphaned.length;
  console.log(`D3 ORPHANED — ${orphaned.length} file(s) listed in index.md but not on disk:`);
  for (const f of orphaned) console.log(`  ${f}`);
  console.log('');
}

console.log(
  `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
  `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
  `${unindexed.length} unindexed · ${orphaned.length} orphaned`,
);
if (bad) {
  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
  process.exit(1);
}
console.log('[brain-links] CLEAN');
