import { describe, expect, it } from 'vitest';
import {
  TRAINING_SECTION_CHIPS,
  TRAINING_WORKFLOW_MODES,
  getTrainingModeConfig,
  getTrainingModeForSection,
} from './trainingWorkflowModes';
import type { TrainingSection } from './TrainingTabSectionContent';

const ALL_SECTIONS: TrainingSection[] = [
  'architect', 'plans', 'logger', 'import', 'plaud', 'copilot', 'history',
];

describe('trainingWorkflowModes', () => {
  it('exposes exactly three workflow modes: Today, Plan, History & Inputs', () => {
    expect(TRAINING_WORKFLOW_MODES.map((mode) => mode.id)).toEqual(['today', 'plan', 'inputs']);
    expect(TRAINING_WORKFLOW_MODES.map((mode) => mode.label)).toEqual([
      'Today', 'Plan', 'History & Inputs',
    ]);
  });

  it('covers all seven legacy training sections exactly once across the modes', () => {
    const covered = TRAINING_WORKFLOW_MODES.flatMap((mode) => mode.sections);
    expect(covered).toHaveLength(ALL_SECTIONS.length);
    expect(new Set(covered)).toEqual(new Set(ALL_SECTIONS));
  });

  it('keeps each mode default section inside its own section group', () => {
    TRAINING_WORKFLOW_MODES.forEach((mode) => {
      expect(mode.sections).toContain(mode.defaultSection);
    });
  });

  it('derives the owning mode for every legacy deep-link section id', () => {
    expect(getTrainingModeForSection('logger')).toBe('today');
    expect(getTrainingModeForSection('plans')).toBe('plan');
    expect(getTrainingModeForSection('architect')).toBe('plan');
    expect(getTrainingModeForSection('copilot')).toBe('plan');
    expect(getTrainingModeForSection('history')).toBe('inputs');
    expect(getTrainingModeForSection('import')).toBe('inputs');
    expect(getTrainingModeForSection('plaud')).toBe('inputs');
  });

  it('keeps daily workflow defaults: Today -> logger, Plan -> plans, Inputs -> history', () => {
    expect(getTrainingModeConfig('today').defaultSection).toBe('logger');
    expect(getTrainingModeConfig('plan').defaultSection).toBe('plans');
    expect(getTrainingModeConfig('inputs').defaultSection).toBe('history');
  });

  it('labels every section chip without resurrecting retired names', () => {
    ALL_SECTIONS.forEach((section) => {
      expect(TRAINING_SECTION_CHIPS[section].id).toBe(section);
      expect(TRAINING_SECTION_CHIPS[section].label.length).toBeGreaterThan(0);
    });
    expect(TRAINING_SECTION_CHIPS.architect.label).toBe('Build Plan');
    expect(TRAINING_SECTION_CHIPS.copilot.label).not.toMatch(/swan coach copilot/i);
    expect(TRAINING_SECTION_CHIPS.plans.label).toBe('Plan Library');
  });
});
