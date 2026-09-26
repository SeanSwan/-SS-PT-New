/**
 * a5-authority.test.mjs — `T-P-01`'s AUTHORITY half (`AC5.4`).
 *
 * THE REQUIREMENT, VERBATIM: *"no actor enables a REFUSED lane or spec mode"*.
 *
 * WHY THESE TESTS TRY RATHER THAN READ. The cheap version of this suite asserts that the
 * pane has no enable button and that the matrix's `enable-spec` column contains no `yes`.
 * Both are true and both prove nothing about the operation: a control could be added to the
 * MCP server tomorrow, and a matrix cell is a string. So the tests below call
 * `attemptEnable()` — the operation the requirement forbids — once for EVERY actor against
 * EVERY target, and assert the resulting `enabled` list is empty. The claim under test is
 * produced by running the thing, not by reading a table.
 *
 * AND THE REFUSAL IS UNIFORM. Sean is refused too. That is the design: activation requires
 * signed approval OUTSIDE this surface, so a console that could switch a gated lane on would
 * be a console that can mint a claim into canon without review.
 *
 * THE LAST TEST CALLS THE LANES THEMSELVES. `attemptEnable()` is reached from no shipped
 * surface — it is the operation `AC5.4` forbids, implemented so the refusal can be produced
 * rather than read. That leaves a fair question: if a caller bypassed this module, would
 * anything stop it? The answer is measured, not asserted — the three REFUSED lanes are
 * imported and invoked, and the set that was actually reached is named in the test. See the
 * note on the fence's backing there.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  ACTORS, ACTIONS, AUTHORITY_MATRIX, authorityFor, attemptEnable, auditEnable,
  enableTargets, routesThatCouldEnable, ENABLE_ROUTE_PATTERN,
  YES, NO, PROPOSE, STAGED_COMMIT, CONFIRM_REQUIRED, PROBE_ONLY,
} from '../core/authority.mjs';
import { capabilities } from '../core/capabilities.mjs';
import { MUTATION_ROUTES, POST_ONLY } from '../surface/routes.mjs';
// The board reads these three as TEXT. This file CALLS them — see the net test at the end.
import { applyCorroboration } from '../../design-brain/src/corroborate.mjs';
import { emitCollection } from '../../design-brain/src/emit-vault.mjs';
import { applyDecisions } from '../../design-brain/src/adjudicate.mjs';

const board = capabilities();
const statusOf = (lane) => board.find((r) => r.lane === lane).status;
const REFUSED = board.filter((r) => r.status === 'REFUSED').map((r) => r.lane);
const RETIRED = board.filter((r) => r.status === 'RETIRED').map((r) => r.lane);
const ACTIVE = board.filter((r) => r.status === 'ACTIVE').map((r) => r.lane);

// ---------------------------------------------------------------------------
// The matrix, as data
// ---------------------------------------------------------------------------

test('T-P-01 the authority matrix is COMPLETE — every actor, every action, one legal value', () => {
  const VOCAB = new Set([YES, NO, STAGED_COMMIT, CONFIRM_REQUIRED, PROBE_ONLY, PROPOSE]);
  assert.deepEqual(Object.keys(AUTHORITY_MATRIX).sort(), [...ACTORS].sort(),
    'the matrix must cover exactly the actors §6.2 names');
  for (const actor of ACTORS) {
    const cells = AUTHORITY_MATRIX[actor];
    assert.deepEqual(Object.keys(cells).sort(), [...ACTIONS].sort(),
      `${actor} is missing a column — a missing cell is an authority nobody stated`);
    for (const action of ACTIONS) {
      assert.ok(VOCAB.has(cells[action]), `${actor}.${action} = ${cells[action]} is not a legal value`);
    }
  }
  // An unknown actor or action is `null`, never a default `yes`. A default here would be a
  // fail-open guard, which is the one thing this module cannot be.
  assert.equal(authorityFor('nobody', 'compile'), null);
  assert.equal(authorityFor('sean', 'fly-the-plane'), null);
});

test('T-P-01 the STRONGEST cell in the two enabling columns is `propose` — for every actor', () => {
  for (const actor of ACTORS) {
    for (const action of ['change-canon', 'enable-spec']) {
      assert.notEqual(AUTHORITY_MATRIX[actor][action], YES,
        `${actor} has YES on ${action} — AC5.4 says nobody does`);
    }
  }
  // And `propose` is not enable. It is the honest alternative, and it is only two actors'.
  const proposers = ACTORS.filter((a) => AUTHORITY_MATRIX[a]['enable-spec'] === PROPOSE);
  assert.deepEqual(proposers.sort(), ['builder-agent', 'sean']);
  assert.deepEqual(ACTORS.filter((a) => AUTHORITY_MATRIX[a]['enable-spec'] === NO).sort(),
    ['astra-mcp', 'astra-surface', 'reviewer-agent']);
});

// ---------------------------------------------------------------------------
// AC5.4 — the operation, refused for everyone
// ---------------------------------------------------------------------------

test('AC5.4 EVERY actor is refused EVERY refused lane — including Sean', () => {
  assert.deepEqual(REFUSED.sort(), ['adjudicate', 'corroborate', 'emit-vault']);
  for (const actor of ACTORS) {
    for (const lane of REFUSED) {
      const r = attemptEnable({ actor, target: lane, board });
      assert.equal(r.enabled, false, `${actor} enabled the REFUSED lane ${lane}`);
      assert.equal(r.ok, false);
      assert.equal(r.code, 'E_LANE_REFUSED');
      assert.equal(r.laneStatus, 'REFUSED');
      // The refusal names the GATE, not just the verdict — otherwise the operator cannot
      // tell a design decision from a bug.
      assert.match(r.message, /signed approval|gated on/);
      assert.equal(r.authority, authorityFor(actor, 'enable-spec'));
    }
  }
});

test('AC5.4 EVERY actor is refused spec mode, and the proposers are told the alternative', () => {
  for (const actor of ACTORS) {
    const r = attemptEnable({ actor, target: 'spec-mode', board });
    assert.equal(r.enabled, false);
    assert.equal(r.code, 'E_MODE_GATED');
    assert.match(r.message, /DISABLED/);
    if (authorityFor(actor, 'enable-spec') === PROPOSE) {
      assert.match(r.message, /proposal does not switch it on/,
        `${actor} may propose, and the refusal must say that proposing is not enabling`);
    } else {
      assert.doesNotMatch(r.message, /You may draft/,
        `${actor} has no propose right, so the refusal must not offer one`);
    }
  }
});

test('AC5.4 RETIRED and UNSOURCED targets are refused too — an unknown is not a safe default', () => {
  for (const lane of RETIRED) {
    const r = attemptEnable({ actor: 'sean', target: lane, board });
    assert.equal(r.code, 'E_LANE_RETIRED');
    assert.equal(r.enabled, false);
  }
  // A lane whose marker vanished degrades to INCONCLUSIVE; enabling it would be switching
  // on something nobody can describe.
  const bogus = [{ lane: 'mystery', status: 'INCONCLUSIVE', reason: 'marker not found' }];
  const r = attemptEnable({ actor: 'sean', target: 'mystery', board: bogus });
  assert.equal(r.code, 'E_LANE_UNSOURCED');
  assert.match(r.message, /marker not found/);
});

test('AC5.4 an ACTIVE target reports already-active — never a false success', () => {
  for (const lane of ACTIVE) {
    const r = attemptEnable({ actor: 'sean', target: lane, board });
    assert.equal(r.ok, false, `${lane} is already on; enabling it did nothing`);
    assert.equal(r.enabled, false);
    assert.equal(r.code, 'E_ALREADY_ACTIVE');
  }
});

test('AC5.4 unknown actors and targets are refused, and nothing throws', () => {
  assert.equal(attemptEnable({ actor: 'nobody', target: 'corroborate', board }).code, 'E_ACTOR_UNKNOWN');
  assert.equal(attemptEnable({ actor: 'sean', target: 'no-such-lane', board }).code, 'E_TARGET_UNKNOWN');
  // The board is injectable, so an empty board must not crash the sweep either.
  assert.equal(attemptEnable({ actor: 'sean', target: 'corroborate', board: [] }).code, 'E_TARGET_UNKNOWN');
});

// ---------------------------------------------------------------------------
// The sweep — the claim, produced by running
// ---------------------------------------------------------------------------

test('AC5.4 THE SWEEP: every actor against every lane, and nothing was enabled', () => {
  const audit = auditEnable(board);
  // The attempt count is a CLAIM ABOUT COMPLETENESS, so it is asserted as a product rather
  // than as a number: a sweep that silently covered a subset would still look healthy.
  assert.equal(audit.attempted, ACTORS.length * enableTargets(board).length);
  assert.equal(audit.attempted, audit.expected);
  assert.deepEqual(audit.enabled, [], 'AC5.4 is violated — something was enabled');
  assert.equal(audit.refused, audit.attempted);
  // Every attempt reached a verdict with a code. A bare refusal with no code is the
  // "Something went wrong" this surface forbids.
  for (const a of audit.attempts) assert.match(a.code, /^E_[A-Z_]+$/, `${a.actor}→${a.target} has no code`);
  // And the codes account for the board exactly: 3 RETIRED + 3 REFUSED + 5 ACTIVE + 1 mode.
  assert.equal(audit.byCode.E_LANE_RETIRED, RETIRED.length * ACTORS.length);
  assert.equal(audit.byCode.E_LANE_REFUSED, REFUSED.length * ACTORS.length);
  assert.equal(audit.byCode.E_ALREADY_ACTIVE, ACTIVE.length * ACTORS.length);
  assert.equal(audit.byCode.E_MODE_GATED, ACTORS.length);
});

test('AC5.4 the sweep GROWS with the board — a new lane is swept without editing a list', () => {
  const extra = [...board, { lane: 'future-lane', status: 'REFUSED', gatedBy: 'a signature nobody has' }];
  const audit = auditEnable(extra);
  assert.equal(audit.attempted, ACTORS.length * (board.length + 1));
  assert.deepEqual(audit.enabled, []);
  assert.equal(audit.byCode.E_LANE_REFUSED, (REFUSED.length + 1) * ACTORS.length);
});

// ---------------------------------------------------------------------------
// AC5.4 at the transport layer
// ---------------------------------------------------------------------------

test('AC5.4 no mutation route names an enable action — and the pattern really fires', () => {
  assert.deepEqual(routesThatCouldEnable(MUTATION_ROUTES), [],
    'a route that could enable a gated lane is the operation AC5.4 forbids');
  assert.deepEqual(routesThatCouldEnable(POST_ONLY), []);
  // A scan that cannot fire is not a scan. These are the shapes it must catch.
  for (const r of ['spec-mode-enable', 'activate-lane', 'force-refused', 'unrefuse']) {
    assert.ok(ENABLE_ROUTE_PATTERN.test(r), `the scan would miss a route named ${r}`);
  }
  assert.deepEqual(routesThatCouldEnable(['compile', 'spec-mode-enable']), ['spec-mode-enable']);
});

test('AC5.4 the fence is backed by real refusals — measured, and the REACHED set is named', () => {
  // WHAT THIS TEST USED TO SAY, AND WHY THAT WAS WRONG. It was named *"the lanes themselves
  // refuse — the fence has a net behind it"*, and it asserted `row.marker` and `row.gatedBy`
  // for each REFUSED lane. Both are true. Neither exercises a lane: it restated the board and
  // called the restatement a net. A5's hostile review found it, and the finding is worth more
  // than the fix — **a test named after a guarantee it does not touch is worse than no test**,
  // because it retires the suspicion that would have produced the real one.
  //
  // So the lanes are now CALLED. The board reads their source as text; a marker that is only
  // ever read is a marker nobody has watched fire, which is precisely mutation `M2`'s lesson.
  const row = (lane) => board.find((r) => r.lane === lane);

  // --- 1. corroborate. The board's marker IS the thrown code. ---------------------
  assert.throws(() => applyCorroboration(),
    (e) => e.code === 'E_CORROBORATION_DISABLED' && e.message.includes(row('corroborate').marker),
    'applyCorroboration() must refuse, and its code must be the marker the board cites');

  // --- 2. emit-vault. The refusal must land BEFORE the write. --------------------
  // The safety property is not "it throws" — it is "it throws instead of writing". A gate
  // that threw after `rmSync`/`mkdirSync` would still be leaky, so the absence of the target
  // is asserted, not assumed.
  const neverWritten = 'C:/tmp/a5-never-written';
  assert.throws(
    () => emitCollection([{ status: 'accepted', claimId: 'CLM-X' }], neverWritten, { nowStamp: 'x' }),
    (e) => e.message.includes(row('emit-vault').marker),
    'emitCollection() must refuse a claim with no signed provenance, naming the board\'s marker');
  assert.equal(existsSync(neverWritten), false, 'the vault gate let a write through before refusing');

  // --- 3. adjudicate. THE BOUNDARY, MEASURED AND NAMED. -------------------------
  // `applyDecisions` refuses at its PROVENANCE gate (`is not canonically bound to signed
  // receipts`, :49) before it reaches the AUTHORITY gate (`typeof signDecision !== 'function'`,
  // :68) that the board's marker names. So this call measures a real refusal in the lane — but
  // NOT the one the marker cites. Reaching :68 needs a provenance-valid claim, which needs a
  // signed receipt chain; that is the engine suite's job, not this one's.
  //
  // Recording the gap rather than papering it is the whole point: *a claim is true of the set
  // measured and silent about the set excluded.*
  assert.throws(
    () => applyDecisions([{ claimId: 'CLM-X', status: 'proposed' }], [], new Map(),
      { actor: 'sean', batchId: 'b', nowIso: 'now' }),
    (e) => /is not canonically bound to signed receipts/.test(e.message),
    'applyDecisions() must refuse a claim with no signed provenance');

  // --- 4. The reached set, asserted BY NAME. ------------------------------------
  // Enumerating the lanes that were exercised and the lanes that were only marker-checked
  // means a fourth REFUSED lane forces a decision here instead of silently widening the claim
  // this test's title makes.
  const EXERCISED = ['corroborate', 'emit-vault'];
  const MARKER_ONLY = ['adjudicate'];
  assert.deepEqual([...EXERCISED, ...MARKER_ONLY].sort(), REFUSED.slice().sort(),
    'a REFUSED lane is neither exercised nor explicitly declared marker-only — decide which');
  for (const lane of REFUSED) {
    assert.ok(row(lane).marker, `${lane} has no enforcement marker`);
    assert.ok(row(lane).gatedBy, `${lane} is REFUSED with no named gate`);
  }
  assert.equal(statusOf('spec-mode'), 'DISABLED');
});
