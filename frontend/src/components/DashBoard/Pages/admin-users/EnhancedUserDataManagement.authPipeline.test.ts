import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layoutSource = read('src/components/DashBoard/UniversalDashboardLayout.tsx');
const pageSource = stripComments(read('src/components/DashBoard/Pages/admin-users/EnhancedUserDataManagement.tsx'));
const backendMountSource = read('../backend/core/routes.mjs');
const adminRoutesSource = read('../backend/routes/adminRoutes.mjs');

describe('EnhancedUserDataManagement auth pipeline', () => {
  it('is the mounted admin user-management dashboard surface backed by protected admin routes', () => {
    expect(layoutSource).toContain("const EnhancedUserDataManagement = React.lazy(() => import('./Pages/admin-users/EnhancedUserDataManagement'))");
    expect(layoutSource).toContain("{ path: '/user-management', component: EnhancedUserDataManagement");
    expect(backendMountSource).toContain("app.use('/api/admin', adminRoutes)");
    expect(adminRoutesSource).toContain('router.use(authenticateToken)');
    expect(adminRoutesSource).toContain('router.use(authorizeAdmin)');
    expect(adminRoutesSource).toContain("router.get('/users', userManagementController.getAllUsers)");
    expect(adminRoutesSource).toContain("router.put('/users/:id', userManagementController.updateUser)");
  });

  it('loads and updates admin users through shared apiService auth transport', () => {
    expect(pageSource).toContain("import apiService from '../../../../services/api.service'");
    expect(pageSource).toContain("apiService.get('/api/admin/users'");
    expect(pageSource).toContain("apiService.put(`/api/admin/users/${userId}`");
    expect(pageSource).not.toMatch(/\bfetch\s*\(/);
    expect(pageSource).not.toContain("localStorage.getItem('accessToken')");
    expect(pageSource).not.toMatch(/Authorization\s*:/);
  });
});
