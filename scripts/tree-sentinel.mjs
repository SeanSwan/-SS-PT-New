#!/usr/bin/env node
/**
 * tree-sentinel.mjs — read-only working-tree + worktree health digest
 * ===================================================================
 * The "don't step on each other's toes" sentinel (Linear-todo workflow, 2026-07-21).
 * Prints a deterministic digest an agent (or Hermes) can read, diff, or post to a
 * Linear issue comment. NEVER writes, deletes, prunes, or touches git state
 * (Rule 34 / Rule 47 read-only doctrine — cleanup is a separate Sean-gated pass).
 *
 * Reports:
 *  1. Main-tree dirty files, grouped by top-level dir (the "dirty files sitting
 *     around" risk before any push).
 *  2. Worktree inventory: branch, ahead/behind origin/main, dirty count, and a
 *     MERGED/UNMERGED/STALE classification.
 *  3. Rule-67 lane locks (who has files claimed right now).
 *
 * Usage:  node scripts/tree-sentinel.mjs [--json] [--fast] [--no-fetch]
 *   --fast      skip per-worktree dirty checks (1 git call per worktree instead of 2) —
 *               use for session-start orientation; full mode before pushes/cleanup decisions.
 *   --no-fetch  skip the freshness fetch of origin/main (offline / speed). Without a fresh
 *               origin/main the MERGED/UNMERGED classification can be WRONG — a merged
 *               branch reads UNMERGED against a stale ref. The digest reports which mode ran.
 * Exit codes: 0 = ran (digest printed). 2 = git unavailable. Never fails on findings.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { ledgerDir, parseLane, FRESH_MIN } from './lib/lane-core.mjs';

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes('--json');
const FAST = process.argv.includes('--fast');
/** Windows-safe path identity: forward slashes + lowercase drive/case-insensitive FS. */
const norm = (p) => p.replace(/\\/g, '/').toLowerCase();

const sh = (cmd, cwd = ROOT) => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
};

if (sh('git rev-parse --git-dir') === null) {
  console.error('tree-sentinel: not a git repository (or git unavailable)');
  process.exit(2);
}

/* Freshness: classification diffs against origin/main — refresh the ref unless opted out.
   `git fetch` updates remote-tracking refs only (no worktree/index writes) → still read-only
   in the Rule-34 sense. Failure (offline) degrades gracefully and is disclosed. */
const NO_FETCH = process.argv.includes('--no-fetch');
const fetched = NO_FETCH ? 'skipped (--no-fetch)' : sh('git fetch origin main --quiet') !== null ? 'fresh' : 'FAILED (offline?) — counts may be stale';

/* ---------- 1. main-tree dirty files, grouped ---------- */
const porcelain = sh('git status --porcelain') ?? '';
const dirty = porcelain ? porcelain.split('\n') : [];
const byDir = {};
for (const line of dirty) {
  const p = line.slice(3).replace(/^"|"$/g, '');
  const top = p.includes('/') ? p.split('/')[0] : '(root)';
  byDir[top] = (byDir[top] ?? 0) + 1;
}

/* ---------- 2. worktree inventory ---------- */
const wtRaw = sh('git worktree list --porcelain') ?? '';
const worktrees = [];
let cur = null;
for (const line of wtRaw.split('\n')) {
  if (line.startsWith('worktree ')) {
    if (cur) worktrees.push(cur);
    cur = { path: line.slice(9), branch: null, detached: false };
  } else if (line.startsWith('branch ')) {
    if (cur) cur.branch = line.slice(7).replace('refs/heads/', '');
  } else if (line === 'detached') {
    if (cur) cur.detached = true;
  }
}
if (cur) worktrees.push(cur);

for (const [idx, wt] of worktrees.entries()) {
  // git worktree list always emits the primary tree first — positional, not cwd-dependent,
  // so the label is correct even when the sentinel runs from inside a linked worktree.
  wt.isPrimary = idx === 0;
  wt.exists = existsSync(wt.path);
  if (!wt.exists) {
    wt.klass = 'MISSING-DIR';
    continue;
  }
  const counts = wt.branch
    ? sh(`git rev-list --left-right --count origin/main...${JSON.stringify(wt.branch)}`)
    : null;
  if (counts) {
    const [behind, ahead] = counts.split(/\s+/).map(Number);
    wt.behind = behind;
    wt.ahead = ahead;
  }
  if (FAST) {
    wt.dirty = -1; // not checked in fast mode
  } else {
    const wtDirty = sh('git status --porcelain', wt.path);
    wt.dirty = wtDirty === null ? -1 : wtDirty ? wtDirty.split('\n').length : 0;
  }
  // Positional ONLY: the primary tree is always listed first by git. Do NOT also match
  // cwd — running from a linked worktree would mislabel that worktree MAIN-TREE and
  // hide its branch from the UNMERGED list (bug caught 2026-07-21 final audit).
  if (wt.isPrimary) wt.klass = 'MAIN-TREE';
  else if (wt.detached) wt.klass = wt.dirty > 0 ? 'DETACHED-DIRTY' : 'DETACHED';
  else if (wt.ahead === 0)
    // dirty unknown (--fast) → plain MERGED, never claim CLEAN without checking (Rule 19)
    wt.klass = wt.dirty === 0 ? 'MERGED-CLEAN' : wt.dirty > 0 ? 'MERGED-DIRTY' : 'MERGED';
  else wt.klass = wt.dirty > 0 ? 'UNMERGED-DIRTY' : 'UNMERGED';
}

