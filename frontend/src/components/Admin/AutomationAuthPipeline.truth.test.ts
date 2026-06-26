import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('admin automation auth pipeline', () => {
  it('covers mounted automation route and backend automation/SMS routes', () => {
    const dashboardSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const routeComponentsSource = readSource(
      'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx',
    );
    const dashboardRoutesSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const automationRoutesSource = readSource('backend/routes/automationRoutes.mjs');
    const smsRoutesSource = readSource('backend/routes/smsRoutes.mjs');

    expect(dashboardSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toContain(
      "export const AutomationManager = React.lazy(() => import('../Admin/AutomationManager'))",
    );
    expect(dashboardRoutesSource).toContain("{ path: '/automation', component: AutomationManager");
    expect(coreRoutesSource).toContain("app.use('/api/automation', automationRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/sms', smsRoutes)");
    expect(automationRoutesSource).toContain("router.get('/sequences'");
    expect(automationRoutesSource).toContain("router.post('/sequences'");
    expect(automationRoutesSource).toContain("router.put('/sequences/:id'");
    expect(automationRoutesSource).toContain("router.delete('/sequences/:id'");
    expect(automationRoutesSource).toContain("router.post('/trigger'");
    expect(smsRoutesSource).toContain("router.get('/templates'");
  });

  it('keeps automation and template calls on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useAutomationSequences.ts');
    const managerSource = readSource('frontend/src/components/Admin/AutomationManager.tsx');
    const combinedSource = `${hookSource}\n${managerSource}`;

    expect(hookSource).toContain("apiService.get('/api/automation/sequences')");
    expect(managerSource).toContain("apiService.get('/api/sms/templates')");
    expect(managerSource).toContain('apiService.put(url, payload)');
    expect(managerSource).toContain('apiService.post(url, payload)');
    expect(managerSource).toContain('apiService.delete(`/api/automation/sequences/${sequenceId}`)');
    expect(managerSource).toContain("apiService.post('/api/automation/trigger'");

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain("fetch('/api/automation");
    expect(combinedSource).not.toContain("fetch('/api/sms/templates");
    expect(combinedSource).not.toContain('fetch(url');
  });
});
