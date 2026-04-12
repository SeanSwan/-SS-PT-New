/**
 * ============================================================================
 * FILE: painWriteService.mjs
 * PURPOSE: Shared pain entry write service for AI command dispatcher
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-10
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the canonical write path for add_pain_entry.
 * Preserves controller-level validation that is NOT enforced by the Sequelize
 * model (ALLOWED_BODY_REGIONS check, painLevel 1-10 range).
 *
 * VALIDATION MIRRORED FROM: backend/controllers/painEntryController.mjs
 *   - bodyRegion must be in ALLOWED_BODY_REGIONS (48 values)
 *   - painLevel must be integer 1-10
 *   - side is always 'center' — the narrow command schema does not expose it
 *   - description from params.notes if present
 *
 * INTENTIONAL DELTA vs. HTTP controller:
 *   - Does not set trainerNotes / aiNotes / posturalSyndrome / assessmentFindings
 *     (advanced trainer fields not part of the narrow AI command schema)
 *   - side is hardcoded to 'center' (model allowNull: false, defaultValue: 'center')
 */

import { getClientPainEntry } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

// ── Allowed Body Regions ─────────────────────────────────────────────────────
//
// Mirrors ALLOWED_BODY_REGIONS in backend/controllers/painEntryController.mjs.
// Keep in sync manually when the controller set changes.

export const ALLOWED_BODY_REGIONS = new Set([
  // Front view
  'neck_front', 'chest_left', 'chest_right', 'chest',
  'left_shoulder', 'right_shoulder',
  'left_bicep', 'right_bicep',
  'left_forearm', 'right_forearm',
  'left_elbow', 'right_elbow',
  'upper_abs', 'lower_abs', 'left_oblique', 'right_oblique',
  'left_hip_flexor', 'right_hip_flexor',
  'left_quad', 'right_quad',
  'left_inner_thigh', 'right_inner_thigh',
  'left_shin', 'right_shin',
  'left_knee', 'right_knee',
  'left_ankle_front', 'right_ankle_front',
  // Back view
  'neck_back', 'upper_traps_left', 'upper_traps_right',
  'mid_back_left', 'mid_back_right',
  'left_rear_delt', 'right_rear_delt',
  'lower_back_left', 'lower_back_right', 'lower_back',
  'left_tricep', 'right_tricep',
  'left_glute', 'right_glute',
  'left_hamstring', 'right_hamstring',
  'left_calf', 'right_calf',
  'left_achilles', 'right_achilles',
  // Rotator cuff
  'left_rotator_cuff', 'right_rotator_cuff',
]);

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a pain entry for a client via the AI command lane.
 * Validates bodyRegion + painLevel before writing (mirrors controller semantics).
 *
 * @param {{ bodyRegion: string, painLevel: number, notes?: string }} params
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{ entryId: number, userId: number, bodyRegion: string, painLevel: number, isActive: boolean }>}
 * @throws {Error} On validation failure or DB error — dispatcher catches and returns user-facing error
 */
export async function createPainEntry(params, { clientId, trainerId }) {
  const { bodyRegion, painLevel, notes } = params;

  if (!ALLOWED_BODY_REGIONS.has(bodyRegion)) {
    throw new Error(
      `Invalid bodyRegion: "${bodyRegion}". Use a recognized region (e.g., left_knee, lower_back, right_shoulder).`
    );
  }

  const level = Number(painLevel);
  if (!Number.isInteger(level) || level < 1 || level > 10) {
    throw new Error(`painLevel must be an integer between 1 and 10. Got: ${painLevel}`);
  }

  const ClientPainEntry = getClientPainEntry();

  const row = await ClientPainEntry.create({
    userId:      clientId,
    createdById: trainerId,
    bodyRegion,
    painLevel:   level,
    side:        'center',      // model allowNull: false; narrow schema does not expose side
    description: notes || null,
    isActive:    true,
  });

  logger.info('[PainWriteService] Pain entry created', {
    entryId: row.id,
    clientId,
    trainerId,
    bodyRegion,
    painLevel: level,
  });

  return {
    entryId:    row.id,
    userId:     clientId,
    bodyRegion: row.bodyRegion,
    painLevel:  row.painLevel,
    isActive:   row.isActive,
  };
}
