/**
 * BootcampDemoMode.floorDirector.test.ts
 * PURPOSE: Locks the TV/mobile floor-director model for station focus controls.
 */
import { describe, expect, it } from 'vitest';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { getFloorDirectorModel } from './BootcampDemoMode.floorDirector';

const exercise = (name: string, stationIndex: number, media = false): BootcampExercise => ({
  exerciseName: name,
  durationSec: 40,
  restSec: 15,
  sortOrder: stationIndex * 10,
  isCardioFinisher: false,
  muscleTargets: 'full_body',
  easyVariation: null,
  mediumVariation: null,
  hardVariation: null,
  kneeMod: null,
  shoulderMod: null,
  ankleMod: null,
  wristMod: null,
  backMod: null,
  elbowMod: null,
  footMod: null,
  hipMod: null,
  description: null,
  equipmentRequired: null,
  stationIndex,
  videoUrl: media ? `https://video.example/${name}.mp4` : null,
});

const bootcamp = (): GeneratedBootcamp => ({
  name: 'Thursday Bootcamp',
  classFormat: '4x4_r2',
  classStyle: 'standard',
  dayType: 'full_body',
  stationCount: 4,
  targetDuration: 40,
  totalWorkoutMin: 40,
  demoDuration: 5,
  clearDuration: 5,
  stretchDurationMin: 3,
  totalClassMin: 53,
  expectedParticipants: 16,
  includeStretch: true,
  stations: [1, 2, 3, 4].map((stationNumber) => ({
    stationNumber,
    stationName: `Station ${stationNumber}`,
    equipmentNeeded: null,
    sortOrder: stationNumber,
  })),
  exercises: [
    exercise('Push-Up', 0, true),
    exercise('Squat', 0, false),
    exercise('Row', 1, true),
    exercise('Lunge', 1, false),
  ],
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
});

describe('getFloorDirectorModel', () => {
  it('summarizes station focus and demo readiness for the floor board', () => {
    const model = getFloorDirectorModel(bootcamp(), 1);

    expect(model.summaryLabel).toBe('2/4 demos ready');
    expect(model.activeStationName).toBe('Station 2');
    expect(model.primaryCue).toBe('Station 2 needs 1 demo video');
    expect(model.stationCards).toEqual([
      expect.objectContaining({ stationIndex: 0, stationName: 'Station 1', readinessLabel: '1/2 demos', isActive: false }),
      expect.objectContaining({ stationIndex: 1, stationName: 'Station 2', readinessLabel: '1/2 demos', isActive: true }),
      expect.objectContaining({ stationIndex: 2, stationName: 'Station 3', readinessLabel: '0/0 demos', isActive: false }),
      expect.objectContaining({ stationIndex: 3, stationName: 'Station 4', readinessLabel: '0/0 demos', isActive: false }),
    ]);
  });

  it('keeps stationCount slots visible when station metadata is partial', () => {
    const partial = {
      ...bootcamp(),
      stations: bootcamp().stations.slice(0, 2),
      exercises: [exercise('Step-Up', 2, false)],
    };

    const model = getFloorDirectorModel(partial, 2);

    expect(model.stationCards).toHaveLength(4);
    expect(model.activeStationName).toBe('Station 3');
    expect(model.primaryCue).toBe('Station 3 needs 1 demo video');
    expect(model.stationCards[2]).toEqual(expect.objectContaining({
      stationIndex: 2,
      stationName: 'Station 3',
      readinessLabel: '0/1 demos',
      isActive: true,
    }));
  });

  it('does not hide exercises assigned beyond saved station metadata', () => {
    const expanded = {
      ...bootcamp(),
      stationCount: 4,
      exercises: [exercise('Sled Push', 4, true)],
    };

    const model = getFloorDirectorModel(expanded, 4);

    expect(model.stationCards).toHaveLength(5);
    expect(model.activeStationName).toBe('Station 5');
    expect(model.summaryLabel).toBe('1/1 demos ready');
    expect(model.stationCards[4]).toEqual(expect.objectContaining({
      stationIndex: 4,
      stationName: 'Station 5',
      readinessLabel: '1/1 demos',
      isActive: true,
    }));
  });

  it('keeps malformed station assignments visible on the first station', () => {
    const malformed = {
      ...bootcamp(),
      exercises: [
        { ...exercise('Battle Rope', -1, true), stationIndex: -1 },
        { ...exercise('Bear Crawl', 2.8, false), stationIndex: 2.8 },
      ],
    };

    const model = getFloorDirectorModel(malformed, 0);

    expect(model.summaryLabel).toBe('1/2 demos ready');
    expect(model.stationCards[0]).toEqual(expect.objectContaining({
      stationName: 'Station 1',
      readinessLabel: '1/1 demos',
    }));
    expect(model.stationCards[2]).toEqual(expect.objectContaining({
      stationName: 'Station 3',
      readinessLabel: '0/1 demos',
    }));
  });
});
