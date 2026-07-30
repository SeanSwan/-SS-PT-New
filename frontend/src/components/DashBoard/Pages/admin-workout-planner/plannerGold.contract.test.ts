/**
 * plannerGold.contract.test.ts
 *
 * Contract test for the planner gold hoist (Workout-OS C7d): the gold hex
 * #C6A84B must exist exactly once in the planner directory — inside
 * plannerGold.ts — and every former consumer must import from './plannerGold'.
 * Before the hoist the same hex was hardcoded ~47 times across 12 files under
 * five different alias var names.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const GOLD_HEX = /c6a84b/gi;

const HOISTED_FILES = [
  'SavedPlanCard.styles.ts',
  'WorkoutPlannerPlanning.styles.ts',
  'WorkoutPlannerConfirmDialog.tsx',
  'WorkoutPlannerPage.styles.ts',
  'WorkoutPlannerShell.styles.ts',
  'WorkoutPlannerFeedback.styles.ts',
  'WorkoutPlannerRolodexCard.styles.ts',
  'WorkoutPlannerGuidedCandidatesPanel.styles.ts',
  'LongHorizonScheduleView.styles.ts',
  'TeachModeVideoPreview.styles.ts',
  'WorkoutPlanPdfDialog.styles.ts',
  'WorkoutPlannerBackupPanel.tsx',
] as const;

/** The five pre-hoist alias declarations that must never reappear. */
const OLD_ALIAS_FORMS = [
  'var(--accent-gold, #C6A84B)',
  'var(--accent-warning, #C6A84B)',
  'var(--accent-luxury, #C6A84B)',
  'var(--warning, #C6A84B)',
  "'1px solid #C6A84B'", // the former bare literal in WorkoutPlannerPage.styles.ts
] as const;

const read = (file: string): string => readFileSync(join(HERE, file), 'utf8');

describe('plannerGold contract — single gold source (Workout-OS C7d)', () => {
  it.each([...HOISTED_FILES])('%s contains no C6A84B literal', (file) => {
    expect(read(file).match(GOLD_HEX)).toBeNull();
  });

  it('plannerGold.ts contains the gold hex exactly once', () => {
    expect(read('plannerGold.ts').match(GOLD_HEX)).toHaveLength(1);
  });

  it.each([...HOISTED_FILES])('%s has no old alias form', (file) => {
    const source = read(file);
    for (const alias of OLD_ALIAS_FORMS) {
      expect(source).not.toContain(alias);
    }
  });

  it.each([...HOISTED_FILES])('%s imports from ./plannerGold', (file) => {
    expect(read(file)).toMatch(/import\s+\{[^}]+\}\s+from\s+'\.\/plannerGold'/);
  });
});
