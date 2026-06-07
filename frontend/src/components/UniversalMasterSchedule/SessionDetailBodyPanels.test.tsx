import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailBodyPanels from './SessionDetailBodyPanels';
import type { CancellationChargeType, LateCancelWarningModel } from './SessionDetailModal.actions';
import type { SessionDetail } from './SessionDetailModal.types';

const baseSession: SessionDetail = {
  id: 44,
  sessionDate: '2026-06-15T17:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  location: 'Main Studio',
  clientName: 'Client Example',
  trainerName: 'Coach Example',
  userId: 77,
  clientAvailableSessions: 2,
  clientSource: 'swanstudios',
  recurringGroupId: 'series-44',
  packageInfo: {
    name: 'Founders Pack',
    sessionsRemaining: 2,
    sessionsTotal: 8,
  },
};

const lateWarning: LateCancelWarningModel = {
  isLateCancellation: true,
  hoursUntilSession: 2,
  lateFeeAmount: 88,
  warningMessage: 'This cancellation is inside the 24-hour window.',
  sessionDateFormatted: 'June 15, 2026',
};

const renderBody = (overrides = {}) => {
  const props = {
    formError: 'Review the schedule state.',
    session: baseSession,
    sessionDate: new Date(baseSession.sessionDate),
    statusTone: 'info',
    hasAttendanceRecorded: false,
    canManage: true,
    mode: 'admin' as const,
    isNonDeductingClient: false,
    sessionSignal: { label: '2 paid sessions', note: 'refill soon', tone: 'warning' as const },
    onApplyPayment: vi.fn(),
    showNoShowReason: true,
    noShowReasonInput: 'traffic',
    onNoShowReasonChange: vi.fn(),
    canDeductNoShowSessionCredit: true,
    deductNoShowSessionCredit: true,
    onDeductNoShowSessionCreditChange: vi.fn(),
    canManageSeries: true,
    seriesCount: 3,
    loading: false,
    onManageSeries: vi.fn(),
    onDeleteSeries: vi.fn(),
    notes: 'sharp session',
    trainerRating: '5',
    clientFeedback: 'strong effort',
    onNotesChange: vi.fn(),
    onTrainerRatingChange: vi.fn(),
    onClientFeedbackChange: vi.fn(),
    canDeductCompletionSessionCredit: true,
    deductCompletionSessionCredit: true,
    onDeductCompletionSessionCreditChange: vi.fn(),
    clientRating: 0,
    clientComment: '',
    feedbackSubmitted: false,
    feedbackLoading: false,
    onClientRatingChange: vi.fn(),
    onClientCommentChange: vi.fn(),
    onSubmitFeedback: vi.fn(),
    showLateCancelWarning: false,
    lateCancelWarning: lateWarning,
    cancelReason: '',
    onCancelReasonChange: vi.fn(),
    onBackFromLateCancelWarning: vi.fn(),
    onConfirmLateCancellation: vi.fn(),
    canCancel: false,
    isEarlyCancelEligible: false,
    earlyCancel: false,
    onEarlyCancelChange: vi.fn(),
    showCancelOptions: true,
    packagePrice: 175,
    packageName: 'Founders Pack',
    chargeType: 'full' as CancellationChargeType,
    onChargeTypeChange: vi.fn(),
    chargeAmount: '175',
    onChargeAmountChange: vi.fn(),
    defaultFullCharge: 175,
    defaultLateFee: 88,
    restoreCredit: false,
    onRestoreCreditChange: vi.fn(),
    notifyOnCancel: true,
    onNotifyOnCancelChange: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<SessionDetailBodyPanels {...props} />),
  };
};

describe('SessionDetailBodyPanels', () => {
  it('composes the manager-facing session body without owning modal actions', () => {
    const { props } = renderBody();

    expect(screen.getByText('Review the schedule state.')).toBeInTheDocument();
    expect(screen.getByLabelText(/No-Show Reason/)).toHaveValue('traffic');
    expect(screen.getByText('Part of recurring series (3 sessions).')).toBeInTheDocument();
    expect(screen.getByText('Client Example')).toBeInTheDocument();
    expect(screen.getAllByText('Founders Pack').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Trainer Notes')).toHaveValue('sharp session');
    expect(screen.getByLabelText(/Deduct paid session credit/)).toBeChecked();
    expect(screen.getByText('Cancel Session - Choose Charge Option')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit Series'));
    fireEvent.click(screen.getByText('Delete Series'));

    expect(props.onManageSeries).toHaveBeenCalledWith('series-44');
    expect(props.onDeleteSeries).toHaveBeenCalledTimes(1);
  });

  it('lets managers waive completion billing when direct completion is used', () => {
    const { props } = renderBody();

    fireEvent.click(screen.getByLabelText(/Deduct paid session credit/));

    expect(props.onDeductCompletionSessionCreditChange).toHaveBeenCalledWith(false);
  });

  it('keeps the client feedback and late-cancel branches mutually scoped', () => {
    const { props } = renderBody({
      mode: 'client',
      canManage: false,
      canManageSeries: false,
      showNoShowReason: false,
      showCancelOptions: false,
      canCancel: true,
      session: { ...baseSession, status: 'completed' },
    });

    fireEvent.click(screen.getByLabelText('Rate 4 out of 5'));
    expect(props.onClientRatingChange).toHaveBeenCalledWith(4);
    expect(screen.getByLabelText(/Cancellation Reason/)).toBeInTheDocument();
    expect(screen.queryByText('Cancel Session - Choose Charge Option')).not.toBeInTheDocument();
  });
});
