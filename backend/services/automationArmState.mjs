/**
 * Automation Arm State
 * ====================
 * The SINGLE source of truth for "is the outbound automation engine armed?".
 * Default-OFF: only the literal env value "true" arms it. Imported by BOTH the
 * scheduler (gates whether the cron starts) AND the live sender (gates whether
 * processScheduledMessages may deliver), so "disarmed = zero delivery" is a code
 * invariant enforced at the send chokepoint — not a per-caller convention that a
 * new caller (e.g. the admin POST /api/automation/process route) could bypass.
 *
 * Lives in its own module to keep it dependency-free (automationCron imports the
 * sender, so the sender importing the cron would be a circular import).
 */
export const isAutomationArmed = (env = process.env) => env?.SWAN_AUTOMATION_CRON_ENABLED === 'true';

export default { isAutomationArmed };
