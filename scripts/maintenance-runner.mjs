#!/usr/bin/env node
/**
 * maintenance-runner.mjs — run the deterministic maintenance jobs, but only where it is safe to.
 *
 * WHY THIS EXISTS
 * ---------------
 * The hook-coverage audit (2026-08-21) found the same shape twice: a checker that was
 * written, tested, and then wired to nothing. `token-registry-check` was reachable only
 * via `npm run tokens:check`; `catalog-regen --check` exits 2 today and nothing runs it.
 * The result is visible — main's CATALOG carries 791 rows of which 308 are stale or new,
 * while Rule 72 instructs every agent to grep that catalog FIRST. A recall layer that is
 * quietly a third out of date manufactures confident "we never decided that" answers.
 *
 * Writing more checkers does not fix this. Giving the existing ones a trigger does.
 *
 * WHY IT REFUSES TO RUN ALMOST EVERYWHERE
 * ---------------------------------------
 * The catalog is BRANCH-RELATIVE state: it describes the doc tree of whatever checkout
 * regenerates it. Measured 2026-08-23 across two real checkouts:
 *
 *     origin/main            791 AI-HANDOFF docs   560 catalog rows
 *     a stale wip branch     612 AI-HANDOFF docs   248 catalog rows
 *
 * Regenerating on that wip branch is not corrupt — it produces a catalog that is correct
 * FOR THAT BRANCH. The damage is deferred: merge it forward and main's catalog silently
 * loses coverage of ~179 documents, with no conflict and nothing to review, because a
 * generated file that shrank still looks like a generated file.
 *
 * (An earlier draft of this reasoning claimed regen from a stale branch "drops ~189 docs".
 * That was wrong — `--check` reports `dropped: 0` from both checkouts. The risk is real but
 * narrower than stated, and the guard is built on the measured version, not the alarming one.)
 *
 * So the runner is fail-closed on location: main, current, and clean, or it does nothing.
 * A maintenance job that runs in the wrong place is worse than one that does not run,
 * because its output looks authoritative.
 *
 * SCOPE — deliberately one job
 * ----------------------------
 * The allowlist has a single entry, because exactly one deterministic maintenance job has a
 * measured problem today. `drift-check` and `stale-check` are model-driven skills, not
 * deterministic scripts, and do not belong behind an unattended runner. Adding an entry is
 * a two-line change; adding one speculatively is how allowlists rot into "run everything".
 *
 * READ-ONLY BY DEFAULT. `--check` reports and writes nothing. `--apply` runs the jobs.
 * Exit 0 = nothing to do · 2 = work is pending (check mode) · 1 = a job failed or refused.
 *
 * Usage:
 *   node scripts/maintenance-runner.mjs --check     # what is pending? writes nothing
 *   node scripts/maintenance-runner.mjs --apply     # run the jobs (main + current + clean only)
 *   node scripts/maintenance-runner.mjs --apply --force-branch   # override the guard, announced
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const CHECK = args.includes('--check') || !args.includes('--apply');
const FORCE_BRANCH = args.includes('--force-branch');

/**
 * The allowlist. Each job must be a DETERMINISTIC script — no model calls, no network —
 * so an unattended run cannot spend money or invent content. `check` must write nothing.
 */
const JOBS = [
  {
    id: 'catalog-regen',
    what: 'Rule 72 recall catalog — rebuild rows whose source blob SHA moved',
    check: ['scripts/catalog-regen.mjs', '--check'],
    apply: ['scripts/catalog-regen.mjs'],
    // catalog-regen exits 2 when distillation is pending, which is "work to do", not failure.
    pendingExit: 2,
  },
];

const sh = (cmd, argv) => {
  try {
    return { ok: true, code: 0, out: execFileSync(cmd, argv, { encoding: 'utf8', maxBuffer: 32e6 }) };
  } catch (err) {
    return { ok: false, code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
};

/** @returns {string|null} reason to refuse, or null to proceed. */
export function locationRefusal({ branch, behind, dirty, ahead }) {
  if (branch !== 'main') {
    return `refusing: on "${branch}", not main. The catalog describes the tree that regenerates it, `
      + 'so a catalog built here would be correct for this branch and wrong for main — and merging '
      + 'it forward would shrink main\'s coverage with no conflict to review.';
  }
  if (behind > 0) {
    return `refusing: main is ${behind} commit(s) behind origin/main. Regenerating now would `
      + 'describe a tree nobody has, and would be stale the moment it lands.';
  }
  if (ahead > 0) {
    return `refusing: main is ${ahead} commit(s) ahead of origin/main. Push or reset first — a `
      + 'catalog built over unpushed local commits describes a tree no other agent can see.';
  }
  if (dirty) {
    return 'refusing: working tree is dirty. The catalog is generated from tracked file SHAs, so '
      + 'uncommitted edits produce rows that match nothing anyone else can fetch.';
  }
  return null;
}

function location() {
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out.trim();
  sh('git', ['fetch', 'origin', 'main', '--quiet']);
  const behind = Number(sh('git', ['rev-list', '--count', 'HEAD..origin/main']).out.trim() || 0);
  const ahead = Number(sh('git', ['rev-list', '--count', 'origin/main..HEAD']).out.trim() || 0);
  const dirty = sh('git', ['status', '--porcelain']).out.trim().length > 0;
  return { branch, behind, ahead, dirty };
}

function main() {
  const loc = location();
  console.log(`[maintenance] branch=${loc.branch} behind=${loc.behind} ahead=${loc.ahead} `
    + `dirty=${loc.dirty} mode=${CHECK ? 'check' : 'apply'}`);

  const refusal = locationRefusal(loc);
  // --check never writes, so it is safe anywhere and reports honestly about where it ran.
  if (refusal && !CHECK) {
    if (!FORCE_BRANCH) {
      console.error(`\n[maintenance] ${refusal}\n`);
      console.error('  If you genuinely mean to run here, pass --force-branch. It is announced,');
      console.error('  never silent, and the receipt records that the guard was overridden.\n');
      process.exit(1);
    }
    console.error(`\n[maintenance] GUARD OVERRIDDEN (--force-branch): ${refusal}\n`);
  }

  let pending = 0;
  let failed = 0;
  for (const job of JOBS) {
    const argv = CHECK ? job.check : job.apply;
    const r = sh('node', argv);
    const isPending = r.code === job.pendingExit;
    const status = r.ok ? 'clean' : isPending ? 'PENDING' : `FAILED (exit ${r.code})`;
    console.log(`\n[maintenance] ${job.id}: ${status}`);
    console.log(`              ${job.what}`);
    const tail = r.out.trim().split('\n').slice(-3).map((l) => `              ${l}`).join('\n');
    if (tail) console.log(tail);
    if (isPending) pending += 1;
    else if (!r.ok) failed += 1;
  }

  console.log('');
  if (failed) {
    console.error(`[maintenance] ${failed} job(s) FAILED.`);
    process.exit(1);
  }
  if (pending) {
    console.log(`[maintenance] ${pending} job(s) have work pending.`);
    if (CHECK) {
      console.log('              Re-run with --apply on a clean, current main to do it.');
      process.exit(2);
    }
  }
  console.log('[maintenance] done.');
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
