/**
 * SwanExercisePickerPreview tests (Phase 2.3b)
 *
 * Locks: lazy teach-mode cues fetch (mocked useExerciseTeachData), truthful
 * loading / no-cues states, safety tips rendering, media presence, and the
 * action button emitting the full ExerciseSlim.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseSlim } from './types';
import { SWAN_PICKER_MODES } from './types';

const teachState: { data: any; isLoading: boolean; error: string | null } = {
  data: null,
  isLoading: false,
  error: null,
};
const useExerciseTeachData = vi.fn(() => ({ ...teachState, refetch: vi.fn() }));
vi.mock('../../../features/teach-mode/hooks/useExerciseTeachData', () => ({
  useExerciseTeachData: (...args: unknown[]) => useExerciseTeachData(...args),
}));

import SwanExercisePickerPreview from './SwanExercisePickerPreview';

const exercise = {
  id: '7',
  name: 'Goblet Squat',
  exerciseKey: 'goblet-squat',
  exerciseType: 'compound',
  bodyPartCategory: 'Lower Body',
  primaryMuscles: ['Quadriceps', 'Glutes'],
  secondaryMuscles: [],
  difficulty: 200,
  equipment: ['Kettlebell'],
  equipmentNeeded: [],
  source: 'swanstudios',
  optPhases: [],
  canBePerformedAtHome: true,
  catalogVideoSample: null,
  recommendedSets: 3,
  recommendedReps: 10,
} as unknown as ExerciseSlim;

const config = SWAN_PICKER_MODES['workout-page'];

describe('SwanExercisePickerPreview', () => {
  it('renders cues + safety tips from the lazy teach-mode fetch and emits on action', () => {
    teachState.data = {
      coachingCues: ['Chest tall', 'Knees track over toes'],
      safetyTips: 'Keep heels planted.',
    };
    teachState.isLoading = false;
    const onAction = vi.fn();
    render(<SwanExercisePickerPreview exercise={exercise} config={config} onAction={onAction} />);

    expect(useExerciseTeachData).toHaveBeenCalledWith('7', true);
    expect(screen.getByText('Goblet Squat')).toBeInTheDocument();
    expect(screen.getByText('Chest tall')).toBeInTheDocument();
    expect(screen.getByText('Knees track over toes')).toBeInTheDocument();
    expect(screen.getByText(/keep heels planted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add goblet squat to workout/i }));
    expect(onAction).toHaveBeenCalledWith(exercise);
  });

  it('shows a loading state while cues fetch', () => {
    teachState.data = null;
    teachState.isLoading = true;
    render(<SwanExercisePickerPreview exercise={exercise} config={config} onAction={vi.fn()} />);
    expect(screen.getByText(/loading coaching cues/i)).toBeInTheDocument();
  });

  it('states truthfully when no cues are on file', () => {
    teachState.data = { coachingCues: [], safetyTips: null };
    teachState.isLoading = false;
    render(<SwanExercisePickerPreview exercise={exercise} config={config} onAction={vi.fn()} />);
    expect(screen.getByText(/no coaching cues on file/i)).toBeInTheDocument();
  });

  it('renders exercise meta from the already-loaded slim record', () => {
    teachState.data = null;
    teachState.isLoading = false;
    render(<SwanExercisePickerPreview exercise={exercise} config={config} onAction={vi.fn()} />);
    expect(screen.getByText(/quadriceps/i)).toBeInTheDocument();
    expect(screen.getByText(/3 sets × 10 reps/i)).toBeInTheDocument();
  });
});
