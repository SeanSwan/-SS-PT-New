import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('does not offer primary-plan logging when today assignment belongs to another plan', () => {
    const onLogToday = vi.fn();
    const onOpenPdf = vi.fn();

    render(
      <ClientWorkoutPlanCards
        openingPdfId={null}
        plans={[activePlan({ id: 'primary', name: 'Primary Six Month Arc', isPrimary: true })]}
        todayAssignment={{
          assignmentKey: 'other-plan:w1:d1:homework',
          status: 'planned',
          isLoggable: true,
          ctaLabel: 'Log Assignment',
        }}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.queryByRole('button', { name: /log assignment from primary six month arc/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /log today from primary six month arc/i })).toBeNull();
  });

  it('treats legacy uppercase active statuses as current for primary-plan logging', () => {
    const onLogToday = vi.fn();
    const onOpenPdf = vi.fn();

    render(
      <ClientWorkoutPlanCards
        openingPdfId={null}
        plans={[activePlan({ id: 'primary', name: 'Primary Six Month Arc', status: 'ACTIVE', isPrimary: true })]}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.getByRole('button', { name: /log today from primary six month arc/i })).toBeInTheDocument();
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
  it('renders explicit staff plan, planner, PDF recovery, and lifecycle actions', async () => {
    const user = userEvent.setup();
    const onGeneratePdf = vi.fn();
    const onLifecycle = vi.fn();
    const onOpenPdf = vi.fn();
    const failedPlan = activePlan({
      id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
      name: 'Revision Aware Strength Arc',
      isPrimary: true,
      contentRevision: 3,
      currentWeek: 4,
      currentDay: 2,
      pdfFile: {
        url: '/api/workout-plans/6ea7806d-36c8-4307-bd5d-6b04b68be849/pdf/content.pdf',
        fileName: 'Strength Arc.pdf',
        contentType: 'application/pdf',
        updatedAt: null,
        sourceType: 'generated',
        sourceRevision: 2,
      },
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
    });

    render(
      <ClientWorkoutPlanCards
        audience="admin"
        clientId={42}
        openingPdfId={null}
        plans={[failedPlan]}
        onGeneratePdf={onGeneratePdf}
        onLifecycle={onLifecycle}
        onOpenPdf={onOpenPdf}
      />
    );

    expect(screen.getByText('PDF generation failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit revision aware strength arc in planner/i }))
      .toHaveAttribute('href', expect.stringContaining('planId=6ea7806d-36c8-4307-bd5d-6b04b68be849&mode=edit'));
    expect(screen.getByRole('button', { name: /view revision aware strength arc plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view revision aware strength arc pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate current pdf for revision aware strength arc/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view revision aware strength arc plan/i }));
    expect(screen.getByRole('region', { name: /revision aware strength arc plan details/i }))
      .toHaveTextContent(/revision3/i);
    await user.click(screen.getByRole('button', { name: /generate current pdf for revision aware strength arc/i }));
    expect(onGeneratePdf).toHaveBeenCalledWith(failedPlan);
    await user.click(screen.getByRole('button', { name: /pause revision aware strength arc/i }));
    expect(onLifecycle).toHaveBeenCalledWith(failedPlan, 'pause');
  });

  it('labels preserved manual PDFs for review without hiding the protected file', () => {
    render(
      <ClientWorkoutPlanCards
        clientId={42}
        openingPdfId={null}
        plans={[activePlan({
          id: 'manual-plan',
          name: 'Manual Review Arc',
          isPrimary: true,
          contentRevision: 3,
          pdfFile: {
            url: '/api/workout-plans/manual-plan/pdf/content.pdf',
            fileName: 'Manual Review.pdf',
            contentType: 'application/pdf',
            updatedAt: null,
            sourceType: 'manual',
            sourceRevision: 2,
            needsReview: true,
          },
          pdfDerivative: {
            enabled: true,
            state: 'missing',
            latestManual: {
              state: 'ready',
              sourceType: 'manual',
              sourceRevision: 2,
              needsReview: true,
            },
          },
        })]}
        onGeneratePdf={vi.fn()}
        onLifecycle={vi.fn()}
        onOpenPdf={vi.fn()}
      />
    );

    expect(screen.getByText('Custom upload - review after plan changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view manual review arc pdf/i })).toBeInTheDocument();
  });
});
