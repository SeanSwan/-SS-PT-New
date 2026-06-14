/**
 * Lead Capture Service (Tier 0)
 * =============================
 * Turns first-party acquisition events into attributed CRM Leads so prospects
 * actually enter the pipeline/scoring/follow-up machinery (Marketing Command
 * Center audit, 2026-06-14). Every function here is BEST-EFFORT and NON-BLOCKING:
 * it returns a status object and never throws, so a lead-capture failure can
 * never break the user-facing flow that triggered it.
 *
 * Business rules baked in:
 *  - Move Fitness signups are FREE value-add clients (no-poach) → never a sales lead.
 *  - admin / trainer accounts are not sales prospects → skipped.
 *  - Dedupe by lowercased email so multiple touchpoints (contact form, signup,
 *    gallery) converge on ONE lead instead of duplicating.
 *
 * Models are imported dynamically to avoid circular imports and to keep this
 * module unit-testable with vi.mock.
 */

const CONTACT_FORM_LEAD_SCORE = 30;     // warm: they actively typed a message
const CONTACT_FORM_REPEAT_BONUS = 15;   // repeat contact = higher intent
const SIGNUP_LEAD_SCORE = 50;           // creating an account = strong intent
const CHECKOUT_CONVERSION_SCORE = 100;  // paid checkout = converted
const NON_SALES_ROLES = new Set(['admin', 'trainer']);
const CHECKOUT_CONVERSION_TAGS = ['checkout', 'converted'];
/**
 * Map a clientSource string to the Lead.source ENUM
 * (gallery | walk_in | website | referral | social_media | other).
 */
const mapClientSourceToLeadSource = (clientSource) => {
  switch (clientSource) {
    case 'external':
      return 'referral';
    case 'social_media':
      return 'social_media';
    default:
      return 'website';
  }
};

const splitLeadName = (name) => {
  const [firstToken, ...rest] = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstToken || 'Unknown',
    lastName: rest.length ? rest.join(' ') : null,
  };
};

const firstString = (...values) => (
  values.map((value) => String(value || '').trim()).find(Boolean) || ''
);

const parseCartCustomerInfo = (cart) => {
  if (!cart?.customerInfo) return {};
  if (typeof cart.customerInfo === 'object') return cart.customerInfo;
  try {
    return JSON.parse(cart.customerInfo);
  } catch {
    return {};
  }
};

const mergeLeadTags = (currentTags = [], tagsToAdd = []) => (
  [...new Set([
    ...(Array.isArray(currentTags) ? currentTags : []),
    ...tagsToAdd,
  ])]
);

/**
 * Capture a CRM lead from a successful public contact-form submission.
 * This is best-effort and returns a status object instead of throwing.
 *
 * @returns {Promise<{leadId?:number, created?:boolean, skipped?:string, error?:string}>}
 */
export async function captureLeadFromContact({ contact, formData, consultationType } = {}) {
  try {
    const email = String(formData?.email || '').trim().toLowerCase();
    if (!email) return { skipped: 'no_email' };

    const { default: Lead } = await import('../models/Lead.mjs');
    const { default: LeadActivity } = await import('../models/LeadActivity.mjs');

    const { firstName, lastName } = splitLeadName(formData?.name);
    const sourceDetail = consultationType
      ? `Contact form — ${String(consultationType).replace(/-/g, ' ')}`
      : 'Contact form';

    const [lead, created] = await Lead.findOrCreate({
      where: { email },
      defaults: {
        firstName,
        lastName,
        email,
        source: 'website',
        sourceDetail,
        status: 'new',
        score: CONTACT_FORM_LEAD_SCORE,
        notes: formData?.message || null,
        tags: ['contact-form'],
      },
    });

    if (created) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Lead captured from contact form',
        description: `New website contact via ${sourceDetail}`,
        metadata: { source: 'website', sourceDetail, contactId: contact?.id },
      });
    } else {
      await lead.update({
        lastContactedAt: new Date(),
        contactCount: (lead.contactCount || 0) + 1,
        score: Math.min(100, (lead.score || 0) + CONTACT_FORM_REPEAT_BONUS),
      });
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Repeat contact-form submission',
        description: `Existing lead submitted the contact form again via ${sourceDetail}`,
        metadata: { source: 'website', sourceDetail, contactId: contact?.id },
      });
    }

    return { leadId: lead.id, created };
  } catch (err) {
    return { error: err?.message || 'lead capture failed' };
  }
}

/**
 * Capture a CRM lead from a successful public signup.
 * Call AFTER the registration transaction commits.
 *
 * @returns {Promise<{leadId?:number, created?:boolean, skipped?:string, error?:string}>}
 */
export async function captureLeadFromSignup({ user, clientSource, role } = {}) {
  try {
    // No-poach: Move Fitness clients onboard free and are never a sales target.
    if (clientSource === 'move_fitness') return { skipped: 'move_fitness' };
    // Internal/staff roles are not sales prospects.
    if (NON_SALES_ROLES.has(role)) return { skipped: role };

    const email = (user?.email || '').trim().toLowerCase();
    if (!email) return { skipped: 'no_email' };

    const { default: Lead } = await import('../models/Lead.mjs');
    const { default: LeadActivity } = await import('../models/LeadActivity.mjs');

    const source = mapClientSourceToLeadSource(clientSource);
    const sourceDetail = `Signup — ${clientSource || 'swanstudios'}`;

    const [lead, created] = await Lead.findOrCreate({
      where: { email },
      defaults: {
        firstName: user.firstName || 'Unknown', // first_name is NOT NULL
        lastName: user.lastName || null,
        email,
        source,
        sourceDetail,
        status: 'new',
        score: SIGNUP_LEAD_SCORE,
        tags: ['signup'],
        // Link to the account in `notes` (Lead has no metadata column — rule 58).
        // The structured userId link lives on the LeadActivity below (which DOES
        // have a metadata column). convertedUserId stays null until they actually
        // buy (set by the checkout flow later) — a free account is not a paid conversion.
        notes: `Signed up as user #${user.id} via ${clientSource || 'swanstudios'}`,
      },
    });

    if (created) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Lead captured from signup',
        description: `New account (user ${user.id}) created via ${clientSource || 'swanstudios'}`,
        metadata: { source, userId: user.id, clientSource },
      });
    } else {
      // Existing lead (e.g. contacted first, now signed up) — strengthen, don't duplicate.
      await lead.update({
        score: Math.max(lead.score || 0, SIGNUP_LEAD_SCORE),
        lastContactedAt: new Date(),
      });
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Existing lead created an account',
        description: `Lead signed up (user ${user.id}) via ${clientSource || 'swanstudios'}`,
        metadata: { userId: user.id, clientSource },
      });
    }

    return { leadId: lead.id, created };
  } catch (err) {
    // Non-blocking: never break signup.
    return { error: err?.message || 'lead capture failed' };
  }
}

/**
 * Capture a paid checkout conversion into the CRM Lead pipeline.
 * This remains best-effort and idempotent so payment fulfillment cannot be
 * blocked by CRM writes or repeated success-page verification.
 *
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

    if (!created && lead.status === 'converted' && Number(lead.convertedUserId) === userId) {
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

export default { captureLeadFromCheckout, captureLeadFromContact, captureLeadFromSignup };
