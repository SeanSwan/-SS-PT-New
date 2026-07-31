/**
 * Timeline contract tests — SWA-105 Slice 0.
 * Proves the properties that make a 45-minute class survive a real gym:
 * absolute deadlines, sparse sampling, and sleep recovery.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { expandSegments, compileTimeline, segmentAt, reconcile } from '../timeline.mjs';
import { PHASES, minFontVh, maxStationCards, stationPresentation, panelHeightMm, DEFAULT_MAX_STATION_CARDS } from '../phases.mjs';
import { ALL_FIXTURES } from '../fixtures.mjs';

const T0 = 1_785_000_000_000;

test('a plan expands to segments without any epoch (template-safe)', () => {
  const segments = expandSegments(ALL_FIXTURES.fullBodyStationClass());
  assert.ok(segments.length > 0);
  for (const seg of segments) {
    assert.equal('startsAt' in seg, false, 'relative segments must carry no absolute time');
    assert.ok(seg.durationSec > 0);
  }
});

test('station work segments represent TIME, not one exercise', () => {
  // Opus 5 §0.1: during work, N stations do N different things simultaneously.
  // A work segment must therefore NOT be bound to a single slot.
  const plan = ALL_FIXTURES.fullBodyStationClass();
  const work = expandSegments(plan).filter((s) => s.phase === PHASES.WORK);
  assert.ok(work.length > 0);
  for (const seg of work) {
    assert.equal(seg.slotId, null, 'a station work segment must not bind to one slot');
    assert.ok(Number.isInteger(seg.position));
    assert.ok(Number.isInteger(seg.visit), 'a work segment must know which station visit it belongs to');
  }
  // A ROUND IS A FULL CIRCUIT: everyone rotates through every station, so the
  // work count carries the stationCount factor. Dropping it compiled a
  // 50-minute class down to ~7 minutes.
  const { rounds, stationCount, exercisesPerStation } = plan.structure;
  assert.equal(work.length, rounds * stationCount * exercisesPerStation);
});

test('full_group work segments DO bind to a slot (everyone does the same thing)', () => {
  const plan = ALL_FIXTURES.openGymClass();
  const work = expandSegments(plan).filter((s) => s.phase === PHASES.WORK);
  assert.ok(work.every((s) => s.slotId !== null));
  assert.equal(work.length, plan.structure.rounds * plan.blocks[1].slots.length);
});

test('rotation happens after every station visit except the last of the class', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  const transitions = expandSegments(plan).filter((s) => s.phase === PHASES.STATION_TRANSITION);
  const { rounds, stationCount } = plan.structure;
  // People rotate between stations, not only between rounds — and the class
  // must not end with a rotation to nowhere.
  assert.equal(transitions.length, rounds * stationCount - 1);
});

test('the class never ends on a rotation', () => {
  const segments = expandSegments(ALL_FIXTURES.fullBodyStationClass());
  const lastWork = [...segments].reverse().find((s) => s.phase === PHASES.STATION_TRANSITION);
  const lastIndex = segments.lastIndexOf(lastWork);
  assert.ok(lastIndex < segments.length - 1, 'a rotation must never be the final segment');
});

test('everyone visits every station', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  const visits = new Set(
    expandSegments(plan).filter((s) => s.phase === PHASES.WORK).map((s) => s.visit),
  );
  assert.equal(visits.size, plan.structure.stationCount, 'every station must be visited');
});

test('compileTimeline produces contiguous absolute deadlines', () => {
  const timeline = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);
  assert.equal(timeline.startedAt, T0);
  let cursor = T0;
  for (const seg of timeline.segments) {
    assert.equal(seg.startsAt, cursor, 'segments must not overlap or gap');
    assert.equal(seg.endsAt, seg.startsAt + seg.durationSec * 1000);
    cursor = seg.endsAt;
  }
  assert.equal(timeline.endsAt, cursor);
});

test('sparse sampling yields the same answer as dense sampling', () => {
  // The whole point of absolute deadlines: a throttled background tab that only
  // samples once a minute must land in exactly the same segment as a 60fps tab.
  const timeline = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  const probe = T0 + 5 * 60 * 1000 + 137;

  const dense = segmentAt(timeline, probe);
  // Simulate having sampled nothing at all until this instant.
  const sparse = segmentAt(timeline, probe);

  assert.deepEqual(dense.segment, sparse.segment);
  assert.equal(dense.index, sparse.index);
  assert.equal(dense.status, 'running');
});

test('segmentAt reports pending / running / complete correctly', () => {
  const timeline = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  assert.equal(segmentAt(timeline, T0 - 1).status, 'pending');
  assert.equal(segmentAt(timeline, T0).status, 'running');
  assert.equal(segmentAt(timeline, timeline.endsAt).status, 'complete');
  assert.equal(segmentAt(timeline, timeline.endsAt + 60_000).status, 'complete');
});

test('a segment boundary belongs to the NEXT segment, never both', () => {
  const timeline = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  const first = timeline.segments[0];
  assert.equal(segmentAt(timeline, first.endsAt - 1).index, 0);
  assert.equal(segmentAt(timeline, first.endsAt).index, 1);
});

test('remainingSec counts down and never goes negative', () => {
  const timeline = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  const first = timeline.segments[0];
  const early = segmentAt(timeline, first.startsAt + 1000).remainingSec;
  const late = segmentAt(timeline, first.endsAt - 1000).remainingSec;
  assert.ok(early > late);
  assert.ok(late >= 0);
});

test('reconcile surfaces the lost time and offers the trainer the choice', () => {
  const timeline = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);
  const expected = T0 + 10 * 60 * 1000;
  const actual = expected + 252_000; // laptop slept 4:12

  const result = reconcile(timeline, expected, actual);
  assert.equal(result.lostSec, 252);
  assert.equal(result.significant, true);
  // resumeHere pushes the end out; skipAhead honours the original booking.
  assert.equal(result.options.resumeHere.endsAt, timeline.endsAt + 252_000);
  assert.equal(result.options.skipAhead.endsAt, timeline.endsAt);
  assert.equal(result.options.extend.extendedBySec, 252);
});

test('a sub-5s gap is not significant enough to interrupt a class', () => {
  const timeline = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);
  assert.equal(reconcile(timeline, T0, T0 + 2000).significant, false);
});

test('compileTimeline refuses a non-finite start', () => {
  assert.throws(() => compileTimeline(ALL_FIXTURES.openGymClass(), NaN), /finite number/);
});

// ── TV density physics (Opus 5 §0.3) ────────────────────────────────────────

test('a 55-inch panel is ~685mm tall', () => {
  assert.ok(Math.abs(panelHeightMm(55) - 685) < 5, `got ${panelHeightMm(55)}`);
});

test('20ft on a 55-inch TV demands ~8.5vh type', () => {
  const vh = minFontVh(55, 20);
  assert.ok(vh > 8 && vh < 9, `expected ~8.5vh, got ${vh}`);
});

test('bigger screens and shorter distances allow more cards', () => {
  assert.ok(maxStationCards(75, 20) >= maxStationCards(55, 20));
  assert.ok(maxStationCards(55, 12) >= maxStationCards(55, 20));
});

test('an unmeasured room returns null, never "unlimited"', () => {
  assert.equal(maxStationCards(null, 20), null);
  assert.equal(maxStationCards(55, null), null);
  // and the caller falls back to the conservative default
  assert.equal(stationPresentation(4, null).mode, 'grid');
  assert.equal(stationPresentation(DEFAULT_MAX_STATION_CARDS + 1, null).mode, 'alternating');
});

test('over-capacity never shrinks type — it alternates or falls back to paper', () => {
  assert.deepEqual(stationPresentation(4, 4), { mode: 'grid', perPage: 4, pages: 1 });
  assert.equal(stationPresentation(7, 4).mode, 'alternating');
  const many = stationPresentation(12, 4);
  assert.equal(many.mode, 'rotation_only');
  assert.equal(many.requiresPrintedCards, true);
});

// ── Small-class reality (Kimi R10.4) ────────────────────────────────────────

test('n=4 and n=14 traverse the same code path', () => {
  const small = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  const big = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);
  for (const t of [small, big]) {
    assert.ok(t.segments.length > 0);
    assert.ok(t.totalSec > 0);
    assert.equal(segmentAt(t, T0).status, 'running');
  }
});
