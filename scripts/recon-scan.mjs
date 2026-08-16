#!/usr/bin/env node
/**
 * recon-scan.mjs -- pre-audit reconciliation engine (Phases 0-2).
 *
 * Answers: "what work exists that never reached origin/main, and is any of it real?"
 *
 * DETERMINISTIC AND READ-ONLY. Zero model calls. Never merges, pushes, rebases,
 * checks out, deletes, or stashes. The only object it writes is a dangling
 * `git stash create` snapshot commit, which leaves the tree and stash list alone.
 *
 * WHY THIS EXISTS: audits read origin/main; unshipped work is invisible to them.
 * And the obvious way to find that work -- "ahead N" -- lies in two ways:
 *   1. squash-merge inflates it (measured: ahead 68 -> 1 real)
 *   2. %(upstream:track) measures the branch's OWN remote, not main
 *      (measured: ahead 77 -> 0 real, branch fully merged)
 * Trap 2 is a category error, not an overcount. See scripts/recon/equivalence.mjs.
 *
 * USAGE
 *   node scripts/recon-scan.mjs                       # report to stdout
 *   node scripts/recon-scan.mjs --deep 15             # deep-confirm top N
 *   node scripts/recon-scan.mjs --json out.json       # machine-readable
 *   node scripts/recon-scan.mjs --base origin/main    # override base ref
 *   node scripts/recon-scan.mjs --stale-ok            # skip fetch-freshness gate
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { git, gitLine, mapLimit, revParse, commitTime, REPO_ROOT } from './recon/git.mjs';
import { census } from './recon/inventory.mjs';
import { classify, deepConfirm, EQUIV } from './recon/equivalence.mjs';
import { rankAll, assignVerdict, VERDICT } from './recon/rank.mjs';
import { renderReport, renderJson } from './recon/report.mjs';
import { commitSubjects } from './recon/git.mjs';

const argv = process.argv.slice(2);
const arg = (f, d = null) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);

const BASE = arg('--base', 'origin/main');
const DEEP_N = Number(arg('--deep', '15'));
const JSON_OUT = arg('--json', null);
const REPORT_OUT = arg('--out', null);
const STALE_OK = has('--stale-ok');
const CONCURRENCY = Number(arg('--concurrency', '12'));
const LANE_DIR = join(REPO_ROOT, '.ai-workflow', 'coordination');

const started = Date.now();
const notExamined = [];

// --- Freshness gate -----------------------------------------------------------
// A reconciliation tool describing last Tuesday's main is worse than no tool,
// because staleness is the very problem it exists to solve.
const baseSha = await revParse(BASE);
if (!baseSha) {
  console.error(`recon: base ref "${BASE}" not found. Fetch first, or pass --base.`);
  process.exit(1);
}
const baseTime = await commitTime(BASE);
const baseAgeH = baseTime ? (Date.now() / 1000 - baseTime) / 3600 : null;
// A freshness check that cannot read the base time must FAIL, not pass. The
// previous `baseAgeH != null &&` guard skipped the gate silently on failure --
// the exact inversion the gate exists to prevent.
if (!STALE_OK && baseAgeH == null) {
  console.error(`recon: could not determine age of ${BASE}.`);
  console.error('       Freshness is UNKNOWN. Pass --stale-ok to accept that risk.');
  process.exit(3);
}
if (!STALE_OK && baseAgeH != null && baseAgeH > 24) {
  console.error(`recon: ${BASE} tip is ${baseAgeH.toFixed(1)}h old.`);
  console.error('       Run `git fetch origin` first, or pass --stale-ok to accept.');
  console.error('       Verdicts computed against a stale base are not trustworthy.');
  process.exit(3);
}

// --- Phase 0: census ----------------------------------------------------------
const inv = await census({ laneDir: LANE_DIR });
notExamined.push('reflog orphans (git fsck) — weekly --deep-reflog only, not run');
if (inv.stashes.length) notExamined.push(`${inv.stashes.length} stash entries — contents not classified`);

// --- Phase 1: truth filter ----------------------------------------------------
const branches = inv.branches;
process.stderr.write(`recon: classifying ${branches.length} branches against ${BASE}…\n`);

const classified = await mapLimit(branches, CONCURRENCY, async (item) => {
  const rec = await classify(item.ref, BASE, { untrustedAhead: item.untrustedAhead });
  return { item, rec };
});

// --- Phase 2: rank, deep-confirm finalists, assign verdicts --------------------
const ranked = rankAll(classified);

// Deep pass runs ONLY on non-landed finalists: reverse-apply catches the
// squash-merge case that git cherry structurally cannot see.
const finalists = ranked
  .filter((x) => x.rec.equivalence === EQUIV.ABSENT || x.rec.equivalence === EQUIV.PARTIAL)
  .slice(0, DEEP_N);

process.stderr.write(`recon: deep-confirming ${finalists.length} finalists…\n`);
await mapLimit(finalists, Math.min(6, CONCURRENCY), async (x) => {
  await deepConfirm(x.rec);
  const subjects = x.rec.mergeBase
    ? await commitSubjects(x.rec.mergeBase, x.item.ref, 40)
    : [];
  x.subjects = subjects;
});

for (const x of ranked) {
  x.verdict = assignVerdict(x.rec, x.item, { subjects: x.subjects ?? [] });
}

const deferred = ranked.filter((x) => !finalists.includes(x)
  && (x.rec.equivalence === EQUIV.ABSENT || x.rec.equivalence === EQUIV.PARTIAL));
if (deferred.length) {
  notExamined.push(`${deferred.length} non-landed branches beyond rank ${DEEP_N} — ranked but not deep-confirmed`);
}

// --- Output -------------------------------------------------------------------
const state = {
  base: BASE,
  baseSha,
  items: ranked,
  notExamined,
  workingTree: inv.workingTree,
  startedAt: started,
  durationMs: Date.now() - started,
  deepCount: finalists.length,
};

const report = renderReport(state);
if (REPORT_OUT) {
  mkdirSync(dirname(REPORT_OUT), { recursive: true });
  writeFileSync(REPORT_OUT, report, 'utf8');
  process.stderr.write(`recon: report → ${REPORT_OUT}\n`);
} else {
  console.log(report);
}

if (JSON_OUT) {
  mkdirSync(dirname(JSON_OUT), { recursive: true });
  writeFileSync(JSON_OUT, renderJson(state), 'utf8');
  process.stderr.write(`recon: json → ${JSON_OUT}\n`);
}

// Exit 0 always: this is an informational tool, not a gate. A non-zero exit
// would make it a blocker, and a blocker gets disabled.
process.exit(0);
