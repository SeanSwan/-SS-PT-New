import { describe, expect, it } from 'vitest';
import type { GeneratedBootcamp, BootcampExercise } from '../../hooks/useBootcampAPI';
import { getBootcampCommandDeckModel } from './BootcampCommandDeck.logic';

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

const bootcamp = (overrides: Partial<GeneratedBootcamp> = {}): GeneratedBootcamp => ({
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
  exercises: [],
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
  ...overrides,
});

describe('getBootcampCommandDeckModel', () => {
  it('grades a complete media-covered four-station class as TV-ready', () => {
    const complete = bootcamp({
      exercises: Array.from({ length: 16 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 4), true)),
      flowData: [1, 2, 3, 4].map((station) => ({
        station,
        name: `Station ${station}`,
        maxSetupSec: 5,
        avgSetupSec: 4,
        flowScore: 96,
        bottleneck: false,
      })),
    });

    const model = getBootcampCommandDeckModel(complete, 'hybrid', false);

    expect(model.readinessLabel).toBe('TV-ready');
    expect(model.nextAction).toBe('Save template, export PDF, or launch Demo Mode.');
    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Stations', value: '4/4 live' }),
        expect.objectContaining({ label: 'Demo media', value: '16/16' }),
        expect.objectContaining({ label: 'Mode', value: 'Hybrid' }),
      ]),
    );
  });

  it('surfaces the first weak station before timing or media polish', () => {
    const weakStation = bootcamp({
      totalClassMin: 58,
      exercises: [
        exercise('Push-Up', 0, true),
        exercise('Squat', 1, false),
        exercise('Row', 1, false),
      ],
      flowData: [{
        station: 2,
        name: 'Station 2',
        maxSetupSec: 20,
        avgSetupSec: 16,
        flowScore: 58,
        bottleneck: true,
      }],
    });

    const model = getBootcampCommandDeckModel(weakStation, 'manual', false);

    expect(model.readinessLabel).toBe('Build required');
    expect(model.nextAction).toBe('Fill Station 3 before saving.');
    expect(model.missingDemoCount).toBe(2);
    expect(model.bottleneckCount).toBe(1);
  });
});
