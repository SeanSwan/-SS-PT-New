#!/usr/bin/env node
/**
 * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
 *
 * The Design Brain is markdown that agents load at task time. Six failure modes rot it
 * silently, and every one has shipped to `main` at least once:
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
 *   D5 PHANTOM    a `<name>.md §N` citation whose FILE exists nowhere in the repo — a typo,
 *                 or a deletion that left its citations behind. Only the explicit §-bearing
 *                 form is gated; see the D5 SCOPE note below for why bare mentions are not.
 *   D6 ATTICKED   a citation of a doc that survives only in `docs/_attic/`. It exists, so D5
 *                 passes and the external-refs NOTE swallows it — while an agent follows
 *                 retired doctrine. Carries a dated baseline; see the D6 note below.
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
    // Four dialects in use: `## §9 Title` · `## 4. Title` · `## 15.1 Title` · `### A2. Title`.
    // The decimal form is real (cinematic-pages.md §15.1) and the LETTERED form is real
    // (adapters/reviewers.md A1-A4). Omitting either left a live section looking dangling, or —
    // worse for letters — left a file with an EMPTY section map, so every ref into it was
    // permanently unverifiable while reporting nothing.
    const m = /^#{2,3}\s+(?:§\s*)?([A-Z]?\d+(?:\.\d+)?)\.?\s+(.*)$/.exec(line);
    if (m) map.set(m[1].toUpperCase(), m[2].trim());
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
const MAX_RANGE_SPAN = 50;
const MAX_REFS_PER_EXPR = 60; // bounds EVERY expansion path, not just dash-ranges

/**
 * D5 SCOPE — why bare filename mentions are NOT gated, despite a reviewer asking for it.
 *
 * The proposal was: any `<name>.md` mention that resolves to nothing is file rot. Implemented
 * as stated it produced 13 findings, and ALL THIRTEEN were false positives — `adapters/index.md`
 * carries a table of adapters "originally planned / merged into", and `qa-gates.md` names the
 * three files it deliberately replaced. **This corpus legitimately names files that never
 * existed, as history.** A bare mention is not a citation, and telling them apart needs intent.
 *
 * So D5 gates only the EXPLICIT form — `<name>.md §N`, where the author demonstrably meant to
 * cite — and a phantom there is a typo or a deletion, not a planning record. Same discipline as
 * the bare-`§N` rule: under-report rather than cry wolf, because a gate that fires on honest
 * prose gets switched off, and then it protects nothing at all.
 */

