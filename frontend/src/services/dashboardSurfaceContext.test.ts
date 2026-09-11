/**
 * G08 — frontend surface context mapper tests: route → surfaceKey context
 * labeling. Declarations only; unknown paths never invent a surface.
 */
import { describe, expect, it } from 'vitest';
import { SURFACE_ROUTE_PATTERNS, matchDashboardSurface } from './dashboardSurfaceContext';

describe('dashboardSurfaceContext', () => {
  it('maps real dashboard routes to their domain surfaceKey', () => {
    expect(matchDashboardSurface('/dashboard/admin/coach-assistant')).toBe('D01');
    expect(matchDashboardSurface('/dashboard/trainer/coach-assistant')).toBe('D01');
    expect(matchDashboardSurface('/dashboard/trainer/workout-planner')).toBe('D02');
    expect(matchDashboardSurface('/dashboard/workout-logger')).toBe('D03');
    expect(matchDashboardSurface('/dashboard/admin/clients')).toBe('D05');
    expect(matchDashboardSurface('/dashboard/admin/pain-tracker')).toBe('D11');
    expect(matchDashboardSurface('/dashboard/admin/progress')).toBe('D19');
  });

  it('resolves nested subpaths to the same surface', () => {
    expect(matchDashboardSurface('/dashboard/admin/clients/team/view/17')).toBe('D05');
    expect(matchDashboardSurface('/dashboard/trainer/schedule/week')).toBe('D08');
  });

  it('falls back to the broad overview surface only when nothing specific matches', () => {
    expect(matchDashboardSurface('/dashboard')).toBe('D23');
    expect(matchDashboardSurface('/dashboard/admin/unknown-tab')).toBe('D23');
  });

  it('never invents a surface for unknown roots', () => {
    expect(matchDashboardSurface('/')).toBeNull();
    expect(matchDashboardSurface('')).toBeNull();
    expect(matchDashboardSurface('/login')).toBeNull();
  });

  it('declares all 24 domains and stays in sync with the surface ids', () => {
    const keys = new Set(SURFACE_ROUTE_PATTERNS.map((row) => row.surfaceKey));
    expect(keys.size).toBe(24);
    for (const id of ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D21', 'D22', 'D23', 'D24']) {
      expect(keys.has(id)).toBe(true);
    }
  });
});
