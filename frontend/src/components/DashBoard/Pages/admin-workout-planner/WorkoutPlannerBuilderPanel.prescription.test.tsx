import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderWorkoutContent } from './WorkoutPlannerBuilderPanel.exerciseRows';
import type { PlanExercise } from './WorkoutPlannerTypes';

const exercise = (overrides: Partial<PlanExercise> = {}): PlanExercise => ({
  id: 'row-1',
  exerciseSlim: {
    id: 'front-squat',
    name: 'Front Squat',
    exerciseKey: 'front-squat',
    exerciseType: 'compound',
    bodyPartCategory: 'legs',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    difficulty: 300,
  },
  sets: 3,
  reps: '8',
  tempo: '2-0-2',
  restSeconds: 0,
  intensityPercent: undefined,
  intensityGuideline: '70-80% 1RM',
  notes: '',
  ...overrides,
});

const renderRow = (planExercise: PlanExercise, onUpdateExercise = vi.fn()) => {
  render(
    <BuilderWorkoutContent
      generating={false}
      planExercises={[planExercise]}
      swapTarget={null}
      onSelectExercise={vi.fn()}
      onUpdateExercise={onUpdateExercise}
      onRemoveExercise={vi.fn()}
      onBeginSwap={vi.fn()}
      onCancelSwap={vi.fn()}
    />,
  );
  return onUpdateExercise;
};

const StatefulBuilderRow = ({ initial }: { initial: PlanExercise }) => {
  const [row, setRow] = useState(initial);
  return (
    <BuilderWorkoutContent
      generating={false}
      planExercises={[row]}
      swapTarget={null}
      onSelectExercise={vi.fn()}
      onUpdateExercise={(_id, field, value) => {
        setRow(previous => ({ ...previous, [field]: value }));
      }}
      onRemoveExercise={vi.fn()}
      onBeginSwap={vi.fn()}
      onCancelSwap={vi.fn()}
    />
  );
};

describe('builder prescription control', () => {
  it('renders a blank accessible intensity editor and the saved legacy text', () => {
    renderRow(exercise());

    const input = screen.queryByLabelText('Intensity for Front Squat');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Saved intensity: 70-80% 1RM')).toBeInTheDocument();
  });

  it('treats a numeric edit as deliberate replacement of legacy text', () => {
    const onUpdateExercise = renderRow(exercise(), vi.fn());
    const input = screen.getByLabelText('Intensity for Front Squat');

    fireEvent.change(input, { target: { value: '83' } });

    expect(onUpdateExercise).toHaveBeenNthCalledWith(1, 'row-1', 'intensityPercent', 83);
    expect(onUpdateExercise).toHaveBeenNthCalledWith(2, 'row-1', 'intensityGuideline', undefined);
  });

  it('persists an edited number and removes the legacy text in component state', () => {
    render(<StatefulBuilderRow initial={exercise()} />);
    fireEvent.change(screen.getByLabelText('Intensity for Front Squat'), {
      target: { value: '83' },
    });

    expect(screen.getByLabelText('Intensity for Front Squat')).toHaveValue(83);
    expect(screen.queryByText('Saved intensity: 70-80% 1RM')).not.toBeInTheDocument();
  });

  it('shows the explicit unspecified state when no saved prescription exists', () => {
    renderRow(exercise({ intensityGuideline: undefined }));

    expect(screen.getByText('Intensity not specified')).toBeInTheDocument();
  });
});

// ── S04 presentation contract for the S02 helper text ────────────────────────
// Presentation only: the codec and numeric-edit semantics above are untouched.

describe('intensity helper text presentation', () => {
  const stylesSource = readFileSync(resolve(__dirname, './WorkoutPlannerPage.styles.ts'), 'utf8');

  it('associates the saved legacy text with the intensity input', () => {
    renderRow(exercise());

    const input = screen.getByLabelText('Intensity for Front Squat');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string))
      .toHaveTextContent('Saved intensity: 70-80% 1RM');
  });

  it('renders a long unsupported saved value in full, with no clipped or dropped words', () => {
    const longValue = '70-80% 1RM for the first three sets, then RPE 8 with a 3-1-1 tempo on the final set';
    renderRow(exercise({ intensityGuideline: longValue }));

    // The whole string is present verbatim — nothing is truncated or moved
    // into an offscreen single word.
    expect(screen.getByText(`Saved intensity: ${longValue}`)).toBeInTheDocument();
    const input = screen.getByLabelText('Intensity for Front Squat');
    expect(document.getElementById(input.getAttribute('aria-describedby') as string))
      .toHaveTextContent(longValue);
  });

  it('keeps the ordinary range and blank cases described and readable', () => {
    renderRow(exercise({ intensityGuideline: '70-80%' }));
    expect(screen.getByText('Saved intensity: 70-80%')).toBeInTheDocument();

    renderRow(exercise({ intensityPercent: undefined, intensityGuideline: undefined }));
    expect(screen.getAllByText('Intensity not specified').length).toBeGreaterThan(0);
  });

  it('stops describing the input once a deliberate numeric value replaces the text', () => {
    renderRow(exercise({ intensityPercent: 83, intensityGuideline: undefined }));

    const input = screen.getByLabelText('Intensity for Front Squat');
    expect(input).toHaveValue(83);
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText(/Saved intensity/)).not.toBeInTheDocument();
  });

  it('keeps the field and helper inside the mobile grid instead of wrapping off it', () => {
    // The param group is a FOUR-column grid on mobile; the intensity field must
    // claim the full row and never widen its parent.
    expect(stylesSource).toContain('export const ParamFieldWide');
    expect(stylesSource).toMatch(/ParamFieldWide[\s\S]{0,160}grid-column: 1 \/ -1;/);
    expect(stylesSource).toMatch(/export const ParamField = styled\.div`\s*\n\s*min-width: 0;/);
    expect(stylesSource).toContain('overflow-wrap: anywhere');
    expect(stylesSource).toMatch(/export const ParamHelper[\s\S]{0,220}word-break: break-word;/);
  });
});
