/**
 * Lead capture — paid checkout conversion (rule 4 extraction from leadCaptureService).
 * Best-effort + idempotent so payment fulfillment is never blocked by CRM writes or
 * repeated success-page verification. Re-exported via leadCaptureService.mjs (API unchanged).
 */
import {
  CHECKOUT_CONVERSION_SCORE,
  CHECKOUT_CONVERSION_TAGS,
  firstString,
  parseCartCustomerInfo,
  splitLeadName,
  mergeLeadTags,
} from './leadCaptureShared.mjs';

/**
 * @returns {Promise<{leadId?:number, created?:boolean, converted?:boolean, alreadyConverted?:boolean, skipped?:string, error?:string}>}
 */
export async function captureLeadFromCheckout({ cart, user, session, sessionsAdded = 0 } = {}) {
  try {
    const customerInfo = parseCartCustomerInfo(cart);
    const customerDetails = session?.customer_details || {};
    const email = firstString(customerDetails.email, customerInfo.email, user?.email).toLowerCase();
    if (!email) return { skipped: 'no_email' };

    const userId = Number.isInteger(Number(user?.id)) ? Number(user.id) : null;
    const customerName = firstString(
      customerDetails.name,
      customerInfo.name,
      `${user?.firstName || ''} ${user?.lastName || ''}`,
    );
    const { firstName, lastName } = splitLeadName(customerName);
    const phone = firstString(customerDetails.phone, customerInfo.phone, user?.phone);
    const now = new Date();
    const amountCents = Number.isFinite(Number(session?.amount_total)) ? Number(session.amount_total) : 0;
    const safeSessionsAdded = Number.isFinite(Number(sessionsAdded)) ? Number(sessionsAdded) : 0;
    const metadata = {
      source: 'genesis_checkout',
      ...(userId ? { userId } : {}),
      ...(cart?.id ? { cartId: cart.id } : {}),
      ...(session?.id ? { sessionId: session.id } : {}),
      sessionsAdded: safeSessionsAdded,
      amountCents,
    };

    const { default: Lead } = await import('../models/Lead.mjs');
    const { default: LeadActivity } = await import('../models/LeadActivity.mjs');

    const [lead, created] = await Lead.findOrCreate({
      where: { email },
      defaults: {
        firstName,
        lastName,
        email,
        ...(phone ? { phone } : {}),
        source: 'website',
        sourceDetail: 'Checkout purchase',
        status: 'converted',
        score: CHECKOUT_CONVERSION_SCORE,
        ...(userId ? { convertedUserId: userId } : {}),
        convertedAt: now,
        tags: CHECKOUT_CONVERSION_TAGS,
        notes: userId
          ? `Paid checkout converted user #${userId}.`
          : 'Paid checkout converted an attributed buyer.',
      },
    });

    if (!created && lead.status === 'converted' && (!userId || Number(lead.convertedUserId) === userId)) {
      return { leadId: lead.id, created: false, alreadyConverted: true };
    }

    const previousStatus = created ? null : (lead.status || null);
    if (!created) {
      await lead.update({
        status: 'converted',
        score: CHECKOUT_CONVERSION_SCORE,
        ...(userId ? { convertedUserId: userId } : {}),
        convertedAt: lead.convertedAt || now,
        ...(phone ? { phone } : {}),
        tags: mergeLeadTags(lead.tags, CHECKOUT_CONVERSION_TAGS),
      });
    }

    await LeadActivity.create({
      leadId: lead.id,
      type: 'status_change',
      performedByAI: false,
      title: 'Lead converted from checkout',
      description: 'Paid checkout verified and CRM conversion recorded.',
      metadata: {
        ...metadata,
        from: previousStatus,
        to: 'converted',
      },
    });

    return { leadId: lead.id, created, converted: true };
  } catch (err) {
    return { error: err?.message || 'lead capture failed' };
  }
}

export default { captureLeadFromCheckout };
