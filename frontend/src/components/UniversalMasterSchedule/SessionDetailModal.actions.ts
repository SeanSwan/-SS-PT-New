import type { SessionDetail } from './SessionDetailModal.types';

export type AttendanceStatus = 'present' | 'no_show' | 'late';
export type CancellationChargeType = 'none' | 'full' | 'partial' | 'late_fee';

export interface CompleteSessionPayloadInput {
  notes: string;
  trainerRating: string;
  clientFeedback: string;
  deductSessionCredit?: boolean;
  waiveReason?: string;
}

export interface CancellationActionInput {
  canManage: boolean;
  chargeType: CancellationChargeType;
  chargeAmount: string;
  defaultFullCharge: number;
  defaultLateFee: number;
  restoreCredit: boolean;
  earlyCancel: boolean;
  isEarlyCancelEligible?: boolean;
  cancelReason?: string;
  notifyOnCancel?: boolean;
}

export interface LateCancelWarningModel {
  isLateCancellation: boolean;
  hoursUntilSession: number;
  /** null when the server did not state a policy fee. Never invent one here:
   *  this figure is shown to the CLIENT as their own cancellation fee. */
  lateFeeAmount: number | null;
  /** null when the server did not state it. Do not assume restoration. */
  creditRestored: boolean | null;
  warningMessage: string;
  sessionDateFormatted: string;
}

export interface CancelPanelDefaults {
  chargeType: CancellationChargeType;
  chargeAmount: string;
  restoreCredit: boolean;
}

export const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

export const buildCompleteSessionPayload = ({
  notes,
  trainerRating,
  clientFeedback,
  deductSessionCredit,
  waiveReason,
}: CompleteSessionPayloadInput) => ({
  notes: notes.trim() || undefined,
  trainerRating: trainerRating ? Number(trainerRating) : undefined,
  clientFeedback: clientFeedback.trim() || undefined,
  completeWithoutLog: true,
  ...(typeof deductSessionCredit === 'boolean' ? { deductSessionCredit } : {}),
  ...(typeof waiveReason === 'string' && waiveReason.trim()
    ? { waiveReason: waiveReason.trim() }
    : {}),
});

export const buildAttendancePayload = (
  attendanceStatus: AttendanceStatus,
  noShowReasonInput: string,
  notes: string,
  deductSessionCredit?: boolean
) => ({
  attendanceStatus,
  ...(attendanceStatus === 'no_show' && noShowReasonInput.trim()
    ? { noShowReason: noShowReasonInput.trim() }
    : {}),
  ...(attendanceStatus === 'no_show' && typeof deductSessionCredit === 'boolean'
    ? { deductSessionCredit }
    : {}),
  ...(notes.trim() ? { notes: notes.trim() } : {}),
});

export const mapLateCancelWarning = (
  result: any
): LateCancelWarningModel => ({
  isLateCancellation: result.isLateCancellation,
  hoursUntilSession: result.hoursUntilSession,
  // ?? not ||: a real policy fee of 0 is a waiver, not a missing value. And no
  // app-side default - the admin panel's 175/88 placeholders are not this
  // client's numbers, and this warning is what the client themselves reads.
  lateFeeAmount: result.cancellationPolicy?.lateFeeAmount ?? null,
  creditRestored: result.cancellationPolicy?.creditRestored ?? null,
  warningMessage: result.warningMessage,
  sessionDateFormatted: result.sessionDateFormatted,
});

export const buildCancelConfirmationMessage = ({
  canManage,
  chargeType,
  chargeAmount,
  defaultFullCharge,
  defaultLateFee,
  restoreCredit,
  earlyCancel,
}: CancellationActionInput) => {
  if (!canManage) {
    return earlyCancel
      ? 'Early cancel - no session credit will be deducted. Proceed?'
      : 'Cancel this session? A session credit may be deducted.';
  }

  if (chargeType === 'none') {
    return restoreCredit
      ? 'Cancel with no charge. Session credit will be restored. Proceed?'
      : 'Cancel with no charge. Proceed?';
  }

  if (chargeType === 'full') {
    return `Cancel with FULL SESSION CHARGE ($${defaultFullCharge}). Proceed?`;
  }

  if (chargeType === 'partial') {
    const amount = parseFloat(chargeAmount) || 0;
    return `Cancel with partial charge ($${amount.toFixed(2)}). Proceed?`;
  }

  const amount = parseFloat(chargeAmount) || defaultLateFee;
  return `Cancel with late fee ($${amount.toFixed(2)}). Proceed?`;
};

export const buildCancelPanelDefaults = (
  isEarlyCancelEligible: boolean,
  defaultFullCharge: number,
  pricingUnavailable = false
): CancelPanelDefaults => {
  if (isEarlyCancelEligible) {
    return { chargeType: 'none', chargeAmount: '', restoreCredit: true };
  }

  // Fail closed: without this client's real package price we must not pre-arm a
  // charge. The admin picks an amount deliberately instead of confirming a
  // placeholder that is presented as package-derived.
  if (pricingUnavailable) {
    return { chargeType: 'none', chargeAmount: '', restoreCredit: true };
  }

  return { chargeType: 'full', chargeAmount: String(defaultFullCharge), restoreCredit: false };
};

export const buildCancelPayload = ({
  canManage,
  cancelReason = '',
  notifyOnCancel = true,
  chargeType,
  chargeAmount,
  defaultFullCharge,
  defaultLateFee: _defaultLateFee,
  restoreCredit,
  earlyCancel,
  isEarlyCancelEligible = false,
}: CancellationActionInput) => {
  const payload: Record<string, unknown> = {
    reason: cancelReason.trim() || undefined,
    notifyClient: notifyOnCancel,
    notifyTrainer: notifyOnCancel,
  };

  if (canManage) {
    payload.chargeType = chargeType;
    payload.chargeAmount = chargeType === 'full'
      ? defaultFullCharge
      : (chargeType === 'partial' || chargeType === 'late_fee'
        ? parseFloat(chargeAmount) || 0
        : 0);
    payload.restoreCredit = restoreCredit && chargeType === 'none';
    return payload;
  }

  payload.chargeType = earlyCancel && isEarlyCancelEligible ? 'none' : 'late_fee';
  payload.restoreCredit = earlyCancel && isEarlyCancelEligible;
  return payload;
};

export const isValidTrainerRating = (trainerRating: string) => {
  if (!trainerRating) {
    return true;
  }

  const ratingValue = Number(trainerRating);
  return Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5;
};

export const getSessionDate = (session: SessionDetail) => new Date(session.sessionDate);
