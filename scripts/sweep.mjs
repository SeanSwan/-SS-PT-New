#!/usr/bin/env node
/**
 * sweep.mjs — one command that searches EVERY surface, so the correct search is the
 * cheapest one.
 *
 * WHY: the corpus's worst-recurring failure family (88% after write-up) is stating a
 * fact about one file, one subtree, one branch, or one copy of a surface as if it were
 * true of the repo — and then reporting "absent." Twice on 2026-08-24 the same
 * workflow file existed in two places and a 15-round panel reviewed only one. A gate
 * that BLOCKS absence claims was proposed and killed by five review seats as a prose
 * ritual in hook form (Grok F2, Kimi F3, DeepSeek F5). What survives is this: lower the
 * cost of the wide search below the cost of the narrow one.
 *
 * Usage:
 *   node scripts/sweep.mjs <needle> [--regex] [--paths]
 *     <needle>   literal string (default) or regex (--regex)
 *     --paths    also treat the needle as a PATH and list remote branches carrying it
 *
 * Prints: hit counts per surface in the working tree, the same on origin/main (via
 * git grep, no checkout), and a one-line receipt you can paste into a claim. Read-only.
 * Exit 0 always — this is an instrument, not a gate; the verdict is yours.
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const needle = args.find((a) => !a.startsWith('--'));
if (!needle) { console.error('usage: node scripts/sweep.mjs <needle> [--regex] [--paths]'); process.exit(1); }
const isRegex = args.includes('--regex');
const wantPaths = args.includes('--paths');

const SURFACES = [
  ['frontend', 'frontend/src'], ['backend', 'backend'], ['scripts', 'scripts'],
  ['workflows', '.github/workflows'], ['docs', 'docs'], ['skills', '.claude/skills'],
];

const git = (a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
const countLines = (s) => (s.trim() ? s.trim().split('\n').length : 0);
const grepArgs = (extra) => ['grep', '-I', '-c', ...(isRegex ? ['-E'] : ['-F']), needle, ...extra];

console.log(`sweep: ${isRegex ? '/' + needle + '/' : JSON.stringify(needle)}\n`);
console.log('  surface     working-tree   origin/main');
let treeTotal = 0, mainTotal = 0;
for (const [label, path] of SURFACES) {
  const tree = git(grepArgs(['--', path])).trim().split('\n').filter(Boolean)
    .reduce((s, l) => s + Number(l.split(':').pop() || 0), 0);
  const main = git(grepArgs(['origin/main', '--', path])).trim().split('\n').filter(Boolean)
    .reduce((s, l) => s + Number(l.split(':').pop() || 0), 0);
  treeTotal += tree; mainTotal += main;
  console.log(`  ${label.padEnd(10)}  ${String(tree).padStart(12)}   ${String(main).padStart(11)}`);
}
console.log(`  ${'TOTAL'.padEnd(10)}  ${String(treeTotal).padStart(12)}   ${String(mainTotal).padStart(11)}`);

// Files, for the receipt (working tree, capped so the output stays readable).
const files = git(['grep', '-I', '-l', ...(isRegex ? ['-E'] : ['-F']), needle, '--', ...SURFACES.map((s) => s[1])])
  .trim().split('\n').filter(Boolean);
if (files.length) {
  console.log(`\n  files (${files.length}${files.length > 25 ? ', first 25' : ''}):`);
  for (const f of files.slice(0, 25)) console.log(`    ${f}`);
}

if (wantPaths) {
  const branches = git(['branch', '-r', '--format=%(refname:short)']).trim().split('\n').filter((b) => b && !b.endsWith('/HEAD'));
  const carrying = branches.filter((b) => git(['cat-file', '-e', `${b}:${needle}`]) !== null && (() => {
    try { execFileSync('git', ['cat-file', '-e', `${b}:${needle}`], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } }); return true; } catch { return false; }
  })());
  console.log(`\n  as a PATH — remote branches carrying it: ${carrying.length}/${branches.length}`);
  for (const b of carrying.slice(0, 15)) console.log(`    ${b}`);
}

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
console.log(`\n  receipt: sweep "${needle}" → tree ${treeTotal} hits / origin/main ${mainTotal} hits (branch ${branch}, ${new Date().toISOString().slice(0, 16)}Z)`);
console.log('  Zero everywhere is a finding only if this same command finds a KNOWN-PRESENT needle. Run the control.');