function refsIn(line) {
  const out = [];
  // Continuation accepts `,` / `and` / an en-, em- or hyphen RANGE. Ranges are EXPANDED:
  // `§§9–22` means every section from 9 to 22, and reading it as a single ref to §9 is how a
  // half-dangling range ships undetected — which is exactly what happened on components.md:4,
  // the "Extends" header line of the most-loaded satellite, inside the branch that killed this class.
  // Path component captured too (`adapters/reviewers.md`, `./index.md`) — four files in this
  // corpus are named index.md, so a basename-only match resolves against the wrong one.
  // Separator between filename and `§` is `.{0,3}` — prose uses backticks, commas, colons,
  // dashes and parens, and restricting it to whitespace+backtick is what hid 8 refs behind a
  // backtick in the first place. Continuations cover `,` `and` `to` `&` `/` and en/em/hyphen
  // ranges: `§8/§18` was dropping its tail, which is the half-dangling class in a new costume.
  // Separator is an EXPLICIT bounded class, not `.{0,N}`. A wildcard both under-matches
  // (`` `design.md` — §9 `` needs 4 chars: backtick, space, dash, space) and over-matches into
  // real prose. Listing the punctuation that actually appears between a filename and its § is
  // narrower and wider at once.
  const re = /((?:\.{0,2}\/)?(?:[a-z0-9._-]+\/)*[a-z0-9._-]+\.md)[\s`,:;)\]．.–—-]{0,6}§{1,2}\s*([A-Z]?\d+(?:\.\d+)?(?:\s*(?:,|and|to|&|\/|[–—-])\s*§{0,2}\s*[A-Z]?\d+(?:\.\d+)?)*)/gi;
  let m;
  while ((m = re.exec(line)) !== null) {
    const body = m[2];
    const before = out.length;
    for (const part of body.split(/\s*(?:,|and|&|\/|to)\s*/)) {
      const t = part.trim();
      if (!t) continue;
      const range = /^§{0,2}\s*([A-Z]?\d+(?:\.\d+)?)\s*[–—-]\s*§{0,2}\s*([A-Z]?\d+(?:\.\d+)?)$/i.exec(t);
      if (range) {
        const [lo, hi] = [range[1], range[2]];
        // Only a purely-integer range is expandable. Decimal or lettered operands cannot be
        // enumerated, and silently checking just the low end reintroduces the exact
        // half-dangling bug this expansion exists to kill — so they are malformed, not partial.
        if (/^\d+$/.test(lo) && /^\d+$/.test(hi) && +hi >= +lo && +hi - +lo <= MAX_RANGE_SPAN) {
          for (let i = +lo; i <= +hi; i++) out.push({ file: m[1], n: String(i), raw: m[0] });
        } else {
          out.push({ file: m[1], n: `${lo}-${hi}`, raw: m[0], malformed: true });
        }
      } else {
        const one = /§{0,2}\s*([A-Z]?\d+(?:\.\d+)?)/i.exec(t);
        if (one) out.push({ file: m[1], n: one[1].toUpperCase(), raw: m[0] });
      }
    }
    // Bound EVERY expansion path, not just dash-ranges. A comma chain (`§99, 99, 99, …`) was
    // an unbounded flood one separator over from the DoS already fixed — same failure, and the
    // bound belongs on refs-emitted-per-expression rather than on any single syntactic form.
    if (out.length - before > MAX_REFS_PER_EXPR) {
      out.length = before;
      out.push({ file: m[1], n: `${body.slice(0, 24)}…`, raw: m[0], malformed: true });
    }
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
// Keyed by full corpus-relative path, lower-cased. Basename keying collided: FOUR files here
// are named index.md (top level, adapters/, obsidian/, graphify/), so `index.md §3` silently
// resolved against whichever was read last.
for (const rel of mdFiles) sectionsByFile.set(rel.toLowerCase(), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));

/**
 * Resolve a cited path the way a reader would: relative to the citing file's directory first,
 * then as a corpus-root path, then — only if the basename is UNIQUE — by basename. An ambiguous
 * bare basename is reported rather than guessed, because guessing is what produced the collision.
 */
function resolveTarget(cited, fromRel) {
  const clean = cited.replace(/^\.\//, '').toLowerCase();
  const dir = fromRel.includes('/') ? fromRel.slice(0, fromRel.lastIndexOf('/')).toLowerCase() : '';
  const candidates = [];
  if (clean.startsWith('../')) candidates.push(clean.replace(/^\.\.\//, ''));
  if (dir) candidates.push(`${dir}/${clean}`);
  candidates.push(clean);
  for (const c of candidates) if (sectionsByFile.has(c)) return { key: c, sections: sectionsByFile.get(c) };
  const base = basename(clean);
  const byBase = [...sectionsByFile.keys()].filter((k) => basename(k) === base);
  if (byBase.length === 1) return { key: byBase[0], sections: sectionsByFile.get(byBase[0]) };
  if (byBase.length > 1) return { ambiguous: byBase };
  return null;
}

/**
 * Every markdown file reachable in the repo, by basename and by repo-relative path. Lets the
 * gate tell a legitimate EXTERNAL citation apart from a TYPO or a deleted file — the
 * distinction I1 asked for and a NOTE could never make, because a note is read once.
 */
const REPO_ROOT = join(BRAIN, '..', '..', '..');
const repoMd = { paths: new Set(), names: new Set() };
for (const sub of ['docs', '.claude', '.agents', 'scripts', 'AI-Village-Documentation']) {
  (function walkRepo(dir, rel) {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walkRepo(p, r);
      else if (e.name.endsWith('.md')) { repoMd.paths.add(r.toLowerCase()); repoMd.names.add(e.name.toLowerCase()); }
    }
  })(join(REPO_ROOT, sub), sub);
}
for (const e of readdirSync(REPO_ROOT, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.md')) { repoMd.paths.add(e.name.toLowerCase()); repoMd.names.add(e.name.toLowerCase()); }
}
const existsInRepo = (cited) => {
  const c = cited.replace(/^\.{0,2}\//, '').toLowerCase();
  return repoMd.paths.has(c) || repoMd.names.has(basename(c));
};

/** Basenames of every markdown file under docs/_attic — the documented home for retired docs. */
const atticBasenames = new Set();
(function walkAttic(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walkAttic(join(dir, e.name));
    else if (e.name.endsWith('.md')) atticBasenames.add(e.name.toLowerCase());
  }
})(join(REPO_ROOT, 'docs', '_attic'));

/**
 * D6 ATTICKED CITATION — a corpus file citing a doc that now lives only in `docs/_attic/`.
 * It "exists", so D5 passes and the external-refs NOTE swallows it forever, indistinguishable
 * from a legitimate outside reference. But it is retired doctrine being pointed at as live.
 *
 * BASELINE, 2026-08-16: 15 known instances, concentrated in `adapters/knowledge.md`, whose
 * entire routing table points at four atticked policy docs while its header says "real policy
 * lives in ../obsidian/ and ../graphify/" — directories that now hold only an index. Whether
 * that adapter is retired, rewritten, or the policies restored is Sean's call, not a
 * mechanical repair, so the known set is allowlisted rather than silently fixed or silently
 * ignored. The gate blocks any NEW occurrence. Shrinking this list is the unit of progress;
 * it must never grow. Tracked in SWA-163.
 */
const ATTIC_CITATION_BASELINE = new Set([
  'adapters/fable.md', 'adapters/knowledge.md', 'adapters/reviewers.md', 'anti-patterns.md', 'index.md',
]);
const atticCitations = [];

const dangling = [];
const resolved = [];
const skippedTargets = new Map(); // resolvable-elsewhere targets: informational only
const phantomFiles = new Map();   // D5: cited files that exist NOWHERE — typo or deletion
for (const rel of mdFiles) {
  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
  fileLines.forEach((line, i) => {
    for (const { file: target, n, raw, malformed } of refsIn(line)) {
      const hit = resolveTarget(target, rel);
      if (!hit || hit.ambiguous) {
        const label = hit?.ambiguous ? `${target} (AMBIGUOUS in corpus: ${hit.ambiguous.join(' | ')})` : target;
        if (!hit && !existsInRepo(target)) phantomFiles.set(`${rel}:${i + 1}  ${target}`, true);
        else skippedTargets.set(label, (skippedTargets.get(label) ?? 0) + 1);
        continue;
      }
      const rec = { file: rel, line: i + 1, target: hit.key, n, raw, ctx: line.trim().slice(0, 110) };
      // A malformed range (reversed, or absurdly wide) can never resolve — it is reported as
      // one defect, not expanded into thousands.
      if (malformed) dangling.push(rec);
      else if (hit.sections.has(n)) resolved.push({ ...rec, title: hit.sections.get(n) });
      else dangling.push(rec);
    }
    // Bare filename mentions (no `§N`) are deliberately NOT gated — see the D5 note above.
    // D6: citing a doc that survives only in the attic. Applies to bare mentions too, because
    // the harm (an agent following retired policy) does not need a section number.
    for (const m of line.matchAll(/([a-z0-9._-]+\.md)/gi)) {
      const nm = m[1].toLowerCase();
      if (!atticBasenames.has(nm)) continue;
      if (sectionsByFile.has(nm) || [...sectionsByFile.keys()].some((k) => basename(k) === nm)) continue;
      if (ATTIC_CITATION_BASELINE.has(rel)) continue;
      atticCitations.push({ file: rel, line: i + 1, cited: m[1], ctx: line.trim().slice(0, 100) });
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
const numeric = (keys) => [...keys].filter((k) => /^\d+$/.test(k)).map(Number);
const canonMax = Math.max(...numeric(sections.keys()));
const impossibleBare = [];
for (const rel of mdFiles) {
  // Keyed by FULL PATH. `basename(rel)` was a stale key left over from the earlier map: every
  // subdirectory file resolved to undefined (ownMax 0, so valid self-refs false-flagged), and
  // `obsidian/index.md` silently read the ROOT index's map — the wrong file's data. The
  // "all four classes re-proven" run could not catch it: it used a root file, where
  // basename(rel) === rel.
  const ownMax = Math.max(0, ...numeric(sectionsByFile.get(rel.toLowerCase())?.keys() ?? []));
  lines(readFileSync(join(BRAIN, rel), 'utf8')).forEach((line, i) => {
    // Strip attributed refs using refsIn's OWN matches, not a second regex. Two regexes
    // describing "a reference" drift apart — and these already had, so D4 flagged tails that
    // D1 had legitimately consumed.
    let bare = line;
    for (const r of refsIn(line)) bare = bare.split(r.raw).join(' ');
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
// EXACT names, not substring containment. `techniques.md` is a substring of the listed
// `field-techniques.md`, so a containment test can never see the `techniques.md` row being
// deleted — the index law would be enforced by a mechanism blind to its own most likely failure.
const indexLines = lines(indexText);
const listedExact = new Set(
  [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => basename(m[1])),
);
// Compare on the corpus-relative PATH where the index gives one, falling back to basename.
// Basename-only collapsing let all four index.md files be satisfied by the single root listing.
const listedPaths = new Set([...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1].toLowerCase()));
const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f)
  && !listedPaths.has(f.toLowerCase()) && !(f.indexOf('/') === -1 && listedExact.has(basename(f))));
// index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
// the world-factory skill). Those are cross-references, not orphans — resolve any listed
// path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
const REPO = join(BRAIN, '..', '..', '..');


const listedNames = [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1]);
const orphaned = [...new Set(listedNames)].filter((name) => {
  if (mdFiles.some((f) => f === name || basename(f) === basename(name))) return false; // in this folder
  if (existsSync(join(BRAIN, name))) return false;                                     // folder-relative
  if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
  // Bare names may cite the two source-of-truth docs, which live in references/.
  if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
  // Retired docs move to docs/_attic/. An index entry that HONESTLY records a file as atticked
  // is documentation; a row still presenting it as live doctrine is the 4d192e5ac rot itself.
  //
  // Exempting by basename alone could not tell those apart, so the gate was silent on exactly
  // the historical failure it was built for — while index.md claimed it "now catches (D3)".
  // That is this branch committing the sin it exists to purge. The exemption now requires the
  // MENTION ITSELF to be marked ATTICKED, so an honest record passes and a live-looking row fails.
  // Lower-cased: the attic set is keyed lower-case for D6, and comparing a raw basename against
  // it worked only because every current filename happens to be lower-case already. A guard that
  // passes by coincidence is a guard that fails the first time someone capitalises a file.
  if (atticBasenames.has(basename(name).toLowerCase())) {
    const mentioned = indexLines.filter((l) => l.includes(name) || l.includes(basename(name)));
    const allMarked = mentioned.length > 0 && mentioned.every((l) => /ATTICKED/i.test(l));
    if (allMarked) return false;
  }
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

/**
 * The gate gates its own docstring. Four separate times in this branch a defect class was
 * added and the header, the hook message, or the README kept describing the old set — the
 * exact "doctrine describes what the code no longer does" failure the whole corpus repave
 * exists to kill. A prose law without a mechanism is decoration, including this file's own.
 *
 * SCOPE LIMIT, stated so it is not mistaken for coverage: this checks THIS FILE'S header only.
 * The README's prose description of the gate is NOT machine-checkable against behaviour, and it
 * drifted again after this self-check was added — the mechanism worked exactly as far as it
 * reached and no further. A narrower guard that is honest about its edge beats a wider one that
 * is trusted past it.
 */
const emittedClasses = [...readFileSync(fileURLToPath(import.meta.url), 'utf8')
  .matchAll(/console\.log\(`(D\d) /g)].map((m) => m[1]);
