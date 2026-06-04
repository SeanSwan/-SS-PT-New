/**
 * EnhancedClientProgressView list identity locks
 * ==============================================
 * Guards active trainer progress analytics against array-index keys that can
 * scramble alert/finding rows when API-generated insight lists reorder.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (relativePath: string) => readFileSync(
  resolve(__dirname, relativePath),
  'utf8',
);

describe('EnhancedClientProgressView list identity locks', () => {
  it('keeps the analytics panels mounted from the canonical trainer progress route', () => {
    const layoutSource = readSource('../../DashBoard/UniversalDashboardLayout.tsx');
    const viewSource = readSource('./EnhancedClientProgressView.tsx');
    const shellSource = readSource('./EnhancedClientProgressViewShell.tsx');

    expect(layoutSource).toContain("path: '/client-progress', component: EnhancedClientProgressView");
    expect(viewSource).toContain('<EnhancedClientProgressViewShell');
    expect(shellSource).toContain('<ComparisonAnalytics');
    expect(shellSource).toContain('<InjuryRiskAssessment');
    expect(shellSource).toContain('<GoalProgressTracker');
  });

  it('does not key comparison insight rows by array index', () => {
    const source = readSource('./Analytics/ComparisonAnalytics.tsx');
    const viewSource = readSource('./Analytics/ComparisonAnalyticsView.tsx');
    const logicSource = readSource('./Analytics/ComparisonAnalytics.logic.ts');
    const combinedSource = [source, viewSource, logicSource].join('\n');

    expect(combinedSource).not.toMatch(/key=\{index\}/);
    expect(combinedSource).toContain('comparisonInsightKey');
  });

  it('does not key injury assessment dynamic rows by array index', () => {
    const source = readSource('./Analytics/InjuryRiskAssessment.tsx');
    const viewSource = readSource('./Analytics/InjuryRiskAssessmentView.tsx');
    const logicSource = readSource('./Analytics/InjuryRiskAssessment.logic.ts');
    const combinedSource = [source, viewSource, logicSource].join('\n');

    expect(combinedSource).not.toMatch(/key=\{index\}/);
    expect(combinedSource).not.toMatch(/key=\{itemIndex\}/);
    expect(combinedSource).toContain('criticalAlertKey');
    expect(combinedSource).toContain('findingRowKey');
    expect(combinedSource).toContain('correctiveProtocolItemKey');
    expect(combinedSource).toContain('recommendationItemKey');
  });

  it('does not key goal tracker dynamic rows by array index', () => {
    const listSource = readSource('./Analytics/GoalProgressTrackerGoalList.tsx');
    const detailSource = readSource('./Analytics/GoalProgressTrackerGoalDetails.tsx');
    const logicSource = readSource('./Analytics/GoalProgressTracker.logic.ts');
    const combinedSource = [listSource, detailSource, logicSource].join('\n');

    expect(combinedSource).not.toMatch(/key=\{index\}/);
    expect(combinedSource).toContain('goalRowKey');
    expect(combinedSource).toContain('milestoneKey');
  });
});
