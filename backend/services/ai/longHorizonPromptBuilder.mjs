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

  // ── V3c.5: Corrective bias allowlist ───────────────────────
  // Closed-set hint: when the client has OHSA-detected compensations,
  // surface the V3b.3 corrective registry rows that match those
  // compensations and instruct the AI to include them in CES blocks
  // and Phase 1 stabilization warmups. Soft directive — the AI may
  // still choose other exercises, but ours are the validated picks.
  if (longHorizonContext?.correctiveBias?.available) {
    parts.push(buildCorrectiveBiasSection(longHorizonContext.correctiveBias), '');
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

// ── V3c.5.1 (Codex Round 1 MEDIUM): prompt-string sanitization ──
//
// Defense-in-depth on every string that gets interpolated into the
// prompt. The compensation `type` and `trend` are enum-validated by
// `sanitizeCompensation` upstream, but registry fields (exercise
// `name`, `sourceCitation`, `bodyPartCategory`) come from the
// Exercise model and could in principle contain control characters.
// This helper strips ASCII control chars, normalizes whitespace, and
// kills any backtick fences or "Ignore previous instructions"-style
// jailbreak text patterns that could subvert the surrounding prompt.

const PROMPT_INJECTION_HINTS = [
  /ignore (previous|above|prior|all) (instruction|rule)/gi,
  /disregard (previous|above|prior|all)/gi,
  /you are now/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /\bjailbreak\b/gi,
];

function safePromptString(s, fallback = '') {
  if (typeof s !== 'string') return fallback;
  let out = s;
  // V3c.5.3 (Codex Round 2 LOW): NFKC-normalize before any other
  // transform. Otherwise compatibility-equivalent characters (full-
  // width digits, ligatures, etc.) sneak past the regex filters even
  // though an LLM would still read them as the original word.
  try { out = out.normalize('NFKC'); } catch { /* malformed string — let later strips handle it */ }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  out = out.replace(/\p{Default_Ignorable_Code_Point}/gu, '');
  // Strip ASCII control characters (newlines, tabs, etc).
  out = out.replace(new RegExp(String.raw`[\x00-\x1F\x7F]`, 'g'), ' ');
  // Kill markdown code fences that could break out of prompt blocks.
  out = out.replace(/```/g, '———');
  // Neuter common prompt-injection phrases (replace with bracketed marker).
  for (const pattern of PROMPT_INJECTION_HINTS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  // Collapse whitespace runs and trim.
  out = out.replace(/\s+/g, ' ').trim();
  return out || fallback;
}

/**
 * V3c.5: Build the Corrective Allowlist section.
 *
 * Surfaces the V3b.3 NASM CES corrective exercises that match the
 * client's OHSA-detected compensations, grouped by 4-step protocol
 * (inhibit / lengthen / activate / integrate). The AI is instructed
 * to include these as the preferred picks for CES blocks and Phase 1
 * stabilization warmups.
 *
 * Why a "soft directive" (preferred-not-mandatory):
 *   - Some compensations may not have full registry coverage yet.
 *     Forcing the AI to use only allowlist names would produce empty
 *     warmups when the registry has gaps.
 *   - The AI can still propose its own mesocycle structure; this
 *     section just biases its exercise selection toward the
 *     validated, citation-backed corrective set.
 *
 * Privacy posture (rule 8): the section emits exercise data
 * (exerciseKey, name, bodyPartCategory, sourceCitation) and
 * compensation taxonomy (type, severity, frequency). Zero client
 * PII passes through this path.
 *
 * @param {Object} bias — buildCorrectiveBiasContext output
 * @returns {string}
 */
function buildCorrectiveBiasSection(bias) {
  const lines = [];
  lines.push('--- V3c.5 Corrective Allowlist (preferred picks, NASM CES-validated) ---');

  if (Array.isArray(bias.compensations) && bias.compensations.length > 0) {
    const compLines = bias.compensations.map((c) => {
      // Severity / frequency / trend are upstream-validated by
      // sanitizeCompensation in the context builder, so they are
      // safe primitives here. `type` is also enum-validated. We
      // still defensively round numerics to avoid float-formatting
      // surprises.
      const sev = `severity ${Number(c.avgSeverity) || 0}/10`;
      const freq = Number(c.frequency) > 0 ? `freq ${Number(c.frequency)}` : null;
      const trend = `trend ${safePromptString(c.trend, 'stable')}`;
      return `  - ${safePromptString(c.type, 'unknown')} (${[sev, freq, trend].filter(Boolean).join(', ')})`;
    });
    lines.push('Detected compensations:', ...compLines);
  }

  if (bias.matchedCount === 0 || !bias.allowlist) {
    lines.push(
      'Registry coverage: no V3b.3 corrective rows matched these compensations.',
      'Allowlist guidance: include CES blocks; freely select stretches and activation drills consistent with the listed patterns. When a downstream slice extends this prompt to per-exercise output, every corrective exercise will be required to cite an allowlist exerciseKey OR include outsideAllowlistJustification.',
    );
    return lines.join('\n');
  }

  const safeTags = (bias.tags || []).map((t) => safePromptString(t)).filter(Boolean).join(', ');
  lines.push(
    `Registry coverage: ${bias.matchedCount} V3b.3-validated corrective(s) matched (tags: ${safeTags}).`,
    // V3c.5.3 (Codex Round 2 honesty fix) — the long-horizon schema
    // (LongHorizonPlanOutputSchema in longHorizonOutputValidator.mjs)
    // emits MesocycleBlock objects with `notes`, NOT per-exercise
    // objects. So `exerciseKey` / `outsideAllowlistJustification`
    // CANNOT be schema-enforced at this layer — earlier "closed-set
    // contract" wording was unenforceable here. Wording is now
    // "Allowlist guidance" — prescriptive but explicitly NOT an
    // auditable contract. The schema-enforceable closed-set lives in
    // a future slice when V3c.5 bias is wired into the per-exercise
    // (single-workout) prompt path where exercises actually surface.
    'Allowlist guidance: when phase notes or CES-block focus references corrective work, prefer the allowlist below. Reference exercise names as written and cite the exerciseKey when applicable, so downstream per-day generation can resolve the recommendation against the registry.',
  );

  const renderStep = (label, rows) => {
    if (!rows || rows.length === 0) return;
    lines.push(`Step: ${label}`);
    for (const r of rows.slice(0, 8)) {
      const safeName = safePromptString(r.name, 'unknown exercise');
      const safeKey = safePromptString(r.exerciseKey, '');
      const safeCat = r.bodyPartCategory ? ` cat=${safePromptString(r.bodyPartCategory)}` : '';
      const safeCite = r.sourceCitation ? ` [${safePromptString(r.sourceCitation)}]` : '';
      lines.push(`  - ${safeName} (key=${safeKey})${safeCat}${safeCite}`);
    }
  };
  renderStep('inhibit (SMR / foam-roll work)', bias.allowlist.inhibit);
  renderStep('lengthen (stretches)', bias.allowlist.lengthen);
  renderStep('activate (corrective drills)', bias.allowlist.activate);
  renderStep('integrate (integration patterns)', bias.allowlist.integrate);

  lines.push(
    'Directive: integrate the inhibit + lengthen rows into Phase 1 stabilization warmups; integrate the activate + integrate rows as the corrective bias inside CES blocks. Allowlist alternatives are acceptable when consistent with the listed patterns; cite the rationale in the block notes.',
  );

  return lines.join('\n');
}
