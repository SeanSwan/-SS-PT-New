#!/usr/bin/env node
/**
 * push-blast-radius.mjs — PreToolUse advisory on `git push` (Rule 67 v2.1)
 * ========================================================================
 * THE GAP: on this repo a push is not a publish, it is a DEPLOY AND A MIGRATION
 * RUN — `render.yaml` builds with `cd backend && npm install && npm run
 * migrate:production`. On 2026-08-11 an agent came within one command of executing
 * an unreviewed production schema change as a side effect of publishing a document.
 * The existing db-blast-radius gate matches migration RUNNER commands; it has never
 * seen a push.
 *
 * ADVISORY, NEVER BLOCKING — both design reviewers, independently: "migration+main
 * => block" is too broad (migrations are the normal deploy path, so it trains
 * rubber-stamping or blocks deploys until someone routes around via `gh`) and too
 * narrow (`gh pr merge`, the API, force-push and tag releases do the same
 * irreversible thing without matching `git push`). So this is early-warning UX.
 * Real enforcement is server-side branch protection on `main`.
 *
 * Because its whole value is being rare enough to still be read, every false
 * positive is a real cost. v2.1 fixed four of them found in review.
 *
 * Contract: stdin = { tool_name, tool_input }. ALWAYS exit 0. Fail-open on throw.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { FRESH_MIN, sh, ledgerDir, identity, safeRef, parseLane, lockMatches } from '../lib/lane-core.mjs';

/** Paths automation EXECUTES on deploy — enumerated from render.yaml and CI reality,
 *  not just `backend/migrations/**`, which was the narrow predicate reviewers rejected. */
