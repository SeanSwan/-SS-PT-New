import type { PaymentMethod, PaymentMethodConfig } from './ApplyPaymentModal.types';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'stripe', label: 'Card on File' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
];

export const PAYMENT_METHOD_CONFIG: Record<string, PaymentMethodConfig> = {
  venmo: {
    placeholder: '@username',
    label: 'Venmo Handle',
    validation: /^@\w{1,50}$/,
    validationMsg: 'Venmo handle must start with @ (e.g., @username)',
    instructions: 'Confirm you have received the Venmo payment before applying.'
  },
  zelle: {
    placeholder: 'email@example.com or phone number',
    label: 'Zelle Email/Phone',
    validation: /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?\d{10,15})$/,
    validationMsg: 'Enter a valid email address or phone number',
    instructions: 'Confirm you have received the Zelle payment before applying.'
  },
  check: {
    placeholder: 'Check #1234',
    label: 'Check Number',
    instructions: 'Enter the check number for record-keeping.'
  }
};

export const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
