/**
 * AI Prompt Builder
 * =================
 * Builds provider-agnostic workout generation prompts from de-identified payloads.
 * Extracted from aiWorkoutController.mjs to be shared across all provider adapters.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 * Phase 4A — Template prompt section (structured NASM guidance replaces raw NASM JSON)
 */

/**
 * System message for workout generation.
 */
export const WORKOUT_SYSTEM_MESSAGE = 'You generate structured workout plans as JSON only.';

/**
 * Keys to exclude from the raw JSON constraintsBlock when templateContext is present.
 * These are replaced by the structured template prompt section to prevent duplication.
 */
const NASM_RAW_KEYS = new Set(['templateContext', 'nasm', 'optPhase', 'optPhaseConfig']);

/**
 * Build a workout generation prompt from a de-identified payload and server constraints.
 * All providers receive the same prompt content — only the message envelope differs.
 *
 * When templateContext is present in serverConstraints, raw NASM keys are excluded
 * from the JSON constraintsBlock and replaced with a structured template section.
 *
 * @param {Object} deidentifiedPayload - Output of Phase 1 deIdentify()
 * @param {Object} serverConstraints   - NASM constraints (server-derived only)
 * @returns {string} The prompt text
 */
export function buildWorkoutPrompt(deidentifiedPayload, serverConstraints) {
  const templateContext = serverConstraints?.templateContext ?? null;

  // When templateContext exists, exclude raw NASM keys to prevent duplication
  let constraintsBlock;
  if (templateContext && serverConstraints) {
    const filtered = {};
    for (const [key, value] of Object.entries(serverConstraints)) {
      if (!NASM_RAW_KEYS.has(key)) {
        filtered[key] = value;
      }
    }
    constraintsBlock = Object.keys(filtered).length > 0
      ? JSON.stringify(filtered, null, 2)
      : '{}';
  } else {
    constraintsBlock = serverConstraints && Object.keys(serverConstraints).length > 0
      ? JSON.stringify(serverConstraints, null, 2)
      : '{}';
  }

  const parts = [
    'You are a certified personal trainer generating a structured workout plan.',
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "planName": "string",',
    '  "durationWeeks": number,',
    '  "summary": "string",',
    '  "days": [',
    '    {',
    '      "dayNumber": number,',
    '      "name": "string",',
    '      "focus": "string",',
    '      "dayType": "training|active_recovery|rest|assessment|specialization",',
    '      "estimatedDuration": number,',
    '      "exercises": [',
    '        {',
    '          "name": "string",',
    '          "setScheme": "string",',
    '          "repGoal": "string",',
    '          "restPeriod": number,',
    '          "tempo": "string",',
    '          "intensityGuideline": "string",',
    '          "notes": "string",',
    '          "isOptional": boolean',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    'Do not include markdown code fences or extra commentary.',
    '',
    'Client master prompt JSON:',
    JSON.stringify(deidentifiedPayload, null, 2),
    '',
    'Additional constraints:',
    constraintsBlock,
  ];

  // Append structured NASM template section when available
  if (templateContext) {
    parts.push('');
    parts.push(buildTemplatePromptSection(templateContext));
  }

  // Append measurement trends section when available
  const measurementTrends = serverConstraints?.measurementTrends;
  if (measurementTrends) {
    parts.push('');
    parts.push(buildMeasurementTrendsSection(measurementTrends));
  }

  // Append pain/injury constraints section when available
  const painConstraints = serverConstraints?.painConstraints;
  if (painConstraints) {
    parts.push('');
    parts.push(buildPainConstraintsSection(painConstraints));
  }

  return parts.join('\n');
}

/**
 * Build the structured NASM template prompt section.
 * Replaces raw NASM JSON with formatted, AI-readable guidance.
 *
 * @param {Object} templateContext - Output of buildTemplateContext()
 * @returns {string}
 */
