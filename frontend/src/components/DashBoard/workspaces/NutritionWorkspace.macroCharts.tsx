import React, { lazy } from 'react';
import { HeartPulse } from 'lucide-react';
import { useHydration } from '../../../hooks/useHydration';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import {
  MacroGrid,
  MacroHiddenPanel,
  MacroHiddenText,
  MacroHiddenTitle,
} from './NutritionWorkspace.styles';

const MacroDonut = lazy(() => import('../../Charts/charts/pie/MacroDonut'));
const NutritionBalanceRadar = lazy(() => import('../../Charts/charts/radar/NutritionBalanceRadar'));
const OUNCES_TO_ML = 29.5735;

interface MacroChartsPanelProps {
  summary: MacroSummary | null;
  loading: boolean;
  gentleMode: boolean;
}

const MacroChartsPanel: React.FC<MacroChartsPanelProps> = ({ summary, loading, gentleMode }) => {
  const { filled, dailyGoal, glassOz, loading: hydrationLoading } = useHydration();
  const hydrationMl = Math.round(filled * glassOz * OUNCES_TO_ML);
  const hydrationTargetMl = Math.round(dailyGoal * glassOz * OUNCES_TO_ML);

  if (gentleMode) {
    return (
      <MacroHiddenPanel role="region" aria-label="Gentle mode macro charts hidden">
        <HeartPulse size={28} aria-hidden="true" />
        <MacroHiddenTitle>Gentle Mode is on</MacroHiddenTitle>
        <MacroHiddenText>
          Macro charts are hidden while you use Today for meal rhythm, hydration, and coach support.
        </MacroHiddenText>
      </MacroHiddenPanel>
    );
  }

  return (
    <MacroGrid>
      <MacroDonut
        protein={summary?.totalProtein}
        carbs={summary?.totalCarbs}
        fat={summary?.totalFat}
        totalCalories={summary?.totalCalories}
        loading={loading}
      />
      <NutritionBalanceRadar
        protein={summary?.totalProtein}
        carbs={summary?.totalCarbs}
        fat={summary?.totalFat}
        fiber={summary?.totalFiber}
        hydrationMl={hydrationMl}
        hydrationTargetMl={hydrationTargetMl}
        loading={loading || hydrationLoading}
      />
    </MacroGrid>
  );
};

export default MacroChartsPanel;
