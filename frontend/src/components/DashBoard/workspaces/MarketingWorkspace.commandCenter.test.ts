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
    expect(calendarSource).not.toContain("title: 'X:");
    expect(calendarSource).not.toContain('Twitter');
  });

  it('keeps the active approval queue composer under the file-size rule', () => {
    approvalQueueSources.forEach(({ file, source }) => {
      const lineCount = source.split(/\r?\n/).length;
      expect(lineCount, `${file} has ${lineCount} lines`).toBeLessThanOrEqual(300);
    });
  });
});