const documentedClasses = [...readFileSync(fileURLToPath(import.meta.url), 'utf8')
  .matchAll(/^ \*   (D\d) /gm)].map((m) => m[1]);
const undocumented = [...new Set(emittedClasses)].filter((c) => !documentedClasses.includes(c));
if (undocumented.length) {
  console.error(`[brain-links] SELF-CHECK FAILED — this file emits ${undocumented.join(', ')} but its own header does not document ${undocumented.length > 1 ? 'them' : 'it'}. Document the class before shipping it.`);
  process.exit(2);
}

let bad = 0;
if (dangling.length) {
  bad += dangling.length;
  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a section that does not exist:`);
  for (const d of dangling) {
    // Numeric keys only. Mapping a lettered key (`A2`) through Number gives NaN, and a list of
    // NaNs is truthy — so a lettered-section file reported its range as "§NaN–§NaN".
    const allKeys = [...(sectionsByFile.get(d.target)?.keys() ?? [])];
    const have = numeric(allKeys).sort((a, b) => a - b);
    const lettered = allKeys.filter((k) => /^[A-Z]/.test(k)).sort();
    const range = have.length ? `§${have[0]}–§${have[have.length - 1]}`
      : lettered.length ? `only lettered sections ${lettered[0]}–${lettered[lettered.length - 1]}`
      : '(no numbered sections)';
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

if (atticCitations.length) {
  bad += atticCitations.length;
  console.log(`D6 ATTICKED CITATION — ${atticCitations.length} citation(s) of retired doctrine that now lives only in docs/_attic/:`);
  for (const a of atticCitations) console.log(`  ${a.file}:${a.line}  ${a.cited}
      ${a.ctx}`);
  console.log('');
}
if (phantomFiles.size) {
  bad += phantomFiles.size;
  console.log(`D5 PHANTOM FILE — ${phantomFiles.size} citation(s) of a markdown file that exists NOWHERE in the repo (typo, or the file was deleted and the citation left behind):`);
  for (const k of [...phantomFiles.keys()].sort()) console.log(`  ${k}`);
  console.log('');
}
if (skippedTargets.size) {
  console.log(`NOTE — ${skippedTargets.size} referenced file(s) live outside this corpus. Each is confirmed to EXIST in the repo (a citation of a file that exists nowhere fails as D5), but their sections are not parsed, so the §N is unverified:`);
  for (const [t, c] of [...skippedTargets].sort()) console.log(`  ${t} (${c} ref${c > 1 ? 's' : ''})`);
  console.log('');
}
console.log(
  `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
  `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare · ${[...skippedTargets.values()].reduce((a,b)=>a+b,0)} external ref(s) · ${phantomFiles.size} phantom · ${atticCitations.length} attic-cite (baseline: ${ATTIC_CITATION_BASELINE.size} files)`,
);
if (bad) {
  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
  process.exit(1);
}
console.log('[brain-links] CLEAN');
