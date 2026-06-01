import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const statusSource = readFileSync(resolve(__dirname, './UserDashboardStatusStatesV3.tsx'), 'utf8');
const dashboardSource = readFileSync(resolve(__dirname, '../UserDashboard.V3.tsx'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../hooks/useUserDashboardV3Controller.ts'), 'utf8');

describe('UserDashboard V3 error retry contract', () => {
  it('retries profile loading in-app instead of reloading the whole page', () => {
    expect(statusSource).not.toContain('window.location.reload()');
    expect(statusSource).toContain('onRetry?: () => void');
    expect(statusSource).toContain('onClick={onRetry}');
    expect(dashboardSource).toContain('<UserDashboardErrorState message={dashboard.error} onRetry={dashboard.refreshProfile} />');
    expect(controllerSource).toContain('refreshProfile,');
  });
});
