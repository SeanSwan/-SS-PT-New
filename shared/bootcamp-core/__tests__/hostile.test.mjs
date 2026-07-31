/**
 * Hostile round — SWA-105 Slice 0.
 * Written to BREAK the schema, not to confirm it. Each test here started as a
 * suspicion that the happy-path suite was not earning its green.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateClassPlan } from '../classPlan.mjs';
import { compileTimeline, segmentAt, expandSegments } from '../timeline.mjs';
import { ALL_FIXTURES } from '../fixtures.mjs';

const T0 = 1_785_000_000_000;

test('HOSTILE: stationCount must agree with the stations array', () => {
  // A plan claiming 4 stations while supplying 2 renders an empty card on the
  // TV and rotates people to a station that does not exist.
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.structure.stationCount = 4;
  plan.stations = plan.stations.slice(0, 2);
  const problems = validateClassPlan(plan).join(';');
  assert.match(problems, /station/i, 'mismatch between stationCount and stations[] must be caught');
});

test('HOSTILE: a zero-duration slot must not create an invisible segment', () => {
  // segmentAt uses `now < endsAt`; a zero-length segment has startsAt === endsAt
  // and can never be "current", so the Runner would skip straight past it while
  // the board still lists the exercise.
  const plan = ALL_FIXTURES.smallUpperBodyClass();
  plan.blocks[0].slots[0].workSec = 0;
  const problems = validateClassPlan(plan).join(';');
  assert.match(problems, /workSec/i, 'a zero-duration slot must be rejected');
});

test('HOSTILE: sparse sampling is genuinely equivalent to stepping every segment', () => {
  // The earlier "sparse vs dense" test compared f(x) to f(x) and proved nothing.
  // This walks the timeline segment-by-segment (dense) and compares against a
  // single cold lookup at each instant (sparse) — the real property.
  const timeline = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);

  let walked = 0;
  for (const seg of timeline.segments) {
    const mid = seg.startsAt + Math.floor((seg.endsAt - seg.startsAt) / 2);
    const cold = segmentAt(timeline, mid);
    assert.equal(cold.index, seg.index, `cold lookup mid-segment ${seg.index} must land on it`);
    assert.equal(cold.segment.phase, seg.phase);
    walked += 1;
  }
  assert.ok(walked > 10, 'should have walked a real timeline');
});

test('HOSTILE: total compiled duration equals the sum of its parts', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  const relative = expandSegments(plan);
  const expectedSec = relative.reduce((sum, s) => sum + s.durationSec, 0);
  const timeline = compileTimeline(plan, T0);
  assert.equal(timeline.totalSec, expectedSec);
  assert.equal(timeline.endsAt - timeline.startedAt, expectedSec * 1000);
});

test('HOSTILE: a class that overruns its target duration is surfaced', () => {
  // targetDurationMin is intent; the compiled timeline is reality. If reality
  // exceeds intent the room booking is blown and nothing currently says so.
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.intent.targetDurationMin = 5; // absurdly short vs the compiled plan
  const timeline = compileTimeline(plan, T0);
  const overrunSec = timeline.totalSec - plan.intent.targetDurationMin * 60;
  assert.ok(overrunSec > 0, 'fixture should overrun a 5-minute target');
  const problems = validateClassPlan(plan).join(';');
  assert.match(problems, /duration|overrun/i, 'the plan must flag that it cannot fit its target');
});

test('HOSTILE: negative or fractional headcount is rejected', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.intent.headcount = -3;
  assert.match(validateClassPlan(plan).join(';'), /headcount/);
  plan.intent.headcount = 4.5;
  assert.match(validateClassPlan(plan).join(';'), /headcount/);
});

test('HOSTILE: duplicate slotIds within a plan are rejected', () => {
  // The Runner keys media, swap targets and the log by slotId. Duplicates make
  // "swap slot X" ambiguous.
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[1].slotId = plan.blocks[1].slots[0].slotId;
  assert.match(validateClassPlan(plan).join(';'), /duplicate/i);
});

test('HOSTILE: a swap event must reference a station that exists', () => {
  const plan = ALL_FIXTURES.relaxedSwapClass();
  plan.log[0].stationIndex = 99;
  assert.match(validateClassPlan(plan).join(';'), /station/i);
});
