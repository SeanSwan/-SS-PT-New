/**
 * Stripe Checkout return URL environment contract.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/v2PaymentRoutes.mjs'),
  'utf8',
);
const renderSource = readFileSync(
  resolve(process.cwd(), '../render.yaml'),
  'utf8',
);

describe('v2 Stripe Checkout return URLs', () => {
  it('uses the backend FRONTEND_URL declared by Render with a production-safe fallback', () => {
    expect(renderSource).toContain('- key: FRONTEND_URL');
    expect(renderSource).not.toContain('- key: VITE_FRONTEND_URL');

    expect(routeSource).toContain(
      "const checkoutReturnBaseUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\\/+$/, '')",
    );
    expect(routeSource).toContain(
      'success_url: `${checkoutReturnBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`',
    );
    expect(routeSource).toContain(
      'cancel_url: `${checkoutReturnBaseUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`',
    );
    expect(routeSource).not.toContain('process.env.VITE_FRONTEND_URL');
  });
});
