import { describe, expect, it } from 'vitest';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import {
  getBootcampClassRailModel,
  getNextBootcampStage,
  type BootcampWorkflowStage,
} from './BootcampClassRail.logic';

const plan = (overrides: Partial<GeneratedBootcamp> = {}): GeneratedBootcamp => ({
  name: 'Saturday Strength Lab',
  classFormat: 'custom',
  classStyle: 'standard',
  dayType: 'upper_body',
  stationCount: 4,
  exercisesPerStation: 1,
  rounds: 3,
  exerciseDurationSec: 40,
  targetDuration: 45,
  totalWorkoutMin: 40,
  demoDuration: 5,
  clearDuration: 5,
  totalClassMin: 53,
  expectedParticipants: 12,
  stations: [1, 2, 3, 4].map((stationNumber) => ({
    stationNumber,
    stationName: `Station ${stationNumber}`,
    equipmentNeeded: null,
    sortOrder: stationNumber,
  })),
  exercises: [0, 1, 2, 3].map((stationIndex) => ({
    exerciseName: `Exercise ${stationIndex + 1}`,
    durationSec: 40,
    restSec: 15,
    sortOrder: stationIndex,
    isCardioFinisher: false,
    muscleTargets: 'upper_body',
    easyVariation: null,
    mediumVariation: null,
    hardVariation: null,
    kneeMod: null,
    shoulderMod: null,
    ankleMod: null,
    wristMod: null,
    elbowMod: null,
    footMod: null,
    hipMod: null,
    backMod: null,
    description: null,
    equipmentRequired: null,
    stationIndex,
  })),
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
  ...overrides,
});

