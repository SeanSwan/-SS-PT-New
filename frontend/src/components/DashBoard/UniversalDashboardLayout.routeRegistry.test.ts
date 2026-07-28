import { describe, expect, it } from 'vitest';
import {
  roleConfigurations,
  type DashboardRoleKey,
} from './UniversalDashboardLayout.routes';

const roleKeys = Object.keys(roleConfigurations) as DashboardRoleKey[];

describe('UniversalDashboardLayout route registry contract', () => {
  it('keeps every role route well formed and unique', () => {
    for (const role of roleKeys) {
      const config = roleConfigurations[role];
      const paths = config.routes.map(({ path }) => path);
      const uniquePaths = new Set(paths);

      expect(paths.length, `${role} route paths should be unique`).toBe(uniquePaths.size);
      expect(paths, `${role} default path must be mounted`).toContain(config.defaultPath);

      for (const route of config.routes) {
        expect(route.path, `${role} route must be dashboard-relative`).toMatch(/^\//);
        expect(route.path, `${role} route must not be pre-prefixed`).not.toMatch(/^\/dashboard(?:\/|$)/);
        expect(route.path, `${role} route must not contain duplicate slashes`).not.toContain('//');
        expect(route.title.trim(), `${role} route title must be useful`).toBe(route.title);
        expect(route.title.length, `${role} route title must be useful`).toBeGreaterThan(2);
        expect(route.description.trim(), `${role} route description must be useful`).toBe(route.description);
        expect(route.description.length, `${role} route description must be useful`).toBeGreaterThan(8);
        expect(route.component, `${role} route component must be mounted`).toBeTruthy();
      }
    }
  });

  it('keeps direct legacy admin routes explicitly bounded', () => {
    const legacyAdminPaths = roleConfigurations.admin.routes
      .map(({ path }) => path)
      .filter((path) => path.includes('legacy'));

    expect(legacyAdminPaths).toEqual([
      '/user-management-legacy',
      '/trainer-management-legacy',
    ]);
  });
  it('mounts Lens Foundry only on the admin dashboard', () => {
    const adminLensFoundry = roleConfigurations.admin.routes.find((route) => route.path === '/lens-foundry');

    expect(adminLensFoundry?.title).toBe('Lens Foundry Lab');
    expect(adminLensFoundry?.description).toContain('design brain');
    expect(roleConfigurations.trainer.routes.map(({ path }) => path)).not.toContain('/lens-foundry');
    expect(roleConfigurations.client.routes.map(({ path }) => path)).not.toContain('/lens-foundry');
  });
});
