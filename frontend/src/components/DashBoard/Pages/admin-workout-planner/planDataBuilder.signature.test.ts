/**
 * planDataBuilder signature tests
 * ===============================
 * Keeps dirty-state signatures separated from plan payload persistence tests.
 */
import { describe, expect, it } from 'vitest';
import { buildContentSignature } from './planDataBuilder';
import { buildGeneratedPlan, buildManualExercise } from './planDataBuilder.testFixtures';

describe('buildContentSignature - round-trip parity (Codex 2026-05-03 MED-2)', () => {
  // Load-time savedSnapshot and live currentExercisesSig must share one builder
  // so a clean saved-plan load does not falsely light the Update Plan guard.
  it('manual signature matches between load-time and live-state when nothing changes', () => {
    const exercises = [
      buildManualExercise('a', 'Squat'),
      buildManualExercise('b', 'Row', { sets: 4, reps: '8' }),
    ];

    const loadTimeSig = buildContentSignature({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: exercises,
    });
    const liveSig = buildContentSignature({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: exercises,
    });
    expect(loadTimeSig).toBe(liveSig);
  });

  it('generated signature matches between load-time and live-state when nothing changes', () => {
    const generatedPlan = buildGeneratedPlan();
    const loadTimeSig = buildContentSignature({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });
    const liveSig = buildContentSignature({
      mode: 'generated',
      generatedPlan,
      category: 'full_body',
      goal: 'general_fitness',
    });
    expect(loadTimeSig).toBe(liveSig);
  });
});

describe('buildContentSignature', () => {
  it('manual signatures are stable and equality-comparable', () => {
    const exercises = [buildManualExercise('a', 'Squat'), buildManualExercise('b', 'Row')];
    const sigA = buildContentSignature({
      mode: 'manual',
      phaseName: 'P',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: exercises,
    });
    const sigB = buildContentSignature({
      mode: 'manual',
      phaseName: 'P',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: exercises,
    });
    expect(sigA).toBe(sigB);
  });

  it('generated signatures change when a different plan loads (dirty-state lights up)', () => {
    const planA = buildGeneratedPlan();
    const planB = buildGeneratedPlan({
      planSummary: { ...planA.planSummary, durationWeeks: 12, totalSessions: 48 },
      weeks: planA.weeks!.slice(0, 2),
    });

    const sigA = buildContentSignature({
      mode: 'generated',
      generatedPlan: planA,
      category: 'full_body',
      goal: 'general_fitness',
    });
    const sigB = buildContentSignature({
      mode: 'generated',
      generatedPlan: planB,
      category: 'full_body',
      goal: 'general_fitness',
    });
    expect(sigA).not.toBe(sigB);
  });

  it('manual and generated signatures never collide', () => {
    const generatedSig = buildContentSignature({
      mode: 'generated',
      generatedPlan: buildGeneratedPlan(),
      category: 'full_body',
      goal: 'general_fitness',
    });
    const manualSig = buildContentSignature({
      mode: 'manual',
      phaseName: 'P',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: [buildManualExercise('a', 'Squat')],
    });
    expect(generatedSig).not.toBe(manualSig);
  });
});
