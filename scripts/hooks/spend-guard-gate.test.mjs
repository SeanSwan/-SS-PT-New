#!/usr/bin/env node
/**
 * spend-guard-gate.test.mjs — the money guard's first test file (SWA-218).
 * =========================================================================
 * WHY THIS EXISTS, AND WHY IT IS THE DELIVERABLE
 * ----------------------------------------------
 * `scripts/lib/spend-ledger.test.mjs` already proved the CAP — the arithmetic, the
 * topic normalizer, the two-ask token. Nothing proved the PIPE that feeds it. The
 * gate's own header catalogues three separate corruptions of its `INVOCATION` regex,
 * ending with the line "a regex that silently never matches is the worst possible
 * failure for a guard" — and then a fourth corruption sat in that exact line, unfound,
 * because there was no test.
 *
 * The fourth was `[ ;&|(]` as the leading context: no quote characters, so
 * `sh -c "node scripts/consult-fable.mjs"` was never matched. It was found by copying
 * the regex into fable-remit-gate.mjs and attacking the copy. Fixing the regex without
 * writing this file would just reset the clock on a fifth.
 *
 * WHY BLACK BOX, NOT A REFACTOR-AND-UNIT-TEST
 * -------------------------------------------
 * The tempting move is to extract a pure `decide()` and unit-test that. Rejected: it
 * changes a live money guard, and then the tests validate the refactor rather than the
 * behaviour that has been running. These tests spawn the REAL hook with a REAL hook
 * payload and assert the REAL exit code, so they cover stdin parsing, the ALLOW
 * short-circuits, the pricing maths, and the Claude Code PreToolUse contract
 * (0 = allow, 2 = block) — all things an extracted function would no longer see.
 *
 * LEDGER ISOLATION
 * ----------------
 * The blocking path mints a token and reads cumulative totals. Every spawn here points
 * `SWAN_SPEND_DIR` at a throwaway directory, so Sean's real spend state is never read
 * or written. See the note on SPEND_DIR in scripts/lib/spend-ledger.mjs for why that
 * override is not itself a bypass.
 *
 * Run: node scripts/hooks/spend-guard-gate.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'spend-guard-gate.mjs');

const ALLOW = 0;
const BLOCK = 2;

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'swan-spend-gate-')); });
after(() => { try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ } });

/**
 * Run the real gate against a real hook payload.
 * Each call gets a FRESH ledger dir, so cumulative state from one case can never
 * leak into another and turn a green suite red in a different order.
 */
function runGate(command, { ledger = null } = {}) {
  const dir = ledger || mkdtempSync(join(sandbox, 'run-'));
  const res = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_input: { command } }),
    env: { ...process.env, SWAN_SPEND_DIR: dir },
    encoding: 'utf-8',
  });
  return { code: res.status, stderr: res.stderr || '', dir };
}

/**
 * Read the minted token from the operator note, NOT from stderr.
 *
 * GLM 5.3 round-3 blocker 2: the refusal used to print the token into output the
 * AGENT reads, so the two-ask protocol bound nothing. It now goes to a file for Sean.
 * These tests changed with it — and reading it here is exactly the deliberate,
 * greppable act the refusal warns an agent not to perform.
 */
function tokenFrom(dir) {
  const note = join(dir, 'PENDING-SPEND-APPROVAL.txt');
  if (!existsSync(note)) return undefined;
  return (readFileSync(note, 'utf-8').match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1];
}

/**
 * Seed a ledger directory with prior spend, to drive the cumulative caps.
 *
 * The timestamp field is `ts`, matching what `recordSpend()` writes. An earlier
 * draft of this helper used `at`, and the cumulative test still passed — because
 * `spentOnTopic()` filters on `topic` alone and never looks at the date, while only
 * `spentToday()` reads `ts`. A test that passes with a misspelled field is a test
 * proving something other than what it claims, so the name is asserted below.
 */
function seedLedger(entries) {
  const dir = mkdtempSync(join(sandbox, 'seeded-'));
  mkdirSync(dir, { recursive: true });
  const rows = entries.map((e) => {
    assert.ok(e.ts, 'ledger rows are keyed on `ts` — see recordSpend()');
    return JSON.stringify(e);
  });
  writeFileSync(join(dir, 'ledger.jsonl'), rows.join('\n') + '\n', 'utf-8');
  return dir;
}

// A Fable call with no flags: 26k in at $10/M + 16k out at $50/M = $1.06 > the $1.00
// per-call cap. This is the canonical BLOCK fixture the rest of the suite leans on.
const FABLE = 'node scripts/consult-fable.mjs --document plan.md';

// ---------------------------------------------------------------------------
// 1. The regression this file was written for (SWA-218)
// ---------------------------------------------------------------------------

test('SWA-218: sh -c quote-wrapping is gated', () => {
  // A QUOTE before `node`. The old [ ;&|(] class did not contain one, so this
  // sailed through and billed in full.
  assert.equal(runGate(`sh -c "${FABLE}"`).code, BLOCK);
});

test('SWA-218: bash -lc quote-wrapping is gated', () => {
  assert.equal(runGate(`bash -lc '${FABLE}'`).code, BLOCK);
});

test('SWA-218: command substitution is gated', () => {
  assert.equal(runGate(`echo $(${FABLE})`).code, BLOCK);
});

test('SWA-218: a newline-separated invocation is gated', () => {
  assert.equal(runGate(`cd /repo\n${FABLE}`).code, BLOCK);
});

test('SWA-218: a tab before the interpreter is gated', () => {
  assert.equal(runGate(`cd /repo &&\t${FABLE}`).code, BLOCK);
});

