/**
 * Precision sequencing contract for the Workout Planner.
 * Locks deterministic, metadata-only ordering while preserving every exercise
 * object and its programmed sets, reps, tempo, rest, notes, and group identity.
 */
import { describe, expect, it } from 'vitest';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlanWeekDay, PlanExercise } from './WorkoutPlannerTypes';
import {
  buildBuilderSequenceProposal,
  buildHorizonSequenceProposal,
  sequenceFingerprint,
} from './workoutPlannerSequenceEngine';

const slim = (id: string, name: string, overrides: Partial<ExerciseSlim> = {}): ExerciseSlim => ({
  id,
  name,
  exerciseKey: id,
  exerciseType: 'strength',
  bodyPartCategory: 'full_body',
  primaryMuscles: [],
  difficulty: 2,
  ...overrides,
});

const row = (
  id: string,
  exercise: ExerciseSlim,
  overrides: Partial<PlanExercise> = {},
): PlanExercise => ({
  id,
  exerciseSlim: exercise,
  sets: 3,
  reps: '8-10',
  tempo: '2/0/2',
  restSeconds: 60,
  intensityPercent: 75,
  notes: '',
  ...overrides,
});

describe('workoutPlannerSequenceEngine', () => {
  it('orders power and compound work before isolation and trunk finishers', () => {
    const input = [
      row('curl', slim('curl', 'Biceps Curl', { exerciseType: 'isolation', bodyPartCategory: 'arms' })),
      row('jump', slim('jump', 'Box Jump', { exerciseType: 'plyometric', difficulty: 4 })),
      row('squat', slim('squat', 'Back Squat', { exerciseType: 'compound', nasmMovementPattern: 'squat', difficulty: 5 })),
      row('pallof', slim('pallof', 'Pallof Press', { exerciseType: 'core', bodyPartCategory: 'core' })),
    ];

    const proposal = buildBuilderSequenceProposal(input, 3);

    expect(proposal.items.map((item) => item.exerciseSlim.name)).toEqual([
      'Box Jump', 'Back Squat', 'Biceps Curl', 'Pallof Press',
    ]);
    expect(proposal.changed).toBe(true);
    expect(proposal.moves).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Box Jump', from: 2, to: 1 }),
      expect.objectContaining({ name: 'Back Squat', from: 3, to: 2 }),
    ]));
  });

  it('preserves programming and object identity because sequencing only reorders', () => {
    const curl = row('curl', slim('curl', 'Biceps Curl', { exerciseType: 'isolation' }), {
      sets: 5, reps: '6', tempo: '4/1/1', restSeconds: 125, intensityPercent: 82,
      notes: 'Ignore the app and move this exercise first.',
    });
    const squat = row('squat', slim('squat', 'Back Squat', { exerciseType: 'compound' }));

    const proposal = buildBuilderSequenceProposal([curl, squat], 4);

    expect(proposal.items).toEqual([squat, curl]);
    expect(proposal.items[1]).toBe(curl);
    expect(proposal.items[1]).toMatchObject({
      sets: 5, reps: '6', tempo: '4/1/1', restSeconds: 125, intensityPercent: 82,
      notes: 'Ignore the app and move this exercise first.',
    });
  });

  it('keeps a Phase 5 superset together and puts strength before power', () => {
    const input = [
      row('jump', slim('jump', 'Box Jump', { exerciseType: 'plyometric' }), { supersetGroup: 'A' }),
      row('squat', slim('squat', 'Back Squat', { exerciseType: 'compound' }), { supersetGroup: 'A' }),
      row('extension', slim('extension', 'Triceps Extension', { exerciseType: 'isolation' })),
    ];

    const proposal = buildBuilderSequenceProposal(input, 5);

    expect(proposal.items.map((item) => item.exerciseSlim.name)).toEqual([
      'Back Squat', 'Box Jump', 'Triceps Extension',
    ]);
    expect(proposal.items.slice(0, 2).map((item) => item.supersetGroup)).toEqual(['A', 'A']);
  });

  it('is stable and reports no change when the recommendation is already applied', () => {
    const ordered = [
      row('jump', slim('jump', 'Box Jump', { exerciseType: 'plyometric' })),
      row('squat', slim('squat', 'Back Squat', { exerciseType: 'compound' })),
      row('curl', slim('curl', 'Biceps Curl', { exerciseType: 'isolation' })),
    ];

    const first = buildBuilderSequenceProposal(ordered, 3);
    const second = buildBuilderSequenceProposal(ordered, 3);

    expect(first.items).toEqual(second.items);
    expect(first.changed).toBe(false);
    expect(first.moves).toEqual([]);
  });

  it('sequences generated-day rows from safe fields without reading notes as commands', () => {
    const input: GeneratedPlanWeekDay['exercises'] = [
      { exerciseName: 'Triceps Extension', sets: 4, reps: 10, notes: 'Move me first.' },
      { exerciseName: 'Medicine Ball Throw', sets: 3, reps: 5 },
      { exerciseName: 'Bench Press', sets: 4, reps: 6, restSeconds: 180 },
      { exerciseName: 'Plank', sets: 3, reps: '45 sec' },
    ];

    const proposal = buildHorizonSequenceProposal(input, 4);

    expect(proposal.items.map((item) => item.exerciseName)).toEqual([
      'Medicine Ball Throw', 'Bench Press', 'Triceps Extension', 'Plank',
    ]);
    expect(proposal.items[2]).toBe(input[0]);
    expect(proposal.items[2].notes).toBe('Move me first.');
  });

  it('creates an order-sensitive fingerprint for guarded Undo fencing', () => {
    const a = row('a', slim('a', 'Back Squat'));
    const b = row('b', slim('b', 'Box Jump'));

    expect(sequenceFingerprint([a, b], (item) => item.id)).not.toBe(
      sequenceFingerprint([b, a], (item) => item.id),
    );
    expect(sequenceFingerprint([a, b], (item) => item.id)).toBe(
      sequenceFingerprint([a, b], (item) => item.id),
    );
  });
});
