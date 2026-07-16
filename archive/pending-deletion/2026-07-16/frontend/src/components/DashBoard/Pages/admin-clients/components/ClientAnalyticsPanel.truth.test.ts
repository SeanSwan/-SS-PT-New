import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/ClientAnalyticsPanel.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
  'utf8',
);

describe('ClientAnalyticsPanel active surface truth contract', () => {
  it('is mounted by the admin client management analytics tab', () => {
    expect(parentSource).toContain("import ClientAnalyticsPanel from './components/ClientAnalyticsPanel'");
    expect(parentSource).toContain('<ClientAnalyticsPanel clientId={selectedClient.id} />');
  });

  it('does not render hardcoded analytics metrics, insights, predictions, or random chart data', () => {
    expect(source).not.toContain('// Mock data for demonstration');
    expect(source).not.toContain('const mockMetrics');
    expect(source).not.toContain('const mockInsights');
    expect(source).not.toContain('const mockPredictions');
    expect(source).not.toContain('mockMetrics.map(renderMetricCard)');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Preview Mode');
  });

  it('uses canonical client analytics source endpoints', () => {
    expect(source).toContain('`/api/client-progress/${clientId}`');
    expect(source).toContain('`/api/client-progress/${clientId}/workout-history`');
    expect(source).toContain('`/api/measurements/user/${clientId}`');
    expect(source).toContain('`/api/admin/ai-bff/client-summary/${clientId}`');
  });

  it('does not expose unfinished cohort comparison as a working analytics mode', () => {
    expect(source).not.toContain("setViewMode('comparison')");
    expect(source).not.toContain('TODO: Implement comparison charts');
    expect(source).not.toContain('Compare client performance against cohorts and benchmarks');
    expect(source).toContain('disabled');
    expect(source).toContain('Cohort comparison is unavailable until a real benchmark endpoint exists.');
  });
});
