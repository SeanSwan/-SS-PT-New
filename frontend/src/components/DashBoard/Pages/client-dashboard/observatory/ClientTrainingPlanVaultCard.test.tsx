/**
 * FILE: ClientTrainingPlanVaultCard.test.tsx
 * PURPOSE: Locks client Plan Vault actions to the workout-progress-first loop.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientTrainingPlanVaultCard from './ClientTrainingPlanVaultCard';
import type { ClientTrainingPlanVault, CurrentClientWorkout } from './useCurrentClientWorkout';

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
      assignmentDefault: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      defaultShouldDeductSession: false,
      currentWeek: 4,
      currentDay: 2,
      pdfFile: {
        url: '/api/workout-plans/plan-6m/pdf/content.pdf',
        fileName: 'Six Month Foundation.pdf',
        contentType: 'application/pdf',
      },
    },
  ],
};

const CURRENT_HOMEWORK: CurrentClientWorkout = {
  title: 'Off-Day Lower Homework',
  assignmentKey: 'plan-6m:w4:d2:homework',
  assignmentType: 'homework',
  assignmentStatus: 'planned',
  sessionType: 'solo',
  isLoggable: true,
  ctaLabel: 'Log Assignment',
  weekNumber: 4,
  dayNumber: 2,
  exerciseCount: 1,
  firstExercise: 'Goblet Squat',
};

describe('ClientTrainingPlanVaultCard', () => {
  it('routes the primary active plan directly into today-loaded workout logging', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        currentWorkout={CURRENT_HOMEWORK}
        onNavigate={onNavigate}
        onViewPdf={vi.fn()}
      />
    );

    const primaryRow = screen.getByLabelText(/6 month primary plan arc/i);

    await user.click(
      within(primaryRow).getByRole('button', {
        name: /log today from 6 month primary plan/i,
      })
    );

    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw4%3Ad2%3Ahomework&assignmentType=homework',
    );
  });

  it('does not offer primary-plan logging when today assignment belongs to another plan', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        currentWorkout={{
          ...CURRENT_HOMEWORK,
          assignmentKey: 'plan-1w:w1:d1:homework',
        }}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /log today from 6 month primary plan/i })
    ).toBeNull();
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

  it('does not offer a duplicate log action when today assignment is already completed', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        canLogToday={false}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /log today from 6 month primary plan/i })
    ).toBeNull();
  });

  it('uses clear visible copy for protected PDF plan access', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /view 6 month pdf plan/i })
    ).toHaveTextContent(/open pdf/i);
  });

  it('shows the plan-use semantics so clients know trainer-led arcs are not self-log homework', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    const primaryRow = screen.getByLabelText(/6 month primary plan arc/i);
    expect(primaryRow).toHaveTextContent(/trainer-led/i);
    expect(primaryRow).toHaveTextContent(/scheduled session/i);
    expect(primaryRow).toHaveTextContent(/coach controls deduction/i);
  });

  it('shows the primary arc cursor so clients can verify the current week and day', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    const primaryRow = screen.getByLabelText(/6 month primary plan arc/i);
    expect(primaryRow).toHaveTextContent(/week 4/i);
    expect(primaryRow).toHaveTextContent(/day 2/i);
  });

  it('does not repeat the primary label twice in the same row', () => {
    render(
      <ClientTrainingPlanVaultCard
        planVault={PLAN_VAULT}
        onNavigate={vi.fn()}
        onViewPdf={vi.fn()}
      />
    );

    expect(screen.getByTestId('client-plan-vault-card').textContent).not.toMatch(/primaryprimary/i);
  });
});
