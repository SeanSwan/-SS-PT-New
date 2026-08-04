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
const routeComponentsSource = read('../../UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = read('../../UniversalDashboardLayout.routes.tsx');
const sidebarSource = read('./ClientStellarSidebar.tsx');
const backendMountSource = read('../../../../../../backend/core/routes.mjs');
const profileRoutesSource = read('../../../../../../backend/routes/profileRoutes.mjs');
const authControllerSource = stripComments(read('../../../../../../backend/controllers/authController.mjs'));
const authContextSource = stripComments(read('../../../../context/AuthContextProvider.tsx'));

describe('ClientProfilePage auth pipeline', () => {
  it('is mounted as the client profile/settings dashboard surface backed by protected profile routes', () => {
    expect(routeComponentsSource).toMatch(/export const ClientProfilePage = React\.lazy\(\(\) => import\('\.\/Pages\/client-dashboard\/ClientProfilePage'\)\)/);
    expect(dashboardRoutesSource).toMatch(/path:\s*'\/profile', component: ClientProfilePage/);
    expect(sidebarSource).toContain("path: '/dashboard/client/profile'");
    expect(backendMountSource).toContain("app.use('/api/profile', profileRoutes)");
    expect(profileRoutesSource).toContain("router.get('/', protect, getUserProfile)");
    expect(profileRoutesSource).toContain("router.put('/', protect, updateUserProfile)");
  });

  it('persists goals + notification prefs to the fields the backend accepts', () => {
    // These controls were interactive-but-saving-nothing before 2026-08-03.
    // The payload keys must stay in the backend allowlist (profileController
    // allowedFields), or the save silently no-ops again.
    expect(pageSource).toContain('fitnessGoal: goalText');
    expect(pageSource).toContain('emailNotifications: notifPrefs.email');
    expect(pageSource).toContain('smsNotifications: notifPrefs.sms');
    expect(pageSource).toContain('notificationPreferences: notifPrefs');
    for (const field of ['fitnessGoal', 'emailNotifications', 'smsNotifications', 'notificationPreferences']) {
      expect(read('../../../../../../backend/controllers/profileController.mjs')).toContain(`'${field}'`);
    }
    // Seeded from the client's real saved prefs, never hardcoded-on.
    expect(pageSource).not.toMatch(/useState\(\{\s*email:\s*true,\s*push:\s*true,\s*sms:\s*false\s*\}\)/);
  });

  it('refreshes the auth user after BOTH saves so a remount shows persisted values', () => {
    // Without this the context keeps the pre-save snapshot and reopening the
    // page re-seeds the controls from stale data (deep loop 2 finding).
    const refreshCalls = pageSource.match(/void refreshUser\?\.\(\)/g) || [];
    expect(refreshCalls.length).toBe(2);
    expect(pageSource).toContain('const { user, refreshUser } = useAuth()');
  });

  it('saves chart settings through shared apiService auth transport', () => {
    expect(pageSource).toContain("import apiService from '../../../../services/api.service'");
    expect(pageSource).toContain("apiService.put('/api/profile', { chartVisibility }");
    expect(pageSource).not.toContain("localStorage.getItem('token')");
    expect(pageSource).not.toMatch(/\bfetch\s*\(/);
    expect(pageSource).not.toMatch(/Authorization\s*:/);
  });
  it('round-trips saved notification preferences through the auth refresh payload', () => {
    expect(authControllerSource).toContain('emailNotifications: user.emailNotifications !== false');
    expect(authControllerSource).toContain('smsNotifications: user.smsNotifications !== false');
    expect(authControllerSource).toContain('notificationPreferences: user.notificationPreferences ?? null');
    expect(authContextSource).toContain('emailNotifications?: boolean');
    expect(authContextSource).toContain('smsNotifications?: boolean');
    expect(authContextSource).toContain('notificationPreferences?: NotificationPreferences | null');
    expect(authContextSource).toContain('emailNotifications: userData.emailNotifications ?? fallback?.emailNotifications ?? true');
    expect(authContextSource).toContain('smsNotifications: userData.smsNotifications ?? fallback?.smsNotifications ?? true');
    expect(authContextSource).toContain('notificationPreferences: userData.notificationPreferences ?? fallback?.notificationPreferences ?? null');
  });
});