export function buildTemplatePromptSection(templateContext) {
  if (!templateContext) return '';

  const lines = [];
  lines.push('--- NASM Protocol Guidance ---');

  if (templateContext.registryVersion) {
    lines.push(`Template registry: v${templateContext.registryVersion}`);
  }

  // Programming template section
  const prog = templateContext.programmingTemplate;
  if (prog) {
    lines.push('');
    lines.push(`Programming: ${prog.phaseName} (${prog.id}, Phase ${prog.phase})`);
    if (prog.programming) {
      const p = prog.programming;
      lines.push(`  Rep range: ${p.repRange}`);
      lines.push(`  Sets: ${p.sets}`);
      lines.push(`  Tempo: ${p.tempo}`);
      lines.push(`  Rest: ${p.restPeriod}`);
      lines.push(`  Intensity: ${p.intensity}`);
      if (Array.isArray(p.exerciseSelection) && p.exerciseSelection.length > 0) {
        lines.push(`  Exercise focus: ${p.exerciseSelection.join(', ')}`);
      }
    }
    if (Array.isArray(prog.contraindications) && prog.contraindications.length > 0) {
      lines.push('  Contraindication modifications:');
      for (const c of prog.contraindications) {
        lines.push(`    - ${c.compensation}: ${c.modification}`);
      }
    }
    if (prog.warmupProtocol) {
      const w = prog.warmupProtocol;
      const active = [];
      if (w.smr) active.push('SMR/foam rolling');
      if (w.staticStretching) active.push('static stretching');
      if (w.dynamicStretching) active.push('dynamic stretching');
      if (w.coreActivation) active.push('core activation');
      if (w.balanceWork) active.push('balance work');
      if (active.length > 0) {
        lines.push(`  Warmup protocol: ${active.join(', ')}`);
      }
    }
  }

  // Corrective template section
  const corr = templateContext.correctiveTemplate;
  if (corr && Array.isArray(corr.relevantCompensations) && corr.relevantCompensations.length > 0) {
    lines.push('');
    lines.push(`Corrective Exercise Strategy (${corr.id}):`);
    for (const comp of corr.relevantCompensations) {
      lines.push(`  Compensation: ${comp.compensationLabel}`);
      if (Array.isArray(comp.inhibit)) {
        lines.push(`    Inhibit: ${comp.inhibit.map(e => e.exercise).join('; ')}`);
      }
      if (Array.isArray(comp.lengthen)) {
        lines.push(`    Lengthen: ${comp.lengthen.map(e => e.exercise).join('; ')}`);
      }
      if (Array.isArray(comp.activate)) {
        lines.push(`    Activate: ${comp.activate.map(e => e.exercise).join('; ')}`);
      }
      if (Array.isArray(comp.integrate)) {
        lines.push(`    Integrate: ${comp.integrate.map(e => e.exercise).join('; ')}`);
      }
    }
  }

  // Assessment status section
  const assess = templateContext.assessmentStatus;
  if (assess) {
    lines.push('');
    lines.push('Safety Assessment:');
    if (assess.medicalClearanceRequired) {
      lines.push('  WARNING: Medical clearance required. Limit intensity and avoid high-impact exercises.');
    }
    if (!assess.parqClearance) {
      lines.push('  WARNING: PAR-Q+ screening incomplete or flagged. Use conservative programming.');
    }
    if (!assess.medicalClearanceRequired && assess.parqClearance) {
      lines.push('  PAR-Q+ cleared. No medical restrictions flagged.');
    }
  }

  return lines.join('\n');
}

/**
 * Build the measurement trends section for the AI prompt.
 *
 * @param {Object} trends — Output of buildMeasurementContext()
 * @returns {string}
 */
