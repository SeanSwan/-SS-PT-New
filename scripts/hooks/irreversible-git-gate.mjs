#!/usr/bin/env node
/**
 * irreversible-git-gate.mjs — PreToolUse(Bash) gate for CLAUDE.md Rule 45.
 *
 * WHY
 * ---
 * Rule 45: "Do not use `git commit --amend`, `git rebase`, history rewrite, or
 * force-push cleanup to polish a local commit unless Sean explicitly asks for that
 * operation." It has existed since 2026-04 with no enforcement, which puts it in the
 * 59-of-83 prose-only bucket found by the hook-coverage audit (2026-08-21).
 *
 * It is worth a gate because the failure is IRREVERSIBLE and SILENT: a rebase or
 * force-push that eats another agent's commits leaves no error, and in a tree where
 * 4-8 agents work in parallel (Rule 67) the loss is discovered hours later by someone
 * who did not cause it. Every other Rule-45 operation is cheap to redo the right way
 * (a normal follow-up commit), so the cost of a false positive is one extra sentence
 * and the cost of a false negative is unrecoverable work.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It cannot know whether Sean asked. Nothing in the tool payload carries that. So it
 * blocks and names the escape rather than pretending to judge intent: prefix the
 * command with SWAN_RULE45_OK=1 once Sean has actually authorised it. That keeps the
 * decision with the human while making the default safe. An agent that sets the
 * variable without being asked has lied in a way that shows up in the transcript,
 * which is the most a hook can do here.
 *
 * FALSE-POSITIVE DISCIPLINE (inherited from push-blast-radius v2.1)
 * -----------------------------------------------------------------
 * Quoted strings are stripped BEFORE matching, because `git commit -m "revert the
 * rebase"` is not a rebase. Subcommands must be the git subcommand, not any later
 * word, because `git config --get rebase.autostash` and `git log --grep=amend` are
 * both innocent. A gate that cries wolf gets switched off (Rule 34), and this one is
 * only useful if it is rare enough to still be read.
 *
 * Contract: stdin = { tool_name, tool_input }. stdout = {decision,reason} or silence.
 * Fail-OPEN on throw, but never fail-SILENT.
 */
import { readFileSync } from 'node:fs';
import { runGate, FAIL_OPEN } from './lib/gate-run.mjs';

/** Each: the git operation, and what is unrecoverable about it. */
const IRREVERSIBLE = [
  {
    name: 'commit --amend',
    // `git commit ... --amend` in any order; --amend must be a standalone flag.
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+commit\b[^\n;|&]*\s--amend\b/i,
    what: 'rewrites the previous commit. If it was pushed or another agent branched from it, that history is gone.',
  },
  {
    name: 'rebase',
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+rebase\b/i,
    what: 'rewrites every replayed commit. In a shared tree this silently orphans work that was based on the old SHAs.',
  },
  {
    name: 'push --force',
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+push\b[^\n;|&]*\s(?:--force\b(?!-with-lease)|-f\b)/i,
    what: 'overwrites the remote branch. Commits only on the remote — another agent\'s push — are destroyed with no record.',
  },
  {
    name: 'push --force-with-lease',
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+push\b[^\n;|&]*\s--force-with-lease\b/i,
    what: 'safer than --force (it checks the remote ref first) but still a history rewrite, and still Rule 45.',
  },
  {
    name: 'reset --hard',
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+reset\b[^\n;|&]*\s--hard\b/i,
    what: 'discards working-tree and index changes with no stash and no undo.',
  },
  {
    name: 'filter-branch / filter-repo',
    re: /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+filter-(?:branch|repo)\b/i,
    what: 'rewrites the entire history. This is the operation that followed the 2026-04-19 credential incident; it is never routine.',
  },
];

/** Strip quoted strings so commit messages cannot trip the matcher. */
export function bareCommand(cmd) {
  return String(cmd)
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

/** @returns {string|null} block reason, or null to allow. */
export function decide(hookInput) {
  if ((hookInput?.tool_name || '') !== 'Bash') return null;
  const cmd = String(hookInput.tool_input?.command || '');
  if (!cmd) return null;

  // Documented, deliberate escape. Rule 45 puts the decision with Sean; a hook cannot
  // read intent, so it reads an explicit marker instead of guessing.
  if (/\bSWAN_RULE45_OK=1\b/.test(cmd)) return null;

  const bare = bareCommand(cmd);
  const hits = IRREVERSIBLE.filter((op) => op.re.test(bare));
  if (!hits.length) return null;

  const lines = [
    'BLOCKED by Rule 45 — history rewriting needs Sean\'s explicit ask.',
    '',
    ...hits.map((h) => `  • git ${h.name} — ${h.what}`),
    '',
    'Rule 45 names the alternative: "If a SHA/reference or small mistake is discovered',
    'after a commit, make a normal follow-up commit." That is almost always the answer,',
    'it is reviewable, and it cannot eat a parallel agent\'s work (Rule 67: 4-8 agents',
    'share this tree).',
    '',
    'If Sean HAS explicitly asked for this operation, re-run the command prefixed with:',
    '    SWAN_RULE45_OK=1 <your command>',
    'Setting that without being asked is a false statement in the transcript, not a bypass.',
  ];
  return lines.join('\n');
}

function main() {
  let hookInput;
  try { hookInput = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const { payload } = runGate(
    { name: 'irreversible-git-gate', boundary: 'tool', mode: FAIL_OPEN },
    () => {
      const reason = decide(hookInput);
      return reason ? { block: true, reason } : { block: false };
    },
  );
  if (payload) process.stdout.write(JSON.stringify(payload));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
