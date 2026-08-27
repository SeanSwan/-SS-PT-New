#!/usr/bin/env node
/**
 * check-doc-identity.mjs — catch documents that cannot be identified by their own name.
 * =====================================================================================
 * WHY (Sean, 2026-08-27): "a lot of times I'll give a handoff report where it changed the
 * title to some completely random name, and then it starts to make me confused what I'm
 * working on. Then I have to deeply read everything."
 *
 * WHAT WAS ALREADY FIXED, AND WHAT WAS NOT — read this before assuming a bug:
 *   The CAUSE is fixed on origin/main. `scripts/context-gateway/src/consult.mjs:234-241`
 *   derives every consult document's H1 from the reviewed document's own subject, and every
 *   consult-*.mjs is a thin wrapper over it. New documents are born correctly named.
 *   What was NOT fixed is the HISTORICAL CORPUS and the absence of a REGRESSION GUARD.
 *   This script is that guard, and the tool that enumerates the backlog.
 *
 * THE BUG CLASS, named precisely: *self-identity written where subject-identity belongs*.
 * A generator stamps the name of the TOOL that wrote the document into the slot reserved
 * for the name of the WORK. The result passes every "does it have a title?" check while
 * telling the reader nothing. That is why a plain overlap test is not enough and this
 * script scores VENDOR_ONLY separately — see the positive control below, which exists
 * because the naive version of this check PASSED `# GLM Consult` on a file named
 * `GLM-RADAR-REVIEW-...` (they share the token "glm", which carries no subject meaning).
 *
 * USAGE
 *   node scripts/check-doc-identity.mjs [dir]           # summary + samples
 *   node scripts/check-doc-identity.mjs [dir] --list    # every offender, one per line
 *   node scripts/check-doc-identity.mjs [dir] --ci      # exit 1 if ANY offender (regression guard)
 *   node scripts/check-doc-identity.mjs [dir] --since <git-rev>   # only files added since rev
 *
 * EXIT: 0 clean (or report-only) · 1 offenders found under --ci · 2 bad usage
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 ? (argv[i + 1] ?? d) : d; };
const DIR = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--since')
  || 'docs/ai-workflow/AI-HANDOFF';

// Words that never carry identity: they describe the GENRE, not the SUBJECT.
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with',
  'review', 'handoff', 'report', 'plan', 'doc', 'notes', 'summary', 'final', 'new', 'update']);

// Words that name the WRITER, not the WORK. A title whose only overlap with its filename is
// a vendor token is branded, not identified — this is the exact historical failure class.
const VENDOR = new Set(['glm', 'kimi', 'codex', 'claude', 'opus', 'sonnet', 'gemini', 'fable',
  'grok', 'qwen', 'gpt', 'sol', 'ox', 'alpha', 'deepseek', 'hy3', 'tencent', 'terra', 'consult',
  'ai', 'llm', 'k3', 'village', 'moonshot', 'openrouter']);

const tokens = (s) => s.toLowerCase()
  .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
  .split(/[^a-z0-9]+/)
  .filter((t) => t.length > 2 && !STOP.has(t));

/** H1 must be a real heading — a `# comment` inside a fenced block is not a title. */
function firstH1(text) {
  const unfenced = text.replace(/^```[\s\S]*?^```/gm, '');
  for (const line of unfenced.split('\n').slice(0, 40)) {
    const m = line.match(/^#\s+(.*\S)/);
    if (m) return m[1].trim();
  }
  return null;
}

function classify(file, text) {
  const h1 = firstH1(text);
  if (!h1) return { code: 'NO_H1', h1: '(none)' };
  const fn = new Set(tokens(file.replace(/\.md$/, '')));
  const ht = tokens(h1);
  if (ht.length === 0) return { code: 'EMPTY_H1', h1 };
  const shared = ht.filter((t) => fn.has(t));
  if (shared.length === 0) return { code: 'NO_OVERLAP', h1 };
  if (shared.every((t) => VENDOR.has(t))) return { code: 'VENDOR_ONLY', h1 };
  return { code: 'OK', h1 };
}

// ---- positive control: the instrument is validated before its numbers are believed -------
// Rule: never trust an absence-or-cleanliness claim from an unvalidated probe. Case 1 is the
// one that caught the naive implementation red-handed.
const CONTROL = [
  ['GLM-RADAR-REVIEW-2026-08-27.md', '# GLM Consult\n', 'VENDOR_ONLY'],
  ['SWANGUARD-KIMI-SLICE4-TOKENS-2026-07-22.md', '# Kimi K3 - Front-End / Design Review\n', 'VENDOR_ONLY'],
  ['USER-DASHBOARD-V3-OBSERVATORY-RECEIPT-2026-04-28.md', '# User Dashboard V3 Observatory Receipt\n', 'OK'],
  ['TASTE-BRAIN-MASTER-HANDOFF-2026-08-26.md', 'no heading at all\n', 'NO_H1'],
  ['FENCED-ONLY-2026-01-01.md', '```\n# GLM Consult\n```\nbody\n', 'NO_H1'],
];
for (const [f, body, want] of CONTROL) {
  const got = classify(f, body).code;
  if (got !== want) { console.error(`CONTROL FAILED: ${f} -> ${got}, expected ${want}`); process.exit(2); }
}

// ---- scope -------------------------------------------------------------------------------
if (!existsSync(DIR)) { console.error(`[doc-identity] no such directory: ${DIR}`); process.exit(2); }
let files = readdirSync(DIR).filter((f) => f.endsWith('.md'));

const since = arg('--since');
if (since) {
  try {
    const changed = new Set(execFileSync('git', ['diff', '--name-only', `${since}...HEAD`, '--', DIR],
      { encoding: 'utf8' }).split('\n').map((p) => p.split('/').pop()).filter(Boolean));
    files = files.filter((f) => changed.has(f));
  } catch { console.error(`[doc-identity] --since ${since} failed; scanning all files instead`); }
}

// ---- run ---------------------------------------------------------------------------------
const buckets = { OK: [], NO_H1: [], NO_OVERLAP: [], VENDOR_ONLY: [], EMPTY_H1: [] };
const titleCount = new Map();
for (const f of files) {
  let text; try { text = readFileSync(join(DIR, f), 'utf8'); } catch { continue; }
  const { code, h1 } = classify(f, text);
  buckets[code].push([f, h1]);
  if (code !== 'NO_H1') titleCount.set(h1, (titleCount.get(h1) || 0) + 1);
}
const offenders = [...buckets.NO_H1, ...buckets.NO_OVERLAP, ...buckets.VENDOR_ONLY, ...buckets.EMPTY_H1];

if (flag('--list')) {
  for (const [f, h1] of offenders) console.log(`${join(DIR, f)}\t${h1}`);
  process.exit(flag('--ci') && offenders.length ? 1 : 0);
}

console.log(`[doc-identity] control PASS (${CONTROL.length}/${CONTROL.length}) — instrument validated\n`);
console.log(`scanned ${files.length} docs in ${DIR}`);
console.log(`  OK          title names the work            : ${buckets.OK.length}`);
console.log(`  VENDOR_ONLY title names the tool, not work  : ${buckets.VENDOR_ONLY.length}`);
console.log(`  NO_OVERLAP  title disagrees with filename   : ${buckets.NO_OVERLAP.length}`);
console.log(`  NO_H1       no title at all                 : ${buckets.NO_H1.length}`);
console.log(`  EMPTY_H1                                    : ${buckets.EMPTY_H1.length}`);
const pct = files.length ? ((offenders.length / files.length) * 100).toFixed(0) : '0';
console.log(`  => ${offenders.length}/${files.length} (${pct}%) cannot be identified by name\n`);

const dupes = [...titleCount.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
if (dupes.length) {
  console.log('COLLIDING TITLES — different documents wearing the same name:');
  for (const [h1, n] of dupes.slice(0, 10)) console.log(`  ${String(n).padStart(4)}x  ${h1}`);
  console.log(`  ${dupes.reduce((a, [, n]) => a + n, 0)} docs share only ${dupes.length} distinct titles\n`);
}
if (offenders.length) console.log(`run with --list for the full backlog · --ci to fail a build on regressions`);

process.exit(flag('--ci') && offenders.length ? 1 : 0);