export function buildMeasurementTrendsSection(trends) {
  if (!trends) return '';

  const lines = ['--- Client Measurement Trends ---'];

  if (trends.currentWeight != null) {
    const unit = trends.weightUnit || 'lbs';
    lines.push(`Weight: ${trends.currentWeight} ${unit}${trends.weightTrend ? ` (trend: ${trends.weightTrend})` : ''}`);
  }
  if (trends.currentBodyFat != null) {
    lines.push(`Body Fat: ${trends.currentBodyFat}%${trends.bodyFatTrend ? ` (trend: ${trends.bodyFatTrend})` : ''}`);
  }
  if (trends.currentWaist != null) {
    const unit = trends.waistUnit || 'inches';
    lines.push(`Waist: ${trends.currentWaist} ${unit}${trends.waistTrend ? ` (trend: ${trends.waistTrend})` : ''}`);
  }
  if (trends.daysSinceLastMeasurement != null) {
    lines.push(`Days since last measurement: ${trends.daysSinceLastMeasurement}`);
  }
  if (trends.measurementCount != null) {
    lines.push(`Total measurements on record: ${trends.measurementCount}`);
  }

  lines.push('Consider these trends when selecting exercises and intensity.');

  return lines.join('\n');
}

/**
 * Build the pain/injury constraints section for the AI prompt.
 * Incorporates NASM CES 4-Phase Corrective Strategy and
 * Squat University (Dr. Aaron Horschig) 3-Step Fix Protocol.
 *
 * @param {Object} painConstraints — Output of buildPainConstraints()
 * @returns {string}
 */
