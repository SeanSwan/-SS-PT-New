import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');
const read = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

describe('Report Room canonical route and entry-point contract', () => {
  it('mounts one authenticated /support route before the dashboard catch-all', () => {
    const routes = read('frontend/src/routes/main-routes.tsx');
    const supportIndex = routes.indexOf("path: 'support'");
    const dashboardIndex = routes.indexOf("path: 'dashboard/*'");

    expect(routes).toContain("import('../pages/support/SupportReportRoomPage')");
    expect(supportIndex).toBeGreaterThan(-1);
    expect(supportIndex).toBeLessThan(dashboardIndex);
    expect(routes.slice(supportIndex, dashboardIndex)).toContain('<SupportReportRoomPage />');
  });

  it('replaces dead help controls with real Report Room navigation', () => {
    const footer = read('frontend/src/components/Footer/CompactFooter.tsx');
    const clientTypes = read('frontend/src/components/UserDashboard/components/ClientDashboardHome.types.ts');
    const clientSections = read('frontend/src/components/UserDashboard/components/ClientDashboardHome.sections.tsx');
    const clientHome = read('frontend/src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const processing = read('frontend/src/components/Checkout/ProcessingOverlay.tsx');

    expect(footer).toContain('to="/support"');
    expect(footer).not.toContain('to="/help"');
    expect(clientTypes).toContain("| 'support'");
    expect(clientSections).toContain("['Report a problem', 'support', HelpCircle]");
    expect(clientHome).toContain("if (target === 'support') navigate('/support')");
    expect(processing).toContain("window.location.href = '/support'");
  });

  it('returns every authenticated role through the universal dashboard router', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/support/SupportReportRoomPage.tsx'), 'utf8');
    expect(page).toContain('to="/dashboard"');
    expect(page).not.toContain('to="/user-dashboard"');
  });

  it('keeps every reporter-facing support module free of mojibake markers', () => {
    const supportDirectory = resolve(process.cwd(), 'src/pages/support');
    const source = readdirSync(supportDirectory)
      .filter((name) => /\.(ts|tsx)$/.test(name))
      .map((name) => readFileSync(resolve(supportDirectory, name), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\u00c2|\u00c3|\u00e2/);
  });
});
