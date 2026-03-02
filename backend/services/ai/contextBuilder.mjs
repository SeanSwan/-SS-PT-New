/**
 * contextBuilder.mjs
 * ─────────────────────────────────────────────────────────────
 * Unified AI context builder for the Smart Workout Logger pipeline.
 *
 * Merges:
 *   - De-identified client profile (from deIdentificationService)
 *   - NASM constraints & OPT phase (from controller)
 *   - Template context (from templateContextBuilder)
 *   - Progress context (from progressContextBuilder)
 *   - 1RM estimates & load recommendations (from oneRepMax)
 *   - Pain/injury constraints (from ClientPainEntry records)
 *
 * Produces:
 *   - UnifiedContext: single object for prompt building
 *   - Explainability: coach-readable rationale for decisions
 *   - Safety constraints: hard limits on intensity/exercises
 *   - Pain constraints: injury-aware movement restrictions (NASM CES + Squat University)
 *
 * Phase 5A — Smart Workout Logger MVP Coach Copilot
 * Phase 12 — Pain/Injury Tracking (NASM CES + Squat University)
 */
import { estimate1RM, recommendLoad } from './oneRepMax.mjs';

// ─── OPT Phase number lookup ─────────────────────────────────
const OPT_PHASE_NUMBER = {
  stabilization_endurance: 1,
  strength_endurance: 2,
  hypertrophy: 3,
  maximal_strength: 4,
  power: 5,
};

/**
 * Build a unified generation context from all available data sources.
 *
 * @param {Object} inputs
 * @param {Object|null}  inputs.deIdentifiedPayload — Output of deIdentify()
 * @param {Object|null}  inputs.nasmConstraints     — Output of buildNasmConstraints()
 * @param {Object|null}  inputs.templateContext      — Output of buildTemplateContext()
 * @param {Object|null}  inputs.progressContext      — Output of buildProgressContext()
 * @param {number}       [inputs.userId]             — For internal routing only (NOT included in output)
 * @param {string}       [inputs.userName]           — For internal routing only (NOT included in output)
 * @returns {UnifiedContext}
 */
export function buildUnifiedContext(inputs = {}) {
  const {
    deIdentifiedPayload,
    nasmConstraints,
    templateContext,
    progressContext,
    measurementContext,
    painEntries,
  } = inputs;

  const missingInputs = [];
  const dataSources = [];

  // ── Client Profile ──────────────────────────────────────────
  let clientProfile = null;
  if (deIdentifiedPayload && typeof deIdentifiedPayload === 'object') {
    clientProfile = {
      alias: deIdentifiedPayload.client?.alias || 'Client',
      age: deIdentifiedPayload.client?.age || null,
      gender: deIdentifiedPayload.client?.gender || null,
      goals: deIdentifiedPayload.client?.goals || null,
      training: deIdentifiedPayload.training || null,
      measurements: deIdentifiedPayload.measurements || null,
    };
    dataSources.push('client_profile');
  } else {
    missingInputs.push('client_profile');
  }

  // ── NASM Guidance ───────────────────────────────────────────
  let nasmGuidance = null;
  if (nasmConstraints && typeof nasmConstraints === 'object') {
    nasmGuidance = {
      optPhase: nasmConstraints.optPhase || null,
      optPhaseConfig: nasmConstraints.optPhaseConfig || null,
      nasmAssessmentScore: nasmConstraints.nasmAssessmentScore ?? null,
      parqClearance: nasmConstraints.parqClearance ?? null,
      medicalClearanceRequired: nasmConstraints.medicalClearanceRequired ?? false,
      primaryGoal: nasmConstraints.primaryGoal || null,
      ohsaCompensations: nasmConstraints.ohsaCompensations || [],
      posturalDeviations: nasmConstraints.posturalDeviations || [],
    };
    dataSources.push('nasm_baseline');
  } else {
    missingInputs.push('nasm_baseline');
  }

  // ── Template Guidance ───────────────────────────────────────
  let templateGuidance = null;
  if (templateContext && typeof templateContext === 'object') {
    templateGuidance = templateContext;
    dataSources.push('template_registry');
  }

  // ── Progress Summary ────────────────────────────────────────
  let progressSummary = null;
  if (progressContext && typeof progressContext === 'object' && progressContext.recentSessionCount > 0) {
    progressSummary = progressContext;
    dataSources.push('workout_history');
  } else {
    missingInputs.push('workout_history');
  }

  // ── Measurement Trends ────────────────────────────────────────
  let measurementTrends = null;
  if (measurementContext && typeof measurementContext === 'object') {
    measurementTrends = measurementContext;
    dataSources.push('body_measurements');
  }

  // ── Pain & Injury Constraints (NASM CES + Squat University) ──
  let painConstraints = null;
  if (Array.isArray(painEntries) && painEntries.length > 0) {
    painConstraints = buildPainConstraints(painEntries);
    dataSources.push('pain_injury_tracking');
  }

  // ── Exercise Recommendations (1RM + load) ───────────────────
  const exerciseRecommendations = buildExerciseRecommendations(
    progressContext,
    nasmConstraints,
  );

  // ── Safety Constraints ──────────────────────────────────────
  const safetyConstraints = buildSafetyConstraints(nasmConstraints, painConstraints);

  // ── Explainability ──────────────────────────────────────────
  const explainability = buildExplainability({
    nasmConstraints,
    templateContext,
    progressContext,
    painConstraints,
    missingInputs,
    dataSources,
  });

  // ── Generation Mode ─────────────────────────────────────────
  const generationMode = determineGenerationMode({
    hasProfile: !!clientProfile,
    hasNasm: !!nasmGuidance,
    hasTemplate: !!templateGuidance,
    hasProgress: !!progressSummary,
  });

  // ── Generation Readiness ────────────────────────────────────
  const generationReady = !!clientProfile;

  return {
    generationReady,
    generationMode,
    missingInputs,
    clientProfile,
    nasmGuidance,
    templateGuidance,
    progressSummary,
    measurementTrends,
    painConstraints,
    exerciseRecommendations,
    safetyConstraints,
    explainability,
  };
}

