/**
 * Phase 16 (2026-04-16) — aiDataWriteService null-honest daily-form writer
 * =========================================================================
 * Behavioral test: calls `processAIDataUpdates` directly with a minimal
 * `daily_workout_form` payload that omits rating fields, and asserts the
 * serialized `formData` blob that would be written to the DB persists
 * nulls (via key omission) rather than seeded phantoms.
 *
 * Strategy: mock the `sequelize.query` at the service boundary to
 * capture the INSERT parameters, then inspect the `formData` JSON
 * string for the "no phantom keys" contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Mock logger so we don't spam stdout during the test.
// ─────────────────────────────────────────────────────────────
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeFakeSequelize(captureRef) {
  return {
    query: vi.fn().mockImplementation(async (sql, opts) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO daily_workout_forms')) {
        captureRef.formDataJson = opts?.replacements?.formData ?? null;
      }
      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT' },
  };
}

function baseUpdate() {
  return {
    type: 'daily_workout_form',
    data: {
      exercises: [
        {
          exerciseName: 'Bench Press',
          sets: 3,
          reps: 10,
          weight: 135,
          // Deliberately NO rpe, formRating, or overallIntensity.
          tempo: '2-0-2',
        },
      ],
      // Deliberately NO overallIntensity.
      sessionNotes: 'Solid session',
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('Phase 16 — aiDataWriteService daily-form writer truthfulness', () => {
  let capture;

  beforeEach(() => {
    capture = { formDataJson: null };
  });

  it('omits overallIntensity when AI input does not supply it', async () => {
    const sequelize = makeFakeSequelize(capture);
    // Signature: processAIDataUpdates(targetUserId, updates, performedBy, sequelize)
    await processAIDataUpdates(1, [baseUpdate()], 2, sequelize);

    expect(capture.formDataJson).toBeTruthy();
    const parsed = JSON.parse(capture.formDataJson);
    // The key should be absent from the serialized formData — the
    // writer must not emit a phantom neutral 5.
    expect('overallIntensity' in parsed).toBe(false);
  });

  it('omits set.rpe when AI input does not supply it', async () => {
    const sequelize = makeFakeSequelize(capture);
    // Signature: processAIDataUpdates(targetUserId, updates, performedBy, sequelize)
    await processAIDataUpdates(1, [baseUpdate()], 2, sequelize);
    const parsed = JSON.parse(capture.formDataJson);
    const firstSet = parsed.exercises[0].sets[0];
    expect('rpe' in firstSet).toBe(false);
  });

  it('omits exercise.formRating when AI input does not supply it', async () => {
    const sequelize = makeFakeSequelize(capture);
    // Signature: processAIDataUpdates(targetUserId, updates, performedBy, sequelize)
    await processAIDataUpdates(1, [baseUpdate()], 2, sequelize);
    const parsed = JSON.parse(capture.formDataJson);
    expect('formRating' in parsed.exercises[0]).toBe(false);
  });

  it('PRESERVES overallIntensity when AI input explicitly supplies it', async () => {
    const sequelize = makeFakeSequelize(capture);
    const update = baseUpdate();
    update.data.overallIntensity = 7;
    await processAIDataUpdates(1, [update], 2, sequelize);
    const parsed = JSON.parse(capture.formDataJson);
    expect(parsed.overallIntensity).toBe(7);
  });

  it('PRESERVES set.rpe when AI input supplies a valid rating', async () => {
    const sequelize = makeFakeSequelize(capture);
    const update = baseUpdate();
    update.data.exercises[0].rpe = 8;
    await processAIDataUpdates(1, [update], 2, sequelize);
    const parsed = JSON.parse(capture.formDataJson);
    expect(parsed.exercises[0].sets[0].rpe).toBe(8);
  });

  it('ANTI-REGRESSION: does NOT substitute 5/3 phantoms for missing ratings', async () => {
    const sequelize = makeFakeSequelize(capture);
    // Signature: processAIDataUpdates(targetUserId, updates, performedBy, sequelize)
    await processAIDataUpdates(1, [baseUpdate()], 2, sequelize);
    const parsed = JSON.parse(capture.formDataJson);
    // Neither the serialized blob nor any exercise/set inside should
    // contain a value matching the pre-Phase-16 phantom defaults.
    const blob = JSON.stringify(parsed);
    expect(blob).not.toMatch(/"overallIntensity"\s*:\s*5/);
    expect(blob).not.toMatch(/"formRating"\s*:\s*3/);
    expect(blob).not.toMatch(/"formQuality"\s*:\s*3/);
    expect(blob).not.toMatch(/"rpe"\s*:\s*5/);
  });
});
