/**
 * critic.test.mjs — S6 acceptance tests: the cage around the LLM tier.
 * ====================================================================
 * Every test injects the transport, so the whole cage is exercised with ZERO
 * network and ZERO spend. The cage is the deliverable — a critic that is
 * merely "prompted well" is the thing the panel unanimously refused.
 *
 *   K1  pairwise-only: a single artifact is refused
 *   K2  generator == critic model family is refused
 *   K3  seat resolution: free-first, paid gated, same-family skipped, null honest
 *   K4  dangling citations are dropped AND recorded
 *   K5  an uncited finding is dropped (a model describing a page it did not read)
 *   K6  an absolute score is discarded loudly (unrepresentable by contract)
 *   K7  self-consistency: one-shot findings die, persistent ones survive
 *   K8  position bias forces advisory even when calibrated
 *   K9  advisory until calibrated; calibrated + unbiased can gate
 *   K10 metricAgreement replaces confidence (fact, not self-report)
 *   K11 calibration: >=90% passes, below fails, run in BOTH orders
 *   K12 a transport failure in one round is recorded, not fatal
 *   K13 a tie is an honest null winner, never a coin flip
 *   K14 CRITIQUE records the lane either way, and advisory never fills elevate[]
 *   K15 availableSeats reports only transports that exist on disk
 *   K16 an empty citation vocabulary is refused, not silently "found nothing"
 *   K17 the same-family guard declares whether it could fire at all
 *
 * (K6b, K12b are sub-cases of their parents.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  pairwiseCritique, calibrate, resolveSeat, validateVerdict, metricAgreement,
  allowedCitations, familyOfModel, CALIBRATION_MIN, SELF_CONSISTENCY_ROUNDS,
} from '../critic.mjs';
import { critiqueStage, availableSeats } from '../stages/critique.mjs';

const HTML = '<main data-skeleton="S1"><section data-zone="hero" data-section-type="hero" data-plate-crop="crop-abc"><a data-cta>Go</a></section><section data-zone="proof" data-section-type="proof-list"></section></main>';
const ALLOWED = allowedCitations(HTML, [375, 1440]);

const A = { id: 'A', html: HTML };
const B = { id: 'B', html: HTML };

/** A transport that always picks `winner`, with the given reasons. */
const stub = (winner, reasons = [{ text: 'the ledger carries the composition', cites: ['hero'] }]) =>
  async () => ({ winner, reasons });

/** A transport that picks whichever artifact was shown FIRST (pure position bias). */
const positionBiased = async ({ order }) => ({ winner: order[0], reasons: [{ text: 'the first one reads cleaner', cites: ['hero'] }] });

test('K1 pairwise-only: a single artifact is refused', async () => {
  await assert.rejects(
    pairwiseCritique({ a: A, b: null, transport: stub('A'), seat: 'glm', generatorModel: 'claude' }),
    /pairwise requires exactly two artifacts/,
  );
});

test('K2 generator == critic model family is refused', async () => {
  await assert.rejects(
    pairwiseCritique({ a: A, b: B, transport: stub('A'), seat: 'glm', generatorModel: 'glm-5.3' }),
    /share model family "glm" — a model may not review its own output/,
  );
  // family folding: opus/sonnet/fable all resolve to claude
  assert.equal(familyOfModel('claude-opus-5'), 'claude');
  assert.equal(familyOfModel('claude-fable-5'), 'claude');
  assert.equal(familyOfModel('moonshotai/kimi-k3'), 'kimi');
});

test('K3 seat resolution: free-first, paid gated, same-family skipped, null honest', () => {
  assert.equal(resolveSeat({ available: ['glm', 'kimi', 'qwen'], generatorModel: 'claude' }).seat, 'qwen',
    'local/free seat is preferred over paid');
  assert.equal(resolveSeat({ available: ['glm', 'kimi'], generatorModel: 'claude' }).seat, 'glm',
    'paid seats are skipped unless explicitly allowed');
  assert.equal(resolveSeat({ available: ['kimi'], generatorModel: 'claude' }), null,
    'a paid-only bench with no authorisation is NO seat, not a silent charge');
  assert.equal(resolveSeat({ available: ['kimi'], generatorModel: 'claude', allowPaid: true }).seat, 'kimi');
  assert.equal(resolveSeat({ available: ['glm'], generatorModel: 'glm-5.3' }), null,
    'the only seat sharing the generator family leaves NO seat');
  assert.equal(resolveSeat({ available: [], generatorModel: 'claude' }), null);
});

