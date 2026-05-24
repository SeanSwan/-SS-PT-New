import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const layoutSource = readFileSync(resolve(__dirname, './UniversalDashboardLayout.tsx'), 'utf8');
const clientDashboardSource = readFileSync(
  resolve(__dirname, './Pages/admin-clients/ClientManagementDashboard.tsx'),
  'utf8',
);

describe('UniversalDashboardLayout client-details legacy redirect', () => {
  it('routes legacy /client-details into the canonical Client Hub instead of the mock-heavy legacy view', () => {
    expect(layoutSource).toContain('const AdminClientDetailsRedirect');
    expect(layoutSource).toContain("path: '/client-details', component: AdminClientDetailsRedirect");
    expect(layoutSource).toContain('/dashboard/admin/client-management${location.search}');
    expect(layoutSource).not.toContain("component: EnhancedAdminClientManagementView");
    expect(layoutSource).not.toContain("import('./Pages/admin-clients/EnhancedAdminClientManagementView')");
  });

  it('keeps client management entry buttons pointed at the canonical Client Hub', () => {
    expect(clientDashboardSource).not.toContain('/dashboard/admin/client-details');
    expect(clientDashboardSource).toContain("navigate('/dashboard/admin/client-management')");
  });
});
