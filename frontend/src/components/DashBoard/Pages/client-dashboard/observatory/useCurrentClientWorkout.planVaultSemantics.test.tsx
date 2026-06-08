/**
 * FILE: useCurrentClientWorkout.planVaultSemantics.test.tsx
 * PURPOSE: Locks plan-use semantics from /api/workouts/:clientId/current into the client plan vault.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentClientWorkout } from './useCurrentClientWorkout';

const mockApiGet = vi.hoisted(() => vi.fn());

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: mockApiGet,
  },
}));

const Probe: React.FC<{ userId: number }> = ({ userId }) => {
  const state = useCurrentClientWorkout(userId);
  const primary = state.planVault?.slots.find((slot) => slot.isPrimary);
  return (
    <output aria-label="primary-plan-use">
      {[
        primary?.assignmentDefault,
        primary?.billingIntent,
        String(primary?.defaultShouldDeductSession),
      ].join('|')}
    </output>
  );
};

describe('useCurrentClientWorkout plan vault semantics', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it('preserves assignment and billing intent fields from the current-workout catalog', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          trainingPlanCatalog: {
            defaultHorizonKey: 'six_month',
            primaryPlanId: 'plan-6m',
            slots: [
              {
                horizonKey: 'six_month',
                label: '6 Month',
                isFilled: true,
                isPrimary: true,
                plan: {
                  id: 'plan-6m',
                  title: 'Phase 1 Stabilization',
                  status: 'active',
                  assignmentDefault: 'trainer_session',
                  billingIntent: 'trainer_led_scheduled_flow',
                  defaultShouldDeductSession: false,
                },
              },
            ],
          },
        },
      },
    });

    render(<Probe userId={42} />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/workouts/42/current');
      expect(screen.getByLabelText('primary-plan-use')).toHaveTextContent(
        'trainer_session|trainer_led_scheduled_flow|false',
      );
    });
  });
});
