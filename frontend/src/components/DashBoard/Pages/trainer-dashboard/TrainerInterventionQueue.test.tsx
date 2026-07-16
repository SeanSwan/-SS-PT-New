/**
 * TrainerInterventionQueue tests (Phase 1.5b)
 *
 * Locks: at-risk fetch from the trainer-scoped compliance endpoint, risk-
 * ranked top-4 rendering with days-since truth, audience-aware deep link,
 * truthful empty/error states (self-hiding on denial), and 44px targets.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mockGet = vi.fn();
const mockNavigate = vi.fn();
/* Stable identity — a fresh { authAxios } per call would re-trigger the
   component's [authAxios] effect every render (infinite loop in jsdom). */
const stableAuth = { authAxios: { get: mockGet } };
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => mockNavigate,
}));

import TrainerInterventionQueue from './TrainerInterventionQueue';

const client = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  firstName: `First${id}`,
  lastName: `Last${id}`,
  riskLevel: 'warning',
  reason: 'No workouts logged in 9 days',
  daysSinceLastWorkout: 9,
  complianceRate7d: 10,
  complianceRate30d: 40,
  sessionsRemaining: 3,
  ...over,
});

const renderQueue = () => render(
  <MemoryRouter>
    <TrainerInterventionQueue />
  </MemoryRouter>,
);

describe('TrainerInterventionQueue', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockNavigate.mockReset();
  });

  it('renders the top at-risk clients with risk + days-since truth and caps at 4', async () => {
    mockGet.mockResolvedValue({
      data: {
        clients: [
          client(1, { riskLevel: 'critical', firstName: 'Ada', lastName: 'L', daysSinceLastWorkout: 15, reason: 'No workouts logged in 15 days' }),
          client(2), client(3), client(4), client(5, { firstName: 'Hidden' }),
        ],
      },
    });
    renderQueue();

    expect(await screen.findByText(/client interventions/i)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/admin/compliance/at-risk');
    expect(screen.getByText('Ada L')).toBeInTheDocument();
    expect(screen.getByText(/no workouts logged in 15 days/i)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hidden/)).toBeNull();
    expect(screen.getAllByRole('button', { name: /open .*client hub/i })).toHaveLength(4);
  });

  it('deep-links each client to the trainer-audience client hub', async () => {
    mockGet.mockResolvedValue({ data: { clients: [client(7, { firstName: 'Ada', lastName: 'L' })] } });
    renderQueue();
    const row = await screen.findByRole('button', { name: /open ada l.*client hub/i });
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const route = String(mockNavigate.mock.calls[0][0]);
    expect(route).toContain('clientId=7');
    expect(route).toContain('/trainer/');
  });

  it('shows the truthful all-clear state when nobody is at risk', async () => {
    mockGet.mockResolvedValue({ data: { clients: [] } });
    renderQueue();
    expect(await screen.findByText(/everyone's on track/i)).toBeInTheDocument();
  });

  it('self-hides on fetch failure instead of guessing', async () => {
    mockGet.mockRejectedValue(new Error('403'));
    const { container } = renderQueue();
    await vi.waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('keeps 44px touch targets and the deterministic-data disclosure (source locks)', () => {
    const source = readFileSync(resolve(__dirname, 'TrainerInterventionQueue.tsx'), 'utf8');
    expect(source).toContain('min-height: 44px');
    expect(source).toContain('From logged workout data');
  });
});