test('SWA-218: an absolute interpreter path is gated', () => {
  assert.equal(runGate('/usr/bin/node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('SWA-218: a PIPE inside a quoted argument before the path does not hide the call', () => {
  // Found by attacking the FIXED regex. The middle segment was a bare [^|;&]*?, which
  // could not cross a boundary character even inside quotes. Not academic: this repo's
  // own review templates tell agents to pass remits containing "APPROVE | REVISE | REJECT".
  assert.equal(runGate(`node --require "a|b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('SWA-218: a SEMICOLON inside a quoted argument before the path does not hide the call', () => {
  assert.equal(runGate(`node --require "a;b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('SWA-218: an AMPERSAND inside a quoted argument before the path does not hide the call', () => {
  assert.equal(runGate(`node --require "a&b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('BOUNDARY: an invocation and an unrelated MENTION in two commands still does not match', () => {
  // This is what the [^|;&] exclusion is FOR, and quoted-span support must not lose it.
  assert.equal(runGate('node build.mjs | grep scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node build.mjs ; cat scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node build.mjs && cat scripts/consult-fable.mjs').code, ALLOW);
});

test('BOUNDARY: a real invocation in the SECOND command is still caught', () => {
  assert.equal(runGate('node build.mjs | node scripts/consult-fable.mjs').code, BLOCK);
});

// --- interpreter shapes (GLM 5.3 blocker 2, GLM 5.3-flash blocker 1) ---------

test('a TAB after the runner is gated', () => {
  // bash's IFS splits on tab; the separator was a literal U+0020. Fixed with a
  // negated identifier class, NOT a literal tab — an invisible character in a guard
  // regex is the same failure as the backslash-b that became 0x08.
  assert.equal(runGate('node\tscripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('bunx, tsx and ts-node are gated', () => {
  assert.equal(runGate('bunx tsx scripts/consult-fable.mjs --document plan.md').code, BLOCK);
  assert.equal(runGate('tsx scripts/consult-fable.mjs --document plan.md').code, BLOCK);
  assert.equal(runGate('ts-node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('an UNRECOGNISED head carrying a seat now blocks — the fail-closed inversion', () => {
  // CONTRACT CHANGED in round 5, deliberately, and both halves of this test changed
  // with it. Stated rather than quietly retuned.
  //
  // `nodejs` used to assert ALLOW as a false-positive guard. That was WRONG about the
  // world: `nodejs` is a real node binary (Debian/Ubuntu ship it under that name), so
  // the test enshrined a genuine hole as a requirement. It is a RUNNER now, and this
  // asserts the block. A cry-wolf test is still a claim, and a false claim in a test
  // is load-bearing in the worst way — it defends the bug.
  assert.equal(runGate('nodejs scripts/consult-fable.mjs --document x').code, BLOCK,
    'nodejs really is node, and really does bill');

  // `node-foo` is genuinely unknown, and under the round-5 inversion an unknown head
  // carrying a script-shaped token blocks as unattributable rather than passing as
  // unseen. Both review seats named that inversion as the single highest-value change,
  // because every "I cannot model this" path used to mean ALLOW. The price is exactly
  // this: a false block, and a one-line addition to INERT_HEADS if the head is really
  // inert. That direction is affordable; the other one was not.
  assert.equal(runGate('node-foo scripts/consult-fable.mjs --document x').code, BLOCK,
    'an unknown head carrying a seat is an execution the gate cannot attribute');
});

test('a mention that includes the runner word is NO LONGER a false positive', () => {
  // This test used to assert BLOCK and called it an accepted trade: the guard fails
  // open, so a miss costs money silently while a false positive costs one retry, and
  // narrowing the regex would have reopened the SWA-218 miss. That reasoning was
  // sound FOR A REGEX. Parsing removes the dilemma — `git grep "node …"` is a git
  // command with one quoted argument, and no amount of text inside that argument
  // makes git spend money.
  //
  // Worth naming: the trade-off I documented as unavoidable was an artefact of the
  // tool, not of the problem.
  assert.equal(runGate('git grep -n "node scripts/consult-fable.mjs" docs').code, ALLOW);
  assert.equal(runGate('echo node scripts/consult-fable.mjs').code, ALLOW);
  // And the real call in the same shape still blocks:
  assert.equal(runGate('node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});


test('SWA-218: a word merely ENDING in node is not the node binary', () => {
  // The runner test still holds — `mynode` is NOT treated as node, so the line is not
  // priced as a Fable call. What changed in round 5 is the disposition of a head the
  // parser does not recognise AT ALL: it blocks as unattributable instead of passing.
  // Those are different claims, and only the second one moved.
  const r = runGate('mynode scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK, 'unrecognised head carrying a seat: blocked, not priced');
  assert.match(r.stderr, /cannot read/, 'and blocked as UNREADABLE, not as a $1.06 Fable call');
  assert.doesNotMatch(r.stderr, /worst case/, 'no price is invented for a command nobody can attribute');

  // The inert head beside it stays quiet, which is what keeps the rule affordable.
  assert.equal(runGate('cat scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('grep -n x scripts/consult-fable.mjs').code, ALLOW);
});

// ---------------------------------------------------------------------------
// 2. Invocation vs. mention — false positives train people to route around guards
// ---------------------------------------------------------------------------

test('grepping the script is not an invocation', () => {
  assert.equal(runGate('grep -n INVOCATION scripts/consult-fable.mjs').code, ALLOW);
});

test('cat-ing the script is not an invocation', () => {
  assert.equal(runGate('cat scripts/consult-fable.mjs').code, ALLOW);
});

test('git log over the script is not an invocation', () => {
  assert.equal(runGate('git log --oneline scripts/consult-fable.mjs').code, ALLOW);
});

test('an unrelated command passes', () => {
  assert.equal(runGate('npm run build').code, ALLOW);
});

test('an empty command passes', () => {
  assert.equal(runGate('').code, ALLOW);
});

test('a free seat is allowed — but now BY DECLARATION, not by being unrecognised', () => {
  // Behaviour change, deliberate (SWA-218). This used to assert consult-ox.mjs, which
  // does not exist on main — it "passed" only because the narrow matcher ignored it,
  // which is indistinguishable from a paid seat the matcher also ignored. That
  // indistinguishability WAS the bug.
  //
  // Now every consult-* matches, and a seat passes only because someone wrote down
  // why in FREE_ALLOWLIST. consult-gemini.mjs is free-tier and really is on that list.
  assert.equal(runGate('node scripts/consult-gemini.mjs --document plan.md').code, ALLOW);
});

test('a seat that is neither priced nor declared is REFUSED, not waved through', () => {
  // The inversion's whole point, and the test that proves it is not cosmetic.
  const r = runGate('node scripts/consult-brandnewseat.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /is not priced/);
  assert.match(r.stderr, /paid-seats\.mjs/, 'the refusal must name where to fix it');
  assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE/, 'classification refusals mint no token');
});

test('malformed stdin fails OPEN — a guard bug must never brick the toolchain', () => {
  const res = spawnSync(process.execPath, [GATE], {
    input: 'not json at all',
    env: { ...process.env, SWAN_SPEND_DIR: sandbox },
    encoding: 'utf-8',
  });
  assert.equal(res.status, ALLOW);
});

// ---------------------------------------------------------------------------
// 3. The documented bypasses in the gate's own header — a caller-supplied value
//    may RAISE the estimate, never lower it
// ---------------------------------------------------------------------------

test('BYPASS (header-documented): a cheaper SWAN_*MODEL override does not lower the estimate', () => {
  // consult-fable.mjs does not even read SWAN_FABLE_MODEL, so the real call would
  // still run Fable at $10/M while the gate priced it as flash.
  const r = runGate('SWAN_FABLE_MODEL=deepseek-v4-flash node scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
});

test('BYPASS (header-documented): a cheaper --model override does not lower the estimate', () => {
  assert.equal(runGate(`${FABLE} --model deepseek-v4-flash`).code, BLOCK);
});

test('BYPASS (header-documented): --max-tokens below the script default does not lower the estimate', () => {
  // consult-fable.mjs does not accept --max-tokens; the real call uses its own 16k.
  assert.equal(runGate(`${FABLE} --max-tokens 500`).code, BLOCK);
});

test('a LARGER --max-tokens RAISES a passing call into a breach', () => {
  // GLM 5.3 blocker 1: the old version of this test used FABLE, which already
  // breaches at the 16k default ($1.06 > $1.00). Deleting the --max-tokens maths
  // entirely left it green, so it could not detect any regression in the raise-only
  // clause. Sol is the shape that makes the raise legible: ~$0.31 at the default,
  // over cap once a bigger ceiling is declared.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(SOL).code, ALLOW, 'sol at the default must pass, or this proves nothing');
  assert.equal(runGate(`${SOL} --max-tokens 64000`).code, BLOCK, 'a declared ceiling must raise');
});

test('EQUALS FORM: --max-tokens=N is read like --max-tokens N', () => {
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(`${SOL} --max-tokens=64000`).code, BLOCK);
});

test('EQUALS FORM: --document=X still resolves the topic (GLM finding 3)', () => {
  // With the equals form unparsed, topic fell back to `untitled`, so the per-topic
  // cap silently never accumulated for that document. Seed `plan` and prove the
  // equals form lands on the same key the bare form does.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 }]);
  const r = runGate('node scripts/consult-sol.mjs --document=plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'the equals form must hit the same topic bucket');
  assert.match(r.stderr, /topic\s+plan/);
});

test('a longer flag with the same prefix is not misread', () => {
  // `--max` must not swallow `--max-tokens`.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md --max-tokens 64000';
  assert.equal(runGate(SOL).code, BLOCK);
});

test('an unpriced script is still not GUESSED at — it is refused instead', () => {
  // This test used to assert ALLOW, pinning the fail-open as contract. GLM 5.3
  // finding 4 named exactly that: the suite "proves and blesses" the hole.
  //
  // The half that was right survives: the gate must not invent a price, because a
  // wrong number silently UNDER-counts the caps. The conclusion was the bug — not
  // knowing the cost is a reason to stop and ask, never a reason to proceed.
  const r = runGate('node scripts/consult-newseat.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
  assert.doesNotMatch(r.stderr, /\$\d/, 'it must not print an invented number');
});

// ---------------------------------------------------------------------------
// 4. The deliberate ALLOW short-circuits
// ---------------------------------------------------------------------------

const PANEL = 'node scripts/consult-openrouter-panel.mjs';

test('--dry-run passes ONLY for the script that implements it', () => {
  // Behaviour change, deliberate. The gate used to honor --dry-run unconditionally.
  // Verified 2026-08-27: only consult-openrouter-panel.mjs implements the flag, so
  // appending it to a Fable call made the gate stand down while the script ignored
  // the unknown flag and billed in full — the same class as the documented
  // `--max-tokens 500` bypass, still live in a different branch.
  assert.equal(runGate(`${PANEL} --document plan.md --dry-run`).code, ALLOW, 'the panel really has a dry run');
  assert.equal(runGate(`${FABLE} --dry-run`).code, BLOCK, 'Fable has no dry run; the flag must not excuse it');
});

test('the panel without --confirm-spend passes — it refuses the live call itself', () => {
  // FIFTH vacuous test, found by mutation-testing my own suite rather than by
  // inspection: deleting the `PANEL_SCRIPTS && !--confirm-spend` short-circuit
  // produced ZERO reds. The old version used `--seats kimi,sol` (~$0.63), which is
  // under the cap — so it ALLOWed whether the short-circuit existed or not. Same
  // signature as the other four: the expected value is also the buggy output.
  //
  // EXPENSIVE seats make the branch the only thing that can produce ALLOW. Without
  // the short-circuit these price at ~$1.68 and block.
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md`).code, ALLOW,
    'no --confirm-spend means no live call, so the gate must stand aside');
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md --confirm-spend`).code, BLOCK,
    'and the SAME seats must block once the call is real — the control for the line above');
});

test('the panel WITH --confirm-spend is priced by the seats actually requested', () => {
  const cheap = runGate(`${PANEL} --seats glm,gemini --document plan.md --confirm-spend`);
  assert.equal(cheap.code, ALLOW, 'a free fan-out must not be flat-rated at the roster worst case');
});

test('the panel WITH --confirm-spend blocks when the requested seats are expensive', () => {
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md --confirm-spend`).code, BLOCK);
});

// ---------------------------------------------------------------------------
// 5. The cap boundary — cheaper seats pass, expensive ones do not
// ---------------------------------------------------------------------------

test('a cheaper override does NOT lower a breaching call below the cap', () => {
  // GLM 5.3 blocker 1 killed the previous version of this test: it used
  // consult-grok.mjs (which does not exist on main) and grok's DEFAULT price is
  // already under cap, so it passed identically whether override parsing worked,
  // was deleted, or was inverted. It proved nothing about raise-only pricing.
  //
  // Fable breaches at its default, so naming a cheap model must not rescue it.
  assert.equal(runGate(`SWAN_FABLE_MODEL=deepseek-v4-flash ${FABLE}`).code, BLOCK);
  assert.equal(runGate(`${FABLE} --model=deepseek-v4-flash`).code, BLOCK, 'equals form too');
});

test('an EXPENSIVE override RAISES a passing call into a breach', () => {
  // Caught by red-testing my own replacement for GLM's vacuous test — and it was
  // vacuous the same way: Fable blocks at its default, so a cheap override cannot
  // change the verdict and the assertion proves nothing about override parsing.
  //
  // Overrides only ever RAISE, so the single shape that can detect a regression is a
  // cheap script pushed over the cap by an expensive override. Sol is ~$0.31 alone;
  // priced as Fable it is ~$1.06 and must block.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(SOL).code, ALLOW, 'the control: sol alone must pass');
  assert.equal(runGate(`SWAN_SOL_MODEL=claude-fable-5 ${SOL}`).code, BLOCK, 'env override must raise');
  assert.equal(runGate(`${SOL} --model claude-fable-5`).code, BLOCK, 'flag override must raise');
  assert.equal(runGate(`${SOL} --model=claude-fable-5`).code, BLOCK, 'equals form must raise');
});

// --- seats priced 2026-08-27 from OpenRouter's per-endpoint API ---------------
//
// Before pricing these were KNOWN_UNGATED, and after the inversion an unpriced seat
// BLOCKS. So "it passes" is itself the proof the price landed — an unpriced codex
// call would be refused with "is not priced". The second test proves the number is
// actually used in arithmetic rather than merely present.

test('the newly priced seats are recognised, not refused as unclassified', () => {
  for (const s of [
    'consult-codex.mjs', 'consult-codex-via-openrouter.mjs', 'consult-codex-impl-review.mjs',
    'consult-codex-v1-1-review.mjs', 'consult-codex-v1-2-review.mjs',
    'consult-opus5.mjs', 'consult-hy3-design.mjs',
  ]) {
    const r = runGate(`node scripts/${s} --document plan.md`);
    assert.equal(r.code, ALLOW, `${s} should price under the per-call cap on a clean ledger`);
    assert.doesNotMatch(r.stderr, /is not priced/, `${s} must not fall through as unclassified`);
  }
});

test('a priced codex call now COUNTS toward the cumulative topic cap', () => {
  // The arithmetic proof. gpt-5.5 at [5.5, 33] estimates ~$0.67 for the standard
  // 26k-in/16k-out packet — comfortably under the $1.00 per-call cap, which is why
  // the test above passes. Seed the topic near its $3.00 ceiling and that same $0.67
  // must tip it over. If the price were absent or zero, this would not block.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.5', topic: 'plan', usd: 2.6 }]);
  const r = runGate('node scripts/consult-codex.mjs --document plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a priced seat must accumulate against the topic cap');
  assert.match(r.stderr, /spent on topic/);
});

test('every forge image probe is MATCHED and priced, not invisible', () => {
  // Rewritten after red-testing caught it vacuous. The first version asserted ALLOW
  // on a clean ledger — which is exactly what an UNMATCHED script also produces, so
  // it passed whether the `forge-` prefix existed or not. That is the third time this
  // session a test has certified the hole it was written to close; the tell is always
  // the same, an assertion whose expected value is the buggy behaviour's output too.
  //
  // Exhausting the day cap makes the two states distinguishable: a matched, priced
  // script REFUSES, an unmatched one still sails through.
  const today = new Date().toISOString();
  for (const s of [
    'forge-capture-fixtures.mjs', 'forge-i2i-influence.mjs',
    'forge-i2i-probe.mjs', 'forge-response-shape.mjs',
  ]) {
    const dir = seedLedger([{ ts: today, model: 'other', topic: 'other', usd: 4.9 }]);
    const r = runGate(`node scripts/${s}`, { ledger: dir });
    assert.equal(r.code, BLOCK, `${s} must be matched and priced, not waved through`);
    assert.doesNotMatch(r.stderr, /is not priced/, `${s} must be PRICED, not refused as unclassified`);
  }
});

test('a forge probe still passes on a clean ledger — priced, not banned', () => {
  // The control for the test above: proving it blocks when the budget is gone means
  // nothing unless it also proves it works when the budget is there.
  assert.equal(runGate('node scripts/forge-i2i-probe.mjs').code, ALLOW);
});

test('a forge run COUNTS toward the daily cap', () => {
  // Arithmetic proof that the image price is used, not merely present. These probes
  // take no --document, so they land on topic "untitled" — the DAY cap is the one
  // that has to catch them.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'other', topic: 'somethingelse', usd: 4.8 }]);
  const r = runGate('node scripts/forge-i2i-probe.mjs', { ledger: dir });
  assert.equal(r.code, BLOCK, 'an untitled-topic paid run must still hit the daily cap');
});

// --- the name must belong to the RUNNER, not to the string --------------------

test('BYPASS: a free-seat MENTION cannot launder a paid call', () => {
  // Live bypass, found by attacking scriptNameFrom and confirmed end-to-end through
  // the real gate before it was fixed. `scriptNameFrom` took the FIRST script name
  // anywhere in the command, so a `cat` of a free seat renamed the paid call that
  // followed it: matched (a Fable call really is there), resolved to consult-gemini,
  // hit FREE_ALLOWLIST, exit 0. Uncapped Fable behind a `cat`.
  const r = runGate('cat scripts/consult-gemini.mjs && node scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK, 'the seat name must come from the invocation, not the string');
});

test('BYPASS: a free-seat name in a redirect target cannot launder a paid call', () => {
  assert.equal(
    runGate('node scripts/consult-fable.mjs --document plan.md > out-consult-gemini.mjs.log').code,
    BLOCK,
  );
});

test('the converse holds: a paid name as an ARGUMENT does not tax a free call', () => {
  // The other direction matters just as much — resolving to the paid seat here would
  // price a free Gemini call as Fable and refuse honest work.
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document plan.md --seed scripts/consult-fable.mjs').code,
    ALLOW,
  );
});

// --- GLM 5.3 round-3 -----------------------------------------------------------

test('BLOCKER 4: two paid scripts in one line — the EXPENSIVE one is priced', () => {
  // Verified live at exit 0 before the fix. scriptNameFrom resolved the FIRST
  // invocation, the gate priced Kimi at ~$0.32, that fit inside the cap, and Fable's
  // ~$1.06 in the same Bash call was never priced, never asked about, never recorded.
  // This is the shape an agent batching consults writes with no intent to evade.
  assert.equal(
    runGate('node scripts/consult-kimi.mjs --document p.md && node scripts/consult-fable.mjs --document p.md').code,
    BLOCK,
  );
  // Order must not matter: expensive first is the same line.
  assert.equal(
    runGate('node scripts/consult-fable.mjs --document p.md && node scripts/consult-kimi.mjs --document p.md').code,
    BLOCK,
  );
});

test('a FREE seat in the line cannot become the one that gets priced', () => {
  // Free and frozen names are dropped before the max, so a free seat neither shelters
  // a paid one nor gets charged for standing next to it.
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document p.md && node scripts/consult-fable.mjs --document p.md').code,
    BLOCK,
  );
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document p.md && node scripts/consult-glm.mjs --document p.md').code,
    ALLOW,
  );
});

