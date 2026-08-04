/**
 * Draft-wins contract (Workout-OS C4a).
 * Kills two data-loss modes the C4 probe proved:
 *  1. The restore banner was DEAD CODE on `?loadPlan=today` — the canonical
 *     client URL (every dashboard CTA) — via a `!autoLoadTodayPlan` exclusion.
 *  2. The duplicate-409 branch cleared the draft, destroying the only copy
 *     of the just-entered workout.
 * Source-lock idiom (house pattern): the wiring is asserted structurally so
 * a refactor cannot silently regress either mode.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const loggerSource = read('src/components/WorkoutLogger/WorkoutLogger.tsx');
const bannerSource = read('src/components/WorkoutLogger/runner/shell/zones/ShellNotices.tsx');
const planLoadingSource = read('src/components/WorkoutLogger/useWorkoutPlanLoading.ts');
const submitSource = read('src/components/WorkoutLogger/useWorkoutSubmit.ts');

describe('draft beats ?loadPlan=today', () => {
  it('the logger peeks storage synchronously and gates the plan auto-load', () => {
    expect(loggerSource).toContain('hasStoredWorkoutDraft(userNumericId, effectiveClientId, workoutDateValue)');
    expect(loggerSource).toContain("blockTodayPlanForDraft: draftGate === 'pending' || draftGate === 'restored'");
  });

  it('the restore banner no longer excludes the canonical today URL', () => {
    const bannerMount = loggerSource.slice(
      loggerSource.indexOf('<ShellNotices'),
      loggerSource.indexOf('/>', loggerSource.indexOf('<ShellNotices')),
    );
    expect(bannerMount).toContain('draftOfferVisible={exercises.length === 0 && !sessionNotes}');
    expect(bannerMount).not.toContain('autoLoadTodayPlan');
  });

  it('restore blocks the loader for the mount; discard re-opens it', () => {
    expect(bannerSource).toContain("setDraftGate('restored')");
    expect(bannerSource).toContain("setDraftGate('discarded')");
  });

  it('the plan loader returns BEFORE consuming the load signal when blocked', () => {
    const effectBody = planLoadingSource.slice(
      planLoadingSource.indexOf('if (blockTodayPlanForDraft) return;'),
      planLoadingSource.indexOf('autoLoadTodayPlanRef.current = todayPlanLoadSignal;'),
    );
    expect(effectBody.length).toBeGreaterThan(0);
    expect(planLoadingSource).toContain('blockTodayPlanForDraft, effectiveClientId');
  });
});

describe('duplicate-409 preserves the draft', () => {
  it('the existing-form branch never clears the draft', () => {
    const start = submitSource.indexOf('const existingFormId =');
    const end = submitSource.indexOf('} else {', start);
    const branch = submitSource.slice(start, end);
    expect(branch).not.toContain('workoutDraft.clear()');
    expect(branch).toContain('stay saved as a draft');
  });

  it('only the success branch clears the draft', () => {
    const occurrences = submitSource.split('workoutDraft.clear()').length - 1;
    expect(occurrences).toBe(1);
  });
});
