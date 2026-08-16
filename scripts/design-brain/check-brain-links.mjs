#!/usr/bin/env node
/**
 * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
 *
 * The Design Brain is markdown that agents load at task time. Three failure modes rot it
 * silently, and all three have shipped to `main` at least once:
 *
 *   D1 DANGLING   a file cites `<other>.md §N` for an N that does not exist — canon refs
 *                 (`design.md §N`) and satellite-to-satellite refs (`motion.md §4`) alike.
 *                 A canon rewrite renumbered §1-28 down to §1-17 and no satellite followed.
 *                 An agent that follows a dead pointer resolves safely by SKIPPING the
 *                 doctrine it could not find — so canon supremacy becomes fiction.
 *   D2 UNINDEXED  `index.md` declares "every file in this folder is listed here", then
 *                 does not list the folder's newest files. Index-driven loaders never see them.
 *   D3 ORPHANED   `index.md` lists a file that no longer exists.
 *   D4 IMPOSSIBLE a bare `§N` (no filename) that resolves under NO reading — it exceeds both
 *                 canon's highest section and its own file's. Found `components.md` citing
 *                 `§18` for a two-step-arm modal that is `§17`, in a 17-section file.
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

/**
 * Section numbers + headings for one file. Two heading dialects are in use:
 * canon writes `## §9 Space, elevation, z`; satellites write `## 4. Where motion is banned`.
 * Both are parsed so cross-file references can be validated, not just references to canon.
 */
function sectionsOf(text) {
  const map = new Map();
  for (const line of lines(text)) {
    const m = /^##\s+(?:§\s*(\d+)|(\d+)\.)\s+(.*)$/.exec(line);
    if (m) map.set(m[1] ?? m[2], m[3].trim());
  }
  return map;
}

const canonText = readFileSync(join(BRAIN, CANON), 'utf8');
const sections = sectionsOf(canonText);
if (!sections.size) {
  console.error('[brain-links] parsed zero sections from canon — heading format changed; fix this checker before trusting it');
  process.exit(2);
}

/**
 * Every `<some-file>.md §N` reference on a line, including the `§§14, 18` multi-form.
 * Covers cross-file refs (e.g. `motion.md §4`), not just references to canon — a satellite
 * citing another satellite's renumbered section rots exactly the same way.
 *
 * Bare `§N` (no filename) is handled separately by `impossibleBareRefs` below — it cannot be
 * attributed to a file, but it can still be proven IMPOSSIBLE. See D4.
 */
function refsIn(line) {
  const out = [];
  const re = /([a-z0-9-]+\.md)\s+§{1,2}\s*(\d+(?:\s*(?:,|and)\s*§?\s*\d+)*)/gi;
  let m;
  while ((m = re.exec(line)) !== null) {
    for (const n of m[2].match(/\d+/g) ?? []) out.push({ file: m[1], n, raw: m[0] });
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

/** Section maps for every file in the corpus, keyed by basename, parsed once. */
const sectionsByFile = new Map();
for (const rel of mdFiles) sectionsByFile.set(basename(rel), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));

const dangling = [];
const resolved = [];
for (const rel of mdFiles) {
  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
  fileLines.forEach((line, i) => {
    for (const { file: target, n, raw } of refsIn(line)) {
      const targetSections = sectionsByFile.get(basename(target));
      // A reference to a file outside this corpus is not ours to validate.
      if (!targetSections) continue;
      const rec = { file: rel, line: i + 1, target: basename(target), n, raw, ctx: line.trim().slice(0, 110) };
      if (targetSections.has(n)) resolved.push({ ...rec, title: targetSections.get(n) });
      else dangling.push(rec);
    }
  });
}

/**
 * D4 IMPOSSIBLE BARE REF. A bare `§N` carries no filename, so it cannot be attributed —
 * it may mean canon or the containing file's own sections. It can still be proven
 * impossible: if N exceeds BOTH canon's highest section AND the containing file's own
 * highest, then no reading of it resolves. That is a dangling ref by any interpretation,
 * with no ambiguity to trade against — so it is safe to gate on.
 *
 * This is deliberately the weakest possible claim. A bare `§6` in a file with 17 sections
 * is NOT flagged even if it was meant as a canon ref to something else, because proving
 * that needs intent. Under-reporting here is the price of never crying wolf; the fix for
 * an ambiguous ref is to cite the filename, which promotes it to the D1 check above.
 */
const canonMax = Math.max(...[...sections.keys()].map(Number));
const impossibleBare = [];
for (const rel of mdFiles) {
  const ownMax = Math.max(0, ...[...(sectionsByFile.get(basename(rel))?.keys() ?? [])].map(Number));
  lines(readFileSync(join(BRAIN, rel), 'utf8')).forEach((line, i) => {
    // Strip attributed refs first so `motion.md §4` is not re-counted as a bare `§4`.
    const bare = line.replace(/[a-z0-9-]+\.md.{0,3}§+\s*[\d,\s]*\d/gi, '');
    for (const m of bare.matchAll(/§\s*(\d+)/g)) {
      const n = Number(m[1]);
      if (n > canonMax && n > ownMax) {
        impossibleBare.push({ file: rel, line: i + 1, n, ownMax, ctx: line.trim().slice(0, 110) });
      }
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
    console.log(`  ${r.file}:${r.line}  ${r.target} §${r.n} = ${r.title}`);
    console.log(`      ${r.ctx}`);
  }
  console.log('');
}

let bad = 0;
if (dangling.length) {
  bad += dangling.length;
  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a section that does not exist:`);
  for (const d of dangling) {
    const have = [...(sectionsByFile.get(d.target)?.keys() ?? [])].map(Number).sort((a, b) => a - b);
    const range = have.length ? `§${have[0]}–§${have[have.length - 1]}` : '(no numbered sections)';
    console.log(`  ${d.file}:${d.line}  "${d.raw}" — ${d.target} has ${range}, not §${d.n}\n      ${d.ctx}`);
  }
  console.log('');
}
if (unindexed.length) {
  bad += unindexed.length;
  console.log(`D2 UNINDEXED — ${unindexed.length} file(s) present but absent from index.md, whose own law is "every file in this folder is listed here":`);
  for (const f of unindexed) console.log(`  ${f}`);
  console.log('');
}
if (impossibleBare.length) {
  bad += impossibleBare.length;
  console.log(`D4 IMPOSSIBLE BARE REF — ${impossibleBare.length} bare §N that resolves under NO reading (exceeds canon's §${canonMax} and the file's own sections):`);
  for (const b of impossibleBare) {
    const own = b.ownMax > 0 ? `this file has §1–§${b.ownMax}` : 'this file has no numbered sections';
    console.log(`  ${b.file}:${b.line}  §${b.n} — canon has §1–§${canonMax}, ${own}\n      ${b.ctx}`);
  }
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
  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare`,
);
if (bad) {
  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
  process.exit(1);
}
console.log('[brain-links] CLEAN');
