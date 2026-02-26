/**
 * Long-Horizon Prompt Builder — Phase 5C-C
 * ==========================================
 * Builds provider-agnostic prompts for multi-month periodization plans.
 * Uses de-identified payload + long-horizon context (5C-B) + NASM constraints.
 *
 * All data is PII-free before reaching this builder:
 *   - deidentifiedPayload: output of deIdentify() (Phase 1)
 *   - longHorizonContext: output of buildLongHorizonContext() (5C-B)
 *   - nasmConstraints: server-derived only (Phase 3A)
 *
 * Phase 5C — Long-Horizon Planning Engine
 */

/**
 * System message for long-horizon plan generation.
 */
export const LONG_HORIZON_SYSTEM_MESSAGE =
  'You generate structured multi-month periodization plans as JSON only.';

/**
 * Build a long-horizon plan generation prompt.
 *
 * @param {Object} params
 * @param {Object} params.deidentifiedPayload - De-identified client profile
 * @param {3|6|12} params.horizonMonths - Plan duration
 * @param {Object|null} params.longHorizonContext - Output of buildLongHorizonContext()
 * @param {Object|null} params.nasmConstraints - Server-derived NASM constraints
 * @param {Object|null} params.templateContext - Output of buildTemplateContext()
 * @returns {string} The prompt text
 */
export function buildLongHorizonPrompt({
  deidentifiedPayload,
  horizonMonths,
  longHorizonContext,
  nasmConstraints,
  templateContext,
}) {
  const parts = [];

  // ── Role + schema ──────────────────────────────────────────
  parts.push(
    'You are a certified personal trainer and periodization specialist.',
    `Generate a ${horizonMonths}-month training program structured as mesocycle blocks.`,
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "planName": "string (max 200 chars)",',
    `  "horizonMonths": ${horizonMonths},`,
    '  "summary": "string (max 2000 chars)",',
    '  "blocks": [',
    '    {',
    '      "sequence": number (starting from 1),',
    '      "nasmFramework": "OPT" | "CES" | "GENERAL",',
    '      "optPhase": number (1-5, required if OPT, null otherwise),',
    '      "phaseName": "string (max 100 chars)",',
    '      "focus": "string (max 500 chars)",',
    '      "durationWeeks": number (1-16),',
    '      "sessionsPerWeek": number (1-7),',
    '      "entryCriteria": "string (max 500 chars)",',
    '      "exitCriteria": "string (max 500 chars)",',
    '      "notes": "string (max 2000 chars)"',
    '    }',
    '  ]',
    '}',
    'Do not include markdown code fences or extra commentary.',
    '',
  );

  // ── Periodization guidelines ───────────────────────────────
  parts.push(
    '--- Periodization Guidelines ---',
    'Follow NASM OPT model phases where applicable:',
    '  Phase 1: Stabilization Endurance (high reps, low intensity, balance)',
    '  Phase 2: Strength Endurance (supersets, moderate intensity)',
    '  Phase 3: Hypertrophy (moderate-to-high volume, 75-85% 1RM)',
    '  Phase 4: Maximal Strength (high intensity, low reps, 85-100% 1RM)',
    '  Phase 5: Power (explosive movements, superset strength + power)',
    'Blocks should progress logically. Include deload or transition weeks.',
    'CES framework blocks focus on corrective exercise strategy.',
    'GENERAL framework blocks are for non-OPT goals (e.g., sport-specific).',
    '',
  );

  // ── Client profile (de-identified) ─────────────────────────
  parts.push(
    'Client profile (de-identified):',
    JSON.stringify(deidentifiedPayload, null, 2),
    '',
  );

  // ── Long-horizon context (trends, adherence, fatigue) ──────
  if (longHorizonContext) {
    parts.push('--- Training Context (de-identified) ---');

    const ps = longHorizonContext.progressSummary;
    if (ps && ps.recentSessionCount > 0) {
      parts.push(
        `Recent sessions: ${ps.recentSessionCount} (${ps.avgSessionsPerWeek}/week)`,
        `Volume trend: ${ps.volumeTrend}`,
        `RPE trend: ${ps.rpeTrend}`,
        `Adherence trend: ${ps.adherenceTrend}`,
      );
    }

    // 5C-B adherence shape: { scheduledSessions, completedSessions, adherenceRate, consistencyFlags }
    const adherence = longHorizonContext.adherence;
    if (adherence) {
      const pct = Math.round((adherence.adherenceRate || 0) * 100);
      parts.push(
        `Adherence: ${adherence.completedSessions} of ${adherence.scheduledSessions} scheduled (${pct}%)`,
        `Consistency flags: ${(adherence.consistencyFlags || []).join(', ') || 'none'}`,
      );
    }

    // 5C-B fatigue shape: { avgRpe4w, avgRpe8w, trend }
    const fatigue = longHorizonContext.fatigueTrends;
    if (fatigue && (fatigue.avgRpe4w != null || fatigue.avgRpe8w != null)) {
      const parts4w = fatigue.avgRpe4w != null ? `4w avg RPE ${fatigue.avgRpe4w}` : '';
      const parts8w = fatigue.avgRpe8w != null ? `8w avg RPE ${fatigue.avgRpe8w}` : '';
      parts.push(
        `Fatigue: ${[parts4w, parts8w].filter(Boolean).join(', ')}, trend ${fatigue.trend}`,
      );
    }

    // 5C-B progressionTrends shape: { period, metrics: [{ exerciseName, volumeTrend, loadTrend, ... }] }
    const trends = longHorizonContext.progressionTrends;
    if (trends && trends.metrics && trends.metrics.length > 0) {
      parts.push(`Top exercise trends (${trends.period}):`);
      for (const t of trends.metrics.slice(0, 5)) {
        parts.push(`  ${t.exerciseName}: volume ${t.volumeTrend}, load ${t.loadTrend}`);
      }
    }

    const goals = longHorizonContext.goalProgress;
    if (goals && goals.primaryGoal) {
      parts.push(`Primary goal category: ${goals.primaryGoal}`);
      if (goals.milestones && goals.milestones.length > 0) {
        const achieved = goals.milestones.filter(m => m.achieved).length;
        parts.push(`Goal milestones: ${achieved}/${goals.milestones.length} achieved`);
      }
    }

    // 5C-B injuryRestrictions shape: { active: [{ area, type, since }], resolved: [] }
    const injuries = longHorizonContext.injuryRestrictions;
    if (injuries && injuries.active && injuries.active.length > 0) {
      const compensationLabels = injuries.active.map(i => `${i.type}: ${i.area}`);
      parts.push(`Movement compensations: ${compensationLabels.join(', ')}`);
    }

    const body = longHorizonContext.bodyComposition;
    if (body) {
      parts.push(`Body composition trend: ${body.trend}`);
    }

    parts.push('');
  }

  // ── NASM constraints (server-derived) ──────────────────────
  if (nasmConstraints) {
    const constraintsForPrompt = { ...nasmConstraints };
    // Remove templateContext to avoid duplication with structured section
    delete constraintsForPrompt.templateContext;
    if (Object.keys(constraintsForPrompt).length > 0) {
      parts.push(
        'NASM constraints (server-derived):',
        JSON.stringify(constraintsForPrompt, null, 2),
        '',
      );
    }
  }

  // ── Structured template guidance ───────────────────────────
  if (templateContext) {
    parts.push(buildTemplateSectionForLongHorizon(templateContext), '');
  }

  return parts.join('\n');
}

