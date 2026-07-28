import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import BootcampDemoMode from './BootcampDemoMode';

const exercise = (name: string, stationIndex: number, media: Partial<BootcampExercise> = {}): BootcampExercise => ({
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
  ...media,
});

const bootcamp = (): GeneratedBootcamp => ({
  name: 'Floor Mode Class',
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
    exercise('Push-Up', 0, { videoUrl: 'https://r2.example.com/push-up.mp4' }),
    exercise('Row', 1, { previewVideoUrl: 'https://r2.example.com/row-loop.webm' }),
  ],
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
});

describe('BootcampDemoMode floor director rendering', () => {
  it('drives station focus with buttons and arrow-key remote controls', () => {
    render(<BootcampDemoMode bootcamp={bootcamp()} onSelectExercise={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Focus' }));
    fireEvent.click(screen.getByRole('button', { name: /Focus Station 2/i }));

    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('Station 2');
    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('1/1 demos');
    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('Class 2/2 demos ready');
    expect(screen.getByText('1. Row')).toBeInTheDocument();
    expect(screen.queryByText('1. Push-Up')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('Floor director controls'), { key: 'ArrowRight' });

    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('Station 3');
    expect(screen.getByText('No exercises assigned to this station yet.')).toBeInTheDocument();
    expect(screen.queryByText('1. Row')).not.toBeInTheDocument();
  });

  it('renders structured rep schemes when functional programming intent is present', () => {
    const functional = {
      ...bootcamp(),
      exercises: [
        exercise('Dumbbell Thruster', 0, {
          programmingIntent: {
            type: 'functional_circuit',
            prescriptionLabel: '25-20-15-9 reps',
            scheme: '25-20-15-9',
          },
        }),
      ],
    };

    render(<BootcampDemoMode bootcamp={functional} onSelectExercise={vi.fn()} />);

    expect(screen.getByText('25-20-15-9 reps / 15s rest')).toBeInTheDocument();
  });

  it('marks a failed short-loop preview as unavailable instead of ready', () => {
    render(<BootcampDemoMode bootcamp={bootcamp()} onSelectExercise={vi.fn()} />);

    fireEvent.error(screen.getByLabelText('Row exercise demo preview'));

    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    expect(screen.getByText('Preview could not load. Update this loop from the SwanStudios Rolodex.')).toBeInTheDocument();
  });

  it('renders station controls for exercise assignments beyond saved station metadata', () => {
    const expanded = {
      ...bootcamp(),
      stationCount: 4,
      exercises: [
        exercise('Sled Push', 4, { videoUrl: 'https://r2.example.com/sled-push.mp4' }),
      ],
    };

    render(<BootcampDemoMode bootcamp={expanded} onSelectExercise={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Focus Station 5/i }));

    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('Station 5');
    expect(screen.getByText('1. Sled Push')).toBeInTheDocument();
  });

  it('keeps rendered station cards on unique keys when inferred stations extend the class', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const expanded = {
      ...bootcamp(),
      stationCount: 4,
      exercises: [
        exercise('Sled Push', 4, { videoUrl: 'https://r2.example.com/sled-push.mp4' }),
      ],
    };

    try {
      render(<BootcampDemoMode bootcamp={expanded} onSelectExercise={vi.fn()} />);
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain('Encountered two children with the same key');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps malformed station-index exercises visible on the floor board', () => {
    const malformed = {
      ...bootcamp(),
      exercises: [
        { ...exercise('Battle Rope', -1, { videoUrl: 'https://r2.example.com/battle-rope.mp4' }), stationIndex: -1 },
        { ...exercise('Bear Crawl', 2.8), stationIndex: 2.8 },
      ],
    };

    render(<BootcampDemoMode bootcamp={malformed} onSelectExercise={vi.fn()} />);

    expect(screen.getByText('1. Battle Rope')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor director status')).toHaveTextContent('1/2 demos ready');

    fireEvent.click(screen.getByRole('button', { name: /Focus Station 3/i }));

    expect(screen.getByText('1. Bear Crawl')).toBeInTheDocument();
  });
});
