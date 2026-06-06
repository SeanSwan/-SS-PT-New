/**
 * FILE: ClientTrainingPlanVaultCard.test.tsx
 * PURPOSE: Locks client Plan Vault actions to the workout-progress-first loop.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientTrainingPlanVaultCard from './ClientTrainingPlanVaultCard';
import type { ClientTrainingPlanVault } from './useCurrentClientWorkout';

const PLAN_VAULT: ClientTrainingPlanVault = {
  defaultHorizonKey: 'six_month',
  primaryPlanId: 'plan-6m',
  filledCount: 1,
  slots: [
    { horizonKey: 'one_day', label: '1 Day', isFilled: false, isPrimary: false },
    {
      horizonKey: 'six_month',
      label: '6 Month',
      isDefaultHorizon: true,
      isFilled: true,
      isPrimary: true,
      planId: 'plan-6m',
      planTitle: 'Phase 1 Stabilization',
      planStatus: 'active',
      pdfFile: {
        url: '/api/workout-plans/plan-6m/pdf/content.pdf',
        fileName: 'Six Month Foundation.pdf',
        contentType: 'application/pdf',
      },
    },
  ],
};

describe('ClientTrainingPlanVaultCard', () => {
  it('routes the primary active plan directly into today-loaded workout logging', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={onNavigate}
        onViewPdf={vi.fn()}
      />
    );

    const vault = screen.getByTestId('client-plan-vault-card');
    const primaryRow = within(vault).getByText(/6 month primary/i).closest('div');
    expect(primaryRow).not.toBeNull();

    await user.click(
      within(primaryRow as HTMLElement).getByRole('button', {
        name: /log today from 6 month primary plan/i,
      })
    );

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout?loadPlan=today');
  });

  it('does not offer logging from empty pending horizon slots', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /log today from 1 day primary plan/i })
    ).toBeNull();
  });
});
