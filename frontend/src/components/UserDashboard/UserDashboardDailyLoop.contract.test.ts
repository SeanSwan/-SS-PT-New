import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('UserDashboard V3 daily loop contract', () => {
  it('mounts the V3 dashboard at the protected user-dashboard route', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');

    expect(routeSource).toContain("path: 'user-dashboard'");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    expect(routeSource).toContain('<UserDashboard />');
  });

  it('keeps Home as the daily return surface with the health loop and coach action launcher', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');

    expect(dashboardSource).toContain("const [activeTab, setActiveTab] = useState<TabId>('home')");
    expect(dashboardSource).toContain("activeTab === 'home'");
    expect(dashboardSource).toContain('<HomeTab onTabChange');
    expect(homeSource).toContain('<DailyHealthLoop');
    expect(homeSource).toContain('<SwanCoachActionLauncher');
  });

  it('keeps touched dashboard home files free of corrupted mojibake text', () => {
    const touchedHomeFiles = [
      'src/components/UserDashboard/components/HomeTab.tsx',
      'src/components/UserDashboard/components/DailyHealthLoop.tsx',
      'src/components/UserDashboard/components/SwanCoachActionLauncher.tsx',
      'src/components/UserDashboard/components/SwanCoachDock.tsx',
      'src/components/UserDashboard/components/swanCoachDashboardRoute.ts',
    ];

    const offenders = touchedHomeFiles.flatMap((file) => {
      const source = readSource(file);
      return /[\uFEFF\uFFFD\u00E2\u00F0]/.test(source) ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });
});
