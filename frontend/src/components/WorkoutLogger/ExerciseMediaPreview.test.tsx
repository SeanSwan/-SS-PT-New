import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExerciseSlim } from './useExerciseSearch';
import ExerciseMediaPreview from './ExerciseMediaPreview';

const baseExercise: ExerciseSlim = {
  id: 'ex-1',
  name: 'Low Poly Squat',
  exerciseKey: 'nasm-low-poly-squat',
  exerciseType: 'compound',
  bodyPartCategory: 'legs',
  primaryMuscles: ['glutes', 'quadriceps'],
  difficulty: 420,
  videoUrl: 'https://cdn.swanstudios.test/exercises/squat.webm',
  imageUrl: 'https://cdn.swanstudios.test/exercises/squat.jpg',
  thumbnailUrl: 'https://cdn.swanstudios.test/exercises/squat-poster.jpg',
};

describe('ExerciseMediaPreview', () => {
  it('renders hosted exercise video as a playable poster-backed preview', () => {
    render(<ExerciseMediaPreview exercise={baseExercise} />);

    const media = screen.getByLabelText('Low Poly Squat exercise demo media');
    expect(media.tagName.toLowerCase()).toBe('video');
    expect(media).toHaveAttribute('controls');
    expect(media).toHaveAttribute('playsinline');
    expect(media).toHaveAttribute('poster', baseExercise.thumbnailUrl);
    expect(media).toHaveAttribute('src', baseExercise.videoUrl);
  });

  it('uses a branded fallback when an exercise has no media yet', () => {
    render(<ExerciseMediaPreview exercise={{ ...baseExercise, videoUrl: undefined, imageUrl: undefined, thumbnailUrl: undefined }} />);

    expect(screen.getByText('SwanStudios form preview')).toBeInTheDocument();
    expect(screen.getByText('Demo media ready when uploaded')).toBeInTheDocument();
  });
});
