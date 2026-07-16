import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeSource = readFileSync(resolve(__dirname, './UniversalDashboardLayout.routes.tsx'), 'utf8');
const routeComponentSource = readFileSync(resolve(__dirname, './UniversalDashboardLayout.routeComponents.tsx'), 'utf8');

describe('UniversalDashboardLayout client-details legacy redirect', () => {
  it('routes legacy /client-details into the canonical Client Hub instead of the mock-heavy legacy view', () => {
    expect(routeComponentSource).toContain('export const AdminClientDetailsRedirect');
    expect(routeSource).toContain("path: '/client-details', component: AdminClientDetailsRedirect");
    expect(routeComponentSource).toContain('/dashboard/admin/client-management${location.search}');
    expect(routeSource).not.toContain("component: EnhancedAdminClientManagementView");
    expect(routeComponentSource).not.toContain("import('./Pages/admin-clients/EnhancedAdminClientManagementView')");
  });
});
