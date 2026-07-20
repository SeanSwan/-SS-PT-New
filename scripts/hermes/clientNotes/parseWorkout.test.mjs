/**
 * parseWorkout.test.mjs — regression suite for the dictation parser.
 * Run: node --test scripts/hermes/clientNotes/parseWorkout.test.mjs
 *
 * The tests that matter most are the REFUSAL tests: a parser that guesses a client, invents a set count,
 * or silently drops a fragment corrupts a business record while looking correct.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWorkout, parseExerciseFragment, extractClientRef, normalizeUnit, looksLikeWorkout, hasSetsReps, looksLikeCodeIdentifier,
} from './parseWorkout.mjs';

// ── client reference ────────────────────────────────────────────────────────
test('extractClientRef: numeric id in several spoken shapes', () => {
  for (const s of ['client 84', 'client: 84', 'for client #84', 'log client 84: bench 3x8']) {
    const r = extractClientRef(s);
    assert.equal(r?.kind, 'id', `kind for: ${s}`);
    assert.equal(r?.value, '84', `value for: ${s}`);
  }
});

test('extractClientRef: leading bare id with separator', () => {
  assert.deepEqual(
    { kind: extractClientRef('84: bench 3x8').kind, value: extractClientRef('84: bench 3x8').value },
    { kind: 'id', value: '84' },
  );
  assert.equal(extractClientRef('84 - squat 5x5').value, '84');
});

test('extractClientRef: name form requires an explicit colon', () => {
  const r = extractClientRef('client: Sarah — back squat 5x5');
  assert.equal(r.kind, 'name');
  assert.equal(r.value, 'Sarah');
});

/**
 * REGRESSION — the "@handle" form was tried and REMOVED on 2026-07-19. Against real history it matched
 * JSDoc/code annotations pasted into chat, inventing clients called "deprecated", "returns", "mention".
 * A handle must NOT resurrect a client reference.
 */
test('REGRESSION: @handle does NOT create a client (collides with JSDoc/code)', () => {
  assert.equal(extractClientRef('@sarah back squat 5x5'), null);
  assert.equal(extractClientRef('@deprecated use 3x12 instead'), null);
  assert.equal(extractClientRef('@returns {Promise} 2x2'), null);
});

/**
 * REGRESSION — real false positives found by dry-running against Sean's actual Hermes history
 * on 2026-07-19. Development chatter about the "client dashboard" was creating clients named
 * "dashboard", "progress", "intervention", "grid", and "and". Nothing here may parse as a person.
 */
test('REGRESSION: dev chatter never produces a phantom client', () => {
  const chatter = [
    'the client dashboard needs a 3x12 grid',
    'client progress charts 3x12 layout',
    'client intervention queue 2x2',
    'client and trainer views 3x3',
    'client grid FAIL 3x12',
    'client management table 4x4',
    'client-facing page 2x2',
  ];
  for (const line of chatter) {
    const r = extractClientRef(line);
    assert.equal(r, null, `must NOT extract a client from: "${line}" (got ${JSON.stringify(r)})`);
  }
});

test('REGRESSION: stoplisted word after an explicit colon is still rejected', () => {
  assert.equal(extractClientRef('client: dashboard 3x12'), null);
  assert.equal(extractClientRef('client: Progress 3x12'), null, 'capitalisation alone must not rescue it');
});

test('REGRESSION: real client forms still work after the tightening', () => {
  assert.equal(extractClientRef('client 84: bench 3x8').value, '84');
  assert.equal(extractClientRef('client: Sarah bench 3x8').value, 'Sarah');
  assert.equal(extractClientRef('84 - bench 3x8').value, '84');
});

test('extractClientRef: returns null when absent — never guesses', () => {
  assert.equal(extractClientRef('bench 3x8 @95'), null);
  assert.equal(extractClientRef('just some chatter'), null);
});

// ── exercise fragments ──────────────────────────────────────────────────────
test('parseExerciseFragment: NxM with weight and unit', () => {
  assert.deepEqual(parseExerciseFragment('goblet squat 3x12 @35lb'), {
    name: 'goblet squat', sets: 3, reps: 12, weight: 35, unit: 'lb', raw: 'goblet squat 3x12 @35lb',
  });
});

