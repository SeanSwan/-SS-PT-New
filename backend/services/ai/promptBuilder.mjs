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
