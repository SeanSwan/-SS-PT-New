export const APPLY_PAYMENT_MODAL_TYPE_SCOPE = 'schedule-payment-recovery';

export interface ClientNeedingPayment {
  id: number;
  name: string;
  email: string;
  phone?: string;
  availableSessions: number;
  clientSource?: string;
  upcomingSessions: number;
  nextSession?: string;
}

export interface StorefrontPackage {
  id: number;
  name: string;
  sessions: number;
  totalSessions?: number;
  price: string | number;
  totalCost: string | number;
  pricePerSession: string | number;
  packageType: string;
}

export type StorefrontPackageWithStatus = StorefrontPackage & {
  isActive?: boolean;
};

export interface LastPackageInfo {
  packageId: number;
  packageName: string;
  sessions: number;
  price: number;
  pricePerSession: number;
  packageType: string;
  orderId: number;
}

export type PaymentMethod = 'stripe' | 'cash' | 'venmo' | 'zelle' | 'check';
export type ModalMode = 'manual' | 'package';

export interface ApplyPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
  preselectedClientId?: number;
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface DuplicateInfo {
  orderId: number;
  orderNumber?: string;
  newBalance: number;
}

export interface ForceOverrideInput {
  force: boolean;
  forceReason: string;
}

export interface PaymentMethodConfig {
  placeholder: string;
  label: string;
  validation?: RegExp;
  validationMsg?: string;
  instructions?: string;
}
