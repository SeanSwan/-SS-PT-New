export type SessionAttendanceStatus = 'present' | 'no_show' | 'late';
export type SessionCancellationChargeType = 'none' | 'full' | 'partial' | 'late_fee';
export type SessionCancellationDecision = 'pending' | 'charged' | 'waived';

export interface SessionBackendLifecycleFields {
  remindersSent?: Record<string, string> | null;
  cancellationReason?: string | null;
  cancellationDate?: string | null;
  cancelledBy?: string | number | null;
  cancellationChargeType?: SessionCancellationChargeType | null;
  cancellationChargeAmount?: string | number | null;
  sessionCreditRestored?: boolean;
  cancellationChargedAt?: string | null;
  cancellationDecision?: SessionCancellationDecision | null;
  cancellationReviewedBy?: string | number | null;
  cancellationReviewedAt?: string | null;
  cancellationReviewReason?: string | null;
  attendanceStatus?: SessionAttendanceStatus | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  noShowReason?: string | null;
  markedPresentBy?: string | number | null;
  attendanceRecordedAt?: string | null;
  deductionDate?: string | null;
  confirmed?: boolean;
  reminderSent?: boolean;
}