test('FINDING 1: node --check is a syntax check, not a run', () => {
  // The gate refused my own `node --check` of a consult file mid-repair. A guard that
  // blocks the verification step of its own fix teaches the operator to reach for
  // --no-verify, which is worse than the hole it is guarding.
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node --version').code, ALLOW);
  // And the carve-out must not become a bypass word:
  assert.equal(runGate('node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

// --- GLM 5.3-flash round-3: quoted data is not code, and N calls are not one ----

test('B1: an unknown seat cannot be priced by a caller-declared --model', () => {
  // Both seats found this (5.3 F3, flash B1) and it reproduced at exit 0. An unknown
  // seat has no default, so `--model deepseek-v4-flash` became its price — under the
  // cap, ALLOW — while the script bills at whatever it really calls and need not even
  // read the flag. The "believing a flag the target ignores" failure, reintroduced in
  // the one branch whose job is to refuse unknown seats.
  const r = runGate('node scripts/consult-mistral.mjs --document x.md --model deepseek-v4-flash');
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /is not priced/);
});

test('B2: a flag inside quoted DATA does not excuse a paid call', () => {
  const PANEL = 'node scripts/consult-openrouter-panel.mjs --confirm-spend --seats fable,sol,kimi --document x.md';
  assert.equal(runGate(PANEL).code, BLOCK, 'control: the expensive fan-out blocks');
  assert.equal(runGate(`${PANEL} --remit "does it support --dry-run"`).code, BLOCK,
    'a --dry-run MENTION in a remit must not stand the gate down on a live fan-out');
  assert.equal(runGate(`${PANEL} --dry-run`).code, ALLOW,
    'but a REAL --dry-run on the script that implements it still passes');
});

test('B2: a quoted value is still READ — masking must not break honest flags', () => {
  // maskQuotedData pads with spaces so offsets survive: the flag is FOUND in masked
  // text, its value READ from the original. Blanking outright would send every
  // quoted --document to topic `untitled`, which is the cap-never-accumulates bug
  // this file already fixed once.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 }]);
  const r = runGate('node scripts/consult-sol.mjs --document "plan.md"', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a QUOTED --document must still resolve to its topic');
  assert.match(r.stderr, /topic\s+plan/);
});

test('B4: N invocations of the SAME script are SUMMED, not priced once', () => {
  // Round 2 fixed "two DIFFERENT paid scripts" with MAX. Max defends against a cheap
  // seat sheltering an expensive one and does nothing about the same seat called
  // repeatedly: three codex calls at ~$0.67 priced as one, ~$2.01 of exposure inside
  // a $1.00 cap. Reproduced at exit 0 before the fix.
  const one = 'node scripts/consult-codex.mjs --document a.md';
  assert.equal(runGate(one).code, ALLOW, 'control: one codex call is under cap');
  assert.equal(runGate(`${one} && ${one} && ${one}`).code, BLOCK, 'three are not');
});

test('F4: the gateway LIBRARY is not hard-blocked as an unpriced seat', () => {
  // Basenaming its path yielded `consult.mjs`, in no allowlist and no price table, so
  // the gate blocked a verified no-op and told the operator to price a library.
  const r = runGate('node scripts/context-gateway/src/consult.mjs --seat fable');
  assert.equal(r.code, ALLOW);
  assert.doesNotMatch(r.stderr, /is not priced/);
});

test('F5: a seat name inside a quoted ARGUMENT is data, not an invocation', () => {
  // This one blocked my own verification probe while I was checking B2.
  assert.equal(runGate('node scripts/format-docs.mjs --text "see scripts/consult-fable.mjs"').code, ALLOW);
  // And the shape that must still be caught, because it really is a command:
  assert.equal(runGate('sh -c "node scripts/consult-fable.mjs --document plan.md"').code, BLOCK);
});

// --- round 4: the parser rewrite ------------------------------------------------
//
// Round 4 found SIX live bypasses, FIVE of them created by my own fixes in rounds 2
// and 3. Every one had the same root: a flat regex has no notion of WHERE a token
// sits. These pin the classes that stopped existing when the gate started parsing
// commands instead of pattern-matching them.

test('R4: a parse-only flag counts only in the RUNNER position', () => {
  // `--check` means "do not execute" between the runner and the file. The carve-out
  // tested it line-globally, so appending it anywhere stood the whole gate down —
  // the third recurrence of this file's own "honoring a flag the target ignores"
  // class, reintroduced by the fix for the --check cry-wolf.
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW, 'genuinely a syntax check');
  assert.equal(runGate(`${FABLE} --check`).code, BLOCK, 'trailing --check is an argument Fable ignores');
  assert.equal(runGate(`${FABLE} --version`).code, BLOCK, 'so is --version');
  assert.equal(runGate(`node --version && ${FABLE}`).code, BLOCK, 'and one in a DIFFERENT command is irrelevant');
});

test('R4: a real invocation inside quotes is found whatever precedes it', () => {
  // maskQuotedData kept a quoted span only if it STARTED with an interpreter, so
  // every ordinary prefix hid the call. `cd`, `exec`, `timeout` and friends are what
  // agent-written compound commands actually look like.
  assert.equal(runGate(`bash -c "cd /srv/app && ${FABLE}"`).code, BLOCK);
  assert.equal(runGate(`sh -c "exec ${FABLE}"`).code, BLOCK);
  assert.equal(runGate(`sh -c "timeout 600 ${FABLE}"`).code, BLOCK);
  assert.equal(runGate("bash -c 'cd scripts && node consult-fable.mjs --document x'").code, BLOCK);
});

test('R4: a quoted script PATH is still an invocation', () => {
  assert.equal(runGate('node "scripts/consult-fable.mjs" --document plan.md').code, BLOCK);
});

test('R4: direct shebang execution is gated', () => {
  // Previously listed as a KNOWN ungated shape because a regex keyed on the runner
  // token could not see it. Parsing gets it for free — argv[0] is the script.
  assert.equal(runGate('./scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('R4: a panel inside a compound line is priced at its fan-out, not $0', () => {
  // oneCallUsd returned 0 for the panel (no SCRIPT_MODEL entry) and priceOf returned
  // -1 so it could never win the max — a special case unreachable from the branch
  // that needed it. ~$1.68 of fan-out was riding on a ~$0.31 estimate.
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats fable,sol --document x --confirm-spend && node scripts/consult-kimi.mjs --document y').code,
    BLOCK,
  );
});

test('R4: an UNPRICED seat cannot ride beside a priced one', () => {
  // GLM 5.3 B2. `priceOf` sorted unknowns to -1 so they never won the max, and
  // `oneCallUsd` scored them 0 — so "an unknown seat falls through to the unpriced
  // BLOCK" was false for every compound line, which is the batching case the
  // summing fix existed for.
  assert.equal(runGate('node scripts/consult-newseat.mjs --document a').code, BLOCK, 'control: alone');
  const r = runGate('node scripts/consult-kimi.mjs --document a && node scripts/consult-newseat.mjs --document b');
  assert.equal(r.code, BLOCK, 'and beside a priced seat');
  assert.match(r.stderr, /not priced/);
});

test('R4: a --model RAISE survives into a compound line', () => {
  // GLM 5.3-flash round-4 finding 6, reproduced by probe before fixing:
  //
  //   ... --model claude-fable-5                        -> exit 2 BLOCK
  //   ... --model claude-fable-5 && <a cheap second call> -> exit 0 ALLOW
  //
  // `oneCallUsd` reads SCRIPT_MODEL defaults only, so the raise the gate had already
  // computed was discarded in exactly the multi-call lines the summing fix was built
  // for. Appending a CHEAP call LOWERED the estimate of the expensive one, which is
  // the opposite of what summing is for and reachable by anyone under budget
  // pressure who has noticed that the single-call form blocks.
  const RAISE = 'node scripts/consult-kimi.mjs --document a --model claude-fable-5';
  assert.equal(runGate(RAISE).code, BLOCK, 'control: the raise blocks on its own');
  assert.equal(runGate(`${RAISE} && node scripts/consult-hy3-design.mjs --document b`).code, BLOCK,
    'a cheap sibling must not launder an expensive raise');
  // And the cry-wolf direction stays closed: the same compound WITHOUT the raise is
  // ~$0.47 and must still pass, or the fix would just be "block more".
  assert.equal(
    runGate('node scripts/consult-kimi.mjs --document a && node scripts/consult-hy3-design.mjs --document b').code,
    ALLOW,
    'the unraised compound is under every cap and must still run',
  );
});

test('R5: six shell shapes that hid a paid seat from the parser', () => {
  // Round 5. The parser closed the whole class of POSITION bugs and then had gaps of
  // its own in shell GRAMMAR — which is the honest cost of replacing a matcher: the
  // failure mode moves from "cannot express the rule" to "has not modelled the
  // language yet". Every one below was reproduced at exit 0 before it was fixed.
  //
  // GLM 5.3 B1 — `>` and `<` were ordinary characters, so a redirect TARGET ending in
  //   .mjs landed in the script slot and the runner loop stopped there.
  // GLM 5.3 B4 — a transparent wrapper's own flags ended the strip, orphaning the
  //   command entirely: argv[0] became `-oL` and the seat vanished.
  // flash B1 — the only backslash rule was line-continuation, so `consult\-fable.mjs`
  //   (which POSIX executes as the real file) tokenised WITH the backslash and failed
  //   SEAT_NAME. One character, one free Fable call.
  // flash B1 (sibling) — a QUOTED argv[0] is legal shell and executes; treating it as
  //   data skipped a real invocation.
  // flash B2 — a flag VALUE ending in .js/.mjs terminated the script scan:
  //   `node --require ./prelude.js <seat>` made prelude the script and the seat its argv.
  const HIDDEN = [
    ['redirect before the script', 'node >out.mjs scripts/consult-fable.mjs --document plan.md'],
    ['fd-prefixed redirect first', '2>err.mjs node scripts/consult-fable.mjs --document plan.md'],
    ['wrapper with its own flags', 'stdbuf -oL node scripts/consult-fable.mjs --document plan.md'],
    ['backslash escape in the path', 'node scripts/consult\\-fable.mjs --document plan.md'],
    ['quoted argv[0], direct exec', '"./scripts/consult-fable.mjs" --document plan.md'],
    ['--require value ending in .js', 'node --require ./prelude.js scripts/consult-fable.mjs --document plan.md'],
    ['--import value ending in .mjs', 'node --import ./setup.mjs scripts/consult-fable.mjs --document plan.md'],
  ];
  for (const [name, cmd] of HIDDEN) {
    assert.equal(runGate(cmd).code, BLOCK, `${name}: a Fable call slipped past the gate`);
  }
});

test('R5: an ordinary BOOLEAN node flag does not hide the seat behind it', () => {
  // My own fix for flash B2 was itself a bypass, found by mutation-testing minutes
  // after it landed. The rule "a script-shaped token preceded by a non-parse-only flag
  // is that flag's value" assumes EVERY flag takes a value — and boolean flags are
  // ordinary, so `node --trace-warnings <seat>` ran free.
  //
  // Seventh time in this workstream a fix opened the next hole, and the shape never
  // changes: a heuristic about which token is "the script" has to be right about a
  // language it is not parsing. The gate does not need that answer — it needs to know
  // whether a paid seat appears anywhere the runner would load it.
  for (const flag of ['--trace-warnings', '--enable-source-maps', '--no-warnings', '--foo']) {
    assert.equal(runGate(`node ${flag} scripts/consult-fable.mjs --document x`).code, BLOCK,
      `${flag} hid the seat behind it`);
  }
  // And a seat named as a LOADER value still bills, so it must still be gated.
  assert.equal(runGate('node --require scripts/consult-fable.mjs other.mjs').code, BLOCK,
    'a seat loaded via --require is loaded, and bills');
});

test('R5: `node -c` is parse-only, like `node --check`', () => {
  // flash round-5 F1. NON_EXECUTING_FLAGS held `-c-check` — a token no shell produces,
  // the wreckage of an earlier edit — while `-c`, node's real shorthand, was missing.
  // So a syntax check was priced at $1.06 and BLOCKED. This file records refusing my
  // own `node --check` mid-repair as the cry-wolf failure worse than a hole; the same
  // workflow one keystroke over still did it.
  assert.equal(runGate('node -c scripts/consult-fable.mjs').code, ALLOW, '-c must not be a paid call');
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW, 'control: --check');
  // And the carve-out must not become a bypass: it only counts BEFORE the script.
  assert.equal(runGate('node scripts/consult-fable.mjs --document x -c').code, BLOCK,
    'a trailing -c is an argument the target ignores, not a parse-only run');
});

test('R5: a flag is read from the seat it is typed on, not the line', () => {
  // GLM 5.3 B2, both halves reproduced. Round 4 moved HOLDS to per-invocation and left
  // every FLAG line-global-first — half a migration, and the missing half is the half
  // that decides whether a fan-out is approved.
  //
  // Note the second case: this is flash's round-4 finding 6 SURVIVING ITS OWN FIX. The
  // fix read the override from the first seat's argv, and the regression test I wrote
  // for it happens to put the raise first. A test written from the same mental model
  // as the fix inherits the fix's blind spot.
  assert.equal(runGate(
    'node scripts/consult-gemini.mjs --document p && node scripts/consult-openrouter-panel.mjs --seats fable --document x --confirm-spend',
  ).code, BLOCK, 'confirm-spend on seat two: the panel short-circuit read gemini argv and allowed a live fan-out');

  assert.equal(runGate(
    'node scripts/consult-hy3-design.mjs --document b && node scripts/consult-kimi.mjs --document a --model claude-fable-5',
  ).code, BLOCK, 'a --model raise on seat two must be seen');

  // Both cry-wolf directions stay closed.
  assert.equal(runGate(
    'node scripts/consult-gemini.mjs --document p && node scripts/consult-openrouter-panel.mjs --seats fable --document x',
  ).code, ALLOW, 'without --confirm-spend the panel still refuses itself; gating early is cry-wolf');
  assert.equal(runGate(
    'node scripts/consult-kimi.mjs --document a && node scripts/consult-hy3-design.mjs --document b',
  ).code, ALLOW, 'an unraised cheap compound must still run');
});

test('R5: what the parser cannot attribute BLOCKS, and says so', () => {
  // The ONE THING both review seats named independently: every "I cannot model this
  // line" path used to mean ALLOW. All four were reproduced running a live Fable call
  // at exit 0. A parser whose ignorance spends money is fail-open, which is the one
  // property a spend guard may not have.
  const OPAQUE = [
    ['runner eval mode',   `node -e "import('./scripts/consult-fable.mjs')"`],
    ['unknown wrapper',    'xargs node scripts/consult-fable.mjs'],
    ['sudo',               'sudo node scripts/consult-fable.mjs --document x'],
    ['cmd /c',             'cmd /c node scripts/consult-fable.mjs --document x'],
  ];
  for (const [name, cmd] of OPAQUE) {
    const r = runGate(cmd);
    assert.equal(r.code, BLOCK, `${name}: an unattributable execution ran free`);
    assert.match(r.stderr, /cannot read/, `${name}: must refuse as unreadable`);
    assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE/,
      `${name}: no token — nobody knows the cost, so there is nothing to approve`);
  }

  // Deep nesting: resolvable for four levels, opaque beyond. Built here rather than
  // written as a literal, because shell escaping in a fixture is its own bug source —
  // and because nesting turned out to fail at depth TWO, not the five predicted, until
  // backslash escapes INSIDE double quotes were modelled.
  let deep = 'node scripts/consult-fable.mjs --document x';
  for (let i = 0; i < 6; i += 1) deep = `sh -c ${JSON.stringify(deep)}`;
  assert.equal(runGate(deep).code, BLOCK, 'depth overflow must not return "nothing here"');

  // AND THE REASON MATTERS, not just the verdict. Two levels of nesting must RESOLVE
  // to a priced Fable call, not fall back to "cannot read". Both outcomes block, so a
  // bare exit-code assertion cannot tell them apart — mutation-testing exposed that:
  // removing backslash handling inside double quotes produced ZERO reds, because the
  // unreadable-shell-body backstop caught what the parser had stopped understanding.
  //
  // Layered defence is good and this is the cost of it: a test that only checks the
  // verdict silently accepts the backstop doing the work of the mechanism. Nesting
  // actually failed at depth TWO before quoted escapes were modelled — not the five
  // the reviewers predicted — and only an assertion about WHY shows that.
  const two = `sh -c ${JSON.stringify(`sh -c ${JSON.stringify('node scripts/consult-fable.mjs --document plan.md')}`)}`;
  const r2 = runGate(two);
  assert.equal(r2.code, BLOCK);
  assert.match(r2.stderr, /worst case\s+\$1\.06/, 'two levels deep must still price as Fable');
  assert.doesNotMatch(r2.stderr, /cannot read/, 'the parser must UNDERSTAND this, not just refuse it');
});

test('R5: failing closed does not tax ordinary work', () => {
  // The cost of the inversion, pinned. My own guard blocked a `for f in …; do node
  // --test "$f"; done` loop within minutes of the rule landing, and then my own
  // `node -e` one-liner thirty seconds later. Both were fixed by narrowing — shell
  // KEYWORDS are structure, and an eval body that names no script cannot reach a seat.
  // The accepted price of failing closed is ONE false block and a small fix, not a
  // standing tax; these cases are what hold that line.
  const QUIET = [
    'for f in a.test.mjs b.test.mjs; do node --test "$f"; done',
    'while read l; do echo $l; done',
    'node -e "console.log(1)"',
    'if [ -f x ]; then echo yes; fi',
    'cat scripts/consult-fable.mjs',
    'grep -rn INVOCATION scripts/',
    'git grep "node scripts/consult-fable.mjs" docs',
  ];
  for (const cmd of QUIET) {
    assert.equal(runGate(cmd).code, ALLOW, `cry-wolf on ordinary work: ${cmd}`);
  }
});

test('R6: an INERT head that can execute is not inert for that command', () => {
  // GLM 5.3 round-6 B1, and it refuted the argument I made when INERT_HEADS was born.
  // "A missing entry costs one false block" is true only for OMISSIONS — it silently
  // assumes every entry is TRUE. A head listed as inert that CAN execute fails in the
  // money direction while wearing fail-closed clothes. All four reproduced at exit 0.
  const EXEC_HATCHES = [
    ['find -exec', 'find . -maxdepth 0 -exec node scripts/consult-fable.mjs --document plan.md \\;'],
    ['sed e',      `sed 'e node scripts/consult-fable.mjs' file.txt`],
    ['vim -c',     `vim -c '!node scripts/consult-fable.mjs' -c qa f`],
    ['start',      'start node scripts/consult-fable.mjs'],
  ];
  for (const [name, cmd] of EXEC_HATCHES) {
    assert.equal(runGate(cmd).code, BLOCK, `${name}: an inert head executed a seat`);
  }

  // And the same heads stay quiet doing their ordinary job — which is the whole reason
  // they are listed. Inertness is a property of the head's SEMANTICS, so the escape
  // hatch has to be per-head: "any visible runner blocks" would break all four below,
  // three of which are pinned elsewhere in this suite.
  for (const cmd of [
    'find . -name "*.mjs"',
    "sed -n '1,5p' scripts/consult-fable.mjs",
    'which node',
    'echo node scripts/consult-fable.mjs',
  ]) {
    assert.equal(runGate(cmd).code, ALLOW, `cry-wolf on ordinary use: ${cmd}`);
  }
});

test('R6: backtick command substitution runs a seat, and is gated', () => {
  // GLM 5.3 round-6 B2. The backtick was an ordinary character, so the seat token
  // ended with one and failed the extension test while the runner token started with
  // one and failed RUNNERS — and `echo` suppressed the unknown-head branch on top.
  //
  // The round-3 sweep listed "command substitution" among 39 shapes; the suite pinned
  // only the `$()` spelling, which worked by accident of the paren split. That is the
  // `cmd /c` story verbatim — a verified shape living in prose, lost in a rewrite.
  assert.equal(runGate('echo `node scripts/consult-fable.mjs --document plan.md`').code, BLOCK);
  assert.equal(runGate('OUT=`node scripts/consult-fable.mjs --document plan.md`').code, BLOCK);
  // Live inside DOUBLE quotes, because bash runs it there.
  assert.equal(runGate('echo "result: `node scripts/consult-fable.mjs --document plan.md`"').code, BLOCK);
  // Literal inside SINGLE quotes, per POSIX — that is the spelling for prose.
  assert.equal(runGate(`echo 'see \`node scripts/consult-fable.mjs\` in the docs'`).code, ALLOW);
  // The spelling that already worked must keep working.
  assert.equal(runGate('echo $(node scripts/consult-fable.mjs --document plan.md)').code, BLOCK);
});

test('R6: a runner fed a program on STDIN is gated', () => {
  // GLM 5.3 round-6 B3. `node --input-type=module < <seat>` had the redirect TARGET
  // eaten and the signal discarded, so the runner had no script and nothing was
  // recorded — while node evaluates redirected stdin as a program and bills. The
  // parser had the information and threw it away.
  assert.equal(
    runGate('node --input-type=module < scripts/consult-fable.mjs --document plan.md').code,
    BLOCK, 'a redirected program is a program');
  assert.equal(
    runGate('cat scripts/consult-fable.mjs | node --input-type=module --document plan.md').code,
    BLOCK, 'and so is a piped one');

  // Ordinary redirects and pipes that feed a runner NOTHING must stay quiet.
  assert.equal(runGate('node build.mjs < input.txt').code, ALLOW, 'data on stdin is not a program');
  assert.equal(runGate('cat notes.md | grep node').code, ALLOW);
});

test('R6: a PANEL reserves under the seat ids its fan-out records', () => {
  // GLM 5.3 round-6 B4 — and the sentence above was written as a COMMENT in round 5
  // with `model: 'panel'` on the very next line. Every panel hold went under a literal
  // string no writer ever produces, so the per-seat releases matched nothing, were
  // discarded as orphans, and the whole fan-out sat as ghost spend for the full TTL.
  //
  // THIRD false comment of this workstream, on the money path, in the round after I
  // confessed the pattern twice. No test could have caught it: nothing read reservation
  // rows for a panel line, and the settle-parity pairs derive from providers.mjs, which
  // cannot contain 'panel'. This test is that missing reader.
  const { dir } = runGate('node scripts/consult-openrouter-panel.mjs --seats kimi,grok --document x --confirm-spend');
  const rows = readFileSync(join(dir, 'reservations.jsonl'), 'utf-8')
    .trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'reserve');
  assert.ok(rows.length >= 2, 'a fan-out holds per seat, not as one lump');
  assert.ok(!rows.some((r) => r.model === 'panel'),
    "no hold may use the literal 'panel' — nothing records it, so it can never settle");
  assert.deepEqual(rows.map((r) => r.model).sort(), ['grok-4.6', 'kimi-k3']);
});

test('R9: the estimate prices the REAL document, and only ever upward', () => {
  // Round 9, solo. The comment being replaced said "input size is unknown at gate
  // time" — a false claim about the world dressed as a limitation. `--document` names
  // a path, the path is on disk, and the gate runs BEFORE the call. Every call was
  // priced at a flat 26,000 input tokens.
  //
  // Measured against packets this workstream actually sent: the round-7 packet is
  // 257 KB, roughly 66k tokens, counted as 26k. For Sol that is $0.13 counted against
  // ~$0.33 real — under by $0.20 PER CALL.
  //
  // The ledger stayed accurate (the writer records the provider's real cost), so this
  // never corrupted history. It corrupted everything BEFORE the call: the hold is too
  // small, the refusal fires late, and the number Sean is shown when asked to approve
  // is too low. The two-ask protocol exists to put a REAL number in front of him.
  const big = join(sandbox, 'big-packet.md');
  writeFileSync(big, 'x'.repeat(400_000), 'utf-8'); // ~100k tokens at 4 bytes/token
  const small = join(sandbox, 'small.md');
  writeFileSync(small, 'x'.repeat(1_000), 'utf-8');

  // Forward slashes deliberately. A raw Windows path in a bash command line is
  // mangled by BASH — `\U` is an escape — and the parser models that correctly, so
  // the first version of this test failed on its own fixture rather than on the code.
  // Real callers quote such paths or use forward slashes, and node accepts both.
  const slash = (p) => p.split('\\').join('/');
  const priceOf = (doc) => {
    const r = runGate(`node scripts/consult-fable.mjs --document ${slash(doc)}`);
    assert.equal(r.code, BLOCK, 'control: Fable always breaches the per-call cap');
    return Number((r.stderr.match(/worst case\s+\$([\d.]+)/) || [])[1]);
  };

  const cheap = priceOf(small);
  const dear = priceOf(big);
  assert.ok(dear > cheap, `a 400 KB document must price above a 1 KB one (${dear} vs ${cheap})`);

  // FLOOR, NEVER A DISCOUNT — this is the half that stops the measurement becoming a
  // bypass. A small, absent, or unreadable document falls back to the old assumption,
  // so pointing `--document` at nothing cannot buy a cheaper estimate.
  assert.equal(cheap, 1.06, 'a small document keeps the old flat floor');
  assert.equal(priceOf('does-not-exist-anywhere.md'), 1.06, 'an ABSENT document must not discount');
  assert.equal(priceOf('/nonexistent/absolute/path.md'), 1.06, 'nor an absent absolute path');
});

test('R5: SWAN_* env vars are read from the PARSE, not from raw text', () => {
  // GLM 5.3 round-5 F8 — the last position-blind readers in the gate. Three
  // `cmd.match(/SWAN_…/)` scans survived the parser rewrite, so a value inside a
  // quoted argument was read as if it were a shell assignment.
  //
  // The approval token is the one that matters most: it BUYS a refused call, and
  // reading it out of raw text meant a token appearing anywhere on the line counted
  // as presented. The protocol is "re-run the command with the token in front of it",
  // and that is now what is actually required.
  const first = runGate(FABLE);
  assert.equal(first.code, BLOCK, 'control: a bare Fable call is refused');
  const token = tokenFrom(first.dir);
  assert.ok(token, 'control: a token was minted');

  // The token as DATA inside an argument must not redeem.
  assert.equal(
    runGate(`node scripts/consult-fable.mjs --document "notes SWAN_SPEND_APPROVE=${token}"`,
      { ledger: first.dir }).code,
    BLOCK,
    'a token quoted inside an argument is data, and must not buy the call',
  );

  // As a real leading assignment, it does.
  assert.equal(
    runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: first.dir }).code,
    ALLOW,
    'presented the way the protocol says, the token redeems',
  );

  // Same for the model override: as data it must not re-price.
  const asData = runGate('node scripts/consult-kimi.mjs --document "SWAN_KIMI_MODEL=claude-fable-5"');
  assert.equal(asData.code, ALLOW, 'a model name quoted inside an argument must not re-price the call');
});

