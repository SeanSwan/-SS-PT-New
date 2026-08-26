#!/usr/bin/env node
/**
 * truncated-evidence-guard.mjs — pre-commit guard against absence claims backed
 * by a truncating instrument.
 *
 * WHY (2026-08-25): a review packet asserted `world.miniature-play.voxel-realm`
 * "does not exist" and that the citing plan had "hallucinated a repo anchor".
 * It existed — entry 16 of 18. The evidence command was `grep ... | head -8`;
 * entries 14 and 15 filled the cap first. Five paid reviewers received the false
 * row as grounded fact; four made it a P0 blocker. The identical failure class
 * (truncated instrument reports clean/empty) had been documented in this repo's
 * learning corpus hours earlier and recurred anyway — which is precisely why this
 * is a hook and not a paragraph.
 *
 * WHAT IT BLOCKS
 * A staged markdown file under docs/ or .ai-workflow/ whose ADDED lines contain
 * BOTH:
 *   (a) an absence/negation claim ("does not exist", "hallucinated", "no such",
 *       "is fiction", "not present", "nowhere in the repo", "returned nothing"), and
 *   (b) a truncating instrument on a nearby line (| head, | tail, sed -n '1,N p',
 *       grep -m N, --max-count, LIMIT n, head_limit, first page)
 *
 * ...unless the same window also carries a DENOMINATOR — a stated total
 * ("N of M", "enumerated N", "count:", "exit 1", "catalog-check") proving the
 * scan was complete.
 *
 * The class is TRUNCATING INSTRUMENTS, not `head` specifically (GLM 5.3, P0
 * review, 2026-08-25 — the builder's first framing under-generalized).
 *
 * ESCAPE HATCH: put `EVIDENCE-OK: <reason>` on a line inside the window. It is
 * deliberately noisy so it shows up in review.
 *
 * Fail-open on its own errors: a guard that breaks commits when IT is broken
 * gets disabled, and a disabled guard protects nothing.
 */
import { execSync } from 'node:child_process';

const ABSENCE = /(does not exist|doesn't exist|do not exist|hallucinat|no such (file|entry|id|anchor)|is fiction|not present|nowhere in the (repo|file|codebase)|returned nothing|came back empty|there is no\b|never existed|absent from)/i;
const TRUNCATING = /(\|\s*head\b|\|\s*tail\b|head\s+-\d|tail\s+-\d|sed\s+-n\s*['"]?\d+,\d+p|grep\s+-m\s*\d|--max-count|\bLIMIT\s+\d|head_limit|first\s+page|\.slice\(0,\s*\d+\))/i;
const DENOMINATOR = /(\d+\s+of\s+\d+|enumerated\s+\d+|\bcount:\s*\d+|grep\s+-c\b|exit\s+(code\s+)?1\b|catalog-check|COMPLETE LIST|denominator)/i;
const ESCAPE = /EVIDENCE-OK:/;
const WINDOW = 6; // lines either side

let staged = [];
try {
  staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((f) => /\.md$/i.test(f) && /^(docs|\.ai-workflow)\//.test(f));
} catch {
  console.log('[truncated-evidence-guard] could not list staged files — SKIP (fail-open)');
  process.exit(0);
}

if (staged.length === 0) {
  console.log('[truncated-evidence-guard] no staged docs markdown — SKIP');
  process.exit(0);
}

const findings = [];

for (const file of staged) {
  let added;
  try {
    // Only ADDED lines, with their positions, so we judge new claims not old ones.
    const diff = execSync(`git diff --cached -U${WINDOW} -- "${file}"`, { encoding: 'utf8' });
    added = diff.split(/\r?\n/);
  } catch {
    continue; // fail-open per file
  }

  const addedLines = added.filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));

  for (let i = 0; i < addedLines.length; i += 1) {
    const line = addedLines[i];
    if (!ABSENCE.test(line)) continue;

    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(addedLines.length, i + WINDOW + 1);
    const window = addedLines.slice(lo, hi).join('\n');

    if (ESCAPE.test(window)) continue;
    if (!TRUNCATING.test(window)) continue;
    if (DENOMINATOR.test(window)) continue;

    findings.push({ file, line: line.trim().slice(0, 160) });
  }
}

if (findings.length === 0) {
  console.log(`[truncated-evidence-guard] CLEAN — ${staged.length} staged doc(s) checked.`);
  process.exit(0);
}

console.error('');
console.error('[truncated-evidence-guard] BLOCKED — an absence claim sits next to a truncating instrument with no denominator.');
console.error('');
for (const f of findings) console.error(`  ${f.file}\n    ${f.line}`);
console.error('');
console.error('  A capped command cannot prove absence. On 2026-08-25 a `| head -8` grep over an 18-entry');
console.error('  catalog produced a false "does not exist", which five paid reviewers then built on.');
console.error('');
console.error('  Fix one of:');
console.error('    1. Re-verify with an uncapped enumerator and cite it:');
console.error('         node scripts/assets/catalog-check.mjs <catalog> <id>   # prints the full list + exit 1 on absence');
console.error('    2. State the denominator inline ("enumerated 18 ids, X is not among them").');
console.error('    3. If the pairing is genuinely fine, add  EVIDENCE-OK: <reason>  inside the block.');
console.error('');
process.exit(1);