// ─── Internal Helpers ─────────────────────────────────────────

/**
 * Build per-exercise 1RM estimates and load recommendations.
 */
function buildExerciseRecommendations(progressContext, nasmConstraints) {
  if (!progressContext?.exerciseHistory || !Array.isArray(progressContext.exerciseHistory)) {
    return [];
  }

  const optPhaseKey = nasmConstraints?.optPhase || null;
  const phaseNumber = optPhaseKey ? (OPT_PHASE_NUMBER[optPhaseKey] || null) : null;

  return progressContext.exerciseHistory.map(ex => {
    const oneRM = estimate1RM(ex.bestWeight, ex.bestReps);
    const loadRec = oneRM && phaseNumber ? recommendLoad(oneRM, phaseNumber) : null;

    return {
      exerciseName: ex.exerciseName,
      totalSets: ex.totalSets,
      bestWeight: ex.bestWeight,
      bestReps: ex.bestReps,
      avgRpe: ex.avgRpe,
      estimated1RM: oneRM,
      loadRecommendation: loadRec,
    };
  });
}

/**
 * Build safety constraints from NASM data + pain/injury data.
 */
function buildSafetyConstraints(nasmConstraints, painConstraints) {
  const medClear = nasmConstraints?.medicalClearanceRequired ?? false;
  const movementRestrictions = [...(nasmConstraints?.ohsaCompensations || [])];

  // Merge pain-based movement restrictions into safety constraints
  if (painConstraints) {
    for (const entry of painConstraints.severeAreas) {
      if (entry.aggravatingMovements) {
        for (const mv of entry.aggravatingMovements.split(',')) {
          const trimmed = mv.trim();
          if (trimmed && !movementRestrictions.includes(trimmed)) {
            movementRestrictions.push(`AVOID: ${trimmed} (pain severity ${entry.painLevel}/10 in ${entry.bodyRegion})`);
          }
        }
      }
    }
    for (const entry of painConstraints.moderateAreas) {
      if (entry.aggravatingMovements) {
        for (const mv of entry.aggravatingMovements.split(',')) {
          const trimmed = mv.trim();
          if (trimmed && !movementRestrictions.includes(trimmed)) {
            movementRestrictions.push(`MODIFY: ${trimmed} (pain severity ${entry.painLevel}/10 in ${entry.bodyRegion})`);
          }
        }
      }
    }
  }

  // Severe pain areas reduce max intensity
  const hasSeverePain = painConstraints?.severeAreas?.length > 0;
  let maxIntensityPct = 100;
  if (medClear) maxIntensityPct = 70;
  else if (hasSeverePain) maxIntensityPct = 80;

  return {
    medicalClearanceRequired: medClear,
    maxIntensityPct,
    movementRestrictions,
    painRestrictionCount: painConstraints
      ? painConstraints.severeAreas.length + painConstraints.moderateAreas.length
      : 0,
  };
}

/**
 * Build structured pain constraints from ClientPainEntry records.
 * Categorizes entries by severity and extracts postural syndromes.
 *
 * @param {Object[]} painEntries — Array of ClientPainEntry instances (plain or Sequelize)
 * @returns {Object} Categorized pain constraints
 */
function buildPainConstraints(painEntries) {
  const entries = painEntries.map(e => {
    const plain = typeof e.get === 'function' ? e.get({ plain: true }) : e;
    return plain;
  });

  const severeAreas = [];    // painLevel 7-10
  const moderateAreas = [];  // painLevel 4-6
  const mildAreas = [];      // painLevel 1-3

  const posturalSyndromes = new Set();

  for (const entry of entries) {
    const level = entry.painLevel || 0;
    const summary = {
      bodyRegion: entry.bodyRegion,
      side: entry.side,
      painLevel: level,
      painType: entry.painType,
      description: entry.description || null,
      aggravatingMovements: entry.aggravatingMovements || null,
      relievingFactors: entry.relievingFactors || null,
      aiNotes: entry.aiNotes || null,
      posturalSyndrome: entry.posturalSyndrome || 'none',
      onsetDate: entry.onsetDate || null,
    };

    if (level >= 7) {
      severeAreas.push(summary);
    } else if (level >= 4) {
      moderateAreas.push(summary);
    } else {
      mildAreas.push(summary);
    }

    if (entry.posturalSyndrome && entry.posturalSyndrome !== 'none') {
      posturalSyndromes.add(entry.posturalSyndrome);
    }
  }

  return {
    totalActive: entries.length,
    severeAreas,
    moderateAreas,
    mildAreas,
    posturalSyndromes: [...posturalSyndromes],
    hasSevere: severeAreas.length > 0,
    hasModerate: moderateAreas.length > 0,
  };
}

