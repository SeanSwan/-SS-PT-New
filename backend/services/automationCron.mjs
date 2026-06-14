/**
 * Automation Cron Service (Tier 0.3 — the follow-up engine)
 * ========================================================
 * The drip + renewal services were built but never scheduled, so captured leads
 * never got auto-followed-up. This wires them to a cron:
 *   - processScheduledMessages(): sends due drip/automation SMS (REAL outbound;
 *     already self-guarded — SMS-pref off, quiet hours, no-phone, pending->sent).
 *   - checkClientsForRenewalAlerts(): refreshes renewal-alert dashboard rows
 *     (NO outbound — internal scoring only).
 *
 * GUARDRAIL / KILL SWITCH (rules 47/50 — automation must earn trust): because the
 * drip processor sends REAL messages, the scheduler is DEFAULT OFF and only starts
 * when SWAN_AUTOMATION_CRON_ENABLED === 'true' (Render env). Flip it off to stop all
 * automated outbound instantly on the next deploy/restart. Mirrors sessionReminderCron.
 */
import { processScheduledMessages } from './automationService.mjs';
import { checkClientsForRenewalAlerts } from './renewalAlertService.mjs';
import logger from '../utils/logger.mjs';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Kill switch. Default OFF: only the literal 'true' enables the engine, so a
 * missing/typo'd/legacy value can never accidentally start real outbound.
 */
export function isAutomationCronEnabled(env = process.env) {
  return env.SWAN_AUTOMATION_CRON_ENABLED === 'true';
}

let tickInFlight = false;

/**
 * One tick: drip outbound first, then renewal refresh. Each leg is isolated so a
 * failure in one never blocks the other, and the tick itself never throws.
 * Re-entrancy guard: if a previous tick is still running (slow DB / large queue),
 * skip this one — prevents two overlapping runs from double-sending the same
 * pending message (processScheduledMessages fetches-then-marks, not atomic-claim).
 */
export async function runAutomationTick() {
  if (tickInFlight) {
    logger.warn('[AutomationCron] Previous tick still running — skipping to avoid overlap/double-send');
    return;
  }
  tickInFlight = true;
  try {
    try {
      const result = await processScheduledMessages();
      if (result?.processed) {
        logger.info(`[AutomationCron] processed ${result.processed} scheduled message(s)`);
      }
    } catch (err) {
      logger.error(`[AutomationCron] processScheduledMessages failed: ${err.message}`);
    }

    try {
      await checkClientsForRenewalAlerts();
    } catch (err) {
      logger.error(`[AutomationCron] checkClientsForRenewalAlerts failed: ${err.message}`);
    }
  } finally {
    tickInFlight = false;
  }
}

let automationInterval = null;

/**
 * Start the follow-up engine — no-op unless the kill switch is ON.
 * @returns {{started: boolean, reason?: string}}
 */
export function startAutomationScheduler() {
  if (!isAutomationCronEnabled()) {
    logger.info('[AutomationCron] Disabled — set SWAN_AUTOMATION_CRON_ENABLED=true to enable. Follow-up engine NOT running.');
    return { started: false, reason: 'disabled' };
  }
  if (automationInterval) {
    logger.warn('[AutomationCron] Scheduler already running');
    return { started: false, reason: 'already_running' };
  }
  logger.info('[AutomationCron] Starting follow-up engine (every 5 min)');
  // Run shortly after boot, then on the interval.
  setTimeout(() => runAutomationTick(), 5000);
  automationInterval = setInterval(runAutomationTick, CHECK_INTERVAL_MS);
  return { started: true };
}

/**
 * Stop the scheduler (graceful shutdown / kill switch flip).
 */
export function stopAutomationScheduler() {
  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
    logger.info('[AutomationCron] Scheduler stopped');
  }
}

export default {
  isAutomationCronEnabled,
  runAutomationTick,
  startAutomationScheduler,
  stopAutomationScheduler,
};
