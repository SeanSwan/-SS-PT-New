/**
 * Launch Control — PURE flag-resolution logic. No DB, no imports: unit-testable in isolation, which matters
 * because this precedence gates billing/dashboard surfaces. The DB layer (launchControlService) composes
 * these with override rows fetched from Postgres.
 */

export const isTrue = (value) => value === 'true' || value === '1';

export const APPROVED_FEATURE_FLAGS = Object.freeze([
  'dashboardV2Finance',
  'postSaveHandoff',
  'prismCapture',
]);

const APPROVED_FEATURE_FLAG_SET = new Set(APPROVED_FEATURE_FLAGS);

/** Launch Control is for risky product capabilities, never alternate visual surfaces. */
export const isApprovedFeatureFlag = (flag) => APPROVED_FEATURE_FLAG_SET.has(flag);

/**
 * The env→flag BASELINE map — the single source of the env-var mapping (imported by publicConfigRoutes so the
 * public response and the admin board agree). Shape is the public API contract; do not reorder/rename keys.
 */
export const envBaseline = () => ({
  dashboardV2Finance: isTrue(process.env.DASHBOARD_V2_FINANCE),
  prismCapture: isTrue(process.env.PRISM_CAPTURE_ENABLED),
  postSaveHandoff: isTrue(process.env.ENABLE_POST_SAVE_HANDOFF),
});

/** Deterministic 0..99 bucket for stable % rollout — same user+flag always lands in the same bucket. */
export function stableBucket(userId, flag) {
  const s = `${userId}:${flag}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

/**
 * PURE precedence resolver. No override → env baseline (zero behavior change). `force` → row.value (admin
 * override wins; applies to EVERYONE incl. anonymous). `rollout` → schedule, then role/percent targeting
 * (anonymous or non-matching → false). Never throws.
 */
export function resolveFlagValue(envBaseline, row, user) {
  if (!row) return envBaseline;
  if (row.mode === 'force') return Boolean(row.value);

  // rollout mode — schedule, role, and percent COMPOSE (all present gates must pass), so
  // {roles:['trainer'], pct:10} means "10% of trainers", not "100% of trainers" (F4).
  if (row.starts_at && new Date(row.starts_at).getTime() > Date.now()) return false;
  if (Array.isArray(row.roles) && row.roles.length > 0) {
    const role = user?.role;
    if (!role || !row.roles.includes(role)) return false; // anonymous / non-matching role → false
  }
  if (row.pct != null) {
    const uid = user?.id;
    if (uid == null) return false; // anonymous can't be bucketed
    if (stableBucket(uid, row.flag) >= row.pct) return false;
  }
  return Boolean(row.value);
}
