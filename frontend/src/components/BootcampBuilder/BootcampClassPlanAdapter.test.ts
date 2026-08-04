import { describe, expect, it } from 'vitest';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { expandGeneratedBootcampSegments, getGeneratedBootcampRuntimeSec, toPortableClassPlan } from './BootcampClassPlanAdapter';

const exercise = (name: string, stationIndex: number, sortOrder: number) => ({
  exerciseName: name, stationIndex, sortOrder, durationSec: 40, restSec: 15,
  isCardioFinisher: false, muscleTargets: 'full_body', easyVariation: null,
  mediumVariation: null, hardVariation: null, kneeMod: null, shoulderMod: null,
  ankleMod: null, wristMod: null, elbowMod: null, footMod: null, hipMod: null,
  backMod: null, description: null, equipmentRequired: null,
});

const generated = (overrides: Partial<GeneratedBootcamp> = {}): GeneratedBootcamp => ({
  name: 'Portable Circuit', classFormat: 'custom', dayType: 'full_body', stationCount: 2,
  exercisesPerStation: 2, rounds: 2, exerciseDurationSec: 40, targetDuration: 20,
  totalWorkoutMin: 12, demoDuration: 1, clearDuration: 1, totalClassMin: 15,
  expectedParticipants: 8,
  stations: [1, 2].map((stationNumber) => ({ stationNumber,
    stationName: `Station ${stationNumber}`, equipmentNeeded: null, sortOrder: stationNumber })),
  exercises: [exercise('Push-Up', 0, 0), exercise('Row', 1, 0),
    exercise('Squat', 0, 1), exercise('Carry', 1, 1)],
  stretches: [{ exerciseName: 'Worlds Greatest Stretch', targetMuscles: 'full_body',
    durationSec: 30, sortOrder: 1 }],
  overflowPlan: null, flowData: [], explanations: [], aiGenerated: false, ...overrides,
});

describe('GeneratedBootcamp portable ClassPlan adapter', () => {
  it('maps station payloads into the shared ClassPlan contract', () => {
    const plan = toPortableClassPlan(generated());
    expect(plan.structure).toMatchObject({
      shape: 'stations', stationCount: 2, exercisesPerStation: 2, rounds: 2,
    });
    expect(plan.blocks.map((block) => block.kind)).toEqual(['warmup', 'work', 'cooldown']);
    expect(plan.blocks[1].slots).toHaveLength(4);
  });

  it('keeps a declared trainer-led flexibility phase when no stretch rows exist', () => {
    const segments = expandGeneratedBootcampSegments(generated({
      stretches: [],
      stretchDurationMin: 3,
    }));

    expect(segments.slice(0, 2)).toEqual([
      expect.objectContaining({ label: 'Coach Demo', durationSec: 60 }),
      expect.objectContaining({ label: 'Flexibility Prep', durationSec: 180 }),
    ]);
    expect(getGeneratedBootcampRuntimeSec(generated({
      stretches: [],
      stretchDurationMin: 3,
    }))).toBe(770);
  });
  it('uses shared timeline semantics: work is simultaneous and rotations happen per visit', () => {
    const segments = expandGeneratedBootcampSegments(generated());
    const work = segments.filter((segment) => segment.phase === 'work');
    const transitions = segments.filter((segment) => segment.phase === 'station_transition');
    expect(work).toHaveLength(2 * 2 * 2);
    expect(work.every((segment) => segment.slotId === null)).toBe(true);
    expect(transitions).toHaveLength(2 * 2 - 1);
    expect(getGeneratedBootcampRuntimeSec(generated())).toBe(620);
  });
});