describe('Crystalline Class Rail model', () => {
  it('keeps Preflight and Run unavailable until a class exists', () => {
    const model = getBootcampClassRailModel(null, 'build');

    expect(model.stages.map(({ id, available }) => [id, available])).toEqual([
      ['build', true],
      ['preflight', false],
      ['run', false],
    ]);
    expect(model.primaryAction).toMatchObject({
      label: 'Build a class to continue',
      disabled: true,
    });
  });

  it('allows Preflight while separating hard blockers from recoverable warnings', () => {
    const incomplete = plan({
      exercises: [
        {
          ...plan().exercises[0],
          videoUrl: null,
          previewVideoUrl: null,
          stationIndex: 0,
        },
      ],
    });

    const model = getBootcampClassRailModel(incomplete, 'preflight');

    expect(model.hardBlockers).toEqual([
      'Station 2 has no main-board exercise.',
      'Station 3 has no main-board exercise.',
      'Station 4 has no main-board exercise.',
    ]);
    expect(model.warnings).toContain('1 exercise has no demo media.');
    expect(model.stages.find(({ id }) => id === 'preflight')?.available).toBe(true);
    expect(model.stages.find(({ id }) => id === 'run')?.available).toBe(false);
    expect(model.primaryAction.label).toBe('Resolve 3 blockers');
  });

  it('makes a complete class run-ready even when demo media is missing', () => {
    const model = getBootcampClassRailModel(plan(), 'preflight');

    expect(model.hardBlockers).toEqual([]);
    expect(model.warnings).toContain('4 exercises have no demo media.');
    expect(model.stages.find(({ id }) => id === 'run')?.available).toBe(true);
    expect(model.primaryAction).toMatchObject({
      label: 'Start Class',
      targetStage: 'run',
      disabled: false,
    });
    expect(model.facts).toEqual(expect.arrayContaining([
      { label: 'Rotation', value: 'Upper Body' },
      { label: 'Stations', value: '4' },
      { label: 'Capacity', value: '12' },
      { label: 'Planned', value: '24 min' },
    ]));
  });

  it('uses the compiled runtime when warning about the 55-minute class window', () => {
    const model = getBootcampClassRailModel(plan({
      rounds: 20,
      totalClassMin: 50,
    }), 'preflight');

    expect(model.warnings).toContain('The plan is 48 minutes over the 55-minute window.');
  });
  it('uses an explicit stage progression instead of skipping Preflight', () => {
    const stages: BootcampWorkflowStage[] = ['build', 'preflight', 'run'];

    expect(stages.map((stage) => getNextBootcampStage(plan(), stage))).toEqual([
      'preflight',
      'run',
      'run',
    ]);
    expect(getNextBootcampStage(null, 'build')).toBe('build');
  });

  // ── R-H20 (contract §6 line 264): the progression record finally HAS a consumer ──
  describe('the work-interval budget reaches Preflight (F1/F2 lock)', () => {
    it('blocks Run when the server refused to certify the class', () => {
      // Before this, `certifiable:false` was read by NOTHING: the class persisted, the slot
      // was `generated`, and Run stayed available — §6 line 264's "return a Preflight budget
      // failure rather than certify" was unimplemented.
      const model = getBootcampClassRailModel(plan({
        progression: {
          requestedModifier: 1.4,
          budgetStatus: 'budget_failure',
          certifiable: false,
          reason: 'budget_failure',
        },
      }), 'preflight');

      expect(model.hardBlockers).toHaveLength(1);
      expect(model.hardBlockers[0]).toContain('cannot fit even the baseline work interval');
      expect(model.stages.find(({ id }) => id === 'run')?.available).toBe(false);
      expect(model.primaryAction.label).toBe('Resolve 1 blocker');
      // …and the rail cannot advance past Preflight either.
      expect(getNextBootcampStage(plan({
        progression: { budgetStatus: 'budget_failure', certifiable: false },
      }), 'preflight')).toBe('preflight');
    });

    it('warns — but does NOT block — when an increase was applied unchecked', () => {
      // full_group / circuit / hybrid carry `exercisesPerStation: null`, so the server cannot
      // compute a work-slot count: the increase applies and the record says
      // `budgetStatus:'not_checked'`. A truthful capability limit, not a failure.
      const model = getBootcampClassRailModel(plan({
        progression: {
          requestedModifier: 1.05,
          applied: true,
          budgetStatus: 'not_checked',
          budgetNotCheckedReason: 'budget_inputs_unavailable',
        },
      }), 'preflight');

      expect(model.hardBlockers).toEqual([]);
      expect(model.warnings).toContain(
        'The time budget for the increased work interval could not be verified for this class format.',
      );
      expect(model.stages.find(({ id }) => id === 'run')?.available).toBe(true);
    });

    it('stays quiet for the unchecked cases that changed nothing', () => {
      // A paced protocol keeps its exact timing, a no-change week applies nothing, a reduction
      // shortens the class, and a checked budget is not unchecked at all. None of them can
      // overrun BECAUSE of progression, so the rail must not cry wolf on every class.
      for (const progression of [
        { requestedModifier: 1.4, applied: false, budgetStatus: 'not_checked' as const, reason: 'unsupported_protocol' },
        { requestedModifier: 1, applied: false, budgetStatus: 'not_checked' as const },
        { requestedModifier: 0.7, applied: true, budgetStatus: 'not_checked' as const },
        { requestedModifier: 1.4, applied: true, budgetStatus: 'within_budget' as const, certifiable: true },
      ]) {
        const model = getBootcampClassRailModel(plan({ progression }), 'preflight');
        expect(model.hardBlockers).toEqual([]);
        expect(model.warnings).not.toContain(
          'The time budget for the increased work interval could not be verified for this class format.',
        );
      }
    });
  });

  it('switches to compact station facts above the four-card room view', () => {
    const expanded = plan({
      stationCount: 6,
      stations: [1, 2, 3, 4, 5, 6].map((stationNumber) => ({
        stationNumber,
        stationName: `Station ${stationNumber}`,
        equipmentNeeded: null,
        sortOrder: stationNumber,
      })),
      exercises: [0, 1, 2, 3, 4, 5].map((stationIndex) => ({
        ...plan().exercises[0],
        exerciseName: `Exercise ${stationIndex + 1}`,
        stationIndex,
        sortOrder: stationIndex,
      })),
    });

    expect(getBootcampClassRailModel(expanded, 'build').stationDensity).toBe('compact');
  });
});
