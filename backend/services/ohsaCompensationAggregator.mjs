/**
 * ohsaCompensationAggregator.mjs (V3c.4)
 * =======================================
 *
 * Bridges the OHSA wizard's payload shape to the
 * `MovementProfile.commonCompensations` JSONB column that
 * `clientIntelligenceService` reads.
 *
 * Why this exists:
 *   - The MovementAnalysisWizard frontend writes overheadSquatAssessment
 *     via POST/PUT /api/movement-analysis. The controller saves the
 *     assessment to the `MovementAnalysis` model, BUT does NOT update
 *     the user's `MovementProfile.commonCompensations`.
 *   - `clientIntelligenceService.getClientContext` (line 491-493) reads
 *     ONLY from `movementProfile?.commonCompensations`. The
 *     MovementAnalysis row's `correctiveExerciseStrategy.compensationsIdentified`
 *     is invisible to the workout planner.
 *   - Result: trainers conduct OHSA assessments, but the data never
 *     reaches the workout-builder or V3c.3 corrective injection.
 *     V3c.4 closes that gap by upserting the MovementProfile after
 *     each MovementAnalysis save.
 *
 * Mapping rationale:
 *   - OHSA wizard fields → `clientIntelligenceService` CES_MAP keys.
 *     Both vocabularies describe the same compensations under different
 *     names (kneeValgus/knee_valgus, forwardHead/head_protrusion).
 *     The mapping below normalizes wizard → CES_MAP, and V3c.1's
 *     `mapCompensationToCesTags` carries CES_MAP → V3b.3 from there.
 *   - Severity buckets (`'minor' → 5`, `'significant' → 8`) come from
 *     the wizard's tri-state value set (`none | minor | significant`)
 *     and the wizard's own scoreMap (none:100, minor:70, significant:40).
 *
 * V3c.4 scope:
 *   - This slice writes the LATEST assessment's compensations into
 *     MovementProfile.commonCompensations. Multi-assessment trend
 *     aggregation (frequency >1, trend='improving|worsening') is a
 *     follow-up slice — once we have multi-assessment history, we'll
 *     compute frequency = count of last-N assessments containing the
 *     compensation, avgSeverity = mean across those assessments, and
 *     trend by comparing first-half vs second-half severity averages.
 */

// OHSA wizard severity values → numeric severity (0-10).
const SEVERITY_BY_LEVEL = {
  none: 0,
  minor: 5,
  significant: 8,
};

// OHSA wizard field name → clientIntelligenceService CES_MAP key.
//
// Multiple wizard fields can map to the same CES_MAP key (e.g. both
// feetTurnout and feetFlattening collapse into foot_pronation). When
// a client has multiple wizard fields all flagged, we pick the
// highest severity for the resulting compensation entry.
const OHSA_FIELD_TO_CES_KEY = {
  // anteriorView
  feetTurnout:           'foot_pronation',
  feetFlattening:        'foot_pronation',
  kneeValgus:            'knee_valgus',
  kneeVarus:             'knee_varus',
  // lateralView
  excessiveForwardLean:  'excessive_forward_lean',
  lowBackArch:           'low_back_arch',
  armsFallForward:       'arms_fall_forward',
  forwardHead:           'head_protrusion',
  // top-level
  asymmetricWeightShift: 'hip_drop',
};

/**
 * Walk the OHSA wizard payload and emit a `commonCompensations`
 * array in the shape `clientIntelligenceService.analyzeCompensationTrend`
 * expects. Only fields with severity > 0 (i.e. not 'none' or missing)
 * are included.
 *
 * @param {object} ohsa — overheadSquatAssessment payload from wizard
 * @param {object} [options]
 * @param {Date|string} [options.lastDetected=now] — assessment timestamp
 * @returns {Array<{ type, frequency, avgSeverity, trend, lastDetected }>}
 */
