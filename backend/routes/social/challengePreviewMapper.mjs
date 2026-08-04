/**
 * challengePreviewMapper — canonical challenge → social-surface preview shape.
 * ============================================================================
 * WHY THIS EXISTS (SWA-115, 2026-08-04): the client dashboards (Observatory Home +
 * Community page) call GET /api/social/challenges/active, which historically read the
 * EMPTY PascalCase "Challenges" twin — so members always saw zero challenges while the
 * 18 real rows lived in canonical `challenges`. The /active handler now reads the
 * canonical lane through this adapter, which emits the tolerant shape the pages were
 * written against (frontend ChallengePreview: title/name/description/progress/
 * currentProgress/target/participants — all optional) plus the fields
 * ClientCommunityPage renders directly (progress %, daysRemaining).
 *
 * Pure module: no imports, no DB — unit-testable in isolation.
 * Canonical field dialect (live-DB verified): title, maxProgress, progressUnit,
 * currentParticipants, isPublic; participation: currentProgress, progressPercentage.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Clamp a number into [0, 100] and round; anything non-finite → 0. */
function clampPct(n) {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
}

/**
 * @param {object} challenge  plain object (toJSON()) of a canonical Challenge row
 * @param {object|null} participation  plain object of the requesting user's canonical
 *                                     ChallengeParticipant row for this challenge, if any
 * @param {Date} [now]  injected for deterministic tests
 */
export function mapChallengeToSocialPreview(challenge, participation = null, now = new Date()) {
  const target = Number(challenge.maxProgress) || 0;

  // User-scoped progress percent: prefer the stored percentage, else derive it.
  // NOTE: null/undefined must fall through to derivation — Number(null) is 0 (finite),
  // which silently reported 0% for participants whose percentage was never stored.
  let progress = 0;
  if (participation) {
    const storedPct = participation.progressPercentage;
    if (storedPct !== null && storedPct !== undefined && Number.isFinite(Number(storedPct))) {
      progress = clampPct(Number(storedPct));
    } else if (target > 0) {
      progress = clampPct((Number(participation.currentProgress) / target) * 100);
    }
  }

  const end = challenge.endDate ? new Date(challenge.endDate) : null;
  const daysRemaining = end && !Number.isNaN(end.getTime())
    ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
    : 0;

  return {
    id: challenge.id,
    title: challenge.title,
    // Legacy alias: older widgets fall back to `name` (ChallengePreview declares both).
    name: challenge.title,
    description: challenge.description,
    category: challenge.category,
    status: challenge.status,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    target,
    unit: challenge.progressUnit,
    participants: Number(challenge.currentParticipants) || 0,
    daysRemaining,
    progress,
    currentProgress: participation ? Number(participation.currentProgress) || 0 : 0,
    isParticipating: Boolean(participation),
    participation: participation || null,
  };
}

export default mapChallengeToSocialPreview;
