/**
 * ============================================================================
 * FILE: appearanceProfileController.mjs — FUSION F1
 * PURPOSE: GET/PUT the authenticated user's Smart Lens appearance profile.
 * ============================================================================
 * LAWS (BLUEPRINT-lens-world-fusion 03 §3, review-corrected):
 * - Identity comes from the auth token ONLY — no userId param exists.
 * - Server validation mirrors frontend core/style-lens-os/validation.ts
 *   EXACTLY: motionMode auto|reduced|off (NOT lean/still), density
 *   comfortable|compact, paletteThemeId crystalline-dark,
 *   profileSchemaVersion === 1 (NUMBER, never the string '1').
 * - styleLensId is shape-checked only (unknown ids are SAFE: clients
 *   resolve unknown -> null -> host defaults; the server needs no catalog).
 * - F1 scope: overlay must be null/absent (fail-closed UNSUPPORTED_OVERLAY);
 *   F4 replaces that branch with real bounded-overlay + tier validation.
 * - ZERO PII: payloads are ids/enums; log userId + outcome only, never values.
 * ============================================================================
 */
import UserAppearanceProfile from '../models/UserAppearanceProfile.mjs';
import logger from '../utils/logger.mjs';

const MOTION_MODES = ['auto', 'reduced', 'off'];
const DENSITIES = ['comfortable', 'compact'];
const STYLE_LENS_ID_PATTERN = /^[a-z][a-z0-9-]{1,64}$/;

const PROFILE_KEYS = [
  'profileSchemaVersion', 'paletteThemeId', 'styleLensId', 'motionMode', 'density', 'updatedAt',
];
const MAX_PROFILE_BYTES = 4096;

/** Pure, exported for tests: mirrors validateAppearanceProfile client-side —
 *  PLUS server-only hardening: unknown keys REJECTED (never stored) and a
 *  4KB serialized cap, so this table can never become arbitrary-JSON/PII
 *  storage (F0/F1 review, F1-2). */
export const validateAppearanceProfilePayload = (profile) => {
  const issues = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return [{ path: 'profile', message: 'profile object required' }];
  }
  for (const key of Object.keys(profile)) {
    if (!PROFILE_KEYS.includes(key)) {
      issues.push({ path: `profile.${key}`, message: 'unknown key rejected' });
    }
  }
  if (JSON.stringify(profile).length > MAX_PROFILE_BYTES) {
    issues.push({ path: 'profile', message: `serialized profile exceeds ${MAX_PROFILE_BYTES} bytes` });
  }
  if (profile.profileSchemaVersion !== 1) {
    issues.push({ path: 'profileSchemaVersion', message: 'must be the number 1' });
  }
  if (profile.paletteThemeId !== 'crystalline-dark') {
    issues.push({ path: 'paletteThemeId', message: 'must be crystalline-dark' });
  }
  if (typeof profile.styleLensId !== 'string' || !STYLE_LENS_ID_PATTERN.test(profile.styleLensId)) {
    issues.push({ path: 'styleLensId', message: 'invalid style lens id shape' });
  }
  if (!MOTION_MODES.includes(profile.motionMode)) {
    issues.push({ path: 'motionMode', message: 'must be auto | reduced | off' });
  }
  if (!DENSITIES.includes(profile.density)) {
    issues.push({ path: 'density', message: 'must be comfortable | compact' });
  }
  if (typeof profile.updatedAt !== 'string' || Number.isNaN(Date.parse(profile.updatedAt))) {
    issues.push({ path: 'updatedAt', message: 'must be an ISO date string' });
  }
  return issues;
};

export const getAppearanceProfile = async (req, res) => {
  try {
    const row = await UserAppearanceProfile.findOne({ where: { userId: req.user.id } });
    if (!row) {
      // First visit is not an error.
      return res.status(200).json({ success: true, profile: null, overlay: null, updatedAt: null });
    }
    return res.status(200).json({
      success: true,
      profile: row.profile,
      overlay: row.overlay ?? null,
      updatedAt: row.updatedAt ?? null,
    });
  } catch (error) {
    logger.error(`[appearance] GET failed for user ${req.user?.id}: ${error.message}`);
    return res.status(500).json({ success: false, error: 'APPEARANCE_READ_FAILED' });
  }
};

export const putAppearanceProfile = async (req, res) => {
  try {
    const { profile, overlay } = req.body ?? {};
    const issues = validateAppearanceProfilePayload(profile);
    if (issues.length > 0) {
      return res.status(422).json({ success: false, error: 'INVALID_PROFILE', details: issues });
    }
    if (overlay !== undefined && overlay !== null) {
      // F1 fail-closed: the Style Studio (F4) introduces real overlay validation.
      return res.status(422).json({ success: false, error: 'UNSUPPORTED_OVERLAY' });
    }
    await UserAppearanceProfile.upsert(
      { userId: req.user.id, profile, overlay: null },
      { conflictFields: ['userId'] },
    );
    const row = await UserAppearanceProfile.findOne({ where: { userId: req.user.id } });
    logger.info(`[appearance] PUT ok for user ${req.user.id}`);
    return res.status(200).json({
      success: true,
      profile: row?.profile ?? profile,
      overlay: row?.overlay ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (error) {
    logger.error(`[appearance] PUT failed for user ${req.user?.id}: ${error.message}`);
    return res.status(500).json({ success: false, error: 'APPEARANCE_WRITE_FAILED' });
  }
};
