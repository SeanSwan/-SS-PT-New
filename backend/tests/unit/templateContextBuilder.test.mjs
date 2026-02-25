/**
 * Template Context Builder — Unit Tests
 * ======================================
 * Tests template resolution from nasmConstraints, multi-template provenance,
 * and privacy regression (no PII in output).
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 */
import { describe, it, expect } from 'vitest';
import { buildTemplateContext } from '../../services/ai/templateContextBuilder.mjs';
import { REGISTRY_VERSION } from '../../services/ai/nasmTemplateRegistry.mjs';

// ── Null / Empty Input ──────────────────────────────────────────────────────

describe('buildTemplateContext', () => {
  describe('null / empty input', () => {
    it('should return null for null constraints', () => {
      expect(buildTemplateContext(null)).toBeNull();
    });

    it('should return null for undefined constraints', () => {
      expect(buildTemplateContext(undefined)).toBeNull();
    });

    it('should return null for empty object (no relevant fields)', () => {
      expect(buildTemplateContext({})).toBeNull();
    });

    it('should return null for non-object input', () => {
      expect(buildTemplateContext('string')).toBeNull();
      expect(buildTemplateContext(42)).toBeNull();
    });
  });

  // ── OPT Template Resolution ─────────────────────────────────────────────

  describe('OPT programming template resolution', () => {
    it('should resolve stabilization_endurance to OPT Phase 1', () => {
      const ctx = buildTemplateContext({ optPhase: 'stabilization_endurance' });
      expect(ctx).not.toBeNull();
      expect(ctx.primaryTemplateId).toBe('opt-phase-1-stabilization');
      expect(ctx.programmingTemplate).not.toBeNull();
      expect(ctx.programmingTemplate.phase).toBe(1);
      expect(ctx.programmingTemplate.phaseName).toBe('Stabilization Endurance');
      expect(ctx.programmingTemplate.programming).toBeTruthy();
      expect(ctx.programmingTemplate.contraindications).toBeTruthy();
      expect(ctx.programmingTemplate.warmupProtocol).toBeTruthy();
    });

    it('should resolve hypertrophy to OPT Phase 3', () => {
      const ctx = buildTemplateContext({ optPhase: 'hypertrophy' });
      expect(ctx.primaryTemplateId).toBe('opt-phase-3-hypertrophy');
      expect(ctx.programmingTemplate.phase).toBe(3);
    });

    it('should resolve power to OPT Phase 5', () => {
      const ctx = buildTemplateContext({ optPhase: 'power' });
      expect(ctx.primaryTemplateId).toBe('opt-phase-5-power');
      expect(ctx.programmingTemplate.phase).toBe(5);
    });

    it('should return null for unknown optPhase key', () => {
      expect(buildTemplateContext({ optPhase: 'nonexistent' })).toBeNull();
    });

    it('should include templateRefs with programming role', () => {
      const ctx = buildTemplateContext({ optPhase: 'strength_endurance' });
      expect(ctx.templateRefs).toHaveLength(1);
      expect(ctx.templateRefs[0]).toEqual({
        id: 'opt-phase-2-strength-endurance',
        templateVersion: '1.0.0',
        schemaVersion: '1.0.0',
        role: 'programming',
      });
    });

    it('should include registryVersion in output', () => {
      const ctx = buildTemplateContext({ optPhase: 'hypertrophy' });
      expect(ctx.registryVersion).toBe(REGISTRY_VERSION);
    });
  });

  // ── CES Corrective Template Resolution ──────────────────────────────────

  describe('CES corrective template resolution', () => {
    it('should resolve CES template when compensations present', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['moderate knee valgus'],
      });
      expect(ctx).not.toBeNull();
      expect(ctx.correctiveTemplate).not.toBeNull();
      expect(ctx.correctiveTemplate.id).toBe('ces-corrective-strategy');
      expect(ctx.correctiveTemplate.relevantCompensations).toHaveLength(1);
      expect(ctx.correctiveTemplate.relevantCompensations[0].compensationKey).toBe('kneeValgus');
    });

    it('should filter to only relevant compensations', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['minor knee valgus', 'significant forward head'],
      });
      expect(ctx.correctiveTemplate.relevantCompensations).toHaveLength(2);
      const keys = ctx.correctiveTemplate.relevantCompensations.map(c => c.compensationKey);
      expect(keys).toContain('kneeValgus');
      expect(keys).toContain('forwardHead');
    });

    it('should not resolve CES template for empty compensations', () => {
      const ctx = buildTemplateContext({ ohsaCompensations: [] });
      expect(ctx).toBeNull();
    });

    it('should include corrective role in templateRefs', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['minor low back arch'],
      });
      const correctiveRef = ctx.templateRefs.find(r => r.role === 'corrective');
      expect(correctiveRef).toBeTruthy();
      expect(correctiveRef.id).toBe('ces-corrective-strategy');
    });

    it('should include severityScoring in correctiveTemplate', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['moderate feet turnout'],
      });
      expect(ctx.correctiveTemplate.severityScoring).toEqual({
        none: 100, minor: 70, significant: 40,
      });
    });
  });

  // ── PAR-Q+ Assessment Status ────────────────────────────────────────────

  describe('PAR-Q+ assessment status', () => {
    it('should resolve assessment status when medicalClearanceRequired is set', () => {
      const ctx = buildTemplateContext({ medicalClearanceRequired: true });
      expect(ctx).not.toBeNull();
      expect(ctx.assessmentStatus).toEqual({
        parqComplete: true,
        medicalClearanceRequired: true,
        parqClearance: true,
      });
    });

    it('should resolve assessment status when parqClearance is set', () => {
      const ctx = buildTemplateContext({ parqClearance: false });
      expect(ctx).not.toBeNull();
      expect(ctx.assessmentStatus).toEqual({
        parqComplete: true,
        medicalClearanceRequired: false,
        parqClearance: false,
      });
    });

    it('should include assessment role in templateRefs', () => {
      const ctx = buildTemplateContext({ medicalClearanceRequired: false });
      const ref = ctx.templateRefs.find(r => r.role === 'assessment');
      expect(ref).toBeTruthy();
      expect(ref.id).toBe('parq-plus-screening');
    });
  });

  // ── Multi-Template Provenance ───────────────────────────────────────────

  describe('multi-template provenance', () => {
    it('should resolve OPT + CES + PAR-Q+ when all data present', () => {
      const ctx = buildTemplateContext({
        optPhase: 'maximal_strength',
        ohsaCompensations: ['moderate knee valgus'],
        medicalClearanceRequired: false,
        parqClearance: true,
      });

      expect(ctx.templateRefs).toHaveLength(3);
      const roles = ctx.templateRefs.map(r => r.role);
      expect(roles).toContain('programming');
      expect(roles).toContain('corrective');
      expect(roles).toContain('assessment');

      expect(ctx.primaryTemplateId).toBe('opt-phase-4-maximal-strength');
      expect(ctx.programmingTemplate).not.toBeNull();
      expect(ctx.correctiveTemplate).not.toBeNull();
      expect(ctx.assessmentStatus).not.toBeNull();
    });

    it('should set primaryTemplateId to OPT template when present', () => {
      const ctx = buildTemplateContext({
        optPhase: 'hypertrophy',
        ohsaCompensations: ['minor forward head'],
      });
      expect(ctx.primaryTemplateId).toBe('opt-phase-3-hypertrophy');
    });

    it('should set primaryTemplateId to first resolved template when no OPT', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['moderate knee valgus'],
      });
      expect(ctx.primaryTemplateId).toBe('ces-corrective-strategy');
    });
  });

  // ── Privacy Regression ────────────────────────────────────────────────────

  describe('privacy regression', () => {
    // Match PII field names and identifiers, not common English words used as verbs
    const PII_PATTERNS = /\bemail["\s:]|phoneNumber|streetAddress|"ssn"|firstName|lastName|dateOfBirth|"password"|name@|@gmail|@yahoo/i;

    it('should produce no PII in context output for OPT template', () => {
      const ctx = buildTemplateContext({ optPhase: 'stabilization_endurance' });
      const json = JSON.stringify(ctx);
      expect(json).not.toMatch(PII_PATTERNS);
    });

    it('should produce no PII in context output for CES template', () => {
      const ctx = buildTemplateContext({
        ohsaCompensations: ['moderate knee valgus', 'minor forward head'],
      });
      const json = JSON.stringify(ctx);
      expect(json).not.toMatch(PII_PATTERNS);
    });

    it('should produce no PII in context output for full multi-template', () => {
      const ctx = buildTemplateContext({
        optPhase: 'power',
        ohsaCompensations: ['significant low back arch'],
        medicalClearanceRequired: true,
        parqClearance: false,
      });
      const json = JSON.stringify(ctx);
      expect(json).not.toMatch(PII_PATTERNS);
    });

    it('should not include raw questionnaire answers in assessmentStatus', () => {
      const ctx = buildTemplateContext({
        medicalClearanceRequired: true,
        parqClearance: false,
        // These simulated raw fields should NOT appear in output
      });
      const json = JSON.stringify(ctx);
      expect(json).not.toContain('heartCondition');
      expect(json).not.toContain('chestPainActivity');
      expect(json).not.toContain('questionText');
    });

    it('should not leak user-specific assessment scores into template context', () => {
      const ctx = buildTemplateContext({
        optPhase: 'hypertrophy',
        nasmAssessmentScore: 82,  // user-specific
        ohsaCompensations: [],
      });
      // nasmAssessmentScore is user data, should NOT be in templateContext
      const json = JSON.stringify(ctx);
      expect(json).not.toContain('82');
      expect(json).not.toContain('nasmAssessmentScore');
    });
  });
});
