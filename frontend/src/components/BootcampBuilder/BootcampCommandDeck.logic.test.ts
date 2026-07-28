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

  it('turns insufficient equipment evidence into launch-readiness repair work', () => {
    const classWithShortage = bootcamp({
      exercises: Array.from({ length: 16 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 4), true)),
      equipmentReadiness: {
        type: 'insufficient_equipment',
        code: 'insufficient_equipment',
        severity: 'warning',
        allowedCount: 12,
        rejectedCount: 8,
        requiredSlots: 16,
        missingEquipmentCounts: { sled: 3, rower: 1 },
        message: 'Selected equipment profile cannot fill every planned station slot.',
      },
    });

    const model = getBootcampCommandDeckModel(classWithShortage, 'hybrid', false);

    expect(model.equipmentShortage).toBe(true);
    expect(model.equipmentAlertLabel).toBe('Equipment shortage: sled, rower');
    expect(model.nextAction).toBe('Add or map equipment: sled, rower');
    expect(model.repairQueue).toContain('Add or map equipment: sled, rower');
    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Equipment', value: '12/16' }),
    ]));
  });
  it('does not treat profile-applied warnings as shortages when enough equipment-backed exercises remain', () => {
    const profileWarning = bootcamp({
      exercises: Array.from({ length: 16 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 4), true)),
      equipmentReadiness: {
        type: 'equipment',
        code: 'equipment_profile_applied',
        severity: 'warning',
        allowedCount: 16,
        rejectedCount: 2,
        requiredSlots: 16,
        missingEquipmentCounts: {},
        message: 'Equipment profile applied with caution.',
      },
    });

    const model = getBootcampCommandDeckModel(profileWarning, 'hybrid', false);

    expect(model.equipmentShortage).toBe(false);
    expect(model.equipmentAlertLabel).toBeNull();
    expect(model.nextAction).toBe('Save template, export PDF, or launch Demo Mode.');
    expect(model.repairQueue).toEqual([]);
    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Equipment', value: '16/16', detail: '2 filtered out' }),
    ]));
  });

  it('uses backend readiness messages when shortage counts have no equipment names', () => {
    const classWithMessageOnlyShortage = bootcamp({
      exercises: Array.from({ length: 16 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 4), true)),
      equipmentReadiness: {
        type: 'equipment',
        code: 'equipment_profile_applied',
        severity: 'info',
        allowedCount: 8,
        rejectedCount: 8,
        requiredSlots: 16,
        missingEquipmentCounts: {},
        message: 'Only 8 compatible exercises remain for 16 planned slots.',
      },
    });

    const model = getBootcampCommandDeckModel(classWithMessageOnlyShortage, 'hybrid', false);

    expect(model.equipmentShortage).toBe(true);
    expect(model.equipmentAlertLabel).toBe('Only 8 compatible exercises remain for 16 planned slots.');
    expect(model.nextAction).toBe('Only 8 compatible exercises remain for 16 planned slots.');
    expect(model.repairQueue).toContain('Only 8 compatible exercises remain for 16 planned slots.');
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

  it('builds an ordered repair queue for coach and trainer fixes', () => {
    const needsRepair = bootcamp({
      totalClassMin: 60,
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

    const model = getBootcampCommandDeckModel(needsRepair, 'manual', false);

    expect(model.repairQueue).toEqual([
      'Fill S3',
      'Fill S4',
      'Finish S1 to 4 exercises',
      'Finish S2 to 4 exercises',
      'Add 2 demo videos',
      'Trim 5 minutes from class time',
      'Review 1 flow bottleneck',
    ]);
  });

  it('uses stationCount as the floor-plan source when station metadata is partial', () => {
    const partialStations = bootcamp({
      stations: bootcamp().stations.slice(0, 2),
      exercises: [
        exercise('Push-Up', 0, true),
        exercise('Squat', 1, true),
      ],
    });

    const model = getBootcampCommandDeckModel(partialStations, 'manual', false);

    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Stations', value: '0/4 live' }),
    ]));
    expect(model.repairQueue).toEqual([
      'Fill S3',
      'Fill S4',
      'Finish S1 to 4 exercises',
      'Finish S2 to 4 exercises',
    ]);
  });

  it('uses custom exercises per station for trainer-selected bootcamp structures', () => {
    const custom = bootcamp({
      classFormat: 'custom',
      stationCount: 6,
      exercisesPerStation: 5,
      stations: [1, 2, 3, 4, 5, 6].map((stationNumber) => ({
        stationNumber,
        stationName: `Station ${stationNumber}`,
        equipmentNeeded: null,
        sortOrder: stationNumber,
      })),
      exercises: Array.from({ length: 30 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 5), true)),
    });

    const model = getBootcampCommandDeckModel(custom, 'manual', false);

    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Stations',
        value: '6/6 live',
        detail: '5 exercises per station',
      }),
    ]));
    expect(model.repairQueue).not.toContain('Finish S1 to 4 exercises');
  });

  it('counts overflow station assignments instead of hiding them from readiness', () => {
    const expandedStations = bootcamp({
      stationCount: 4,
      exercises: [
        exercise('Sled Push', 4, true),
      ],
    });

    const model = getBootcampCommandDeckModel(expandedStations, 'manual', false);

    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Stations', value: '0/5 live' }),
    ]));
    expect(model.repairQueue).toEqual([
      'Fill S1',
      'Fill S2',
      'Fill S3',
      'Fill S4',
      'Finish S5 to 4 exercises',
    ]);
  });

  it('normalizes malformed station indexes into visible repair work', () => {
    const malformedStations = bootcamp({
      exercises: [
        { ...exercise('Battle Rope', -1, true), stationIndex: -1 },
        { ...exercise('Bear Crawl', 2.8, false), stationIndex: 2.8 },
      ],
    });

    const model = getBootcampCommandDeckModel(malformedStations, 'manual', false);

    expect(model.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Demo media', value: '1/2' }),
    ]));
    expect(model.repairQueue).toEqual([
      'Fill S2',
      'Fill S4',
      'Finish S1 to 4 exercises',
      'Finish S3 to 4 exercises',
      'Add 1 demo video',
    ]);
  });
});
