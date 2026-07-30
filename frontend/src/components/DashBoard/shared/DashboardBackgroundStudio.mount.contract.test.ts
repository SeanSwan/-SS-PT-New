/**
 * FILE: DashboardBackgroundStudio.mount.contract.test.ts
 * PURPOSE: Locks the shared background studio to canonical dashboard home routes.
 * PARENT: DashboardBackgroundStudio.tsx.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('role dashboard background studio mount contract', () => {
  it('mounts the shared background studio on canonical dashboard homes', () => {
    const routes = read('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const routeComponents = read('src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
    const clientHome = read('src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx');
    const trainerHome = read('src/components/DashBoard/Pages/trainer-dashboard/TrainerHomeTab.tsx');
    const adminHome = read('src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx');
    const studio = read('src/components/DashBoard/shared/DashboardBackgroundStudio.tsx');
    const recipes = read('src/components/UserDashboard/backgrounds/UserDashboardBackgroundRecipes.ts');
    const styles = read('src/components/DashBoard/shared/DashboardBackgroundStudio.styles.ts');

    expect(routeComponents).toContain("export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'))");
    expect(routeComponents).toContain("export const TrainerHomeTab = React.lazy(() => import('./Pages/trainer-dashboard/TrainerHomeTab'))");
    expect(routeComponents).toContain("export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'))");
    expect(routes).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(routes).toContain("{ path: '/overview', component: TrainerHomeTab");
    expect(routes).toContain("{ path: '/overview', component: RevolutionaryAdminDashboard");

    expect(clientHome).toContain('<DashboardBackgroundSurface>');
    expect(clientHome).toContain('scopeLabel="Client"');
    expect(trainerHome).toContain('<DashboardBackgroundSurface>');
    // The trainer home mounts the SURFACE but deliberately NOT the settings panel.
    // Commit c3bd5c563 (2026-07-23, Kimi K3 de-dup) evicted the background-theme
    // picker from the trainer page flow, and TrainerHomeObservatoryParity.test.ts
    // enforces that with `not.toContain('DashboardBackgroundSettingsPanel')`.
    //
    // This line used to assert `scopeLabel="Trainer"`, which can only appear via
    // <DashboardBackgroundSettingsPanel scopeLabel="Trainer" />. So the two guards
    // were MUTUALLY UNSATISFIABLE and this one had been sitting red in the failing
    // baseline. c3bd5c563 changed the design and did not update this sibling
    // assertion; the parity contract is the newer, intentional decision (this file's
    // assertion dates to 2026-07-01), so this one yields.
    expect(trainerHome).not.toContain('DashboardBackgroundSettingsPanel');
    expect(adminHome).toContain('<DashboardBackgroundSurface>');
    expect(adminHome).toContain('scopeLabel="Admin"');
    expect(studio).toContain('useUserDashboardBackgroundPreference(brandLogo)');
    expect(studio).toContain('<UserDashboardBackgroundControls');
    expect(studio).toContain('DashboardBackgroundContext.Provider');
    expect(studio).toContain('React.useState(false)');
    expect(studio).toContain('Background themes');
    expect(studio).toContain('dashboard theme picker');
    expect(studio).toContain('Open picker');
    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('var(--user-dashboard-bg-art, transparent)');
    expect(styles).toContain('width: min(760px, calc(100vw - 48px));');
    expect(styles).toContain('max-height: min(68vh, 720px);');
    expect(recipes).toContain("'forest-swan'");
    expect(recipes).toContain("'deep-space-swan'");
    expect(recipes).toContain("'cyberpunk-swan'");
    expect(recipes).toContain("'ocean-swan'");
  });
});