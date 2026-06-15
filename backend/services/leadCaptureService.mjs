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
 * Module layout (rule 4 — keep each file <300 lines):
 *  - leadCaptureShared.mjs   — shared constants + pure helpers.
 *  - leadCaptureCheckout.mjs — paid-checkout conversion (re-exported below).
 *  - this file                — contact / signup / newsletter touchpoints + barrel.
 * Public API is unchanged: import captureLeadFrom{Contact,Signup,Checkout,Newsletter}
 * from this module exactly as before.
 *
 * Models are imported dynamically to avoid circular imports and to keep this
 * module unit-testable with vi.mock.
 */

import {
  CONTACT_FORM_LEAD_SCORE,
  CONTACT_FORM_REPEAT_BONUS,
  SIGNUP_LEAD_SCORE,
  NON_SALES_ROLES,
  NEWSLETTER_LEAD_SCORE,
  NEWSLETTER_TAG,
  mapClientSourceToLeadSource,
  splitLeadName,
  mergeLeadTags,
} from './leadCaptureShared.mjs';
import { captureLeadFromCheckout } from './leadCaptureCheckout.mjs';

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
 * Capture a confirmed newsletter subscriber into the CRM Lead pipeline.
 * A confirmed double-opt-in subscriber is a free, consented prospect worth
 * nurturing. Best-effort + non-blocking; dedupes by email — an existing hotter
 * lead is only tagged + light-touched, never downgraded.
 *
 * @returns {Promise<{leadId?:number, created?:boolean, skipped?:string, error?:string}>}
 */
export async function captureLeadFromNewsletter({ email, firstName = null, lastName = null } = {}) {
  try {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return { skipped: 'no_email' };

    const { default: Lead } = await import('../models/Lead.mjs');
    const { default: LeadActivity } = await import('../models/LeadActivity.mjs');

    const [lead, created] = await Lead.findOrCreate({
      where: { email: normalized },
      defaults: {
        firstName: firstName || 'Subscriber', // first_name is NOT NULL
        lastName: lastName || null,
        email: normalized,
        source: 'website',
        sourceDetail: 'Newsletter (confirmed opt-in)',
        status: 'new',
        score: NEWSLETTER_LEAD_SCORE,
        tags: [NEWSLETTER_TAG],
        notes: 'Confirmed newsletter subscriber (double opt-in).',
      },
    });

    if (created) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Lead captured from newsletter confirmation',
        description: 'Confirmed double-opt-in newsletter subscriber',
        metadata: { source: 'newsletter' },
      });
    } else {
      // Existing lead also confirmed the newsletter — tag + light touch; NEVER
      // downgrade a hotter lead's score (no score write here).
      await lead.update({
        tags: mergeLeadTags(lead.tags, [NEWSLETTER_TAG]),
        lastContactedAt: new Date(),
      });
      await LeadActivity.create({
        leadId: lead.id,
        type: 'note_added',
        performedByAI: false,
        title: 'Existing lead confirmed newsletter',
        description: 'Lead also confirmed a double-opt-in newsletter subscription',
        metadata: { source: 'newsletter' },
      });
    }

    return { leadId: lead.id, created };
  } catch (err) {
    return { error: err?.message || 'newsletter lead capture failed' };
  }
}

// Paid-checkout conversion lives in its own module (rule 4); re-export to keep the API.
export { captureLeadFromCheckout };

export default { captureLeadFromCheckout, captureLeadFromContact, captureLeadFromNewsletter, captureLeadFromSignup };