/**
 * Build explainability metadata for coach review.
 */
function buildExplainability({ nasmConstraints, templateContext, progressContext, painConstraints, missingInputs, dataSources }) {
  const explainability = {
    dataSources: [...dataSources],
    phaseRationale: null,
    safetyFlags: [],
    progressFlags: [],
    dataQuality: null,
  };

  // Phase rationale
  if (nasmConstraints?.optPhase) {
    const score = nasmConstraints.nasmAssessmentScore;
    explainability.phaseRationale = score != null
      ? `OPT phase "${nasmConstraints.optPhase}" selected based on NASM assessment score ${score} and primary goal "${nasmConstraints.primaryGoal || 'general_fitness'}".`
      : `OPT phase "${nasmConstraints.optPhase}" selected based on primary goal "${nasmConstraints.primaryGoal || 'general_fitness'}".`;
  }

  // Safety flags
  if (nasmConstraints?.medicalClearanceRequired) {
    explainability.safetyFlags.push(
      'Medical clearance required — intensity capped at 70% 1RM, avoid high-impact exercises.'
    );
  }
  if (nasmConstraints?.parqClearance === false) {
    explainability.safetyFlags.push(
      'PAR-Q+ not cleared — use conservative programming.'
    );
  }
  if (nasmConstraints?.ohsaCompensations?.length > 0) {
    explainability.safetyFlags.push(
      `Movement compensations detected: ${nasmConstraints.ohsaCompensations.join(', ')}. Corrective exercises included.`
    );
  }

  // Pain/injury flags
  if (painConstraints) {
    if (painConstraints.hasSevere) {
      const regions = painConstraints.severeAreas.map(a => `${a.bodyRegion} (${a.painLevel}/10)`).join(', ');
      explainability.safetyFlags.push(
        `SEVERE PAIN: ${regions} — exercises targeting these areas AVOIDED. NASM CES corrective protocol applied.`
      );
    }
    if (painConstraints.hasModerate) {
      const regions = painConstraints.moderateAreas.map(a => `${a.bodyRegion} (${a.painLevel}/10)`).join(', ');
      explainability.safetyFlags.push(
        `Moderate pain: ${regions} — exercises MODIFIED with reduced load and alternatives.`
      );
    }
    if (painConstraints.posturalSyndromes.length > 0) {
      const labels = painConstraints.posturalSyndromes.map(s =>
        s === 'upper_crossed' ? 'Upper Crossed Syndrome' : 'Lower Crossed Syndrome'
      );
      explainability.safetyFlags.push(
        `Postural syndrome detected: ${labels.join(', ')}. CES 4-phase corrective exercises included in warm-up.`
      );
    }
  }

  // Progress flags
  if (progressContext?.warnings?.length > 0) {
    explainability.progressFlags = [...progressContext.warnings];
  }
  if (progressContext?.rpeTrend === 'increasing') {
    if (!explainability.progressFlags.some(f => f.includes('RPE'))) {
      explainability.progressFlags.push('RPE trending upward — monitor for overtraining.');
    }
  }
  if (progressContext?.adherenceTrend === 'declining') {
    explainability.progressFlags.push('Adherence declining — consider reducing volume to improve consistency.');
  }

  // Data quality
  const missing = missingInputs || [];
  if (missing.includes('workout_history') && missing.includes('nasm_baseline')) {
    explainability.dataQuality = 'Limited data: no workout history and no NASM baseline. Generation will use client profile only.';
  } else if (missing.includes('workout_history')) {
    explainability.dataQuality = 'Partial data: no workout history available. Recommendations based on NASM baseline only.';
  } else if (missing.includes('nasm_baseline')) {
    explainability.dataQuality = 'Partial data: no NASM baseline. OPT phase and safety constraints not applied.';
  } else if (missing.includes('client_profile')) {
    explainability.dataQuality = 'Critical: no client profile available. Generation not possible.';
  } else {
    explainability.dataQuality = 'Full data available from all sources.';
  }

  return explainability;
}

/**
 * Determine generation mode based on available data.
 */
function determineGenerationMode({ hasProfile, hasNasm, hasTemplate, hasProgress }) {
  if (!hasProfile) return 'unavailable';
  if (hasTemplate && hasProgress) return 'full';
  if (hasTemplate) return 'template_guided';
  if (hasProgress) return 'progress_aware';
  return 'basic';
}
