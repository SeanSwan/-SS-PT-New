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

const noMediaExercise: ExerciseSlim = {
  ...baseExercise,
  videoUrl: undefined,
  previewVideoUrl: undefined,
  imageUrl: undefined,
  thumbnailUrl: undefined,
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
    render(<ExerciseMediaPreview exercise={noMediaExercise} />);

    expect(screen.getByText('SwanStudios form preview')).toBeInTheDocument();
    expect(screen.getByText('Demo media ready when uploaded')).toBeInTheDocument();
  });

  // ── H18 compact media: thumbnail fallback must not carry the expanded copy ──

  it('keeps the thumbnail fallback to the compact No demo label only', () => {
    render(<ExerciseMediaPreview variant="thumbnail" exercise={noMediaExercise} />);

    expect(screen.getByText('No demo')).toBeInTheDocument();
    expect(screen.queryByText('SwanStudios form preview')).not.toBeInTheDocument();
    expect(screen.queryByText('Demo media ready when uploaded')).not.toBeInTheDocument();
  });

  it('preserves accessible exercise identity on the compact thumbnail fallback', () => {
    render(<ExerciseMediaPreview variant="thumbnail" exercise={noMediaExercise} />);

    const placeholder = screen.getByRole('img', { name: /Low Poly Squat/ });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute('aria-label', expect.stringMatching(/no demo/i));
  });

  it('retains the expanded guidance in the interactive variant', () => {
    render(<ExerciseMediaPreview exercise={noMediaExercise} />);

    expect(screen.getByText('SwanStudios form preview')).toBeInTheDocument();
    expect(screen.getByText('Demo media ready when uploaded')).toBeInTheDocument();
    expect(screen.queryByText('No demo')).not.toBeInTheDocument();
  });

  it('never claims No demo when thumbnail media actually exists', () => {
    render(<ExerciseMediaPreview variant="thumbnail" exercise={{ ...baseExercise, videoUrl: undefined }} />);

    expect(screen.queryByText('No demo')).not.toBeInTheDocument();
    const image = screen.getByAltText('Low Poly Squat exercise demonstration');
    expect(image.tagName.toLowerCase()).toBe('img');
  });

  it('keeps the thumbnail video non-interactive and un-controllable', () => {
    render(<ExerciseMediaPreview variant="thumbnail" exercise={baseExercise} />);

    const media = screen.getByLabelText('Low Poly Squat exercise demo media');
    expect(media).not.toHaveAttribute('controls');
    expect(media).toHaveAttribute('tabindex', '-1');
  });
});
