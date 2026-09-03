/**
 * Checkout Reconciliation Cron
 * ============================
 * Runs the stranded-cart sweeper on an interval (matches renderLeaseSweeperCron).
 *
 * DELIBERATELY NOT behind a kill switch, for the same reason the render-lease sweeper
 * isn't: the checkout claim/finalize design already assumes something reclaims a failed
 * claim. Disabling this does not pause a feature — it leaves customers locked out of
 * their own carts after any deploy that lands mid-checkout.
 *
 * Building the reclaim logic and not scheduling it is indistinguishable from not
 * building it, except that it LOOKS handled in code review.
 */

import ShoppingCart from '../models/ShoppingCart.mjs';
import { reconcileStalePendingCarts, STALE_CHECKOUT_MS } from './checkoutReconciliationService.mjs';
import logger from '../utils/logger.mjs';

/**
 * A stranded cart is a customer who cannot add to their cart. Sweeping far more often
 * than the staleness threshold buys nothing, so run at a fraction of it.
 */
export const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

let timer = null;

/**
 * Exported for the durable BullMQ path (SWA-225 EX-3): the queue processor runs
 * this EXACT function, so the sweep's behaviour is identical whichever scheduler
 * invokes it. Only the timing mechanism differs.
 */
export async function runSweep() {
  // reconcileStalePendingCarts never throws — it reports { released, failed } — so the
  // interval cannot be killed by a transient DB error.
  await reconcileStalePendingCarts({ ShoppingCart });
}

export function startCheckoutReconciliationSweeper() {
  if (timer) return timer;

  logger.info('[CheckoutReconciliation] sweeper started', {
    intervalMs: SWEEP_INTERVAL_MS,
    staleAfterMs: STALE_CHECKOUT_MS,
  });

  timer = setInterval(() => { void runSweep(); }, SWEEP_INTERVAL_MS);
  // Never hold the process open for a sweep.
  if (typeof timer.unref === 'function') timer.unref();

  return timer;
}

export function stopCheckoutReconciliationSweeper() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export default { startCheckoutReconciliationSweeper, stopCheckoutReconciliationSweeper, SWEEP_INTERVAL_MS };
