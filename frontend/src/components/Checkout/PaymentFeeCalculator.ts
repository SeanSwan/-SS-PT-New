/**
 * PaymentFeeCalculator
 * ====================
 * Calculates processing fees and determines payment method priority
 * based on package value.
 *
 * Fee Schedule:
 * - Check: $0
 * - Zelle: $0
 * - ACH:   min(total * 0.008, $5) — 0.8% capped at $5
 * - Card:  (total * 0.029) + $0.30
 * - Venmo: (total * 0.019) + $0.10
 */

export type PaymentMethodId = 'check' | 'zelle' | 'ach' | 'card' | 'venmo';

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  label: string;
  fee: number;
  feeLabel: string;
  isZeroFee: boolean;
  description: string;
  icon: string;
}

/** Calculate processing fee for a payment method */
export function calculateFee(method: PaymentMethodId, total: number): number {
  switch (method) {
    case 'check': return 0;
    case 'zelle': return 0;
    case 'ach': return Math.min(total * 0.008, 5);
    case 'card': return (total * 0.029) + 0.30;
    case 'venmo': return (total * 0.019) + 0.10;
    default: return 0;
  }
}

/** Format fee as display string */
function formatFee(fee: number): string {
  if (fee === 0) return 'Zero Fee';
  return `+$${fee.toFixed(2)} fee`;
}

/** Get payment methods sorted by priority for a given total */
export function getPaymentMethods(total: number): PaymentMethodInfo[] {
  const methods: PaymentMethodInfo[] = [
    {
      id: 'check',
      label: 'Check',
      fee: calculateFee('check', total),
      feeLabel: formatFee(0),
      isZeroFee: true,
      description: 'Mail a personal or business check',
      icon: '📄',
    },
    {
      id: 'zelle',
      label: 'Zelle',
      fee: calculateFee('zelle', total),
      feeLabel: formatFee(0),
      isZeroFee: true,
      description: 'Instant bank transfer via Zelle',
      icon: '⚡',
    },
    {
      id: 'ach',
      label: 'ACH / eCheck',
      fee: calculateFee('ach', total),
      feeLabel: formatFee(calculateFee('ach', total)),
      isZeroFee: false,
      description: 'Direct bank transfer (1-3 business days)',
      icon: '🏦',
    },
    {
      id: 'card',
      label: 'Credit/Debit Card',
      fee: calculateFee('card', total),
      feeLabel: formatFee(calculateFee('card', total)),
      isZeroFee: false,
      description: 'Visa, Mastercard, Amex via Stripe',
      icon: '💳',
    },
    {
      id: 'venmo',
      label: 'Venmo',
      fee: calculateFee('venmo', total),
      feeLabel: formatFee(calculateFee('venmo', total)),
      isZeroFee: false,
      description: 'Pay with your Venmo account',
      icon: '📱',
    },
  ];

  // Priority hierarchy based on amount
  let priorityOrder: PaymentMethodId[];

  if (total >= 4200) {
    priorityOrder = ['check', 'ach', 'zelle', 'card', 'venmo'];
  } else if (total >= 1000) {
    priorityOrder = ['zelle', 'ach', 'check', 'card', 'venmo'];
  } else {
    priorityOrder = ['zelle', 'card', 'ach', 'venmo', 'check'];
  }

  return priorityOrder.map(id => methods.find(m => m.id === id)!);
}

/** Calculate total with fee */
export function getTotalWithFee(subtotal: number, method: PaymentMethodId): number {
  return subtotal + calculateFee(method, subtotal);
}
