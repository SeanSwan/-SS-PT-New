/**
 * ProfileChartsGrid — canonical default-visible truth lock
 * ========================================================
 * Locks the set of charts that render by default on the canonical
 * /dashboard/client/progress surface.
 *
 * Regression intent (canonical-surface-audit 2026-04-13):
 *   The prior `DEFAULT_VISIBLE` set was `{ workoutFrequency, muscleRadar,
 *   weightProgression, goalProgress }`. Two of those four were canonical
 *   truth breaches:
 *     - goalProgress → GoalProgressBullet rendered hardcoded DEMO_DATA
 *       labeled "(Preview)" because it has no live data source.
 *     - muscleRadar  → MuscleGroupFocusRadar's backend chain
 *       (workout_exercises / sets / exercises) is schema-drifted and the
 *       real tables are empty in prod. Would render "No data yet" forever.
 *
 *   After the fix, only charts with proven live data sources on the
 *   canonical progress surface are default-visible: workoutFrequency
 *   (fed by workout_sessions) and weightProgression (fed by body_measurements).
 *
 * This test renders the component with a mocked ProfileChartsSection and
 * asserts the effective visibility only enables the two truthful charts.
 */

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ── Capture chartVisibility passed down to ProfileChartsSection ──────────
const capturedProps: Array<Record<string, any>> = [];
vi.mock('../../../pages/Social/components/ProfileChartsSection', () => ({
  default: (props: any) => {
    capturedProps.push(props);
    return <div data-testid="charts-section" />;
  },
}));

// ── Stub api (prevents real HTTP when settings panel opens) ──────────────
vi.mock('../../../services/api', () => ({
  default: { put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

// ── Stub logger ──────────────────────────────────────────────────────────
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import ProfileChartsGrid from './ProfileChartsGrid';

describe('ProfileChartsGrid — canonical DEFAULT_VISIBLE truth lock', () => {
  it('default visibility on canonical /progress includes ONLY charts with proven live data sources', () => {
    capturedProps.length = 0;
    // Render with NO chartVisibility prop → component uses its DEFAULT_VISIBLE fallback
    render(<ProfileChartsGrid userId={42} isOwnProfile={true} />);

    expect(capturedProps.length).toBeGreaterThan(0);
    const effective = capturedProps[capturedProps.length - 1].chartVisibility;

    // HARD ASSERTIONS — only these two charts may be default-visible:
    //   workoutFrequency → fed by workout_sessions (real data confirmed)
    //   weightProgression → fed by body_measurements (real data confirmed)
    expect(effective.workoutFrequency).toBe(true);
    expect(effective.weightProgression).toBe(true);

    // Negative assertions — the two canonical truth breaches must NOT default on:
    //   muscleRadar: backend data chain empty + schema-drifted
    //   goalProgress: hardcoded DEMO_DATA fallback when no data prop
    expect(effective.muscleRadar).not.toBe(true);
    expect(effective.goalProgress).not.toBe(true);
  });

  it('respects a user-provided chartVisibility prop (does not force-overwrite with defaults)', () => {
    capturedProps.length = 0;
    // User explicitly opts back into muscleRadar via their saved settings.
    // The component must honor that — the truth lock only governs defaults.
    render(
      <ProfileChartsGrid
        userId={42}
        isOwnProfile={true}
        chartVisibility={{ workoutFrequency: true, muscleRadar: true }}
      />,
    );

    const effective = capturedProps[capturedProps.length - 1].chartVisibility;
    expect(effective.workoutFrequency).toBe(true);
    expect(effective.muscleRadar).toBe(true);
    // Not auto-added just because it's in the default baseline
    expect(effective.weightProgression).toBeUndefined();
  });
});
