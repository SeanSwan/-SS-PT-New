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
 * runner last.
 *
 * REMOVED FROM THAT LIST 2026-08-31: `scripts/context-gateway/src/consult.mjs` was
 * cited here as a live "substitute path" that spends Fable directly. **It is not, and
 * it never was.** Verified: the file has no shebang and no self-invocation guard, so
 * `node .../consult.mjs` defines exports and exits, spending nothing. The claim was
 * accepted after confirming a REGEX did not match it, without confirming the file was
 * EXECUTABLE — matching is not the same as exploitable, and verifying the wrong
 * proposition is how a finding gets "confirmed" while staying wrong.
 *
 * Leaving it listed had a real cost beyond being untrue: it named a fake hole beside
 * genuine ones, so a reader auditing this list would spend effort on the fake and
 * learn that the list is noisy. A known-gaps list is only useful if every row is real.
 *
 * Detection for the remaining shapes is the spend LEDGER, not this gate. Say so out
 * loud rather than letting the header's confidence imply coverage that does not exist.
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
import { planFrom } from '../lib/invocation-plan.mjs';
import { redeemOnce } from '../lib/atomic-claim.mjs';

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
 *
 * THREE MISSES CLOSED 2026-08-31, found by running this matcher against the SPEND
 * gate's shape corpus — 60 command shapes that nine rounds of hostile review proved
 * reach a paid seat. Nobody had ever compared the two gates, which is the same
 * cross-table blindness that let the spend gate price Sol at half the rate its own
 * provider record carried, for weeks, with nothing comparing them.
 *
 *   ./scripts/consult-fable.mjs        a shebang script needs NO runner word
 *   nodejs scripts/consult-fable.mjs   `nodejs` is a real node binary (Debian/Ubuntu)
 *   scripts/consult-fable.MJS          NTFS and macOS are case-insensitive, so this
 *                                      resolves and runs — and this host is Windows
 *
 * WHY THIS STAYS A REGEX while the spend gate got a parser: they answer different
 * questions. The spend gate must decide whether a command EXECUTES a seat, so position
 * and quoting are load-bearing and a miss costs money. This gate asks only whether
 * Fable is NAMED AT ALL, where over-matching costs a handoff block on a task Sean was
 * going to do by hand anyway. A presence test is the right shape here — which is why
 * `--check`, backticks, `find -exec` and even a NUL byte all still match it, and why
 * only the three genuine blind spots above needed closing.
 */
