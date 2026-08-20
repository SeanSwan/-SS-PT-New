/**
 * grantRefusalCallerContract.test.mjs
 * ===================================
 * Round 3, and it is round 2's defect wearing a different hat.
 *
 * Round 2's worst finding was: a guard refused, and the caller did not stop —
 * so the system promoted the user, booked the order and paid commission on a
 * refusal. The fix added `unfulfillable: true` to grantSessionsForCart and
 * taught THE WEBHOOK to short-circuit on it.
 *
 * `grantSessionsForCart` has three production callers. The fix reached one.
 *
 *   webhook            -> handles it (alert + break before every side effect)
 *   verify-session     -> fell through to `success: true`
 *   admin manual grant -> fell through to "sessions granted"
 *
 * Found independently by me and by GLM-5.3 (H1), 2026-08-20.
 *
 * On verify-session I made this REACHABLE. Before the crash-window recovery
 * (8edbb1b89), a cart with `checkoutSessionId: null` 404'd — confusing, but
 * honest. Now it reaches the grant, can be refused, and reported "Order
 * verified and completed successfully" with sessionsAdded: 0. That trades an
 * honest 404 for a silent false success, which is worse: a customer told their
 * order completed has no reason to contact anyone.
 *
 * Worse still, `captureVerifiedCheckoutLead` fired BEFORE the response, so a
 * refusal was also recorded as a verified conversion.
 *
 * ---
 *
 * H2 (GLM-5.3) — the webhook rethrew a TERMINAL grant failure.
 *
 * `decrementTrackedInventory` throws CheckoutInventoryError under a row lock
 * when stock ran out between checkout creation and payment. The webhook did:
 *
 *     } catch (grantError) { ... throw grantError; }  // "Stripe will retry"
 *
 * But no redelivery restocks the shelf. That made a signed, PAID event retry
 * forever against a state that can never change — the endpoint-disabling
 * condition this whole fix family exists to avoid, with no alert on the path.
 *
 * The correct classification already existed one file over: verify-session
 * catches this same error and returns 409 + requiresSupportReview +
 * "SwanStudios will review this order." Same error, two callers, opposite
 * verdicts. Sibling drift again — the recurring shape of this whole family.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dir = dirname(fileURLToPath(import.meta.url));

// Comments stripped before matching: three times in this workstream a source
// guard passed by matching the prose describing the defect it was written to
// catch.
const executableSource = (relativePath) => readFileSync(resolve(__dir, relativePath), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// Assertions match the BRANCH, not the punctuation — `result?.unfulfillable`
// and `result.unfulfillable` are the same invariant, and pinning syntax is how
// two earlier tests in this workstream broke on a rename that changed nothing.
const REFUSAL = /result\??\.unfulfillable/;
const ADMIN_REFUSAL = /grantResult\??\.unfulfillable/;

describe('H1 — every caller of grantSessionsForCart honours the refusal', () => {
  const verify = executableSource('../../routes/v2PaymentRoutes.mjs');
  const admin = executableSource('../../routes/adminOrdersRoutes.mjs');
  const webhook = executableSource('../../webhooks/stripeWebhook.mjs');

  it('the webhook still handles it (no regression)', () => {
    expect(webhook).toMatch(ADMIN_REFUSAL);
  });

  it('verify-session branches on it', () => {
    expect(verify).toMatch(REFUSAL);
  });

  it('verify-session refuses BEFORE claiming a verified conversion', () => {
    // captureVerifiedCheckoutLead records a VERIFIED CONVERSION. A refusal is
    // not one. Whitespace-tolerant: the file is CRLF and comment-stripped, so a
    // literal newline anchor cannot match.
    const guardAt = verify.search(REFUSAL);
    const leadAt = verify.search(/captureVerifiedCheckoutLead\(\{\s*cart: recoveredCart/);

    expect(guardAt).toBeGreaterThan(-1);
    expect(leadAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(leadAt);
  });

  it('verify-session does NOT answer success on a refusal', () => {
    expect(verify).toMatch(/result\??\.unfulfillable[\s\S]{0,2400}success: false/);
  });

  it('verify-session alerts — this rail has no other alert on captured money', () => {
    // The webhook's alert is the only other signal on this money. If that
    // delivery is lost, a refusal here would otherwise be entirely silent.
    expect(verify).toMatch(/result\??\.unfulfillable[\s\S]{0,2400}ADMIN_NOTIFICATION/);
  });

  it('verify-session imports the notifier it calls', () => {
    // Caught before shipping: the alert referenced sendNotification, which this
    // route did not import. That is a ReferenceError on the refusal path only —
    // the exact branch a paying customer reaches.
    expect(verify).toMatch(/import \{[^}]*sendNotification[^}]*\} from '\.\.\/services\/notificationService\.mjs'/);
  });

  it('the admin manual grant branches on it', () => {
    expect(admin).toMatch(ADMIN_REFUSAL);
  });

  it('the admin manual grant does NOT report "sessions granted" on a refusal', () => {
    const guardAt = admin.search(ADMIN_REFUSAL);
    const claimAt = admin.indexOf('Order marked paid and sessions granted');

    expect(guardAt).toBeGreaterThan(-1);
    expect(claimAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(claimAt);
  });

  it('no caller is left unaudited', () => {
    // If a fourth caller appears, this contract must be extended to it. GLM
    // named a reconcile script as a possible fourth; it does not exist here.
    for (const source of [verify, admin, webhook]) {
      expect(source).toMatch(/unfulfillable/);
    }
  });
});

describe('H2 — a terminal grant failure is not retried forever', () => {
  const webhook = executableSource('../../webhooks/stripeWebhook.mjs');
  const verify = executableSource('../../routes/v2PaymentRoutes.mjs');

  it('the webhook knows the terminal error class by name', () => {
    expect(webhook).toContain('CheckoutInventoryError');
  });

  it('the webhook classifies before it rethrows', () => {
    // The bare `throw grantError` with no classification above it was the bug.
    expect(webhook).toMatch(/CheckoutInventoryError[\s\S]{0,1400}throw grantError/);
  });

  it('the webhook alerts on it — stock loss on a paid cart needs a human', () => {
    expect(webhook).toMatch(/CheckoutInventoryError[\s\S]{0,1000}notifyAdminSafely\(/);
  });

  it('verify-session still classifies the same error as terminal (the model)', () => {
    expect(verify).toContain('error instanceof CheckoutInventoryError');
    expect(verify).toContain('requiresSupportReview');
  });

  it('a TRANSIENT grant error is still rethrown so Stripe retries', () => {
    // A DB blip or lock timeout IS transient and the grant is idempotent, so a
    // retry is correct there. Only the terminal class short-circuits.
    expect(webhook).toContain('throw grantError');
  });
});
