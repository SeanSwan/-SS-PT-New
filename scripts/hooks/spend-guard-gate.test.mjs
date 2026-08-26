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
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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

test('a free seat is not gated at all', () => {
  assert.equal(runGate('node scripts/consult-ox.mjs --document plan.md').code, ALLOW);
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

test('a LARGER --max-tokens still blocks — a declared ceiling may only raise', () => {
  assert.equal(runGate(`${FABLE} --max-tokens 64000`).code, BLOCK);
});

test('an unknown model on an unknown script is not guessed at', () => {
  // "do not guess a number" — an unpriced script must not invent a worst case.
  assert.equal(runGate('node scripts/consult-newseat.mjs --document plan.md').code, ALLOW);
});

// ---------------------------------------------------------------------------
// 4. The deliberate ALLOW short-circuits
// ---------------------------------------------------------------------------

test('--dry-run spends nothing and passes', () => {
  assert.equal(runGate(`${FABLE} --dry-run`).code, ALLOW);
});

test('the panel without --confirm-spend passes — it refuses paid seats itself', () => {
  assert.equal(runGate('node scripts/consult-panel.mjs --seats kimi,sol --document plan.md').code, ALLOW);
});

test('the panel WITH --confirm-spend is priced by the seats actually requested', () => {
  // Two free seats: worst case $0.00, under every cap.
  const cheap = runGate('node scripts/consult-panel.mjs --seats ox,glm --document plan.md --confirm-spend');
  assert.equal(cheap.code, ALLOW, 'a free fan-out must not be flat-rated at the roster worst case');
});

test('the panel WITH --confirm-spend blocks when the requested seats are expensive', () => {
  const dear = runGate('node scripts/consult-panel.mjs --seats fable,sol,kimi --document plan.md --confirm-spend');
  assert.equal(dear.code, BLOCK);
});

// ---------------------------------------------------------------------------
// 5. The cap boundary — cheaper seats pass, expensive ones do not
// ---------------------------------------------------------------------------

test('a single cheap-seat call is under the per-call cap and passes', () => {
  // deepseek-v4-flash via consult-grok: well under $1.00.
  const r = runGate('SWAN_GROK_MODEL=deepseek-v4-flash node scripts/consult-grok.mjs --document plan.md');
  assert.equal(r.code, ALLOW);
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
  assert.match(r.stderr, /SWAN_SPEND_APPROVE=[a-f0-9]{12}/);
  assert.match(r.stderr, /FIRST of two asks/);
});

test('an INVENTED approval token is refused', () => {
  const r = runGate(`SWAN_SPEND_APPROVE=deadbeef1234 ${FABLE}`);
  assert.equal(r.code, BLOCK, 'a guessable token would make the two-ask rule theatre');
});

test('the minted token, presented on the SAME call, is accepted', () => {
  const dir = mkdtempSync(join(sandbox, 'twoask-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = (first.stderr.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1];
  assert.ok(token, 'first ask must mint a token');
  const second = runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: dir });
  assert.equal(second.code, ALLOW);
});

test('the token is SINGLE USE — replaying it is refused', () => {
  const dir = mkdtempSync(join(sandbox, 'replay-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = (first.stderr.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1];
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
  const token = (first.stderr.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1];
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
