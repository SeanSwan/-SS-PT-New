/**
 * ============================================================================
 * FILE: stripeClient.mjs
 * PURPOSE: The ONLY place a Stripe client is constructed. Two getters, one per
 *          CURRENT effective API version — Phase A of SWA-225 EX-1.
 *
 * WHY TWO VERSIONS (and why that is the honest shape). Before this file,
 * `new Stripe(...)` ran in NINETEEN places across thirteen files: twelve pinned
 * `apiVersion: '2023-10-16'`, seven passing NO version at all — which on
 * stripe@17.7.0 means the SDK default `2025-02-24.acacia`. One process spoke
 * two Stripe API versions ~16 months apart, decided by which route served the
 * request, and both families create AND retrieve the same Checkout Sessions.
 *
 * Phase A (this file) is BEHAVIOUR-IDENTICAL: every site keeps the version it
 * already ran, the split just stops being an accident. Unifying to one version
 * is Phase B — a separate, reviewed change, gated on a field-consumption audit
 * of the version diff and on the Stripe dashboard webhook-endpoint version
 * (Sean's reading). GLM-5.3 review finding #1: the first cut of this slice
 * smuggled that behaviour change inside the refactor; this shape splits them.
 *
 * DRIFT GUARD: .eslintrc.cjs bans `new Stripe(` outside this file — nineteen
 * scattered constructions drifted into two versions precisely because
 * construction was copy-pasteable. Site #20 now fails lint.
 *
 * MEMOISATION IS SUCCESS-ONLY (per version). Both reviewers independently
 * rejected caching the failure: a boot-time race — first money request landing
 * before the env var is visible — would have become a permanent 503 on every
 * payment route until the next deploy. A transient unconfigured state heals on
 * the next request; the cost is a warn-log per attempt while truly
 * unconfigured. Noisy-and-recoverable beats quiet-and-dead on a payment path.
 *
 * CONTRACT (identical to the pattern replaced, so no caller's guard changes):
 *   - returns null when Stripe is unconfigured (isStripeEnabled() false);
 *     callers already null-check into their existing 503 branches.
 *   - never throws on construction failure; logs and returns null.
 *   - lazy: nothing constructs at import, so importing this cannot slow boot.
 *
 * SINGLE-KEY ASSUMPTION, verified 2026-09-01: all nineteen sites resolve to the
 * same STRIPE_SECRET_KEY (three local aliases traced) and no stripeAccount /
 * connected-account usage exists — so per-version singletons are correct. If
 * Connect ever lands, this file is where per-account clients get added.
 * ============================================================================
 */
import Stripe from 'stripe';
import logger from './logger.mjs';
import { isStripeEnabled } from './apiKeyChecker.mjs';

/** The version the money paths run on: cart, session packages, subscriptions,
 *  ACH, admin charge, analytics, and the webhook. */
export const STRIPE_API_VERSION = '2023-10-16';

/** The version the seven gallery/print sites ran on BY OMISSION (stripe@17's
 *  SDK default). Phase A makes it explicit; only Phase B may unify. Adding a
 *  NEW caller of the legacy getter is a Phase-B bypass — lint cannot see that,
 *  reviewers must. */
export const STRIPE_LEGACY_DEFAULT_API_VERSION = '2025-02-24.acacia';

const cache = new Map(); // version -> constructed client. Success-only.

function get(version) {
  if (cache.has(version)) return cache.get(version);

  if (!isStripeEnabled()) {
    logger.warn(`[stripeClient] Stripe not configured — ${version} client unavailable; payment routes take their not-configured branch.`);
    return null;
  }

  try {
    const client = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), { apiVersion: version });
    cache.set(version, client);
    logger.info(`[stripeClient] Stripe client initialised on apiVersion=${version}.`);
    return client;
  } catch (error) {
    logger.error(`[stripeClient] Stripe construction failed (${version}): ${error.message}`);
    return null;
  }
}

/** Money paths. @returns {import('stripe').Stripe | null} */
export function getStripeClient() {
  return get(STRIPE_API_VERSION);
}

/** Gallery/print paths ONLY — frozen at their historical effective version.
 *  @returns {import('stripe').Stripe | null} */
export function getLegacyDefaultStripeClient() {
  return get(STRIPE_LEGACY_DEFAULT_API_VERSION);
}

/** Test-only: clears the per-version memoisation between cases. */
export function __resetStripeClientForTests() {
  cache.clear();
}

export default {
  getStripeClient,
  getLegacyDefaultStripeClient,
  STRIPE_API_VERSION,
  STRIPE_LEGACY_DEFAULT_API_VERSION,
  __resetStripeClientForTests,
};
