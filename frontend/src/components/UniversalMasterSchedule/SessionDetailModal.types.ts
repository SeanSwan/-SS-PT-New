export type SessionDetailModalMode = 'admin' | 'trainer' | 'client';

export interface SessionDetail {
  id: number;
  sessionDate: string;
  duration: number;
  status: string;
  location?: string;
  notes?: string;
  reason?: string;
  trainerId?: number;
  userId?: number;
  rating?: number | null;
  feedback?: string | null;
  feedbackProvided?: boolean;
  clientName?: string;
  trainerName?: string;
  isRecurring?: boolean;
  isBlocked?: boolean;
  recurringGroupId?: string | null;
  packageInfo?: {
    name: string;
    sessionsRemaining?: number;
    sessionsTotal?: number | null;
    purchasedAt?: string | Date | null;
  };
  clientEmail?: string;
  clientPhone?: string;
  clientAvailableSessions?: number;
  clientSource?: string;
  sessionDeducted?: boolean;
  attendanceStatus?: 'present' | 'no_show' | 'late' | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  noShowReason?: string | null;
  attendanceRecordedAt?: string | null;
}

export interface SessionDetailModalProps {
  session: SessionDetail | null;
  open: boolean;
  mode: SessionDetailModalMode;
  onClose: () => void;
  onUpdated: () => void;
  onManageSeries?: (groupId: string) => void;
  onApplyPayment?: (clientId: number) => void;
  seriesCount?: number;
}