test('parseExerciseFragment: "sets of" longhand and "at" for weight', () => {
  const ex = parseExerciseFragment('RDL 3 sets of 10 at 95');
  assert.equal(ex.name, 'RDL');
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, 10);
  assert.equal(ex.weight, 95);
  assert.equal(ex.unit, 'lb', 'bare weight defaults to lb');
});

test('parseExerciseFragment: kg is preserved, not coerced to lb', () => {
  assert.equal(parseExerciseFragment('front squat 4x6 @60kg').unit, 'kg');
});

test('parseExerciseFragment: bodyweight has null weight AND null unit', () => {
  const ex = parseExerciseFragment('pushups 3x15');
  assert.equal(ex.weight, null);
  assert.equal(ex.unit, null, 'no weight must not imply lb');
});

test('parseExerciseFragment: returns null without sets x reps', () => {
  assert.equal(parseExerciseFragment('felt good today'), null);
  assert.equal(parseExerciseFragment(''), null);
});

test('normalizeUnit: known units map, unknown returns null', () => {
  assert.equal(normalizeUnit('lbs'), 'lb');
  assert.equal(normalizeUnit('POUNDS'), 'lb');
  assert.equal(normalizeUnit('kilos'), 'kg');
  assert.equal(normalizeUnit('bananas'), null);
});

// ── full line ───────────────────────────────────────────────────────────────
test('parseWorkout: full dictated line, multiple exercises', () => {
  const r = parseWorkout('log client 84: goblet squat 3x12 @35lb, RDL 3x10 @95, pushups 3x15');
  assert.equal(r.clientRef.value, '84');
  assert.equal(r.exercises.length, 3);
  assert.equal(r.exercises[0].name, 'goblet squat');
  assert.equal(r.exercises[1].weight, 95);
  assert.equal(r.exercises[2].weight, null);
  assert.equal(r.needsClient, false);
});

test('parseWorkout: lead verb never becomes an exercise name', () => {
  const r = parseWorkout('log client 84: bench 3x8 @95');
  assert.equal(r.exercises[0].name, 'bench');
});

test('parseWorkout: "and" separates exercises', () => {
  const r = parseWorkout('client 84: bench 3x8 and incline 3x10');
  assert.equal(r.exercises.length, 2);
  assert.equal(r.exercises[1].name, 'incline');
});

/**
 * REGRESSION (hostile review 2026-07-20) — THE CRITICAL ONE. "client 84: bench 3x8; client 12:
 * squat 5x5" previously attributed EVERYTHING to client 84, with "client 12: squat" embedded as an
 * exercise name. Exactly the misattribution this module exists to prevent. A second marker must
 * flag `multiClient` so the caller refuses to persist.
 */
test('REGRESSION CRITICAL: a second client in one line sets multiClient — never merged into the first', () => {
  const r = parseWorkout('client 84: bench 3x8; client 12: squat 5x5');
  assert.equal(r.multiClient, true, 'two markers must be flagged as ambiguous');
  // And the single-client path is untouched:
  assert.equal(parseWorkout('client 84: bench 3x8, incline 3x10').multiClient, false);
  assert.equal(parseWorkout('client 84: bench 3x8 for client compliance').multiClient, false,
    '"client <word>" chatter after the marker is not a second client');
  // Round 2: repeating the SAME client is natural speech, not ambiguity — must NOT be refused.
  assert.equal(parseWorkout('client 84: bench 3x8, client 84 squat 5x5').multiClient, false,
    'same client twice is not multi-client');
});

/**
 * REGRESSION (hostile review 2026-07-20): trailing text after the recognised shape was silently
 * DROPPED — "bench 3x8 @95 felt heavy" lost "felt heavy"; "squat 5x5 @ RPE 8" lost the RPE.
 * Everything after the match is now preserved as `note`.
 */
test('REGRESSION: trailing dictation is captured as note, never dropped', () => {
  assert.equal(parseExerciseFragment('bench 3x8 @95 felt heavy').note, 'felt heavy');
  assert.equal(parseExerciseFragment('squat 5x5 @ RPE 8').note, '@ RPE 8');
  assert.equal(parseExerciseFragment('plank 3x30 seconds').note, 'seconds');
  assert.equal(parseExerciseFragment('bench 3x8 @95lb').note, undefined, 'clean fragment has no note key');
});

/**
 * REGRESSION (hostile review 2026-07-20): no sanity bounds — a dictation typo "38x8" recorded
 * 38 sets as fact. Out-of-range fragments are refused to `unparsed` (preserved, not guessed).
 */
