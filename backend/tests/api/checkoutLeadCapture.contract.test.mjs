import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const readRoute = () => readFileSync(resolve(__dirname, '../../routes/v2PaymentRoutes.mjs'), 'utf8');

describe('checkout Lead capture route contract', () => {
  it('records verified checkout conversions after fulfillment without blocking responses', () => {
    const source = readRoute();
    const normalizedSource = source.replace(/\r\n/g, '\n');

    expect(source).toContain("import { captureLeadFromCheckout } from '../services/leadCaptureService.mjs';");
    expect(source).toContain("import { deriveChannel } from '../services/leadCaptureShared.mjs';");
    expect(source).toContain('async function captureVerifiedCheckoutLead');
    expect(source).toContain('const checkoutAttribution = deriveChannel({');
    expect(source).toContain('utmSource: req.body?.utmSource || req.body?.metadata?.utmSource');
    expect(source).toContain('utmMedium: req.body?.utmMedium || req.body?.metadata?.utmMedium');
    expect(source).toContain('referrer: req.body?.referrer || req.body?.metadata?.referrer');
    expect(source).toContain('acquisitionAttribution: { channel: checkoutAttribution.channel }');
    expect(source).toMatch(/const leadCaptureResult = await captureLeadFromCheckout\(\{[\s\S]*user,[\s\S]*session,[\s\S]*cart,[\s\S]*sessionsAdded,[\s\S]*\}\);/);
    expect(source).toMatch(/const result = await fulfillSessionPackageCheckoutSession\(session\);[\s\S]*await captureVerifiedCheckoutLead\(\{[\s\S]*user: req\.user,[\s\S]*session,[\s\S]*sessionsAdded: result\.sessionsAdded,[\s\S]*\}\);/);
    // RE-ANCHORED 2026-08-20. These three were pinned to the literal identifier
    // `cart` and to the exact single-line shape of the grant call. Both changed
    // for reasons this contract does not care about: verify-session now
    // resolves the cart through a crash-window fallback (so the variable is
    // `recoveredCart`), and the grant call gained `amountTotalCents` so the
    // adoption guard has the figure it needs to decide at all.
    //
    // The contract being protected is ORDERING and INPUTS: the lead is captured
    // AFTER fulfilment, BEFORE the alreadyProcessed early-return, carries the
    // server-resolved cart, and reports the real sessionsAdded. That is
    // unchanged, so the assertions now match the invariant instead of the
    // identifier. Pinning a variable name makes a rename look like a
    // regression, which is how this suite failed on a change that did not touch
    // lead capture at all.
    expect(source).toMatch(/const result = await grantSessionsForCart\((?:cart|recoveredCart)\.id, userId, 'verify-session',[\s\S]*?checkoutSessionId: session\.id[\s\S]*await captureVerifiedCheckoutLead\(\{[\s\S]*cart(?::\s*recoveredCart)?,[\s\S]*user: req\.user,[\s\S]*session,[\s\S]*sessionsAdded: result\.sessionsAdded,[\s\S]*\}\);/);

    const leadCaptureAt = normalizedSource.search(/await captureVerifiedCheckoutLead\(\{\n      cart(?::\s*recoveredCart)?,/);
    const grantAt = normalizedSource.search(/const result = await grantSessionsForCart\((?:cart|recoveredCart)\.id, userId, 'verify-session',/);

    expect(leadCaptureAt).toBeGreaterThan(-1);
    expect(grantAt).toBeGreaterThan(-1);
    expect(leadCaptureAt).toBeGreaterThan(grantAt);
    expect(leadCaptureAt).toBeLessThan(normalizedSource.indexOf('if (result.alreadyProcessed)'));
    expect(source).toContain("logger.warn('[v2 Payment] Checkout lead capture failed'");
  });
});