test('R5: each seat holds under its OWN topic', () => {
  // flash round-5 F2, reproduced: both holds on a two-document line were keyed to the
  // FIRST seat's topic. A hold under the wrong topic can never be settled — the writer
  // releases under the topic it actually ran on, that release matches nothing and is
  // discarded, and the hold sits for the full TTL as ghost spend against a workstream
  // it never touched.
  const { dir } = runGate('node scripts/consult-kimi.mjs --document a.md && node scripts/consult-sol.mjs --document b.md');
  const rows = readFileSync(join(dir, 'reservations.jsonl'), 'utf-8')
    .trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'reserve');
  assert.equal(rows.length, 2, 'one hold per invocation');
  assert.deepEqual(rows.map((r) => r.topic).sort(), ['a', 'b'],
    'each hold carries its own seat’s topic, or it can never be settled');
  assert.deepEqual(rows.map((r) => r.model).sort(), ['gpt-5.6-sol', 'kimi-k3']);
});

test('R5: a cap on a NON-FIRST topic is still enforced', () => {
  // GLM 5.3 round-5 F5. `--document` came from the first invocation, so the whole line
  // was charged to topic A and topic B's cap was never consulted — the per-topic budget
  // is THE primary control by Sean's own framing, and it was voidable by any seat that
  // was not first.
  const seeded = seedLedger([
    { ts: `${new Date().toISOString().slice(0, 10)}T10:00:00.000Z`, model: 'kimi-k3', topic: 'plan', usd: 2.90 },
  ]);
  const r = runGate(
    'node scripts/consult-hy3-design.mjs --document fresh.md && node scripts/consult-kimi.mjs --document plan.md',
    { ledger: seeded },
  );
  assert.equal(r.code, BLOCK, 'the second seat’s topic is over its cap and must block');
  assert.match(r.stderr, /topic "plan"/, 'and the refusal must name the topic that breached');
});

