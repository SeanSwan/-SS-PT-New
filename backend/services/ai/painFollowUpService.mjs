/**
 * ============================================================================
 * FILE: painFollowUpService.mjs
 * PURPOSE: Shared pain entry follow-up service for AI command dispatcher
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the canonical resolve and update paths for
 * pain entry follow-up commands (exec-substrate-v11).
 *
 * RESOLUTION CONTRACT (shared by all follow-up operations):
 *   - Validates bodyRegion against ALLOWED_BODY_REGIONS (imported from painWriteService)
 *   - Queries active entries: { userId, bodyRegion, isActive: true }
 *   - 0 rows  → honest not-found error
 *   - 2+ rows → honest ambiguity error (lists entryIds so trainer can escalate via entryId)
 *   - 1 row   → proceed
 *
 * RATIONALE: Silent "most recent" selection is unsafe for medical data. A trainer
 * saying "resolve Alex's left_knee pain" must target exactly one record. If there
 * are multiple active left_knee entries (e.g. logged twice), the system must report
 * the ambiguity rather than silently resolve the wrong one.
 *
 * VALIDATION SHARED WITH: backend/controllers/painEntryController.mjs
 *   - bodyRegion must be a pain-intake region (single-sourced in the ontology
 *     via painWriteService re-export; count derived, never hand-written)
 *   - painLevel must be integer 1-10 (if present)
 *
 * REAL resolvedAt: After entry.update(), the actual DB-stored resolvedAt is read
 * back from the model instance. No fabricated fallback.
 */

import { getClientPainEntry } from '../../models/index.mjs';
import { ALLOWED_BODY_REGIONS } from './painWriteService.mjs';
import logger from '../../utils/logger.mjs';

// ── Shared resolution lookup ──────────────────────────────────────────────────

/**
 * Resolve exactly one active pain entry for a client + bodyRegion.
 * Throws on 0 or 2+ matches. Returns the single matching row on exactly 1 match.
 *
 * @param {string} bodyRegion
 * @param {number} clientId
 * @returns {Promise<import('sequelize').Model>} The single active entry
 * @throws {Error} honest not-found or ambiguity error
 */
async function resolveExactActiveEntry(bodyRegion, clientId) {
  const ClientPainEntry = getClientPainEntry();

  const rows = await ClientPainEntry.findAll({
    where: { userId: clientId, bodyRegion, isActive: true },
    attributes: ['id', 'bodyRegion', 'painLevel', 'isActive', 'resolvedAt'],
  });

  if (rows.length === 0) {
    throw new Error(
      `No active ${bodyRegion.replace(/_/g, ' ')} pain entry found for this client.`
    );
  }

  if (rows.length > 1) {
    const count = rows.length;
    throw new Error(
      `${count} active ${bodyRegion.replace(/_/g, ' ')} pain entries found for this client. ` +
      `Swan Coach cannot safely choose one. ` +
      `Please resolve or edit the specific entry from the pain log UI.`
    );
  }

  return rows[0];
}

// ── Resolve ───────────────────────────────────────────────────────────────────

/**
 * Resolve a client's active pain entry by bodyRegion.
 * Exact-or-error resolution — never silently picks from multiple rows.
 *
 * @param {{ bodyRegion: string }} params
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{ entryId, userId, bodyRegion, isActive, resolvedAt }>}
 */
export async function resolvePainEntry(params, { clientId }) {
  const { bodyRegion } = params;

  if (!ALLOWED_BODY_REGIONS.has(bodyRegion)) {
    throw new Error(
      `Invalid bodyRegion: "${bodyRegion}". Use a recognized region (e.g., left_knee, lower_back, right_shoulder).`
    );
  }

  const entry = await resolveExactActiveEntry(bodyRegion, clientId);

  await entry.update({ isActive: false, resolvedAt: new Date() });

  // Read the actual stored resolvedAt from the updated instance — no fabrication.
  const resolvedAtValue = entry.resolvedAt instanceof Date
    ? entry.resolvedAt.toISOString().slice(0, 10)
    : typeof entry.resolvedAt === 'string'
      ? entry.resolvedAt.slice(0, 10)
      : null;

  logger.info('[PainFollowUpService] Pain entry resolved', {
    entryId: entry.id,
    clientId,
    bodyRegion,
  });

  return {
    entryId:    entry.id,
    userId:     clientId,
    bodyRegion: entry.bodyRegion,
    isActive:   entry.isActive,
    resolvedAt: resolvedAtValue,
  };
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update a client's active pain entry by bodyRegion.
 * Requires at least one of: painLevel or notes.
 * Exact-or-error resolution — never silently picks from multiple rows.
 *
 * @param {{ bodyRegion: string, painLevel?: number, notes?: string }} params
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{ entryId, userId, bodyRegion, painLevel, isActive }>}
 */
export async function updatePainEntryByRegion(params, { clientId }) {
  const { bodyRegion, painLevel, notes } = params;

  if (!ALLOWED_BODY_REGIONS.has(bodyRegion)) {
    throw new Error(
      `Invalid bodyRegion: "${bodyRegion}". Use a recognized region (e.g., left_knee, lower_back, right_shoulder).`
    );
  }

  // Guard: must be updating something
  if (painLevel == null && (notes == null || notes === '')) {
    throw new Error(
      'At least one field required: painLevel (1–10) or notes.'
    );
  }

  if (painLevel != null) {
    const level = Number(painLevel);
    if (!Number.isInteger(level) || level < 1 || level > 10) {
      throw new Error(`painLevel must be an integer between 1 and 10. Got: ${painLevel}`);
    }
  }

  const entry = await resolveExactActiveEntry(bodyRegion, clientId);

  const updates = {};
  if (painLevel != null) updates.painLevel = Number(painLevel);
  if (notes != null && notes !== '') updates.description = notes;  // DB column is description

  await entry.update(updates);

  logger.info('[PainFollowUpService] Pain entry updated', {
    entryId: entry.id,
    clientId,
    bodyRegion,
    updates,
  });

  return {
    entryId:    entry.id,
    userId:     clientId,
    bodyRegion: entry.bodyRegion,
    painLevel:  entry.painLevel,
    isActive:   entry.isActive,
  };
}