// The shebang case is its OWN alternation, not an optional runner. Making the runner
// optional was my first attempt and it over-matched immediately: `cat
// scripts/consult-fable.mjs` started gating, which this file's own tests caught within
// a minute. Requiring a literal `./` or `../` keeps a bare mention out while catching
// the direct execution that needs no runner at all.
//
// KNOWN over-match, in the affordable direction: `cat ./scripts/consult-fable.mjs`
// gates. Nobody writes that, and if they do the cost is a handoff block on a task Sean
// performs by hand anyway.
const INVOCATION = /(?:^|[^A-Za-z0-9_-])(?:(?:node|nodejs|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?|\.{1,2}\/(?:[\w.-]+\/)*)consult-fable[.]mjs/i;

/**
 * The panel can carry Fable as an opt-in seat, which is the same spend by another
 * entrance. Gate it only when Fable is actually named in --seats.
 *
 * THE SCRIPT NAMED HERE DID NOT EXIST. `consult-panel.mjs` is a GHOST — the real
 * fan-out is `consult-openrouter-panel.mjs` — so this entire arm was dead code and
 * `--seats fable` through the panel reached Fable completely ungated. Its own comment
 * calls that "the same spend by another entrance", which is exactly right and exactly
 * what was not happening.
 *
 * The identical ghost was purged from the spend gate in round 5 (it also priced
 * `consult-grok.mjs`, which does not exist). The two gates were written from the same
 * stale list and only one of them was ever audited.
 */
const PANEL_WITH_FABLE =
  /(?:^|[^A-Za-z0-9_-])(?:(?:node|nodejs|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?|\.{1,2}\/(?:[\w.-]+\/)*)consult-(?:openrouter-)?panel[.]mjs/i;

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

  // THE PLAN FIRST, because it canonicalizes what the regex compares as bytes.
  // Node accepts a module specifier as a file URL and a URL may percent-encode any
  // character, so `--import=file:///…/consult%2Dfable.mjs` runs the Fable seat and
  // contains no literal `consult-fable.mjs` for any pattern to find (Codex
  // 2026-08-31). Query strings and fragments are the same story. The parser resolves
  // all three to the path Node resolves them to, once, for both gates.
  if (planFrom(c).some((inv) => inv.name === 'consult-fable.mjs')) return true;

  // The regex stays as the PRESENCE test for shapes the plan does not attribute — a
  // mention-resistant net over wrappers, substitutions and quoting. The two are
  // complementary: the plan knows what executes, the regex knows what is named.
  if (INVOCATION.test(c)) return true;
  // THE PANEL ARM READS THE INVOCATION PLAN, NOT THE RAW LINE.
  //
  // Codex hostile review 2026-08-31 found two defects here that are one defect:
  //   `--seats "fable,sol"`  read as `"fable` — a quoted value scanned as text.
  //   `<panel --seats sol> && <panel --seats fable>` cleared, because the FIRST
  //   `--seats` on the line won and a different command's flag answered for this one.
  //
  // Both die with the scan. The plan hands back each panel invocation with its OWN
  // argv, already unquoted by the parser — so there is no quote to strip and no way to
  // read a neighbour's flag. The `--seats=` spelling comes free, because `flagFrom`
  // handles both forms rather than a regex trying to spell them.
  //
  // The seat-list SEMANTICS are unchanged and still deliberate: an absent or empty
  // list means the panel's DEFAULT roster, and Fable is not in it — so an unnamed list
  // is genuinely not a Fable call. That is the same distinction the spend gate learned
  // in round 5, where collapsing "empty" into "none" priced a confirmed fan-out at $0.
  if (planFrom(c).some((inv) => inv.isPanel && (inv.seats || []).includes('fable'))) return true;
  if (PANEL_WITH_FABLE.test(c)) {
    // The plan could not attribute this line (an unknown wrapper, an eval, a nested
    // shell) yet a panel is plainly named in it. Falling through to `false` here would
    // be the fail-OPEN this gate is written not to do, so an unreadable panel line
    // counts as a Fable call and Sean gets the handoff block.
    return planFrom(c).some((inv) => inv.unknown);
  }
  return false;
}

/**
 * The decision. Pure, so the tests can drive it without spawning a process.
 * @returns {{allow:boolean, token:string|null, reason:string}}
 */
export function decide(cmd, {
  tokens = readTokens(),
  persist = writeTokens,
  // The shared single-winner primitive. Injectable so `decide` stays pure for tests;
  // the default is the real O_EXCL claim used by the spend ledger.
  claim = (key, token) => redeemOnce(STATE_DIR, key, token),
} = {}) {
  if (!invokesFable(cmd)) return { allow: true, token: null, reason: 'not a Fable invocation' };

  const key = commandKey(cmd);
  const presented = (String(cmd).match(/SWAN_FABLE_APPROVE=([a-f0-9]{12})/) || [])[1] || '';
  const held = tokens[key];

  // SECOND ask: Sean saw the handoff block and said yes anyway. His call, and it
  // overrides this gate (standing owner override) — but it is now on the record.
  if (presented && held && held.token === presented) {
    // THE CLAIM IS ATOMIC, AND `held.used` NO LONGER DECIDES ANYTHING.
    //
    // Codex hostile review 2026-08-31: two processes that both read the store while it
    // still said `used: false` both proceeded. Read tokens.json, check the flag, set
    // it, write back — that is an unlocked read-modify-write, so "check then set" has
    // a window, and this harness issues tool calls in parallel as a matter of course.
    //
    // The spend ledger had the IDENTICAL race and fixed it months ago. It survived
    // here because only one gate was ever audited — the most expensive recurring shape
    // in this workstream. So the primitive is now SHARED (`lib/atomic-claim.mjs`)
    // rather than reimplemented: exactly one process can create the O_EXCL claim path,
    // and the spent-marker is what makes that claim mean "spent" rather than
    // "in progress".
    //
    // `claim` is injectable so the pure `decide()` stays testable without touching
    // disk; the default is the real primitive.
    if (!claim(key, presented)) {
      return { allow: false, token: null, reason: 'that approval is already being redeemed, or was already spent' };
    }
    held.used = true;                 // audit trail only — the claim decided this
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
