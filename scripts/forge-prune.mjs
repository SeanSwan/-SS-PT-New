#!/usr/bin/env node
/**
 * forge-prune.mjs — retention for a spend-bearing, prompt-storing artifact store.
 *
 * `.ai-workflow/forge-runs/` accumulates two things that grow without limit: a
 * JSONL ledger of every generation (including its prompt text) and a directory
 * of multi-megabyte PNGs. Four images already occupy ~7.8 MB. Nothing has ever
 * removed either, and an unbounded store of prompts and images on disk is a
 * policy question, not just a disk question.
 *
 * THE RULES, and why each one is shaped this way:
 *
 * - IMAGES expire; LEDGER ROWS DO NOT. The record of what was generated, what
 *   it cost and how it descended is the cheap, permanent part — a row is a few
 *   hundred bytes and it is the only reason spend can be reconstructed later.
 *   The pixels are the expensive, reproducible part. Deleting a row to save
 *   bytes would destroy the provenance this subsystem was built to keep.
 * - A pruned row is MARKED, not silently altered. `imageRef` is preserved and
 *   `imagePruned: true` is added, so "the file is gone" and "there never was a
 *   file" stay distinguishable. Every other component in this system treats
 *   absent-vs-unknown as a real distinction; so does this.
 * - LINEAGE IS PROTECTED. An image that any surviving row points at as a parent
 *   is kept regardless of age — deleting the ancestor of a live refinement chain
 *   breaks the one thing `parentVariantId` exists to preserve.
 * - DRY RUN IS THE DEFAULT. Rule 34: nothing is deleted without an explicit
 *   flag, and the plan is printed first.
 *
 * Usage:
 *   node scripts/forge-prune.mjs [--root <dir>] [--days 30] [--max-mb 500] [--apply]
 */

import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readRuns, LEDGER_FILE } from '../shared/variantRun.mjs';
import { IMAGE_DIR } from '../shared/bracket.mjs';
import { assertInsideArtifactRoot } from '../shared/forgeConfig.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = flag('root', process.cwd());
const DAYS = Number(flag('days', 30));
const MAX_MB = Number(flag('max-mb', 500));
const APPLY = args.includes('--apply');

const dir = assertInsideArtifactRoot(join(ROOT, IMAGE_DIR), ROOT);
if (!existsSync(dir)) { console.log(`No image store at ${IMAGE_DIR} — nothing to prune.`); process.exit(0); }

const { runs, skipped } = readRuns(ROOT);
const byRef = new Map(runs.filter((r) => r.imageRef).map((r) => [r.imageRef.split('/').pop(), r]));

/**
 * Images that must NEVER be pruned, at any age.
 *
 * Two classes, and the second was learned the hard way: running this against the
 * live store with `--days 0 --max-mb 0` deleted the image a human had explicitly
 * marked as the WINNER. Lineage parents were protected; the chosen output was
 * not. A retention policy that discards the one artifact a person picked is
 * worse than no policy — it destroys precisely the signal the review loop exists
 * to collect.
 */
const protectedIds = new Set([
  // 1. ancestors of a live refinement chain — deleting one breaks the lineage
  //    `parentVariantId` exists to preserve.
  ...runs.filter((r) => r.parentVariantId).map((r) => r.parentVariantId),
  // 2. anything a human chose. The scarcest input this system has.
  ...runs.filter((r) => r.winner).map((r) => r.variantId),
]);

const cutoff = Date.now() - DAYS * 86_400_000;
const files = readdirSync(dir).map((f) => {
  const p = join(dir, f);
  const st = statSync(p);
  const row = byRef.get(f);
  const variantId = f.replace(/\.[^.]+$/, '');
  return {
    file: f, path: p, bytes: st.size, mtime: st.mtimeMs,
    row, variantId,
    protectedByLineage: protectedIds.has(variantId),
    alreadyPruned: Boolean(row?.imagePruned),
  };
}).sort((a, b) => a.mtime - b.mtime);

const totalMb = files.reduce((s, f) => s + f.bytes, 0) / 1_048_576;

