/**
 * ============================================================================
 * FILE: workoutPlanCompletionReceiptRegistry.test.mjs
 * PURPOSE: Prevent completion-receipt model registry and association drift.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Locks model import/extraction, both associations return
 * paths, core relationships, and the public synchronous getter.
 * HOW IT FITS IN THE APP: Startup model cache must expose the receipt to both
 * canonical workout-log writers.
 * KEY DECISIONS: Source contract complements the full registry parity suite.
 * NASM PROTOCOL CONTEXT: Missing registry wiring must fail before completions run.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const associations = readFileSync(resolve(root, 'models/associations.mjs'), 'utf8');
const indexSource = readFileSync(resolve(root, 'models/index.mjs'), 'utf8');

describe('WorkoutPlanCompletionReceipt registry', () => {
  it('registers the model in every associations return path', () => {
    expect(associations).toContain("import('./WorkoutPlanCompletionReceipt.mjs')");
    expect(associations).toContain('WorkoutPlanCompletionReceiptModule.default');
    expect(associations.match(/WorkoutPlanCompletionReceipt,/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('owns plan, form, session, and client relationships', () => {
    expect(associations).toContain('WorkoutPlan.hasMany(WorkoutPlanCompletionReceipt');
    expect(associations).toContain('WorkoutPlanCompletionReceipt.belongsTo(WorkoutPlan');
    expect(associations).toContain('DailyWorkoutForm.hasOne(WorkoutPlanCompletionReceipt');
    expect(associations).toContain('WorkoutSession.hasMany(WorkoutPlanCompletionReceipt');
    expect(associations).toContain('User.hasMany(WorkoutPlanCompletionReceipt');
  });

  it('exposes the receipt through the initialized model cache', () => {
    expect(indexSource).toContain(
      "export const getWorkoutPlanCompletionReceipt = () => getModel('WorkoutPlanCompletionReceipt');",
    );
  });
});
