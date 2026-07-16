/**
 * FILE: ClientWorkoutPlansPanel.commands.test.tsx
 * PURPOSE: Lock staff PDF recovery, lifecycle commands, and conflict receipts.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlansPanel from './ClientWorkoutPlansPanel';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const renderPlansPanel = () => render(
  <ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />,
);

const activePlanResponse = {
  data: {
    success: true,
    plans: [{
      id: 77,
      title: 'Phase 2 Strength Plan',
      status: 'active',
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 8,
      updatedAt: '2026-06-01T12:00:00.000Z',
    }],
  },
};

describe('ClientWorkoutPlansPanel staff commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.put.mockResolvedValue({ data: { success: true } });
    mockAuthAxios.post.mockResolvedValue({ data: { success: true } });
    mockAuthAxios.get.mockResolvedValue(activePlanResponse);
  });

  it('requests current PDF generation and audited lifecycle transitions from staff cards', async () => {
    const user = userEvent.setup();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [{
          id: 'revision-plan',
          title: 'Revision Aware Plan',
          status: 'active',
          durationWeeks: 26,
          contentRevision: 3,
          metadata: { planHorizon: 'six_month' },
          pdfDerivative: {
            enabled: true,
            state: 'failed',
            latestGenerated: {
              state: 'failed',
              sourceType: 'generated',
              sourceRevision: 3,
              safeErrorCode: 'WORKOUT_PLAN_PDF_RENDER_FAILED',
            },
          },
        }],
      },
    });

    renderPlansPanel();
    await user.click(await screen.findByRole('button', {
      name: /generate current pdf for revision aware plan/i,
    }));
    expect(mockAuthAxios.post).toHaveBeenCalledWith(
      '/api/workout-plans/revision-plan/pdf/generate',
      { expectedRevision: 3 },
    );
    await user.click(screen.getByRole('button', { name: /pause revision aware plan/i }));
    expect(mockAuthAxios.post).toHaveBeenCalledWith(
      '/api/workout-plans/revision-plan/status',
      { action: 'pause' },
    );
    expect(mockAuthAxios.get.mock.calls.filter(
      ([url]) => url === '/api/workout-plans/client/424242',
    ).length).toBeGreaterThanOrEqual(3);
  });

  it('surfaces a lifecycle conflict and refreshes stale staff plan state', async () => {
    const user = userEvent.setup();
    mockAuthAxios.post.mockRejectedValueOnce({ response: { status: 409 } });

    renderPlansPanel();
    await user.click(await screen.findByRole('button', { name: /pause phase 2 strength plan/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/changed on the server/i);
    expect(mockAuthAxios.get.mock.calls.filter(
      ([url]) => url === '/api/workout-plans/client/424242',
    ).length).toBeGreaterThanOrEqual(2);
  });
});
