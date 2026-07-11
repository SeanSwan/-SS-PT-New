import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const pageSource = read('WorkoutPlannerPage.tsx');
const layoutSource = read('WorkoutPlannerPageLayout.tsx');
const builderSource = read('WorkoutPlannerBuilderPanel.tsx');
const sectionPath = resolve(__dirname, 'WorkoutPlannerGeneratedPlanSection.tsx');
const sectionSource = existsSync(sectionPath) ? readFileSync(sectionPath, 'utf8') : '';

describe('WorkoutPlanner generated plan section extraction', () => {
  it('keeps generated horizon rendering and PDF export outside the planner page shell', () => {
    expect(pageSource).toContain("from './WorkoutPlannerPageLayout'");
    expect(layoutSource).not.toContain("from './WorkoutPlannerGeneratedPlanSection'");
    expect(builderSource).toContain("from './WorkoutPlannerGeneratedPlanSection'");
    expect(pageSource).not.toContain('exportPopulatedPlanPDF');
    expect(pageSource).not.toContain('buildPopulatedPlanPdfBlob');
    expect(pageSource).not.toContain('<LongHorizonScheduleView');
    // A3: the section now owns PDF export via the Approval Vault preview path
    // (buildPopulatedPlanPdfBlob + PdfApprovalVault) instead of a direct download.
    expect(sectionSource).toContain('buildPopulatedPlanPdfBlob');
    expect(sectionSource).toContain('PdfApprovalVault');
    expect(sectionSource).toContain('<LongHorizonScheduleView');
    expect(sectionSource).toContain('workoutPlannerRecommendationKey');
    expect(sectionSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
