import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

const start = source.indexOf("router.post('/create-checkout-session'");
const end = source.indexOf("router.post('/verify-session'", start);
const checkoutSource = source.slice(start, end);

describe('v2 checkout account identity boundary', () => {
  it('mounts and finds the canonical checkout handler', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it('uses checkout contact details for Stripe and receipts without mutating login identity', () => {
    expect(checkoutSource).toContain('email: customerInfo?.email || user.email');
    expect(checkoutSource).toContain('phone: customerInfo?.phone || user.phone');

    const userUpdateStart = checkoutSource.indexOf('await user.update({');
    const userUpdateEnd = checkoutSource.indexOf('});', userUpdateStart);
    const userUpdateSource = checkoutSource.slice(userUpdateStart, userUpdateEnd);

    expect(userUpdateStart).toBeGreaterThan(-1);
    expect(userUpdateSource).toContain('stripeCustomerId: stripeCustomer.id');
    expect(userUpdateSource).not.toContain('email: customerInfo.email');
    expect(userUpdateSource).not.toContain('phone: customerInfo.phone');
  });
});