test('K4 dangling citations are dropped AND recorded', () => {
  const { verdict, dropped } = validateVerdict({
    winner: 'A',
    reasons: [{ text: 'hero is strong', cites: ['hero', 'ghost-zone'] }],
  }, { allowed: ALLOWED });
  assert.deepEqual(verdict.reasons[0].cites, ['hero'], 'the real citation survives');
  assert.ok(dropped.some((d) => /dangling citation\(s\).*ghost-zone/.test(d)), dropped.join('\n'));
});

test('K5 an uncited finding is dropped', () => {
  const { verdict, dropped } = validateVerdict({
    winner: 'B',
    reasons: [{ text: 'it simply feels more premium', cites: [] }, { text: 'proof reads clean', cites: ['proof'] }],
  }, { allowed: ALLOWED });
  assert.equal(verdict.reasons.length, 1);
  assert.equal(verdict.reasons[0].cites[0], 'proof');
  assert.ok(dropped.some((d) => /uncited finding dropped/.test(d)));
});

test('K6 an absolute score is discarded loudly', () => {
  const { verdict, dropped } = validateVerdict({ winner: 'A', score: 7, reasons: [] }, { allowed: ALLOWED });
  assert.equal(verdict.winner, 'A');
  assert.equal(verdict.score, undefined, 'no score field survives into the verdict');
  assert.ok(dropped.some((d) => /absolute score\/rating present/.test(d)));
});

test('K6b a non-forced-choice winner is refused outright', () => {
  for (const w of ['tie', 'both', null, undefined, 'C']) {
    const { verdict } = validateVerdict({ winner: w, reasons: [] }, { allowed: ALLOWED });
    assert.equal(verdict, null, `winner ${JSON.stringify(w)} must be refused`);
  }
});

test('K7 self-consistency: one-shot findings die, persistent ones survive', async () => {
  let round = 0;
  const transport = async () => {
    round += 1;
    const reasons = [{ text: 'the price ledger carries the composition', cites: ['hero'] }];
    if (round === 1) reasons.push({ text: 'a one time hallucination about the footer', cites: ['proof'] });
    return { winner: 'A', reasons };
  };
  const r = await pairwiseCritique({ a: A, b: B, transport, seat: 'glm', generatorModel: 'claude', allowed: ALLOWED });
  assert.equal(r.findings.length, 1, 'only the persistent finding survives');
  assert.match(r.findings[0].text, /price ledger/);
  assert.equal(SELF_CONSISTENCY_ROUNDS, 3, 'blueprint §S6 fixes self-consistency at 3 rounds');
  assert.equal(r.findings[0].persistence, `${SELF_CONSISTENCY_ROUNDS}/${SELF_CONSISTENCY_ROUNDS}`);
  assert.ok(r.dropped.some((d) => /non-persistent finding dropped \(1\/3\)/.test(d)));
});

test('K8 position bias forces advisory even when calibrated', async () => {
  const calibration = { passed: true, rate: 1, seat: 'glm' };
  const r = await pairwiseCritique({
    a: A, b: B, transport: positionBiased, seat: 'glm', generatorModel: 'claude', allowed: ALLOWED, calibration,
  });
  assert.equal(r.position_bias, true, 'always picking the first-shown artifact is detected');
  assert.equal(r.advisory, true, 'a position-biased critic cannot gate, calibration notwithstanding');
});

test('K9 advisory until calibrated; calibrated + unbiased can gate', async () => {
  const uncal = await pairwiseCritique({ a: A, b: B, transport: stub('A'), seat: 'glm', generatorModel: 'claude', allowed: ALLOWED });
  assert.equal(uncal.advisory, true, 'no calibration record => advisory');

  const wrongSeat = await pairwiseCritique({
    a: A, b: B, transport: stub('A'), seat: 'glm', generatorModel: 'claude', allowed: ALLOWED,
    calibration: { passed: true, rate: 1, seat: 'kimi' },
  });
  assert.equal(wrongSeat.advisory, true, "another seat's calibration does not transfer");

  const good = await pairwiseCritique({
    a: A, b: B, transport: stub('A'), seat: 'glm', generatorModel: 'claude', allowed: ALLOWED,
    calibration: { passed: true, rate: 0.95, seat: 'glm' },
  });
  assert.equal(good.advisory, false);
  assert.equal(good.winner, 'A');
});

