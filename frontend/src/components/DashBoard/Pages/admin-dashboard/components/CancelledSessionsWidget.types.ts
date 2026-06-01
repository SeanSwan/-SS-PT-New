export type CancellationDecision = 'pending' | 'charged' | 'waived';
export type ChargeType = 'late_fee' | 'full' | 'custom' | 'none';
export type DecisionFilter = 'all' | CancellationDecision;

export interface CancelledSession {
  id: number;
  sessionDate: string;
  cancellationDate: string;
  cancellationReason: string;
  clientName: string;
  trainerName: string;
  isLateCancellation: boolean;
  hoursUntilSession: number;
  chargePending: boolean;
  cancellationChargeType: string | null;
  cancellationChargeAmount: number | null;
  cancellationChargedAt: string | null;
  cancellationDecision: CancellationDecision | null;
  cancellationReviewReason: string | null;
  reviewerInfo?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PackagePriceInfo {
  pricePerSession: number | null;
  packageName: string | null;
  fallbackPrice: number | null;
  defaultChargeAmount: number | null;
  lateFeeAmount: number | null;
  isPricingAvailable: boolean;
}

export interface CancelledSessionsWidgetProps {
  maxItems?: number;
  showChargeButtons?: boolean;
}

export interface OperationNoticeState {
  type: 'success' | 'error';
  message: string;
}
