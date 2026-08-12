import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKSPACE_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'MarketingWorkspace.tsx',
);
const DASHBOARD_ROUTES_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.routes.tsx',
);
const DASHBOARD_SHELL_PIECES_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.shellPieces.tsx',
);
const CALENDAR_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'MarketingCalendar.tsx',
);
const CALENDAR_API_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'MarketingCalendar.api.ts',
);
const CALENDAR_STYLES_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'MarketingCalendar.styles.ts',
);
const SOCIAL_ANALYTICS_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'SocialAnalyticsDashboard.tsx',
);
const SOCIAL_POST_GENERATOR_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'SocialPostGenerator.tsx',
);
const SOCIAL_CONNECT_PANEL_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'SocialConnectPanel.tsx',
);
const SOCIAL_POST_GENERATOR_CONFIG_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'SocialPostGenerator.config.ts',
);
const SOCIAL_POST_GENERATOR_STYLES_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'workspaces',
  'marketing',
  'SocialPostGenerator.styles.ts',
);
const ADMIN_SOCIAL_PUBLISHING_ROUTES_FILE = join(
  REPO_ROOT,
  'backend',
  'routes',
  'adminSocialPublishingRoutes.mjs',
);
const NATIVE_SOCIAL_PUBLISHING_SERVICE_FILE = join(
  REPO_ROOT,
  'backend',
  'services',
  'nativeSocialPublishingService.mjs',
);
const SOCIAL_PROVIDER_CAPABILITIES_FILE = join(
  REPO_ROOT,
  'backend',
  'services',
  'socialProviderCapabilities.mjs',
);
const APPROVAL_QUEUE_FILES = [
  'SocialPostAccounts.tsx',
  'SocialPostComplianceResult.tsx',
  'SocialConnectPanel.tsx',
  'SocialPostGenerator.config.ts',
  'SocialPostGenerator.styles.ts',
  'SocialPostGenerator.tsx',
  'SocialPostGenerator.types.ts',
  'SocialPostPreview.styles.ts',
  'SocialPostPreview.tsx',
].map(fileName =>
  join(
    REPO_ROOT,
    'frontend',
    'src',
    'components',
    'DashBoard',
    'workspaces',
    'marketing',
    fileName,
  ),
);

