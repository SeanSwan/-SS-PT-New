/**
 * Phase 18 P1-O — Recent Workouts drilldown click test
 * =====================================================
 * Locks the canonical reuse pattern for per-session detail on the
 * AdminViewAsWrapper surface:
 *
 *   Recent Workouts <ListItem> → click → <EnhancedWorkoutsModal open>
 *
 * Pre-fix (production smoke 2026-04-25): each row rendered as static
 * text (no onClick, no cursor pointer, no <button>). Trainer/admin
 * could SEE that a session happened but had no path to expand sets,
 * reps, weight, RPE, or notes.
 *
 * Synthetic fixtures only (rule 44).
 */
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAuthAxiosGet = vi.fn();
const mockAuthAxios = { get: mockAuthAxiosGet };

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
    user: { id: 1, role: 'admin' },
  }),
}));

// Stub EnhancedWorkoutsModal so the click-binding test stays focused on
// "click triggers modal open" and doesn't pull WorkoutHistoryPanel's
// internal fetches into the harness.
vi.mock('./EnhancedWorkoutsModal', () => ({
  default: ({ open, clientId, clientName, onClose }: {
    open: boolean;
    clientId: number;
    clientName: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Workouts modal">
        <span data-testid="modal-clientid">{clientId}</span>
        <span data-testid="modal-clientname">{clientName}</span>
        <button type="button" onClick={onClose}>Close stub modal</button>
      </div>
    ) : null,
}));

import AdminViewAsWrapper from './AdminViewAsWrapper';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/admin/client-management/view-as/:userId"
          element={<AdminViewAsWrapper />}
        />
      </Routes>
    </MemoryRouter>
  );

const okClientProfile = {
  data: {
    success: true,
    data: {
      client: {
        id: 424242,
        firstName: 'Fixture',
        lastName: 'Client',
        role: 'client',
      },
    },
  },
};

// Backend response shape mirrors the real adminWorkoutLoggerController
// .getClientWorkouts (full WorkoutLog rows already on the wire).
const okWorkouts = {
  data: {
    success: true,
    workouts: [
      {
        id: 9001,
        title: 'Upper Body Push',
        date: '2026-04-20T15:00:00Z',
        duration: 45,
        intensity: 'moderate',
        status: 'completed',
        totalSets: 12,
        totalReps: 96,
        totalWeight: 12500,
        logs: [
          { id: 1, exerciseName: 'Bench Press', setNumber: 1, reps: 10, weight: 135, rpe: 7 },
        ],
      },
    ],
    pagination: { total: 1, limit: 10, offset: 0 },
  },
};

const okEmpty = { data: {} };

describe('AdminViewAsWrapper — Phase 18 P1-O Recent Workouts drilldown', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/424242') return Promise.resolve(okClientProfile);
      if (url === '/api/admin/clients/424242/workouts') return Promise.resolve(okWorkouts);
      return Promise.resolve(okEmpty);
    });
  });

  it('renders Recent Workouts items as clickable buttons (not static text)', async () => {
    renderAt('/dashboard/admin/client-management/view-as/424242');

    const itemButton = await screen.findByRole('button', {
      name: /open workout history.*upper body push/i,
    });
    expect(itemButton).toBeInTheDocument();
    expect(itemButton.tagName).toBe('BUTTON');
  });

  it('opens EnhancedWorkoutsModal when a Recent Workouts item is clicked', async () => {
    renderAt('/dashboard/admin/client-management/view-as/424242');

    // Modal must NOT be in DOM before click.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const itemButton = await screen.findByRole('button', {
      name: /open workout history.*upper body push/i,
    });
    fireEvent.click(itemButton);

    const dialog = await screen.findByRole('dialog', { name: /workouts modal/i });
    expect(dialog).toBeInTheDocument();
    // Modal receives the impersonated client's id (route param) and a
    // composed display name (firstName lastName).
    expect(screen.getByTestId('modal-clientid')).toHaveTextContent('424242');
    expect(screen.getByTestId('modal-clientname')).toHaveTextContent('Fixture Client');
  });

  it('closes EnhancedWorkoutsModal when its onClose fires', async () => {
    renderAt('/dashboard/admin/client-management/view-as/424242');

    const itemButton = await screen.findByRole('button', {
      name: /open workout history.*upper body push/i,
    });
    fireEvent.click(itemButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close stub modal'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
