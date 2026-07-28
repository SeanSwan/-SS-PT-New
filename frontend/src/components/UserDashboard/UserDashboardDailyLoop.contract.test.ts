import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  'src/components/UserDashboard/components/UserDashboardBannerCropControls.tsx',
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

  it('mounts the V3 Observatory at /user-dashboard (workstream N), never the client dashboard', () => {
    // Workstream N (2026-06-11, Sean's direction): the V3 Observatory IS the
    // main hub at /user-dashboard with URL-driven tabs; /social is a redirect
    // alias into it. The contract's original intent holds ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â the hub must
    // never collapse into the PT client dashboard.
    const routeSource = readSource('src/routes/main-routes.tsx');

    expect(routeSource).toMatch(/path: 'user-dashboard',\s*element: \(\s*<ProtectedRoute>/);
    expect(routeSource).toContain("path: 'user-dashboard/:tab'");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    // Workstream O: the feed tab folded into Home ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â /social lands on Home.
    expect(routeSource).toMatch(/path: 'social',\s*element: <Navigate to="\/user-dashboard" replace \/>/);
    expect(routeSource).toContain("path: 'social/posts/:postId'");
    expect(routeSource).toContain('<SocialPostRedirect />');
    expect(routeSource).toContain('<SocialTabRedirect />');
    expect(routeSource).not.toMatch(/path: 'user-dashboard',\s*element: <Navigate to="\/dashboard\/client\/overview" replace \/>/);
    // The retired social page ships no lazy chunk of its own.
    expect(routeSource).not.toContain("() => import('../pages/Social/SocialPage.V3')");
  });

  it('keeps user-dashboard navigation separate from the client training dashboard', () => {
    const selectorSource = readSource('src/components/DashboardSelector/DashboardSelector.tsx');
    const mobileMenuSource = readSource('src/components/Header/components/MobileMenu.tsx');
    const signupSource = readSource('src/pages/OptimizedSignupModal.tsx');
    const loginSource = readSource('src/pages/EnhancedLoginModal.tsx');
    const vipConversionSource = readSource('src/pages/gallery/VIPConversionModal.tsx');

    // Post-M7 the hub entry points target /user-dashboard directly (no redirect hop).
    expect(selectorSource).toContain("title: 'My Dashboard'");
    expect(selectorSource).toContain("path: '/user-dashboard'");
    expect(selectorSource).toContain("return ['admin', 'trainer', 'client', 'user'].includes(user.role);");
    expect(mobileMenuSource).toContain('to="/user-dashboard"');
    expect(signupSource).toContain("navigate('/user-dashboard')");
    // Login lands plain 'user' role on the hub, clients on the training dashboard.
    expect(loginSource).toContain('navigate("/user-dashboard")');
    expect(loginSource).toContain('navigate("/dashboard/client/overview")');
    expect(vipConversionSource).not.toContain("window.open('/user-dashboard/schedule'");
  });

  it('allows trainers to open the client training dashboard without making it the user dashboard', () => {
    const universalLayoutSource = readSource('src/components/DashBoard/UniversalDashboardLayout.tsx');

    expect(universalLayoutSource).toContain("userRole === 'trainer' && urlRole === 'client'");
    expect(universalLayoutSource).toContain("const userRole = rawRole === 'user' ? 'client' : rawRole;");
  });

  it('keeps Home as the daily return surface with the creator observatory and coach paths', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const controllerSource = readSource('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');

    expect(controllerSource).toContain("const [activeTab, setActiveTab] = useState<TabId>('home')");
    expect(dashboardSource).toContain("dashboard.activeTab === 'home'");
    expect(dashboardSource).toContain('<ObservatoryCoverHero');
    expect(dashboardSource).not.toContain('{!isHomeTab && (');
    expect(dashboardSource).toContain('<ContentWrapper data-user-dashboard-scroll-root $belowCover>');
    expect(tabsSource).toContain('<HomeTab onTabChange');
    expect(homeSource).toContain('data-testid="creator-observatory-home"');
    expect(homeSource).toContain('<HomeTabVisionCenter');
    expect(homeSource).toContain('<HomeDashboardSearchPanel');
    expect(homeSource).toContain("navigate('/dashboard/client/messages')");
    expect(homeSource).not.toContain('<ClientDashboardHome');
    expect(homeSource).not.toContain('ClientDashboardHomeTab');
    expect(homeSource).toContain('getPersonalLogWorkoutDashboardPath()');
    expect(homeSource).toContain('buildUserDashboardTeachCoachRoute(USER_HOME_TRAINING_PROMPT)');
  });
  it('keeps the premium client home honest with real data and no fabricated engagement', () => {
    const clientHomeTabSource = readSource('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.tsx');
    const sectionsSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.sections.tsx');
    const feedSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.feedSections.tsx');
    const viewModelSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.viewModel.ts');

    expect(clientHomeTabSource).toContain('buildLatestPostView(posts, Date.now())');
    expect(clientHomeTabSource).toContain('useMacroSummary()');
    expect(clientHomeTabSource).toContain('useCurrentClientWorkout(user?.id)');
    expect(clientHomeTabSource).toContain('useUpcomingClientSession(user?.id)');
    expect(shellSource).toContain('<ClientTopNavigation');
    expect(sectionsSource).toContain('UniversalThemeToggle');
    expect(feedSource).not.toContain('1.3K likes');
    expect(feedSource).not.toContain('86 comments');
    expect(feedSource).not.toContain('just now');
    expect(viewModelSource).toContain('return null');
  });
  it('uses one full-width cover system on Home and honors the sticky-carousel setting', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const centerSource = readSource('src/components/UserDashboard/components/HomeTabVisionCenter.tsx');
    const coverHookSource = readSource('src/components/UserDashboard/components/useHomeCoverBanner.tsx');

    expect(dashboardSource).toContain('<ObservatoryCoverHero');
    expect(centerSource).not.toContain('<HomeTabHeroHeader');
    expect(coverHookSource).toContain('bannerStickyCarousel={coverBanner.bannerStickyCarousel}');
    expect(coverHookSource).not.toContain('bannerStickyCarousel={false}');
  });
  it('keeps Quick Post, smart hashtag preview, and a tier-gated inbox poll on user Home', () => {
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');
    const composerSource = readSource('src/components/UserDashboard/components/useHomeComposer.ts');
    const queriesSource = readSource('src/hooks/useDashboardQueries.ts');

    expect(homeSource).toContain('useHomeComposer({');
    expect(composerSource).toContain('previewHomePostIntent(postText, activeMood)');
    expect(homeSource).toContain('postIntentPreview={composer.postIntentPreview}');
    expect(homeSource).toContain('onSubmitPost={composer.submitPost}');
    expect(queriesSource).toContain('options.enabled ?? true');
    expect(homeSource).toContain("enabled: isElite || user?.role === 'admin'");
  });
  it('puts real training proof from logged workouts on user Home, one tap from a shareable post (workstream N4)', () => {
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');
    const composerSource = readSource('src/components/UserDashboard/components/useHomeComposer.ts');

    expect(homeSource).toContain('useWorkoutSessions({ limit: 50 })');
    expect(homeSource).toContain('buildHomeTrainingProof(workoutSessions.data');
    expect(homeSource).toContain('<HomeTabTrainingProof');
    expect(homeSource).toContain('proof={trainingProof}');
    expect(homeSource).toContain('onShareProgress={composer.handleShareProgress}');
    expect(composerSource).toContain('setPendingProofSessionId(latestSessionId)');
    expect(composerSource).toContain('workoutSessionId: pendingProofSessionId');
  });
  it('mounts the premium client home inside the canonical client overview route', () => {
    const clientHomeSource = readSource('src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx');
    const clientHomeTabSource = readSource('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const dashboardSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.tsx');
    const layoutSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.layoutStyles.ts');

    expect(clientHomeSource).toContain("import ClientDashboardHomeTab from '../../../UserDashboard/components/ClientDashboardHomeTab'");
    expect(clientHomeSource).toContain('<ClientDashboardHomeTab');
    expect(clientHomeSource).toContain('embedded');
    expect(clientHomeSource).toContain("progress: '/dashboard/client/progress'");
    expect(clientHomeSource).toContain("nutrition: '/dashboard/client/meal-planner'");
    expect(clientHomeSource).not.toContain('ClientObservatoryHome');
    expect(clientHomeSource).not.toContain('components/HomeTab');
    expect(clientHomeTabSource).toContain('<ClientDashboardHome');
    expect(dashboardSource).toContain('{!embedded && <ClientSidebar');
    expect(layoutSource).toContain('grid-template-columns: ${({ $embedded }) => ($embedded ?');
    expect(layoutSource).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(layoutSource).toContain('overflow-x: auto;');
    expect(layoutSource).toContain('gap: 6px;');
    expect(layoutSource).toContain('width: 44px;');
    expect(layoutSource).toContain('height: 44px;');
    expect(layoutSource).toContain('padding: 0;');
    expect(layoutSource).toContain('flex: 0 0 auto;');
    expect(layoutSource).toContain('flex: 0 0 44px;');
    expect(layoutSource).toContain('justify-content: center;');
  });

  it('keeps Social Hub off the client dashboard implementation', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');
    const observatoryDataSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData.ts');

    expect(routeSource).toContain("path: 'social'");
    expect(routeSource).toContain("() => import('../components/UserDashboard/UserDashboard.V3')");
    expect(routeSource).not.toContain("() => import('../components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryHome')");
    expect(observatoryDataSource).toContain("export type LensId = 'feed' | 'reels' | 'friends' | 'challenges'");
    expect(observatoryDataSource).toContain("{ id: 'feed', label: 'Feed'");
    expect(observatoryDataSource).toContain("{ id: 'reels', label: 'Reels'");
    expect(observatoryDataSource).toContain("{ id: 'friends', label: 'Friends'");
    expect(observatoryDataSource).toContain("{ id: 'challenges', label: 'Challenges'");
  });

  it('keeps client observatory lenses inside the client dashboard instead of reopening Social Hub', () => {
    const universalLayoutRoutesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const observatoryDataSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData.ts');
    const observatoryHomeSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryHome.tsx');

    expect(universalLayoutRoutesSource).toContain("path: '/overview/:tab'");
    expect(observatoryHomeSource).toContain("const lensFromRoute = (tab?: string): LensId =>");

    expect(observatoryDataSource).toContain("path: '/dashboard/client/overview'");
    expect(observatoryDataSource).toContain("path: '/dashboard/client/overview/reels'");
    expect(observatoryDataSource).toContain("path: '/dashboard/client/overview/friends'");
    expect(observatoryDataSource).toContain("path: '/dashboard/client/overview/challenges'");
    expect(observatoryDataSource).not.toContain("path: '/social'");
    expect(observatoryDataSource).not.toContain("path: '/social/");
  });

  it('keeps client observatory feed controls from duplicating the same community destination', () => {
    const observatoryDataSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryData.ts');
    const observatoryFeedSource = readSource('src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryFeed.tsx');

    expect(observatoryDataSource).not.toContain("{ label: 'Community'");
    expect(observatoryFeedSource).not.toContain("Open Feed");
    expect(observatoryFeedSource).not.toContain("View All");
    expect(observatoryFeedSource).not.toContain("Create More");
    expect(observatoryFeedSource).not.toContain("onNavigate('/dashboard/client/community')");
  });

  it('keeps every phone tab reachable in the bottom bar via snap scrolling (O3 supersedes the wrap-grid)', () => {
    const stylesSource = readSource('src/components/UserDashboard/styles/DashboardV3NavigationStatusStyles.ts');

    // O3: the <=430px wrap-grid retired with the fixed bottom bar ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â tabs are
    // a snap-scrolling row, so no entry can be clipped or orphaned.
    expect(stylesSource).toContain('scroll-snap-type: x proximity');
    expect(stylesSource).toContain('overscroll-behavior-x: contain');
    expect(stylesSource).toContain('scroll-snap-align: start');
    expect(stylesSource).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
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

  it('keeps every mounted UserDashboard V3 tab reachable from navigation (N5 compacted model)', () => {
    const tabBarSource = readSource('src/components/UserDashboard/components/UserDashboardTabBarV3.tsx');
    const adapterSource = readSource('src/components/UserDashboard/components/ObservatoryShellAdapter.ts');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const lensesSource = readSource('src/components/UserDashboard/components/UserDashboardStudioLenses.tsx');
    const controllerSource = readSource('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');

    // Bar/rail entries ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Creative's id is 'creative' (the group's landing lens).
    // Workstream O: 'feed' left the bar (panel unmounted; Home absorbed it).
    const barTabs = ['home', 'progress', 'reels', 'friends', 'challenges', 'notifications', 'nutrition', 'photos', 'creative'];
    barTabs.forEach((tabId) => {
      expect(tabsSource, `${tabId} panel must exist before navigation can expose it`)
        .toContain(`<TabPanel id="${tabId}"`);
      expect(tabBarSource, `${tabId} must be reachable from sticky tab navigation`)
        .toContain(`id: '${tabId}'`);
      expect(adapterSource, `${tabId} must be reachable from desktop observatory rail`)
        .toContain(`id: '${tabId}'`);
    });

    // Creative lenses are reachable via the in-panel strip.
    ['about', 'activity'].forEach((tabId) => {
      expect(tabsSource, `${tabId} panel must exist`).toContain(`<TabPanel id="${tabId}"`);
      expect(lensesSource, `${tabId} must be reachable from the Creative lens strip`)
        .toContain(`id: '${tabId}'`);
    });

    // Profile panel is reachable via the Settings flow.
    expect(tabsSource).toContain('<TabPanel id="profile"');
    expect(controllerSource).toContain("setActiveTab('profile')");

    // Community is unmounted (duplicate launcher) ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â no orphan panel.
    expect(tabsSource).not.toContain('<TabPanel id="community"');

    // Feed is unmounted (workstream O ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â duplicated Home; Faction War moved
    // to the Home right rail) ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â no orphan panel, no stale nav entries.
    expect(tabsSource).not.toContain('<TabPanel id="feed"');
    expect(tabBarSource).not.toContain("id: 'feed'");
    expect(adapterSource).not.toContain("id: 'feed'");
  });

  it('compacts the tab bar to the Creative group without breaking deep links (workstream N5)', () => {
    const tabBarSource = readSource('src/components/UserDashboard/components/UserDashboardTabBarV3.tsx');
    const adapterSource = readSource('src/components/UserDashboard/components/ObservatoryShellAdapter.ts');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const leftRailSource = readSource('src/components/UserDashboard/components/ObservatoryLeftRail.tsx');

    // One Creative entry replaces Creative/Photos/About/Activity in BOTH navs.
    [tabBarSource, adapterSource].forEach((source) => {
      expect(source).toContain("label: 'Creative'");
      expect(source).toContain('matches: STUDIO_TAB_IDS');
      expect(source).toContain("label: 'Photos'");
      expect(source).not.toContain("label: 'About'");
      expect(source).not.toContain("label: 'Activity'");
      // Profile (Settings flow) and Community leave the bar but keep panels.
      expect(source).not.toContain("id: 'profile'");
      expect(source).not.toContain("id: 'community'");
    });
    // Grouped active state highlights Creative for every lens.
    expect(tabBarSource).toContain('matches.includes(activeTab)');
    expect(leftRailSource).toContain('matches.includes(activeTab)');
    // Every lens + the Settings-flow profile keep their panels (URL-routable).
    ['creative', 'photos', 'about', 'activity', 'profile'].forEach((id) => {
      expect(tabsSource).toContain(`<TabPanel id="${id}"`);
    });
    // The three Creative/profile panels carry the in-panel lens strip; Photos stands alone.
    expect(tabsSource.match(/<StudioLenses activeTab={activeTab} onTabChange={onTabChange} \/>/g)).toHaveLength(3);
  });

  it('keeps Progress immediately after Home in user-dashboard navigation', () => {
    const tabBarSource = readSource('src/components/UserDashboard/components/UserDashboardTabBarV3.tsx');
    const adapterSource = readSource('src/components/UserDashboard/components/ObservatoryShellAdapter.ts');

    expect(tabBarSource.indexOf("id: 'home'")).toBeLessThan(tabBarSource.indexOf("id: 'progress'"));
    expect(tabBarSource.indexOf("id: 'progress'")).toBeLessThan(tabBarSource.indexOf("id: 'reels'"));
    expect(adapterSource.indexOf("id: 'home'")).toBeLessThan(adapterSource.indexOf("id: 'progress'"));
    expect(adapterSource.indexOf("id: 'progress'")).toBeLessThan(adapterSource.indexOf("id: 'reels'"));
  });

  it('puts the REAL scrolling community feed on Home with full interactions (workstream O2)', () => {
    const centerSource = readSource('src/components/UserDashboard/components/HomeTabVisionCenter.tsx');
    const feedSource = readSource('src/components/UserDashboard/components/HomeCommunityFeed.tsx');
    const queriesSource = readSource('src/hooks/useDashboardQueries.ts');

    // Home's center column mounts the community feed (lazy) and the old
    // single latest-post card is gone (the feed's first posts replace it).
    expect(centerSource).toContain("lazy(() => import('./HomeCommunityFeed'))");
    expect(centerSource).toContain('<HomeCommunityFeed');
    expect(centerSource).toContain('feed={communityFeed}');
    expect(centerSource).toContain('focus={feedFocus}');
    expect(centerSource).toContain('onClearFocus={onClearFeedFocus}');
    expect(centerSource).not.toContain('Your first post will land here');

    // O3 unification: HomeTab owns the ONE stateful feed mount; the stream
    // component is presentational (no duplicate fetch on Home).
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');
    expect(homeSource).toContain("import { useSocialFeed } from '../../../hooks/social/useSocialFeed'");
    expect(homeSource).not.toContain('useSocialFeed({ limit: 4 })');
    expect(feedSource).toContain("import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed'");
    expect(feedSource).toContain("import PostCard from '../../Social/Feed/PostCard'");
    expect(feedSource).toContain('InfiniteScrollSentinel');
    expect(feedSource).toContain('IntersectionObserver');
    // Full interaction surface, honest empty/error states.
    expect(feedSource).toContain('onReact={feed.reactToPost}');
    expect(feedSource).toContain('onComment={feed.addComment}');
    expect(feedSource).toContain('EmptyFeedWelcome');
    expect(feedSource).toContain('Try again');
    expect(feedSource).toContain('HomeFeedFocusBanner');
    expect(feedSource).toContain('useHomeFeedFocusPosts(focus, feed)');

    // Quick Post publishes ride the cross-surface event so the stateful feed
    // refreshes instantly (react-query invalidation cannot reach it).
    expect(queriesSource).toContain("window.dispatchEvent(new Event('swan:social-post-created'))");
  });

  it('marks coach presence on posts AND comments, and loads real comment threads (workstream O3)', () => {
    const headerSource = readSource('src/components/Social/Feed/components/PostHeader.tsx');
    const commentsSource = readSource('src/components/Social/Feed/components/PostComments.tsx');
    const typesSource = readSource('src/components/Social/Feed/types/PostCardTypes.ts');
    const cardSource = readSource('src/components/Social/Feed/PostCard.tsx');
    const hookSource = readSource('src/hooks/social/useSocialFeed.ts');
    const feedSource = readSource('src/components/UserDashboard/components/HomeCommunityFeed.tsx');

    // Trainers AND the admin owner read as coaches (Sean's mandate: members
    // must SEE a coach is present and able to answer questions).
    expect(typesSource).toContain("role === 'trainer' || role === 'admin'");
    expect(headerSource).toContain('isCoachRole(post.user.role)');
    expect(headerSource).toContain('<CoachChip');
    expect(commentsSource).toContain('isCoachRole(comment.user.role)');
    expect(commentsSource).toContain('<CoachChip');

    // Comment threads LOAD on first open ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â feed payloads carry counts only,
    // so coach answers would otherwise never render.
    expect(hookSource).toContain('const loadComments = useCallback(async (postId: string)');
    expect(hookSource).toContain('const getPostsByHashtag = useCallback(async (hashtag: string');
    expect(cardSource).toContain('onLoadComments');
    expect(cardSource).toContain('post.commentsCount > 0');
    expect(feedSource).toContain('onLoadComments={feed.loadComments}');
  });

  it('keeps premium client home momentum cards driven by real session, level, and streak data', () => {
    const clientHomeTabSource = readSource('src/components/UserDashboard/components/ClientDashboardHomeTab.tsx');
    const viewModelSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.viewModel.ts');
    const sectionsSource = readSource('src/components/UserDashboard/components/ClientDashboardHome.sections.tsx');

    expect(clientHomeTabSource).toContain('buildInsights(trainingProof, progressPercent, streakDays)');
    expect(clientHomeTabSource).toContain('buildPerformanceScore(trainingProof, progressPercent, streakDays)');
    expect(viewModelSource).toContain('proof.weeklyCounts');
    expect(viewModelSource).toContain('Math.min(streakDays, 30)');
    expect(sectionsSource).toContain('Day Streak');
  });
  it('ships the phone app-shell: fixed bottom nav on every dashboard surface (workstream O3)', () => {
    const navStyles = readSource('src/components/UserDashboard/styles/DashboardV3NavigationStatusStyles.ts');
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const wrapperSource = readSource('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');
    const centerSource = readSource('src/components/UserDashboard/components/HomeTabVisionCenter.tsx');

    // Phones: the tab strip pins to the BOTTOM with safe-area clearance.
    expect(navStyles).toMatch(/@media \(max-width: 768px\) \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;/);
    expect(navStyles).toContain('env(safe-area-inset-bottom');
    expect(wrapperSource).toContain('env(safe-area-inset-bottom');
    // Home mounts the bar too ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â same nav on every dashboard surface.
    expect(dashboardSource.match(/<UserDashboardTabBarV3/g)?.length).toBe(2);
    // Top-bar actions with a destination navigate; no dead buttons.
    expect(centerSource).toContain('onClick={target ? () => onUtilityAction(target) : undefined}');
  });

  it('gives the party squad widgets a real home on the Challenges tab (workstream O2)', () => {
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const partySource = readSource('src/components/UserDashboard/components/DashboardChallengesParty.tsx');

    expect(tabsSource).toContain('<DashboardChallengesParty />');
    expect(partySource).toContain("import { useParty } from '../../../hooks/social/useParty'");
    expect(partySource).toContain('<PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} />');
    expect(partySource).toContain('<PartyCreateJoin onCreate={createParty} onJoin={joinParty} />');
  });

  it('keeps shared role-dashboard workspaces independent from UserDashboard-only chrome', () => {
    const nutritionWorkspaceSource = readSource('src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');

    expect(nutritionWorkspaceSource).not.toContain('UserDashboardSectionChrome.styles');
    expect(nutritionWorkspaceSource).not.toContain('visionPanelCss');
    expect(nutritionWorkspaceSource).not.toContain('visionCardCss');
    expect(tabsSource).toContain('<SectionChrome id="nutrition">');
    expect(tabsSource).toContain('<NutritionWorkspace />');
  });

  it('keeps local Vite dev reachable from loopback and phone/LAN QA devices', () => {
    const viteConfigSource = readSource('vite.config.ts');

    expect(viteConfigSource).toContain("host: '0.0.0.0'");
    expect(viteConfigSource).not.toContain("host: '127.0.0.1'");
  });

  it('uses a dashboard-framed Reels viewer inside UserDashboard instead of standalone full-screen assumptions', () => {
    const tabsSource = readSource('src/components/UserDashboard/components/UserDashboardTabsV3.tsx');
    const reelsSource = readSource('src/components/Social/Reels/VerticalReels.tsx');
    const reelsStylesSource = readSource('src/components/Social/Reels/VerticalReels.styles.ts');

    expect(tabsSource).toContain('<VerticalReels frame="dashboard" />');
    expect(reelsSource).toContain("frame?: 'standalone' | 'dashboard'");
    expect(reelsStylesSource).toContain('$frame: ReelsFrame');
    expect(reelsStylesSource).toContain("$frame === 'dashboard'");
  });

  it('puts the full-width cover hero at the top of every user-dashboard tab with no rail clearance hacks', () => {
    const dashboardSource = readSource('src/components/UserDashboard/UserDashboard.V3.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ObservatoryShell.tsx');
    const coverHeroSource = readSource('src/components/UserDashboard/components/ObservatoryCoverHero.tsx');
    const coverHeroStylesSource = readSource('src/components/UserDashboard/components/ObservatoryCoverHero.styles.ts');
    const layoutSource = readSource('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
    const wrapperSource = readSource('src/components/UserDashboard/styles/DashboardV3LayoutStyles.ts');

    // The cover hero mounts ABOVE ContentWrapper (true edge-to-edge, normal
    // flow) and the retired full-bleed ProfileHeader is gone from the shell.
    expect(dashboardSource).not.toContain('{!isHomeTab && (');
    expect(dashboardSource).toContain('<ObservatoryCoverHero');
    expect(dashboardSource).not.toContain('UserDashboardProfileHeaderV3');
    expect(dashboardSource).toContain('<ContentWrapper data-user-dashboard-scroll-root $belowCover>');
    expect(wrapperSource).toContain('$belowCover');

    // One cover system: the hero reuses Home's media-layer + embedded editor.
    expect(coverHeroSource).toContain('useHomeCoverBanner(dashboardBackgroundControls)');
    expect(coverHeroSource).toContain('aria-label="Edit cover"');
    expect(coverHeroSource).toContain('aria-label="Edit profile"');
    // Settings is the ONLY entry into the profile panel (N5 contract) ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â the
    // hero must keep carrying it now that the old header is unmounted.
    expect(coverHeroSource).toContain('aria-label="Open settings"');
    expect(dashboardSource).toContain('onSettings={dashboard.handleSettings}');
    expect(coverHeroSource).toContain('aria-label="Share profile"');
    expect(coverHeroSource).toContain('aria-label="Change profile photo"');
    expectStyleBlockContains(coverHeroStylesSource, 'CoverAvatarButton', 'width: clamp(112px, 8vw, 152px);');
    expectStyleBlockContains(coverHeroStylesSource, 'CoverAvatarButton', '@media (max-width: 768px)');

    // The rail clearance machinery is retired with the overlay banner.
    expect(shellSource).not.toContain('profileHeaderVisible');
    expect(layoutSource).not.toContain('$profileBannerClearance');
    expect(layoutSource).not.toContain('$profileHeaderVisible');
    expect(layoutSource).toContain('@media (min-width: 2560px)');
    expect(layoutSource).toContain('@media (min-width: 3840px)');
  });

  it('uses the real SwanStudios logo for the observatory rail brand mark', () => {
    const leftRailSource = readSource('src/components/UserDashboard/components/ObservatoryLeftRail.tsx');
    const leftRailStylesSource = readSource('src/components/UserDashboard/styles/ObservatoryLeftRailStyles.ts');

    expect(leftRailSource).toContain("import brandLogo from '../../../assets/Logo.png'");
    expect(leftRailSource).toContain('<img src={brandLogo} alt="" aria-hidden="true" />');
    expect(leftRailSource).not.toContain('Sparkles size={18}');
    expectStyleBlockContains(leftRailStylesSource, 'LeftRailBrandMark', '& img');
    expectStyleBlockContains(leftRailStylesSource, 'LeftRailBrandMark', 'object-fit: contain;');
  });

  it('uses non-blocking toast feedback for user-dashboard profile sharing', () => {
    const controllerSource = readSource('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');

    expect(controllerSource).toContain("import { useToast } from '../../../hooks/use-toast'");
    expect(controllerSource).toContain('const { toast } = useToast();');
    expect(controllerSource).toContain("user?.id ? `${window.location.origin}/profile/${user.id}` : window.location.href");
    expect(controllerSource).toContain('if (!navigator.clipboard?.writeText)');
    expect(controllerSource).toContain("title: 'Profile link copied'");
    expect(controllerSource).not.toContain('alert(');
    expect(controllerSource).not.toContain('/profile/${user?.id}');
  });

  it('routes user dashboard workout actions through mounted role dashboards', () => {
    const touchedActionFiles = [
      'src/components/UserDashboard/components/HomeTab.tsx',
      'src/components/UserDashboard/components/ClientDashboardHomeTab.tsx',
      'src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx',
      'src/components/UserDashboard/components/DailyHealthLoop.tsx',
      'src/components/UserDashboard/components/ObservatoryShellAdapter.ts',
      'src/components/UserDashboard/components/SwanCoachDock.tsx',
      'src/components/UserDashboard/components/WorkoutsTab.tsx',
    ];
    const routeHelper = readSource('src/components/UserDashboard/components/swanCoachDashboardRoute.ts');

    expect(routeHelper).toContain('getLogWorkoutDashboardPath');
    expect(routeHelper).toContain('getPersonalLogWorkoutDashboardPath');
    expect(routeHelper).toContain('/dashboard/admin/client-management?intent=log_workout');
    expect(routeHelper).toContain('/dashboard/trainer/clients?intent=log_workout');
    expect(routeHelper).toContain('/dashboard/client/log-workout');
    expect(readSource('src/components/UserDashboard/components/HomeTab.tsx'))
      .toContain('getPersonalLogWorkoutDashboardPath()');
    expect(readSource('src/components/UserDashboard/components/WorkoutsTab.tsx'))
      .toContain('getPersonalLogWorkoutDashboardPath()');

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
      'src/components/UserDashboard/components/ClientDashboardHomeTab.tsx',
      'src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx',
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
    const homeSource = readSource('src/components/UserDashboard/components/HomeTab.tsx');
    const homeLayoutSource = readSource('src/components/UserDashboard/components/HomeTabVision.styles.ts');
    const homeHeroSource = readSource('src/components/UserDashboard/components/HomeTabVisionHero.styles.ts');
    const cardStylesSource = readSource('src/components/UserDashboard/components/HomeTabVisionCards.styles.ts');
    const leftRailSource = readSource('src/components/UserDashboard/components/HomeTabVisionLeftRail.tsx');
    const shellSource = readSource('src/components/UserDashboard/components/ObservatoryShell.tsx');
    const observatoryRightRailSource = readSource('src/components/UserDashboard/components/ObservatoryRightRail.tsx');
    const swanCoachDockSource = readSource('src/components/UserDashboard/components/SwanCoachDock.tsx');
    const swanCoachLauncherSource = readSource('src/components/UserDashboard/components/SwanCoachActionLauncher.tsx');
    const rightRailSource = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.tsx');
    const rightRailStylesSource = readSource('src/components/UserDashboard/components/HomeTabVisionRightRail.styles.ts');
    const retiredMobileNavPath = resolve(process.cwd(), 'src/components/UserDashboard/components/ObservatoryMobileNav.tsx');

    expect(homeDataSource).not.toContain('QUICK_ACTIONS');
    expect(homeDataSource).not.toContain('MOBILE_NAV_ITEMS');
    expect(homeDataSource).not.toContain("{ id: 'inbox'");
    expect(homeDataSource).not.toContain('Mail,');
    expect(homeSource).not.toContain('Use the desktop rail');
    expect(leftRailSource).not.toContain('Create Post');
    expect(shellSource).not.toContain('ObservatoryMobileNav');
    expect(observatoryRightRailSource).not.toContain('Next Best Action');
    expect(swanCoachDockSource).not.toContain("label: 'Log Workout'");
    expect(swanCoachDockSource).not.toContain("label: 'View Progress'");
    expect(swanCoachLauncherSource).not.toContain('Progress</SecondaryButton>');
    expect(existsSync(retiredMobileNavPath)).toBe(false);
    expect(homeHeroSource).toContain('display: none;');
    expect(homeHeroSource).toContain('@media (max-width: 1023px)');

    expect(homeLayoutSource).toContain('grid-template-columns: minmax(216px, 260px) minmax(0, 1fr) minmax(300px, 380px);');
    expect(homeLayoutSource).toContain('@media (max-width: 1500px) and (min-width: 1321px)');
    expect(homeLayoutSource).toContain('grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(300px, 340px);');
    expect(homeLayoutSource).toContain('@media (max-width: 1320px)');
    expect(homeLayoutSource).toContain('grid-column: 2;');

    expect(cardStylesSource).toContain('flex-wrap: wrap;');
    expect(cardStylesSource).toContain('min-width: min(100%, 7.6rem);');
    expect(cardStylesSource).toContain('text-overflow: ellipsis;');

    expect(rightRailSource).toContain('HomePhotoLibraryPreview');
    expect(rightRailSource).toContain('LeaderboardRow');
    expect(rightRailStylesSource).toContain('grid-template-columns: 26px minmax(0, 1fr) max-content;');
    expect(rightRailStylesSource).toContain('text-overflow: ellipsis;');
    expect(rightRailStylesSource).toContain('font-variant-numeric: tabular-nums;');
  });
});
