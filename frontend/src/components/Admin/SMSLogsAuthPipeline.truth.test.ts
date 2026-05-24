import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('admin SMS logs auth pipeline', () => {
  it('covers mounted SMS logs route and backend SMS routes', () => {
    const dashboardSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const smsRoutesSource = readSource('backend/routes/smsRoutes.mjs');

    expect(dashboardSource).toContain("const SMSLogsPanel = React.lazy(() => import('../Admin/SMSLogsPanel'))");
    expect(dashboardSource).toContain("{ path: '/sms-logs', component: SMSLogsPanel");
    expect(coreRoutesSource).toContain("app.use('/api/sms', smsRoutes)");
    expect(smsRoutesSource).toContain("router.get('/logs'");
    expect(smsRoutesSource).toContain("router.post('/send'");
    expect(smsRoutesSource).toContain("router.post('/send-template'");
  });

  it('keeps SMS log reads and resends on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useSMSLogs.ts');
    const panelSource = readSource('frontend/src/components/Admin/SMSLogsPanel.tsx');
    const combinedSource = `${hookSource}\n${panelSource}`;

    expect(hookSource).toContain('apiService.get(`/api/sms/logs${queryString}`)');
    expect(panelSource).toContain("const endpoint = log.templateName ? '/api/sms/send-template' : '/api/sms/send';");
    expect(panelSource).toContain('apiService.post(endpoint, payload)');

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('fetch(`/api/sms/');
    expect(combinedSource).not.toContain('fetch(endpoint');
  });
});
