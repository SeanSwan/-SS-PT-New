/**
 * Speed-to-Lead Service (Marketing Brain Epic 1 · SWA-40 gate trial 2)
 * ====================================================================
 * Sends the INSTANT branded acknowledgment email to a lead the moment their
 * inquiry is captured (consult request / contact form / PRISM capture).
 * This closes the Epic-1 hole found 2026-07-22: every entry route alerted the
 * OWNER but no route ever emailed the LEAD.
 *
 * Design decisions (Fable, gate f164823e):
 * - TRANSACTIONAL class: a one-time direct response to the lead's own inquiry
 *   (CAN-SPAM transactional/relationship message) — rendered via
 *   `renderInstantReplyEmail` with the transactional footer (physical address,
 *   no unsubscribe machinery). Nurture emails keep their fail-closed
 *   unsubscribe path untouched.
 * - FAIL-CLOSED FLAG: `SPEED_TO_LEAD_REPLY_ENABLED` must be exactly 'true'
 *   (default OFF — Sean flips it in Render when ready to go live).
 * - NEVER BLOCKS CAPTURE: fire-and-forget; every failure path resolves
 *   normally and only logs. A broken email provider must never lose a lead.
 */
import { sendGridEmail } from './sendgridService.mjs';
import { renderInstantReplyEmail } from './emailTemplateService.mjs';
import logger from '../utils/logger.mjs';

const flagEnabled = () => process.env.SPEED_TO_LEAD_REPLY_ENABLED === 'true';

/**
 * Send the instant acknowledgment to a freshly captured lead.
 * @param {object} opts
 * @param {string} opts.email  lead's address (already validated by the entry route)
 * @param {string} [opts.name] lead's name for personalization
 * @param {string|number} [opts.leadId] for logging only — never rendered into the email
 * @param {string} [opts.source] 'consult' | 'contact' | 'prism' — logging only
 * @returns {Promise<{sent: boolean, skipped?: string, error?: string}>} never throws
 */
export async function sendSpeedToLeadReply({ email, name, leadId, source } = {}) {
  try {
    if (!flagEnabled()) return { sent: false, skipped: 'flag_off' };
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return { sent: false, skipped: 'invalid_email' };
    }
    const { subject, text, html } = renderInstantReplyEmail({ clientName: name });
    const result = await sendGridEmail({ to: email, subject, text, html });
    if (result?.success === false) {
      logger.warn(`[speed-to-lead] send failed (non-blocking) lead#${leadId ?? '?'} src=${source ?? '?'}: ${result?.error?.message ?? result?.error ?? 'unknown'}`);
      return { sent: false, error: 'send_failed' };
    }
    logger.info(`[speed-to-lead] instant reply sent lead#${leadId ?? '?'} src=${source ?? '?'}`);
    return { sent: true };
  } catch (err) {
    // Capture must never be blocked by acknowledgment failure — swallow and log.
    logger.error(`[speed-to-lead] unexpected error (non-blocking) lead#${leadId ?? '?'}: ${err?.message}`);
    return { sent: false, error: 'unexpected' };
  }
}

export default { sendSpeedToLeadReply };
