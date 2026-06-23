import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readMaybe = (relativePath: string) => {
  const path = resolve(repoRoot, relativePath);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

describe('admin impersonation UI wiring', () => {
  it('mounts the return-to-admin banner globally above the router', () => {
    const appSource = readMaybe('frontend/src/App.tsx');

    expect(appSource).toContain("import AdminImpersonationBanner from './components/Admin/AdminImpersonationBanner'");
    expect(appSource.indexOf('<AdminImpersonationBanner />')).toBeGreaterThan(-1);
    expect(appSource.indexOf('<AdminImpersonationBanner />')).toBeLessThan(appSource.indexOf('<RouterProvider router={router} />'));
  });

  it('mounts the admin account switcher inside the live dashboard shell', () => {
    const shellSource = readMaybe('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(shellSource).toContain("import AdminAccountSwitcher from '../Admin/AdminAccountSwitcher'");
    expect(shellSource).toContain("userRole === 'admin' && activeRole === 'admin'");
    expect(shellSource).toContain('<AdminAccountSwitcher />');
  });

  it('uses the new auth impersonation endpoints and restores admin session on expiry', () => {
    const switcherSource = readMaybe('frontend/src/components/Admin/AdminAccountSwitcher.tsx');
    const commandPanelSource = readMaybe('frontend/src/components/Admin/AdminAccountCommandPanel.tsx');
    const bannerSource = readMaybe('frontend/src/components/Admin/AdminImpersonationBanner.tsx');
    const apiFactorySource = readMaybe('frontend/src/services/apiClientFactory.ts');
    const authContextSource = readMaybe('frontend/src/context/AuthContext.tsx');
    const authRoutesSource = readMaybe('backend/routes/authRoutes.mjs');

    expect(switcherSource).toContain('/api/auth/admin/accounts/access');
    expect(switcherSource).toContain('/api/auth/admin/accounts/targets');
    expect(switcherSource).toContain('canListTargets');
    expect(switcherSource).toContain('!visible || !accountControl.ready || !accountControl.enabled');
    expect(switcherSource).toContain('/api/auth/admin/impersonation/start');
    expect(switcherSource).toContain('startAdminImpersonationSession');
    expect(switcherSource).toContain('requestSeqRef');
    expect(switcherSource).toContain('Open Dashboard');
    expect(switcherSource).toContain('AdminAccountCommandPanel');
    expect(commandPanelSource).toContain('/api/auth/admin/accounts/${target.id}/${command}');
    expect(commandPanelSource).toContain('Force logout');
    expect(commandPanelSource).toContain('Block');
    expect(commandPanelSource).toContain('Deactivate');
    expect(commandPanelSource).toContain('Reactivate');
    expect(bannerSource).toContain('restoreAdminSessionFromImpersonation');
    expect(apiFactorySource).toContain('restoreAdminSessionFromImpersonation');
    expect(authContextSource).toContain('clearAdminImpersonationState');
    expect(authRoutesSource).toContain('/admin/accounts/access');
    expect(authRoutesSource).toContain('/admin/accounts/targets');
    expect(authRoutesSource).toContain('getAdminAccountCommandAccess');
    expect(authRoutesSource).toContain('/admin/impersonation/targets');
    expect(authRoutesSource).toContain('/admin/impersonation/start');
    expect(authRoutesSource).toContain('/admin/accounts/:targetUserId/:command(block|deactivate|reactivate|force-logout)');
    expect(authRoutesSource).toContain('runAdminAccountCommand');
  });

  it('locks down browser session restore to admin-owned state only', () => {
    const sessionSource = readMaybe('frontend/src/utils/adminImpersonationSession.ts');
    const serviceSource = readMaybe('backend/services/auth/adminImpersonationService.mjs');

    expect(sessionSource).toContain("response.impersonation.actorRole !== 'admin'");
    expect(sessionSource).toContain("path.startsWith('/dashboard/admin')");
    expect(sessionSource).toContain('isAdminImpersonationRole');
    expect(serviceSource).toContain("impersonationActorRole: 'admin'");
    expect(serviceSource).toContain('SAFE_TARGET_ATTRIBUTES');
    expect(serviceSource).toContain('requireOwnerActor');
    expect(serviceSource).toContain('AdminAccountAuditLog');
    expect(serviceSource).toContain('isLocked: false');
    expect(serviceSource).toContain('IMPERSONATION_INVALID_ROLE');
  });
});