export function buildPainConstraintsSection(painConstraints) {
  if (!painConstraints || painConstraints.totalActive === 0) return '';

  const lines = [];
  lines.push('--- Client Pain & Injury Constraints (SAFETY CRITICAL) ---');
  lines.push('Protocol: NASM CES 4-Phase (Inhibit → Lengthen → Activate → Integrate)');
  lines.push('         + Squat University 3-Step Fix (Mobility → Stability → Integration)');
  lines.push('');

  // Severe areas (7-10): HARD AVOID
  if (painConstraints.severeAreas.length > 0) {
    lines.push('SEVERE INJURIES (7-10/10) — HARD RESTRICTIONS:');
    for (const entry of painConstraints.severeAreas) {
      lines.push(`  • ${formatBodyRegion(entry.bodyRegion)} (${entry.side}): severity ${entry.painLevel}/10, type: ${entry.painType || 'unspecified'}`);
      if (entry.description) {
        lines.push(`    Client reports: "${entry.description}"`);
      }
      if (entry.aiNotes) {
        lines.push(`    Trainer guidance: "${entry.aiNotes}"`);
      }
      if (entry.aggravatingMovements) {
        lines.push(`    → HARD RESTRICTION: AVOID ${entry.aggravatingMovements}`);
      }
      if (entry.relievingFactors) {
        lines.push(`    → Relieving: ${entry.relievingFactors}`);
      }
      lines.push(`    → Squat Uni: Check joints ABOVE and BELOW ${formatBodyRegion(entry.bodyRegion)} for mobility restrictions`);
      lines.push(`    → Do NOT load this area. Include corrective warm-up only.`);
    }
    lines.push('');
  }

  // Moderate areas (4-6): MODIFY
  if (painConstraints.moderateAreas.length > 0) {
    lines.push('MODERATE PAIN (4-6/10) — MODIFY & REDUCE LOAD:');
    for (const entry of painConstraints.moderateAreas) {
      lines.push(`  • ${formatBodyRegion(entry.bodyRegion)} (${entry.side}): severity ${entry.painLevel}/10, type: ${entry.painType || 'unspecified'}`);
      if (entry.description) {
        lines.push(`    Client reports: "${entry.description}"`);
      }
      if (entry.aiNotes) {
        lines.push(`    Trainer guidance: "${entry.aiNotes}"`);
      }
      if (entry.aggravatingMovements) {
        lines.push(`    → MODIFY: Reduce load for ${entry.aggravatingMovements}. Suggest alternatives.`);
      }
      lines.push(`    → Include 1 corrective exercise per session for this area.`);
    }
    lines.push('');
  }

  // Mild areas (1-3): INCLUDE WITH CAUTION
  if (painConstraints.mildAreas.length > 0) {
    lines.push('MILD DISCOMFORT (1-3/10) — INCLUDE WITH CORRECTIVE WARM-UP:');
    for (const entry of painConstraints.mildAreas) {
      lines.push(`  • ${formatBodyRegion(entry.bodyRegion)} (${entry.side}): severity ${entry.painLevel}/10, type: ${entry.painType || 'unspecified'}`);
      if (entry.aiNotes) {
        lines.push(`    Trainer guidance: "${entry.aiNotes}"`);
      }
      lines.push(`    → Include corrective warm-up. Monitor during session.`);
    }
    lines.push('');
  }

  // Postural syndromes
  if (painConstraints.posturalSyndromes.length > 0) {
    lines.push('POSTURAL SYNDROMES DETECTED — CES 4-Phase Corrective Strategy:');
    for (const syndrome of painConstraints.posturalSyndromes) {
      if (syndrome === 'upper_crossed') {
        lines.push('  Upper Crossed Syndrome (UCS):');
        lines.push('    Tight/overactive: upper traps, levator scapulae, pectorals, SCM');
        lines.push('    Weak/underactive: deep cervical flexors, mid/lower traps, serratus anterior, rhomboids');
        lines.push('    INHIBIT: Foam roll upper traps, pecs (30-60s each)');
        lines.push('    LENGTHEN: Static stretch upper traps, levator scapulae, pecs (30s holds)');
        lines.push('    ACTIVATE: Chin tucks, prone Y-raises, band pull-aparts, serratus punches');
        lines.push('    INTEGRATE: Wall slides, cable face pulls during warm-up');
        lines.push('    Squat Uni: Thoracic extension mobility drills, wall angel test for progress');
      } else if (syndrome === 'lower_crossed') {
        lines.push('  Lower Crossed Syndrome (LCS):');
        lines.push('    Tight/overactive: hip flexors (psoas, rectus femoris), lumbar erectors');
        lines.push('    Weak/underactive: abdominals (TVA, obliques), gluteus maximus & medius');
        lines.push('    INHIBIT: Foam roll hip flexors, TFL, lumbar erectors (30-60s each)');
        lines.push('    LENGTHEN: Half-kneeling hip flexor stretch, prone quad stretch (30s holds)');
        lines.push('    ACTIVATE: Glute bridges, side-lying clams, dead bugs, bird dogs');
        lines.push('    INTEGRATE: Single-leg RDL, cable pull-throughs during warm-up');
        lines.push('    Squat Uni: Hip hinge pattern drill, tripod foot stability check');
      }
    }
    lines.push('');
  }

  // General guidelines
  lines.push('PAIN-AWARE PROGRAMMING GUIDELINES:');
  lines.push('  • Severity 7-10: AVOID all direct loading. Corrective warm-up only.');
  lines.push('  • Severity 4-6: MODIFY with reduced load (50-70% normal). Suggest alternatives.');
  lines.push('  • Severity 1-3: INCLUDE with caution. Add corrective warm-up exercises.');
  lines.push('  • Always check joints ABOVE and BELOW the pain site for restrictions (Squat Uni principle).');
  lines.push('  • Include 1-2 corrective exercises per session for each active injury area.');
  lines.push('  • Apply CES 4-Phase for each injury: Inhibit → Lengthen → Activate → Integrate.');
  lines.push('  • If both UCS and LCS present: prioritize core stabilization and postural correction.');

  return lines.join('\n');
}

/**
 * Format a body region ID into a human-readable label.
 * e.g., "left_shoulder" → "Left Shoulder", "lower_back_left" → "Lower Back (Left)"
 */
function formatBodyRegion(region) {
  if (!region) return 'Unknown';
  return region
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
