import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function expectStyleBlockContains(source: string, exportName: string, declaration: string) {
  const start = source.indexOf(`export const ${exportName}`);
  expect(start, `${exportName} style block must exist`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('`;', start);
  expect(end, `${exportName} style block must close`).toBeGreaterThan(start);
  expect(source.slice(start, end), `${exportName} must include ${declaration}`)
    .toContain(declaration);
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

  it('keeps user-dashboard as its own user/social dashboard surface', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');

    expect(routeSource).toContain("path: 'user-dashboard'");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    expect(routeSource).toContain('<UserDashboard />');
    expect(routeSource).not.toContain("path: 'user-dashboard',\n      element: <Navigate to=\"/dashboard/client/overview\" replace />");
  });

  it('keeps user dashboard navigation separate from the client training dashboard', () => {
    const selectorSource = readSource('src/components/DashboardSelector/DashboardSelector.tsx');
    const mobileMenuSource = readSource('src/components/Header/components/MobileMenu.tsx');
    const signupSource = readSource('src/pages/OptimizedSignupModal.tsx');
    const vipConversionSource = readSource('src/pages/gallery/VIPConversionModal.tsx');

    expect(selectorSource).toContain("title: 'User Dashboard'");
    expect(selectorSource).toContain("path: '/user-dashboard'");
    expect(selectorSource).toContain("return ['admin', 'trainer', 'client', 'user'].includes(user.role);");
    expect(mobileMenuSource).toContain('to="/user-dashboard"');
    expect(signupSource).toContain("navigate('/user-dashboard')");
    expect(vipConversionSource).not.toContain("window.open('/user-dashboard/schedule'");
  });

  it('allows trainers to open the client training dashboard without making it the user dashboard', () => {
    const universalLayoutSource = readSource('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(universalLayoutSource).toContain("userRole === 'trainer' && urlRole === 'client'");
    expect(universalLayoutSource).toContain("const userRole = rawRole === 'user' ? 'client' : rawRole;");
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

  it('mounts ClientObservatoryHome inside the canonical client overview route', () => {
    const clientHomeSource = readSource('src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx');

    expect(clientHomeSource).toContain("import ClientObservatoryHome from './observatory/ClientObservatoryHome'");
    expect(clientHomeSource).toContain('<ClientObservatoryHome />');
    expect(clientHomeSource).not.toContain("../../../UserDashboard/components/HomeTab");
  });

  it('keeps Social Hub off the client dashboard implementation', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');
    const observatoryDataSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData.ts');

    expect(routeSource).toContain("path: 'social'");
    expect(routeSource).toContain("() => import('../pages/Social/SocialPage.V3')");
    expect(routeSource).not.toContain("() => import('../components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryHome')");
    expect(observatoryDataSource).toContain("export type LensId = 'feed' | 'reels' | 'friends' | 'challenges'");
    expect(observatoryDataSource).toContain("{ id: 'feed', label: 'Feed'");
    expect(observatoryDataSource).toContain("{ id: 'reels', label: 'Reels'");
    expect(observatoryDataSource).toContain("{ id: 'friends', label: 'Friends'");
    expect(observatoryDataSource).toContain("{ id: 'challenges', label: 'Challenges'");
  });

  it('uses a wrapped phone tab layout so Community and Profile are not clipped', () => {
    const stylesSource = readSource('src/components/UserDashboard/styles/DashboardV3NavigationStatusStyles.ts');

    expect(stylesSource).toContain('@media (max-width: 430px)');
    expect(stylesSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(stylesSource).toContain('grid-column: 1 / -1');
  });

  it('resets dashboard scroll when switching between Home and the in-page tabs', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');

    expect(dashboardSource).toContain('resetUserDashboardTabScroll');
    expect(dashboardSource).toContain('const handleTabChange = React.useCallback');
    expect(dashboardSource).toContain('onTabChange={handleTabChange}');
    expect(dashboardSource).not.toContain('onTabChange={dashboard.setActiveTab}');
  });

  it('keeps the full-bleed profile header from intercepting observatory rail clicks', () => {
    const bannerSource = readSource('src/components/UserDashboard/styles/DashboardV3BannerStyles.ts');
    const identitySource = readSource('src/components/UserDashboard/styles/DashboardV3IdentityStyles.ts');
    const statsSource = readSource('src/components/UserDashboard/styles/DashboardV3StatsStyles.ts');
    const actionSource = readSource('src/components/UserDashboard/styles/DashboardV3ActionButtonStyles.ts');
    const bannerActionSource = readSource('src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts');
    const profilePhotoSource = readSource('src/components/UserDashboard/styles/DashboardV3ProfilePhotoStyles.ts');
    const uploadSource = readSource('src/components/UserDashboard/styles/DashboardV3ProfileLevelUploadStyles.ts');

    expectStyleBlockContains(bannerSource, 'ProfileHeader', 'pointer-events: none;');
    expectStyleBlockContains(identitySource, 'ProfileInfo', 'pointer-events: none;');
    expectStyleBlockContains(identitySource, 'UserRole', 'pointer-events: auto;');
    expectStyleBlockContains(statsSource, 'StatItem', 'pointer-events: auto;');
    expectStyleBlockContains(actionSource, 'PrimaryButton', 'pointer-events: auto;');
    expectStyleBlockContains(actionSource, 'SecondaryButton', 'pointer-events: auto;');
    expectStyleBlockContains(bannerActionSource, 'BannerRepositionButton', 'pointer-events: auto;');
    expectStyleBlockContains(bannerActionSource, 'BannerUploadButton', 'pointer-events: auto;');
    expectStyleBlockContains(profilePhotoSource, 'ProfileImageSection', 'pointer-events: none;');
    expectStyleBlockContains(uploadSource, 'ImageUploadButton', 'pointer-events: auto;');
  });

  it('keeps desktop observatory rails below the profile banner on non-home tabs', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ObservatoryShell.tsx');
    const leftRailSource = readSource('src/components/UserDashboard/components/ObservatoryLeftRail.tsx');
    const rightRailSource = readSource('src/components/UserDashboard/components/ObservatoryRightRail.tsx');
    const layoutSource = readSource('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');

    expect(dashboardSource).toContain("profileHeaderVisible={dashboard.activeTab !== 'home'}");
    expect(shellSource).toContain('profileHeaderVisible?: boolean;');
    expect(leftRailSource).toContain('$profileHeaderVisible={profileHeaderVisible}');
    expect(rightRailSource).toContain('$profileHeaderVisible={profileHeaderVisible}');
    expect(layoutSource).toContain('--observatory-profile-banner-clearance: 340px;');
    expect(layoutSource).toContain('margin-top: ${({ $profileHeaderVisible }) =>');
    expect(layoutSource).toContain('@media (min-width: 2560px)');
    expect(layoutSource).toContain('--observatory-profile-banner-clearance: 440px;');
    expect(layoutSource).toContain('@media (min-width: 3840px)');
    expect(layoutSource).toContain('--observatory-profile-banner-clearance: 540px;');
  });

  it('routes user dashboard workout actions through mounted role dashboards', () => {
    const touchedActionFiles = [
      'src/components/UserDashboard/components/HomeTab.tsx',
      'src/components/UserDashboard/components/DailyHealthLoop.tsx',
      'src/components/UserDashboard/components/ObservatoryShellAdapter.ts',
      'src/components/UserDashboard/components/SwanCoachDock.tsx',
      'src/components/UserDashboard/components/WorkoutsTab.tsx',
    ];
    const routeHelper = readSource('src/components/UserDashboard/components/swanCoachDashboardRoute.ts');

    expect(routeHelper).toContain('getLogWorkoutDashboardPath');
    expect(routeHelper).toContain('/log-workout');

    touchedActionFiles.forEach((file) => {
      const source = readSource(file);
      expect(source, `${file} must not navigate to the stale standalone workout route`)
        .not.toContain("navigate('/workout')");
      expect(source, `${file} must not use the removed admin sessions route`)
        .not.toContain('/dashboard/admin-sessions');
    });
  });

  it('includes monitor-class QHD and 4K layout breakpoints for the observatory shell', () => {
    const layoutSource = readSource('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
    const dashboardLayoutSource = readSource('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');

    expect(layoutSource).toContain('@media (min-width: 1920px)');
    expect(layoutSource).toContain('@media (min-width: 2560px)');
    expect(layoutSource).toContain('@media (min-width: 3840px)');
    expect(dashboardLayoutSource).toContain('@media (min-width: 1920px)');
    expect(dashboardLayoutSource).toContain('@media (min-width: 2560px)');
    expect(dashboardLayoutSource).toContain('@media (min-width: 3840px)');
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

  it('locks the accepted Open Design Home shell responsive and mobile nav rules', () => {
    const homeDataSource = readSource('src/components/UserDashboard/components/HomeTabVision.data.ts');
    const homeLayoutSource = readSource('src/components/UserDashboard/components/HomeTabVision.styles.ts');
    const cardStylesSource = readSource('src/components/UserDashboard/components/HomeTabVisionCards.styles.ts');
    const rightRailSource = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.tsx');
    const rightRailStylesSource = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.styles.ts');
    const sharedMobileNavSource = readSource('src/components/UserDashboard/components/ObservatoryMobileNav.tsx');

    expect(homeDataSource).toContain("{ id: 'progress', label: 'Progress'");
    expect(homeDataSource).not.toContain("{ id: 'inbox'");
    expect(homeDataSource).not.toContain('Mail,');
    expect(sharedMobileNavSource).toContain("onClick={() => onTabChange('progress')}");
    expect(sharedMobileNavSource).not.toContain('Four items');

    expect(homeLayoutSource).toContain('grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);');
    expect(homeLayoutSource).toContain('@media (max-width: 1500px) and (min-width: 1321px)');
    expect(homeLayoutSource).toContain('grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(300px, 340px);');
    expect(homeLayoutSource).toContain('@media (max-width: 1320px)');
    expect(homeLayoutSource).toContain('grid-column: 2;');

    expect(cardStylesSource).toContain('flex-wrap: wrap;');
    expect(cardStylesSource).toContain('min-width: min(100%, 7.6rem);');
    expect(cardStylesSource).toContain('text-overflow: ellipsis;');

    expect(rightRailSource).toContain('LeaderboardRow');
    expect(rightRailStylesSource).toContain('grid-template-columns: 26px minmax(0, 1fr) max-content;');
    expect(rightRailStylesSource).toContain('text-overflow: ellipsis;');
    expect(rightRailStylesSource).toContain('font-variant-numeric: tabular-nums;');
  });
});
