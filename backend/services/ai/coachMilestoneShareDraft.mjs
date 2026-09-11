/**
 * G07/T48 — milestone share DRAFT, strictly separate from log approval (S8c).
 *
 * A verified milestone session may produce a share DRAFT. Creating the draft
 * performs NO send and returns no sender: sharing is its own later, explicit,
 * consent-carrying step. Approving/committing the workout LOG never touches
 * this module — the separation is structural (the log lane has no import of
 * any share/send path; proven by coachMilestoneShareDraft.test.mjs's lane
 * purity check and by the absence of any send API here).
 */

/** Only completed, verified, explicitly-flagged milestones yield a draft. */
export function buildMilestoneShareDraft({ session = null, actorId = null } = {}) {
  const sessionId = String(session?.id || '');
  const eligible = Boolean(
    sessionId
    && session?.status === 'completed'
    && session?.verified === true
    && session?.isMilestone === true,
  );
  if (!eligible) {
    return {
      status: 'not_eligible',
      draft: null,
      reasons: !sessionId ? ['missing_session'] : ['session_not_verified_milestone'],
    };
  }
  return {
    status: 'draft',
    draft: {
      draftId: `share-draft:${sessionId}`,
      sessionId,
      milestoneType: String(session.milestoneType || 'milestone'),
      actorId: actorId == null ? null : Number(actorId),
      // Consent is captured at share time by the separate share flow — never
      // assumed here. This draft carries no recipients and no sender.
      consentRequired: true,
      recipients: [],
      payload: {
        title: session.title ?? null,
        date: session.date ?? null,
      },
    },
    reasons: [],
  };
}
