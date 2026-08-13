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
import { FRESH_MIN, sh, ledgerDir, identity, safeRef, parseLane, activeLocks, lockMatches } from '../lib/lane-core.mjs';

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
  /* Long options with a SEPARATE argument (`--git-dir <path>`, `--work-tree <path>`,
   * `--namespace <n>`) matched none of the branches. Detection then depended on an
   * accident of backtracking rather than on the pattern being right. */
  if (!/\bgit\b(?:\s+(?:--(?:git-dir|work-tree|namespace|exec-path)[= ]\S+|-[Cc]\s+\S+|--?[A-Za-z][A-Za-z-]*(?:=\S+)?))*\s+push\b/i.test(bare)) return;

  /* `git -C <dir> push` operates on ANOTHER repository. Analysing the current
   * directory instead reported the wrong branch, the wrong diff and the wrong
   * deploy-linked verdict, with no hint that it had done so — verified:
   * `git -C C:/tmp/ss-apex push` printed this repo's branch. Honour -C. */
  /* Quoted paths are the norm on Windows and the old pattern could not span one, so
   * `git -C "C:/My Repo" push` fell through to cwd and reported THIS repo as fact.
   * Silent fallback is the failure this fix exists to kill, so an unresolvable -C now
   * fails CLOSED: the analysis is skipped and the skip is stated. Also accepts the
   * `=` form and --git-dir/--work-tree, which the detection regex already admitted. */
  /* Match on the RAW command, not the quote-stripped copy:  blanks quoted
   * runs, so a quoted -C path was gone before this ever looked for it. */
  const dashC = cmd.match(/\s-C(?:\s+|=)(?:"([^"]+)"|'([^']+)'|(\S+))/)
    || bare.match(/\s--(?:git-dir|work-tree)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|(\S+))/);
  const dashCRaw = dashC ? (dashC[1] ?? dashC[2] ?? dashC[3]) : null;
  const dashCPath = dashCRaw ? dashCRaw.replace(/[/\\]\.git$/, '') : null;
  const dashCBroken = Boolean(dashCPath) && !existsSync(dashCPath);
  const REPO = dashCPath && !dashCBroken ? dashCPath : process.cwd();
  const shx = (cmd) => sh(cmd, REPO);

  const branch = shx('git rev-parse --abbrev-ref HEAD');
  const ref = safeRef(branch || '');
  /* `-f` combined into a cluster (`-uf`, `-fv`) was undetected. */
  const forced = /--force(?!-with-lease)\b|(?:^|\s)-[A-Za-z]*f[A-Za-z]*(?:\s|$)/i.test(bare);
  const leased = /--force-with-lease/i.test(bare);
  /* Token-exact: `\b(main)\b` flagged `feature/main-fix` and `production-notes`,
   * because `-` and `/` are non-word chars. Match whole ref tokens only. */
  /* Strip ref namespaces first: `HEAD:refs/heads/main` has `main` preceded by `/`,
   * so the token test missed it and a push straight at production carried no
   * DEPLOY-LINKED flag. And do NOT infer deploy-linked from the CURRENT branch
   * when the command names an explicit target — sitting on `main` while pushing a
   * feature branch produced the production lecture for no reason. */
  /* Only the text AFTER `push` describes the target. Scanning the whole command
   * meant `git pull origin main && git push origin feature-x` — the single most
   * common flow here — raised DEPLOY-LINKED on a feature push, training readers to
   * ignore the highest-severity flag this hook has. */
  const afterPush = bare.slice(bare.search(/\bpush\b/i) + 4);
  const deRef = afterPush.replace(/refs\/(heads|remotes|tags)\//gi, '').replace(/origin\//gi, ' ');
  const deployRefNamed = /(?:^|[\s:\/])(main|master|production)(?:\s|$)/i.test(deRef);
  const pushIdx = bare.split(/\s+/).findIndex((t) => /^push$/i.test(t));
  const pushArgs = pushIdx === -1 ? [] : bare.split(/\s+/).slice(pushIdx + 1).filter((t) => !t.startsWith("-"));
  const namesAnyRef = pushArgs.length > 1;
  const targetsDeployRef = deployRefNamed
    || (!namesAnyRef && ['main', 'master', 'production'].includes(branch || ''));

  /* An explicit refspec, --all, or a tag push means the range below (which is
   * HEAD-based) is NOT what is being pushed. Disclose rather than mislead. */
  /* PreToolUse fires BEFORE the command runs, so every fact below describes the
   * CURRENT branch. `git checkout main && git push` — a routine compound command —
   * would be analysed against the feature branch: not deploy-linked, wrong diff,
   * reassuring silence on a push to main. Detect the switch and say the analysis
   * cannot be trusted. */
  const switchesBranch = /\b(checkout|switch|merge|reset|rebase)\b[\s\S]*\bpush\b/i.test(bare);
  /* A refspec is `src:dst`. `C:/tmp/x` is a Windows path, and matching it as a
   * refspec fired the warning on any git command carrying an absolute path —
   * a false positive on one of the most common shapes in this repo. Exclude
   * single-letter drive prefixes. */
  /* `git@github.com:org/repo.git` is an scp-style remote, not a refspec, and it fired
   * this warning on every SSH push with a perfectly trustworthy range below it. */
  const refspecToken = bare.split(/\s+/).some((t) => /^[^:]+:[^:]+$/.test(t)
    && !/^[A-Za-z]:[\\/]/.test(t)
    && !/@/.test(t.split(':')[0]));
  const explicitRefspec = refspecToken || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);

  let changed = null;
  let rangeNote = '';
  if (ref) {
    const remoteRef = shx(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
    /* sh() returns NULL on failure and '' on empty. Conflating them made this
     * fail-open: a failed `git diff` looked like "nothing to push" and the hook
     * returned silently on a migration push. */
    /* `-c core.quotePath=false`: git C-quotes paths with spaces or non-ASCII by
     * default, so `"backend/migrations/014 add col.sql"` matched no anchored
     * pattern — the hook's own worst case, a migration push, produced nothing. */
    const raw = shx(`git -c core.quotePath=false diff --name-only ${remoteRef}...HEAD`);
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
    const ledger = ledgerDir(REPO);   // the repo being pushed, not necessarily the cwd
    const mine = identity().laneName; // exact session lane — NOT the agent-name prefix
    if (ledger && existsSync(ledger) && changed?.length) {
      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
        if (file === mine) continue;
        const p = resolve(ledger, file);
        if ((Date.now() - statSync(p).mtimeMs) / 60000 > FRESH_MIN) continue;
        for (const lock of activeLocks(readFileSync(p, 'utf8'), resolve(ledger, '..', '..'))) {
          if (changed.some((c) => lockMatches(c, lock))) {
            lockClash.push(`${file.replace('.lane.md', '')} :: ${lock}`);
          }
        }
      }
    }
  } catch { /* advisory only */ }

  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec && !switchesBranch && !dashCBroken) return;

  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
  out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
  if (REPO !== process.cwd()) out.push(`repo:   ${REPO}  (via -C — analysed there, not here)`);
  if (dashCBroken) {
    out.push(`🔴 -C target ${dashCPath} does not exist — NOTHING below was analysed for it.`);
    out.push('   The figures shown describe the current directory instead. Treat as UNCHECKED.');
  }
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
    out.push('', targetsDeployRef
      ? `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`
      : `🟠 ${hits.length} file(s) in this range WOULD be executed by automation once this reaches a deploy-linked branch:`);
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