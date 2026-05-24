import type { CheckoutSuccessOrderData } from './checkoutActivation';

export type CheckoutReceiptOrderData = CheckoutSuccessOrderData;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatOrderDate(orderDate: string): string {
  const parsed = new Date(orderDate);
  if (Number.isNaN(parsed.getTime())) return orderDate || 'Unknown date';
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'checkout';
}

export function buildCheckoutReceiptFilename(orderData: CheckoutReceiptOrderData): string {
  return `swanstudios-receipt-${sanitizeFilenamePart(orderData.sessionId)}.txt`;
}

export function buildCheckoutReceiptText(orderData: CheckoutReceiptOrderData): string {
  const lines = [
    'SwanStudios Receipt',
    '===================',
    '',
    `Checkout session: ${orderData.sessionId}`,
    `Date: ${formatOrderDate(orderData.orderDate)}`,
    `Amount paid: ${currencyFormatter.format(Number(orderData.amount || 0))}`,
    `Training sessions added: ${orderData.sessionsAdded ?? 'Pending allocation confirmation'}`,
  ];

  if (orderData.customerName) lines.push(`Customer: ${orderData.customerName}`);
  if (orderData.customerEmail) lines.push(`Email: ${orderData.customerEmail}`);

  lines.push('', 'Thank you for your SwanStudios purchase.');
  return `${lines.join('\n')}\n`;
}

export function downloadCheckoutReceipt(orderData: CheckoutReceiptOrderData): void {
  const receiptText = buildCheckoutReceiptText(orderData);
  const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = buildCheckoutReceiptFilename(orderData);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
