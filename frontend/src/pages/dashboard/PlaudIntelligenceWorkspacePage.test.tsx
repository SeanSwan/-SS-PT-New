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
const MERGE_PANEL_SRC = readFileSync(
  resolve(__dirname, '../../components/PlaudClipMerge/PlaudClipMergePanel.tsx'),
  'utf8',
);
const INTAKE_SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudIntakeService.ts'),
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

  it('honors Swan Coach review-next links by focusing the queue from ?review=next', () => {
    expect(PAGE_SRC).toMatch(/URLSearchParams\(location\.search\)/);
    expect(PAGE_SRC).toMatch(/params\.get\('review'\)\s*!==\s*'next'/);
    expect(PAGE_SRC).toMatch(/setTimeout\(focusQueue/);
  });

  it('uses ?review=next to hand the next reviewable merge to the embedded review workspace', () => {
    expect(PAGE_SRC).toMatch(/reviewNextRequested/);
    expect(PAGE_SRC).toMatch(/reviewNextMergeRequestId/);
    expect(PAGE_SRC).toMatch(/item\.kind\s*===\s*['"]merge_request['"]/);
    expect(PAGE_SRC).toMatch(/item\.canReview/);
    expect(PAGE_SRC).toMatch(/initialReviewMergeRequestId=\{initialReviewMergeRequestId \|\| undefined\}/);
  });

  it('accepts direct merge request review links from Swan Coach queue cards', () => {
    expect(PAGE_SRC).toMatch(/function parseMergeRequestId/);
    expect(PAGE_SRC).toMatch(/params\.get\('mergeRequestId'\)/);
    expect(PAGE_SRC).toMatch(/directMergeRequestId \|\| reviewNextMergeRequestId/);
  });

  it('marks the direct merge request target in the intake preview list', () => {
    expect(PAGE_SRC).toMatch(/isDirectMergeTarget/);
    expect(PAGE_SRC).toMatch(/\$selected=\{isDirectMergeTarget\}/);
    expect(PAGE_SRC).toMatch(/aria-current=\{isDirectMergeTarget \? 'true' : undefined\}/);
    expect(PAGE_SRC).toMatch(/Selected review/);
  });

  it('keeps a direct merge request target visible when it is outside the default preview window', () => {
    expect(PAGE_SRC).toMatch(/function visibleIntakePreviewItems/);
    expect(PAGE_SRC).toMatch(/selectedMergeRequestId/);
    expect(PAGE_SRC).toMatch(/firstItems\.some\(isSelectedMergeRequest\)/);
    expect(PAGE_SRC).toMatch(/\[selectedItem, \.\.\.firstItems\.slice\(0, 5\)\]/);
  });

  it('chooses review-next from a wider actionable window and orders ready merges oldest first', () => {
    expect(PAGE_SRC).toMatch(/usePlaudIntakeQueue\(\{ limit: 20 \}\)/);
    expect(PAGE_SRC).toMatch(/function reviewableMergeTime/);
    expect(PAGE_SRC).toMatch(/function pickReviewNextMergeRequestId/);
    expect(PAGE_SRC).toMatch(/sort\(\(a, b\) => reviewableMergeTime\(a\) - reviewableMergeTime\(b\)\)/);
    expect(PAGE_SRC).toMatch(/visibleIntakePreviewItems\(intakeItems, directMergeRequestId\)\.map/);
  });

  it('honors Swan Coach audio-piece links by focusing the merge panel from ?pieces=pending', () => {
    expect(PAGE_SRC).toMatch(/querySelector\('\[data-testid="plaud-merge-panel"\]'\)/);
    expect(PAGE_SRC).toMatch(/params\.get\('pieces'\)\s*===\s*'pending'/);
    expect(PAGE_SRC).toMatch(/setTimeout\(focusMergePanel/);
    expect(MERGE_PANEL_SRC).toMatch(/tabIndex=\{-1\}/);
  });

  it('consumes the unified PLAUD intake endpoint instead of static-only queue copy', () => {
    expect(PAGE_SRC).toMatch(/usePlaudIntakeQueue/);
    expect(PAGE_SRC).toMatch(/Unified intake queue/);
    expect(PAGE_SRC).toMatch(/Applaud/);
    expect(PAGE_SRC).toMatch(/Ready review/);
    expect(INTAKE_SERVICE_SRC).toMatch(/\/api\/plaud\/intake/);
  });
});
