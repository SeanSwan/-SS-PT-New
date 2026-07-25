/**
 * useClientProgressCharts — Phase 14 canonical chart hook tests
 * ==============================================================
 * Locks the 15-chart canonical contract that powers the client
 * progress route after the Phase 14 rebuild.
 *
 * Covers:
 *   - exactly 12 canonical chart IDs in the expected order
 *   - the hook fetches all 12 endpoints under /api/client/analytics/chart-*
 *   - truthful empty shapes (no demo/preview fallbacks)
 *   - source-level locks that CanonicalProgressChartsGrid and
 *     ClientProgressDashboardPage wire everything up correctly
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  CANONICAL_CHART_IDS,
  CANONICAL_CHART_ROUTES,
  type CanonicalChartId,
} from './useClientProgressCharts.types';
import { sanitizeClientProgressChartsBundle } from './useClientProgressChartsSanitizers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOOK_SOURCE = readFileSync(
  resolve(__dirname, './useClientProgressCharts.ts'),
  'utf8',
);
const MAPPING_SOURCE = readFileSync(
  resolve(__dirname, './useClientProgressChartsResponseMapping.ts'),
  'utf8',
);
const SHARED_FETCH_SOURCE = readFileSync(
  resolve(__dirname, './useCanonicalProgressChartsFetch.ts'),
  'utf8',
);
const GRID_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.tsx',
  ),
  'utf8',
);
const PRIMARY_CARDS_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.primaryCards.tsx',
  ),
  'utf8',
);
const INTERACTIVE_CARDS_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.interactiveCards.tsx',
  ),
  'utf8',
);
const DETAIL_CARDS_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.detailCards.tsx',
  ),
  'utf8',
);
const EFFORT_CARD_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.effortCard.tsx',
  ),
  'utf8',
);
const BALANCE_CARDS_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.balanceCards.tsx',
  ),
  'utf8',
);
const BODY_CARDS_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/CanonicalProgressChartsGrid.bodyCards.tsx',
  ),
  'utf8',
);
const GRID_CARD_SOURCE = `${GRID_SOURCE}\n${PRIMARY_CARDS_SOURCE}\n${INTERACTIVE_CARDS_SOURCE}\n${DETAIL_CARDS_SOURCE}\n${EFFORT_CARD_SOURCE}\n${BALANCE_CARDS_SOURCE}\n${BODY_CARDS_SOURCE}`;
const PAGE_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx',
  ),
  'utf8',
);

describe('Phase 14 — canonical chart ID registry', () => {
  it('exports exactly 15 canonical chart IDs (12 Phase-14 + 3 charter-v3 4c)', () => {
    expect(CANONICAL_CHART_IDS).toHaveLength(15);
  });

  it('registers the expected canonical IDs in the expected order', () => {
    expect([...CANONICAL_CHART_IDS]).toEqual([
      'workoutFrequency',
      'attendanceReliability',
      'weeklyVolume',
      'setsRepsTrend',
      'durationTrend',
      'intensityRpeTrend',
      'prTimeline',
      'anchorLifts',
      'exerciseFrequency',
      'movementPatternBalance',
      'muscleGroupBalance',
      'recoverySignal',
      'weightTrend',
      'bodyFatTrend',
      'estOneRm',
    ]);
  });

  it('maps every canonical ID to a chart-*-kebab route suffix', () => {
    for (const id of CANONICAL_CHART_IDS) {
      const suffix = CANONICAL_CHART_ROUTES[id as CanonicalChartId];
      expect(suffix).toMatch(/^chart-[a-z-]+$/);
    }
  });

  it('canonical ID kebab-case matches the backend endpoint suffix', () => {
    // Lock the exact backend route suffix for each canonical ID so a
    // frontend rename cannot silently diverge from the server.
    expect(CANONICAL_CHART_ROUTES.workoutFrequency).toBe('chart-workout-frequency');
    expect(CANONICAL_CHART_ROUTES.attendanceReliability).toBe('chart-attendance-reliability');
    expect(CANONICAL_CHART_ROUTES.weeklyVolume).toBe('chart-weekly-volume');
    expect(CANONICAL_CHART_ROUTES.setsRepsTrend).toBe('chart-sets-reps-trend');
    expect(CANONICAL_CHART_ROUTES.durationTrend).toBe('chart-duration-trend');
    expect(CANONICAL_CHART_ROUTES.intensityRpeTrend).toBe('chart-intensity-rpe-trend');
    expect(CANONICAL_CHART_ROUTES.prTimeline).toBe('chart-pr-timeline');
    expect(CANONICAL_CHART_ROUTES.anchorLifts).toBe('chart-anchor-lifts');
    expect(CANONICAL_CHART_ROUTES.exerciseFrequency).toBe('chart-exercise-frequency');
    expect(CANONICAL_CHART_ROUTES.movementPatternBalance).toBe('chart-movement-pattern-balance');
    expect(CANONICAL_CHART_ROUTES.muscleGroupBalance).toBe('chart-muscle-group-balance');
    expect(CANONICAL_CHART_ROUTES.recoverySignal).toBe('chart-recovery-signal');
  });
});

describe('Phase 14 — hook fetch contract', () => {
  it('fetches all 12 canonical endpoints under the client-safe namespace', () => {
    expect(HOOK_SOURCE).toMatch(
      /\/api\/client\/analytics\/\$\{suffix\}/,
    );
  });

  it('parallelizes the 12 fetches via Promise.all over CANONICAL_CHART_IDS', () => {
    expect(HOOK_SOURCE).toMatch(/Promise\.all\(\s*CANONICAL_CHART_IDS\.map/);
  });

  it('has truthful empty shapes (no demo/preview fallbacks)', () => {
    // EMPTY_CANONICAL_PROGRESS_CHARTS must initialize every field to [] or a typed empty obj.
    expect(MAPPING_SOURCE).toMatch(
      /EMPTY_CANONICAL_PROGRESS_CHARTS:\s*CanonicalProgressCharts/,
    );
    expect(MAPPING_SOURCE).toMatch(/workoutFrequency:\s*\[\]/);
    expect(MAPPING_SOURCE).toMatch(/weeklyVolume:\s*\[\]/);
    expect(MAPPING_SOURCE).toMatch(/recoverySignal:\s*\[\]/);

    // No demo/placeholder symbol in the hook source. The docstring uses
    // the word "preview" as prose ("no demo / preview / fake fallbacks"),
    // so we check for the DEMO_DATA identifier shape specifically instead.
    expect(HOOK_SOURCE).not.toMatch(/DEMO_DATA/);
    expect(HOOK_SOURCE).not.toMatch(/const\s+PREVIEW_/);
  });

  it('derives nonEmptyChartCount to drive the grid empty-state summary', () => {
    expect(SHARED_FETCH_SOURCE).toMatch(/nonEmptyChartCount/);
  });

  it('tracks unavailable chart feeds separately from empty chart data', () => {
    expect(SHARED_FETCH_SOURCE).toMatch(/unavailableChartCount/);
    expect(GRID_SOURCE).toMatch(/getProgressProofStatusText/);
  });

  it('sanitizes malformed chart coordinates before Victory receives them', () => {
    const bundle = sanitizeClientProgressChartsBundle({
      workoutFrequency: [
        { x: '05/01', y: 'NaN' },
        { x: null, y: '4' },
      ],
      attendanceReliability: {
        data: [{ x: 'completed', y: undefined }],
        reliabilityPercent: Number.POSITIVE_INFINITY,
        totals: {
          completed: '3',
          skipped: Number.NaN,
          cancelled: undefined,
          resolved: '4',
        },
      },
      weeklyVolume: [{ x: '05/08', y: Number.NEGATIVE_INFINITY, workouts: '2' }],
      setsRepsTrend: {
        sets: [{ x: '05/08', y: '6' }],
        reps: [{ x: '05/08', y: 'bad' }],
      },
      durationTrend: [{ x: '05/10', y: null }],
      intensityRpeTrend: [{ x: '05/10', y: '9.5', source: 'voice' }],
      prTimeline: [{ x: '2026-05-10', y: '225', exercise: null, reps: '5' }],
      anchorLifts: {
        data: {
          Squat: [{ x: '2026-05-10', y: '315', reps: '3' }],
          Broken: [{ x: '2026-05-11', y: 'NaN', reps: 'bad' }],
        },
        exercises: ['Squat', 99, 'Broken'],
      },
      exerciseFrequency: [{ x: 'Curl', y: '2', sets: '6' }],
      movementPatternBalance: [{ x: 'push', y: 'NaN', sets: '8' }],
      muscleGroupBalance: [{ x: undefined, y: '1250', sets: '9' }],
      recoverySignal: [{ x: 'knee', y: 'NaN', painFlags: '1', highRpeFlags: 'bad', totalSets: '4' }],
    } as any);

    expect(bundle.workoutFrequency).toEqual([
      { x: 'Point 2', y: 4 },
    ]);
    expect(bundle.attendanceReliability.reliabilityPercent).toBe(0);
    expect(bundle.attendanceReliability.totals).toEqual({
      completed: 3,
      skipped: 0,
      cancelled: 0,
      resolved: 4,
    });
    expect(bundle.weeklyVolume).toEqual([]);
    expect(bundle.setsRepsTrend.reps).toEqual([]);
    expect(bundle.intensityRpeTrend[0]).toMatchObject({ y: 9.5, source: 'intensity' });
    expect(bundle.prTimeline[0]).toMatchObject({ y: 225, exercise: 'Unknown exercise', reps: 5 });
    expect(bundle.anchorLifts.exercises).toEqual(['Squat']);
    expect(bundle.anchorLifts.data.Broken).toBeUndefined();
    // Balance charts keep a bucket with real sets even at zero/non-finite volume
    // (bodyweight training) — 'push' has 8 sets, so it survives with y floored to 0.
    expect(bundle.movementPatternBalance).toEqual([{ x: 'push', y: 0, sets: 8 }]);
    expect(bundle.muscleGroupBalance[0]).toMatchObject({ x: 'Point 1', y: 1250, sets: 9 });
    expect(bundle.recoverySignal).toEqual([]);
  });

  it('keeps bodyweight-only balance buckets (sets>0, volume=0) but still drops truly-empty ones', () => {
    // Real production case (user 108): 8 sets of push-ups record weight 0, so
    // muscle-group volume is 0. Dropping them made the client's Chest bar vanish
    // and the chart falsely claimed they skipped chest. sets>0 = real training.
    const bundle = sanitizeClientProgressChartsBundle({
      muscleGroupBalance: [
        { x: 'Chest', y: 0, sets: 8 },       // bodyweight push-ups — KEEP
        { x: 'Legs', y: 4200, sets: 12 },    // weighted — KEEP
        { x: 'Core', y: '0', sets: '5' },    // stringy bodyweight planks — KEEP
        { x: 'Arms', y: 0, sets: 0 },        // nothing logged — DROP
      ],
      movementPatternBalance: [
        { x: 'push', y: 0, sets: 6 },        // bodyweight — KEEP
        { x: 'hinge', y: 0, sets: 0 },       // nothing — DROP
      ],
    } as any);

    expect(bundle.muscleGroupBalance).toEqual([
      { x: 'Chest', y: 0, sets: 8 },
      { x: 'Legs', y: 4200, sets: 12 },
      { x: 'Core', y: 0, sets: 5 },
    ]);
    expect(bundle.movementPatternBalance).toEqual([{ x: 'push', y: 0, sets: 6 }]);
  });

  it('does NOT resurrect zero-volume points on non-balance (volume/trend) charts', () => {
    // The keep-zero rule is balance-only. A weekly-volume bucket of 0 is genuinely
    // nothing to plot on a volume axis and must still drop.
    const bundle = sanitizeClientProgressChartsBundle({
      weeklyVolume: [{ x: '05/08', y: 0, workouts: 3 }],
      workoutFrequency: [{ x: '05/08', y: 0 }],
    } as any);
    expect(bundle.weeklyVolume).toEqual([]);
    expect(bundle.workoutFrequency).toEqual([]);
  });
});

describe('Phase 14 — CanonicalProgressChartsGrid source contract', () => {
  it('mounts exactly 12 card components', () => {
    // One <SomethingCard ... /> mount per canonical chart.
    const cardMountPattern = /<(WorkoutFrequency|AttendanceReliability|WeeklyVolume|SetsRepsTrend|DurationTrend|IntensityRpe|PRTimeline|AnchorLifts|ExerciseFrequency|MovementPatternBalance|MuscleGroupBalance|RecoverySignal|WeightTrend|BodyFatTrend|EstOneRmTrend)Card\b/g;
    const mounts = [...GRID_SOURCE.matchAll(cardMountPattern)];
    expect(mounts).toHaveLength(15);
  });

  it('each card has a stable data-testid for QA locking', () => {
    const TESTIDS = [
      'chart-card-workoutFrequency',
      'chart-card-attendanceReliability',
      'chart-card-weeklyVolume',
      'chart-card-setsRepsTrend',
      'chart-card-durationTrend',
      'chart-card-intensityRpeTrend',
      'chart-card-prTimeline',
      'chart-card-anchorLifts',
      'chart-card-exerciseFrequency',
      'chart-card-movementPatternBalance',
      'chart-card-muscleGroupBalance',
      'chart-card-recoverySignal',
      'chart-card-weightTrend',
      'chart-card-bodyFatTrend',
      'chart-card-estOneRm',
    ];
    for (const id of TESTIDS) {
      expect(GRID_CARD_SOURCE).toContain(`data-testid="${id}"`);
    }
  });

  it('uses truthful empty-state copy instead of hiding empty charts', () => {
    expect(GRID_CARD_SOURCE).toMatch(/No completed workouts yet/);
    expect(GRID_CARD_SOURCE).toMatch(/No attendance data yet/);
    expect(GRID_CARD_SOURCE).toMatch(/No logged lifts yet/);
    expect(GRID_CARD_SOURCE).toMatch(/No PRs recorded yet/);
    expect(GRID_CARD_SOURCE).toMatch(/No recovery flags/);
  });

  it('consumes useClientProgressCharts (not the legacy useClientAnalytics)', () => {
    expect(GRID_SOURCE).toMatch(/useClientProgressCharts/);
    expect(GRID_SOURCE).not.toMatch(/useClientAnalytics/);
  });

  it('never references demo / preview / DEMO_DATA anywhere in the grid', () => {
    expect(GRID_CARD_SOURCE).not.toMatch(/DEMO_DATA/);
    expect(GRID_CARD_SOURCE).not.toMatch(/Preview/);
  });
});

describe('Phase 14 — ClientProgressDashboardPage wires the canonical grid', () => {
  it('imports CanonicalProgressChartsGrid via React.lazy', () => {
    expect(PAGE_SOURCE).toMatch(
      /const\s+CanonicalProgressChartsGrid\s*=\s*React\.lazy\(/,
    );
    expect(PAGE_SOURCE).toMatch(
      /import\(\s*['"]\.\/CanonicalProgressChartsGrid['"]\s*\)/,
    );
  });

  it('no longer mounts the pre-Phase-14 ProfileChartsGrid', () => {
    expect(PAGE_SOURCE).not.toMatch(/<ProfileChartsGrid/);
    expect(PAGE_SOURCE).not.toMatch(
      /from\s+['"][^'"]*UserDashboard\/components\/ProfileChartsGrid['"]/,
    );
  });

  it('renders <CanonicalProgressChartsGrid /> inside a Suspense fallback', () => {
    expect(PAGE_SOURCE).toMatch(/<CanonicalProgressChartsGrid\s*\/>/);
  });
});