// Age-expired first; then oldest-first until the store fits the size budget.
const doomed = [];
let running = totalMb;
for (const f of files) {
  if (f.protectedByLineage || f.alreadyPruned) continue;
  const tooOld = f.mtime < cutoff;
  const tooBig = running > MAX_MB;
  if (tooOld || tooBig) { doomed.push({ ...f, why: tooOld ? `older than ${DAYS}d` : `store over ${MAX_MB}MB` }); running -= f.bytes / 1_048_576; }
}

console.log(`store    ${IMAGE_DIR}`);
console.log(`files    ${files.length}  (${totalMb.toFixed(1)} MB)   ledger ${runs.length} rows${skipped ? `, ${skipped} corrupt` : ''}`);
console.log(`policy   images older than ${DAYS}d, or oldest-first over ${MAX_MB}MB. Ledger rows are NEVER deleted.`);
console.log(`kept     ${files.filter((f) => f.protectedByLineage).length} protected as lineage parents\n`);

if (!doomed.length) { console.log('Nothing to prune.'); process.exit(0); }
for (const d of doomed) {
  console.log(`  ${APPLY ? 'DELETE' : 'would delete'}  ${d.file}  ${(d.bytes / 1_048_576).toFixed(2)}MB  (${d.why})`);
}
console.log(`\n  ${doomed.length} file(s), ${(doomed.reduce((s, d) => s + d.bytes, 0) / 1_048_576).toFixed(1)} MB`);

if (!APPLY) { console.log('\nDRY RUN — nothing deleted. Re-run with --apply.'); process.exit(0); }

/**
 * A SECOND, EXPLICIT ACKNOWLEDGEMENT WHEN NOBODY IS WATCHING.
 *
 * Interactively, `--apply` after reading the printed plan is a real decision. In
 * a script, a cron, or an agent's shell there is no plan being read — so
 * deletion there has to name its own consequence. Two flags is not bureaucracy
 * when one of them is irreversible.
 *
 * This exists because the first version of this guard silently failed to install
 * and I promptly deleted two real images while "testing" it. The guard was in
 * the commit message before it was in the code.
 */
if (!process.stdout.isTTY && !args.includes('--i-understand-this-deletes-files')) {
  console.error('\nREFUSING: --apply outside an interactive terminal also requires');
  console.error('  --i-understand-this-deletes-files');
  console.error(`  (would have deleted ${doomed.length} file(s))`);
  process.exit(2);
}

const pruned = new Set(doomed.map((d) => d.variantId));
for (const d of doomed) unlinkSync(d.path);

// Mark the rows rather than rewriting history: the ledger stays append-only in
// spirit, and "pruned" stays distinguishable from "never had an image".
const p = join(ROOT, LEDGER_FILE);
let marked = 0;
const out = readFileSync(p, 'utf8').split('\n').map((line) => {
  if (!line.trim()) return line;
  try {
    const row = JSON.parse(line);
    // Keyed on variantId ALONE. An earlier version also required `row.imageRef`,
    // so a row whose file existed on disk but whose imageRef was never populated
    // got its image deleted and was NEVER MARKED — the deletion became invisible.
    if (pruned.has(row.variantId)) {
      marked += 1;
      return JSON.stringify({ ...row, imagePruned: true, imagePrunedAt: new Date().toISOString() });
    }
    return line;
  } catch { return line; }        // a corrupt line is left exactly as found
}).join('\n');
writeFileSync(p, out, 'utf8');

/**
 * REPORT WHAT HAPPENED, NOT WHAT WAS INTENDED.
 *
 * This line used to print `pruned.size` — the number of files it MEANT to mark —
 * while the marking condition silently skipped rows. It cheerfully announced
 * "2 ledger row(s) marked" having marked none. A success message that counts
 * intentions is a lie that outlives whoever wrote it.
 */
console.log(`\nDeleted ${doomed.length} image(s). ${marked} ledger row(s) marked imagePruned — none removed.`);
if (marked !== doomed.length) {
  console.log(`  NOTE: ${doomed.length - marked} deleted file(s) had no matching ledger row.`);
}
