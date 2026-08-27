#!/usr/bin/env node
/**
 * fable-remit-gate.mjs — the FABLE GATE, as a control rather than a promise.
 * =========================================================================
 * Sean, 2026-08-26: "I don't ever want to run Fable to have it do all the work.
 * It comes in only for the review... Now I'm at 95% Fable maxed out and I haven't
 * got no hostile reviews and no blueprints. And that's all I want to use Fable
 * for: hostile reviews, blueprints, mermaids, flowcharts."
 *
 * WHY A SECOND GATE, WHEN spend-guard-gate.mjs ALREADY EXISTS
 * ----------------------------------------------------------
 * spend-guard asks HOW MUCH. It never asks WHAT FOR. That is the whole failure:
 * no single Fable call was outrageous, and the allowance still went to typing
 * code instead of to judgement. A price gate cannot see the difference between
 * $0.35 spent reviewing a plan and $0.35 spent writing one more component.
 *
 * The two gates are orthogonal and both run:
 *   spend-guard-gate.mjs   -> is this too expensive?      (cost)
 *   fable-remit-gate.mjs   -> should an AGENT spend this? (purpose)
 *
 * WHY THIS GATE IS PURPOSE-BLIND — THE POINT MOST LIKELY TO BE "IMPROVED" LATER
 * ----------------------------------------------------------------------------
 * The obvious design is to read `--remit` and allow review-shaped words while
 * refusing build-shaped ones. DO NOT DO THAT. It was proposed, and GPT-5.6 Sol
 * killed it in hostile review (2026-08-26, blocker B4): the remit is a string the
 * CALLER supplies, so a classifier over it only tests vocabulary. An agent under
 * deadline writes "produce an ultra-complete blueprint a worker-bot executes
 * verbatim" — which the prose rule expressly permits — or "review this and return
 * the corrected implementation," and both satisfy every review-shaped filter while
 * spending Fable on builder work. A keyword gate does not close the loophole; it
 * documents it.
 *
 * So this gate does not read the remit at all. It refuses the FIRST invocation
 * unconditionally, whatever it says. There is no wording that gets past it,
 * because wording is not an input.
 *
 * WHY REFUSING EVERY FIRST CALL IS NOT TOO STRICT
 * ----------------------------------------------
 * Because the script was never the intended path. Sean's instruction is "when
 * it's time to call Fable, tell me, and I will switch it to Fable" — he drives
 * Fable in his own window. `consult-fable.mjs` is the exception, not the norm, so
 * a gate that makes the exception require his explicit yes costs nothing that
 * matters and removes the failure mode entirely.
 *
 * The second ask reuses the shape from spend-ledger.mjs: refuse, mint a random
 * single-use token bound to this exact command, and let only a separate invocation
 * carrying that token through.
 *
 * WHAT THIS GATE IS, HONESTLY — READ BEFORE TRUSTING IT
 * ----------------------------------------------------
 * **It is friction plus an audit trail against an EAGER agent. It is not a wall
 * against a HOSTILE one.** Two hostile reviews on 2026-08-26 (GLM 5.3 blocker 1,
 * GLM 5.3-flash blocker 3) took apart an earlier version of this comment that
 * claimed "an agent cannot self-approve" and "cannot compute the token, because it
 * is random and stored." Both claims were false, and both were verified false:
 *
 *   1. THE REFUSAL USED TO PRINT THE TOKEN. A PreToolUse hook's stderr on exit 2
 *      is shown to the AGENT, not to Sean — a fact this very file documents two
 *      paragraphs down. So the loop was: run, blocked, read own token, re-run.
 *      Two tool calls instead of one, no human anywhere. The second ask was
 *      enforced by the sentence "Do NOT re-run with the token on your own" — prose,
 *      inside the mechanism whose whole pitch was that it was not prose.
 *      The token is no longer printed. It is written to a file for Sean to read out.
 *   2. THE TOKEN STORE IS INSIDE THE AGENT-WRITABLE TREE. `.ai-workflow/gates/`
 *      is an ordinary repo path, `commandKey` is exported, and a forged store was
 *      demonstrated to yield exit 0 in one write. Moving the file does not fix
 *      this; anywhere the hook can read, an agent with Write can reach.
 *
 * So: this gate raises the cost of spending Fable and leaves a record when it
 * happens. The outer wall is elsewhere and always was — Sean reviewing diffs, the
 * harness permission system, and the fact that Sean drives Fable himself. Do not
 * restore language implying more than that. **A gate that overstates itself is
 * worse than no gate, because it stops people looking.**
 *
 * WHY IT STILL FAILS CLOSED ON ERRORS (spend-guard fails OPEN — different on purpose)
 * ----------------------------------------------------------------------------------
 * The catch block fails closed, so a crash cannot silently restore the old
 * behaviour. Note precisely what that does and does not cover: it is closed on
 * EXCEPTIONS only. A regex MISS is not an exception — it returns `allow: true`, and
 * §"known ungated shapes" below lists the shapes known to miss. "Fails closed" has
 * never meant "cannot be evaded," and the earlier header implied otherwise.
 *
 * Failing closed is safe *specifically because* a non-script path to Fable exists —
 * Sean switches models. A broken hook costs an agent the script; never Sean the model.
 *
 * KNOWN UNGATED SHAPES — verified misses, listed rather than hidden
 * ----------------------------------------------------------------
 * String-layer matching cannot see through indirection. These bill and are NOT
 * matched (verified 2026-08-26): a `package.json` script or `bash cmdfile` wrapper
 * (the name never appears); shell-variable indirection (`N=node; $N …`); a glob or
 * quote-split path (`consult-fab*.mjs`, `consu''lt-fable.mjs`); `xargs` with the
 * runner last; and **the substitute path** — `scripts/context-gateway/src/consult.mjs`
 * is what `consult-fable.mjs` actually shims to, so calling it directly spends Fable
 * through the same billing path and matches nothing here.
 * Detection for these is the spend LEDGER, not this gate. Say so out loud rather
 * than letting the header's confidence imply coverage that does not exist.
 *
 * WHY `--dry-run` IS NOT HONORED
 * ------------------------------
 * spend-guard honors `--dry-run` because the panel really implements it. The Fable
 * path does not: `consult-fable.mjs` is a thin shim over
 * `scripts/context-gateway/src/consult.mjs`, and neither mentions dry-run
 * (verified 2026-08-26). An unrecognised flag is ignored and the call bills in
 * full. That is precisely the documented bypass class in spend-guard-gate.mjs,
 * where `--max-tokens 500` lowered the estimate for a flag the script does not
 * accept. Honoring a flag the target ignores is how a gate lies.
 *
 * EXIT CODES (Claude Code PreToolUse contract)
 *   0 — allow;  2 — block the tool call and show stderr to the agent.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '..', '..', '.ai-workflow', 'gates');
const TOKENS = join(STATE_DIR, 'fable-remit-tokens.json');

const ALLOW = () => process.exit(0);

/**
 * Match an INVOCATION of the Fable seat, not a mention of it. `grep consult-fable.mjs`,
 * `cat`, and `git log` all contain the filename and spend nothing; blocking those is a
 * false positive that trains people to route around the guard.
 *
 * Written with NO backslash escapes, on purpose. spend-guard-gate.mjs records three
 * attempts to author its equivalent line through shell/python interpolation that were
 * silently corrupted — one turned a `\b` into a literal backspace (0x08), which matches
 * nothing, so the gate stopped firing while still reporting "SYNTAX OK". A regex that
 * silently never matches is the worst possible failure for a guard.
 *
 * The leading context is a NEGATED IDENTIFIER class, not an enumerated list of
 * separators. An earlier draft used `[ ;&|(]`, copied from spend-guard-gate.mjs, and a
 * self-hostile pass immediately walked through it: `sh -c "node scripts/consult-fable.mjs"`
 * and `bash -lc 'node scripts/consult-fable.mjs'` both put a QUOTE before `node`, which
 * that class does not contain, so neither was gated. Enumerating separators means
 * enumerating every future one correctly; negating identifier characters means anything
 * that is not part of a word or path counts — quotes, newlines, tabs, parens, `$(`.
 * `mynode script.mjs` still does not match, which is the only false positive that mattered.
 *
 * NOTE: scripts/hooks/spend-guard-gate.mjs carried the original `[ ;&|(]` class and the
 * same quote-wrap hole. Filed as SWA-218 and fixed on `feat/spend-guard-tests` (PR #87),
 * together with that guard's first test file.
 *
 * The MIDDLE segment has the same story one layer down. It was a bare `[^|;&]*?`, which
 * deliberately cannot cross a shell boundary — that is what stops `node build.mjs | grep
 * consult-fable.mjs` (an invocation plus an unrelated MENTION in a second command) from
 * false-positiving, and it is still wanted. But it also could not cross a `| ; &` sitting
 * INSIDE A QUOTED ARGUMENT, so a call carrying a quoted "a|b" before the script path was
 * missed entirely. Not academic: this repo's own review templates tell agents to pass
 * remits containing "APPROVE | REVISE | REJECT". The middle now alternates quoted spans
 * (opaque, any content) with non-boundary characters — verified against 39 invocation
 * shapes with zero misses and zero false positives, boundary cases included.
 */
