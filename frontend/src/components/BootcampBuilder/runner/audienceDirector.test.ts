/**
 * SWA-105 Slice 6 — the audience director. Every consult law about what the
 * TV shows is pinned here BEFORE pixels exist.
 */
import { describe, expect, it } from 'vitest';

import { directAudience, endsLabel, type RoomProfile } from './audienceDirector';
import { createRunnerState, applyCommand, locate } from './runnerProtocol';
// @ts-expect-error shared core ships untyped .mjs
import { ALL_FIXTURES } from '../../../../../shared/bootcamp-core/fixtures.mjs';

const T0 = 1_785_000_000_000;
const plan = () => ALL_FIXTURES.fullBodyStationClass();
const room: RoomProfile = { tvDiagonalIn: 55, maxViewDistanceFt: 20 };

/** Position the effective clock at the first segment matching `phase`. */
function atPhase(p: ReturnType<typeof plan>, phase: string, intoMs = 1000) {
  const s = createRunnerState('fixture_full_body', T0);
  const { timeline } = locate(p, s, T0);
  const seg = timeline.segments.find((x: { phase: string }) => x.phase === phase);
  if (!seg) throw new Error(`no ${phase} segment`);
  return { s, now: seg.startsAt + intoMs };
}

describe('screen selection — one law per phase', () => {
  it('warmup is a hero (S1); cooldown is a hero (S6)', () => {
    const p = plan();
    const w = atPhase(p, 'warmup');
    expect(directAudience(p, w.s, w.now, room).screen).toBe('S1');
    const c = atPhase(p, 'cooldown');
    const vm = directAudience(p, c.s, c.now, room);
    expect(vm.screen).toBe('S6');
    expect(vm.hero?.exerciseName).toBeTruthy();
  });

  it('station work is S2: clock band + N station cards, NEVER one huge exercise', () => {
    const p = plan();
    const { s, now } = atPhase(p, 'work');
    const vm = directAudience(p, s, now, room);
    expect(vm.screen).toBe('S2');
    expect(vm.hero).toBeNull();
    expect(vm.stations).toHaveLength(p.structure.stationCount);
  });

  it('every station card shows ITS OWN current exercise', () => {
    const p = plan();
    const { s, now } = atPhase(p, 'work');
    const names = directAudience(p, s, now, room).stations.map((c) => c.exerciseName);
    expect(new Set(names).size).toBe(p.structure.stationCount); // all different
    expect(names).toContain('Goblet Squat');
    expect(names).toContain('Push-Up');
    expect(names).toContain('Farmer Carry');
  });

  it('the modification line is ALWAYS present when a variant exists — never behind a tap', () => {
    const p = ALL_FIXTURES.smallUpperBodyClass();
    const s = createRunnerState('fixture_small_upper', T0);
    const { timeline } = locate(p, s, T0);
    // position 2 = Push-Up at station 0 (has wrist + easier variants)
    const seg = timeline.segments.find(
      (x: { phase: string; position: number | null }) => x.phase === 'work' && x.position === 2,
    );
    const vm = directAudience(p, s, seg.startsAt + 500, room);
    const pushUpCard = vm.stations.find((c) => c.exerciseName === 'Push-Up');
    expect(pushUpCard?.modificationLine).toBe('Push-up on dumbbell handles');
  });

  it('transition is S3 with NEXT-up cards; rest shows the next exercise (S4)', () => {
    const p = plan();
    const t = atPhase(p, 'station_transition');
    const tv = directAudience(p, t.s, t.now, room);
    expect(tv.screen).toBe('S3');
    expect(tv.clock.phaseLabel).toBe('MOVE');
    expect(tv.stations.length).toBeGreaterThan(0);

    const r = atPhase(p, 'rest');
    expect(directAudience(p, r.s, r.now, room).screen).toBe('S4');
  });

  it('paced blocks and full_group are synchronized heroes (S5)', () => {
    const p = ALL_FIXTURES.openGymClass();
    const s = createRunnerState('fixture_open_gym', T0);
    const { timeline } = locate(p, s, T0);
    const work = timeline.segments.find((x: { phase: string }) => x.phase === 'work');
    const vm = directAudience(p, s, work.startsAt + 500, room);
    expect(vm.screen).toBe('S5');
    expect(vm.hero?.exerciseName).toBeTruthy();
  });

  it('before start → S0 lobby; after end (or END_CLASS) → S7 complete', () => {
    const p = plan();
    const s = createRunnerState('fixture_full_body', T0);
    expect(directAudience(p, s, T0 - 60_000, room).screen).toBe('S0');
    const { timeline } = locate(p, s, T0);
    expect(directAudience(p, s, timeline.endsAt + 1000, room).screen).toBe('S7');
    const ended = applyCommand(p, s, { cmdId: 'x', type: 'END_CLASS', baseSeq: s.seq, atEpochMs: T0 + 1000 }).state;
    expect(directAudience(p, ended, T0 + 2000, room).screen).toBe('S7');
  });
});

describe('the craft laws', () => {
  it('ENDS label is always present and formatted as a wall clock', () => {
    const p = plan();
    const { s, now } = atPhase(p, 'work');
    const vm = directAudience(p, s, now, room);
    expect(vm.clock.endsAtLabel).toMatch(/^ENDS \d{1,2}:\d{2}$/);
    expect(endsLabel(new Date(2026, 7, 3, 18, 47).getTime())).toBe('ENDS 6:47');
  });

  it('a pause pushes the ENDS label later — the promise stays honest', () => {
    const p = plan();
    let s = createRunnerState('fixture_full_body', T0);
    const before = directAudience(p, s, T0 + 1000, room).clock.endsAtLabel;
    s = applyCommand(p, s, { cmdId: 'p', type: 'PAUSE', baseSeq: s.seq, atEpochMs: T0 + 1000 }).state;
    s = applyCommand(p, s, { cmdId: 'r', type: 'RESUME', baseSeq: s.seq, atEpochMs: T0 + 301_000 }).state;
    const after = directAudience(p, s, T0 + 302_000, room).clock.endsAtLabel;
    expect(after).not.toBe(before); // 5 paused minutes moved the wall-clock end
  });

  it('hierarchy decays: round 1 emphasizes the NAME, round 2 the SCHEME', () => {
    const p = plan();
    const s = createRunnerState('fixture_full_body', T0);
    const { timeline } = locate(p, s, T0);
    const r1 = timeline.segments.find((x: { phase: string; round: number }) => x.phase === 'work' && x.round === 1);
    const r2 = timeline.segments.find((x: { phase: string; round: number }) => x.phase === 'work' && x.round === 2);
    expect(directAudience(p, s, r1.startsAt + 500, room).stations[0].emphasis).toBe('name');
    expect(directAudience(p, s, r2.startsAt + 500, room).stations[0].emphasis).toBe('scheme');
  });

  it('density comes from the ROOM: 3 stations fit a 55" grid; an unmeasured room defaults conservative', () => {
    const p = plan(); // 3 stations
    const { s, now } = atPhase(p, 'work');
    expect(directAudience(p, s, now, room).presentation.mode).toBe('grid');
    const unmeasured = directAudience(p, s, now, { tvDiagonalIn: null, maxViewDistanceFt: null });
    expect(unmeasured.presentation.mode).toBe('grid'); // 3 <= conservative 4
  });

  it('round position is reported for the round chip', () => {
    const p = plan();
    const { s, now } = atPhase(p, 'work');
    const vm = directAudience(p, s, now, room);
    expect(vm.round).toEqual({ current: 1, total: 2 });
  });
});
