/**
 * dashboardV2Controller — GET /api/dashboard/v2/summary?role=<role> (KIMI-DASHBOARDS §2.3).
 *
 * AUTHORIZATION MODEL:
 *  - Own role (requested === req.user.role): always allowed → your own subject data.
 *  - Admin requesting a DIFFERENT role: allowed as an impersonation PREVIEW (shape only, admin's own
 *    subject id) and AUDIT-LOGGED. This is the `?as={role}` capability from the spec.
 *  - Anyone else requesting a role that isn't theirs: 403. A client can never request the admin shape.
 *
 * FINANCE (money): `revenue_today` is server-gated twice — the env flag DASHBOARD_V2_FINANCE must be on
 * AND the effective role must be admin. The client cannot turn finance on; a trainer/client never sees it.
 */
import logger from '../utils/logger.mjs';
import { getDashboardSummary } from '../services/dashboardV2Service.mjs';

const ROLES = new Set(['admin', 'trainer', 'client', 'user']);

export async function getSummary(req, res) {
  const actorId = req.user?.id;
  const actorRole = req.user?.role;
  if (!actorId || !actorRole) return res.status(401).json({ error: 'Not authenticated.' });

  const requested = typeof req.query?.role === 'string' ? req.query.role : actorRole;
  if (!ROLES.has(requested)) return res.status(400).json({ error: 'Unknown role.' });

  // Authorization: own role, or admin previewing another role.
  const isSelf = requested === actorRole;
  const isAdminPreview = actorRole === 'admin' && !isSelf;
  if (!isSelf && !isAdminPreview) {
    logger.warn?.(`[dashboardV2] role escalation blocked: actor role=${actorRole} requested=${requested}`);
    return res.status(403).json({ error: 'Not permitted for your role.' });
  }
  if (isAdminPreview) {
    logger.info?.(`[dashboardV2][audit] admin id=${actorId} previewed role=${requested} (?as)`);
  }

  const finance = requested === 'admin' && process.env.DASHBOARD_V2_FINANCE === 'true';

  try {
    const summary = await getDashboardSummary({ role: requested, userId: actorId, finance });
    return res.json(summary);
  } catch (err) {
    const code = err?.statusCode || 500;
    if (code === 500) logger.error?.(`[dashboardV2] summary failed role=${requested}: ${err?.message}`);
    return res.status(code).json({ error: code === 400 ? 'Unknown role.' : 'Could not load dashboard.' });
  }
}
