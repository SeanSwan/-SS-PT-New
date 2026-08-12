#!/usr/bin/env node
/**
 * push-blast-radius.mjs — PreToolUse advisory on `git push` (Rule 67 v2)
 * ======================================================================
 * THE GAP THIS CLOSES: on this repo a push is not a publish, it is a DEPLOY AND A
 * MIGRATION RUN — `render.yaml` builds with `cd backend && npm install && npm run
 * migrate:production`. On 2026-08-11 an agent came within one command of executing
 * an unreviewed production schema change as a side effect of publishing a document.
 * `db-blast-radius-gate.mjs` matches migration RUNNER commands; it has never seen a push.
 *
 * WHY ADVISORY, NOT BLOCKING (hostile review, Kimi K3 + Tencent HY3, 2026-08-11 —
 * both reviewers, independently):
 *  - "migration + main => block" is too BROAD: migrations are the normal deploy
 *    path, so blocking them trains rubber-stamping, or blocks deploys while Sean
 *    sleeps until an agent helpfully routes around via `gh`. A gate that annoys is
 *    a gate that gets removed.
 *  - It is also too NARROW: `gh pr merge`, the GitHub API, a cloud agent's own git
 *    client, force-push, and tag-triggered releases all perform the same
 *    irreversible act with zero characters matching `git push`.
 *  - Therefore: this hook is EARLY-WARNING UX — it makes the agent find out before
 *    the push, not after the deploy. The real enforcement is server-side branch
 *    protection on `main` (a Sean action; see the skill). This hook never blocks,
 *    so it cannot produce the false-positive fatigue that gets hooks disabled.
 *
 * Contract: stdin = { tool_name, tool_input }. Always exit 0. Fail-open on any throw.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const sh = (cmd) => {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};

/** Paths automation EXECUTES on deploy. Enumerated from render.yaml + CI reality,
 *  not just `backend/migrations/**` — the narrow predicate both reviewers rejected. */
const EXECUTES_ON_PUSH = [
  { re: /^backend\/migrations\//i, what: 'DB migration — runs against PRODUCTION on deploy' },
  { re: /^backend\/seeders\//i, what: 'seeder — may mutate production rows' },
  { re: /\.sql$/i, what: 'raw SQL' },
  { re: /^render\.yaml$/i, what: 'deploy manifest — changes the build/migrate command itself' },
  { re: /(^|\/)package\.json$/i, what: 'package.json — postinstall/engines run at build' },
  { re: /^\.github\/workflows\//i, what: 'CI workflow — executes on push' },
  { re: /(^|\/)Dockerfile$/i, what: 'container build' },
];

function main() {
  let payload = {};
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  if ((payload.tool_name || '') !== 'Bash') return;
  const cmd = String(payload.tool_input?.command || '');
  /* Strip quoted strings BEFORE matching. Without this, `git commit -m "fix: push
   * handling"` fires the advisory — verified false positive, hostile round 1. That
   * is the exact false-positive-fatigue class that gets a hook disabled, and this
   * hook's whole value is that it is rare enough to still be read. */
  const bare = cmd.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
  if (!/\bgit\b[^|;&]*\bpush\b/.test(bare)) return;

  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const forced = /--force(?!-with-lease)|(?:^|\s)-f(?:\s|$)/.test(cmd);
  const leased = /--force-with-lease/.test(cmd);
  const deployLinked = /\b(main|master|production)\b/.test(cmd) || ['main', 'master', 'production'].includes(branch);

  // Range vs the remote's ACTUAL state — not path patterns over the whole local
  // branch. A branch merely CONTAINING an already-shipped migration must not warn.
  const remoteRef = sh(`git rev-parse --verify --quiet origin/${branch}`) ? `origin/${branch}` : 'origin/main';
  const changed = sh(`git diff --name-only ${remoteRef}...HEAD`).split('\n').filter(Boolean);
  if (!changed.length && !forced && !leased) return;

  const hits = [];
  for (const f of changed) for (const p of EXECUTES_ON_PUSH) if (p.re.test(f)) hits.push({ f, what: p.what });

  // Does this push carry a file another LIVE session has locked? (advisory)
  let lockClash = [];
  try {
    let common = sh('git rev-parse --path-format=absolute --git-common-dir') || sh('git rev-parse --git-common-dir');
    const ledger = resolve(common, '..', '.ai-workflow', 'coordination');
    /* Skip only MY OWN session's lane — not every lane sharing my agent name.
     * Matching on the `vs-claude--` prefix made a SECOND vs-claude session's locks
     * invisible here, which is the same same-agent-collision class this rebuild
     * exists to kill (found in hostile round 4). Identity is agent + worktree. */
    const top = sh('git rev-parse --show-toplevel');
    const isMain = resolve(top || '.') === resolve(ledger, '..', '..');
    const mine = `${process.env.SWAN_AGENT_SURFACE || 'vs-claude'}--${isMain ? 'main' : basename(top || '')}.lane.md`;
    if (existsSync(ledger)) {
      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
        if (file === mine) continue;
        if ((Date.now() - statSync(resolve(ledger, file)).mtimeMs) / 60000 > 120) continue;
        const sec = readFileSync(resolve(ledger, file), 'utf8').split(/EDITING NOW/i)[1]?.split(/\n#{1,3}\s/)[0] ?? '';
        for (const l of sec.split('\n').map((s) => s.trim()).filter((s) => s.startsWith('- '))) {
          const lock = l.replace(/^-\s*/, '').replace(/`/g, '').replace(/\*+$/, '');
          if (!lock || /^\(/.test(lock)) continue;
          const stem = lock.replace(/\/\*\*.*$/, '');
          if (changed.some((c) => c === lock || c.startsWith(stem))) lockClash.push(`${basename(file, '.lane.md')} :: ${lock}`);
        }
      }
    }
  } catch { /* advisory only */ }

  if (!hits.length && !forced && !leased && !lockClash.length) return;

  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
  out.push(`branch: ${branch} → ${remoteRef}${deployLinked ? '   ⚠ DEPLOY-LINKED' : ''}`);
  if (forced) out.push('🔴 FORCE PUSH without --force-with-lease — this can destroy another agent\'s pushed commits.');
  if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
  if (hits.length) {
    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
    for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
    if (deployLinked && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
      out.push('', '   render.yaml runs `npm run migrate:production` in the build.');
      out.push('   Pushing this to a deploy-linked branch RUNS THESE AGAINST PRODUCTION.');
      out.push('   Rule 70 / 2026-08-11 incident: split the batch by blast radius — push the');
      out.push('   reversible commits now, hold the schema commits for review + Sean\'s approval.');
    }
  }
  if (lockClash.length) {
    out.push('', `🟠 this push carries file(s) another LIVE session has locked (Rule 67 R6):`);
    for (const c of lockClash.slice(0, 8)) out.push(`   ${c}`);
  }
  out.push('', 'Advisory only — nothing is blocked. Real enforcement is branch protection on main.');
  console.error(out.join('\n'));
}

try { main(); } catch { /* fail-open */ }
process.exit(0);
