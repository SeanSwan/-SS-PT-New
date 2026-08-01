import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutPath = resolve(__dirname, 'WorkoutPlannerPageLayout.tsx');
const layoutSource = existsSync(layoutPath) ? readFileSync(layoutPath, 'utf8') : '';

describe('WorkoutPlanner page layout extraction', () => {
  it('keeps the page as orchestration while the layout owns rendered panels', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(pageSource).not.toContain('<WorkoutPlannerCommandPanel');
    expect(pageSource).not.toContain('<WorkoutPlannerStatusAssistantStrip');
    expect(pageSource).not.toContain('<WorkoutPlannerRolodexPanel');
    expect(pageSource).not.toContain('<WorkoutPlannerBuilderPanel');
    expect(pageSource).not.toContain('<ThreePanel');
    expect(layoutSource).toContain('<WorkoutPlannerCommandPanel');
    expect(layoutSource).toContain('<WorkoutPlannerStatusAssistantStrip');
    expect(layoutSource).toContain('<WorkoutPlannerRolodexPanel');
    expect(layoutSource).toContain('<WorkoutPlannerBuilderPanel');
    expect(layoutSource).toContain('<ThreePanel');
    expect(pageSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(layoutSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('mounts the Coach dock behind the client-viewer gate (planner_* is admin/trainer only)', () => {
    expect(layoutSource).toContain('!isViewerClient && <WorkoutPlannerCoachDock');
  });
});
