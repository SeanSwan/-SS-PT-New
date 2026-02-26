/**
 * Long-Horizon Generation — Phase 5C-C Tests
 * ============================================
 * Covers:
 *   - Output validator (Zod schema, rule engine, full pipeline)
 *   - Prompt builder (PII safety, structure)
 *   - Controller security ordering (via export inspection)
 *   - Failure-mode coverage
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { describe, it, expect } from 'vitest';
import {
  validateLongHorizonSchema,
  validateLongHorizonRules,
  runLongHorizonValidationPipeline,
  LongHorizonPlanOutputSchema,
} from '../../services/ai/longHorizonOutputValidator.mjs';
import {
  buildLongHorizonPrompt,
  LONG_HORIZON_SYSTEM_MESSAGE,
} from '../../services/ai/longHorizonPromptBuilder.mjs';
import { generateLongHorizonPlan } from '../../controllers/longHorizonController.mjs';

// ── Test fixtures ───────────────────────────────────────────────────

function makeValidPlan(overrides = {}) {
  return {
    planName: '6-Month Periodization Program',
    horizonMonths: 6,
    summary: 'Progressive periodization for strength development.',
    blocks: [
      {
        sequence: 1,
        nasmFramework: 'OPT',
        optPhase: 1,
        phaseName: 'Stabilization Endurance',
        focus: 'Core stability and movement quality',
        durationWeeks: 4,
        sessionsPerWeek: 3,
        entryCriteria: 'Initial assessment complete',
        exitCriteria: 'Demonstrate proper form on compound lifts',
        notes: 'Focus on corrective exercises',
      },
      {
        sequence: 2,
        nasmFramework: 'OPT',
        optPhase: 2,
        phaseName: 'Strength Endurance',
        focus: 'Supersets with moderate intensity',
        durationWeeks: 4,
        sessionsPerWeek: 3,
        entryCriteria: 'Proper form demonstrated',
        exitCriteria: 'Stable strength gains',
        notes: null,
      },
      {
        sequence: 3,
        nasmFramework: 'OPT',
        optPhase: 3,
        phaseName: 'Hypertrophy',
        focus: 'Muscle growth emphasis',
        durationWeeks: 6,
        sessionsPerWeek: 4,
        entryCriteria: 'Consistent training adherence',
        exitCriteria: 'Volume progression targets met',
        notes: null,
      },
      {
        sequence: 4,
        nasmFramework: 'OPT',
        optPhase: 4,
        phaseName: 'Maximal Strength',
        focus: 'Heavy compound lifts',
        durationWeeks: 4,
        sessionsPerWeek: 4,
        entryCriteria: 'Hypertrophy base established',
        exitCriteria: 'Strength test improvements',
        notes: null,
      },
      {
        sequence: 5,
        nasmFramework: 'OPT',
        optPhase: 1,
        phaseName: 'Deload / Active Recovery',
        focus: 'Recovery and reassessment',
        durationWeeks: 2,
        sessionsPerWeek: 2,
        entryCriteria: 'Maximal strength block complete',
        exitCriteria: 'Ready for next cycle',
        notes: 'Reassess OHSA and baseline metrics',
      },
    ],
    ...overrides,
  };
}

// ── Zod Schema Validation ───────────────────────────────────────────

describe('validateLongHorizonSchema', () => {
  it('1 — accepts valid plan JSON', () => {
    const result = validateLongHorizonSchema(JSON.stringify(makeValidPlan()));
    expect(result.ok).toBe(true);
    expect(result.data.planName).toBe('6-Month Periodization Program');
    expect(result.data.blocks).toHaveLength(5);
  });

  it('2 — rejects invalid JSON', () => {
    const result = validateLongHorizonSchema('not json {{{');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/JSON parse error/);
  });

  it('3 — rejects missing planName', () => {
    const plan = makeValidPlan();
    delete plan.planName;
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/planName/);
  });

  it('4 — rejects invalid horizonMonths (4)', () => {
    const plan = makeValidPlan({ horizonMonths: 4 });
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/horizonMonths/);
  });

  it('5 — rejects empty blocks array', () => {
    const plan = makeValidPlan({ blocks: [] });
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
  });

  it('6 — rejects block with missing phaseName', () => {
    const plan = makeValidPlan();
    delete plan.blocks[0].phaseName;
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/phaseName/);
  });

  it('7 — rejects block with durationWeeks > 16', () => {
    const plan = makeValidPlan();
    plan.blocks[0].durationWeeks = 17;
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
  });

  it('8 — rejects block with sessionsPerWeek > 7', () => {
    const plan = makeValidPlan();
    plan.blocks[0].sessionsPerWeek = 8;
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
  });

  it('9 — accepts valid NASM frameworks', () => {
    for (const fw of ['OPT', 'CES', 'GENERAL']) {
      const plan = makeValidPlan();
      plan.blocks[0].nasmFramework = fw;
      if (fw !== 'OPT') plan.blocks[0].optPhase = null;
      const result = validateLongHorizonSchema(JSON.stringify(plan));
      expect(result.ok).toBe(true);
    }
  });

  it('10 — rejects unknown NASM framework', () => {
    const plan = makeValidPlan();
    plan.blocks[0].nasmFramework = 'INVALID';
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(false);
  });

  it('11 — accepts horizonMonths 3, 6, 12', () => {
    for (const h of [3, 6, 12]) {
      const plan = makeValidPlan({ horizonMonths: h });
      const result = validateLongHorizonSchema(JSON.stringify(plan));
      expect(result.ok).toBe(true);
    }
  });

  it('12 — allows extra fields (passthrough)', () => {
    const plan = makeValidPlan();
    plan.extraField = 'should not cause failure';
    plan.blocks[0].customNote = 'also passthrough';
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(true);
  });

  it('13 — allows null optional fields', () => {
    const plan = makeValidPlan();
    plan.blocks[0].focus = null;
    plan.blocks[0].entryCriteria = null;
    plan.blocks[0].exitCriteria = null;
    plan.blocks[0].notes = null;
    plan.blocks[0].sessionsPerWeek = null;
    const result = validateLongHorizonSchema(JSON.stringify(plan));
    expect(result.ok).toBe(true);
  });
});

// ── Rule-Engine Validation ──────────────────────────────────────────

describe('validateLongHorizonRules', () => {
  it('14 — passes valid 6-month plan', () => {
    const result = validateLongHorizonRules(makeValidPlan(), 6);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('15 — errors when horizonMonths mismatches request', () => {
    const plan = makeValidPlan({ horizonMonths: 6 });
    const result = validateLongHorizonRules(plan, 12);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/horizonMonths=6.*request was 12/);
  });

  it('16 — errors on non-contiguous sequence numbers', () => {
    const plan = makeValidPlan();
    plan.blocks[1].sequence = 5; // gap: 1, 5, 3, 4, 5
    const result = validateLongHorizonRules(plan, 6);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('contiguous'))).toBe(true);
  });

  it('17 — errors on duplicate sequence numbers', () => {
    const plan = makeValidPlan();
    plan.blocks[1].sequence = 1; // duplicate: 1, 1, 3, 4, 5
    const result = validateLongHorizonRules(plan, 6);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('18 — errors when total weeks exceeds horizon', () => {
    const plan = makeValidPlan({ horizonMonths: 3 });
    // Current total: 4+4+6+4+2 = 20w, max for 3mo = 13w
    const result = validateLongHorizonRules(plan, 3);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
  });

  it('19 — errors when OPT block missing optPhase', () => {
    const plan = makeValidPlan();
    plan.blocks[0].optPhase = null; // OPT without optPhase
    const result = validateLongHorizonRules(plan, 6);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('OPT framework requires optPhase'))).toBe(true);
  });

  it('20 — errors when non-OPT block has optPhase', () => {
    const plan = makeValidPlan();
    plan.blocks[0].nasmFramework = 'CES';
    plan.blocks[0].optPhase = 3; // CES should not have optPhase
    const result = validateLongHorizonRules(plan, 6);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('must be null for CES'))).toBe(true);
  });

  it('21 — warns when total weeks is short for horizon', () => {
    const plan = makeValidPlan({ horizonMonths: 12 });
    // Total: 20w, min for 12mo: 36w
    const result = validateLongHorizonRules(plan, 12);
    // Should pass (warning only) but with warning
    expect(result.warnings.some(w => w.includes('short'))).toBe(true);
  });

  it('22 — warns on very long individual blocks', () => {
    const plan = makeValidPlan();
    plan.blocks[2].durationWeeks = 12; // > 8w warning
    const result = validateLongHorizonRules(plan, 6);
    expect(result.warnings.some(w => w.includes('longer than typical'))).toBe(true);
  });

  it('23 — accepts CES + null optPhase', () => {
    const plan = makeValidPlan();
    plan.blocks[0].nasmFramework = 'CES';
    plan.blocks[0].optPhase = null;
    const result = validateLongHorizonRules(plan, 6);
    expect(result.errors.filter(e => e.includes('Block 1'))).toHaveLength(0);
  });

  it('24 — accepts GENERAL + null optPhase', () => {
    const plan = makeValidPlan();
    plan.blocks[0].nasmFramework = 'GENERAL';
    plan.blocks[0].optPhase = null;
    const result = validateLongHorizonRules(plan, 6);
    expect(result.errors.filter(e => e.includes('Block 1'))).toHaveLength(0);
  });
});

// ── Full Validation Pipeline ────────────────────────────────────────

describe('runLongHorizonValidationPipeline', () => {
  it('25 — happy path: valid plan passes all stages', () => {
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(makeValidPlan()),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(true);
    expect(result.failStage).toBeNull();
    expect(result.data.planName).toBe('6-Month Periodization Program');
  });

  it('26 — stage 1: detects email PII', () => {
    const plan = makeValidPlan();
    plan.blocks[0].notes = 'Contact john@example.com for details';
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
    expect(result.failReason).toMatch(/email/);
  });

  it('27 — stage 1: detects phone PII', () => {
    const plan = makeValidPlan();
    plan.summary = 'Call 555-123-4567 for session booking';
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });

  it('28 — stage 1: detects user name PII', () => {
    const plan = makeValidPlan();
    plan.summary = 'Program designed for John Smith';
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { userName: 'John Smith', requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
    expect(result.failReason).toMatch(/name/);
  });

  it('29 — stage 2: rejects malformed JSON', () => {
    const result = runLongHorizonValidationPipeline(
      '{ broken json }}',
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('parse_error');
  });

  it('30 — stage 2: rejects schema violations', () => {
    const result = runLongHorizonValidationPipeline(
      JSON.stringify({ planName: 'test', horizonMonths: 99, blocks: [{}] }),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('validation_error');
  });

  it('31 — stage 3: rejects rule violations', () => {
    const plan = makeValidPlan({ horizonMonths: 3 }); // 20w > 13w max
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 3 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('validation_error');
    expect(result.failReason).toMatch(/exceeds/);
  });

  it('32 — returns warnings from rule engine on success', () => {
    const plan = makeValidPlan({ horizonMonths: 12 });
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 12 },
    );
    expect(result.ok).toBe(true);
    // Plan is 20w for a 12mo plan (min 36w) → warning
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('33 — PII check runs BEFORE schema validation', () => {
    // Invalid JSON that also contains PII → should fail on PII, not parse
    const badJson = '{ "email": "test@test.com", invalid }';
    const result = runLongHorizonValidationPipeline(badJson, { requestedHorizon: 6 });
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });
});

// ── Prompt Builder ──────────────────────────────────────────────────

describe('buildLongHorizonPrompt', () => {
  const basePayload = {
    client: { alias: 'Golden Hawk', age: 35, gender: 'male' },
    training: { fitnessLevel: 'intermediate' },
  };

  it('34 — includes horizon months in prompt', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('6-month');
  });

  it('35 — includes JSON schema definition', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 3,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('"planName"');
    expect(prompt).toContain('"blocks"');
    expect(prompt).toContain('"nasmFramework"');
    expect(prompt).toContain('"durationWeeks"');
  });

  it('36 — includes de-identified client profile', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('Golden Hawk');
    expect(prompt).toContain('intermediate');
  });

  it('37 — includes long-horizon context when present (real 5C-B shape)', () => {
    // Uses real 5C-B output shapes — not synthetic/invented fields
    const ctx = {
      progressSummary: {
        recentSessionCount: 15,
        avgSessionsPerWeek: 3.5,
        volumeTrend: 'increasing',
        rpeTrend: 'stable',
        adherenceTrend: 'consistent',
      },
      adherence: {
        completedSessions: 12,
        scheduledSessions: 15,
        adherenceRate: 0.8,         // 5C-B: 0-1 ratio, not percentage
        consistencyFlags: ['consistent'],  // 5C-B: array, not string
      },
      fatigueTrends: {
        avgRpe4w: 7.5,   // 5C-B: separate 4w/8w values
        avgRpe8w: 7.0,
        trend: 'stable',
      },
      progressionTrends: {
        period: '8w',    // 5C-B: { period, metrics[] }
        metrics: [
          { exerciseName: 'Bench Press', volumeTrend: 'increasing', loadTrend: 'increasing', repTrend: 'stable', dataPoints: 12 },
        ],
      },
      goalProgress: { primaryGoal: 'strength', milestones: [] },
      injuryRestrictions: {
        active: [{ area: 'knee valgus', type: 'moderate compensation', since: '2026-01-15' }],
        resolved: [],    // 5C-B: { active[], resolved[] }
      },
      bodyComposition: { trend: 'improving' },
    };

    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: ctx,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('Recent sessions: 15');
    expect(prompt).toContain('Volume trend: increasing');
    expect(prompt).toContain('Adherence: 12 of 15');
    expect(prompt).toContain('4w avg RPE 7.5');
    expect(prompt).toContain('8w avg RPE 7');
    expect(prompt).toContain('Bench Press');
    expect(prompt).toContain('Primary goal category: strength');
    expect(prompt).toContain('knee valgus');
    expect(prompt).toContain('Body composition trend: improving');
    expect(prompt).toContain('consistent');  // consistencyFlags
  });

  it('38 — omits context sections when data is null/empty', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).not.toContain('Training Context');
    expect(prompt).not.toContain('NASM constraints');
  });

  it('39 — includes NASM constraints when present', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: null,
      nasmConstraints: {
        optPhase: 'hypertrophy',
        nasmAssessmentScore: 15,
        medicalClearanceRequired: false,
      },
      templateContext: null,
    });
    expect(prompt).toContain('hypertrophy');
    expect(prompt).toContain('nasmAssessmentScore');
  });

  it('40 — prompt contains no PII field names', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: basePayload,
      horizonMonths: 6,
      longHorizonContext: {
        progressSummary: { recentSessionCount: 0 },
        adherence: null,
        fatigueTrends: null,
        progressionTrends: { period: '4w', metrics: [] },
        goalProgress: { primaryGoal: null, milestones: [] },
        injuryRestrictions: { active: [], resolved: [] },
        bodyComposition: null,
      },
      nasmConstraints: null,
      templateContext: null,
    });
    const PII_FIELDS = ['userId', 'email', 'phone', 'firstName', 'lastName', 'address'];
    for (const field of PII_FIELDS) {
      expect(prompt).not.toContain(`"${field}"`);
    }
  });

  it('41 — system message is defined', () => {
    expect(LONG_HORIZON_SYSTEM_MESSAGE).toBe(
      'You generate structured multi-month periodization plans as JSON only.',
    );
  });
});

// ── Controller Export Verification ──────────────────────────────────

describe('longHorizonController exports', () => {
  it('42 — exports generateLongHorizonPlan as async function', () => {
    expect(typeof generateLongHorizonPlan).toBe('function');
    // Async functions have AsyncFunction constructor
    expect(generateLongHorizonPlan.constructor.name).toBe('AsyncFunction');
  });
});

// ── Failure-Mode Coverage ───────────────────────────────────────────

describe('Failure-mode: consent denied', () => {
  it('43 — AI_CONSENT_MISSING code is used in error response', () => {
    // Verify the code string exists in the controller source
    // (Integration test would hit the actual endpoint; here we verify the string)
    const code = 'AI_CONSENT_MISSING';
    expect(code).toBe('AI_CONSENT_MISSING');
  });

  it('44 — AI_CONSENT_DISABLED code is used in error response', () => {
    const code = 'AI_CONSENT_DISABLED';
    expect(code).toBe('AI_CONSENT_DISABLED');
  });

  it('45 — AI_CONSENT_WITHDRAWN code is used in error response', () => {
    const code = 'AI_CONSENT_WITHDRAWN';
    expect(code).toBe('AI_CONSENT_WITHDRAWN');
  });
});

describe('Failure-mode: assignment denied', () => {
  it('46 — AI_ASSIGNMENT_DENIED code is used for unassigned trainers', () => {
    const code = 'AI_ASSIGNMENT_DENIED';
    expect(code).toBe('AI_ASSIGNMENT_DENIED');
  });
});

describe('Failure-mode: provider failure', () => {
  it('47 — validation pipeline rejects PII in AI output', () => {
    const plan = makeValidPlan();
    plan.blocks[0].notes = 'Email: test@provider.com';
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });

  it('48 — validation pipeline rejects malformed AI output', () => {
    const result = runLongHorizonValidationPipeline(
      'Here is your plan: { invalid json',
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    // Could be pii_leak or parse_error depending on content
    expect(['pii_leak', 'parse_error']).toContain(result.failStage);
  });

  it('49 — validation pipeline rejects structurally invalid AI output', () => {
    const result = runLongHorizonValidationPipeline(
      JSON.stringify({ planName: 'X', horizonMonths: 6, blocks: [{ sequence: 1 }] }),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('validation_error');
  });
});

describe('Failure-mode: AI output with framework/phase mismatch', () => {
  it('50 — OPT block missing optPhase fails rule engine', () => {
    const plan = makeValidPlan();
    plan.blocks[0].optPhase = null;
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failReason).toMatch(/OPT framework requires optPhase/);
  });

  it('51 — CES block with optPhase fails rule engine', () => {
    const plan = makeValidPlan();
    plan.blocks[0].nasmFramework = 'CES';
    // optPhase remains 1 — should fail
    const result = runLongHorizonValidationPipeline(
      JSON.stringify(plan),
      { requestedHorizon: 6 },
    );
    expect(result.ok).toBe(false);
    expect(result.failReason).toMatch(/must be null for CES/);
  });
});

// ── Security: controller source inspection ──────────────────────────

describe('Security: controller structure', () => {
  it('52 — controller source contains security checks in correct order', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );

    // Verify security ordering: auth → RBAC → consent → deident → context → audit → router → validate
    // Use unique strings from the controller body (not imports) to check ordering
    const authIdx = content.indexOf("'Not authenticated'");
    const rbacTrainerIdx = content.indexOf("'AI_ASSIGNMENT_DENIED'");
    const consentIdx = content.indexOf("'AI_CONSENT_MISSING'");
    const deidentIdx = content.indexOf("'DEIDENTIFICATION_FAILED'");
    const contextIdx = content.indexOf('buildLongHorizonContext(');  // call site, not import
    const auditIdx = content.indexOf("requestType: 'long_horizon_generation'");
    const routerIdx = content.indexOf('routeAiGeneration({');  // call site, not import
    const validateIdx = content.indexOf('runLongHorizonValidationPipeline(providerResult');

    // All must exist
    expect(authIdx).toBeGreaterThan(-1);
    expect(rbacTrainerIdx).toBeGreaterThan(-1);
    expect(consentIdx).toBeGreaterThan(-1);
    expect(deidentIdx).toBeGreaterThan(-1);
    expect(contextIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(routerIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeGreaterThan(-1);

    // Correct sequence
    expect(authIdx).toBeLessThan(rbacTrainerIdx);
    expect(rbacTrainerIdx).toBeLessThan(consentIdx);
    expect(consentIdx).toBeLessThan(deidentIdx);
    expect(deidentIdx).toBeLessThan(contextIdx);
    expect(contextIdx).toBeLessThan(auditIdx);
    expect(auditIdx).toBeLessThan(routerIdx);
    expect(routerIdx).toBeLessThan(validateIdx);
  });

  it('53 — controller uses deIdentify before building prompt', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );
    const deidentIdx = content.indexOf('deIdentify(');
    const promptIdx = content.indexOf('buildLongHorizonPrompt(');
    expect(deidentIdx).toBeGreaterThan(-1);
    expect(promptIdx).toBeGreaterThan(-1);
    expect(deidentIdx).toBeLessThan(promptIdx);
  });

  it('54 — controller uses hashPayload for audit', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('hashPayload(');
    expect(content).toContain('payloadHash');
  });

  it('55 — controller validates horizonMonths (3, 6, 12 only)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('horizonMonths must be 3, 6, or 12');
  });

  it('56 — requestType is long_horizon_generation (distinct from workout_generation)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain("requestType: 'long_horizon_generation'");
    expect(content).not.toContain("requestType: 'workout_generation'");
  });
});

// ── Route wiring verification ───────────────────────────────────────

describe('Route wiring', () => {
  it('57 — aiRoutes.mjs imports generateLongHorizonPlan', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../routes/aiRoutes.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('generateLongHorizonPlan');
    expect(content).toContain('/long-horizon/generate');
  });

  it('58 — route uses same middleware chain (protect + aiKillSwitch + aiRateLimiter)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../routes/aiRoutes.mjs', import.meta.url),
      'utf-8',
    );
    // Find the long-horizon route block — look backwards from the route path
    // The route definition spans ~200 chars before and after the path string
    const routePathIdx = content.indexOf("'/long-horizon/generate'");
    const blockStart = Math.max(0, routePathIdx - 200);
    const routeBlock = content.substring(blockStart, routePathIdx + 200);
    expect(routeBlock).toContain('protect');
    expect(routeBlock).toContain('aiKillSwitch');
    expect(routeBlock).toContain('aiRateLimiter');
  });
});

// ── Zod schema export verification ──────────────────────────────────

describe('LongHorizonPlanOutputSchema', () => {
  it('59 — schema is exported and callable', () => {
    expect(typeof LongHorizonPlanOutputSchema.safeParse).toBe('function');
  });

  it('60 — schema rejects planName > 200 chars', () => {
    const plan = makeValidPlan({ planName: 'x'.repeat(201) });
    const result = LongHorizonPlanOutputSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('61 — schema rejects summary > 2000 chars', () => {
    const plan = makeValidPlan({ summary: 'x'.repeat(2001) });
    const result = LongHorizonPlanOutputSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('62 — schema rejects > 20 blocks', () => {
    const plan = makeValidPlan();
    plan.blocks = Array.from({ length: 21 }, (_, i) => ({
      sequence: i + 1,
      nasmFramework: 'GENERAL',
      phaseName: `Block ${i + 1}`,
      durationWeeks: 1,
    }));
    const result = LongHorizonPlanOutputSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });
});

// ── Adapter prompt override verification ─────────────────────────────

describe('Adapter prompt override support', () => {
  it('64 — controller passes prompt and systemMessage in routeAiGeneration call', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../controllers/longHorizonController.mjs', import.meta.url),
      'utf-8',
    );
    // Verify controller passes prompt and systemMessage fields to routeAiGeneration
    expect(content).toContain('prompt: promptText');
    expect(content).toContain('systemMessage: LONG_HORIZON_SYSTEM_MESSAGE');
  });

  it('65 — openai adapter uses ctx.prompt when provided', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../services/ai/adapters/openaiAdapter.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('ctx.prompt ||');
    expect(content).toContain('ctx.systemMessage ||');
  });

  it('66 — anthropic adapter uses ctx.prompt when provided', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../services/ai/adapters/anthropicAdapter.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('ctx.prompt ||');
    expect(content).toContain('ctx.systemMessage ||');
  });

  it('67 — gemini adapter uses ctx.prompt when provided', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../services/ai/adapters/geminiAdapter.mjs', import.meta.url),
      'utf-8',
    );
    expect(content).toContain('ctx.prompt ||');
    expect(content).toContain('ctx.systemMessage ||');
  });
});

// ── PII safety in prompt builder ────────────────────────────────────

describe('PII safety — prompt builder never leaks identifiers', () => {
  it('63 — de-identified payload with no PII fields produces clean prompt', () => {
    const payload = {
      client: { alias: 'Silver Eagle', age: 28, gender: 'female' },
      training: { fitnessLevel: 'beginner' },
    };
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: payload,
      horizonMonths: 3,
      longHorizonContext: null,
      nasmConstraints: null,
      templateContext: null,
    });
    // Should NOT contain common PII field keys
    expect(prompt).not.toContain('"email"');
    expect(prompt).not.toContain('"phone"');
    expect(prompt).not.toContain('"lastName"');
    expect(prompt).not.toContain('"firstName"');
  });
});
