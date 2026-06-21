import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNutritionPlan } from './useNutritionPlan';

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api.service', () => ({
  default: mockApiService,
}));

const source = readFileSync(resolve(__dirname, './useNutritionPlan.ts'), 'utf8');
const repoRoot = resolve(__dirname, '../../..');
const routeComponentsSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const routeRegistrySource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');

describe('useNutritionPlan auth pipeline', () => {
  beforeEach(() => {
    mockApiService.get.mockReset();
    mockApiService.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 77,
          name: 'Performance Nutrition',
          dailyCalories: 2200,
          macros: { protein: 150, carbs: 200, fat: 70 },
          meals: [],
          groceryList: [],
          dietaryRestrictions: [],
          allergies: [],
          hydrationTarget: 3,
          notes: '',
          startDate: '2026-05-23',
          createdAt: '2026-05-23T12:00:00.000Z',
        },
      },
    });
  });

  it('is consumed by mounted nutrition builder routes backed by mounted nutrition APIs', () => {
    expect(routeComponentsSource).toContain("export const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'))");
    expect(routeRegistrySource).toContain("{ path: '/nutrition/:clientId?', component: NutritionPlanBuilder");
    expect(coreRoutes).toContain("app.use('/api/nutrition', clientNutritionRoutes)");
  });

  it('loads current nutrition through the shared api service auth pipeline', async () => {
    const { result } = renderHook(() => useNutritionPlan(42));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiService.get).toHaveBeenCalledWith('/api/nutrition/42/current');
    expect(result.current.data?.name).toBe('Performance Nutrition');
    expect(result.current.error).toBeNull();
  });

  it('keeps source guards against stale direct auth fetches', () => {
    expect(source).toContain("apiService.get(`/api/nutrition/${userId}/current`)");
    expect(source).not.toContain('localStorage.getItem');
    expect(source).not.toContain('fetch(');
  });
});
