import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleAiOperatorDock from './ScheduleAiOperatorDock';

const baseProps = {
  mode: 'admin' as const,
  activeView: 'week',
  currentDate: new Date('2026-06-28T12:00:00.000Z'),
  sessions: [
    {
      id: '88',
      status: 'confirmed',
      sessionDate: '2026-06-28T15:00:00.000Z',
      updatedAt: '2026-06-28T10:00:00.000Z',
      userId: '12',
      trainerId: '8',
    },
  ],
};

describe('ScheduleAiOperatorDock', () => {
  it('sends text requests with safe schedule context and renders proposal cards', async () => {
    const requestProposal = vi.fn(async () => ({
      success: true,
      type: 'proposal_generated',
      proposal: {
        id: 'proposal-1',
        action: 'draft_booking',
        status: 'pending_review',
        executionPolicy: 'proposal_only',
        confirmation: { required: true, canExecute: false, reason: 'SCHEDULE_REVIEW_REQUIRED' },
        risk: { category: 'schedule_write', level: 'medium', mutatesData: false },
        content: 'Draft prepared for review.',
      },
    }));

    const recurringSessions = [
      {
        id: '88',
        status: 'confirmed',
        sessionDate: '2026-06-28T15:00:00.000Z',
        endDate: '2026-06-28T16:00:00.000Z',
        duration: 60,
        userId: '12',
        trainerId: '8',
        recurringGroupId: 'series-alpha',
        clientName: 'Private Client',
        notes: 'Do not send this note',
        email: 'client@example.com',
      },
      {
        id: '89',
        status: 'confirmed',
        sessionDate: '2026-06-28T15:30:00.000Z',
        endDate: '2026-06-28T16:30:00.000Z',
        duration: 60,
        trainerId: '8',
      },
    ];

    render(<ScheduleAiOperatorDock {...baseProps} sessions={recurringSessions} requestProposal={requestProposal} />);

    fireEvent.click(screen.getByRole('button', { name: /open schedule ai operator/i }));
    fireEvent.change(screen.getByLabelText(/schedule ai request/i), {
      target: { value: 'Book Client #12 tomorrow' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send schedule ai request/i }));

    await waitFor(() => expect(requestProposal).toHaveBeenCalledTimes(1));
    expect(requestProposal).toHaveBeenCalledWith({
      message: 'Book Client #12 tomorrow',
      context: expect.objectContaining({
        surface: 'universal_master_schedule',
        mode: 'admin',
        activeView: 'week',
        visibleSessionIds: ['88', '89'],
        sessionCount: 2,
        recurringSeries: [expect.objectContaining({
          id: '88',
          recurringGroupId: 'series-alpha',
          sessionDate: '2026-06-28T15:00:00.000Z',
          endDate: '2026-06-28T16:00:00.000Z',
          duration: 60,
          userId: '12',
          trainerId: '8',
          status: 'confirmed',
        })],
        comparisonSessions: expect.arrayContaining([
          expect.objectContaining({ id: '88', trainerId: '8' }),
          expect.objectContaining({ id: '89', trainerId: '8' }),
        ]),
      }),
    });
    const sentContext = requestProposal.mock.calls[0][0].context;
    expect(JSON.stringify(sentContext)).not.toContain('Private Client');
    expect(JSON.stringify(sentContext)).not.toContain('Do not send this note');
    expect(JSON.stringify(sentContext)).not.toContain('client@example.com');
    expect(screen.getByText(/draft booking/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft prepared for review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss proposal/i })).toBeInTheDocument();
  });

  it('keeps voice control disabled when browser speech recognition is unavailable', () => {
    render(<ScheduleAiOperatorDock {...baseProps} requestProposal={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /open schedule ai operator/i }));

    expect(screen.getByRole('button', { name: /voice input unavailable/i })).toBeDisabled();
  });

  it('dismisses generated proposals without mutating schedule state', async () => {
    const requestProposal = vi.fn(async () => ({
      success: true,
      type: 'proposal_generated',
      proposal: {
        id: 'proposal-2',
        action: 'open_payment_review',
        status: 'pending_review',
        executionPolicy: 'manual_only',
        manualOnly: true,
        confirmation: { required: true, canExecute: false, reason: 'MANUAL_PAYMENT_REVIEW_REQUIRED' },
        risk: { category: 'billing_review', level: 'high', mutatesData: false },
        content: 'Open manual payment review.',
      },
    }));

    render(<ScheduleAiOperatorDock {...baseProps} requestProposal={requestProposal} />);
    fireEvent.click(screen.getByRole('button', { name: /open schedule ai operator/i }));
    fireEvent.change(screen.getByLabelText(/schedule ai request/i), {
      target: { value: 'Charge cancellation fee' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send schedule ai request/i }));

    expect(await screen.findByText(/open payment review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss proposal/i }));

    expect(screen.queryByText(/open payment review/i)).not.toBeInTheDocument();
    expect(requestProposal).toHaveBeenCalledTimes(1);
  });
});
