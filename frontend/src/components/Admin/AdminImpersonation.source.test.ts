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

  it('scopes the admin account switcher to the admin Coach Command Center route', () => {
    const shellSource = readMaybe('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const coachSource = readMaybe('frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx');

    expect(shellSource).not.toContain("import AdminAccountSwitcher from '../Admin/AdminAccountSwitcher'");
    expect(shellSource).not.toContain('<AdminAccountSwitcher />');
    expect(coachSource).toContain("import AdminAccountSwitcher from '../../../Admin/AdminAccountSwitcher'");
    expect(coachSource).toContain("location.pathname.startsWith('/dashboard/admin/coach-assistant')");
    expect(coachSource).toContain("userRole === 'admin'");
    expect(coachSource).toContain('<AdminAccountSwitcher />');
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
  it('keeps account controls responsive inside the Coach Command Center grid', () => {
    const switcherStyles = readMaybe('frontend/src/components/Admin/AdminAccountSwitcher.styles.ts');
    const previewStyles = readMaybe('frontend/src/components/Admin/AdminAccountSwitcherPreview.styles.ts');
    const commandStyles = readMaybe('frontend/src/components/Admin/AdminAccountCommandPanel.styles.ts');

    expect(switcherStyles).toContain('grid-area: account');
    expect(switcherStyles).toContain('flex: 0 0 auto');
    expect(switcherStyles).toContain('order: 5');
    expect(switcherStyles).toContain('container-type: inline-size');
    expect(switcherStyles).toContain('@container (max-width: 1120px)');
    expect(switcherStyles).toContain('@container (max-width: 700px)');
    expect(switcherStyles).toContain('> * {');
    expect(switcherStyles).toContain('grid-template-columns: minmax(390px, 1.1fr)');
    expect(switcherStyles).toContain('grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));');
    expect(switcherStyles).toContain('padding: 0 0.55rem;');
    expect(switcherStyles).not.toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(switcherStyles).toContain('white-space: normal');
    expect(previewStyles).toContain('overflow: hidden');
    expect(previewStyles).toContain('max-width: 100%');
    expect(commandStyles).toContain('repeat(auto-fit, minmax(154px, 1fr))');
    expect(commandStyles).toContain('@container (max-width: 360px)');
    expect(commandStyles).toContain('white-space: normal');
  });
});