test('R5: an EMPTY --seats is not a $0 fan-out', () => {
  // flash round-5 F1, reproduced at exit 0: `''.split(',').filter(Boolean)` yields [],
  // which priced a CONFIRMED fan-out at $0.00. Empty is not none.
  //
  // MY FIRST ASSERTION HERE WAS WRONG, and the code was right. I asserted a bare BLOCK
  // — but the default roster prices at roughly $0.50, which is honestly under the
  // $1.00 cap, so ALLOW is correct. Second time this batch I demanded a refusal the
  // caps had no reason to give ($0.90 + $0.90 against a $3.00 topic cap was the
  // first). The lesson is the same both times: assert the thing that CHANGED, not a
  // verdict that happens to differ.
  //
  // What changed is whether the fan-out is COUNTED. Seeding the day near its cap makes
  // that observable: at the real ~$0.50 the line breaches and blocks; at the old $0.00
  // it would sail through.
  const today = new Date().toISOString().slice(0, 10);
  const seeded = seedLedger([
    { ts: `${today}T10:00:00.000Z`, model: 'kimi-k3', topic: 'other', usd: 4.70 },
  ]);
  const r = runGate(
    'node scripts/consult-openrouter-panel.mjs --seats "" --document x --confirm-spend',
    { ledger: seeded },
  );
  assert.equal(r.code, BLOCK, 'a blank seat list must be priced at the default roster, not at zero');
  assert.match(r.stderr, /today would reach/, 'and it must breach the DAY cap, which is what counting it means');

  // Control: with room to spare, the same command runs. The fix must count the
  // fan-out, not forbid it.
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats "" --document x --confirm-spend').code,
    ALLOW,
    'a ~$0.50 default roster is affordable and must not be refused',
  );

  // A NON-EMPTY value that yields no seats — `--seats ","` — is the case that
  // discriminates the fix from the bug. Mutation-testing found this gap: reverting to
  // the old `seatsArg ? … : DEFAULT_SEATS` produced ZERO reds, because an empty STRING
  // is falsy and took the default either way. Only a truthy-but-seatless value
  // separates them, and nothing covered it.
  const seeded2 = seedLedger([
    { ts: `${today}T10:00:00.000Z`, model: 'kimi-k3', topic: 'other', usd: 4.70 },
  ]);
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats "," --document x --confirm-spend',
      { ledger: seeded2 }).code,
    BLOCK,
    'a seat list that parses to nothing must price at the default roster, not at zero',
  );
});

