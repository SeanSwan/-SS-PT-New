/**
 * plannerContextBoundary.test.ts — S15 acceptance fence (JARVIS blueprint §4.7).
 * Locks the context cutover: four providers, a thin page (≤120 lines, ≤2
 * useState), a props-free layout boundary (blueprint cap ≤12), the 300-line
 * file cap across the new seam, and the Lenses-never-fetch law for
 * presentational planner surfaces.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HERE = resolve(__dirname);
const DIR = resolve(HERE, '..');
const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const providerSource = read('plannerContexts/WorkoutPlannerProvider.tsx');

describe('S15 planner context boundary', () => {
  it('lands all four planner contexts and mounts them from the provider', () => {
    for (const name of ['PlannerDataContext', 'PlannerUIContext', 'PlannerActionsContext', 'PlannerVoiceContext']) {
      expect(read(`plannerContexts/${name}.tsx`)).toContain(`createContext`);
      expect(providerSource).toContain(`<${name}.Provider`);
    }
  });

  it('keeps the page a thin shell: ≤120 lines, ≤2 useState, no network', () => {
    expect(pageSource.split(/\r?\n/).length).toBeLessThanOrEqual(120);
    expect((pageSource.match(/useState/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(pageSource).not.toContain('authAxios');
    expect(pageSource).toContain('<WorkoutPlannerProvider>');
  });

  it('keeps the layout boundary within the blueprint prop cap (zero props)', () => {
    expect(layoutSource).toContain('const WorkoutPlannerPageLayout: React.FC = ()');
    expect(layoutSource).toContain('usePlannerData()');
    expect(layoutSource).toContain('usePlannerUI()');
    expect(layoutSource).toContain('usePlannerActions()');
    expect(layoutSource).toContain('usePlannerVoice()');
  });

  it('keeps every file in the context seam under the 300-line cap', () => {
    const seam = ['WorkoutPlannerPage.tsx', 'WorkoutPlannerPageLayout.tsx',
      ...readdirSync(join(DIR, 'plannerContexts')).map(f => `plannerContexts/${f}`)];
    for (const rel of seam) {
      expect(read(rel).split(/\r?\n/).length, `${rel} exceeds 300 lines`).toBeLessThanOrEqual(300);
    }
  });

  it('bans fetching from presentational planner surfaces (Lenses never fetch)', () => {
    const presentational = ['WorkoutPlannerPageLayout.tsx', 'WorkoutPlannerCommandPanel.tsx',
      'WorkoutPlannerCommandPanelV2.tsx',
      'WorkoutPlannerBuilderPanel.tsx', 'WorkoutPlannerRolodexPanel.tsx',
      'WorkoutPlannerSavedPlansSection.tsx', 'WorkoutPlannerStatusAssistantStrip.tsx',
      'plannerContexts/PlannerDataContext.tsx', 'plannerContexts/PlannerUIContext.tsx',
      'plannerContexts/PlannerActionsContext.tsx', 'plannerContexts/PlannerVoiceContext.tsx'];
    for (const rel of presentational) {
      const src = read(rel);
      expect(src, `${rel} must not fetch`).not.toMatch(/authAxios\.|fetch\(|axios\./);
    }
  });
});
