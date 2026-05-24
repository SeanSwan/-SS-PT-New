import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin special controller hardening', () => {
  it('is mounted at the canonical admin specials API path used by the admin UI', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
    const managerSource = readFileSync(
      resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx'),
      'utf8',
    );

    expect(coreRoutes).toContain("app.use('/api/admin/specials', adminSpecialRoutes)");
    expect(managerSource).toContain("apiService.get('/api/admin/specials')");
    expect(managerSource).toContain("apiService.post('/api/admin/specials', payload)");
    expect(managerSource).toContain('apiService.put(`/api/admin/specials/${editingSpecial.id}`, payload)');
  });

  it('does not expose raw controller error messages in create/update failures', () => {
    const controllerSource = readFileSync(resolve(__dirname, '../../controllers/adminSpecialController.mjs'), 'utf8');

    expect(controllerSource).toContain("const INTERNAL_ERROR = 'INTERNAL_ERROR';");
    expect(controllerSource).toContain('code: INTERNAL_ERROR');
    expect(controllerSource).not.toContain("error.message || 'Failed to create special'");
    expect(controllerSource).not.toContain("error.message || 'Failed to update special'");
  });
});
