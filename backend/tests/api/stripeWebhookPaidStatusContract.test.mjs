/**
 * Global Stripe cart-webhook payment-status gate.
 *
 * The signature proves Stripe sent the event; it does not prove the Checkout
 * Session is payable. Fulfillment must reject unpaid sessions before reading
 * cart metadata or granting session credits.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'webhooks/stripeWebhook.mjs'),
  'utf8',
);

const completedStart = source.indexOf("case 'checkout.session.completed':");
const completedEnd = source.indexOf("case 'checkout.session.expired':", completedStart);
const completedBlock = source.slice(completedStart, completedEnd);

describe('global Stripe checkout fulfillment payment-status gate', () => {
  it('rejects an unpaid cart session before any session grant', () => {
    expect(completedStart).toBeGreaterThanOrEqual(0);
    expect(completedEnd).toBeGreaterThan(completedStart);

    const paidGuardIndex = completedBlock.indexOf("session.payment_status !== 'paid'");
    const cartGrantIndex = completedBlock.indexOf('grantSessionsForCart(');

    expect(paidGuardIndex).toBeGreaterThanOrEqual(0);
    expect(cartGrantIndex).toBeGreaterThan(paidGuardIndex);
    expect(completedBlock).toContain('Skipping unpaid checkout completion');
  });
});