test('a genuinely cheap seat passes — the gate is not just "block everything"', () => {
  // The honest positive control. Sol at its default is ~$0.31, under the $1.00 cap.
  // Without this, every BLOCK assertion above would also pass on a gate that
  // refused unconditionally.
  assert.equal(runGate('node scripts/consult-sol.mjs --document plan.md').code, ALLOW);
});

test('a bare Fable call breaches the per-call cap and blocks', () => {
  const r = runGate(FABLE);
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /SPEND GUARD — BLOCKED/);
});

test('the refusal names the model, the number and the cap', () => {
  const r = runGate(FABLE);
  assert.match(r.stderr, /claude-fable-5/);
  assert.match(r.stderr, /worst case/);
  assert.match(r.stderr, /cap per call/);
});

test('CUMULATIVE: prior topic spend can block a call that would otherwise pass', () => {
  // The whole reason the ledger exists — four reasonable calls, not one outrageous one.
  const today = new Date().toISOString();
  const dir = seedLedger([
    { ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 },
  ]);
  const r = runGate('node scripts/consult-sol.mjs --document plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a small call on a nearly-exhausted topic must still block');
  assert.match(r.stderr, /spent on topic/);
});

// ---------------------------------------------------------------------------
// 6. The two-ask contract — an agent must not be able to self-approve
// ---------------------------------------------------------------------------