/**
 * Build template guidance section for long-horizon plans.
 * Adapted from promptBuilder.mjs buildTemplatePromptSection().
 *
 * @param {Object} templateContext
 * @returns {string}
 */
function buildTemplateSectionForLongHorizon(templateContext) {
  if (!templateContext) return '';

  const lines = [];
  lines.push('--- Current NASM Assessment Status ---');

  const prog = templateContext.programmingTemplate;
  if (prog) {
    lines.push(`Current phase: ${prog.phaseName} (Phase ${prog.phase})`);
    lines.push('Use this as the starting point for the first mesocycle block.');
    lines.push('Progress through subsequent OPT phases in later blocks as appropriate.');
  }

  const assess = templateContext.assessmentStatus;
  if (assess) {
    if (assess.medicalClearanceRequired) {
      lines.push('WARNING: Medical clearance required. Begin with Phase 1 stabilization.');
    }
    if (!assess.parqClearance) {
      lines.push('WARNING: PAR-Q+ incomplete. Use conservative Phase 1 programming.');
    }
  }

  const corr = templateContext.correctiveTemplate;
  if (corr && Array.isArray(corr.relevantCompensations) && corr.relevantCompensations.length > 0) {
    lines.push('Corrective needs: include CES blocks or integrate corrective work in early phases.');
  }

  return lines.join('\n');
}
