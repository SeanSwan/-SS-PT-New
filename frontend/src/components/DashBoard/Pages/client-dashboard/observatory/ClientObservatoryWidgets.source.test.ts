import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (path: string): string => readFileSync(resolve(__dirname, path), 'utf8');

const SOURCE = readSource('./ClientObservatoryWidgets.tsx');
const PREVIEW_SOURCE = readSource('./ClientObservatoryWidgets.preview.ts');
const DASHBOARD_ROUTE_COMPONENTS_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const DASHBOARD_ROUTES_SOURCE = readFileSync(
  resolve(__dirname, '../../../UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const CLIENT_HOME_SOURCE = readSource('../ClientHomeTab.tsx');
const OBSERVATORY_HOME_SOURCE = readSource('./ClientObservatoryHome.tsx');

describe('ClientObservatoryWidgets source contract', () => {
  it('keeps the observatory widgets aligned with the mounted client overview wrapper', () => {
    expect(DASHBOARD_ROUTE_COMPONENTS_SOURCE).toContain("export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'))");
    expect(DASHBOARD_ROUTES_SOURCE).toContain("{ path: '/overview', component: ClientHomeTab");
    expect(CLIENT_HOME_SOURCE).toContain("import ClientDashboardHomeTab from '../../../UserDashboard/components/ClientDashboardHomeTab'");
    expect(CLIENT_HOME_SOURCE).toContain('<ClientDashboardHomeTab');
    expect(CLIENT_HOME_SOURCE).not.toContain('ClientObservatoryHome');
    expect(OBSERVATORY_HOME_SOURCE).toContain("import ClientObservatoryWidgets from './ClientObservatoryWidgets'");
    expect(OBSERVATORY_HOME_SOURCE).toContain('<ClientObservatoryWidgets');
    expect(OBSERVATORY_HOME_SOURCE).toContain('const leaderboardQuery = useLeaderboard({ limit: 5 });');
  });

  it('uses deterministic sanitized widget rows instead of index fallback keys', () => {
    expect(SOURCE).toContain('normalizeAchievementRows(achievements)');
    expect(SOURCE).toContain('normalizeLeaderboardRows(leaderboard)');
    expect(SOURCE).toContain('normalizeChallengeWidget(challenge)');
    expect(SOURCE).toContain('normalizeTagRows(tags)');
    expect(SOURCE).not.toContain('key={item.id || index}');
    expect(SOURCE).not.toContain('key={entry.userId || index}');
    expect(SOURCE).not.toContain('key={tag}');
    expect(SOURCE).not.toContain('.map((item, index)');
    expect(SOURCE).not.toContain('.map((entry, index)');
    expect(SOURCE).not.toContain("challenge?.title || challenge?.name");
    expect(SOURCE).not.toContain('challenge?.description');
    expect(SOURCE).not.toContain("(tags.length ? tags : ['No tags yet'])");
    expect(PREVIEW_SOURCE).toContain('CONTROL_TEXT_PATTERN');
    expect(PREVIEW_SOURCE).toContain('stableWidgetKey');
    expect(PREVIEW_SOURCE).toContain('SAFE_TAG_PATTERN');
  });

  it('does not mount duplicate current-workout cards for the active mobile viewport', () => {
    expect(OBSERVATORY_HOME_SOURCE).toContain('const showMobilePriority = useMobilePriorityRail();');
    expect(OBSERVATORY_HOME_SOURCE).toContain('showMobilePriority={showMobilePriority}');
    expect(OBSERVATORY_HOME_SOURCE).toContain('showCurrentWorkoutCard={!showMobilePriority}');
    expect(SOURCE).toContain('showCurrentWorkoutCard = true');
    expect(SOURCE).toContain('{showCurrentWorkoutCard && (');
  });

  it('keeps the touched observatory widget sources under line cap and ASCII-clean', () => {
    [
      SOURCE,
      PREVIEW_SOURCE,
      readSource('./ClientObservatoryWidgets.source.test.ts'),
    ].forEach((source) => {
      expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
      expect(source).not.toMatch(/[\u00e2\uFFFD]/);
    });
  });
});
