/**
 * Money-path safety contracts (Lane 4 launch audit, 2026-08-03)
 * =============================================================
 * Source-level locks on three defects found in the launch audit. Source locks
 * rather than render tests because each one lives in a narrow branch of a long
 * async handler that a render test would not reliably reach — the house already
 * uses this pattern (StoreV3.pricingTrust.contract.test.tsx, storePriceGating).
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const checkoutView = read('./CheckoutView.tsx');
const successPage = read('./SuccessPage.tsx');

describe('CheckoutView — double-submit window', () => {
  it('does NOT clear isProcessing on the success path before the redirect', () => {
    // The redirect is deferred by 1000ms. Clearing isProcessing in the same
    // state update re-enabled the pay button for that whole second, and a second
    // click mints a SECOND Stripe Checkout Session for the same cart.
    const successBlock = checkoutView.slice(
      checkoutView.indexOf("success: 'Redirecting to secure payment...'") - 200,
      checkoutView.indexOf("success: 'Redirecting to secure payment...'") + 200
    );
    expect(successBlock).not.toMatch(/isProcessing:\s*false/);
  });

  it('still clears isProcessing on the failure path so the buyer can retry', () => {
    const catchBlock = checkoutView.slice(checkoutView.indexOf('} catch (error: any) {'));
    expect(catchBlock).toMatch(/isProcessing:\s*false/);
  });
});

describe('CheckoutView — no developer strings in front of a buyer', () => {
  it('does not throw the sessionId/checkoutUrl diagnostic as a user-facing message', () => {
    expect(checkoutView).not.toContain('Missing critical checkout data');
  });

  it('does not render a bare HTTP status code as the error message', () => {
    expect(checkoutView).not.toMatch(/`Server error \(\$\{status\}\)`/);
  });
});

describe('SuccessPage — never show a paying buyer a raw transport error', () => {
  it('does not fall back to error.message when verification fails', () => {
    // error.message yields "Request failed with status code 500" / "Network Error".
    const failureBlock = successPage.slice(
      successPage.indexOf('const serverDetails = error.response?.data?.error?.details;'),
      successPage.indexOf('const serverDetails = error.response?.data?.error?.details;') + 900
    );
    expect(failureBlock).not.toMatch(/error\.message/);
  });

  it('tells the buyer not to pay twice', () => {
    expect(successPage).toMatch(/don't pay again/i);
  });

  it('passes a retry handler and the order reference into the error state', () => {
    expect(successPage).toMatch(/onRetry=\{sessionId \? verifyAndCompleteOrder : undefined\}/);
    expect(successPage).toMatch(/sessionId=\{sessionId\}/);
  });
});

describe('CheckoutView — the buyer always has a way out', () => {
  const sections = read('./CheckoutView.sections.tsx');

  it('renders the Back control even when the route supplies no onCancel', () => {
    // /checkout mounts CheckoutView with no props, so gating on onCancel left a
    // buyer with an empty cart, a disabled $0.00 button and no route back.
    expect(sections).not.toMatch(/\{onCancel && \(\s*<BackButton/);
    expect(sections).toMatch(/onClick=\{onCancel \?\? goToStore\}/);
  });

  it('no longer returns null from the return-to-cart action', () => {
    expect(sections).not.toMatch(/if \(!onCancel\) return null;/);
  });

  it('gives the unauthenticated checkout panel a way to log in', () => {
    expect(sections).toMatch(/Log in to continue/);
    expect(sections).toMatch(/returnUrl=\/checkout/);
  });
});

describe('no surface on the money path renders a raw transport string', () => {
  const storeV3 = read('../../pages/shop/StoreV3.tsx');
  const storeV2 = read('../../pages/shop/StoreV2.tsx');

  it('the store does not render the raw catalog-fetch error to cold traffic', () => {
    // This is the first screen a YouTube visitor sees; a hiccup must not print
    // "Network Error" / "Request failed with status code 500" onto it.
    for (const src of [storeV3, storeV2]) {
      expect(src).not.toMatch(/setPackagesError\(error\.message/);
      expect(src).toMatch(/setPackagesError\('Failed to load packages'\)/);
    }
  });

  it('checkout shows deliberate copy but never a runtime fault message', () => {
    expect(checkoutView).toMatch(/error\.name === 'Error'/);
    expect(checkoutView).not.toMatch(/errorMessage = error\.message \|\|/);
  });
});
