import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlanCards from './ClientWorkoutPlanCards';
import type { ClientPlanSummary } from './ClientWorkoutPlansPanel.logic';

const activePlan = (overrides: Partial<ClientPlanSummary>): ClientPlanSummary => ({
  id: 'plan-fixture',
  name: 'Fixture Plan',
  status: 'active',
  goal: 'strength',
  horizonKey: 'six_month',
  ...overrides,
});

describe('ClientWorkoutPlanCards', () => {
  it('keeps Log Today attached to the primary active arc when multiple saved plans are active', () => {
    const onLogToday = vi.fn();
    const onOpenPdf = vi.fn();

    render(
      <ClientWorkoutPlanCards
        openingPdfId={null}
        plans={[
          activePlan({ id: 'primary', name: 'Primary Six Month Arc', isPrimary: true }),
          activePlan({
            id: 'maintenance',
            name: 'Maintenance One Month Arc',
            horizonKey: 'one_month',
            isPrimary: false,
          }),
        ]}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.getByRole('button', { name: /log today from primary six month arc/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log today from maintenance one month arc/i })).toBeNull();
  });

  it('replaces the primary log action with completed proof when today assignment was already logged', () => {
    const onLogToday = vi.fn();
    const onOpenPdf = vi.fn();

    render(
      <ClientWorkoutPlanCards
        openingPdfId={null}
        plans={[activePlan({ id: 'primary', name: 'Primary Six Month Arc', isPrimary: true })]}
        todayAssignment={{
          assignmentKey: 'primary:w1:d1:homework',
          status: 'completed',
          isLoggable: false,
          ctaLabel: 'Review Workout',
        }}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.queryByRole('button', { name: /log today from primary six month arc/i })).toBeNull();
    expect(screen.getByLabelText(/completed today from primary six month arc/i)).toHaveTextContent('Review Workout');
  });

  it('does not call a non-loggable rest assignment completed', () => {
    const onLogToday = vi.fn();
    const onOpenPdf = vi.fn();

    render(
      <ClientWorkoutPlanCards
        openingPdfId={null}
        plans={[activePlan({ id: 'primary', name: 'Primary Six Month Arc', isPrimary: true })]}
        todayAssignment={{
          assignmentKey: 'primary:w1:d2:rest',
          status: 'rest',
          isLoggable: false,
          ctaLabel: 'Rest Day',
        }}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.queryByLabelText(/completed today from primary six month arc/i)).toBeNull();
    expect(screen.getByLabelText(/not loggable today from primary six month arc/i)).toHaveTextContent('Rest Day');
  });
});
