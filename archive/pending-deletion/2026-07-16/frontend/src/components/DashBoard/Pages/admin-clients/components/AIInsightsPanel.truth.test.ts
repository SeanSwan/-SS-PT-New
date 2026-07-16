import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/AIInsightsPanel.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
  'utf8',
);

describe('AIInsightsPanel active surface truth contract', () => {
  it('is mounted by the admin client management AI insights tab', () => {
    expect(parentSource).toContain("import AIInsightsPanel from './components/AIInsightsPanel'");
    expect(parentSource).toContain('<AIInsightsPanel clientId={selectedClient.id} />');
  });

  it('does not render hardcoded AI insight, risk, recommendation, or model telemetry', () => {
    expect(source).not.toContain('// Mock data generation');
    expect(source).not.toContain('generateMockInsights');
    expect(source).not.toContain('generateMockRecommendations');
    expect(source).not.toContain('generateMockRisks');
    expect(source).not.toContain('const mockModels');
    expect(source).not.toContain('setModels(mockModels)');
    expect(source).not.toContain('Training Load Optimizer v2.1');
    expect(source).not.toContain('Performance Predictor Neural Network');
  });

  it('uses the canonical AI BFF client summary endpoint as its data source', () => {
    expect(source).toContain('`/api/admin/ai-bff/client-summary/${clientId}`');
    expect(source).toContain('buildClientSummaryInsights');
    expect(source).toContain('AI model telemetry is not available');
  });
});
