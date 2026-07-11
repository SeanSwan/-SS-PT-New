/**
 * Consult Request Service
 * =======================
 * Records a prospect's "book a free consult" request into the CRM: the lead moves to
 * status `scheduled` (a strong intent signal) and a `meeting_scheduled` activity is
 * logged with the preferred time/notes. Per the ratified plan, this is a consult
 * REQUEST pending the owner's one-tap confirm — it deliberately does NOT create a
 * `Session` (that would risk double-booking Sean's calendar without availability checks).
 *
 * Best-effort + non-blocking: returns a status object, never throws, dedupes by email,
 * and never downgrades a lead that has already `converted` into a customer.
 */
import { splitLeadName } from './leadCaptureShared.mjs';

const CONSULT_REQUEST_SCORE = 60; // stronger intent than a bare contact-form touch

export async function captureConsultRequest({ name, email, phone = null, preferredTime = null, notes = null, leadId = null } = {}) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { default: Lead } = await import('../models/Lead.mjs');
    const { default: LeadActivity } = await import('../models/LeadActivity.mjs');

    // Prefer an explicit leadId (from a nurture-email consult link); else dedupe by email.
    let lead = null;
    let created = false;
    if (leadId != null && Number.isInteger(Number(leadId)) && Number(leadId) > 0) {
      lead = await Lead.findByPk(Number(leadId));
    }
    if (!lead) {
      if (!normalizedEmail) return { skipped: 'no_email' };
      const { firstName, lastName } = splitLeadName(name);
      const [found, wasCreated] = await Lead.findOrCreate({
        where: { email: normalizedEmail },
        defaults: {
          firstName: firstName || 'Prospect', // first_name is NOT NULL
          lastName: lastName || null,
          email: normalizedEmail,
          phone: phone || null,
          source: 'website',
          sourceDetail: 'Consult request',
          status: 'scheduled',
          scheduledAt: new Date(), // stamp the paired timestamp (funnel queries group 'scheduled' by scheduledAt)
          score: CONSULT_REQUEST_SCORE,
          tags: ['consult-request'],
          notes: notes || null,
        },
      });
      lead = found;
      created = wasCreated;
    }

    const previousStatus = created ? null : lead.status;

    // SECURITY (public, email-matched): a NEW prospect gets the full consult treatment — the
    // findOrCreate defaults above already set status:'scheduled' + score + tags, and we write the
    // consult timeline entry. An EXISTING lead is NOT mutated by an unauthenticated caller: no
    // status advance, no score/tag bump, no attacker-controlled LeadActivity onto its authoritative
    // timeline (that was an IDOR / pipeline-stage + timeline injection). The owner is still notified
    // by the route so a genuine repeat consult is confirmed by a human, not auto-applied to the CRM.
    if (created) {
      try {
        await LeadActivity.create({
          leadId: lead.id,
          type: 'meeting_scheduled',
          performedByAI: false,
          title: 'Consult requested (pending owner confirm)',
          description: preferredTime
            ? `Prospect requested a free consult — preferred time: ${preferredTime}`
            : 'Prospect requested a free consult',
          metadata: { preferredTime, notes, source: 'consult_request' },
        });
      } catch {
        // best-effort — the lead was already created; an activity-insert failure must not fail the request.
      }
    }

    return { leadId: lead.id, created, previousStatus, status: lead.status };
  } catch (err) {
    return { error: err?.message || 'consult request capture failed' };
  }
}

export default { captureConsultRequest };
