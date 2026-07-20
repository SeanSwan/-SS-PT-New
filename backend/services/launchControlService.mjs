/**
 * Launch Control — flag resolution + control-plane data access.
 *
 * SAFETY CONTRACT (this gates billing/dashboard surfaces): the public resolver must NEVER throw and must
 * return the exact env baseline when no override row exists or the DB is unreachable. `resolveFlagValue` is
 * a PURE function (unit-tested) so the precedence logic is verifiable without a DB. Raw parameterized queries
 * (same pattern as galleryRoutes/authMiddleware) — no new Sequelize model registration on this hot path.
 */
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { envBaseline, resolveFlagValue, stableBucket } from './launchControlResolve.mjs';

// Re-export the pure logic so existing importers (publicConfigRoutes) keep a single import site.
export { envBaseline, resolveFlagValue, stableBucket };

/** All override rows keyed by flag. Failure → empty map (resolver falls back to env baseline). */
export async function getOverridesMap() {
  try {
    const [rows] = await sequelize.query(
      `SELECT flag, value, mode, roles, pct, starts_at FROM flag_overrides`,
    );
    const map = {};
    for (const r of rows) map[r.flag] = r;
    return map;
  } catch (err) {
    logger.warn('[LaunchControl] getOverridesMap failed, using env baseline: %s', err.message);
    return {};
  }
}

/**
 * Overlay DB overrides onto an env-baseline flag map, preserving its EXACT shape. Used by public-flags.
 * `user` optional (only role/percent rollouts consult it). Never throws.
 */
export async function overlayOverrides(envFlags, user) {
  const overrides = await getOverridesMap();
  if (Object.keys(overrides).length === 0) return envFlags;
  const out = { ...envFlags };
  for (const flag of Object.keys(out)) {
    if (overrides[flag]) out[flag] = resolveFlagValue(out[flag], overrides[flag], user);
  }
  return out;
}

// ── Admin control-plane (called only from admin-authed routes) ─────────────

/** Registry + current override + 24h/7d health + the RESOLVED live value (env overlaid with override). */
export async function getBoard() {
  const [flags] = await sequelize.query(
    `SELECT f.flag, f.label, f.grp, f.parent_flag, f.health_threshold,
            o.value, o.mode, o.roles, o.pct, o.starts_at, o.updated_by, o.updated_at,
            (SELECT COUNT(*) FROM flag_health h WHERE h.flag = f.flag AND h.created_at > now() - interval '24 hours') AS fail24h,
            (SELECT COUNT(*) FROM flag_health h WHERE h.flag = f.flag AND h.created_at > now() - interval '7 days')  AS fail7d
       FROM flags f
       LEFT JOIN flag_overrides o ON o.flag = f.flag
       ORDER BY f.grp, f.parent_flag NULLS FIRST, f.flag`,
  );
  const base = envBaseline();
  return flags.map((f) => {
    const hasOverride = f.value !== null && f.value !== undefined;
    const overrideRow = hasOverride
      ? { flag: f.flag, value: f.value, mode: f.mode, roles: f.roles, pct: f.pct, starts_at: f.starts_at }
      : null;
    return {
      ...f,
      fail24h: Number(f.fail24h),
      fail7d: Number(f.fail7d),
      envBase: Boolean(base[f.flag]),
      hasOverride,
      // "everyone" resolved value (anonymous visitor) — what the public site shows now.
      resolved: resolveFlagValue(Boolean(base[f.flag]), overrideRow, null),
      locked: Number(f.fail24h) > Number(f.health_threshold),
    };
  });
}

async function flagExists(flag) {
  const [rows] = await sequelize.query(`SELECT 1 FROM flags WHERE flag = :flag`, { replacements: { flag } });
  return rows.length > 0;
}

async function audit(flag, oldState, newState, actor, source) {
  await sequelize.query(
    `INSERT INTO flag_audit (flag, old_state, new_state, actor, source) VALUES (:flag, :o, :n, :actor, :source)`,
    { replacements: { flag, o: JSON.stringify(oldState), n: JSON.stringify(newState), actor, source } },
  );
}

