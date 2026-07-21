/**
 * Restore composer — pure-core unit tests (no DB).
 * Encodes the acceptance metrics from the spec + Kimi R1 conditions:
 * day-state matrix, H1 conflict predicate, H2 pain gate handled in orchestrator,
 * H4 empty-block suppression, hard provenance law (every item has why[]).
 */
import { describe, it, expect } from 'vitest';
import {
  resolveDayState,
  modeForDayState,
  conflictsWithNextSession,
  blockedByPain,
  correctiveTagsFrom,
  composeBlocks,
} from '../services/recovery/restoreCompassService.mjs';

const exercise = (overrides = {}) => ({
  id: overrides.id || 'ex-1',
  name: overrides.name || 'Foam Roll Lats',
  exerciseType: 'flexibility',
  cesProtocolStep: null,
  nasmCorrectiveCategory: null,
  primaryMuscles: JSON.stringify(['lats']),
  bodyPartCategory: 'recovery',
  contraindicationNotes: null,
  difficulty: 50,
  canBePerformedAtHome: true,
  recommendedSets: 2,
  recommendedReps: 12,
  recommendedDuration: null,
  experiencePointsEarned: 10,
  videoUrl: null,
  thumbnailUrl: null,
  imageUrl: null,
  ...overrides,
});

describe('resolveDayState matrix', () => {
  it('already-trained wins over everything', () => {
    expect(resolveDayState({ hasActivePlan: true, completedToday: true, plannedToday: true, cursorDayType: 'rest' }))
      .toBe('already-trained');
  });
  it('planned session today = training day', () => {
    expect(resolveDayState({ hasActivePlan: true, completedToday: false, plannedToday: true, cursorDayType: 'rest' }))
      .toBe('training');
  });
  it('no active plan = no-plan cold start', () => {
    expect(resolveDayState({ hasActivePlan: false, completedToday: false, plannedToday: false, cursorDayType: null }))
      .toBe('no-plan');
  });
  it('cursor rest / active_recovery day types map through', () => {
    expect(resolveDayState({ hasActivePlan: true, completedToday: false, plannedToday: false, cursorDayType: 'rest' }))
      .toBe('rest');
    expect(resolveDayState({ hasActivePlan: true, completedToday: false, plannedToday: false, cursorDayType: 'active_recovery' }))
      .toBe('active-recovery');
  });
  it('plan without a scheduled session today = unplanned (off-day)', () => {
    expect(resolveDayState({ hasActivePlan: true, completedToday: false, plannedToday: false, cursorDayType: 'training' }))
      .toBe('unplanned');
  });
  it('mode mapping: full for off-days, strip for training days, cold for no-plan', () => {
    expect(modeForDayState('rest')).toBe('full');
    expect(modeForDayState('unplanned')).toBe('full');
    expect(modeForDayState('training')).toBe('strip');
    expect(modeForDayState('already-trained')).toBe('strip');
    expect(modeForDayState('no-plan')).toBe('cold');
  });
});

describe('H1 conflict predicate (deterministic)', () => {
  const legsCompound = exercise({ exerciseType: 'compound', cesProtocolStep: null, primaryMuscles: JSON.stringify(['quadriceps']) });
  it('excludes loading work targeting tomorrow-plan muscles from activate/cardio', () => {
    expect(conflictsWithNextSession(legsCompound, ['quadriceps'], 'activate')).toBe(true);
    expect(conflictsWithNextSession(legsCompound, ['quadriceps'], 'cardio')).toBe(true);
  });
  it('NEVER excludes inhibit/lengthen — SMR and stretching aid recovery', () => {
    expect(conflictsWithNextSession(legsCompound, ['quadriceps'], 'inhibit')).toBe(false);
    expect(conflictsWithNextSession(legsCompound, ['quadriceps'], 'lengthen')).toBe(false);
  });
  it('no overlap = no conflict', () => {
    expect(conflictsWithNextSession(legsCompound, ['lats'], 'activate')).toBe(false);
  });
  it('CES activate step counts as loading even for flexibility-typed rows', () => {
    const activator = exercise({ exerciseType: 'stability', cesProtocolStep: 'activate', primaryMuscles: JSON.stringify(['glutes']) });
    expect(conflictsWithNextSession(activator, ['glutes'], 'activate')).toBe(true);
  });
});

describe('pain filter', () => {
  it('blocks exercises touching an actively painful region', () => {
    const shoulderRoll = exercise({ primaryMuscles: JSON.stringify(['shoulders']) });
    expect(blockedByPain(shoulderRoll, [{ bodyRegion: 'shoulder' }])).toBe(true);
    expect(blockedByPain(shoulderRoll, [{ bodyRegion: 'knee' }])).toBe(false);
    expect(blockedByPain(shoulderRoll, [])).toBe(false);
  });
});

describe('corrective tag mapping (NASM truth)', () => {
  it('maps screen compensations to crossed-syndrome tags', () => {
    expect(correctiveTagsFrom(['forward_head', 'anterior_pelvic_tilt', 'knee_valgus']))
      .toEqual(expect.arrayContaining([
        'upper_crossed_syndrome', 'lower_crossed_syndrome', 'pronation_distortion_syndrome',
      ]));
  });
  it('unknown compensations produce no invented tags', () => {
    expect(correctiveTagsFrom(['something_novel'])).toEqual([]);
  });
});

