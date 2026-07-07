/**
 * WorkoutLogger.draft.contract.test.ts
 * ======================================
 * Phase 3c.1 source locks: the canonical logger shell MUST wire the autosave
 * draft lifecycle. Guards the three load-bearing hooks: (1) the hook is mounted
 * with live form state, (2) a successful or duplicate save clears the draft so
 * stale data can never resurrect, (3) the restore banner only offers a draft
 * into an EMPTY form (never clobbers typed/plan-loaded work).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');

describe('WorkoutLogger draft autosave contract', () => {
  it('mounts useWorkoutDraft with the live form state', () => {
    expect(source).toContain("from './useWorkoutDraft'");
    expect(source).toMatch(/useWorkoutDraft\(\{/);
    expect(source).toMatch(/enabled:\s*!hasInitialExercises\s*&&\s*!lastSaveResponse/);
  });

  it('clears the draft on BOTH confirmed save and duplicate-exists outcomes', () => {
    const clears = source.match(/workoutDraft\.clear\(\)/g) ?? [];
    expect(clears.length).toBeGreaterThanOrEqual(2);
    // The success clear must live with the saved-response handoff.
    expect(source).toMatch(
      /setLastSaveResponse\(response\.data\);\s*\n\s*workoutDraft\.clear\(\);/
    );
  });

  it('only offers the restore banner into an empty form', () => {
    expect(source).toContain('WorkoutDraftRestoreBanner');
    expect(source).toMatch(
      /workoutDraft\.pendingDraft\s*&&\s*exercises\.length === 0\s*&&\s*!sessionNotes/
    );
    // Restored rows must re-run row-identity assignment (stable loggerExerciseIds).
    expect(source).toMatch(/restore\(\)/);
    expect(source).toMatch(/ensureWorkoutLoggerExerciseRowIdentity/);
  });

  it('keeps the phase-template transform extracted from the shell (ratchet)', () => {
    expect(source).toContain("from './WorkoutLogger.phaseTemplate'");
    expect(source).not.toMatch(/const\s+toSelections\s*=/);
  });
});