const EXECUTES_ON_PUSH = [
  { re: /^backend\/migrations\//i, what: 'DB migration — runs against PRODUCTION on deploy' },
  { re: /^(backend\/)?seeders\//i, what: 'seeder — may mutate production rows' },
  { re: /\.sql$/i, what: 'raw SQL' },
  { re: /^render\.yaml$/i, what: 'deploy manifest — changes the build/migrate command itself' },
  { re: /(^|\/)package\.json$/i, what: 'package.json — postinstall/engines run at build' },
  { re: /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i, what: 'lockfile — repoints what npm install executes at build' },
  { re: /(^|\/)\.npmrc$/i, what: '.npmrc — controls the registry npm install pulls from' },
  { re: /^\.github\/workflows\//i, what: 'CI workflow — executes on push' },
  { re: /(^|\/)Dockerfile$/i, what: 'container build' },
];

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  if ((payload?.tool_name || '') !== 'Bash') return;
  const cmd = String(payload.tool_input?.command || '');

  /* Strip quoted strings BEFORE any matching. `git commit -m "fix: push handling"`
   * fired this advisory — verified false positive. Handles escaped quotes, which the
   * first version did not. ALL later regexes run on `bare`, not `cmd`: the force-push
   * test used to run on the raw string and flagged `git commit -m "try -f first"`. */
  const bare = cmd
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

  /* `push` must be the git SUBCOMMAND, not merely a later word: `git config
   * push.default simple` and `git log --grep=push` both fired the old pattern.
   * Case-insensitive because cmd.exe happily runs `GIT PUSH`. */
  if (!/\bgit\b(?:\s+(?:-[A-Za-z-]+|--[a-z-]+=\S+|-C\s+\S+|-c\s+\S+))*\s+push\b/i.test(bare)) return;

  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const ref = safeRef(branch || '');
  /* `-f` combined into a cluster (`-uf`, `-fv`) was undetected. */
  const forced = /--force(?!-with-lease)\b|(?:^|\s)-[A-Za-z]*f[A-Za-z]*(?:\s|$)/i.test(bare);
  const leased = /--force-with-lease/i.test(bare);
  /* Token-exact: `\b(main)\b` flagged `feature/main-fix` and `production-notes`,
   * because `-` and `/` are non-word chars. Match whole ref tokens only. */
  const targetsDeployRef = /(?:^|[\s:])(?:origin\/)?(main|master|production)(?:\s|$)/i.test(bare)
    || ['main', 'master', 'production'].includes(branch || '');

  /* An explicit refspec, --all, or a tag push means the range below (which is
   * HEAD-based) is NOT what is being pushed. Disclose rather than mislead. */
  /* PreToolUse fires BEFORE the command runs, so every fact below describes the
   * CURRENT branch. `git checkout main && git push` — a routine compound command —
   * would be analysed against the feature branch: not deploy-linked, wrong diff,
   * reassuring silence on a push to main. Detect the switch and say the analysis
   * cannot be trusted. */
  const switchesBranch = /\b(checkout|switch|merge|reset|rebase)\b[\s\S]*\bpush\b/i.test(bare);
  const explicitRefspec = /\s\S+:\S+/.test(bare) || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);

  let changed = null;
  let rangeNote = '';
  if (ref) {
    const remoteRef = sh(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
    /* sh() returns NULL on failure and '' on empty. Conflating them made this
     * fail-open: a failed `git diff` looked like "nothing to push" and the hook
     * returned silently on a migration push. */
    const raw = sh(`git diff --name-only ${remoteRef}...HEAD`);
    if (raw === null) rangeNote = `⚠ could not compute the diff against ${remoteRef} — this check did NOT run.`;
    else changed = raw.split('\n').filter(Boolean);
  } else {
    rangeNote = '⚠ could not resolve a safe branch name — file-level checks did NOT run.';
  }

  const hits = [];
  for (const f of changed ?? []) for (const p of EXECUTES_ON_PUSH) if (p.re.test(f)) hits.push({ f, what: p.what });

  /* Files another LIVE session has locked (advisory, Rule 67 R6). */
  const lockClash = [];
  try {
    const ledger = ledgerDir();
    const mine = identity().laneName; // exact session lane — NOT the agent-name prefix
    if (ledger && existsSync(ledger) && changed?.length) {
      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
        if (file === mine) continue;
        const p = resolve(ledger, file);
        if ((Date.now() - statSync(p).mtimeMs) / 60000 > FRESH_MIN) continue;
        for (const lock of parseLane(readFileSync(p, 'utf8'), resolve(ledger, '..', '..')).locks) {
          if (changed.some((c) => lockMatches(c, lock))) {
            lockClash.push(`${file.replace('.lane.md', '')} :: ${lock}`);
          }
        }
      }
    }
  } catch { /* advisory only */ }

  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec && !switchesBranch) return;

  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
  out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
  if (rangeNote) out.push(`🟠 ${rangeNote}  Treat the file list below as INCOMPLETE.`);
  if (switchesBranch) {
    out.push('🟠 this command changes branch before pushing. Everything below describes the');
    out.push('   CURRENT branch, not the one that will be pushed. Treat it as UNVERIFIED.');
  }
  if (explicitRefspec) {
    out.push('🟠 this push names an explicit refspec / --all / --tags. The file list below is');
    out.push('   computed from HEAD and may describe DIFFERENT commits than the ones pushed.');
  }
  if (forced) out.push("🔴 FORCE PUSH without --force-with-lease — can destroy another agent's pushed commits.");
  else if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
  if (hits.length) {
    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
    for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
    if (hits.length > 12) out.push(`   … +${hits.length - 12} more`);
    if (targetsDeployRef && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
      out.push('', '   render.yaml runs `npm run migrate:production` in the build.');
      out.push('   Pushing this to a deploy-linked branch RUNS THESE AGAINST PRODUCTION.');
      out.push('   Split the batch by blast radius: push the reversible commits now, hold the');
      out.push("   schema commits for review and Sean's approval.");
    }
  }
  if (lockClash.length) {
    out.push('', '🟠 this push carries file(s) another LIVE session has locked (R6):');
    for (const c of lockClash.slice(0, 8)) out.push(`   ${c}`);
  }
  out.push('', 'Advisory only — nothing is blocked. Real enforcement is branch protection on main.');
  console.error(out.join('\n'));
}

try {
  main();
} catch (err) {
  /* Fail-OPEN so this hook can never break a push — but not fail-SILENT. A thrown
   * bug used to exit 0 with no output, indistinguishable from "nothing to warn
   * about", which is the reports-success-while-doing-nothing class this whole
   * system exists to kill. */
  console.error(`⚠ push blast-radius check FAILED to run (${err?.code || err?.message}) — this push is UNCHECKED.`);
}
process.exit(0);