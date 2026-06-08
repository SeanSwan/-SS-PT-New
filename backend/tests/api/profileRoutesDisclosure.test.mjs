import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('profile route disclosure hardening', () => {
  it('locks the active profile route and dashboard/profile consumers', () => {
    const coreRoutesSource = readSource('core/routes.mjs');
    const profileRoutesSource = readSource('routes/profileRoutes.mjs');
    const profileServiceSource = readSource('../frontend/src/services/profileService.ts');
    const clientProfileSource = readSource('../frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx');
    const userDashboardSource = readSource('../frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');

    expect(coreRoutesSource).toContain("app.use('/api/profile', profileRoutes)");
    expect(profileRoutesSource).toContain("router.get('/', protect, getUserProfile)");
    expect(profileRoutesSource).toContain("router.put('/', protect, updateUserProfile)");
    expect(profileRoutesSource).toContain("'/upload-profile-photo'");
    expect(profileRoutesSource).toContain("'/upload-banner-photo'");
    expect(profileRoutesSource).toContain("'/upload-banner-collage-photo'");
    expect(profileServiceSource).toContain("productionApiService.get('/api/profile')");
    expect(profileServiceSource).toContain("productionApiService.put('/api/profile'");
    expect(profileServiceSource).toContain("'/api/profile/upload-profile-photo'");
    expect(profileServiceSource).toContain("'/api/profile/upload-banner-photo'");
    expect(profileServiceSource).toContain("'/api/profile/upload-banner-collage-photo'");
    expect(clientProfileSource).toContain("apiService.put('/api/profile', { chartVisibility }");
    expect(userDashboardSource).toContain('uploadBannerPhoto');
  });

  it('does not append raw exception details to profile responses', () => {
    const controllerSource = readSource('controllers/profileController.mjs');

    expect(controllerSource).not.toMatch(/message:\s*'Failed to [^']+: '\s*\+\s*error\.message/);
    expect(controllerSource).not.toMatch(/message:\s*`Failed to [^`]*\$\{error\.message\}/);
  });
});
