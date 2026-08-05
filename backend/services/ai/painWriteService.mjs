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
 * VALIDATION SHARED WITH: backend/controllers/painEntryController.mjs
 *   - bodyRegion must be a PAIN_INTAKE_REGION (single-sourced in the ontology
 *     since Slice 1 — both files previously carried hand-duplicated copies
 *     whose headers both mis-documented the count as 48; it was 50)
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
import { PAIN_INTAKE_REGION_SET } from '../training-cortex/ontology/regionMuscleMap.mjs';

// Re-exported under the historical name for existing importers
// (painFollowUpService imports ALLOWED_BODY_REGIONS from here).
export const ALLOWED_BODY_REGIONS = PAIN_INTAKE_REGION_SET;

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