export function extractCompensationsFromOHSA(ohsa, { lastDetected } = {}) {
  if (!ohsa || typeof ohsa !== 'object') return [];

  const detectedAt = lastDetected ? new Date(lastDetected).toISOString() : new Date().toISOString();

  // Collapse all wizard fields into a Map keyed by CES_MAP type, holding
  // the highest severity seen across the contributing fields.
  const bySeverity = new Map();

  const consider = (level, cesKey) => {
    if (!cesKey) return;
    const sev = SEVERITY_BY_LEVEL[level];
    if (!Number.isFinite(sev) || sev === 0) return;
    const prior = bySeverity.get(cesKey);
    if (prior === undefined || sev > prior) {
      bySeverity.set(cesKey, sev);
    }
  };

  if (ohsa.anteriorView && typeof ohsa.anteriorView === 'object') {
    for (const [field, level] of Object.entries(ohsa.anteriorView)) {
      consider(level, OHSA_FIELD_TO_CES_KEY[field]);
    }
  }
  if (ohsa.lateralView && typeof ohsa.lateralView === 'object') {
    for (const [field, level] of Object.entries(ohsa.lateralView)) {
      consider(level, OHSA_FIELD_TO_CES_KEY[field]);
    }
  }
  if (typeof ohsa.asymmetricWeightShift === 'string') {
    consider(ohsa.asymmetricWeightShift, OHSA_FIELD_TO_CES_KEY.asymmetricWeightShift);
  }

  return Array.from(bySeverity.entries()).map(([type, avgSeverity]) => ({
    type,
    frequency: 1,            // single-assessment input — see V3c.4 scope note
    avgSeverity,
    trend: 'stable',          // no history to compare against yet
    lastDetected: detectedAt,
  }));
}

/**
 * Upsert the user's MovementProfile.commonCompensations with the
 * compensations extracted from the latest OHSA assessment. Idempotent
 * by userId — creates a new MovementProfile row if none exists.
 *
 * Skipped silently when:
 *   - userId is null/undefined (prospect analyses without a linked user)
 *   - MovementProfile model isn't available
 *   - ohsa payload is missing/empty
 *
 * Errors are logged via the provided logger and re-thrown so callers
 * can decide whether to fail the parent transaction. Callers that
 * want fire-and-forget semantics should wrap this in their own
 * try/catch.
 *
 * @param {object} params
 * @param {number|null} params.userId
 * @param {object} params.ohsa
 * @param {Date|string} [params.lastDetected]
 * @param {object} params.MovementProfile — Sequelize model
 * @param {object} [params.logger]
 * @param {object} [params.transaction] — optional Sequelize transaction
 * @returns {Promise<{ updated: boolean, compensations: Array }>}
 */
export async function upsertMovementProfileFromOHSA({
  userId,
  ohsa,
  lastDetected,
  MovementProfile,
  logger,
  transaction,
}) {
  if (!userId) {
    return { updated: false, compensations: [], reason: 'no-userId' };
  }
  if (!MovementProfile) {
    return { updated: false, compensations: [], reason: 'no-MovementProfile-model' };
  }
  if (!ohsa) {
    return { updated: false, compensations: [], reason: 'no-ohsa-payload' };
  }

  const compensations = extractCompensationsFromOHSA(ohsa, { lastDetected });

  // Even with zero compensations detected, we DO write — empty array is
  // semantically "we assessed this client and found no movement issues",
  // which is meaningful for the workout planner (no corrective bias).
  // Distinguishes from "never assessed" (commonCompensations defaultValue
  // [] in a row that was never updated).

  const detectedAtIso = lastDetected
    ? new Date(lastDetected).toISOString()
    : new Date().toISOString();

  try {
    const [profile, created] = await MovementProfile.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        commonCompensations: compensations,
        totalAnalyses: 1,
        lastAnalysisAt: detectedAtIso,
      },
      transaction,
    });

    if (!created) {
      await profile.update(
        {
          commonCompensations: compensations,
          totalAnalyses: (profile.totalAnalyses || 0) + 1,
          lastAnalysisAt: detectedAtIso,
        },
        { transaction },
      );
    }

    return { updated: true, compensations, created };
  } catch (err) {
    logger?.warn?.(
      `[ohsaCompensationAggregator] MovementProfile upsert failed for user ${userId}: ${err.message}`,
    );
    throw err;
  }
}

export const __testing__ = { OHSA_FIELD_TO_CES_KEY, SEVERITY_BY_LEVEL };
