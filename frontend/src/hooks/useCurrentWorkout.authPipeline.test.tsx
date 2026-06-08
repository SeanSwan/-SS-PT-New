import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentWorkout } from './useCurrentWorkout';

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api.service', () => ({
  default: mockApiService,
}));

const source = readFileSync(resolve(__dirname, './useCurrentWorkout.ts'), 'utf8');
const repoRoot = resolve(__dirname, '../../..');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');

describe('useCurrentWorkout auth pipeline', () => {
  beforeEach(() => {
    mockApiService.get.mockReset();
    mockApiService.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'plan-42',
          name: 'Strength Block',
          createdAt: '2026-05-23T12:00:00.000Z',
          durationWeeks: 8,
          tags: [],
          days: [],
          frequency: '3x/week',
          duration: '45 min',
        },
      },
    });
  });

  it('keeps legacy admin workout routes redirected while current-workout API remains mounted', () => {
    expect(layoutSource).not.toContain("import('../Admin/WorkoutPlanBuilder')");
    expect(layoutSource).toContain('const AdminWorkoutPlansRedirect');
    expect(layoutSource).toContain("{ path: '/workouts/:clientId?', component: AdminWorkoutPlansRedirect");
    expect(layoutSource).toContain("`/dashboard/admin/workout-planner?${params.toString()}`");
    expect(coreRoutes).toContain("app.use('/api/workouts', clientWorkoutRoutes)");
  });

  it('loads current workout through the shared api service auth pipeline', async () => {
    const { result } = renderHook(() => useCurrentWorkout(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiService.get).toHaveBeenCalledWith('/api/workouts/42/current');
    expect(result.current.data?.name).toBe('Strength Block');
    expect(result.current.error).toBeNull();
  });

  it('keeps source guards against stale direct auth fetches', () => {
    expect(source).toContain("apiService.get(`/api/workouts/${userId}/current`)");
    expect(source).not.toContain('localStorage.getItem');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('localhost:10000');
  });
});
