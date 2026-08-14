/**
 * FILE: productNoise.ts
 * PURPOSE: The ONE way any QA gate decides that a console message is tolerated
 * PRODUCT noise, so every gate honours the registry's expiry dates.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS FILE EXISTS: `qaSuppressions.ts` exists so that tolerating a defect
 * costs something — every entry carries a reason and an expiry, and on that date
 * the build fails until someone fixes it or consciously renews. That promise was
 * only true for the dashboard crawl. Three other gates carried their own
 * PERMANENT hardcoded copies of the same patterns:
 *
 *   missionHarness.isExpectedMissionConsoleNoise      — 'preloaded using link preload'
 *   production-live-readonly.expectedConsoleNoise      — same, + the service-worker notice
 *   client-card-responsive-layout.isKnownConsoleNoise  — same
 *
 * So on 2026-11-10 the registry entries expire, the crawl starts failing as
 * designed... and those three gates keep silently swallowing the identical
 * message forever. That is BUG-2 — "a registry entry could expire while the gate
 * kept suppressing" — surviving in the three files the BUG-2 fix never reached.
 *
 * THE DIVIDING LINE (from qaSuppressions.ts, unchanged):
 *   PRODUCT noise  -> the registry. It is a real defect being tolerated on a
 *                     deadline, and it belongs to whoever owns the product code.
 *   HARNESS exhaust -> stays hardcoded in the gate that produces it. The 405s
 *                     from our own write-blocking interceptor, Socket.IO teardown
 *                     400s, and offline-font failures are the test rig's own
 *                     output. They are state-dependent rather than
 *                     message-matchable, and an expiring suppression for them
 *                     would fail the build for no product reason.
 *
 * This module covers ONLY the first category. Callers keep their own
 * harness-exhaust branches.
 */

import { QA_SUPPRESSIONS } from './qaSuppressions';
import { inDateSuppressionMatcher } from './qaSuppressions.audit';

/** Today as YYYY-MM-DD, the comparison form every expiry check uses. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * True when `message` matches an IN-DATE product suppression.
 *
 * `today` is injectable so tests can prove the expiry actually bites — a gate
 * that suppresses regardless of date is the bug this module was written to kill,
 * and it is invisible until the expiry passes in real life.
 */
export function isSuppressedProductNoise(message: string, today: string = todayIso()): boolean {
  return inDateSuppressionMatcher(QA_SUPPRESSIONS, today)(message);
}
