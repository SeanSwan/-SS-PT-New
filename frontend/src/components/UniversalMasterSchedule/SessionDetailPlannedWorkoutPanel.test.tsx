/**
 * Plan Reveal panel — S1 state-matrix laws.
 * Kimi gate (accepted): the full matrix must exist BEFORE ship — manual
 * session hides, loading reserves space (no jump), rest day is honest,
 * completed wears earned gold, projection failure degrades without
 * blanking the day, and gold NEVER appears outside the completed state.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const apiGetMock = vi.fn();
const projectionsMock = vi.fn();

vi.mock('../../services/api.service', () => ({
  default: { get: (...args: unknown[]) => apiGetMock(...args) },
}));
vi.mock('../../services/training-plan-projection-service', () => ({
  trainingPlanProjectionService: {
    getProjections: (...args: unknown[]) => projectionsMock(...args),
  },
}));

const { default: SessionDetailPlannedWorkoutPanel } = await import('./SessionDetailPlannedWorkoutPanel');

const dayResponse = (overrides: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    plan: { id: 'p1', title: 'Hypertrophy Block' },
    dayForDate: {
      basis: 'plan_start',
      weekNumber: 2,
      dayNumber: 3,
      dayLabel: 'Push Day',
      weekFocus: 'Chest & triceps',
      scheduledDate: '2026-08-11',
      exercises: [
        { exerciseName: 'Bench Press', sets: 3, targetReps: '8', tempo: '3-1-1', restTime: 90 },
        { exerciseName: 'Dips', sets: 3, targetReps: '12' },
      ],
      ...overrides,
    },
  },
});

const emptyProjections = { items: [], page: 1, limit: 25, range: { startDate: '', endDate: '' } };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SessionDetailPlannedWorkoutPanel — state matrix', () => {
  it('manual session (no linked user) renders NOTHING and never fetches', () => {
    const { container } = render(
      <SessionDetailPlannedWorkoutPanel clientId={null} sessionDateISO='2026-08-11' />,
    );
    expect(container.firstChild).toBeNull();
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('loading reserves space (skeleton, aria-busy) — the modal never jumps', () => {
    apiGetMock.mockReturnValue(new Promise(() => {}));
    projectionsMock.mockReturnValue(new Promise(() => {}));
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(screen.getByLabelText('Planned workout')).toHaveAttribute('aria-busy', 'true');
  });

  it('READY: hero renders the W·D pin, focus, rows with schemes, and the basis is quiet for plan_start', async () => {
    apiGetMock.mockResolvedValue(dayResponse());
    projectionsMock.mockResolvedValue(emptyProjections);
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText('W2·D3')).toBeInTheDocument();
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Chest & triceps')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('3 × 8')).toBeInTheDocument();
    expect(screen.getByText('3-1-1')).toBeInTheDocument();
    expect(screen.queryByText(/projected from plan progress/)).toBeNull();
    expect(screen.queryByText(/Completed/)).toBeNull(); // gold only when earned
  });

  it('cursor-basis projection is DISCLOSED, never silently resolved', async () => {
    apiGetMock.mockResolvedValue(dayResponse({ basis: 'current_cursor' }));
    projectionsMock.mockResolvedValue(emptyProjections);
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText('projected from plan progress')).toBeInTheDocument();
  });

  it('completed day wears the earned gold badge (receipt-backed)', async () => {
    apiGetMock.mockResolvedValue(dayResponse());
    projectionsMock.mockResolvedValue({
      ...emptyProjections,
      items: [{ scheduledDate: '2026-08-11', weekNumber: 2, dayNumber: 3, completionState: 'completed' }],
    });
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText('✓ Completed')).toBeInTheDocument();
  });

  it('rest day is honest — nothing prescribed, no invented rows', async () => {
    apiGetMock.mockResolvedValue(dayResponse({ exercises: [] }));
    projectionsMock.mockResolvedValue(emptyProjections);
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText(/Rest \/ recovery day/)).toBeInTheDocument();
  });

  it('basis none → "no plan day" quiet state', async () => {
    apiGetMock.mockResolvedValue({ data: { success: true, plan: { id: 'p1' }, dayForDate: { basis: 'none' } } });
    projectionsMock.mockResolvedValue(emptyProjections);
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText('No plan day is scheduled for this date.')).toBeInTheDocument();
  });

  it('projection FAILURE degrades to completion-unknown — the day still renders', async () => {
    apiGetMock.mockResolvedValue(dayResponse());
    projectionsMock.mockRejectedValue(new Error('projection outage'));
    render(<SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />);
    expect(await screen.findByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByText(/Completed/)).toBeNull();
  });

  it('day-fetch FAILURE renders nothing (quiet) — the modal keeps working', async () => {
    apiGetMock.mockRejectedValue(new Error('500'));
    projectionsMock.mockResolvedValue(emptyProjections);
    const { container } = render(
      <SessionDetailPlannedWorkoutPanel clientId={7} sessionDateISO='2026-08-11' />,
    );
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
