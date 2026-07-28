import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import ExerciseDetailPanel from './ExerciseDetailPanel';

vi.mock('../Shared/AITerminalPanel', () => ({
  default: () => <div data-testid="ai-terminal-panel" />,
}));

const exercise = (overrides: Partial<BootcampExercise> = {}): BootcampExercise => ({
  exerciseName: 'Goblet Squat',
  durationSec: 40,
  restSec: 15,
  sortOrder: 1,
  isCardioFinisher: false,
  muscleTargets: 'quads,glutes',
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
  equipmentRequired: 'dumbbell',
  ...overrides,
});

describe('ExerciseDetailPanel media and selection evidence', () => {
  it('renders a video-first media stage with a short preview loop and full demo link', () => {
    const { container } = render(
      <ExerciseDetailPanel
        selectedExercise={exercise({
          previewVideoUrl: 'https://cdn.example.com/goblet-loop.webm',
          videoUrl: 'https://cdn.example.com/goblet-full.mp4',
          thumbnailUrl: 'https://cdn.example.com/goblet.jpg',
        })}
        bootcamp={null}
        equipmentProfileId={7}
      />,
    );

    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://cdn.example.com/goblet-loop.webm');
    expect(screen.getByLabelText('Goblet Squat media preview')).toBe(video);
    expect(screen.getByRole('link', { name: /open full demo/i })).toHaveAttribute('href', 'https://cdn.example.com/goblet-full.mp4');
  });

  it('shows generator selection evidence beside the media stack', () => {
    render(
      <ExerciseDetailPanel
        selectedExercise={exercise({
          selectionReason: 'Allowed by available equipment: dumbbell.',
          equipmentEvidence: ['dumbbell'],
          missingEquipment: [],
          mediaStatus: 'preview_video',
          programmingIntent: {
            type: 'functional_circuit',
            prescriptionLabel: '25-20-15-9 reps',
            scheme: '25-20-15-9',
          },
        })}
        bootcamp={null}
        equipmentProfileId={7}
      />,
    );

    expect(screen.getByText('Allowed by available equipment: dumbbell.')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipment evidence')).toHaveTextContent('dumbbell');
    expect(screen.getByLabelText('Media status')).toHaveTextContent('preview video');
    expect(screen.getByLabelText('Rep scheme')).toHaveTextContent('25-20-15-9 reps');
  });
});
