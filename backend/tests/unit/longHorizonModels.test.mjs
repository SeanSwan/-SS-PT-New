/**
 * longHorizonModels — Phase 5C-A Model Tests
 * ============================================
 * Tests for LongTermProgramPlan and ProgramMesocycleBlock models.
 *
 * Covers:
 *   - Model definition (fields, defaults, table names)
 *   - Validation rules (horizonMonths, planName, durationWeeks, optPhase)
 *   - Index definitions
 *   - Association stubs
 *   - Migration shape consistency
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { describe, it, expect } from 'vitest';
import LongTermProgramPlan from '../../models/LongTermProgramPlan.mjs';
import ProgramMesocycleBlock from '../../models/ProgramMesocycleBlock.mjs';

// ── LongTermProgramPlan ───────────────────────────────────────────

describe('LongTermProgramPlan model definition', () => {
  it('1 — has correct table name', () => {
    expect(LongTermProgramPlan.getTableName()).toBe('long_term_program_plans');
  });

  it('2 — has correct model name', () => {
    expect(LongTermProgramPlan.name).toBe('LongTermProgramPlan');
  });

  it('3 — defines all required attributes', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    const requiredFields = [
      'id', 'userId', 'horizonMonths', 'status', 'planName',
      'summary', 'goalProfile', 'sourceType', 'aiGenerationRequestId',
      'createdByUserId', 'approvedByUserId', 'approvedAt',
      'startsOn', 'endsOn', 'metadata', 'createdAt', 'updatedAt',
    ];
    for (const field of requiredFields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('4 — userId references Users table', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.userId.references).toEqual({ model: 'Users', key: 'id' });
  });

  it('5 — createdByUserId references Users table', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.createdByUserId.references).toEqual({ model: 'Users', key: 'id' });
  });

  it('6 — approvedByUserId references Users table', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.approvedByUserId.references).toEqual({ model: 'Users', key: 'id' });
  });

  it('7 — aiGenerationRequestId references ai_interaction_logs table', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.aiGenerationRequestId.references).toEqual({
      model: 'ai_interaction_logs',
      key: 'id',
    });
  });

  it('8 — status defaults to draft', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.status.defaultValue).toBe('draft');
  });

  it('9 — sourceType defaults to manual', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.sourceType.defaultValue).toBe('manual');
  });

  it('10 — horizonMonths validates isIn [3, 6, 12]', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.horizonMonths.validate).toEqual({ isIn: [[3, 6, 12]] });
  });

  it('11 — planName validates notEmpty and len [1, 200]', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.planName.validate.notEmpty).toBe(true);
    expect(attrs.planName.validate.len).toEqual([1, 200]);
  });

  it('12 — has userId+status index', () => {
    const indexes = LongTermProgramPlan.options.indexes;
    const found = indexes.find(i => i.name === 'ltpp_userId_status');
    expect(found).toBeDefined();
    expect(found.fields).toEqual(['userId', 'status']);
  });

  it('13 — has createdByUserId index', () => {
    const indexes = LongTermProgramPlan.options.indexes;
    const found = indexes.find(i => i.name === 'ltpp_createdByUserId');
    expect(found).toBeDefined();
    expect(found.fields).toEqual(['createdByUserId']);
  });

  it('14 — has timestamps enabled', () => {
    expect(LongTermProgramPlan.options.timestamps).toBe(true);
  });

  it('15 — has associate function defined', () => {
    expect(typeof LongTermProgramPlan.associate).toBe('function');
  });

  it('16 — nullable fields allow null', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.summary.allowNull).toBe(true);
    expect(attrs.aiGenerationRequestId.allowNull).toBe(true);
    expect(attrs.approvedByUserId.allowNull).toBe(true);
    expect(attrs.approvedAt.allowNull).toBe(true);
    expect(attrs.startsOn.allowNull).toBe(true);
    expect(attrs.endsOn.allowNull).toBe(true);
    expect(attrs.metadata.allowNull).toBe(true);
    expect(attrs.createdByUserId.allowNull).toBe(true);
  });

  it('17 — required fields do not allow null', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.userId.allowNull).toBe(false);
    expect(attrs.horizonMonths.allowNull).toBe(false);
    expect(attrs.status.allowNull).toBe(false);
    expect(attrs.planName.allowNull).toBe(false);
    expect(attrs.goalProfile.allowNull).toBe(false);
    expect(attrs.sourceType.allowNull).toBe(false);
  });
});

// ── ProgramMesocycleBlock ─────────────────────────────────────────

describe('ProgramMesocycleBlock model definition', () => {
  it('18 — has correct table name', () => {
    expect(ProgramMesocycleBlock.getTableName()).toBe('program_mesocycle_blocks');
  });

  it('19 — has correct model name', () => {
    expect(ProgramMesocycleBlock.name).toBe('ProgramMesocycleBlock');
  });

  it('20 — defines all required attributes', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    const requiredFields = [
      'id', 'planId', 'sequence', 'nasmFramework', 'optPhase',
      'phaseName', 'focus', 'durationWeeks', 'sessionsPerWeek',
      'entryCriteria', 'exitCriteria', 'constraintsSnapshot', 'notes',
      'createdAt', 'updatedAt',
    ];
    for (const field of requiredFields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('21 — planId references long_term_program_plans table', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.planId.references).toEqual({
      model: 'long_term_program_plans',
      key: 'id',
    });
  });

  it('22 — optPhase validates min 1, max 5, plus cross-field validator', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.optPhase.validate.min).toBe(1);
    expect(attrs.optPhase.validate.max).toBe(5);
    expect(typeof attrs.optPhase.validate.optPhaseMatchesFramework).toBe('function');
  });

  it('23 — durationWeeks validates min 1, max 16', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.durationWeeks.validate.min).toBe(1);
    expect(attrs.durationWeeks.validate.max).toBe(16);
  });

  it('24 — sessionsPerWeek validates min 1, max 7', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.sessionsPerWeek.validate.min).toBe(1);
    expect(attrs.sessionsPerWeek.validate.max).toBe(7);
  });

  it('25 — phaseName validates notEmpty and len [1, 100]', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.phaseName.validate.notEmpty).toBe(true);
    expect(attrs.phaseName.validate.len).toEqual([1, 100]);
  });

  it('26 — has unique planId+sequence index', () => {
    const indexes = ProgramMesocycleBlock.options.indexes;
    const found = indexes.find(i => i.name === 'pmb_planId_sequence_unique');
    expect(found).toBeDefined();
    expect(found.unique).toBe(true);
    expect(found.fields).toEqual(['planId', 'sequence']);
  });

  it('27 — has timestamps enabled', () => {
    expect(ProgramMesocycleBlock.options.timestamps).toBe(true);
  });

  it('28 — has associate function defined', () => {
    expect(typeof ProgramMesocycleBlock.associate).toBe('function');
  });

  it('29 — required fields do not allow null', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.planId.allowNull).toBe(false);
    expect(attrs.sequence.allowNull).toBe(false);
    expect(attrs.nasmFramework.allowNull).toBe(false);
    expect(attrs.phaseName.allowNull).toBe(false);
    expect(attrs.durationWeeks.allowNull).toBe(false);
  });

  it('30 — nullable fields allow null', () => {
    const attrs = ProgramMesocycleBlock.getAttributes();
    expect(attrs.optPhase.allowNull).toBe(true);
    expect(attrs.focus.allowNull).toBe(true);
    expect(attrs.sessionsPerWeek.allowNull).toBe(true);
    expect(attrs.entryCriteria.allowNull).toBe(true);
    expect(attrs.exitCriteria.allowNull).toBe(true);
    expect(attrs.constraintsSnapshot.allowNull).toBe(true);
    expect(attrs.notes.allowNull).toBe(true);
  });
});

// ── Migration consistency ─────────────────────────────────────────

describe('Migration consistency', () => {
  it('31 — migration file exists and exports up/down', async () => {
    // Dynamic import of .cjs migration
    const migration = await import(
      '../../migrations/20260226000001-create-long-term-program-tables.cjs'
    );
    expect(typeof migration.default.up).toBe('function');
    expect(typeof migration.default.down).toBe('function');
  });
});

// ── Cross-field validation (runtime) ──────────────────────────────

describe('ProgramMesocycleBlock — nasmFramework/optPhase cross-field validation', () => {
  const validator =
    ProgramMesocycleBlock.getAttributes().optPhase.validate.optPhaseMatchesFramework;

  it('34 — rejects optPhase when nasmFramework is CES', () => {
    const ctx = { nasmFramework: 'CES' };
    expect(() => validator.call(ctx, 3)).toThrow('optPhase must be null when nasmFramework is not OPT');
  });

  it('35 — rejects optPhase when nasmFramework is GENERAL', () => {
    const ctx = { nasmFramework: 'GENERAL' };
    expect(() => validator.call(ctx, 1)).toThrow('optPhase must be null when nasmFramework is not OPT');
  });

  it('36 — rejects null optPhase when nasmFramework is OPT', () => {
    const ctx = { nasmFramework: 'OPT' };
    expect(() => validator.call(ctx, null)).toThrow('optPhase is required when nasmFramework is OPT');
  });

  it('37 — accepts valid OPT + optPhase combination', () => {
    const ctx = { nasmFramework: 'OPT' };
    expect(() => validator.call(ctx, 3)).not.toThrow();
  });

  it('38 — accepts CES + null optPhase', () => {
    const ctx = { nasmFramework: 'CES' };
    expect(() => validator.call(ctx, null)).not.toThrow();
  });

  it('39 — accepts GENERAL + null optPhase', () => {
    const ctx = { nasmFramework: 'GENERAL' };
    expect(() => validator.call(ctx, null)).not.toThrow();
  });
});

// ── CASCADE behavior (QA fix verification) ───────────────────────

describe('LongTermProgramPlan — cascade behavior', () => {
  it('40 — createdByUserId allows null (SET NULL on user deletion)', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.createdByUserId.allowNull).toBe(true);
  });

  it('41 — approvedByUserId allows null (SET NULL on user deletion)', () => {
    const attrs = LongTermProgramPlan.getAttributes();
    expect(attrs.approvedByUserId.allowNull).toBe(true);
  });
});

// ── Migration — ENUM cleanup in rollback ─────────────────────────

describe('Migration — rollback drops ENUM types', () => {
  it('42 — down() function body references DROP TYPE for all ENUMs', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../migrations/20260226000001-create-long-term-program-tables.cjs', import.meta.url),
      'utf-8'
    );
    expect(content).toMatch(/DROP TYPE IF EXISTS.*enum_long_term_program_plans_status/);
    expect(content).toMatch(/DROP TYPE IF EXISTS.*enum_long_term_program_plans_sourceType/);
    expect(content).toMatch(/DROP TYPE IF EXISTS.*enum_program_mesocycle_blocks_nasmFramework/);
  });
});

// ── Security: no raw SQL, parameterized only ──────────────────────

describe('Security — parameterized queries only', () => {
  it('43 — LongTermProgramPlan model file contains no raw SQL', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../models/LongTermProgramPlan.mjs', import.meta.url),
      'utf-8'
    );
    expect(content).not.toMatch(/sequelize\.query\s*\(/);
    expect(content).not.toMatch(/queryInterface/);
  });

  it('44 — ProgramMesocycleBlock model file contains no raw SQL', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../../models/ProgramMesocycleBlock.mjs', import.meta.url),
      'utf-8'
    );
    expect(content).not.toMatch(/sequelize\.query\s*\(/);
    expect(content).not.toMatch(/queryInterface/);
  });
});
