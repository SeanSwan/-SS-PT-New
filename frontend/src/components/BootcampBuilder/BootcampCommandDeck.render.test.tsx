import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import BootcampCommandDeck from './BootcampCommandDeck';

const exercise = (name: string, stationIndex: number): BootcampExercise => ({
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
  videoUrl: `https://video.example/${name}.mp4`,
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
  exercises: Array.from({ length: 16 }, (_, index) => exercise(`Exercise ${index + 1}`, Math.floor(index / 4))),
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
  equipmentReadiness: {
    type: 'insufficient_equipment',
    code: 'insufficient_equipment',
    severity: 'warning',
    allowedCount: 12,
    rejectedCount: 4,
    requiredSlots: 16,
    missingEquipmentCounts: { sled: 3 },
    message: 'Selected equipment profile cannot fill every planned station slot.',
  },
});

describe('BootcampCommandDeck render', () => {
  it('renders equipment alert and repair queue chips from the command model', () => {
    render(<BootcampCommandDeck bootcamp={bootcamp()} buildMode="hybrid" floorMode={false} />);

    expect(screen.getByLabelText('Bootcamp readiness warnings')).toHaveTextContent('Equipment shortage: sled');
    expect(screen.getByLabelText('Bootcamp repair queue')).toHaveTextContent('Add or map equipment: sled');
  });
});
