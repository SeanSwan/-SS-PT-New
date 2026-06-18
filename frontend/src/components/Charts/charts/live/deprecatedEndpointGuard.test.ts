/**
 * Deprecated chart-endpoint regression guard
 * ==========================================
 * Phase 15.4 (2026-04-16): chartDataController.mjs deprecated 5 chart
 * endpoints to empty stubs as part of the Phase 14 12-chart canonical
 * rebuild. This test locks the canonical consumer surfaces — the public
 * social profile and the trainer client progress panel — to the
 * canonical replacement components, so future edits cannot silently
 * reintroduce a call to a stubbed endpoint and ship "No data yet" charts
 * to a real mounted route.
 *
 * Rule-30 backstop (Subagent Skepticism): Codex flagged this regression
 * AFTER Phase 14 stubs were introduced. The guard here is structural:
 * it asserts the source files of the canonical consumers do not contain
 * any of the 5 deprecated endpoint strings, regardless of how they are
 * referenced (lazy import, useAnalytics hook key, etc.).
 *
 * What the guard does NOT cover:
 *   - Archived legacy consumers under `archive/pending-deletion/` -
 *     those are no longer mounted by the canonical route tree.
 *   - The 5 standalone chart components themselves (MuscleGroupFocus
 *     Radar etc.) - they remain in place until a separate chart-level
 *     archive pass proves no active route imports them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The 5 endpoints stubbed by chartDataController.mjs in Phase 14.
const DEPRECATED_ENDPOINTS = [
  'chart-muscle-group-focus',
  'chart-cardio-endurance',
  'chart-session-frequency',
  'chart-muscle-recovery',
  'chart-rpe-by-exercise',
] as const;

// The 5 deprecated component identifiers (lazy import names) — kept as a
// secondary check in case a future edit re-imports the old component
// without re-typing the endpoint string.
const DEPRECATED_COMPONENTS = [
  'MuscleGroupFocusRadar',
  'CardioEnduranceLine',
  'SessionFrequencyArea',
  'MuscleRecoveryHeatmap',
  'RPEByExerciseScatter',
] as const;

const PROFILE_CHARTS_SECTION_SOURCE = readFileSync(
  resolve(__dirname, '../../../../pages/Social/components/ProfileChartsSection.tsx'),
  'utf8',
);

const TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE = readFileSync(
  resolve(__dirname, '../../../ClientProgressCharts/ClientAnalyticsPanel.tsx'),
  'utf8',
);

describe('Phase 15.4 — canonical consumer surfaces do not call deprecated endpoints', () => {
  describe('ProfileChartsSection (mounted via UserProfilePage at /profile/:userId)', () => {
    for (const endpoint of DEPRECATED_ENDPOINTS) {
      it(`does not reference deprecated endpoint: ${endpoint}`, () => {
        expect(PROFILE_CHARTS_SECTION_SOURCE).not.toContain(endpoint);
      });
    }

    for (const cmp of DEPRECATED_COMPONENTS) {
      it(`does not import deprecated component: ${cmp}`, () => {
        // Allow the bare word in comments if it ever appears, but block
        // any actual import-from / lazy(() => import('.../<Cmp>')) usage.
        const importPattern = new RegExp(
          `import\\([^)]*${cmp}[^)]*\\)|from\\s+['"][^'"]*${cmp}['"]`,
        );
        expect(PROFILE_CHARTS_SECTION_SOURCE).not.toMatch(importPattern);
      });
    }

    it('imports the canonical replacement components', () => {
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('MuscleGroupBalanceBars');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('RecoverySignalBars');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('IntensityRpeTrendLine');
      // sessionFrequency reuses the existing canonical WorkoutFrequencyBar.
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('WorkoutFrequencyBar');
    });

    it('preserves all visibility keys that previously pointed at deprecated charts', () => {
      // Sean's caution: do not orphan saved chartVisibility prefs by
      // dropping keys. `cardioEndurance` is the one allowed exception
      // (no canonical replacement, falls through harmlessly).
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]muscleRadar['"]/);
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]sessionFrequency['"]/);
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]muscleRecovery['"]/);
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]rpeByExercise['"]/);
    });

    it('gates paid profile chart components before non-paying clients hit /api/analytics/:userId/chart-*', () => {
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('requiresPro?: boolean');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('hasPaidChartAccess');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('const hasPaidChartAccess = isStaffRole || isPro || isElite;');
      expect(PROFILE_CHARTS_SECTION_SOURCE).not.toContain('const hasPaidChartAccess = isStaffRole || isPro || isElite || isTrial;');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toContain('!c.requiresPro || hasPaidChartAccess');
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]workoutFrequency['"][\s\S]*requiresPro:\s*true/);
      expect(PROFILE_CHARTS_SECTION_SOURCE).toMatch(/key:\s*['"]weightProgression['"][\s\S]*requiresPro:\s*true/);
    });
  });

  describe('Trainer ClientAnalyticsPanel (mounted via EnhancedClientProgressView at /dashboard/trainer/client-progress)', () => {
    for (const endpoint of DEPRECATED_ENDPOINTS) {
      it(`does not reference deprecated endpoint: ${endpoint}`, () => {
        expect(TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE).not.toContain(endpoint);
      });
    }

    for (const cmp of DEPRECATED_COMPONENTS) {
      it(`does not import deprecated component: ${cmp}`, () => {
        const importPattern = new RegExp(
          `import\\([^)]*${cmp}[^)]*\\)|from\\s+['"][^'"]*${cmp}['"]`,
        );
        expect(TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE).not.toMatch(importPattern);
      });
    }

    it('imports the canonical replacement components', () => {
      expect(TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE).toContain('MuscleGroupBalanceBars');
      expect(TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE).toContain('RecoverySignalBars');
      expect(TRAINER_CLIENT_ANALYTICS_PANEL_SOURCE).toContain('IntensityRpeTrendLine');
    });
  });
});

describe('Phase 15.4 — new live chart components hit canonical endpoints only', () => {
  const NEW_LIVE_COMPONENTS = [
    {
      file: 'MuscleGroupBalanceBars.tsx',
      expectedEndpoint: 'chart-muscle-group-balance',
      forbiddenEndpoint: 'chart-muscle-group-focus',
    },
    {
      file: 'RecoverySignalBars.tsx',
      expectedEndpoint: 'chart-recovery-signal',
      forbiddenEndpoint: 'chart-muscle-recovery',
    },
    {
      file: 'IntensityRpeTrendLine.tsx',
      expectedEndpoint: 'chart-intensity-rpe-trend',
      forbiddenEndpoint: 'chart-rpe-by-exercise',
    },
  ] as const;

  for (const { file, expectedEndpoint, forbiddenEndpoint } of NEW_LIVE_COMPONENTS) {
    describe(file, () => {
      const source = readFileSync(resolve(__dirname, `./${file}`), 'utf8');

      it(`hits the canonical endpoint: ${expectedEndpoint}`, () => {
        expect(source).toContain(expectedEndpoint);
      });

      it(`does NOT hit the deprecated endpoint: ${forbiddenEndpoint}`, () => {
        // Allow as a comment substring (e.g. doc header explaining the
        // replacement), but never as a useAnalytics endpoint key. The
        // grep is for the literal occurrence inside a useAnalytics call.
        const useAnalyticsPattern = new RegExp(
          `useAnalytics[^;]*${forbiddenEndpoint}`,
          's',
        );
        expect(source).not.toMatch(useAnalyticsPattern);
      });
    });
  }
});
