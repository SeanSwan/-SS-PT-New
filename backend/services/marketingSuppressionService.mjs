/**
 * Marketing Suppression Service
 * =============================
 * The single "may we contact this person for marketing?" check — unified across
 * the newsletter list (Subscriber unsubscribe) so an unsubscribed lead can NEVER be
 * hit by an automation SMS, regardless of which surface enrolled them. Keyed by
 * lowercased email.
 *
 * Returns { suppressed, reason, checked }:
 *  - suppressed:true  → on a confirmed opt-out (caller CANCELS the send).
 *  - checked:false    → the lookup could not run (no model / DB error). Callers must
 *                       FAIL CLOSED (do NOT send when we cannot verify consent).
 *  - no email         → checked:true, suppressed:false (nothing to match; the
 *                       no-phone/no-recipient guard handles deliverability).
 *
 * Future extensions (noted, not built): phone-keyed suppression, a per-Lead
 * marketing opt-out flag, and a global do-not-contact list. Subscriber is imported
 * dynamically to avoid circular imports + keep this unit-testable.
 */
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const resolveMarketingSuppression = async ({ email } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { suppressed: false, reason: null, checked: true };

  try {
    const { default: Subscriber } = await import('../models/Subscriber.mjs');
    const unsub = await Subscriber.findOne({
      where: { email: normalized, status: 'unsubscribed' },
      attributes: ['id'],
    });
    return { suppressed: Boolean(unsub), reason: unsub ? 'unsubscribed' : null, checked: true };
  } catch (err) {
    // Could not verify — caller fails closed (treats as do-not-send).
    return { suppressed: false, reason: 'suppression_check_failed', checked: false, error: err?.message };
  }
};

export default { resolveMarketingSuppression };
