import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const PAGE_SRC = readFileSync(resolve(__dirname, 'PlaudIntelligenceWorkspacePage.tsx'), 'utf8');
const LAYOUT_SRC = readFileSync(resolve(__dirname, '../../components/DashBoard/UniversalDashboardLayout.tsx'), 'utf8');
const DASHBOARD_TABS_SRC = readFileSync(resolve(__dirname, '../../config/dashboard-tabs.ts'), 'utf8');
const PENDING_REVIEWS_SRC = readFileSync(
  resolve(__dirname, '../../components/PlaudClipMerge/PlaudPendingReviewsList.tsx'),
  'utf8',
);
const TRAINER_SIDEBAR_SRC = readFileSync(
  resolve(__dirname, '../../components/DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx'),
  'utf8',
);

function roleBlock(role: 'admin' | 'trainer'): string {
  const routeConfigStart = LAYOUT_SRC.indexOf('const roleConfigurations');
  const start = LAYOUT_SRC.indexOf(`  ${role}: {`, routeConfigStart);
  const nextRole = role === 'admin' ? '  trainer: {' : '  client: {';
  const end = LAYOUT_SRC.indexOf(nextRole, start);
  return LAYOUT_SRC.slice(start, end);
}

describe('PlaudIntelligenceWorkspacePage source contract', () => {
  it('wraps the existing PLAUD merge workflow instead of duplicating merge logic', () => {
    expect(PAGE_SRC).toMatch(/PlaudMergeWorkspace/);
    expect(PAGE_SRC).toMatch(/data-testid="plaud-intelligence-workspace"/);
  });

  it('keeps Swan Coach action language scoped to the next backend slice', () => {
    expect(PAGE_SRC).toMatch(/Swan Coach handoff/);
    expect(PAGE_SRC).toMatch(/Order clips/);
    expect(PAGE_SRC).toMatch(/Split workouts/);
    expect(PAGE_SRC).toMatch(/shared workout-log mapper/);
    expect(PAGE_SRC).toMatch(/Next slice/);
    expect(PAGE_SRC).not.toMatch(/Swan Coach intake command/);
  });

  it('is mounted for both admin and trainer role dashboards', () => {
    expect(LAYOUT_SRC).toMatch(/PlaudIntelligenceWorkspacePage/);
    expect(roleBlock('admin')).toMatch(/path:\s*['"]\/plaud['"][\s\S]{0,140}PlaudIntelligenceWorkspacePage/);
    expect(roleBlock('trainer')).toMatch(/path:\s*['"]\/plaud['"][\s\S]{0,140}PlaudIntelligenceWorkspacePage/);
  });

  it('is visible from admin and trainer navigation', () => {
    expect(DASHBOARD_TABS_SRC).toMatch(/id:\s*['"]plaud['"]/);
    expect(DASHBOARD_TABS_SRC).toMatch(/prefix:\s*['"]\/dashboard\/admin\/plaud['"]/);
    expect(TRAINER_SIDEBAR_SRC).toMatch(/path:\s*['"]\/dashboard\/trainer\/plaud['"]/);
  });

  it('moves queue focus to a programmatically focusable pending-review region', () => {
    expect(PAGE_SRC).toMatch(/querySelector\('\[data-testid="plaud-pending-reviews"\]'\)/);
    expect(PENDING_REVIEWS_SRC).toMatch(/tabIndex=\{-1\}/);
    expect(PENDING_REVIEWS_SRC).toMatch(/aria-label="Pending PLAUD reviews"/);
  });
});
