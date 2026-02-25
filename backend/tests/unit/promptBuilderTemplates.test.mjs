/**
 * Prompt Builder Template Section — Unit Tests
 * =============================================
 * Tests the structured NASM template prompt section and raw NASM key exclusion.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 */
import { describe, it, expect } from 'vitest';
import { buildWorkoutPrompt, buildTemplatePromptSection } from '../../services/ai/promptBuilder.mjs';
import { buildTemplateContext } from '../../services/ai/templateContextBuilder.mjs';

const SAMPLE_PAYLOAD = { goals: { primary: 'muscle_gain' }, fitness_level: 'intermediate' };

// ── buildTemplatePromptSection ──────────────────────────────────────────────

describe('buildTemplatePromptSection', () => {
  it('should return empty string for null/undefined input', () => {
    expect(buildTemplatePromptSection(null)).toBe('');
    expect(buildTemplatePromptSection(undefined)).toBe('');
  });

  it('should include OPT phase programming guidance for Phase 1', () => {
    const ctx = buildTemplateContext({ optPhase: 'stabilization_endurance' });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('NASM Protocol Guidance');
    expect(section).toContain('Stabilization Endurance');
    expect(section).toContain('Rep range: 12-20');
    expect(section).toContain('Tempo: 4/2/1');
    expect(section).toContain('Intensity: 50-70% 1RM');
    expect(section).toContain('stability ball exercises');
  });

  it('should include contraindication modifications', () => {
    const ctx = buildTemplateContext({ optPhase: 'stabilization_endurance' });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('Contraindication modifications');
    expect(section).toContain('kneeValgus');
    expect(section).toContain('Reduce range of motion');
  });

  it('should include warmup protocol', () => {
    const ctx = buildTemplateContext({ optPhase: 'stabilization_endurance' });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('Warmup protocol');
    expect(section).toContain('SMR/foam rolling');
    expect(section).toContain('core activation');
  });

  it('should include CES corrective exercises', () => {
    const ctx = buildTemplateContext({
      ohsaCompensations: ['moderate knee valgus'],
    });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('Corrective Exercise Strategy');
    expect(section).toContain('Knee Valgus');
    expect(section).toContain('Inhibit:');
    expect(section).toContain('Lengthen:');
    expect(section).toContain('Activate:');
    expect(section).toContain('Integrate:');
  });

  it('should include medical clearance warning', () => {
    const ctx = buildTemplateContext({ medicalClearanceRequired: true });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('Safety Assessment');
    expect(section).toContain('WARNING: Medical clearance required');
  });

  it('should include PAR-Q+ cleared status when no restrictions', () => {
    const ctx = buildTemplateContext({ medicalClearanceRequired: false, parqClearance: true });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('PAR-Q+ cleared');
  });

  it('should include template version in output', () => {
    const ctx = buildTemplateContext({ optPhase: 'hypertrophy' });
    const section = buildTemplatePromptSection(ctx);

    expect(section).toContain('Template registry: v4a-1.0.0');
  });

  it('should produce no PII-like field names in output', () => {
    const ctx = buildTemplateContext({
      optPhase: 'power',
      ohsaCompensations: ['minor low back arch', 'significant knee valgus'],
      medicalClearanceRequired: true,
    });
    const section = buildTemplatePromptSection(ctx);
    // Check for PII field names (not common English words)
    expect(section).not.toMatch(/\bemail["\s:]|phoneNumber|streetAddress|"ssn"|firstName|lastName|dateOfBirth|"password"/i);
  });
});

// ── Raw NASM key exclusion in buildWorkoutPrompt ────────────────────────────

describe('buildWorkoutPrompt template integration', () => {
  it('should exclude raw NASM keys when templateContext is present', () => {
    const templateContext = buildTemplateContext({ optPhase: 'hypertrophy' });
    const serverConstraints = {
      nasm: { nasmAssessmentScore: 80 },
      optPhase: 'hypertrophy',
      optPhaseConfig: { phase: 3 },
      templateContext,
      primaryGoal: 'muscle_gain',
      trainingTier: 'gold',
    };

    const prompt = buildWorkoutPrompt(SAMPLE_PAYLOAD, serverConstraints);

    // Should NOT contain raw NASM JSON keys in the constraintsBlock
    expect(prompt).not.toContain('"nasm"');
    expect(prompt).not.toContain('"optPhase"');
    expect(prompt).not.toContain('"optPhaseConfig"');
    expect(prompt).not.toContain('"templateContext"');

    // SHOULD still contain non-NASM constraint keys
    expect(prompt).toContain('"primaryGoal"');
    expect(prompt).toContain('"trainingTier"');

    // SHOULD contain the structured template section
    expect(prompt).toContain('NASM Protocol Guidance');
    expect(prompt).toContain('Hypertrophy');
  });

  it('should preserve full serverConstraints when no templateContext', () => {
    const serverConstraints = {
      nasm: { nasmAssessmentScore: 80 },
      optPhase: 'hypertrophy',
      primaryGoal: 'muscle_gain',
    };

    const prompt = buildWorkoutPrompt(SAMPLE_PAYLOAD, serverConstraints);

    // All raw keys should be present (original behavior)
    expect(prompt).toContain('"nasm"');
    expect(prompt).toContain('"optPhase"');
    expect(prompt).toContain('"primaryGoal"');

    // No template section
    expect(prompt).not.toContain('NASM Protocol Guidance');
  });

  it('should handle empty serverConstraints', () => {
    const prompt = buildWorkoutPrompt(SAMPLE_PAYLOAD, {});
    expect(prompt).toContain('Additional constraints:');
    expect(prompt).toContain('{}');
  });

  it('should handle null serverConstraints', () => {
    const prompt = buildWorkoutPrompt(SAMPLE_PAYLOAD, null);
    expect(prompt).toContain('Additional constraints:');
    expect(prompt).toContain('{}');
  });
});
