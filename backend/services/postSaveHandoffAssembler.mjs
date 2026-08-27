/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  postSaveHandoffAssembler.mjs — the HandoffData PRODUCER (Slice-2, Kimi F4)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Assembles the post-save handoff AFTER a workout save commits. Best-effort +    ║
 * ║  per-zone resilient: proof/nba/share each degrade to null independently, and    ║
 * ║  `safeAssemble` NEVER throws — a handoff failure must never block, duplicate, or ║
 * ║  roll back the save, or touch session-deduction (money-path fail-closed).        ║
 * ║  Server-side gate: Launch Control `postSaveHandoff` — env baseline               ║
 * ║  `ENABLE_POST_SAVE_HANDOFF` (default off) overlaid with the admin board's        ║
 * ║  runtime override (flip with no redeploy). The VITE build-time flag alone is     ║
 * ║  insufficient on a money path.                                                   ║
 * ║  Trainer-indispensability + zero-PII are enforced downstream (resolver + UI).    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { buildProofSeries } from './workoutProofSeriesService.mjs';
import { resolveNextBestAction } from './nextBestActionResolverService.mjs';
import { envBaseline, overlayOverrides } from './launchControlService.mjs';
import { signReferralCode } from '../utils/referralCode.mjs';

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
    // Owner shares carry a signed referral code so the share LINK attributes any later signup
    // (acquisition). null when no secret is configured — the share still works, unattributed.
    ? { eligible: true, reason: 'owner', referralCode: signReferralCode(viewerUserId) }
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
  const { viewerUserId, viewerRole, targetUserId, todaySessionId, models } = a;
  // Launch Control gate: env baseline overlaid with the admin board's runtime override. overlayOverrides
  // NEVER throws and returns the plain env baseline when the override table is unreachable — so with no
  // override this line behaves exactly like the old `ENABLE_POST_SAVE_HANDOFF !== 'true'` kill switch.
  // Viewer is passed so role/percent rollout modes resolve correctly (force mode ignores it).
  const flags = await overlayOverrides(envBaseline(), { id: viewerUserId, role: viewerRole });
  if (!flags.postSaveHandoff) return null;
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

// Never-throws + TIME-BOUNDED + LOAD-SHEDDING wrapper for money-path call sites. assembleHandoff is
// best-effort and runs strictly AFTER the workout save commits, but it issues fresh reads (proof load +
// NBA resolve), so a slow/contended DB must never stretch the save's response latency:
//  • 2500ms budget: if assembly outruns it, resolve null (UI suppresses; GET /:id/handoff can re-fetch).
//  • circuit breaker: the race does NOT cancel the losing queries, so under DB-pool stress every save
//    would stack up to 2500ms of extra work — self-amplifying during exactly the incident you least
//    want. Track REAL in-flight work (decremented when the WORK settles, not when the race times out)
//    and shed once saturated: excess saves get handoff:null instantly. Bounding it HERE covers every
//    call site uniformly. Happy path (flag off = instant null; healthy DB) is unaffected.
const HANDOFF_ASSEMBLE_BUDGET_MS = 2500;
const MAX_CONCURRENT_ASSEMBLIES = 4;
let inFlightAssemblies = 0;
export const safeAssemble = (a) => {
  if (inFlightAssemblies >= MAX_CONCURRENT_ASSEMBLIES) return Promise.resolve(null); // shed load
  inFlightAssemblies += 1;
  const work = assembleHandoff(a)
    .catch(() => null)
    .finally(() => { inFlightAssemblies -= 1; });
  let timer;
  const budget = new Promise((resolve) => { timer = setTimeout(() => resolve(null), HANDOFF_ASSEMBLE_BUDGET_MS); });
  return Promise.race([work, budget]).finally(() => clearTimeout(timer));
};
