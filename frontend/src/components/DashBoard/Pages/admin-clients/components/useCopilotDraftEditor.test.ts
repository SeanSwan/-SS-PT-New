import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WorkoutPlan } from './copilot-types';
import { useCopilotDraftEditor } from './useCopilotDraftEditor';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const PLAN: WorkoutPlan = {
  planName: 'Original Plan',
  durationWeeks: 4,
  summary: 'Original summary',
  days: [
    {
      dayNumber: 1,
      name: 'Push Day',
      focus: 'Upper body',
      exercises: [
        {
          name: 'Bench Press',
          setScheme: '4x8',
          repGoal: '8 reps',
          restPeriod: 90,
        },
      ],
    },
  ],
};

describe('useCopilotDraftEditor', () => {
  it('keeps draft edit helpers outside the copilot state-machine shell', () => {
    expect(panelSource).toContain("from './useCopilotDraftEditor'");
    expect(panelSource).not.toContain('const updatePlanField =');
    expect(panelSource).not.toContain('const updateExercise =');
    expect(panelSource).not.toContain('const addExercise =');
  });

  it('edits plan, day, and exercise fields immutably', () => {
    const { result } = renderHook(() => useCopilotDraftEditor());

    act(() => {
      result.current.setEditedPlan(PLAN);
    });
    act(() => {
      result.current.updatePlanField('planName', 'Updated Plan');
      result.current.updateDay(0, 'focus', 'Strength focus');
      result.current.updateExercise(0, 0, 'restPeriod', 120);
    });

    expect(result.current.editedPlan?.planName).toBe('Updated Plan');
    expect(result.current.editedPlan?.days[0].focus).toBe('Strength focus');
    expect(result.current.editedPlan?.days[0].exercises[0].restPeriod).toBe(120);
    expect(PLAN.planName).toBe('Original Plan');
    expect(PLAN.days[0].focus).toBe('Upper body');
    expect(PLAN.days[0].exercises[0].restPeriod).toBe(90);
  });

  it('adds and removes draft exercises without mutating the original plan', () => {
    const { result } = renderHook(() => useCopilotDraftEditor());

    act(() => {
      result.current.setEditedPlan(PLAN);
    });
    act(() => {
      result.current.addExercise(0);
    });

    expect(result.current.editedPlan?.days[0].exercises).toHaveLength(2);
    expect(result.current.editedPlan?.days[0].exercises[1]).toEqual({
      name: '',
      setScheme: '',
      repGoal: '',
      restPeriod: 60,
    });
    expect(PLAN.days[0].exercises).toHaveLength(1);

    act(() => {
      result.current.removeExercise(0, 0);
    });

    expect(result.current.editedPlan?.days[0].exercises).toHaveLength(1);
    expect(result.current.editedPlan?.days[0].exercises[0].name).toBe('');
  });

  it('toggles expanded draft days', () => {
    const { result } = renderHook(() => useCopilotDraftEditor());

    act(() => {
      result.current.toggleDay(0);
    });

    expect(result.current.expandedDays.has(0)).toBe(true);

    act(() => {
      result.current.toggleDay(0);
    });

    expect(result.current.expandedDays.has(0)).toBe(false);
  });
});
