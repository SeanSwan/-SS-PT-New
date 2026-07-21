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
    };
  });
}

async function flagExists(flag) {
  const [rows] = await sequelize.query(`SELECT 1 FROM flags WHERE flag = :flag`, { replacements: { flag } });
  return rows.length > 0;
}

async function audit(flag, oldState, newState, actor, source, transaction) {
  await sequelize.query(
    `INSERT INTO flag_audit (flag, old_state, new_state, actor, source) VALUES (:flag, :o, :n, :actor, :source)`,
    { replacements: { flag, o: JSON.stringify(oldState), n: JSON.stringify(newState), actor, source }, transaction },
  );
}

/**
 * UPSERT an override. Returns { ok } or { error }. P0 supports ONLY `force` (a plain on/off for everyone):
 * rollout writes are rejected until the targeting drawer ships (P1), so a hand-crafted rollout row can't
 * confuse the board or leak through the anonymous public endpoint. Health is ADVISORY (a red chip on the
 * board), never a write gate — an admin's intentional flip must not be blockable by anonymous telemetry.
 */
export async function upsertOverride(flag, body, actor) {
  if (!(await flagExists(flag))) return { error: 'unknown_flag', status: 404 };
  const { value, mode = 'force' } = body || {};
  if (typeof value !== 'boolean') return { error: 'value_required', status: 400 };
  if (mode !== 'force') return { error: 'rollout_not_enabled', status: 400 };

  // Atomic: the upsert and its audit row commit together (a crash between them left an unaudited flip).
  // FOR UPDATE serializes concurrent flips of the same flag so the audit's before-state is truthful.
  await sequelize.transaction(async (t) => {
    const [existing] = await sequelize.query(
      `SELECT * FROM flag_overrides WHERE flag = :flag FOR UPDATE`,
      { replacements: { flag }, transaction: t },
    );
    await sequelize.query(
      `INSERT INTO flag_overrides (flag, value, mode, roles, pct, starts_at, updated_by, updated_at)
       VALUES (:flag, :value, 'force', NULL, NULL, NULL, :actor, now())
       ON CONFLICT (flag) DO UPDATE SET value = :value, mode = 'force', roles = NULL, pct = NULL,
         starts_at = NULL, updated_by = :actor, updated_at = now()`,
      { replacements: { flag, value, actor }, transaction: t },
    );
    await audit(flag, existing[0] || null, { value, mode: 'force' }, actor, 'manual', t);
  });
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

/** Panic button: force every redesign flag OFF in ONE atomic statement (all-or-nothing — no half-kill). */
export async function killAllRedesigns(actor) {
  const [, meta] = await sequelize.query(
    `INSERT INTO flag_overrides (flag, value, mode, roles, pct, starts_at, updated_by, updated_at)
     SELECT flag, false, 'force', NULL, NULL, NULL, :actor, now() FROM flags WHERE grp = 'redesign'
     ON CONFLICT (flag) DO UPDATE SET value = false, mode = 'force', roles = NULL, pct = NULL,
       starts_at = NULL, updated_by = :actor, updated_at = now()`,
    { replacements: { actor } },
  );
  const count = meta?.rowCount ?? 0;
  await audit('*', null, { killAll: true, count }, actor, 'kill_all');
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

/**
 * Called by every surface Gate's ErrorBoundary (public, rate-limited). Advisory only — never gates a write.
 * No user-agent / IP / identifying fields are stored (Rule 8 zero-PII): flag + surface + truncated err only.
 */
export async function recordHealth(flag, surface, errMsg) {
  try {
    if (!(await flagExists(flag))) return;
    await sequelize.query(
      `INSERT INTO flag_health (flag, surface, err_msg) VALUES (:flag, :surface, :err)`,
      { replacements: { flag, surface: surface || null, err: (errMsg || '').slice(0, 500) } },
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
