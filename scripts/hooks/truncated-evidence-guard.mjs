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
 * Detection is FILE-SCOPED. A staged markdown file under docs/ or .ai-workflow/
 * is blocked when its ADDED lines contain, ANYWHERE in the file:
 *   (a) an absence/negation claim ("does not exist", "hallucinated", "no such",
 *       "is fiction", "not present", "nowhere in the repo", "returned nothing"), and
 *   (b) a truncating instrument (| head, | tail, sed -n '1,N p', grep -m N,
 *       --max-count, LIMIT n, head_limit, first page, .slice(0,N))
 *
 * ...unless the added lines ALSO carry a DENOMINATOR — a stated total ("N of M",
 * "enumerated N", "count:", "exit 1", "catalog-check") proving the scan was complete.
 *
 * File-scoped, not window-scoped: dry-loop round 1 (2026-08-25) proved a ±6-line
 * window misses a claim 10 lines from its evidence row, and in a real review packet
 * the claim and its evidence sit in different table columns. The cost is asymmetric —
 * a false negative poisons paid reviewers, a false positive costs one EVIDENCE-OK line.
 *
 * The class is TRUNCATING INSTRUMENTS, not `head` specifically (GLM 5.3, P0
 * review, 2026-08-25 — the builder's first framing under-generalized).
 *
 * ESCAPE HATCH: put `EVIDENCE-OK: <reason>` anywhere in the file. It is deliberately
 * noisy so it shows up in review.
 *
 * FAIL-CLOSED on its own errors (was fail-open until the 2026-08-25 branch gate; see
 * failClosed()). Loud, named bypass: SWAN_GUARD_BYPASS=1.
 *
 * Claim is judged on ADDED lines; instrument and denominator on the FULL staged file
 * (a new claim above an old truncating command is the same poison — Grok, branch gate).
 */
import { execSync } from 'node:child_process';

const ABSENCE = /(does not exist|doesn't exist|do not exist|hallucinat|no such (file|entry|id|anchor)|is fiction|not present|nowhere in the (repo|file|codebase)|returned nothing|came back empty|there is no\b|never existed|absent from)/i;
// The class is TRUNCATING INSTRUMENTS. Widened 2026-08-25 (DeepSeek V4 Pro, branch gate):
// grep -q, find -quit, .splitlines()[0], .readline(), .first() are all "stop at the first hit".
const TRUNCATING = /(\|\s*head\b|\|\s*tail\b|head\s+-\d|tail\s+-\d|sed\s+-n\s*['"]?\d+,\d+p|grep\s+-m\s*\d|grep\s+-q\b|--max-count|\bLIMIT\s+\d|head_limit|first\s+page|\.slice\(0,\s*\d+\)|\.splitlines\(\)\[0\]|\.readline\(\)|find\b[^\n]*-quit|\.first\(\)|\bfirst\(\))/i;
const DENOMINATOR = /(\d+\s+of\s+\d+|enumerated\s+\d+|\bcount:\s*\d+|grep\s+-c\b|exit\s+(code\s+)?1\b|catalog-check|COMPLETE LIST|denominator)/i;
const ESCAPE = /EVIDENCE-OK:/;
const WINDOW = 6; // diff CONTEXT only; detection is FILE-scoped (see loop)

// FAIL CLOSED. Until the 2026-08-25 branch gate this guard failed open on its own errors, on
// the theory that a hook that breaks commits when IT is broken gets disabled. Five review
// seats (Ox, HY3, Grok, Kimi, DeepSeek) rejected that: this guard exists because a control
// that did not run looked like a control that passed — a guard that swallows its own crash is
// that failure wearing a hook's clothes. Emergency bypass is loud and named, never silent:
//   SWAN_GUARD_BYPASS=1 git commit ...
function failClosed(reason) {
  if (process.env.SWAN_GUARD_BYPASS === '1') {
    console.error(`[truncated-evidence-guard] !!! BYPASSED (SWAN_GUARD_BYPASS=1) despite internal error: ${reason}`);
    process.exit(0);
  }
  console.error(`[truncated-evidence-guard] BLOCKED — the guard itself failed and will not pretend it passed: ${reason}`);
  console.error('[truncated-evidence-guard] Fix the cause, or bypass LOUDLY with SWAN_GUARD_BYPASS=1 for this one commit.');
  process.exit(1);
}

let staged = [];
try {
  staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/)
    .filter((f) => /\.md$/i.test(f) && /^(docs|\.ai-workflow)\//.test(f));
} catch (err) {
  failClosed(`could not list staged files: ${err.message}`);
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
  } catch (err) {
    failClosed(`cannot diff ${file}: ${err.message}`);
  }

  const addedLines = added.filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));

  // The CLAIM must be new (added lines) — we judge new assertions, not old ones. But the
  // INSTRUMENT and the DENOMINATOR are judged over the FULL staged post-image of the file:
  // a new absence claim sitting above a truncating command that was already in the file is
  // the same poison with an older instrument (Grok 4.6, branch gate 2026-08-25 — the
  // file-scope fix from dry-loop round 1 had only closed half the hole).
  let postImage = '';
  try {
    postImage = execSync(`git show :"${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    failClosed(`cannot read staged post-image of ${file}: ${err.message}`);
  }

  // FILE-SCOPED, not window-scoped. Dry-loop round 1 (2026-08-25) proved a ±6-line
  // window MISSES a claim sitting 10 lines from its evidence row — and in a real review
  // packet the claim and its evidence cell are routinely far apart (the incident packet's
  // own G8 row had them in different table columns). The cost is asymmetric: a false
  // negative poisons paid reviewers, which is the exact incident this guard exists for;
  // a false positive costs one EVIDENCE-OK line. So if a file's ADDED lines contain an
  // absence claim anywhere AND a truncating instrument anywhere AND no denominator
  // anywhere, flag the file.
  const blob = addedLines.join('\n');
  if (ESCAPE.test(postImage)) continue;
  if (!ABSENCE.test(blob)) continue;          // claim: must be NEW
  if (!TRUNCATING.test(postImage)) continue;  // instrument: anywhere in the file
  if (DENOMINATOR.test(postImage)) continue;  // denominator: anywhere in the file

  findings.push({
    file,
    line: (addedLines.find((l) => ABSENCE.test(l)) || '').trim().slice(0, 160),
    instrument: (postImage.split(/\r?\n/).find((l) => TRUNCATING.test(l)) || '').trim().slice(0, 160),
  });
}

if (findings.length === 0) {
  console.log(`[truncated-evidence-guard] CLEAN — ${staged.length} staged doc(s) checked.`);
  process.exit(0);
}

console.error('');
console.error('[truncated-evidence-guard] BLOCKED — an absence claim sits next to a truncating instrument with no denominator.');
console.error('');
for (const f of findings) console.error(`  ${f.file}\n    claim:      ${f.line}\n    instrument: ${f.instrument}`);
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
