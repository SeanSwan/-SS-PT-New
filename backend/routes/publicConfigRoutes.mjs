/**
 * publicConfigRoutes — public feature flags (KIMI-DASHBOARDS §6.2) + Launch Control overlay.
 *
 * GET /api/config/public-flags → { dashboardV2, dashboardV2Finance, storeV4, homeVNext, aboutVNext,
 * videoVNext, contactVNext, galleryVNext, prismCapture, postSaveHandoff } (one boolean per flag-gated surface). Unauthenticated,
 * non-sensitive (only booleans), fail-closed defaults (env unset → false). The client uses these to hide UI;
 * the finance flag is ALSO enforced server-side in the summary controller (this is not the security gate).
 *
 * The env values below are the BASELINE. Launch Control (admin) overlays runtime overrides from the
 * `flag_overrides` table so a surface can be flipped with no redeploy. `overlayOverrides` NEVER throws and
 * returns the exact env baseline when there is no override / the DB is unreachable — so this endpoint behaves
 * identically to before until an admin writes an override.
 *
 * POST /api/config/flag-health → append-only fail-closed telemetry from each surface Gate's ErrorBoundary.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { envBaseline, overlayOverrides, recordHealth } from '../services/launchControlService.mjs';

const router = express.Router();

router.get('/public-flags', async (req, res) => {
  // Cache contract enforced in CODE, not convention: only cache PUBLICLY when the response is user-invariant.
  // Today no middleware attaches req.user here (anonymous, force-only), so `public` is safe. If a future change
  // (e.g. global optionalAuth for preview-as) ever attaches a user, per-user rollout results must NOT land in a
  // shared/CDN cache — so downgrade to private/no-store the moment a user is present.
  if (req.user) res.set('Cache-Control', 'private, no-store');
  else res.set('Cache-Control', 'public, max-age=30');
  const flags = await overlayOverrides(envBaseline(), req.user);
  res.json(flags);
});

// Fail-closed telemetry: a surface Gate that falls back to its old page POSTs here (public, best-effort).
const healthLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.post('/flag-health', healthLimiter, async (req, res) => {
  const { flag, surface, err } = req.body || {};
  if (typeof flag === 'string' && flag.length > 0 && flag.length < 80) {
    void recordHealth(flag, surface, err); // no user-agent / IP stored (Rule 8 zero-PII)
  }
  res.status(204).end(); // never blocks the client
});

export default router;
