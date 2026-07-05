/**
 * ClientDetailView — Phase 15.3 Progress tab tests
 * ==================================================
 * Source-level locks that the Clients & Team client detail view
 * renders a truthful Progress tab using the Phase 14 chart
 * architecture, not the legacy ClientProgressDashboard preview.
 *
 * Phase 15.4 (2026-04-16): added canonical-consumer locks on
 * `ClientsWorkspace.tsx`. The prior Phase 15.3 tests only locked the
 * wiring on `MasterDetailLayout.tsx`, which is dormant — it has zero
 * JSX mounts in the canonical route tree. The live
 * `/dashboard/admin/client-management` route mounts `ClientsWorkspace`,
 * not `MasterDetailLayout`, so the dormant-layout test passing was
 * not evidence the live Progress tab actually rendered the Phase 14
 * grid. Codex caught this at smoke. Both sets of locks are kept:
 *   - MasterDetailLayout locks stay as the historical record.
 *   - ClientsWorkspace locks are the canonical-surface receipt.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DETAIL_VIEW_SOURCE = readFileSync(
  resolve(__dirname, './ClientDetailView.tsx'),
  'utf8',
);
const CLIENTS_WORKSPACE_SOURCE = readFileSync(
  resolve(__dirname, '../ClientsWorkspace.tsx'),
  'utf8',
);
const CLIENTS_WORKSPACE_TABS_SOURCE = readFileSync(
  resolve(__dirname, '../ClientsWorkspaceTabs.tsx'),
  'utf8',
);
const TAB_INDEX_SOURCE = readFileSync(
  resolve(__dirname, './tabs/index.ts'),
  'utf8',
);
const PROGRESS_TAB_SOURCE = readFileSync(
  resolve(__dirname, './tabs/ProgressTabContent.tsx'),
  'utf8',
);
const ADMIN_GRID_SOURCE = readFileSync(
  resolve(__dirname, './tabs/AdminProgressChartsGrid.tsx'),
  'utf8',
);
const ADMIN_GRID_DECK_SOURCE = readFileSync(
  resolve(__dirname, './tabs/AdminProgressChartsGrid.cards.tsx'),
  'utf8',
);
const ADMIN_GRID_PRIMARY_SOURCE = readFileSync(
  resolve(__dirname, './tabs/AdminProgressChartsGrid.primaryCards.tsx'),
  'utf8',
);
const ADMIN_GRID_DETAIL_SOURCE = readFileSync(
  resolve(__dirname, './tabs/AdminProgressChartsGrid.detailCards.tsx'),
  'utf8',
);
const ADMIN_GRID_BUNDLE_SOURCE = [
  ADMIN_GRID_SOURCE,
  ADMIN_GRID_DECK_SOURCE,
  ADMIN_GRID_PRIMARY_SOURCE,
  ADMIN_GRID_DETAIL_SOURCE,
].join('\n');
const TRAINING_TAB_SOURCE = readFileSync(
  resolve(__dirname, './tabs/TrainingTabContent.tsx'),
  'utf8',
);
const TRAINING_SECTION_SOURCE = readFileSync(
  resolve(__dirname, './tabs/TrainingTabSectionContent.tsx'),
  'utf8',
);
const TRAINING_MODES_SOURCE = readFileSync(
  resolve(__dirname, './tabs/trainingWorkflowModes.ts'),
  'utf8',
);

describe('Phase 15.3 — Clients & Team Progress tab', () => {
  it('ClientDetailView TABS array includes a progress entry', () => {
    expect(DETAIL_VIEW_SOURCE).toMatch(/id:\s*['"]progress['"]/);
    expect(DETAIL_VIEW_SOURCE).toMatch(/label:\s*['"]Progress['"]/);
  });

  it('ClientDetailView accepts a renderProgress prop', () => {
    expect(DETAIL_VIEW_SOURCE).toMatch(/renderProgress\?:/);
  });

  it('ClientDetailView routes the progress tab to renderProgress', () => {
    expect(DETAIL_VIEW_SOURCE).toMatch(
      /case\s+['"]progress['"]:\s*\n?\s*return\s+renderProgress/,
    );
  });

  it('tab barrel export includes ProgressTabContent', () => {
    expect(TAB_INDEX_SOURCE).toMatch(
      /export\s*\{[^}]*ProgressTabContent[^}]*\}\s*from/,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Canonical-consumer locks (Phase 15.4)
//
// UniversalDashboardLayout.tsx:497 mounts /dashboard/admin/client-management
// to ClientsWorkspace, NOT MasterDetailLayout. The smoke-observable
// Progress tab lives behind ClientsWorkspace's ClientDetailView render
// props. If these regress, the live Progress tab falls back to the
// ClientDetailView placeholder ("Truthful workout charts and analytics.")
// and the Phase 14 grid never appears — which is exactly what Codex caught
// at smoke on 2026-04-16.
// ─────────────────────────────────────────────────────────────

describe('Phase 15.4 — Canonical consumer (ClientsWorkspace) Progress wiring', () => {
  it('ClientsWorkspaceTabs lazy-imports ProgressTabContent for the canonical hub', () => {
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/useClientsWorkspaceTabRenderers/);
    expect(CLIENTS_WORKSPACE_TABS_SOURCE).toMatch(
      /ProgressTabContent\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\([^)]*ProgressTabContent[^)]*\)\s*\)/,
    );
  });

  it('ClientsWorkspaceTabs defines a renderProgress callback that mounts ProgressTabContent', () => {
    // The callback must exist AND reference ProgressTabContent in its body.
    // We check both conditions by slicing the source around the callback.
    const callbackIdx = CLIENTS_WORKSPACE_TABS_SOURCE.indexOf('renderProgress');
    expect(callbackIdx).toBeGreaterThan(0);
    // Take a generous window that covers the callback definition.
    const slice = CLIENTS_WORKSPACE_TABS_SOURCE.slice(callbackIdx, callbackIdx + 500);
    expect(slice).toMatch(/useCallback/);
    expect(slice).toMatch(/<ProgressTabContent\b/);
  });

  it('ClientsWorkspace passes renderProgress to ClientDetailView', () => {
    // The actual JSX prop. This is the line whose absence caused the
    // live smoke regression — Codex 2026-04-16.
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/renderProgress=\{renderProgress\}/);
  });

  it('ClientsWorkspace still wires the other 4 render props (no regression to siblings)', () => {
    // Defensive: make sure the fix didn't accidentally remove a sibling.
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/renderTraining=\{renderTraining\}/);
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/renderBiometrics=\{renderBiometrics\}/);
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/renderOverview=\{renderOverview\}/);
    expect(CLIENTS_WORKSPACE_SOURCE).toMatch(/renderSettings=\{renderSettings\}/);
  });
});

describe('Phase 5.9 - Clients & Team PLAUD placement', () => {
  it('Training tab exposes a PLAUD Uploads lane inside History & Inputs', () => {
    expect(TRAINING_MODES_SOURCE).toMatch(/id:\s*['"]plaud['"]/);
    expect(TRAINING_MODES_SOURCE).toMatch(/label:\s*['"]PLAUD Uploads['"]/);
    expect(TRAINING_MODES_SOURCE).toMatch(/sections:\s*\['history',\s*'import',\s*'plaud'\]/);
  });

  it('PLAUD Uploads mounts the reusable merge workspace with editable selected-client context', () => {
    expect(TRAINING_TAB_SOURCE).toMatch(/<TrainingTabSectionContent/);
    expect(TRAINING_SECTION_SOURCE).toMatch(/PlaudMergeWorkspace/);
    expect(TRAINING_SECTION_SOURCE).toMatch(/initialClientId=\{safeClientId\}/);
    expect(TRAINING_SECTION_SOURCE).toMatch(/initialClientName=\{clientName\}/);
    expect(TRAINING_SECTION_SOURCE).not.toMatch(/lockClientId=\{true\}/);
    expect(TRAINING_SECTION_SOURCE).toMatch(/embedded=\{true\}/);
  });
});

describe('Phase 15.3 — AdminProgressChartsGrid truthfulness', () => {
  it('uses useAdminClientProgressCharts (admin-scoped, not client JWT hook)', () => {
    expect(ADMIN_GRID_SOURCE).toMatch(/useAdminClientProgressCharts/);
    expect(ADMIN_GRID_SOURCE).not.toMatch(/useClientProgressCharts\b(?!\.)/);
  });

  it('fetches from /api/analytics/:userId/* path (not /api/client/analytics/*)', () => {
    // The admin hook builds URLs like `/api/analytics/${userId}/${suffix}`.
    const ADMIN_HOOK = readFileSync(
      resolve(__dirname, '../../../../hooks/analytics/useAdminClientProgressCharts.ts'),
      'utf8',
    );
    expect(ADMIN_HOOK).toMatch(/\/api\/analytics\/\$\{userId\}\/\$\{suffix\}/);
    // The admin fetch helper body must NOT contain the client-safe path as a
    // URL template literal. Comments may mention it, so scope the check to the
    // actual fetch implementation instead of the whole file.
    const fetchIdx = ADMIN_HOOK.indexOf('const fetchAdminChartResponse');
    expect(fetchIdx).toBeGreaterThan(0);
    const fetchBody = ADMIN_HOOK.slice(fetchIdx, fetchIdx + 1500);
    expect(fetchBody).not.toMatch(/`\/api\/client\/analytics\//);
  });

  it('renders all 12 canonical chart cards with testids', () => {
    const EXPECTED_TESTIDS = [
      'admin-chart-workoutFrequency',
      'admin-chart-attendance',
      'admin-chart-weeklyVolume',
      'admin-chart-setsReps',
      'admin-chart-duration',
      'admin-chart-intensityRpe',
      'admin-chart-prs',
      'admin-chart-anchorLifts',
      'admin-chart-exerciseFreq',
      'admin-chart-movementPattern',
      'admin-chart-muscleGroup',
      'admin-chart-recovery',
    ];
    for (const id of EXPECTED_TESTIDS) {
      expect(ADMIN_GRID_BUNDLE_SOURCE).toContain(`data-testid="${id}"`);
    }
  });

  it('does NOT reference ClientProgressDashboard or Preview Mode', () => {
    expect(ADMIN_GRID_BUNDLE_SOURCE).not.toMatch(/ClientProgressDashboard/);
    expect(ADMIN_GRID_BUNDLE_SOURCE).not.toMatch(/Preview Mode/i);
    expect(ADMIN_GRID_BUNDLE_SOURCE).not.toMatch(/DEMO_DATA/);
    expect(ADMIN_GRID_BUNDLE_SOURCE).not.toMatch(/sample data/i);
  });

  it('uses truthful empty states, not fake chart fallbacks', () => {
    expect(ADMIN_GRID_BUNDLE_SOURCE).toMatch(/No completed workouts yet/);
    expect(ADMIN_GRID_BUNDLE_SOURCE).toMatch(/No attendance data yet/);
    expect(ADMIN_GRID_BUNDLE_SOURCE).toMatch(/No logged lifts yet/);
    expect(ADMIN_GRID_BUNDLE_SOURCE).toMatch(/No recovery flags/);
  });
});

describe('Phase 15.3 — SessionCard scroll fix', () => {
  const SESSION_STYLES_SOURCE = readFileSync(
    resolve(
      __dirname,
      '../../Pages/admin-clients/components/WorkoutHistoryPanel.sessionStyles.ts',
    ),
    'utf8',
  );

  it('SessionCard uses overflow: visible (not overflow: hidden)', () => {
    const cardIdx = SESSION_STYLES_SOURCE.indexOf('SessionCard');
    expect(cardIdx).toBeGreaterThan(0);
    const blockEnd = SESSION_STYLES_SOURCE.indexOf('`;', cardIdx);
    const slice = SESSION_STYLES_SOURCE.slice(cardIdx, blockEnd);
    expect(slice).toMatch(/overflow:\s*visible;/);
    expect(slice).not.toMatch(/overflow:\s*hidden;/);
  });
});
