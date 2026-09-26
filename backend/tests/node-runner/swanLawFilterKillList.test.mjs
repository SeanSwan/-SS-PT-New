/**
 * swanLawFilterKillList.test.mjs — LAW 3's SECOND condition: the kill-list is CARRIED.
 *
 * SPLIT FROM `swanLawFilter.test.mjs`, which reached 321 lines when this guard landed —
 * over Rule 4's 300. The seam is a real MECHANISM boundary, not a line number: the parent
 * suite tests the law filter's MATCHERS (which family blocks which words, and every
 * hostile-review regression around evasion); this suite tests one INVARIANT about the
 * `negative` slot itself — that it still carries the list at all.
 *
 * WHY THE INVARIANT NEEDED A GUARD. `resolveSlots` applies `brief.slotOverrides` LAST,
 * after the kill-list is set, so an override can DELETE it — and LAW 3's loop scans
 * positive slots only, so nothing noticed. Measured before the fix: a compile with
 * `slotOverrides: { negative: '' }` returned OK with all six lawChecks green, INCLUDING
 * `LAW3-kill-list`. A law check reporting PASS on a deleted law is worse than no check at
 * all, because it reports safety.
 *
 * THE GUARD IS KEYED ON PRESENCE, NOT TRUTHINESS. Three callers pass a partial map with no
 * `negative` key at all — `scripts/forge.mjs` in production, the corpus test, and the
 * parent suite's own `clean` fixture — and an absent key is a partial call, not a verdict.
 * Two landed hostile-review regressions also depend on a PARTIAL negative passing; both
 * are pinned below, so tightening this guard is a decision rather than a refactor.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLaws, assertLawful, KILL_LIST, KILL_LIST_TEXT, KILL_LIST_PROSE } from '../../../shared/swanLawFilter.mjs';
import { resolveSlots } from '../../../shared/swanPromptCompiler.mjs';

test('LAW 3: a PRESENT but EMPTY negative slot is a deleted kill-list, not a green', () => {
  const r = applyLaws({ intent: 'hero', subject: 'a frozen lake', negative: '' });
  assert.equal(r.passed, false);
  assert.equal(r.violations[0].law, 'LAW3-kill-list');
  assert.equal(r.violations[0].slot, 'negative');
  // And the check itself must go RED — a violation no check reports would be
  // worse than the hole, because the result fails with every check green.
  assert.equal(r.checks.find((c) => c.law === 'LAW3-kill-list').passed, false);
});

test('LAW 3: a negative slot naming NO kill-list family is refused', () => {
  // Non-empty is not the invariant. "watermark only" is a non-empty string that
  // carries none of the six families — the kill-list is gone either way.
  assert.equal(applyLaws({ intent: 'hero', negative: 'watermark only' }).passed, false);
  assert.equal(applyLaws({ intent: 'hero', negative: 'no text, no watermarks' }).passed, false);
});

test('LAW 3: a non-string negative slot carries no list, whatever it holds', () => {
  for (const bad of [null, undefined, 0, false]) {
    assert.equal(applyLaws({ intent: 'hero', negative: bad }).passed, false, `should block: ${String(bad)}`);
  }
});

test('LAW 3: an ABSENT negative slot is a partial call, not a verdict', () => {
  // The contract three real callers depend on. `forge.mjs` calls
  // `assertLawful({ subject: change }, [])`; the corpus calls
  // `applyLaws({ [slot]: text })`; the parent suite's `clean` fixture has no `negative` key.
  assert.equal(applyLaws({ subject: 'a frozen lake' }).passed, true);
  assert.equal(applyLaws({ subject: 'a frozen lake', intent: 'hero' }).passed, true);
  assert.equal(assertLawful({ subject: 'a frozen lake' }, []).passed, true);
});

test('LAW 3: a PARTIAL negative slot still passes — pinned so tightening it is deliberate', () => {
  // Both of these are landed hostile-review regressions in the PARENT suite. If a future
  // change demands the FULL canonical list, this test is where the author finds out that
  // it is a decision rather than a refactor.
  assert.equal(applyLaws({
    intent: 'hero',
    negative: 'iridescent gradient, lens flare, causeless particles, glassmorphism, literal creature form',
  }).passed, true);
  assert.equal(applyLaws({
    intent: 'hero',
    negative: 'iridescent gradient, lens flare, literal creature form',
  }).passed, true);
});

test('LAW 3: the carried kill-list and the matcher families share ONE definition', () => {
  // The prose lived in `swanPromptCompiler.mjs` and the matchers lived in the law
  // module — two representations of one law, and they HAD drifted: only four of
  // the six families are matched by the prose as written. Harmless while nothing
  // checked the prose; load-bearing the moment LAW 3 asserted it is carried.
  assert.ok(KILL_LIST_TEXT.length >= 6, 'the canonical list names at least the six families');
  assert.equal(KILL_LIST_PROSE, KILL_LIST_TEXT.join(', '), 'the prose is DERIVED, never re-typed');
  assert.match(resolveSlots({ text: 'a lake' }).negative, /iridescent gradient/);
  assert.match(resolveSlots({ text: 'a lake' }).negative, /literal creature form/);
  assert.equal(resolveSlots({ text: 'a lake' }).negative, KILL_LIST_PROSE);
});

test('the canonical prose carries at least one family the guard can find', () => {
  // The guard is only meaningful if the DEFAULT slot satisfies it. If the prose
  // were ever edited to name none of the families, every lawful compile would
  // start failing — so pin the property that makes the guard safe.
  const prose = resolveSlots({ text: 'a lake' }).negative;
  assert.ok(KILL_LIST.some((item) => item.re.test(prose)),
    `the canonical negative prose matches no KILL_LIST family: "${prose}"`);
});
