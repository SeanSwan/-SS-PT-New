/**
 * FILE: useHomeNutritionAction.ts
 * PURPOSE: Bridges Today nutrition truth into the Home daily health loop.
 */
import { useMemo } from 'react';
import { useHydration } from '../../../hooks/useHydration';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import {
  getNextNutritionAction,
  type NutritionTodayTarget,
} from '../../DashBoard/workspaces/NutritionTodayPanel.logic';

export interface HomeNutritionAction {
  title: string;
  copy: string;
  target: NutritionTodayTarget;
  label: string;
}

export function useHomeNutritionAction(): HomeNutritionAction | null {
  const macro = useMacroSummary();
  const hydration = useHydration();

  return useMemo(() => {
    if (macro.loading || hydration.loading || macro.error || !macro.summary) {
      return null;
    }

    return {
      ...getNextNutritionAction(macro.summary, hydration),
      label: 'Open Nutrition Today',
    };
  }, [
    macro.error,
    macro.loading,
    macro.summary,
    hydration.dailyGoal,
    hydration.filled,
    hydration.glassOz,
    hydration.loading,
  ]);
}
