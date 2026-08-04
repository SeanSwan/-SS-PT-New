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
import { readNutritionGentleModePreference } from '../../DashBoard/workspaces/nutritionGentleModePreference';

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
    // Gentle mode intentionally hides the nutrition mission — that null stays.
    if (readNutritionGentleModePreference()) {
      return null;
    }

    // Still fetching: keep the slot empty for this render pass only.
    if (macro.loading || hydration.loading) {
      return null;
    }

    // 4D fix (2026-08-04): a transient /api/macros/summary failure used to
    // silently ERASE nutrition from Home — users saw the mission once, then it
    // vanished and trained them to ignore it. Degrade to a generic, always-true
    // invitation instead of disappearing.
    if (macro.error || !macro.summary) {
      return {
        title: 'Log a meal',
        copy: 'A quick note about your last meal keeps your story moving.',
        target: 'log',
        label: 'Open Nutrition Today',
      };
    }

    return {
      ...getNextNutritionAction(macro.summary, hydration),
      label: 'Open Nutrition Today',
    };
  }, [macro.loading, macro.error, macro.summary, hydration]);
}
