/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  postSaveHandoffAssembler.mjs — the HandoffData PRODUCER (Slice-2, Kimi F4)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Assembles the post-save handoff AFTER a workout save commits. Best-effort +    ║
 * ║  per-zone resilient: proof/nba/share each degrade to null independently, and    ║
 * ║  `safeAssemble` NEVER throws — a handoff failure must never block, duplicate, or ║
 * ║  roll back the save, or touch session-deduction (money-path fail-closed).        ║
 * ║  Server-side kill switch `ENABLE_POST_SAVE_HANDOFF` (default off) — the VITE      ║
 * ║  build-time flag alone is insufficient on a money path.                          ║
 * ║  Trainer-indispensability + zero-PII are enforced downstream (resolver + UI).    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { buildProofSeries } from './workoutProofSeriesService.mjs';
import { resolveNextBestAction } from './nextBestActionResolverService.mjs';

const zone = async (fn) => { try { return await fn(); } catch { return null; } };

/** Headline kind from proof (empty-series guard: 'pr'/'first' require a real series). */
export const resolveHeadline = (proof) => {
  const has = !!proof?.points?.length;
  if (has && proof.pr) return 'pr';
  if (has && proof.isFirstEver) return 'first';
  if ((proof?.sessionsThisWeek ?? 0) >= 3) return 'streak';
  return 'default';
};

/** Ownership: share is offered only to the record's owner (client-self OR admin-self). */
export const resolveShare = ({ viewerUserId, targetUserId } = {}) =>
  (viewerUserId != null && String(viewerUserId) === String(targetUserId))
    ? { eligible: true, reason: 'owner' }
    : { eligible: false, reason: 'not-owner' };

/**
 * @param {object} a
 * @param {number|string} a.viewerUserId  who is saving/viewing
 * @param {string} a.viewerRole           'client' | 'trainer' | 'admin'
 * @param {number|string} a.targetUserId  whose record the session belongs to
 * @param {object} a.models               resolved model registry
 * @param {string} a.todaySessionId       the just-saved WorkoutSession id
 * @returns {Promise<HandoffData|null>}
 */
export async function assembleHandoff(a = {}) {
  if (process.env.ENABLE_POST_SAVE_HANDOFF !== 'true') return null; // server kill switch
  const { viewerUserId, viewerRole, targetUserId, todaySessionId, models } = a;
  // Trainer/admin logging FOR a client → pass that client id so the NBA can offer ADJUST_PLAN.
  // Self-log (viewer === target) → no targetClientId, so no "client #id" framing.
  const targetClientId = (viewerUserId != null && String(viewerUserId) !== String(targetUserId))
    ? targetUserId : null;

  const proof = await zone(() => buildProofSeries({ targetUserId, todaySessionId, models }));
  const nba = await zone(() => resolveNextBestAction({
    viewerRole, viewerUserId, targetClientId, models, proofSeries: proof ?? null,
  }));
  const share = resolveShare({ viewerUserId, targetUserId });

  return { proof: proof ?? null, nba: nba ?? null, headline: resolveHeadline(proof), share };
}

/** Never-throws wrapper for call sites on the money path. */
export const safeAssemble = (a) => assembleHandoff(a).catch(() => null);
