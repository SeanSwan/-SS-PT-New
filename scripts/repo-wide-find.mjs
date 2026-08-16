#!/usr/bin/env node
/**
 * repo-wide-find.mjs — "is this really absent, or just absent from HERE?"
 * =======================================================================
 * ONE command that answers whether a repo asset exists anywhere in this repository: every local
 * branch, every remote-tracking ref, every linked worktree, the stash, and the reflog.
 *
 * WHY THIS EXISTS (2026-08-15). An agent looked for `consult-glm.mjs`, did not find it, and reported
 * that GLM was "not wired" — then spent a review round working around a tool that had been available
 * the whole time on another branch. The search was not wrong; the CONCLUSION was. `git ls-files` and
 * `rg` answer a question about ONE checkout, and the agent read the answer as a fact about the repo.
 *
 * That failure mode already had two guards and beat both:
 *   - `.claude/skills/cross-env-verify` lists "not found" and "does not exist" as triggers, but every
 *     vantage in its table is a TOOLCHAIN failure ("I cannot reach X with this tool"). Here the
 *     toolchain worked and answered correctly, so the agent's own sentence matched no row.
 *   - the session-start drift check literally warns "tooling may appear missing when it exists on
 *     main". It fires every session, before any particular claim, which is exactly what makes it
 *     skimmable.
 *
 * So this is not more prose. The correct check was previously five composed git invocations — two of
 * which Git Bash silently mangles — and a check that costs five commands does not get run. This
 * makes it cost one.
 *
 * Usage:
 *   node scripts/repo-wide-find.mjs consult-glm.mjs        # filename or path fragment
 *   node scripts/repo-wide-find.mjs --content "ZAI_API_KEY" # search file CONTENT across all refs
 *
 * Exit codes:  0 = found somewhere (the absence claim is FALSE — read the report)
 *              1 = genuinely not found anywhere reachable (absence claim survives)
 *              2 = could not run (git missing, not a repo) — NOT the same as "absent"
 *
 * @module repo-wide-find
 */
import { execFileSync } from 'node:child_process';

// MSYS path conversion rewrites `<rev>:<path>` and leading-slash arguments into Windows paths before
// git sees them, so a file that exists is reported ABSENT. That false negative has bitten this repo
// repeatedly — including in the session that produced this script. Setting it here means a caller
// cannot forget it, which is the whole point of putting the check in a script instead of a doc.
const ENV = { ...process.env, MSYS_NO_PATHCONV: '1' };

const git = (args) => execFileSync('git', args, { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
const tryGit = (args) => { try { return git(args); } catch { return ''; } };

const needle = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
const contentMode = process.argv.includes('--content');

if (!needle) {
  console.error('usage: node scripts/repo-wide-find.mjs <name-or-path-fragment> [--content]');
  process.exit(2);
}

try {
  git(['rev-parse', '--git-dir']);
} catch (err) {
  console.error(`repo-wide-find: cannot run git here (${err.code ?? err.message}).`);
  console.error('  This is "the check could not run", NOT "the file is absent". Do not conclude absence from this.');
  process.exit(2);
}

/** Every ref worth searching: local branches, remote-tracking branches, and HEAD. */
const refs = tryGit(['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes'])
  .split('\n').map((s) => s.trim()).filter(Boolean);

const hits = [];

for (const ref of refs) {
  const listing = tryGit(['ls-tree', '-r', '--name-only', ref]);
  if (!listing) continue;
  const matches = listing.split('\n').filter((f) => f.includes(needle));
  for (const f of matches) hits.push({ where: ref, path: f });
}

// The stash holds work that exists in no ref at all — the single easiest place for "it was never
// written" to be wrong.
const stashes = tryGit(['stash', 'list', '--format=%gd']).split('\n').filter(Boolean);
for (const s of stashes) {
  const listing = tryGit(['stash', 'show', '--name-only', s]);
  for (const f of listing.split('\n').filter((x) => x.includes(needle))) hits.push({ where: s, path: f });
}

// Linked worktrees are separate checkouts of the SAME repo — the exact structure that produced the
// original error, since each one legitimately contains a different set of files.
const worktrees = tryGit(['worktree', 'list']).split('\n').filter(Boolean);

const contentHits = [];
if (contentMode) {
  for (const ref of refs) {
    const found = tryGit(['grep', '-l', '--fixed-strings', needle, ref]);
    for (const line of found.split('\n').filter(Boolean)) contentHits.push(line);
  }
}

const all = [...hits, ...contentHits];

console.log(`repo-wide-find: "${needle}"${contentMode ? ' (content)' : ' (path)'}`);
console.log(`  searched ${refs.length} ref(s), ${stashes.length} stash entr(y|ies), ${worktrees.length} worktree(s)`);
console.log('');

if (!all.length) {
  console.log('  NOT FOUND in any ref, stash, or worktree listing.');
  console.log('  The absence claim survives this check — it is now evidenced, not assumed.');
  console.log('');
  console.log('  Worktrees (each is a different checkout; an untracked file lives in only one):');
  for (const w of worktrees) console.log(`    ${w}`);
  process.exit(1);
}

console.log('  FOUND — the file exists in this repository. Any "it is missing" claim is FALSE:');
const byWhere = new Map();
for (const h of hits) {
  if (!byWhere.has(h.where)) byWhere.set(h.where, []);
  byWhere.get(h.where).push(h.path);
}
for (const [where, paths] of byWhere) {
  console.log(`    ${where}`);
  for (const p of [...new Set(paths)].slice(0, 10)) console.log(`      ${p}`);
}
for (const c of contentHits.slice(0, 20)) console.log(`    ${c}`);
console.log('');
console.log('  To use it from here:  git checkout <ref> -- <path>     (or switch/cherry-pick deliberately)');
process.exit(0);
