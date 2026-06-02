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
  });

  it('does not key comparison insight rows by array index', () => {
    const source = readSource('./Analytics/ComparisonAnalytics.tsx');

    expect(source).not.toMatch(/key=\{index\}/);
    expect(source).toContain('comparisonInsightKey');
  });

  it('does not key injury assessment dynamic rows by array index', () => {
    const source = readSource('./Analytics/InjuryRiskAssessment.tsx');

    expect(source).not.toMatch(/key=\{index\}/);
    expect(source).not.toMatch(/key=\{itemIndex\}/);
    expect(source).toContain('criticalAlertKey');
    expect(source).toContain('findingRowKey');
    expect(source).toContain('correctiveProtocolItemKey');
    expect(source).toContain('recommendationItemKey');
  });
});
