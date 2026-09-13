/**
 * ============================================================================
 * FILE: BootcampRunSession.survival.test.tsx — R-H23, the navigation clause.
 *
 * THE REGISTER'S CRITERION (15-audit-findings-and-fix-register.md:71, row R-H23):
 *   "Run/Preflight navigation preserves the active class session; explicit restart is
 *    the only reset; pause reconciles elapsed deadlines"
 *
 * THE GAP THIS PINS, verified from three independent facts before any code was written:
 *   1. `useBootcampWorkflowStage.ts:18-25` — leaving `run` is unguarded; it releases the run
 *      surface (the wake lock) and sets the stage unconditionally.
 *   2. `useBootcampRunner.ts:19` — the run state is a plain `useState` with no persistence.
 *   3. `ClassPreviewPanel.tsx:76-82` — the branch containing `BootcampDemoMode` (and through it
 *      `BootcampRunnerClock`, the only caller of `useBootcampRunner`) renders only while
 *      `floorMode` is true, so leaving Run UNMOUNTS the runner and destroys the session.
 *
 * WHAT THIS TEST DOES: owns the run session in a harness that survives the stage switch — exactly
 * what `BootcampBuilderPage` must do — toggles the stage away and back, and requires the clock to
 * have CONTINUED rather than restarted. It fails against the old ownership (the panel's child owned
 * the state, so the toggle recreated it) and passes once the session is passed down.
 *
 * The fixture is the one `BootcampRunner.logic.test.ts` uses to derive real segments; without
 * runnable exercises `createRunnerState` reports `complete` and the clock would show "DONE".
 * ============================================================================
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import BootcampRunnerClock from './BootcampRunnerClock';
import { useBootcampRunner } from './useBootcampRunner';

const plan = (): GeneratedBootcamp => ({
  name: 'Clocked Circuit',
  classFormat: 'custom',
  dayType: 'full_body',
  stationCount: 2,
  exercisesPerStation: 2,
  rounds: 2,
  exerciseDurationSec: 40,
  targetDuration: 20,
  totalWorkoutMin: 12,
  demoDuration: 1,
  clearDuration: 1,
  totalClassMin: 15,
  expectedParticipants: 8,
  stations: [1, 2].map((stationNumber) => ({
    stationNumber,
    stationName: `Station ${stationNumber}`,
    equipmentNeeded: null,
    sortOrder: stationNumber,
  })),
  exercises: [
    ['Push-Up', 0, 0, 40, 10],
    ['Row', 1, 0, 45, 15],
    ['Squat', 0, 1, 35, 10],
    ['Carry', 1, 1, 35, 10],
  ].map(([exerciseName, stationIndex, sortOrder, durationSec, restSec]) => ({
    exerciseName: String(exerciseName),
    durationSec: Number(durationSec),
    restSec: Number(restSec),
    sortOrder: Number(sortOrder),
    stationIndex: Number(stationIndex),
  })),
} as unknown as GeneratedBootcamp);

/**
 * Owns the run session the way the PAGE must: ABOVE whatever the stage switch unmounts. Only the
 * clock is mounted below, because the clock is the component that owns the state today — rendering
 * the whole preview deck here hung under fake timers and would have tested the deck, not the contract.
 */
/** Module-level so its identity is stable across renders — see the note above the harness. */
const BOOTCAMP = plan();

const Harness = () => {
  const [floorMode, setFloorMode] = useState(true);
  const bootcamp = BOOTCAMP;
  const runSession = useBootcampRunner(bootcamp);

  return (
    <div>
      <button type="button" onClick={() => setFloorMode((current) => !current)}>toggle stage</button>
      {floorMode && <BootcampRunnerClock bootcamp={bootcamp} runSession={runSession} />}
    </div>
  );
};

describe('R-H23 — a stage change must not destroy the active class session', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('keeps the clock running across leaving Run and coming back', () => {
    render(<Harness />);
    const timerText = () => screen.getByRole('timer').textContent;
    const atStart = timerText();

    // Prove the clock is live before asking anything of it.
    act(() => { vi.advanceTimersByTime(3_000); });
    const beforeStageChange = timerText();
    expect(beforeStageChange).not.toBe(atStart);

    fireEvent.click(screen.getByRole('button', { name: /toggle stage/i })); // leave Run
    fireEvent.click(screen.getByRole('button', { name: /toggle stage/i })); // come back

    // A reset would show the first segment's full duration again; a preserved session continues.
    expect(timerText()).toBe(beforeStageChange);
  });
});