/** UPSERT an override. Returns { ok } or { error }. Health-gates a force-ON when a surface is erroring. */
export async function upsertOverride(flag, body, actor, { allowUnhealthy = false } = {}) {
  if (!(await flagExists(flag))) return { error: 'unknown_flag', status: 404 };
  const { value, mode = 'force', roles = null, pct = null, starts_at = null } = body;
  if (typeof value !== 'boolean') return { error: 'value_required', status: 400 };
  if (!['force', 'rollout'].includes(mode)) return { error: 'bad_mode', status: 400 };
  if (pct != null && (pct < 1 || pct > 99)) return { error: 'bad_pct', status: 400 };

  if (value === true && !allowUnhealthy) {
    const [[{ fail24h, threshold }]] = await sequelize.query(
      `SELECT (SELECT COUNT(*) FROM flag_health h WHERE h.flag = :flag AND h.created_at > now() - interval '24 hours') AS fail24h,
              (SELECT health_threshold FROM flags WHERE flag = :flag) AS threshold`,
      { replacements: { flag } },
    );
    if (Number(fail24h) > Number(threshold)) {
      return { error: 'unhealthy', status: 409, allowOverride: true, fail24h: Number(fail24h) };
    }
  }

  const [existing] = await sequelize.query(`SELECT * FROM flag_overrides WHERE flag = :flag`, { replacements: { flag } });
  await sequelize.query(
    `INSERT INTO flag_overrides (flag, value, mode, roles, pct, starts_at, updated_by, updated_at)
     VALUES (:flag, :value, :mode, :roles, :pct, :starts_at, :actor, now())
     ON CONFLICT (flag) DO UPDATE SET value = :value, mode = :mode, roles = :roles, pct = :pct,
       starts_at = :starts_at, updated_by = :actor, updated_at = now()`,
    { replacements: { flag, value, mode, roles, pct, starts_at, actor } },
  );
  await audit(flag, existing[0] || null, { value, mode, roles, pct, starts_at }, actor, 'manual');
  return { ok: true };
}

/** Remove an override → back to env baseline. */
export async function deleteOverride(flag, actor, source = 'manual') {
  const [existing] = await sequelize.query(`SELECT * FROM flag_overrides WHERE flag = :flag`, { replacements: { flag } });
  if (!existing[0]) return { ok: true, noop: true };
  await sequelize.query(`DELETE FROM flag_overrides WHERE flag = :flag`, { replacements: { flag } });
  await audit(flag, existing[0], null, actor, source);
  return { ok: true };
}

/** Panic button: force every redesign flag OFF. Returns count. */
export async function killAllRedesigns(actor) {
  const [redesigns] = await sequelize.query(`SELECT flag FROM flags WHERE grp = 'redesign'`);
  let count = 0;
  for (const { flag } of redesigns) {
    await upsertOverride(flag, { value: false, mode: 'force' }, actor, { allowUnhealthy: true });
    count++;
  }
  await audit('*', null, { killAll: true }, actor, 'kill_all');
  return count;
}

export async function getAudit(flag, limit = 50) {
  const [rows] = await sequelize.query(
    `SELECT flag, old_state, new_state, actor, source, created_at FROM flag_audit
      WHERE (:flag = '*' OR flag = :flag) ORDER BY created_at DESC LIMIT :limit`,
    { replacements: { flag, limit: Math.min(200, Math.max(1, limit)) } },
  );
  return rows;
}

/** Called by every surface Gate's ErrorBoundary (public, rate-limited). Silently ignores unknown flags. */
export async function recordHealth(flag, surface, errMsg, ua) {
  try {
    if (!(await flagExists(flag))) return;
    await sequelize.query(
      `INSERT INTO flag_health (flag, surface, err_msg, ua) VALUES (:flag, :surface, :err, :ua)`,
      { replacements: { flag, surface: surface || null, err: (errMsg || '').slice(0, 500), ua: (ua || '').slice(0, 300) } },
    );
  } catch (err) {
    logger.warn('[LaunchControl] recordHealth failed: %s', err.message);
  }
}

export default {
  resolveFlagValue,
  stableBucket,
  overlayOverrides,
  getBoard,
  upsertOverride,
  deleteOverride,
  killAllRedesigns,
  getAudit,
  recordHealth,
};
