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
const LAYOUT_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.tsx',
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
const APPROVAL_QUEUE_FILES = [
  'SocialPostAccounts.tsx',
  'SocialPostComplianceResult.tsx',
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
  const layoutSource = readFileSync(LAYOUT_FILE, 'utf-8');
  const calendarSource = readFileSync(CALENDAR_FILE, 'utf-8');
  const calendarApiSource = readFileSync(CALENDAR_API_FILE, 'utf-8');
  const calendarStylesSource = readFileSync(CALENDAR_STYLES_FILE, 'utf-8');
  const socialAnalyticsSource = readFileSync(SOCIAL_ANALYTICS_FILE, 'utf-8');
  const socialPostGeneratorSource = readFileSync(SOCIAL_POST_GENERATOR_FILE, 'utf-8');
  const socialPostGeneratorConfigSource = readFileSync(SOCIAL_POST_GENERATOR_CONFIG_FILE, 'utf-8');
  const socialPostGeneratorStylesSource = readFileSync(SOCIAL_POST_GENERATOR_STYLES_FILE, 'utf-8');
  const adminSocialPublishingRoutesSource = readFileSync(ADMIN_SOCIAL_PUBLISHING_ROUTES_FILE, 'utf-8');
  const approvalQueueSources = APPROVAL_QUEUE_FILES.map(file => ({
    file,
    source: readFileSync(file, 'utf-8'),
  }));

  it('is mounted as the admin marketing route', () => {
    expect(layoutSource).toContain("path: '/marketing'");
    expect(layoutSource).toContain('component: MarketingWorkspace');
  });

  it('renders dashboard route-table paths relative to the active role route', () => {
    expect(layoutSource).toContain("path={path.replace(/^\\//, '')}");
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
    expect(calendarRuntimeSource).toContain("method: 'POST'");
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

  it('checks social-publishing health before reading integration data', () => {
    const analyticsHealthIndex = socialAnalyticsSource.indexOf(
      "fetch('/api/admin/social-publishing/health'",
    );
    const analyticsAccountsIndex = socialAnalyticsSource.indexOf(
      "fetch('/api/admin/social-publishing/accounts'",
    );
    const generatorHealthIndex = socialPostGeneratorSource.indexOf(
      "fetch('/api/admin/social-publishing/health'",
    );
    const generatorAccountsIndex = socialPostGeneratorSource.indexOf(
      "fetch('/api/admin/social-publishing/accounts'",
    );

    expect(analyticsHealthIndex).toBeGreaterThanOrEqual(0);
    expect(analyticsAccountsIndex).toBeGreaterThan(analyticsHealthIndex);
    expect(generatorHealthIndex).toBeGreaterThanOrEqual(0);
    expect(generatorAccountsIndex).toBeGreaterThan(generatorHealthIndex);
    expect(socialAnalyticsSource).toContain('if (!configured) return;');
    expect(socialPostGeneratorSource).toContain('if (!configured) return;');
  });

  it('tracks Nextdoor as a first-class marketing platform without routing it through Postiz OAuth', () => {
    expect(socialPostGeneratorConfigSource).toContain('nextdoor');
    expect(socialPostGeneratorConfigSource).toContain("name: 'Nextdoor'");
    expect(socialAnalyticsSource).toContain('nextdoor');
    expect(adminSocialPublishingRoutesSource).toContain("'nextdoor'");
    expect(adminSocialPublishingRoutesSource).toContain('NEXTDOOR_API');
  });
});