test('the first ask mints a token and refuses', () => {
  const r = runGate(FABLE);
  assert.equal(r.code, BLOCK);
  assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE=[a-f0-9]{12}/,
    'the token must never appear in output the agent reads (GLM 5.3 blocker 2)');
  assert.match(r.stderr, /PENDING-SPEND-APPROVAL/, 'it must say where Sean can find it');
  assert.match(r.stderr, /FIRST of two asks/);
  assert.match(tokenFrom(r.dir) || '', /^[a-f0-9]{12}$/, 'and the note must actually hold one');
});

test('an INVENTED approval token is refused', () => {
  const r = runGate(`SWAN_SPEND_APPROVE=deadbeef1234 ${FABLE}`);
  assert.equal(r.code, BLOCK, 'a guessable token would make the two-ask rule theatre');
});

test('the minted token, presented on the SAME call, is accepted', () => {
  const dir = mkdtempSync(join(sandbox, 'twoask-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = tokenFrom(dir);
  assert.ok(token, 'first ask must mint a token');
  const second = runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: dir });
  assert.equal(second.code, ALLOW);
});

test('the token is SINGLE USE — replaying it is refused', () => {
  const dir = mkdtempSync(join(sandbox, 'replay-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = tokenFrom(dir);
  const cmd = `SWAN_SPEND_APPROVE=${token} ${FABLE}`;
  assert.equal(runGate(cmd, { ledger: dir }).code, ALLOW);
  assert.equal(runGate(cmd, { ledger: dir }).code, BLOCK, 'a replayable token is an unlimited pass');
});

test('a token minted for one call cannot be lifted onto a different one', () => {
  // The ledger MUST be seeded. On a clean one, sol costs ~$0.31 and passes, so no
  // token is minted and the test skips itself while still reporting green. An
  // earlier draft did exactly that: `if (!token) return`. A test that can silently
  // decline to test anything is worse than no test, because it reads as coverage.
  const today = new Date().toISOString();
  const dir = seedLedger([
    { ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 },
  ]);
  const first = runGate('node scripts/consult-sol.mjs --document plan.md', { ledger: dir });
  assert.equal(first.code, BLOCK, 'the seed must force a breach so a token is actually minted');
  const token = tokenFrom(dir);
  assert.ok(token, 'a refused call must mint a token');

  // Same ledger, same topic — but a different model and a different cost, so the
  // token's model+topic+cost key does not match.
  const r = runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: dir });
  assert.equal(r.code, BLOCK, 'tokens bind to model+topic+cost');
});

// ---------------------------------------------------------------------------
// 7. Isolation self-check — if this fails, every result above is suspect
// ---------------------------------------------------------------------------

test('SWAN_SPEND_DIR really redirects the ledger — the real one is untouched', async () => {
  const { SPEND_DIR } = await import(
    `file://${join(HERE, '..', 'lib', 'spend-ledger.mjs').replaceAll('\\', '/')}?probe=1`
  );
  // This process has no SWAN_SPEND_DIR set, so the module must resolve to the repo path.
  assert.ok(!process.env.SWAN_SPEND_DIR, 'the test runner itself must not set the override');
  assert.match(SPEND_DIR.replaceAll('\\', '/'), /\.ai-workflow\/spend$/);
  // And a spawned gate with the override must write somewhere else entirely.
  const r = runGate(FABLE);
  assert.notEqual(r.dir, SPEND_DIR);
});
