// backend/services/emailAutomationSender.mjs
//
// The ONLY bridge between the drip processor and SendGrid.
//
// Contract (03-contracts.md):
//   sendAutomationEmail({ log, lead }) -> Promise<{ success, error? }> — NEVER throws.
//
// Refusals are returned as {success:false, error:<literal>} with an EXACT literal,
// because those strings land in automation_logs.error and are the operator's only
// view of why a message did not go out:
//   'missing_recipient'         log.recipient falsy or not containing '@'
//   'unknown_template:<name>'   renderEmailTemplate threw
//   'lead_email_unsubscribed'   lead?.tags includes 'email-unsubscribed'
//   'sendgrid_not_configured'   isSendGridServiceConfigured() false
//   'sendgrid_error:<message>'  sendGridEmail returned {success:false}
//
// Doctrine: best-effort, never-throw. A failed email must never break contact
// submission, lead capture, or the processor loop. Fail VISIBLE with a reason
// string, never silent.
import { renderEmailTemplate } from './emailTemplates.mjs';
import { buildUnsubscribeUrl } from './leadUnsubscribeToken.mjs';
import { sendGridEmail, isSendGridServiceConfigured } from './sendgridService.mjs';
import logger from '../utils/logger.mjs';

/** Mask an address for logs: j***@domain (house rule — no full PII in logs). */
const maskRecipient = (recipient) => {
  const at = String(recipient || '').indexOf('@');
  if (at <= 0) return '(invalid)';
  return `${recipient[0]}***${recipient.slice(at)}`;
};

export async function sendAutomationEmail({ log, lead }) {
  try {
    const recipient = log?.recipient;

    // 1. Recipient must look like an address at all.
    if (!recipient || !String(recipient).includes('@')) {
      return { success: false, error: 'missing_recipient' };
    }

    // 2. Consent: an unsubscribed lead is refused before any render or send.
    //    `lead` is nullable by design (automation_logs.leadId is a soft reference),
    //    and a null lead simply has no tags, so the check passes.
    const tags = Array.isArray(lead?.tags) ? lead.tags : [];
    if (tags.includes('email-unsubscribed')) {
      return { success: false, error: 'lead_email_unsubscribed' };
    }

    // 3. Render. `firstName` comes from the trigger payload first (that is what
    //    enrollNewLeadInNurture places there), then the lead row, then 'there'.
    const templateName = log?.templateName;
    const vars = {
      firstName: log?.payloadJson?.clientName || lead?.firstName || 'there',
      unsubscribeUrl: buildUnsubscribeUrl(lead?.id),
    };

    let rendered;
    try {
      rendered = renderEmailTemplate(templateName, vars);
    } catch (err) {
      return { success: false, error: `unknown_template:${templateName}` };
    }

    // 4. Transport must be configured before we claim to have tried.
    if (!isSendGridServiceConfigured()) {
      return { success: false, error: 'sendgrid_not_configured' };
    }

    // 5. Send.
    const result = await sendGridEmail({
      to: recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    if (result?.success) {
      logger.info(`[automation-email] sent ${templateName} to ${maskRecipient(recipient)}`);
      return { success: true };
    }

    const message = result?.error?.message || 'unknown error';
    return { success: false, error: `sendgrid_error:${message}` };
  } catch (err) {
    // Any unexpected throw is converted to a visible failure. The `sendgrid_error:`
    // prefix is the transport-class signal; a defect upstream of the transport
    // (render/vars) is reported the same way rather than escaping the processor loop.
    logger.error(`[automation-email] unexpected failure: ${err?.message}`);
    return { success: false, error: `sendgrid_error:${err?.message || 'unknown error'}` };
  }
}

export default { sendAutomationEmail };
