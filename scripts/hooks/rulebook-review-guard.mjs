#!/usr/bin/env node
/**
 * rulebook-review-guard.mjs — pre-commit guard for the ALWAYS-ON instruction files.
 *
 * WHY: CLAUDE.md is 988 lines / ~41k tokens loaded into every session, and the corpus
 * shows 43 "rule-contradiction / bloat" incidents — a widened rule left its own prose
 * contradicting it; a 35-line block landed in a file whose header says "keep SHORT".
 * "Keep it lean" is itself a prose rule, and prose does not hold. The first proposal
 * was a byte budget; five review seats killed it as gameable (delete a load-bearing
 * rule to land a trivial one; merge rules to game the count; push bloat into an
 * unenforced side file). What survives is REVIEW, not METERING: a change to an
 * always-on file must say what it does to the rulebook and who reviewed it, in the
 * commit message, where it is greppable forever.
 *
 * WHAT IT REQUIRES: if any staged path is in ALWAYS_ON, the commit message must carry
 * a trailer line
 *     RULEBOOK: <add|amend|retire|narrative-cut|mirror-sync> <what> — reviewed-by: <seat>
 * e.g. RULEBOOK: retire 12 — reviewed-by: Sean
 *      RULEBOOK: narrative-cut 46,47,48 — reviewed-by: GLM 5.3, Ox
 *      RULEBOOK: mirror-sync — reviewed-by: sync-agents-mirror.mjs
 *
 * WHAT IT ALSO REPORTS (never blocks on): the numbered-rule count in the MANDATORY
 * section vs the count the file CLAIMS, and the byte delta of the change — so growth
 * is visible in every such commit, not measured by a cap someone will game.
 *
 * CONTRACT (matches lane-staged-guard): exit 2 = block (the pre-commit shell treats
 * only 2 as a block); exit 0 = allow; any other failure = fail OPEN, loudly.
 * `git commit --no-verify` skips this, as it skips every guard — greppable in reflog.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const ALWAYS_ON = ['CLAUDE.md', 'AGENTS.md', 'ACTIVE-INDEX.md', '.ai-workflow/hermes-inbox/standing-context.md'];
const TRAILER = /^RULEBOOK:\s*(add|amend|retire|narrative-cut|mirror-sync)\b.*reviewed-by:\s*\S/im;

export function decide({ staged, message, ruleCount, claimed, byteDelta }) {
  const hits = staged.filter((p) => ALWAYS_ON.includes(p));
  if (!hits.length) return { block: false, note: null };
  if (TRAILER.test(message || '')) {
    return { block: false, note: `rulebook change reviewed: ${hits.join(', ')} · rules ${ruleCount ?? '?'} (file claims ${claimed ?? '?'}) · ${byteDelta >= 0 ? '+' : ''}${byteDelta ?? '?'} bytes` };
  }
  return {
    block: true,
    note:
      `\n  RULEBOOK-REVIEW GUARD — you are changing an always-on instruction file:\n` +
      hits.map((h) => `    ${h}`).join('\n') + '\n\n' +
      `  These files are loaded into EVERY session (CLAUDE.md alone ≈ 41k tokens). The corpus\n` +
      `  holds 43 rule-contradiction/bloat incidents; "keep it lean" as prose did not hold.\n` +
      `  A change here must say what it does and who looked at it, in the commit message:\n\n` +
      `    RULEBOOK: <add|amend|retire|narrative-cut|mirror-sync> <what> — reviewed-by: <seat>\n\n` +
      `  Rule count now: ${ruleCount ?? '?'} in the MANDATORY section (file claims ${claimed ?? '?'}).\n` +
      `  This change: ${byteDelta >= 0 ? '+' : ''}${byteDelta ?? '?'} bytes.\n\n` +
      `  Nothing was committed.\n`,
  };
}

function git(args) { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }

export async function main() {
  let staged = [];
  try { staged = git(['diff', '--cached', '--name-only']).trim().split('\n').filter(Boolean); }
  catch (e) { console.error(`[rulebook-review] cannot read index, failing open: ${e.message}`); process.exit(0); }
  if (!staged.some((p) => ALWAYS_ON.includes(p))) process.exit(0);

  // This MUST run as a commit-msg hook, not pre-commit: during pre-commit the message
  // is not written yet (with -m, git writes COMMIT_EDITMSG AFTER pre-commit), so a
  // pre-commit read would see the PREVIOUS commit's message — a guard that passes or
  // fails on stale input. Caught while writing it; this is the corpus's "instrument
  // trust" family aimed at my own gate. commit-msg receives the message file as argv[2].
  const msgFile = process.argv[2] || process.env.SWAN_COMMIT_MSG_FILE || '';
  let message = '';
  if (msgFile && existsSync(msgFile)) message = readFileSync(msgFile, 'utf8');
  else if (process.env.SWAN_COMMIT_MSG) message = process.env.SWAN_COMMIT_MSG;
  else { console.error('[rulebook-review] no commit-message file passed (run as commit-msg hook) — failing open'); process.exit(0); }

  let ruleCount = null, claimed = null, byteDelta = null;
  try {
    const { analyzeRules } = await import('../lib/rule-count.mjs');
    const text = git(['show', ':CLAUDE.md']);
    const r = analyzeRules(text);
    ruleCount = r.count; claimed = r.claims?.[0] ?? null;
    let head = ''; try { head = git(['show', 'HEAD:CLAUDE.md']); } catch { head = ''; }
    byteDelta = Buffer.byteLength(text) - Buffer.byteLength(head);
  } catch { /* metrics are advisory */ }

  const d = decide({ staged, message, ruleCount, claimed, byteDelta });
  if (d.block) { console.error(d.note); process.exit(2); }
  if (d.note) console.log(`[rulebook-review] ${d.note}`);
  process.exit(0);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) main();
