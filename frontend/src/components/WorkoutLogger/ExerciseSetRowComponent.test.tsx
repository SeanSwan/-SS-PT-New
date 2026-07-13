/**
 * TEST: Phase-2C set-row law — per-set log check behavior and the phone
 * grid source contract (32px | 1fr | 1fr | 48px, min 56px rows, host-fixed).
 */
import React, { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';
import ExerciseCardComponent from './ExerciseCardComponent';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const exercise = (): ExerciseEntry => ({
  exerciseName: 'Goblet Squat',
  sets: [
    { setNumber: 1, weight: 50, reps: 8, rpe: null, restTime: 60, formQuality: null, loggerSetId: 'row-1' },
    { setNumber: 2, weight: 55, reps: 8, rpe: null, restTime: 60, formQuality: null, loggerSetId: 'row-2' },
  ],
  formRating: null,
  painLevel: 0,
} as unknown as ExerciseEntry);

const noop = () => {};

/** Stateful harness mirroring WorkoutLogger's lifted detail-mode ownership. */
const CardHarness: React.FC<{ onSetLogged?: ReturnType<typeof vi.fn> }> = ({ onSetLogged }) => {
  const [showSetDetails, setShowSetDetails] = useState(false);
  return (
    <ExerciseCardComponent
      exercise={exercise()}
      exerciseIndex={0}
      showSetDetails={showSetDetails}
      onToggleSetDetails={() => setShowSetDetails(previous => !previous)}
      onUpdateExercise={noop}
      onUpdateSet={noop}
      onAddSet={noop}
      onRemoveSet={noop}
      onRemoveExercise={noop}
      onSetLogged={onSetLogged}
    />
  );
};

const renderCard = (onSetLogged = vi.fn()) => {
  render(<CardHarness onSetLogged={onSetLogged} />);
  return onSetLogged;
};

describe('per-set log check (aria-pressed + rest-timer handoff)', () => {
  it('marks the set logged, fires onSetLogged once, and unmarks without re-firing', () => {
    const onSetLogged = renderCard();
    const logButton = screen.getByRole('button', { name: /log set 1 and start rest timer/i });
    expect(logButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(logButton);
    expect(screen.getByRole('button', { name: /set 1 logged/i })).toHaveAttribute('aria-pressed', 'true');
    expect(onSetLogged).toHaveBeenCalledTimes(1);
    expect(onSetLogged).toHaveBeenCalledWith(0, 0);

    fireEvent.click(screen.getByRole('button', { name: /set 1 logged/i }));
    expect(screen.getByRole('button', { name: /log set 1 and start rest timer/i })).toHaveAttribute('aria-pressed', 'false');
    expect(onSetLogged).toHaveBeenCalledTimes(1);
  });

  it('exposes the phone details disclosure with aria-expanded (lifted detail mode)', () => {
    // The toggle is phone-only (display:none on desktop), so jsdom keeps it
    // out of the accessibility tree — query the DOM directly.
    renderCard();
    const toggle = document.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toMatch(/show set details/i);
    // The disclosure copy must advertise EVERYTHING it hides — including remove.
    expect(toggle.textContent).toMatch(/remove/i);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.textContent).toMatch(/hide set details/i);
  });

  it('keeps weight and reps as spinbuttons with mobile input modes', () => {
    renderCard();
    const weight = screen.getByRole('spinbutton', { name: /set 1 weight in lbs/i });
    const reps = screen.getByRole('spinbutton', { name: /set 1 reps/i });
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(reps).toHaveAttribute('inputmode', 'numeric');
  });
});

describe('Phase-2C law grid source contract (host-fixed)', () => {
  it('locks the phone essentials grid and 56px row floor', () => {
    const rowStyles = read('ExerciseSetRow.styles.ts');
    expect(rowStyles).toContain('grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr) 48px');
    expect(rowStyles).toContain('grid-auto-rows: minmax(56px, auto)');
    // Desktop table keeps the Log column ahead of Remove.
    expect(rowStyles).toContain('48px 44px');
    // Narrow desktop bands scroll instead of silently clipping trailing columns.
    expect(rowStyles).toContain('overflow-x: auto');
    // The law grid must never be exposed to lens recipes.
    expect(rowStyles).not.toContain('--world-row-columns');
  });

  it('locks the Dual-Button Glow mapping on the new controls', () => {
    const controls = read('ExerciseSetRowControls.styles.ts');
    expect(controls).toMatch(/SetLogCheckButton[\s\S]*background: \$\{CS\.primaryDeep\}/);
    expect(controls).toMatch(/SetLogCheckButton[\s\S]*withAlpha\(CS\.secondary/);
    const shell = read('WorkoutLogger.styles.ts');
    expect(shell).toMatch(/AddExerciseButton[\s\S]*CS\.secondary[\s\S]*withAlpha\(CS\.gaming, 0\.25\)/);
    // QuickLogMode's full-width Log Set button follows the same law (Rule 20 sibling).
    const quickLog = read('QuickLogMode.styles.ts');
    expect(quickLog).toMatch(/CS\.primaryDeep/);
    expect(quickLog).toMatch(/withAlpha\(CS\.secondary, 0\.25\)/);
  });
});
