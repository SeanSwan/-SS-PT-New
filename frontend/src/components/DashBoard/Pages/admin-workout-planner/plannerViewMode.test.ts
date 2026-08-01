/**
 * Planner view-mode preference contract (Workout-OS C7, §12.2 ruling):
 * GUIDED is the default for new plans, POWER one toggle away, choice
 * remembered per operator; storage failures degrade to guided.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  generationModeForPlannerView,
  readPlannerViewMode,
  writePlannerViewMode,
} from './plannerViewMode';

beforeEach(() => localStorage.clear());

describe('plannerViewMode', () => {
  it('defaults to guided (the §12.2 ruling)', () => {
    expect(readPlannerViewMode()).toBe('guided');
  });

  it('persists power and validates garbage back to guided', () => {
    writePlannerViewMode('power');
    expect(readPlannerViewMode()).toBe('power');
    localStorage.setItem('ss.planner.view.v1', 'banana');
    expect(readPlannerViewMode()).toBe('guided');
  });

  it('maps views to generation-mode presets', () => {
    expect(generationModeForPlannerView('guided')).toBe('guide_me');
    expect(generationModeForPlannerView('power')).toBe('auto');
  });

  it('the planner page seeds its generation mode from the stored preference', () => {
    // Source lock: the initializer must consult the pref, not hardcode 'auto'.
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    const page = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/useWorkoutPlannerOrchestration.ts'), 'utf8');
    expect(page).toContain('generationModeForPlannerView(readPlannerViewMode())');
    const sections = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanel.sections.tsx'), 'utf8');
    expect(sections).toContain('data-testid="planner-view-toggle"');
    expect(sections).toContain('writePlannerViewMode(next)');
  });
});
