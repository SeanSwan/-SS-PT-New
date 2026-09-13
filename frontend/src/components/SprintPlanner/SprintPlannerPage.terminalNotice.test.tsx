/**
 * ============================================================================
 * FILE: SprintPlannerPage.terminalNotice.test.tsx — R-H04 (slice D).
 *
 * THE DEFECT THIS LOCKS
 *   The progress panel renders ONLY while `generating` is true, and the terminal
 *   handler clears `generating` on the very tick a terminal event arrives — so the
 *   event explaining WHY generation ended had no surface and was discarded
 *   silently. The trainer saw the spinner vanish and a sprint with no classes.
 *
 *   `TerminalNotice` now renders OUTSIDE that guard. This is the page's first
 *   interaction test: it drives the real `onProgress` callback the page hands to
 *   `generateSprint`.
 *
 * NOTE: `frontend/tsconfig.json` EXCLUDES `**\/*.test.ts(x)`, so `tsc` does not
 * type-check this file — the run is the only evidence.
 * ============================================================================
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listSprints: vi.fn(),
  getSprint: vi.fn(),
  generateSprint: vi.fn(),
  captured: { onProgress: null as null | ((evt: Record<string, unknown>) => void) },
}));

vi.mock('../../hooks/useSprintAPI', () => ({
  useSprintAPI: () => ({
    listSprints: mocks.listSprints,
    getSprint: mocks.getSprint,
    generateSprint: mocks.generateSprint,
  }),
}));

import SprintPlannerPage from './SprintPlannerPage';

const SPRINT = {
  id: 12,
  name: 'Synthetic Sprint',
  status: 'draft',
  startDate: '2026-03-02',
  endDate: '2026-05-24',
  durationWeeks: 12,
  classesPerWeek: 3,
  progressionStrategy: 'linear',
  totalClassesCompleted: 0,
  totalClassesPlanned: 36,
  weeks: [],
  classSlots: [],
};

/** A second sprint, so the notice can be proven not to follow the trainer. */
const SPRINT_B = { ...SPRINT, id: 13, name: 'Second Sprint' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.captured.onProgress = null;
  mocks.listSprints.mockResolvedValue([SPRINT, SPRINT_B]);
  mocks.getSprint.mockImplementation(async (id: number) =>
    (id === SPRINT_B.id ? SPRINT_B : SPRINT));
  // NOT async: the real `generateSprint` returns its CANCEL FUNCTION
  // synchronously (useSprintAPI.ts). An async mock returns a Promise instead, and
  // the mismatch stayed invisible until the page started calling the handle.
  mocks.generateSprint.mockImplementation((
    _sprintId: number,
    onProgress: (evt: Record<string, unknown>) => void,
  ) => {
    mocks.captured.onProgress = onProgress;
    return () => {};
  });
});

/**
 * The page renders the LIST view until `activeSprint` is set (`:122`), and only
 * `loadSprintDetail` sets it — so the sprint must be CLICKED before Generate
 * exists. Mocking `listSprints` alone is not enough.
 */
const openSprintAndGenerate = async () => {
  render(<SprintPlannerPage />);
  fireEvent.click(await screen.findByText('Synthetic Sprint'));
  const generate = await screen.findByRole('button', { name: /generate all classes/i });
  fireEvent.click(generate);
  await waitFor(() => expect(mocks.captured.onProgress).not.toBeNull());
};

const emit = (evt: Record<string, unknown>) => {
  // The callback runs setProgress + setGenerating(false), so it must be wrapped.
  act(() => { mocks.captured.onProgress?.(evt); });
};

describe('terminal generation notice (slice D)', () => {
  it('surfaces an INTERRUPTED run that would otherwise be discarded', async () => {
    await openSprintAndGenerate();
    expect(screen.queryByRole('alert')).toBeNull();

    emit({ type: 'error', interrupted: true });

    const notice = await screen.findByRole('alert');
    expect(notice.textContent).toContain('Generation was interrupted');
    expect(notice.textContent).toContain('Start it again');
  });

  it('shows NO notice for a normal completion', async () => {
    // The case that gives the first one teeth: without it the suite could pass
    // while showing an error notice for perfectly healthy runs.
    await openSprintAndGenerate();
    emit({ type: 'complete' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('shows the error copy for an ordinary failure', async () => {
    await openSprintAndGenerate();
    emit({ type: 'error', error: 'Could not reach the catalog' });
    const notice = await screen.findByRole('alert');
    expect(notice.textContent).toContain('Could not reach the catalog');
  });

  it("does not carry one sprint's failure onto another sprint", async () => {
    // A notice describes the run the trainer just started. It used to survive
    // "← All Sprints" into the next sprint, so a failure on Sprint A was reported
    // on Sprint B's page — an error attributed to the wrong sprint, with no
    // dismiss affordance and no way to clear it but starting another run.
    await openSprintAndGenerate();
    emit({ type: 'error', error: 'Sprint A failed' });
    expect((await screen.findByRole('alert')).textContent).toContain('Sprint A failed');

    fireEvent.click(screen.getByText(/all sprints/i));
    fireEvent.click(await screen.findByText('Second Sprint'));

    // Wait for B's DETAIL view before asserting. The intermediate list view also
    // renders no alert, so `waitFor(toBeNull)` alone was satisfied by the list and
    // passed vacuously — proven by reverting the fix and watching it still pass.
    // The Generate button exists ONLY in the detail view, so it is the gate.
    await screen.findByRole('button', { name: /generate all classes/i });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stops watching the run when the trainer leaves mid-generation', async () => {
    // The residual defect this locks: leaving only HID the run, so the stream kept
    // pushing events for the abandoned sprint. A terminal event landing after the
    // trainer moved on painted Sprint A's failure onto Sprint B's page AND dragged
    // them back to A via `loadSprintDetail(A)`. React discards an onClick's return
    // value, so the cancel handle has to be kept — that is what makes this test
    // fail if the run is merely hidden rather than stopped.
    let cancelled = false;
    mocks.generateSprint.mockImplementation((
      _sprintId: number,
      onProgress: (evt: Record<string, unknown>) => void,
    ) => {
      mocks.captured.onProgress = onProgress;
      return () => { cancelled = true; };
    });

    await openSprintAndGenerate();
    fireEvent.click(screen.getByText(/all sprints/i));

    expect(cancelled).toBe(true);

    // Even if a late frame still arrives, it must not be attributed to Sprint B.
    emit({ type: 'error', error: 'Sprint A failed late' });
    fireEvent.click(await screen.findByText('Second Sprint'));
    await screen.findByRole('button', { name: /generate all classes/i });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