/* ---------- 3. Rule-67 lane locks ---------- */
/* Was a hardcoded ['claude','codex'] resolved against process.cwd(). Two bugs:
 * (a) ten lane files exist, so six agents' locks were invisible to the tool whose
 * job is reporting locks; (b) cwd resolution reads a WORKTREE-LOCAL ledger, which
 * is how nine published claims ended up unreadable. Glob the canonical ledger. */
const LEDGER_DIR = ledgerDir(ROOT);
const lanes = {};
const laneAges = {};
const laneFiles = LEDGER_DIR && existsSync(LEDGER_DIR)
  ? readdirSync(LEDGER_DIR).filter((f) => f.endsWith('.lane.md'))
  : [];
for (const file of laneFiles) {
  const agent = file.replace(/\.lane\.md$/, '');
  const lanePath = `${LEDGER_DIR}/${file}`;
  /* Freshness from mtime, not the agent-authored `Updated:` prose — a model can
   * hallucinate a timestamp. mtime is not unforgeable (`touch` exists, and a
   * release() rewrite bumps it) — it is simply harder to get wrong by accident,
   * which is the actual failure mode here. Advisory either way. */
  const ageMin = Math.round((Date.now() - statSync(lanePath).mtimeMs) / 60000);
  const { locks } = parseLane(readFileSync(lanePath, 'utf8'), `${LEDGER_DIR}/../..`);
  // Back-compat: `laneLocks[agent]` keeps its original string | string[] shape for
  // any existing --json consumer; freshness rides alongside in `laneAges`.
  lanes[agent] = locks.length ? locks : 'released';
  laneAges[agent] = ageMin;
}

/* ---------- output ---------- */
const summary = {
  generatedAt: new Date().toISOString(),
  originMainRef: fetched,
  currentTreePath: ROOT,
  currentTreeDirty: dirty.length,
  currentTreeDirtyByDir: byDir,
  worktreeCount: worktrees.length,
  worktreesByClass: worktrees.reduce((acc, w) => {
    acc[w.klass] = (acc[w.klass] ?? 0) + 1;
    return acc;
  }, {}),
  unmergedWorktrees: worktrees
    .filter((w) => w.klass?.startsWith('UNMERGED'))
    .map((w) => ({ path: w.path, branch: w.branch, ahead: w.ahead, dirty: w.dirty })),
  laneLocks: lanes,
  laneAgesMin: laneAges,
  ledgerDir: LEDGER_DIR,
};

if (JSON_MODE) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`# tree-sentinel digest — ${summary.generatedAt}`);
  console.log(`origin/main ref: ${fetched}`);
  // Section 1 scans the CURRENT tree (cwd) — name it honestly; it is the main tree
  // only when the sentinel is run from the primary checkout.
  console.log(`\nCurrent tree (${ROOT}) dirty files: ${summary.currentTreeDirty}`);
  for (const [dir, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(5)}  ${dir}`);
  }
  console.log(`\nWorktrees: ${summary.worktreeCount}`);
  for (const [k, n] of Object.entries(summary.worktreesByClass).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
  if (summary.unmergedWorktrees.length) {
    console.log(`\nUNMERGED (real WIP — do not touch, coordinate via Linear/lanes):`);
    for (const w of summary.unmergedWorktrees) {
      const d = w.dirty < 0 ? 'dirty ?' : `${w.dirty} dirty`;
      console.log(`  +${w.ahead} ahead, ${d}  ${w.branch}  ${w.path}`);
    }
  }
  console.log(`\nLane locks (canonical ledger — all sessions):`);
  if (!Object.keys(lanes).length) console.log('  (no lane files)');
  for (const [agent, v] of Object.entries(lanes)) {
    const age = laneAges[agent];
    const fresh = age <= FRESH_MIN ? 'LIVE' : `stale ${age}m`;
    console.log(`  ${agent} [${fresh}]: ${Array.isArray(v) ? `\n    ${v.join('\n    ')}` : v}`);
  }
  console.log(
    `\n(read-only digest — cleanup of MERGED-CLEAN candidates stays Sean-gated per Rule 34; see Linear SWA-11)`,
  );
}
