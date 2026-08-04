/**
 * WorkoutLogger.draft.contract.test.ts
 * ======================================
 * Phase 3c.1 source locks, amended by Workout-OS C4a (2026-07-29): the
 * canonical logger shell MUST wire the autosave draft lifecycle. Guards:
 * (1) the hook is mounted with live form state, (2) ONLY a confirmed save
 * clears the draft — the duplicate-409 clear was REVERSED after the C4
 * probe proved it destroys the only copy of a second same-day workout's
 * content (unrecoverable data loss beats stale-draft tidiness), (3) the
 * restore banner only offers a draft into an EMPTY form.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Slice D1/D2 decomposition: AI-events + submit clusters live in hooks;
// C4a: the draft offer moved into the shell Notice lane (ShellNotices).
const source = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8')
  + readFileSync(resolve(__dirname, './useWorkoutAiEvents.ts'), 'utf8')
  + readFileSync(resolve(__dirname, './useWorkoutSubmit.ts'), 'utf8')
  + readFileSync(resolve(__dirname, './runner/shell/zones/ShellNotices.tsx'), 'utf8');

describe('WorkoutLogger draft autosave contract', () => {
  it('mounts useWorkoutDraft with the live form state', () => {
    expect(source).toContain("from './useWorkoutDraft'");
    expect(source).toMatch(/useWorkoutDraft\(\{/);
    expect(source).toMatch(/enabled:\s*!hasInitialExercises\s*&&\s*!lastSaveResponse/);
  });

  it('clears the draft ONLY on a confirmed save — a duplicate-409 preserves it', () => {
    const clears = source.match(/workoutDraft\.clear\(\)/g) ?? [];
    expect(clears.length).toBe(1);
    // The one clear must live with the saved-response handoff.
    expect(source).toMatch(
      /setLastSaveResponse\(response\.data\);\s*\n\s*workoutDraft\.clear\(\);/
    );
  });

  it('only offers the restore banner into an empty form', () => {
    expect(source).toContain('workoutDraft.pendingDraft');
    expect(source).toMatch(/draftOfferVisible=\{exercises\.length === 0 && !sessionNotes\}/);
    // Restored rows must re-run row-identity assignment (stable loggerExerciseIds).
    expect(source).toMatch(/restore\(\)/);
    expect(source).toMatch(/ensureWorkoutLoggerExerciseRowIdentity/);
  });

  it('keeps the phase-template transform extracted from the shell (ratchet)', () => {
    expect(source).toContain("from './WorkoutLogger.phaseTemplate'");
    expect(source).not.toMatch(/const\s+toSelections\s*=/);
  });
});
