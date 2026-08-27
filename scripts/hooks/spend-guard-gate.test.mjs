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

test('widening the runner list did NOT widen into false positives', () => {
  assert.equal(runGate('nodejs scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node-foo scripts/consult-fable.mjs').code, ALLOW);
});

test('ACCEPTED false positive: a mention that INCLUDES the runner word is gated', () => {
  // GLM 5.3 finding 2, and it is real: `git grep "node scripts/consult-fable.mjs"`
  // or a heredoc writing documentation that quotes the example command now trips
  // the gate, because quoted spans are no longer opaque to it.
  //
  // Kept deliberately rather than softened. This guard fails OPEN, so a miss costs
  // real money silently while a false positive costs one retry with the text in a
  // file. For a money gate that is the correct direction to err, and narrowing it
  // would reopen the SWA-218 miss. Pinned as a test so the behaviour is a decision
  // on the record, not an accident someone later "fixes" without knowing the trade.
  const r = runGate('git grep -n "node scripts/consult-fable.mjs" docs');
  assert.equal(r.code, BLOCK, 'if this ever ALLOWs, the quoted-span fix has been undone');
});

test('SWA-218: a word merely ENDING in node is not the node binary', () => {
  // The one false positive the negated class must still avoid.
  assert.equal(runGate('mynode scripts/consult-fable.mjs --document plan.md').code, ALLOW);
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
  // Now keyed on the REAL panel. The old condition named consult-panel.mjs, which
  // does not exist on main, so this branch was dead in both directions.
  assert.equal(runGate(`${PANEL} --seats kimi,sol --document plan.md`).code, ALLOW);
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
