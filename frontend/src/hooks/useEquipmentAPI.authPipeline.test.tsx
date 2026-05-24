import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('useEquipmentAPI auth pipeline', () => {
  it('is consumed by mounted equipment manager routes backed by equipment profile APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const pageSource = readSource('frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const equipmentRoutesSource = readSource('backend/routes/equipmentRoutes.mjs');

    expect(layoutSource).toContain("const EquipmentManagerPage = React.lazy(() => import('../EquipmentManager/EquipmentManagerPage'))");
    expect(layoutSource).toContain("{ path: '/equipment', component: EquipmentManagerPage");
    expect(pageSource).toContain("useEquipmentAPI,");
    expect(coreRoutesSource).toContain("app.use('/api/equipment-profiles', equipmentRoutes)");
    expect(equipmentRoutesSource).toContain("router.get('/'");
    expect(equipmentRoutesSource).toContain("router.post('/'");
    expect(equipmentRoutesSource).toContain("router.put('/:id'");
    expect(equipmentRoutesSource).toContain("router.delete('/:id'");
    expect(equipmentRoutesSource).toContain("router.post('/:id/scan'");
    expect(equipmentRoutesSource).toContain("router.put('/:id/items/:itemId/approve'");
    expect(equipmentRoutesSource).toContain("router.put('/:id/items/:itemId/reject'");
  });

  it('keeps equipment CRUD and scan calls on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useEquipmentAPI.ts');

    expect(hookSource).toContain("import apiService from '../services/api.service'");
    expect(hookSource).toContain('apiService.get<T>(url)');
    expect(hookSource).toContain('apiService.post<T>(url, payload)');
    expect(hookSource).toContain('apiService.put<T>(url, payload)');
    expect(hookSource).toContain('apiService.delete<T>(url)');
    expect(hookSource).toContain('apiService.post(`${API_BASE}/${profileId}/scan`, formData');

    expect(hookSource).not.toContain("localStorage.getItem('token')");
    expect(hookSource).not.toContain('getHeaders');
    expect(hookSource).not.toContain('getAuthHeader');
    expect(hookSource).not.toContain('fetch(');
    expect(hookSource).not.toContain('Authorization');
  });
});
