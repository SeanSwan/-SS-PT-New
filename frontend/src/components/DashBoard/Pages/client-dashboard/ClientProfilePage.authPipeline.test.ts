import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const pageSource = stripComments(read('./ClientProfilePage.tsx'));
const layoutSource = read('../../UniversalDashboardLayout.tsx');
const sidebarSource = read('./ClientStellarSidebar.tsx');
const backendMountSource = read('../../../../../../backend/core/routes.mjs');
const profileRoutesSource = read('../../../../../../backend/routes/profileRoutes.mjs');

describe('ClientProfilePage auth pipeline', () => {
  it('is mounted as the client profile/settings dashboard surface backed by protected profile routes', () => {
    expect(layoutSource).toMatch(/const ClientProfilePage = React\.lazy\(\(\) => import\('\.\/Pages\/client-dashboard\/ClientProfilePage'\)\)/);
    expect(layoutSource).toMatch(/path:\s*'\/profile', component: ClientProfilePage/);
    expect(sidebarSource).toContain("path: '/dashboard/client/profile'");
    expect(backendMountSource).toContain("app.use('/api/profile', profileRoutes)");
    expect(profileRoutesSource).toContain("router.get('/', protect, getUserProfile)");
    expect(profileRoutesSource).toContain("router.put('/', protect, updateUserProfile)");
  });

  it('saves chart settings through shared apiService auth transport', () => {
    expect(pageSource).toContain("import apiService from '../../../../services/api.service'");
    expect(pageSource).toContain("apiService.put('/api/profile', { chartVisibility }");
    expect(pageSource).not.toContain("localStorage.getItem('token')");
    expect(pageSource).not.toMatch(/\bfetch\s*\(/);
    expect(pageSource).not.toMatch(/Authorization\s*:/);
  });
});
