import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

const USER_DASHBOARD_V3_SHELL_FILES = [
  'src/components/UserDashboard/UserDashboard.V3.tsx',
  'src/components/UserDashboard/components/UserDashboardProfileHeaderV3.tsx',
  'src/components/UserDashboard/components/UserDashboardSidebarV3.tsx',
  'src/components/UserDashboard/components/UserDashboardStatusStatesV3.tsx',
  'src/components/UserDashboard/components/UserDashboardTabsV3.tsx',
  'src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts',
];

function listDashboardV3StyleFiles() {
  return readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/styles'))
    .filter((file) => /^DashboardV3.*\.ts$/.test(file))
    .map((file) => `src/components/UserDashboard/styles/${file}`);
}

const USER_DASHBOARD_V3_STYLE_FILES = listDashboardV3StyleFiles();
const USER_DASHBOARD_V3_COMMUNITY_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^CommunityTab.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);
const USER_DASHBOARD_V3_ACTIVITY_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^ActivitySection.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);
const USER_DASHBOARD_V3_WORKOUT_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^WorkoutsTab.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);
const USER_DASHBOARD_V3_ABOUT_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^AboutSection.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);
const USER_DASHBOARD_V3_CREATIVE_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^CreativeGallery.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);
const USER_DASHBOARD_V3_PHOTO_FILES = readdirSync(resolve(process.cwd(), 'src/components/UserDashboard/components'))
  .filter((file) => /^PhotoGallery.*\.(ts|tsx)$/.test(file))
  .map((file) => `src/components/UserDashboard/components/${file}`);

describe('UserDashboard V3 daily loop contract', () => {
  it('keeps the canonical V3 dashboard shell and style ownership files under the file-size rule', () => {
    [
      ...USER_DASHBOARD_V3_SHELL_FILES,
      ...USER_DASHBOARD_V3_STYLE_FILES,
      ...USER_DASHBOARD_V3_COMMUNITY_FILES,
      ...USER_DASHBOARD_V3_ACTIVITY_FILES,
      ...USER_DASHBOARD_V3_WORKOUT_FILES,
      ...USER_DASHBOARD_V3_ABOUT_FILES,
      ...USER_DASHBOARD_V3_CREATIVE_FILES,
      ...USER_DASHBOARD_V3_PHOTO_FILES,
    ].forEach((file) => {
      const source = readSource(file);
      const lineCount = source.split(/\r?\n/).length;

      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });

  it('mounts the V3 dashboard at the protected user-dashboard route', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');

    expect(routeSource).toContain("path: 'user-dashboard'");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    expect(routeSource).toContain('<UserDashboard />');
  });

  it('keeps Home as the daily return surface with the health loop and coach action launcher', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const controllerSource = readSource('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');

    expect(controllerSource).toContain("const [activeTab, setActiveTab] = useState<TabId>('home')");
    expect(dashboardSource).toContain("dashboard.activeTab === 'home'");
    expect(tabsSource).toContain('<HomeTab onTabChange');
    expect(homeSource).toContain('<DailyHealthLoop');
    expect(homeSource).toContain('<SwanCoachActionLauncher');
  });

  it('uses a wrapped phone tab layout so Community and Profile are not clipped', () => {
    const stylesSource = readSource('src/components/UserDashboard/styles/DashboardV3NavigationStatusStyles.ts');

    expect(stylesSource).toContain('@media (max-width: 430px)');
    expect(stylesSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(stylesSource).toContain('grid-column: 1 / -1');
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