test('K10 metricAgreement replaces confidence with a checkable fact', () => {
  const meters = [{ meter: 'contrast:--text/on/--bg', value: 2.1, pass: false }, { meter: 'card_budget', value: {}, pass: true }];
  const corroborated = metricAgreement({ text: 'the contrast in the hero is too low', cites: ['hero'] }, meters);
  assert.equal(corroborated.corroborated, true);
  assert.equal(corroborated.meter, 'contrast:--text/on/--bg');

  const contradicted = metricAgreement({ text: 'card_budget looks blown', cites: ['hero'] }, meters);
  assert.equal(contradicted.corroborated, false, 'a passing meter contradicts the finding');

  const unmeasurable = metricAgreement({ text: 'the mood is wrong', cites: ['hero'] }, meters);
  assert.equal(unmeasurable.corroborated, null, 'no meter speaks to it — null, never a made-up number');
});

test('K11 calibration: >=90% passes, below fails, both orders run', async () => {
  const pairs = [
    { id: 'overflow', clean: { id: 'c1' }, defective: { id: 'd1' } },
    { id: 'contrast', clean: { id: 'c2' }, defective: { id: 'd2' } },
    { id: 'sprawl', clean: { id: 'c3' }, defective: { id: 'd3' } },
  ];
  // A perfect seat always picks the clean page wherever it sits.
  const perfect = async ({ order }) => ({ winner: order[0] === 'A' ? 'A' : 'B' });
  const good = await calibrate({ pairs, transport: perfect, seat: 'glm', generatorModel: 'claude' });
  assert.equal(good.total, 6, 'three pairs x both orders');
  assert.equal(good.rate, 1);
  assert.equal(good.passed, true);

  // A seat that always answers "A" is right only when the clean page sits at A.
  const lazy = async () => ({ winner: 'A' });
  const bad = await calibrate({ pairs, transport: lazy, seat: 'glm', generatorModel: 'claude' });
  assert.equal(bad.rate, 0.5, 'order-swapping exposes the constant answer');
  assert.equal(bad.passed, false);
  assert.equal(bad.misses.length, 3);
  assert.ok(CALIBRATION_MIN === 0.9);
});

test('K12 a transport failure in one round is recorded, not fatal', async () => {
  let n = 0;
  const flaky = async () => {
    n += 1;
    if (n === 2) throw new Error('seat timed out');
    return { winner: 'B', reasons: [{ text: 'proof reads cleaner', cites: ['proof'] }] };
  };
  const r = await pairwiseCritique({ a: A, b: B, transport: flaky, seat: 'glm', generatorModel: 'claude', allowed: ALLOWED });
  assert.equal(r.rounds_completed, 2);
  assert.equal(r.winner, 'B');
  assert.ok(r.dropped.some((d) => /round 1: transport failed \(seat timed out\)/.test(d)));
});

test('K12b too few valid rounds => nothing is called persistent', async () => {
  const alwaysBroken = async () => { throw new Error('down'); };
  const r = await pairwiseCritique({ a: A, b: B, transport: alwaysBroken, seat: 'glm', generatorModel: 'claude', allowed: ALLOWED });
  assert.equal(r.advisory, true);
  assert.equal(r.winner, null);
  assert.deepEqual(r.findings, []);
  assert.match(r.reason, /only 0 valid round/);
});

test('K13 a tie is an honest null winner, never a coin flip', async () => {
  let n = 0;
  const split = async () => { n += 1; return { winner: n === 1 ? 'A' : 'B', reasons: [] }; };
  const r = await pairwiseCritique({ a: A, b: B, transport: split, seat: 'glm', generatorModel: 'claude', allowed: ALLOWED, rounds: 2 });
  assert.equal(r.winner, null);
  assert.deepEqual(r.votes, { A: 1, B: 1 });
});

