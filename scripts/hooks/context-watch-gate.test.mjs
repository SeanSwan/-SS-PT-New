/**
 * context-watch-gate.test.mjs — coverage for the Rule 83 context-watch Stop gate.
 * Run: node scripts/hooks/context-watch-gate.test.mjs
 *
 * The defeat conditions this asserts (not the implementation's letter):
 *  - a 1M session must NOT be told it is at 174% (the window-misdetection spam bug)
 *  - a genuinely full session MUST be caught
 *  - a broken/absent transcript must FAIL OPEN, never wedge the session
 *  - the gate must escalate, not nag
 */
import assert from 'node:assert/strict';
import { currentUsage, inferWindow, decide, reasonFor } from './context-watch-gate.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const usageLine = (input, cacheCreate, cacheRead) => JSON.stringify({
  type: 'assistant',
  message: { usage: { input_tokens: input, cache_creation_input_tokens: cacheCreate, cache_read_input_tokens: cacheRead } },
});

// ---- currentUsage -------------------------------------------------------
t('sums prompt + both cache legs', () => {
  assert.equal(currentUsage(usageLine(2, 1627, 345953)), 347582);
});

t('takes the LAST usage line, not the first', () => {
  const tx = [usageLine(1, 0, 1000), usageLine(1, 0, 90000)].join('\n');
  assert.equal(currentUsage(tx), 90001);
});

t('skips malformed lines instead of throwing', () => {
  const tx = ['{"usage": NOT JSON', usageLine(1, 0, 5000)].join('\n');
  assert.equal(currentUsage(tx), 5001);
});

t('returns null on empty/!usage transcript (fail-open signal)', () => {
  assert.equal(currentUsage(''), null);
  assert.equal(currentUsage('{"type":"user"}'), null);
  assert.equal(currentUsage(null), null);
});

// ---- inferWindow --------------------------------------------------------
t('small session infers the 200k window', () => {
  assert.equal(inferWindow(50_000, 0), 200_000);
});

t('REGRESSION: a 348k session must infer 1M, never 200k', () => {
  // Defeat condition: if this returns 200k, the gate reports 174% and blocks every turn.
  assert.equal(inferWindow(348_847, 0), 1_000_000);
});

t('explicit override wins', () => {
  assert.equal(inferWindow(50_000, 500_000), 500_000);
});

// ---- decide -------------------------------------------------------------
t('below threshold allows', () => {
  assert.equal(decide({ used: 100_000, window: 1_000_000 }), null);
});

t('REGRESSION: 348k of a 1M window is ~35% and must ALLOW', () => {
  assert.equal(decide({ used: 348_847, window: inferWindow(348_847, 0) }), null);
});

t('70% blocks at advise tier', () => {
  const v = decide({ used: 700_000, window: 1_000_000 });
  assert.ok(v, 'expected a block verdict');
  assert.equal(v.tier, 'advise');
  assert.equal(v.pct, 70);
});

t('85%+ blocks at urgent tier', () => {
  assert.equal(decide({ used: 900_000, window: 1_000_000 }).tier, 'urgent');
});

t('escalates rather than nagging: advise already fired -> allow', () => {
  assert.equal(decide({ used: 700_000, window: 1_000_000, alreadyFired: ['advise'] }), null);
});

t('but urgent still fires after advise already fired', () => {
  assert.equal(decide({ used: 900_000, window: 1_000_000, alreadyFired: ['advise'] }).tier, 'urgent');
});

t('missing usage never blocks (fail-open)', () => {
  assert.equal(decide({ used: null, window: 1_000_000 }), null);
});

// ---- reason -------------------------------------------------------------
t('reason names the skill and forbids abandoning work mid-edit', () => {
  const r = reasonFor({ tier: 'advise', pct: 70, used: 700_000, window: 1_000_000 });
  assert.match(r, /handoff/);
  assert.match(r, /WHOLE\s+conversation/);
  assert.match(r, /park the slice in flight/);
});

console.log(`\n${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