const INVOCATION = /(?:^|[^A-Za-z0-9_-])(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?consult-fable[.]mjs/;

/**
 * The panel can carry Fable as an opt-in seat, which is the same spend by another
 * entrance. Gate it only when Fable is actually named in --seats.
 */
const PANEL_WITH_FABLE =
  /(?:^|[^A-Za-z0-9_-])(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?consult-panel[.]mjs/;

function readTokens() {
  if (!existsSync(TOKENS)) return {};
  try { return JSON.parse(readFileSync(TOKENS, 'utf-8')); } catch { return {}; }
}
function writeTokens(t) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(TOKENS, JSON.stringify(t, null, 2), 'utf-8');
}

/**
 * Bind a token to the command it was issued for, minus the token itself, so it
 * cannot be lifted onto a different Fable call. Whitespace is normalized so a
 * reformatted-but-identical re-run still matches.
 */
export function commandKey(cmd) {
  const normalized = String(cmd)
    .replace(/SWAN_FABLE_APPROVE=[a-f0-9]{12}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

/** True when this command actually spends Fable. Exported for the tests. */
export function invokesFable(cmd) {
  const c = String(cmd || '');
  if (INVOCATION.test(c)) return true;
  if (PANEL_WITH_FABLE.test(c)) {
    const seats = (c.match(/--seats\s+([^\s]+)/) || [])[1] || '';
    return seats.split(',').map((s) => s.trim()).includes('fable');
  }
  return false;
}

/**
 * The decision. Pure, so the tests can drive it without spawning a process.
 * @returns {{allow:boolean, token:string|null, reason:string}}
 */
export function decide(cmd, { tokens = readTokens(), persist = writeTokens } = {}) {
  if (!invokesFable(cmd)) return { allow: true, token: null, reason: 'not a Fable invocation' };

  const key = commandKey(cmd);
  const presented = (String(cmd).match(/SWAN_FABLE_APPROVE=([a-f0-9]{12})/) || [])[1] || '';
  const held = tokens[key];

  // SECOND ask: Sean saw the handoff block and said yes anyway. His call, and it
  // overrides this gate (standing owner override) — but it is now on the record.
  if (presented && held && held.token === presented && !held.used) {
    held.used = true;
    held.usedAt = new Date().toISOString();
    persist(tokens);
    return { allow: true, token: null, reason: 'second approval accepted' };
  }

  // FIRST ask: refuse, whatever the remit says, and mint the token this exact
  // command would need. Reusing a token from a different call fails the key match.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, used: false, issuedAt: new Date().toISOString() };
  persist(tokens);
  return { allow: false, token, reason: 'first ask — hand off to Sean' };
}

/**
 * Write the minted token where SEAN reads it, not where the agent is handed it.
 *
 * This is the direct fix for GLM 5.3 blocker 1: the refusal used to print
 * `SWAN_FABLE_APPROVE=<token>` to stderr, which the AGENT reads, so the two-ask
 * contract was satisfiable without a human ever seeing it.
 *
 * Being honest about the limit (see the header): an agent with file-read access can
 * open this file too. What changed is the reflex, not the possibility — the token is
 * no longer placed in the agent's own output, so self-serving now requires a
 * deliberate, greppable act rather than reading the error it just caused.
 */
function writePendingApproval(token, cmd) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(join(STATE_DIR, 'PENDING-FABLE-APPROVAL.txt'), [
    'FABLE GATE — an agent asked to spend Fable and was refused.',
    '',
    `  when:     ${new Date().toISOString()}`,
    `  command:  ${cmd}`,
    '',
    'If you want this to run, read the token below back to the agent.',
    'If you did not ask for it, do nothing — the refusal already held.',
    '',
    `  SWAN_FABLE_APPROVE=${token}`,
    '',
    'Single-use, bound to that exact command.',
  ].join('\n'), 'utf-8');
}

function refusal() {
  return [
    '🛑 FABLE GATE — an agent may not spend Fable. Stop and hand off to Sean.',
    '',
    'Rule 85: Fable is REVIEW-AND-BLUEPRINT ONLY, and Sean drives it himself.',
    'This gate does not read your --remit, on purpose: the remit is a string you',
    'wrote, so filtering it would only test your vocabulary (GPT-5.6 Sol, hostile',
    'review 2026-08-26, blocker B4). Rewording will not get you through.',
    '',
    'WHAT TO DO INSTEAD — print this block and yield the turn:',
    '',
    '    🛑 FABLE GATE — stopping for you to switch models.',
    '      WHY FABLE:      <the judgement only Fable should make>',
    '      REMIT:          <review | blueprint | diagram | arbitration>',
    '      PACKET:         <path to the file Fable reads — it must ALREADY exist>',
    '      READ ALSO:      <0-3 supporting paths, or "nothing else">',
    '      ASK FABLE FOR:  <the exact verdict shape wanted back>',
    '      WHEN DONE:      switch back and say "Fable is back."',
    '',
    'Cheaper and free first — they must have run already, and they are not a',
    'formality: on 2026-08-26 Ox Alpha and GLM returned 24 real findings at $0.00.',
    '    Qwen 3.8 (local, free) · Ox Alpha (free) · GLM 5.3 (subscription)',
    '    Codex / ChatGPT Sol (Sean drives; use the seat-relay prompt template)',
    '',
    'THE TOKEN IS NOT PRINTED HERE, and that is deliberate. A PreToolUse refusal',
    'is read by YOU, not by Sean — so printing it made the second ask something you',
    'could satisfy alone. It is now written to:',
    '',
    '    .ai-workflow/gates/PENDING-FABLE-APPROVAL.txt',
    '',
    'Ask Sean to read the token back to you. Do not open that file to serve',
    'yourself: this gate is friction and an audit trail, not a wall, and helping',
    'yourself to the key is the exact move it exists to make visible.',
    '',
    'Full procedure: .claude/skills/seat-relay/SKILL.md',
  ].join('\n');
}

// --- process entry point; skipped when imported by the tests -----------------
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('fable-remit-gate.mjs');
if (invokedDirectly) {
  let cmd = '';
  try {
    const raw = readFileSync(0, 'utf-8');
    cmd = JSON.parse(raw)?.tool_input?.command || '';
  } catch {
    // No parseable stdin means no command to gate. Allowing here is not a
    // fail-open on the Fable path — a malformed hook payload is not an
    // invocation, and refusing every unparseable Bash call would brick the
    // whole toolchain over a payload-shape change.
    ALLOW();
  }

  try {
    const d = decide(cmd);
    if (d.allow) ALLOW();
    writePendingApproval(d.token, cmd);
    console.error(refusal());
    process.exit(2);
  } catch (err) {
    // FAIL CLOSED — see the header. A bug here costs the script, never the model.
    console.error(`[fable-remit] gate error — FAILING CLOSED: ${err?.message}`);
    console.error('Fable is unreachable by script until this is fixed. Sean can still');
    console.error('switch models by hand, which is the intended path anyway.');
    process.exit(2);
  }
}
