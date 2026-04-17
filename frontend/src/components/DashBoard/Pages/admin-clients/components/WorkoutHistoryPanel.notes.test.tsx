/**
 * WorkoutHistoryPanel — Phase 15.0 notes behavior tests
 * =====================================================
 * These tests mount the real WorkoutHistoryPanel with a mocked
 * `useWorkoutAnalytics` hook and exercise the notes display/edit
 * behavior end-to-end. Unlike the source-text locks in
 * `SwanCoachAssistantPage.transcriptIntake.test.ts`, these are real
 * behavioral assertions that catch the two Phase 13.2 correctness
 * bugs the Phase 15.0 rebuild fixes:
 *
 *   1. Deleting set 1 in edit mode no longer loses the exercise-level
 *      note (because Phase 15 stamps it on every row of the group).
 *   2. A legitimate trainer-authored set note that starts with
 *      `Coach: ` is no longer reclassified as an exercise note on
 *      render (because the canonical read reads the dedicated
 *      `exerciseNote` column and does not inspect set.notes prefixes
 *      unless the group is legacy-encoded).
 *
 * The tests also lock that legacy Phase 13.2 encoded rows still
 * render correctly — backward compatibility is a real requirement.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import type { AnalyticsData, WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';

// ─────────────────────────────────────────────────────────────
// Mocks — keep the test focused on notes behavior
// ─────────────────────────────────────────────────────────────

const mockRefetch = vi.fn();
const mockPatch = vi.fn().mockResolvedValue({ data: { success: true } });

// `useAuth` is the same context the panel uses; mock it to return a
// stub authAxios with a PATCH spy we can assert on.
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { patch: mockPatch, get: vi.fn() },
  }),
}));

// Mocked analytics hook — the panel reads sessions/logs from here.
const mockAnalytics = vi.fn();
vi.mock('../../../../../hooks/analytics/useWorkoutAnalytics', async () => {
  const actual = await vi.importActual<any>(
    '../../../../../hooks/analytics/useWorkoutAnalytics',
  );
  return {
    ...actual,
    useWorkoutAnalytics: () => mockAnalytics(),
  };
});

// WorkoutChartsTab is lazy-imported; stub it so Suspense doesn't block.
vi.mock('./WorkoutChartsTab', () => ({ default: () => <div data-testid="mock-charts-tab" /> }));

// ShareToFeedModal is heavy; stub it out.
vi.mock('../../../../Shared/ShareToFeedModal', () => ({
  default: () => null,
}));

// Now import the component under test.
import WorkoutHistoryPanel from './WorkoutHistoryPanel';

// ─────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    title: 'Lower Body',
    date: '2026-04-10T12:00:00Z',
    duration: 50,
    intensity: 7,
    status: 'completed',
    totalSets: 3,
    totalReps: 30,
    totalWeight: 5400,
    notes: undefined,
    logs: [],
    ...overrides,
  };
}

function makeAnalyticsData(session: WorkoutSession): AnalyticsData {
  return {
    sessions: [session],
    weeklyVolume: [],
    exerciseFrequency: [],
    intensityTrend: [],
    workoutCalendar: [],
    personalRecords: [],
    oneRMProgression: [],
    muscleGroupVolume: [],
    rpeTrend: [],
    summary: {
      totalWorkouts: 1,
      totalExercises: 1,
      totalVolume: session.totalWeight,
      avgIntensity: session.intensity,
      avgRPE: 0,
      longestStreak: 1,
    },
  };
}

const setReturn = (data: AnalyticsData | null, overrides: any = {}) => {
  mockAnalytics.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  });
};

// ─────────────────────────────────────────────────────────────
// Phase 15.0 canonical (new-write) tests
// ─────────────────────────────────────────────────────────────

describe('WorkoutHistoryPanel — Phase 15.0 canonical exerciseNote display', () => {
  beforeEach(() => {
    mockAnalytics.mockReset();
    mockPatch.mockClear();
    mockRefetch.mockClear();
  });

  it('reads exerciseNote from any row in the group — not just set 1', () => {
    // A Phase 15 write stamps the same exerciseNote on every row.
    // We simulate a case where the first row has no exerciseNote but
    // the second row does — this proves the display is no longer
    // anchored to set 1.
    const session = makeSession({
      logs: [
        {
          id: 1,
          exerciseName: 'Goblet Squat',
          setNumber: 1,
          reps: 10,
          weight: 40,
          exerciseNote: undefined,
        },
        {
          id: 2,
          exerciseName: 'Goblet Squat',
          setNumber: 2,
          reps: 10,
          weight: 40,
          exerciseNote: 'knees caved on last set',
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);

    // Expand the session card.
    fireEvent.click(screen.getByText('Lower Body'));

    const coachLine = screen.getByTestId('notes-exercise-session-1-Goblet Squat');
    expect(coachLine).toHaveTextContent('knees caved on last set');
  });

  it('treats a set note that starts with "Coach:" as a set note, NOT an exercise note', () => {
    // Phase 15 anti-regression: the pre-rebuild splitStoredNote() would
    // have reclassified this as an exercise note.
    const session = makeSession({
      logs: [
        {
          id: 1,
          exerciseName: 'Bench Press',
          setNumber: 1,
          reps: 5,
          weight: 185,
          notes: 'Coach: said this was heavy',
          exerciseNote: undefined,
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));

    // The set note should render with the literal prefix visible — NOT
    // promoted to the Coach line. There should be NO notes-exercise-*
    // testid because the group has no canonical exerciseNote AND the
    // set note is not a Phase 13.2-encoded marker.
    expect(
      screen.queryByTestId('notes-exercise-session-1-Bench Press'),
    ).toBeNull();
    // The set row 1 should show the trainer's literal text.
    const block = screen.getByTestId('notes-block-session-1-Bench Press');
    expect(block).toHaveTextContent('Coach: said this was heavy');
  });

  it('renders "None given" when a group has neither set notes nor exerciseNote', () => {
    const session = makeSession({
      logs: [
        { id: 1, exerciseName: 'OHP', setNumber: 1, reps: 8, weight: 95 },
        { id: 2, exerciseName: 'OHP', setNumber: 2, reps: 8, weight: 95 },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));

    expect(screen.getByTestId('notes-empty-session-1-OHP')).toHaveTextContent('None given');
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 15.0 legacy backward-compat tests
// ─────────────────────────────────────────────────────────────

describe('WorkoutHistoryPanel — Phase 13.2 legacy row backward compat', () => {
  beforeEach(() => {
    mockAnalytics.mockReset();
    mockPatch.mockClear();
    mockRefetch.mockClear();
  });

  it('legacy: bare "Coach: X" set notes render verbatim as a SET note (classification safety)', () => {
    // Phase 15.0 classification safety: a Phase 13.2 row that stored
    // its exercise note as a bare `Coach: X` prefix on set 1 is
    // indistinguishable from a real trainer set note that happens to
    // start with `Coach:`. The panel refuses to reclassify — the
    // prefix renders verbatim as part of the set note. Users can
    // cut/paste on edit for a clean migration; the next save writes
    // the canonical exerciseNote regardless.
    const session = makeSession({
      logs: [
        {
          id: 1,
          exerciseName: 'Deadlift',
          setNumber: 1,
          reps: 5,
          weight: 225,
          notes: 'Coach: lumbar rounded a little',
          exerciseNote: undefined,
        },
        {
          id: 2,
          exerciseName: 'Deadlift',
          setNumber: 2,
          reps: 5,
          weight: 225,
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));

    // No exercise-note line for this group — the bare prefix was not
    // promoted.
    expect(
      screen.queryByTestId('notes-exercise-session-1-Deadlift'),
    ).toBeNull();
    // The text renders verbatim inside the notes block (as a set note).
    const block = screen.getByTestId('notes-block-session-1-Deadlift');
    expect(block).toHaveTextContent('Coach: lumbar rounded a little');
  });

  it('renders a legacy "set note · Coach: exercise note" row split correctly', () => {
    const session = makeSession({
      logs: [
        {
          id: 1,
          exerciseName: 'Front Squat',
          setNumber: 1,
          reps: 5,
          weight: 135,
          notes: 'grip started to slip · Coach: hip flexors tight',
          exerciseNote: undefined,
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));

    const block = screen.getByTestId('notes-block-session-1-Front Squat');
    // Coach line shows the exercise-level part.
    expect(within(block).getByTestId('notes-exercise-session-1-Front Squat'))
      .toHaveTextContent('hip flexors tight');
    // Set 1 line shows only the set-level part, with the legacy marker
    // stripped.
    expect(block).toHaveTextContent('grip started to slip');
    expect(block).not.toHaveTextContent('· Coach: hip flexors tight');
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 15.0 edit-mode behavior — deleting set 1 preserves the note
// ─────────────────────────────────────────────────────────────

describe('WorkoutHistoryPanel — Phase 15.0 delete-set-1 preserves exercise note', () => {
  beforeEach(() => {
    mockAnalytics.mockReset();
    mockPatch.mockClear();
    mockRefetch.mockClear();
  });

  it('deleting set 1 in edit mode keeps the exerciseNote on the PATCH payload', async () => {
    const session = makeSession({
      logs: [
        {
          id: 10,
          exerciseName: 'Goblet Squat',
          setNumber: 1,
          reps: 10,
          weight: 40,
          exerciseNote: 'knees caved on last set',
        },
        {
          id: 11,
          exerciseName: 'Goblet Squat',
          setNumber: 2,
          reps: 10,
          weight: 40,
          exerciseNote: 'knees caved on last set',
        },
        {
          id: 12,
          exerciseName: 'Goblet Squat',
          setNumber: 3,
          reps: 10,
          weight: 40,
          exerciseNote: 'knees caved on last set',
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));

    // Enter edit mode.
    fireEvent.click(screen.getByTestId('edit-start-session-1'));

    // Delete the first row (logIndex 0 — originally "set 1").
    fireEvent.click(screen.getByTestId('edit-remove-0'));

    // Save.
    fireEvent.click(screen.getByTestId('edit-save-session-1'));

    // Wait for the async save to complete — we only need one tick.
    await Promise.resolve();

    expect(mockPatch).toHaveBeenCalledTimes(1);
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/api/admin/clients/42/workouts/session-1');
    // The PATCH payload must carry exerciseNote at the exercise level
    // even though set 1 was deleted. This is the critical regression
    // lock — Phase 13.2 would have lost the note here.
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0]).toEqual(
      expect.objectContaining({
        name: 'Goblet Squat',
        exerciseNote: 'knees caved on last set',
      }),
    );
    // And the two remaining sets are present and renumbered.
    expect(body.exercises[0].sets).toHaveLength(2);
    expect(body.exercises[0].sets[0].setNumber).toBe(1);
    expect(body.exercises[0].sets[1].setNumber).toBe(2);
  });

  it('deleting set 1 from a LEGACY separator-encoded row preserves the exerciseNote (lazy-migrated)', async () => {
    // Legacy Phase 13.2 row with the unambiguous ` · Coach: ` separator
    // form. On startEdit the panel lazy-migrates the group: every row
    // gets the canonical exerciseNote, and set 1's notes field is
    // stripped of the legacy marker. Deleting set 1 after that must
    // still carry the exercise note on save — because every other row
    // in the group was also stamped with the canonical field during
    // migration.
    const session = makeSession({
      logs: [
        {
          id: 20,
          exerciseName: 'Front Squat',
          setNumber: 1,
          reps: 5,
          weight: 135,
          notes: 'grip started to slip · Coach: hip flexors tight',
          exerciseNote: undefined,
        },
        {
          id: 21,
          exerciseName: 'Front Squat',
          setNumber: 2,
          reps: 5,
          weight: 135,
          exerciseNote: undefined,
        },
      ],
    });
    setReturn(makeAnalyticsData(session));

    render(<WorkoutHistoryPanel clientId={42} clientName="Test Client" variant="modal" active />);
    fireEvent.click(screen.getByText('Lower Body'));
    fireEvent.click(screen.getByTestId('edit-start-session-1'));
    fireEvent.click(screen.getByTestId('edit-remove-0'));
    fireEvent.click(screen.getByTestId('edit-save-session-1'));

    await Promise.resolve();

    expect(mockPatch).toHaveBeenCalledTimes(1);
    const [, body] = mockPatch.mock.calls[0];
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0].exerciseNote).toBe('hip flexors tight');
    // The legacy ` · Coach: ` marker must NOT round-trip into the PATCH
    // payload — the save path has fully migrated off the old contract.
    for (const s of body.exercises[0].sets) {
      if (typeof s.notes === 'string') {
        expect(s.notes).not.toContain(' · Coach:');
        expect(s.notes).not.toContain('hip flexors tight');
      }
    }
  });
});
