/**
 * manualDiagnostics.mjs
 * ====================
 * Safe, offline configuration checks for `npm run check-stripe`.
 *
 * This command reports whether the configured Stripe environment is complete;
 * it does not load .env files, contact Stripe, create payment intents, or claim
 * that a payment succeeded.
 */

import { pathToFileURL } from 'node:url';
import { quickStatusCheck } from './environmentDiagnostics.mjs';

export function runManualDiagnostics() {
  const status = quickStatusCheck();
  const checks = status?.checks || {};
  const recommendations = [];

  if (!checks.hasSecretKey) recommendations.push('Configure STRIPE_SECRET_KEY in the deployment secret store.');
  if (!checks.hasPublishableKey) recommendations.push('Configure VITE_STRIPE_PUBLISHABLE_KEY in the deployment secret store.');
  if (!checks.stripeEnabled) recommendations.push('Review Stripe configuration flags and key formats.');

  return {
    ...status,
    configurationOnly: true,
    recommendations,
  };
}

export function runCli({ log = console.log, error = console.error } = {}) {
  try {
    const results = runManualDiagnostics();
    log('SwanStudios Stripe configuration diagnostics (offline; no payment request made).');
    log(`Configuration status: ${results.status}`);
    log(`Checks: ${JSON.stringify(results.checks)}`);

    if (results.recommendations.length > 0) {
      log(`Configuration follow-ups: ${results.recommendations.length}`);
      results.recommendations.forEach((recommendation) => log(`- ${recommendation}`));
      return 1;
    }

    log('Configuration checks passed; payment success was not tested.');
    return 0;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown diagnostics error';
    error(`Configuration diagnostics failed: ${message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
