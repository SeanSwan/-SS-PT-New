/**
 * publicConfigRoutes — Dashboards v2 (Slice-3) public feature flags (KIMI-DASHBOARDS §6.2).
 *
 * GET /api/config/public-flags → { dashboardV2, dashboardV2Finance, storeV4, homeVNext, aboutVNext,
 * videoVNext, contactVNext } (one boolean per flag-gated surface). Unauthenticated, non-sensitive
 * (only booleans), fail-closed defaults (env unset → false). The client uses these to hide UI; the
 * finance flag is ALSO enforced server-side in the summary controller (this is not the security gate).
 */
import express from 'express';

const router = express.Router();

const isTrue = (value) => value === 'true' || value === '1';

router.get('/public-flags', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    dashboardV2: isTrue(process.env.DASHBOARD_V2_ENABLED),
    dashboardV2Finance: isTrue(process.env.DASHBOARD_V2_FINANCE),
    storeV4: isTrue(process.env.STORE_V4_ENABLED),
    homeVNext: isTrue(process.env.HOME_VNEXT_ENABLED),
    aboutVNext: isTrue(process.env.ABOUT_VNEXT_ENABLED),
    videoVNext: isTrue(process.env.VIDEO_VNEXT_ENABLED),
    contactVNext: isTrue(process.env.CONTACT_VNEXT_ENABLED),
  });
});

export default router;
