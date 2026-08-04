/**
 * Nutrition Log Revision Service (S0.5, nutrition blueprint 2026-08-04)
 * =====================================================================
 * Captures the BEFORE-state of a daily_macro_logs row into the append-only
 * nutrition_log_revisions table whenever the row is updated, deleted, or has
 * its review state flipped.
 *
 * FAILURE POLICY: best-effort by contract. The user's edit/delete is the real
 * intent; an audit miss must never fail that write. Callers use
 * `recordMacroLogRevision(...).catch(...)`-free fire-and-await — this function
 * catches internally, logs, and returns null on any failure.
 *
 * PRIVACY: route handlers hold DECRYPTED instances (the model's afterFind hook
 * already ran). Snapshots re-encrypt description and items text with the SAME
 * contexts the live table uses, so the audit table never weakens
 * encryption-at-rest.
 */
import NutritionLogRevision from '../../models/NutritionLogRevision.mjs';
import { encrypt, isEncryptionEnabled } from '../encryption/encryptionService.mjs';
import { encryptNutritionItems } from '../encryption/healthDataEncryption.mjs';
import logger from '../../utils/logger.mjs';

const VALID_ACTIONS = new Set(['update', 'delete', 'verify']);

function encryptedSnapshot(plainRow) {
  const snapshot = { ...plainRow };
  if (!isEncryptionEnabled()) return snapshot;
  if (typeof snapshot.description === 'string' && snapshot.description) {
    snapshot.description = encrypt(snapshot.description, 'health:nutrition:description');
  }
  if (Array.isArray(snapshot.items)) {
    snapshot.items = encryptNutritionItems(snapshot.items);
  }
  return snapshot;
}

/**
 * @param {object} opts
 * @param {import('sequelize').Model} opts.entry - the DailyMacroLog instance BEFORE mutation
 * @param {'update'|'delete'|'verify'} opts.action
 * @param {number} opts.actorUserId
 * @param {string} [opts.actorRole]
 * @returns {Promise<NutritionLogRevision|null>} null on any failure (best-effort)
 */
export async function recordMacroLogRevision({ entry, action, actorUserId, actorRole = null }) {
  try {
    if (!entry || typeof entry.get !== 'function' || !VALID_ACTIONS.has(action)) return null;
    const plain = entry.get({ plain: true });
    return await NutritionLogRevision.create({
      macroLogId: plain.id,
      ownerUserId: plain.userId,
      actorUserId,
      actorRole,
      action,
      snapshot: encryptedSnapshot(plain),
    });
  } catch (err) {
    logger.warn(`[NutritionLogRevision] audit capture failed (${action}): ${err.message}`);
    return null;
  }
}

export default { recordMacroLogRevision };
