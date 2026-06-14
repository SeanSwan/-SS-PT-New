/**
 * Automation Cron Service (Tier 0.3 - follow-up engine)
 * =====================================================
 * Schedules the existing drip + renewal services behind a default-off kill
 * switch. The SMS drip can send real outbound messages, so the scheduler only
 * starts when SWAN_AUTOMATION_CRON_ENABLED is exactly "true".
 */
import { processScheduledMessages } from './automationService.mjs';
import { checkClientsForRenewalAlerts } from './renewalAlertService.mjs';
import logger from '../utils/logger.mjs';

const DRIP_START_DELAY_MS = 5 * 1000;
const DRIP_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RENEWAL_START_DELAY_MS = 30 * 1000;
const RENEWAL_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function isAutomationCronEnabled(env = process.env) {
  return env.SWAN_AUTOMATION_CRON_ENABLED === 'true';
}

let dripTickInFlight = false;
let renewalTickInFlight = false;
let automationInterval = null;
let renewalInterval = null;
let automationStartupTimeout = null;
let renewalStartupTimeout = null;

export async function runRenewalTick() {
  if (renewalTickInFlight) {
    logger.warn('[AutomationCron] Previous renewal tick still running - skipping overlap');
    return;
  }
  renewalTickInFlight = true;
  try {
    try {
      await checkClientsForRenewalAlerts();
    } catch (err) {
      logger.error(`[AutomationCron] checkClientsForRenewalAlerts failed: ${err.message}`);
    }
  } finally {
    renewalTickInFlight = false;
  }
}

export async function runAutomationTick({ includeRenewal = true } = {}) {
  if (dripTickInFlight) {
    logger.warn('[AutomationCron] Previous drip tick still running - skipping overlap/double-send risk');
    return;
  }
  dripTickInFlight = true;
  try {
    try {
      const result = await processScheduledMessages();
      if (result?.processed) {
        logger.info(`[AutomationCron] processed ${result.processed} scheduled message(s)`);
      }
    } catch (err) {
      logger.error(`[AutomationCron] processScheduledMessages failed: ${err.message}`);
    }
  } finally {
    dripTickInFlight = false;
  }

  if (includeRenewal) await runRenewalTick();
}

function schedulerIsRunning() {
  return Boolean(
    automationStartupTimeout ||
    renewalStartupTimeout ||
    automationInterval ||
    renewalInterval,
  );
}

export function startAutomationScheduler() {
  if (!isAutomationCronEnabled()) {
    logger.info('[AutomationCron] Disabled - set SWAN_AUTOMATION_CRON_ENABLED=true to enable. Follow-up engine NOT running.');
    return { started: false, reason: 'disabled' };
  }
  if (schedulerIsRunning()) {
    logger.warn('[AutomationCron] Scheduler already running');
    return { started: false, reason: 'already_running' };
  }

  logger.info('[AutomationCron] Starting follow-up engine: SMS drip every 5 min; renewal scan daily');
  automationStartupTimeout = setTimeout(() => {
    automationStartupTimeout = null;
    runAutomationTick({ includeRenewal: false });
  }, DRIP_START_DELAY_MS);
  automationInterval = setInterval(
    () => runAutomationTick({ includeRenewal: false }),
    DRIP_CHECK_INTERVAL_MS,
  );

  renewalStartupTimeout = setTimeout(() => {
    renewalStartupTimeout = null;
    runRenewalTick();
  }, RENEWAL_START_DELAY_MS);
  renewalInterval = setInterval(runRenewalTick, RENEWAL_CHECK_INTERVAL_MS);

  return { started: true };
}

export function stopAutomationScheduler() {
  const wasRunning = schedulerIsRunning();
  if (automationStartupTimeout) {
    clearTimeout(automationStartupTimeout);
    automationStartupTimeout = null;
  }
  if (renewalStartupTimeout) {
    clearTimeout(renewalStartupTimeout);
    renewalStartupTimeout = null;
  }
  if (automationInterval) {
    clearInterval(automationInterval);
    automationInterval = null;
  }
  if (renewalInterval) {
    clearInterval(renewalInterval);
    renewalInterval = null;
  }
  if (wasRunning) logger.info('[AutomationCron] Scheduler stopped');
}

export default {
  isAutomationCronEnabled,
  runAutomationTick,
  runRenewalTick,
  startAutomationScheduler,
  stopAutomationScheduler,
};
