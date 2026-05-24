import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
  'utf8',
);

describe('ClientProgressDashboard active surface truth contract', () => {
  it('is mounted by the admin client management progress tab', () => {
    expect(parentSource).toContain("import ClientProgressDashboard from './components/ClientProgressDashboard'");
    expect(parentSource).toContain('<ClientProgressDashboard clientId={selectedClient.id} />');
  });

  it('does not render hardcoded progress data or random chart values', () => {
    expect(source).not.toContain('// Mock data for demonstration');
    expect(source).not.toContain('const mockMilestones');
    expect(source).not.toContain('const mockAssessments');
    expect(source).not.toContain('const mockWorkouts');
    expect(source).not.toContain('const mockMeasurements');
    expect(source).not.toContain('Preview Mode');
    expect(source).not.toContain('Math.random');
  });

  it('uses canonical progress, workout history, and measurement APIs', () => {
    expect(source).toContain('`/api/client-progress/${clientId}`');
    expect(source).toContain('`/api/client-progress/${clientId}/workout-history`');
    expect(source).toContain('`/api/measurements/user/${clientId}`');
  });
});
