/**
 * Arc L / L1 — ghost-tap-accept contracts (ELEGANCE-BLUEPRINT-ARC-L-LOGGER).
 * The 1-gesture repeat: with onAccept the ghost row becomes a ≥44px button returning the REAL
 * previous set; without it, the row stays exactly the read-only display (client route unchanged).
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiGet = vi.fn();
vi.mock('../../services/api.service', () => ({
  default: { get: (...args: unknown[]) => apiGet(...args) },
}));

import GhostDataRow from './GhostDataRow';

const workoutsPayload = (exerciseName: string) => ({
  status: 200,
  data: {
    success: true,
    workouts: [{
      logs: [
        { exerciseName, setNumber: 1, weight: 135, reps: 10, rpe: 7 },
        { exerciseName, setNumber: 2, weight: 145, reps: 8 },
      ],
    }],
  },
});

describe('GhostDataRow accept action (L1)', () => {
  beforeEach(() => apiGet.mockReset());

  it('with onAccept: renders a button and returns the REAL previous set on tap', async () => {
    apiGet.mockResolvedValueOnce(workoutsPayload('L1 Bench Unique A'));
    const onAccept = vi.fn();
    render(<GhostDataRow exerciseName="L1 Bench Unique A" clientId={9001} setIndex={0} onAccept={onAccept} />);
    const btn = await screen.findByRole('button', { name: /beat this — 135 × 10/i });
    fireEvent.click(btn);
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ weight: 135, reps: 10, rpe: 7 }));
  });

  it('without onAccept: no button role — read-only display exactly as before', async () => {
    apiGet.mockResolvedValueOnce(workoutsPayload('L1 Squat Unique B'));
    render(<GhostDataRow exerciseName="L1 Squat Unique B" clientId={9002} setIndex={0} />);
    await waitFor(() => expect(screen.getByLabelText(/previous: 135lbs × 10 reps/i)).toBeInTheDocument());
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('skip stays a total no-op even with onAccept (client-route rule preserved)', () => {
    const onAccept = vi.fn();
    const { container } = render(
      <GhostDataRow exerciseName="L1 Row Unique C" clientId={9003} setIndex={0} skip onAccept={onAccept} />,
    );
    expect(apiGet).not.toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
  });
});