describe('MarketingWorkspace command-center contract', () => {
  const workspaceSource = readFileSync(WORKSPACE_FILE, 'utf-8');
  const dashboardRoutesSource = readFileSync(DASHBOARD_ROUTES_FILE, 'utf-8');
  const dashboardShellPiecesSource = readFileSync(DASHBOARD_SHELL_PIECES_FILE, 'utf-8');
  const calendarSource = readFileSync(CALENDAR_FILE, 'utf-8');
  const calendarApiSource = readFileSync(CALENDAR_API_FILE, 'utf-8');
  const calendarStylesSource = readFileSync(CALENDAR_STYLES_FILE, 'utf-8');
  const socialAnalyticsSource = readFileSync(SOCIAL_ANALYTICS_FILE, 'utf-8');
  const socialConnectPanelSource = readFileSync(SOCIAL_CONNECT_PANEL_FILE, 'utf-8');
  const socialPostGeneratorSource = readFileSync(SOCIAL_POST_GENERATOR_FILE, 'utf-8');
  const socialPostGeneratorConfigSource = readFileSync(SOCIAL_POST_GENERATOR_CONFIG_FILE, 'utf-8');
  const socialPostGeneratorStylesSource = readFileSync(SOCIAL_POST_GENERATOR_STYLES_FILE, 'utf-8');
  const adminSocialPublishingRoutesSource = readFileSync(ADMIN_SOCIAL_PUBLISHING_ROUTES_FILE, 'utf-8');
  const nativeSocialPublishingServiceSource = readFileSync(NATIVE_SOCIAL_PUBLISHING_SERVICE_FILE, 'utf-8');
  const socialProviderCapabilitiesSource = readFileSync(SOCIAL_PROVIDER_CAPABILITIES_FILE, 'utf-8');
  const approvalQueueSources = APPROVAL_QUEUE_FILES.map(file => ({
    file,
    source: readFileSync(file, 'utf-8'),
  }));
  const nativePublishingSource = `${socialAnalyticsSource}\n${socialConnectPanelSource}`;

  it('is mounted as the admin marketing route', () => {
    expect(dashboardRoutesSource).toContain("{ path: '/marketing', component: MarketingWorkspace");
  });

  it('renders dashboard route-table paths relative to the active role route', () => {
    expect(dashboardShellPiecesSource).toContain("path={path.replace(/^\\//, '')}");
  });

  it('keeps the top-level command-center workflow to five operational views', () => {
    expect(workspaceSource).toContain("label: 'Overview'");
    expect(workspaceSource).toContain("label: 'Approval Queue'");
    expect(workspaceSource).toContain("label: 'Calendar'");
    expect(workspaceSource).toContain("label: 'Leads'");
    expect(workspaceSource).toContain("label: 'Analytics'");
    expect(workspaceSource).toContain('Marketing Command Center');
  });

  it('does not promote secondary content ops tools into top-level tabs', () => {
    expect(workspaceSource).not.toContain('SEOAuditPanel');
    expect(workspaceSource).not.toContain('KeywordResearchWidget');
    expect(workspaceSource).not.toContain('CompetitorAnalysisWidget');
    expect(workspaceSource).not.toContain('BlogWriterPanel');
    expect(workspaceSource).not.toContain('EmailDigestBuilder');
  });

  it('does not keep X/Twitter demo items in the command-center calendar', () => {
    expect(calendarSource).not.toContain('DEMO_EVENTS');
    expect(calendarSource).not.toContain("title: 'X:");
    expect(calendarSource).not.toContain('Twitter');
  });

  it('wires the active calendar to persisted Marketing API data with PT advisories', () => {
    const calendarRuntimeSource = `${calendarSource}\n${calendarApiSource}`;
    expect(calendarRuntimeSource).toContain('/api/admin/marketing-calendar');
    expect(calendarRuntimeSource).toContain('apiService.post(API_PATH, payload)');
    expect(calendarRuntimeSource).toContain('apiService.put(`${API_PATH}/${id}`, payload)');
    expect(calendarSource).toContain('advisories');
    expect(calendarSource).toContain('personal_training');
    expect(calendarSource).toContain('Keep as-is');
  });

  it('keeps the active approval queue composer under the file-size rule', () => {
    approvalQueueSources.forEach(({ file, source }) => {
      const lineCount = source.split(/\r?\n/).length;
      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps hashtag chips at the touch-target minimum', () => {
    const hashtagChipBlock = socialPostGeneratorStylesSource.match(
      /export const HashtagChip[\s\S]*?`;/,
    )?.[0];

    expect(hashtagChipBlock).toContain('min-height: 44px');
  });

  it('keeps calendar channel filters at the touch-target minimum', () => {
    const filterChipBlock = calendarStylesSource.match(/export const FilterChip[\s\S]*?`;/)?.[0];

    expect(filterChipBlock).toContain('min-height: 44px');
  });

  it('checks native social-publishing health before reading account data', () => {
    const analyticsHealthIndex = socialAnalyticsSource.indexOf(
      "apiService.get('/api/admin/social-publishing/health'",
    );
    const analyticsAccountsIndex = socialAnalyticsSource.indexOf(
      "apiService.get('/api/admin/social-publishing/accounts'",
    );
    const generatorHealthIndex = socialPostGeneratorSource.indexOf(
      "apiService.get('/api/admin/social-publishing/health'",
    );
    const generatorAccountsIndex = socialPostGeneratorSource.indexOf(
      "apiService.get('/api/admin/social-publishing/accounts'",
    );

    expect(analyticsHealthIndex).toBeGreaterThanOrEqual(0);
    expect(analyticsAccountsIndex).toBeGreaterThan(analyticsHealthIndex);
    expect(generatorHealthIndex).toBeGreaterThanOrEqual(0);
    expect(generatorAccountsIndex).toBeGreaterThan(generatorHealthIndex);
    expect(socialAnalyticsSource).toContain('healthData.data?.mode === \'native\'');
    expect(socialPostGeneratorSource).toContain('healthData.data?.mode === \'native\'');
  });

  it('uses SwanStudios native publishing instead of requiring Postiz in the UI', () => {
    const approvalQueueSource = approvalQueueSources.map(item => item.source).join('\n');
    const nativeUiSource = `${approvalQueueSource}\n${socialConnectPanelSource}`;
    expect(nativeUiSource).toContain('Native social publishing');
    expect(nativeUiSource).not.toContain('Postiz not configured');
    expect(nativeUiSource).not.toContain('Connect accounts via Postiz');
  });

  it('supports native Bluesky connection and provider-gated Nextdoor readiness', () => {
    expect(socialPostGeneratorConfigSource).toContain('nextdoor');
    expect(socialPostGeneratorConfigSource).toContain("name: 'Nextdoor'");
    expect(nativePublishingSource).toContain("apiService.post('/api/admin/social-publishing/connect/bluesky'");
    expect(nativePublishingSource).toContain('apiService.post(`/api/admin/social-publishing/connect/${platform}`)');
    expect(nativePublishingSource).toContain('appPassword');
    expect(nativePublishingSource).toContain('nextdoor');
    expect(adminSocialPublishingRoutesSource).toContain('PROVIDER_CAPABILITIES');
    // RE-ANCHORED: the provider matrix moved to its own module when the publish
    // -truth fixes pushed nativeSocialPublishingService past the 300-line rule.
    // The assertion follows the config to its new home; the service must still
    // RE-EXPORT it, which is checked below, so the public API this test really
    // cares about is pinned more tightly than before rather than less.
    expect(socialProviderCapabilitiesSource).toContain("id: 'nextdoor'");
    expect(socialProviderCapabilitiesSource).toContain('partner_required');
    expect(nativeSocialPublishingServiceSource)
      .toContain("export { PROVIDER_CAPABILITIES } from './socialProviderCapabilities.mjs'");
  });

  it('returns immediate native publish results instead of only scheduled-job data', () => {
    expect(adminSocialPublishingRoutesSource).toContain('data: result.data || result');
  });
});
