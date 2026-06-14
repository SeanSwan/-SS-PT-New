import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const readRoute = () => readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

describe('checkout Lead capture route contract', () => {
  it('records verified checkout conversions after fulfillment without blocking responses', () => {
    const source = readRoute();

    expect(source).toContain("import { captureLeadFromCheckout } from '../services/leadCaptureService.mjs';");
    expect(source).toContain('async function captureVerifiedCheckoutLead');
    expect(source).toMatch(/const leadCaptureResult = await captureLeadFromCheckout\(\{[\s\S]*user,[\s\S]*session,[\s\S]*cart,[\s\S]*sessionsAdded,[\s\S]*\}\);/);
    expect(source).toMatch(/const result = await fulfillSessionPackageCheckoutSession\(session\);[\s\S]*await captureVerifiedCheckoutLead\(\{[\s\S]*user: req\.user,[\s\S]*session,[\s\S]*sessionsAdded: result\.sessionsAdded,[\s\S]*\}\);/);
    expect(source).toMatch(/const result = await grantSessionsForCart\(cart\.id, userId, 'verify-session'\);[\s\S]*await captureVerifiedCheckoutLead\(\{[\s\S]*cart,[\s\S]*user: req\.user,[\s\S]*session,[\s\S]*sessionsAdded: result\.sessionsAdded,[\s\S]*\}\);/);
    expect(source.indexOf('await captureVerifiedCheckoutLead({\n      cart,'))
      .toBeGreaterThan(source.indexOf("const result = await grantSessionsForCart(cart.id, userId, 'verify-session');"));
    expect(source.indexOf('await captureVerifiedCheckoutLead({\n      cart,'))
      .toBeLessThan(source.indexOf('if (result.alreadyProcessed)'));
    expect(source).toContain("logger.warn('[v2 Payment] Checkout lead capture failed'");
  });
});
