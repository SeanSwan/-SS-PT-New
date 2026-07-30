import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readTrainerSource = (relativePath: string) => readFileSync(resolve(__dirname, relativePath), 'utf8');

const assessmentsSource = readTrainerSource('TrainerAssessmentsPage.tsx');
const assessmentsSectionsSource = readTrainerSource('TrainerAssessmentsPage.sections.tsx');
const assessmentsStylesSource = readTrainerSource('TrainerAssessmentsPage.styles.ts');
// TrainerWorkoutForgePage.styles.ts was retired with the Build Plan surface
// (Workout-OS C7, 2026-07-29) — the forge source no longer exists to sweep.
const teachModeSource = readTrainerSource('components/NASMTeachMode.tsx');
const teachModeStylesSource = readTrainerSource('components/NASMTeachMode.styles.ts');
const teachModeDataSource = [
  'components/NASMTeachMode.data.movement.tsx',
  'components/NASMTeachMode.data.posture.tsx',
  'components/NASMTeachMode.data.performance.tsx',
].map(readTrainerSource).join('\n');

describe('Trainer dashboard accessibility hardening contract', () => {
  it('keeps compact helper text readable on dark trainer tools', () => {
    const combinedSource = [
      assessmentsSource,
      assessmentsSectionsSource,
      assessmentsStylesSource,
      teachModeSource,
      teachModeStylesSource,
      teachModeDataSource,
    ].join('\n');

    expect(combinedSource).not.toMatch(/rgba\(224,\s*236,\s*244,\s*0\.(?:3|4)\d*\)/);
    expect(combinedSource).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.(?:3|4)\d*\)/);
    expect(combinedSource).toContain('rgba(224, 236, 244, 0.68)');
  });

  it('keeps trainer assessment controls at SwanStudios touch-target size', () => {
    const combinedAssessmentSource = [assessmentsSource, assessmentsSectionsSource, assessmentsStylesSource, teachModeSource, teachModeStylesSource].join('\n');

    expect(combinedAssessmentSource).not.toContain('min-height: 32px');
    expect(combinedAssessmentSource).not.toContain('min-height: 36px');
    expect(assessmentsStylesSource).toContain('export const Pill = styled.button');
    expect(combinedAssessmentSource).toContain('min-height: 44px');
  });

  it('keeps trainer assessment buttons as explicit non-submit buttons', () => {
    const combinedAssessmentSource = [assessmentsSource, assessmentsSectionsSource].join('\n');

    expect(assessmentsSource).toMatch(/<TeachModeToggle[\s\S]*?type="button"/);
    expect(combinedAssessmentSource).toMatch(/<TypeChip[\s\S]*?type="button"/);
    expect(combinedAssessmentSource).toMatch(/<Pill[\s\S]*?type="button"/);
    expect(assessmentsSource).toMatch(/<SubmitButton[\s\S]*?type="button"/);
    expect(teachModeSource).toMatch(/<ExpandBtn[\s\S]*?type="button"/);
  });
});
