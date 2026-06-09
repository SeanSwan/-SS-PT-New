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
    nutritionContext,
    healthHistory,
    movementAssessments,
    equipmentContext,
    clientSource,
    sourcePolicy,
  } = inputs;

  const missingInputs = [];
  const dataSources = [];

  // ── Cap input arrays to prevent excessive CPU/memory usage ──
  const cappedPainEntries = Array.isArray(painEntries) ? painEntries.slice(0, 100) : painEntries;
  const cappedMovementAssessments = Array.isArray(movementAssessments) ? movementAssessments.slice(0, 10) : movementAssessments;

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
  if (Array.isArray(cappedPainEntries) && cappedPainEntries.length > 0) {
    painConstraints = buildPainConstraints(cappedPainEntries);
    dataSources.push('pain_injury_tracking');
  }

  // ── Goal Progress Matching ──────────────────────────────────
  let goalProgress = null;
  if (clientProfile?.goals && measurementTrends) {
    goalProgress = buildGoalProgress(clientProfile.goals, measurementTrends, progressSummary);
    if (goalProgress) dataSources.push('goal_progress');
  }

  // ── Nutrition Context ──────────────────────────────────────
  let nutritionSummary = null;
  if (nutritionContext && typeof nutritionContext === 'object') {
    nutritionSummary = nutritionContext;
    dataSources.push('nutrition_history');
  }

  // ── Health History (Waiver/PAR-Q) ─────────────────────────
  let healthHistorySummary = null;
  if (healthHistory && typeof healthHistory === 'object') {
    healthHistorySummary = healthHistory;
    dataSources.push('health_history');
  }

  // ── Movement Assessments ──────────────────────────────────
  let movementContext = null;
  if (Array.isArray(cappedMovementAssessments) && cappedMovementAssessments.length > 0) {
    movementContext = {
      assessmentCount: cappedMovementAssessments.length,
      latestAssessment: cappedMovementAssessments[0],
      assessments: cappedMovementAssessments.slice(0, 5), // Last 5
    };
    dataSources.push('movement_analysis');
  }

  // ── Equipment Context (names only — per AI Village consensus) ──
  let equipmentSummary = null;
  if (equipmentContext && typeof equipmentContext === 'object' && Object.keys(equipmentContext).length > 0) {
    equipmentSummary = equipmentContext;
    dataSources.push('equipment_profiles');
  }

  // ── Client Source Context ─────────────────────────────────
  let clientSourceContext = null;
  const safeSourcePolicy = sourcePolicy && typeof sourcePolicy === 'object' ? sourcePolicy : null;
  const resolvedClientSource = safeSourcePolicy?.clientSource || clientSource;
  if (resolvedClientSource) {
    clientSourceContext = {
      source: resolvedClientSource,
      ...(safeSourcePolicy || {}),
      clientSource: safeSourcePolicy?.clientSource || resolvedClientSource,
    };
    dataSources.push('client_source');
    if (safeSourcePolicy) dataSources.push('source_policy');
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
    goalProgress,
    exerciseRecommendations,
    safetyConstraints,
    nutritionSummary,
    healthHistorySummary,
    movementContext,
    equipmentSummary,
    clientSourceContext,
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

/**
 * Build goal progress matching from client goals and measurement trends.
 * Compares stated goals against actual measurement data to determine
 * how close the client is to achieving their objectives.
 * All PII-free — only goal type, current value, target, and progress %.
 *
 * @param {Object|Array|string} goals — Client's stated goals
 * @param {Object} measurementTrends — Current measurement data
 * @param {Object|null} progressSummary — Workout progress context
 * @returns {Object} Goal progress analysis
 */
function buildGoalProgress(goals, measurementTrends, progressSummary) {
  const goalAnalysis = {
    goals: [],
    overallProgressPct: 0,
    recommendations: [],
  };

  // Parse goals (could be string, array, or object)
  const goalList = [];
  if (typeof goals === 'string') {
    goalList.push(goals.toLowerCase());
  } else if (Array.isArray(goals)) {
    goalList.push(...goals.map(g => (typeof g === 'string' ? g : g.goal || g.name || '').toLowerCase()));
  } else if (typeof goals === 'object' && goals !== null) {
    if (goals.primary) goalList.push(goals.primary.toLowerCase());
    if (goals.secondary) goalList.push(goals.secondary.toLowerCase());
    if (goals.description) goalList.push(goals.description.toLowerCase());
  }

  if (goalList.length === 0) return null;

  // Detect goal types and match to data
  for (const goal of goalList) {
    if (!goal) continue;

    // Weight loss / fat loss goals
    if (goal.includes('weight loss') || goal.includes('lose weight') || goal.includes('fat loss') || goal.includes('lean')) {
      const entry = { type: 'body_composition', description: goal };
      if (measurementTrends.currentWeight != null) {
        entry.currentWeight = measurementTrends.currentWeight;
        entry.weightTrend = measurementTrends.weightTrend;
      }
      if (measurementTrends.currentBodyFat != null) {
        entry.currentBodyFat = measurementTrends.currentBodyFat;
        entry.bodyFatTrend = measurementTrends.bodyFatTrend;
      }
      if (measurementTrends.weightTrend === 'decreasing') {
        entry.status = 'on_track';
        goalAnalysis.recommendations.push('Weight trending down — maintain current caloric deficit and training volume.');
      } else if (measurementTrends.weightTrend === 'increasing') {
        entry.status = 'off_track';
        goalAnalysis.recommendations.push('Weight trending up despite fat loss goal — review nutrition plan and increase cardio/NEAT.');
      } else {
        entry.status = 'plateau';
        goalAnalysis.recommendations.push('Weight stable — consider periodization change or nutrition adjustment to break plateau.');
      }
      goalAnalysis.goals.push(entry);
    }

    // Muscle gain / strength goals
    if (goal.includes('muscle') || goal.includes('strength') || goal.includes('hypertrophy') || goal.includes('build')) {
      const entry = { type: 'strength_hypertrophy', description: goal };
      if (progressSummary) {
        entry.volumeTrend = progressSummary.volumeTrend;
        entry.avgIntensity = progressSummary.avgIntensity;
        // Check progression curves if available
        if (progressSummary.exerciseProgressionCurves?.length > 0) {
          const progressing = progressSummary.exerciseProgressionCurves.filter(c => c.trend === 'progressing').length;
          const total = progressSummary.exerciseProgressionCurves.length;
          entry.exercisesProgressing = `${progressing}/${total}`;
        }
      }
      if (measurementTrends.weightTrend === 'increasing' && measurementTrends.bodyFatTrend !== 'increasing') {
        entry.status = 'on_track';
        goalAnalysis.recommendations.push('Gaining weight without fat increase — lean muscle gain on track.');
      } else if (progressSummary?.volumeTrend === 'increasing') {
        entry.status = 'on_track';
        goalAnalysis.recommendations.push('Training volume increasing — progressive overload working. Continue current program.');
      } else {
        entry.status = 'needs_attention';
        goalAnalysis.recommendations.push('Volume not increasing — consider progressive overload adjustments or deload then reload.');
      }
      goalAnalysis.goals.push(entry);
    }

    // Endurance / cardio goals
    if (goal.includes('endurance') || goal.includes('cardio') || goal.includes('stamina') || goal.includes('run')) {
      const entry = { type: 'endurance', description: goal };
      if (progressSummary) {
        entry.avgDurationMin = progressSummary.avgDurationMin;
        entry.adherenceTrend = progressSummary.adherenceTrend;
        entry.avgSessionsPerWeek = progressSummary.avgSessionsPerWeek;
      }
      if (progressSummary?.adherenceTrend === 'consistent' && progressSummary?.avgSessionsPerWeek >= 3) {
        entry.status = 'on_track';
        goalAnalysis.recommendations.push('Training consistently — endurance improving. Consider adding interval protocols.');
      } else {
        entry.status = 'needs_attention';
        goalAnalysis.recommendations.push('Training frequency below 3x/week — increase session frequency for endurance gains.');
      }
      goalAnalysis.goals.push(entry);
    }

    // General fitness / health
    if (goal.includes('health') || goal.includes('fitness') || goal.includes('general') || goal.includes('tone') || goal.includes('wellness')) {
      const entry = { type: 'general_fitness', description: goal };
      if (progressSummary) {
        entry.adherenceTrend = progressSummary.adherenceTrend;
        entry.avgSessionsPerWeek = progressSummary.avgSessionsPerWeek;
      }
      entry.status = progressSummary?.adherenceTrend === 'consistent' ? 'on_track' : 'needs_attention';
      goalAnalysis.goals.push(entry);
    }
  }

  // Calculate overall progress
  if (goalAnalysis.goals.length > 0) {
    const onTrack = goalAnalysis.goals.filter(g => g.status === 'on_track').length;
    goalAnalysis.overallProgressPct = Math.round((onTrack / goalAnalysis.goals.length) * 100);
  }

  return goalAnalysis.goals.length > 0 ? goalAnalysis : null;
}
