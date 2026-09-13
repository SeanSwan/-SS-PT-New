import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost }));

vi.mock('../../../frontend/src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'trainer' }, authAxios: mockAuthAxios }),
}));

import WorkoutPlannerBlendDialog from '../../../frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog';
import type { SavedPlanSummary } from '../../../frontend/src/components/DashBoard/Pages/admin-workout-planner/SavedPlanCard';

const PLAN_A = '550e8400-e29b-41d4-a716-446655440000';
const PLAN_B = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const savedPlans: SavedPlanSummary[] = [
  { id: PLAN_A, name: 'Primary Strength Arc', status: 'active', createdAt: '', goal: 'strength', isPrimary: true },
  { id: PLAN_B, name: 'Backup General Fitness', status: 'draft', createdAt: '', goal: 'general_fitness' },
];

const planWeeks = (count: number) => ({
  data: { success: true, plan: { planData: { weeks: Array.from({ length: count }, (_, i) => ({ weekNumber: i + 1 })) } } },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => Promise.resolve(url.endsWith(PLAN_A) ? planWeeks(1) : planWeeks(1)));
  mockPost.mockResolvedValue({ data: { success: true, blendedPlanId: 'new-plan' } });
});

describe('WorkoutPlannerBlendDialog UUID plan id acceptance', () => {
  it('preserves UUID source ids in the blend request body', async () => {
    render(<WorkoutPlannerBlendDialog open savedPlans={savedPlans} onClose={vi.fn()} onBlended={vi.fn()} />);

    await screen.findByText('Week 1');
    fireEvent.click(screen.getByRole('button', { name: 'Create blended plan' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/blend', {
      planAId: PLAN_A,
      planBId: PLAN_B,
      picks: [{ source: 'A', weekNumber: 1 }],
    }));
  });
});