describe('composeBlocks — the hard provenance law', () => {
  const base = {
    recentLoad: [{ muscle: 'lats', count: 3, lastTrainedLocalDate: '2026-07-20' }],
    correctiveTags: ['upper_crossed_syndrome'],
    painEntries: [],
    nextUpMuscles: [],
    nextUpFocus: null,
    goalText: null,
    mode: 'full',
  };

  it('every emitted item carries at least one real-data why[]', () => {
    const candidates = [
      exercise({ id: 'smr', cesProtocolStep: 'inhibit', primaryMuscles: JSON.stringify(['lats']) }),
      exercise({ id: 'stretch', exerciseType: 'flexibility', primaryMuscles: JSON.stringify(['lats']) }),
      exercise({ id: 'act', cesProtocolStep: 'activate', exerciseType: 'stability', nasmCorrectiveCategory: JSON.stringify(['upper_crossed_syndrome']), primaryMuscles: JSON.stringify(['rhomboids']) }),
    ];
    const blocks = composeBlocks({ ...base, candidates });
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.items.length).toBeGreaterThan(0);
      for (const item of block.items) {
        expect(item.why.length).toBeGreaterThan(0);
        expect(item.dataSources.length).toBeGreaterThan(0);
      }
    }
  });

  it('an exercise with NO real-data trigger is never emitted', () => {
    const untriggered = exercise({ id: 'x', cesProtocolStep: 'inhibit', primaryMuscles: JSON.stringify(['calves']) });
    const blocks = composeBlocks({ ...base, correctiveTags: [], candidates: [untriggered] });
    expect(blocks).toEqual([]);
  });

  it('H4: empty blocks are suppressed, never rendered as husks', () => {
    const onlyStretch = exercise({ id: 's', exerciseType: 'flexibility', primaryMuscles: JSON.stringify(['lats']) });
    const blocks = composeBlocks({ ...base, candidates: [onlyStretch] });
    expect(blocks.map((b) => b.key)).toEqual(['lengthen']);
  });

  it('cardio appears ONLY with a stated fat-loss-class goal (real-data gate)', () => {
    const bike = exercise({ id: 'bike', exerciseType: 'stability', cesProtocolStep: null, bodyPartCategory: 'cardio', primaryMuscles: JSON.stringify(['heart']) });
    const without = composeBlocks({ ...base, candidates: [bike] });
    expect(without.find((b) => b.key === 'cardio')).toBeUndefined();
    const withGoal = composeBlocks({ ...base, goalText: 'lose body fat and tone up', candidates: [bike] });
    expect(withGoal.find((b) => b.key === 'cardio')).toBeDefined();
  });

  it('strip mode drops activate and cardio (cooldown tools only)', () => {
    const candidates = [
      exercise({ id: 'smr', cesProtocolStep: 'inhibit', primaryMuscles: JSON.stringify(['lats']) }),
      exercise({ id: 'act', cesProtocolStep: 'activate', exerciseType: 'stability', nasmCorrectiveCategory: JSON.stringify(['upper_crossed_syndrome']) , primaryMuscles: JSON.stringify(['rhomboids']) }),
      exercise({ id: 'bike', exerciseType: 'stability', bodyPartCategory: 'cardio', primaryMuscles: JSON.stringify(['heart']) }),
    ];
    const blocks = composeBlocks({ ...base, goalText: 'fat loss', mode: 'strip', candidates });
    expect(blocks.map((b) => b.key)).toEqual(['inhibit']);
  });

  it('pain entries filter items out of every block', () => {
    const latRoll = exercise({ id: 'smr', cesProtocolStep: 'inhibit', primaryMuscles: JSON.stringify(['lats']) });
    const blocks = composeBlocks({ ...base, painEntries: [{ bodyRegion: 'lat' }], candidates: [latRoll] });
    expect(blocks).toEqual([]);
  });

  it('conflict: tomorrow-leg-day excludes glute activation but keeps glute SMR', () => {
    const gluteActivate = exercise({ id: 'ga', cesProtocolStep: 'activate', exerciseType: 'stability', nasmCorrectiveCategory: JSON.stringify(['upper_crossed_syndrome']), primaryMuscles: JSON.stringify(['glutes']) });
    const gluteRoll = exercise({ id: 'gr', cesProtocolStep: 'inhibit', primaryMuscles: JSON.stringify(['glutes']) });
    const blocks = composeBlocks({
      ...base,
      recentLoad: [{ muscle: 'glutes', count: 2, lastTrainedLocalDate: '2026-07-20' }],
      nextUpMuscles: ['glutes'],
      nextUpFocus: 'Leg Day',
      candidates: [gluteActivate, gluteRoll],
    });
    const keys = blocks.map((b) => b.key);
    expect(keys).toContain('inhibit');
    expect(keys).not.toContain('activate');
  });
});