test('K14 CRITIQUE records the lane either way, and advisory never fills elevate[]', async () => {
  const inspect = { render_id: 'r1', meters: [{ meter: 'card_budget', value: {}, pass: true }], screenshots: [] };

  // No seat on disk at all -> unavailable WITH a reason, deterministic lanes intact.
  const noSeat = await critiqueStage({ artifacts: { inspect }, criticSeats: [], generatorModel: 'claude' });
  assert.equal(noSeat.llm_lane.available, false);
  assert.match(noSeat.llm_lane.reason, /no critic transport resolves on disk/);
  assert.equal(noSeat.keep.length, 1, 'the deterministic lane is never gated on the critic');

  // Seat exists but no pair -> unavailable, honest reason.
  const noPair = await critiqueStage({ artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'claude' });
  assert.equal(noPair.llm_lane.available, false);
  assert.match(noPair.llm_lane.reason, /no second artifact/);

  // Seat + pair, but uncalibrated -> verdict rides, elevate[] stays EMPTY.
  const withPair = await critiqueStage({
    artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'claude',
    criticPair: { a: A, b: B, html: HTML },
    criticTransport: stub('A'),
  });
  assert.equal(withPair.llm_lane.available, true);
  assert.equal(withPair.llm_lane.verdict.advisory, true);
  assert.deepEqual(withPair.elevate, [], 'an advisory critic may not populate the gating lane');

  // Calibrated -> elevate[] finally carries findings.
  const calibrated = await critiqueStage({
    artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'claude',
    criticPair: { a: A, b: B, html: HTML },
    criticTransport: stub('A'),
    criticCalibration: { passed: true, rate: 1, seat: 'glm' },
  });
  assert.equal(calibrated.llm_lane.verdict.advisory, false);
  assert.equal(calibrated.elevate.length, 1);
});

test('K15 availableSeats reports only transports that exist on disk', () => {
  const seats = availableSeats();
  assert.ok(Array.isArray(seats));
  assert.ok(!seats.includes('qwen'),
    'consult-qwen.mjs does not exist in this repo — a config entry is not a usable seat');
  assert.deepEqual(availableSeats('/definitely/not/a/dir'), [], 'no directory => no seats, never a fabricated one');
});

test('K16 an empty citation vocabulary is refused, not silently "found nothing"', async () => {
  // The failure this guards: with no allowed tokens, EVERY finding is dropped as
  // uncited and the result is indistinguishable from an honest empty critique.
  await assert.rejects(
    pairwiseCritique({ a: A, b: B, transport: stub('A'), seat: 'glm', generatorModel: 'claude', allowed: new Set() }),
    /empty citation vocabulary/,
  );

  // and the stage turns that into an unavailable lane with a reason, never a throw
  const inspect = { render_id: 'r1', meters: [], screenshots: [] };
  const r = await critiqueStage({
    artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'claude',
    criticPair: { a: A, b: B }, criticTransport: stub('A'),
  });
  assert.equal(r.llm_lane.available, false);
  assert.match(r.llm_lane.reason, /citation validation cannot run/);
});

test('K17 the same-family guard declares whether it could fire at all', async () => {
  const inspect = { render_id: 'r1', meters: [], screenshots: [] };
  // Unidentified generator => the family comparison can never fail. Saying
  // "enforced" here would be a receipt that implies a check that never ran.
  const blind = await critiqueStage({ artifacts: { inspect }, criticSeats: ['glm'] });
  assert.equal(blind.llm_lane.same_family_guard.enforced, false);
  assert.match(blind.llm_lane.same_family_guard.reason, /cannot fire/);

  const armed = await critiqueStage({ artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'deterministic-compiler' });
  assert.equal(armed.llm_lane.same_family_guard.enforced, true);
  assert.equal(armed.llm_lane.same_family_guard.generator_family, 'deterministic-compiler');

  // and when it CAN fire, it does: the only seat shares the generator family
  const blocked = await critiqueStage({ artifacts: { inspect }, criticSeats: ['glm'], generatorModel: 'glm-5.3' });
  assert.equal(blocked.llm_lane.available, false);
  assert.match(blocked.llm_lane.reason, /share the generator family/);
});
