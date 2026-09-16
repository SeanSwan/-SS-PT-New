import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseSet } from '../../services/nasmApiService';
import ExerciseSetRowComponent from './ExerciseSetRowComponent';

const makeSet = (): ExerciseSet => ({
  setNumber: 1,
  weight: 0,
  reps: 10,
  rpe: null,
  restTime: 60,
  formQuality: null,
  loggerSetId: 'synthetic-keypad-row',
} as unknown as ExerciseSet);

const RowHarness = () => {
  const [set, setSet] = useState(makeSet);
  return (
    <ExerciseSetRowComponent
      exerciseName="Goblet Squat"
      exerciseIndex={0}
      set={set}
      setIndex={0}
      showDetails={false}
      isLogged={false}
      canRemove
      onToggleLogged={vi.fn()}
      onUpdateSet={(_exerciseIndex, _setIndex, field, value) => {
        setSet(previous => ({ ...previous, [field]: value } as ExerciseSet));
      }}
      onRemoveSet={vi.fn()}
    />
  );
};

describe('ExerciseSetRow keypad field lifecycle', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('does not append weight digits into reps during the real weight-to-reps one-hop', () => {
    render(<RowHarness />);

    const weight = screen.getByRole('spinbutton', { name: /set 1 weight in lbs/i });
    fireEvent.click(weight);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    const repsDialog = screen.getByRole('dialog', { name: /set 1 — reps keypad/i });
    expect(repsDialog).toContainElement(document.activeElement);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    expect(screen.getByRole('spinbutton', { name: /set 1 weight in lbs/i })).toHaveValue(40);
    expect(screen.getByRole('spinbutton', { name: /set 1 reps/i })).toHaveValue(10);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