test('REGRESSION: absurd sets/reps/weight are refused to unparsed, not recorded', () => {
  assert.equal(parseExerciseFragment('bench 38x8'), null, '38 sets is a typo, not a workout');
  assert.equal(parseExerciseFragment('bench 3x8 @9999'), null, '9999lb is not a load');
  const r = parseWorkout('client 84: bench 38x8, squat 5x5 @135');
  assert.equal(r.exercises.length, 1, 'the sane fragment still parses');
  assert.deepEqual(r.unparsed, ['bench 38x8'], 'the typo is preserved for the human');
  // Boundary values inside the envelope still parse.
  assert.ok(parseExerciseFragment('carries 30x10'), 'sets at the bound are accepted');
});

test('REFUSAL: workout with no client sets needsClient — never misattributes', () => {
  const r = parseWorkout('bench 3x8 @95, incline 3x10');
  assert.equal(r.clientRef, null);
  assert.equal(r.exercises.length, 2);
  assert.equal(r.needsClient, true, 'must flag for human resolution rather than guess');
});

test('REFUSAL: unrecognised fragments are preserved verbatim, never dropped or invented', () => {
  const r = parseWorkout('client 84: bench 3x8, felt tweaky in the left shoulder');
  assert.equal(r.exercises.length, 1);
  assert.deepEqual(r.unparsed, ['felt tweaky in the left shoulder']);
});

test('REFUSAL: pure chatter yields no exercises and does not need a client', () => {
  const r = parseWorkout('what time is my next session');
  assert.equal(r.exercises.length, 0);
  assert.equal(r.needsClient, false, 'no exercises means nothing to attribute');
});

// ── stream filter ───────────────────────────────────────────────────────────
/**
 * looksLikeWorkout requires BOTH sets×reps AND a client marker.
 * Verified against 277 real messages: sets×reps alone matched 5, all 5 software conversation.
 */
test('looksLikeWorkout: needs sets×reps AND a client marker', () => {
  assert.equal(looksLikeWorkout('client 84: bench 3x8 @95'), true);
  assert.equal(looksLikeWorkout('client: Sarah squat 5 sets of 5'), true);
  assert.equal(looksLikeWorkout('84 - squat 5x5'), true);

  assert.equal(looksLikeWorkout('squat 5 sets of 5'), false, 'no client marker → not a candidate');
  assert.equal(looksLikeWorkout('client 84 had a good session'), false, 'no sets×reps → not a candidate');
  assert.equal(looksLikeWorkout(''), false);
});

test('REGRESSION: the five real false positives are all rejected end-to-end', () => {
  const realFalsePositives = [
    'the client dashboard needs a 3x12 grid',
    'client progress charts 3x12 layout',
    'client intervention queue 2x2 grid',
    'client and trainer views 3x3',
    '@deprecated OperatorObservabilityApiClient returns 2x2',
  ];
  for (const line of realFalsePositives) {
    assert.equal(looksLikeWorkout(line), false, `must reject: "${line}"`);
  }
});

test('REGRESSION: a class name after "client:" is rejected as a code identifier', () => {
  assert.equal(extractClientRef('client: OperatorObservabilityApiClient returns 2x2'), null);
  assert.equal(extractClientRef('client: UserService 3x12'), null);
  assert.equal(extractClientRef('client: SomeVeryLongPascalCaseThing 3x12'), null);
  // …but real people still parse
  assert.equal(extractClientRef('client: Sarah 3x12').value, 'Sarah');
  assert.equal(extractClientRef('client: Mike 5x5').value, 'Mike');
});

test('looksLikeCodeIdentifier: separates people from code', () => {
  assert.equal(looksLikeCodeIdentifier('Sarah'), false);
  assert.equal(looksLikeCodeIdentifier('Mike'), false);
  assert.equal(looksLikeCodeIdentifier('OperatorObservabilityApiClient'), true);
  assert.equal(looksLikeCodeIdentifier('UserService'), true);
  assert.equal(looksLikeCodeIdentifier('snake_case'), true);
});

test('hasSetsReps: still detects the shape independently of attribution', () => {
  assert.equal(hasSetsReps('bench 3x8'), true);
  assert.equal(hasSetsReps('5 sets of 5'), true);
  assert.equal(hasSetsReps('deploy 3 fixes'), false);
});
