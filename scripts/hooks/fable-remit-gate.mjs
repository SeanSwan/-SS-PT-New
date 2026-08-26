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
 * The second ask reuses the proven shape from spend-ledger.mjs: refuse, mint a
 * random single-use token bound to this exact command, and let only a separate
 * invocation carrying that token through. An agent cannot self-approve in one
 * step, and it cannot compute the token, because it is random and stored.
 *
 * WHY THIS ONE FAILS CLOSED (spend-guard fails OPEN — deliberately different)
 * --------------------------------------------------------------------------
 * spend-guard fails open so a guard bug can never brick the toolchain. That is
 * right for a cost check. It is wrong here: a purpose gate that fails open is not
 * a gate, and a bug in it would silently restore the exact behaviour the rule
 * exists to stop. Failing closed is safe *specifically because* a non-script path
 * to Fable exists — Sean switches models. A broken hook costs an agent the script;
 * it never costs Sean the model.
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
const INVOCATION = /(?:^|[^A-Za-z0-9_-])(?:node|npx|bun) (?:"[^"]*"|'[^']*'|[^|;&])*?consult-fable[.]mjs/;

/**
 * The panel can carry Fable as an opt-in seat, which is the same spend by another
 * entrance. Gate it only when Fable is actually named in --seats.
 */
const PANEL_WITH_FABLE =
  /(?:^|[^A-Za-z0-9_-])(?:node|npx|bun) (?:"[^"]*"|'[^']*'|[^|;&])*?consult-panel[.]mjs/;

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

function refusal(token) {
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
    'If Sean has ALREADY seen the block above and said to run the script anyway,',
    're-run this exact command with:',
    '',
    `    SWAN_FABLE_APPROVE=${token} <the same command>`,
    '',
    'Single-use, and bound to this exact command. Do NOT re-run with the token on',
    'your own — that is the one move this gate exists to prevent.',
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
    console.error(refusal(d.token));
    process.exit(2);
  } catch (err) {
    // FAIL CLOSED — see the header. A bug here costs the script, never the model.
    console.error(`[fable-remit] gate error — FAILING CLOSED: ${err?.message}`);
    console.error('Fable is unreachable by script until this is fixed. Sean can still');
    console.error('switch models by hand, which is the intended path anyway.');
    process.exit(2);
  }
}
