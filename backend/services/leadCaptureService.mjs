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

const SIGNUP_LEAD_SCORE = 50;      // creating an account = strong intent (> contact form's 30)
const NON_SALES_ROLES = new Set(['admin', 'trainer']);

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

export default { captureLeadFromSignup };
