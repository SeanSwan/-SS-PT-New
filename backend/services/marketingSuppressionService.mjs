/**
 * Marketing Suppression Service
 * =============================
 * The single "may we contact this person for marketing?" check — unified across
 * the newsletter list (Subscriber unsubscribe) so an unsubscribed lead can NEVER be
 * hit by an automation SMS, regardless of which surface enrolled them. Keyed by
 * lowercased email and normalized phone STOP records.
 *
 * Returns { suppressed, reason, checked }:
 *  - suppressed:true  → on a confirmed opt-out (caller CANCELS the send).
 *  - checked:false    → the lookup could not run (no model / DB error). Callers must
 *                       FAIL CLOSED (do NOT send when we cannot verify consent).
 *  - no identity      → checked:true, suppressed:false (nothing to match; the
 *                       no-phone/no-recipient guard handles deliverability).
 *
 * Lead-owned SMS requires an opted-in consent record with a timestamp. Missing
 * or withdrawn lead consent suppresses the send before Twilio.
 */
import { normalizePhone } from './smsSuppressionService.mjs';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeLeadId = (leadId) => {
  const parsed = Number(leadId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const resolveLeadSmsConsent = async (leadId) => {
  const normalizedLeadId = normalizeLeadId(leadId);
  if (!normalizedLeadId) return null;

  const { default: Lead } = await import('../models/Lead.mjs');
  const lead = await Lead.findByPk(normalizedLeadId, {
    attributes: ['id', 'smsConsentStatus', 'smsConsentAt', 'smsOptOutAt'],
  });

  if (!lead) return { suppressed: true, reason: 'lead_not_found', checked: true };
  if (lead.smsOptOutAt || lead.smsConsentStatus === 'opted_out') {
    return { suppressed: true, reason: 'lead_sms_opt_out', checked: true };
  }
  if (lead.smsConsentStatus !== 'opted_in' || !lead.smsConsentAt) {
    return { suppressed: true, reason: 'lead_sms_consent_missing', checked: true };
  }
  return null;
};

export const resolveMarketingSuppression = async ({ email, phone, leadId } = {}) => {
  const normalized = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!normalized && !normalizedPhone && !normalizeLeadId(leadId)) {
    return { suppressed: false, reason: null, checked: true };
  }

  try {
    if (normalized) {
      const { default: Subscriber } = await import('../models/Subscriber.mjs');
      const unsub = await Subscriber.findOne({
        where: { email: normalized, status: 'unsubscribed' },
        attributes: ['id'],
      });
      if (unsub) {
        return { suppressed: true, reason: 'unsubscribed', checked: true };
      }
    }

    if (normalizedPhone) {
      const { default: SmsSuppression } = await import('../models/SmsSuppression.mjs');
      const smsOptOut = await SmsSuppression.findOne({
        where: { phone: normalizedPhone },
        attributes: ['id'],
      });
      if (smsOptOut) {
        return { suppressed: true, reason: 'sms_opt_out', checked: true };
      }
    }

    const leadConsent = await resolveLeadSmsConsent(leadId);
    if (leadConsent) return leadConsent;

    return { suppressed: false, reason: null, checked: true };
  } catch (err) {
    // Could not verify; caller fails closed and does not send.
    return { suppressed: false, reason: 'suppression_check_failed', checked: false, error: err?.message };
  }
};

export default { resolveMarketingSuppression };
