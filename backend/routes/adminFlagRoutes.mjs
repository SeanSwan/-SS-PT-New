/**
 * adminFlagRoutes — Launch Control admin API. Admin-only (protect + authorize(['admin'])). Every mutation is
 * an UPSERT/DELETE on flag_overrides + an audit row; nothing here touches the surfaces directly. Flips take
 * effect on the next public-flags fetch (no redeploy). Mounted at /api/admin/flags.
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  getBoard,
  upsertOverride,
  deleteOverride,
  getAudit,
} from '../services/launchControlService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
router.use(protect);
router.use(authorize(['admin']));

// Audit actor — username or admin#<id>, never the email (keep the append-only ledger PII-lean, Rule 8).
const actorOf = (req) => req.user?.username || `admin#${req.user?.id ?? '?'}`;

/** GET /api/admin/flags — the launch board (registry + override + health + resolved live value). */
router.get('/', async (_req, res) => {
  try {
    res.json({ success: true, flags: await getBoard() });
  } catch (err) {
    logger.error('[LaunchControl] board error: %s', err.message);
    res.status(500).json({ success: false, error: 'Failed to load flags' });
  }
});

/** PUT /api/admin/flags/:flag — set/replace a force override. `{ value: boolean }` (P0 = force only). */
router.put('/:flag', async (req, res) => {
  try {
    const result = await upsertOverride(req.params.flag, req.body || {}, actorOf(req));
    if (result.error) return res.status(result.status || 400).json({ success: false, ...result });
    res.json({ success: true });
  } catch (err) {
    logger.error('[LaunchControl] upsert error: %s', err.message);
    res.status(500).json({ success: false, error: 'Failed to update flag' });
  }
});

/** DELETE /api/admin/flags/:flag/override — remove override → back to env baseline. */
router.delete('/:flag/override', async (req, res) => {
  try {
    await deleteOverride(req.params.flag, actorOf(req));
    res.json({ success: true });
  } catch (err) {
    logger.error('[LaunchControl] delete error: %s', err.message);
    res.status(500).json({ success: false, error: 'Failed to clear override' });
  }
});

/** GET /api/admin/flags/:flag/audit — history (use '*' for the global ledger). */
router.get('/:flag/audit', async (req, res) => {
  try {
    res.json({ success: true, audit: await getAudit(req.params.flag, Number(req.query.limit) || 50) });
  } catch (err) {
    logger.error('[LaunchControl] audit error: %s', err.message);
    res.status(500).json({ success: false, error: 'Failed to load audit' });
  }
});

/**
 * POST /api/admin/flags/verify — purge the Cloudflare edge cache (the real propagation blocker) so a flip
 * shows immediately. Graceful: if CF creds aren't configured it says so (200, never 500) — the flip still
 * works, it just takes the normal edge TTL to propagate.
 */
router.post('/verify', async (_req, res) => {
  const zone = process.env.CF_ZONE_ID;
  const token = process.env.CF_API_TOKEN;
  const site = (process.env.PUBLIC_SITE_URL || 'https://sswanstudios.com').replace(/\/+$/, '');
  if (!zone || !token) {
    return res.json({
      success: true,
      purged: false,
      reason: 'cf_not_configured',
      hint: 'Set CF_ZONE_ID + CF_API_TOKEN to enable one-click edge purge; otherwise hard-refresh after ~30s.',
    });
  }
  try {
    const cf = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [`${site}/`, `${site}/index.html`, `${site}/api/config/public-flags`] }),
    });
    const j = await cf.json().catch(() => ({}));
    res.json({ success: true, purged: j.success === true, purgedAt: new Date().toISOString(),
      reason: j.success ? undefined : 'cf_purge_failed' });
  } catch (err) {
    logger.warn('[LaunchControl] verify/purge failed: %s', err.message);
    res.json({ success: true, purged: false, reason: 'cf_unreachable' });
  }
});

export default router;
