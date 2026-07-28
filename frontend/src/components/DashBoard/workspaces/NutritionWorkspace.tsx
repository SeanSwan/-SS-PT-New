/**
 * ============================================================================
 * FILE: NutritionWorkspace.tsx
 * PURPOSE: Unified Nutrition Hub â€” meal logging, food search, hydration,
 *          macro charts, and secondary nutrition tools in a focused interface
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Combines FoodIntakeForm, FoodSearchPanel,
 * FoodIntelligenceDashboard, HydrationTab, LearnTab, macro Victory charts,
 * and lower-priority nutrition tools behind More. Available to all roles.
 *
 * HOW IT FITS IN THE APP: UniversalDashboardLayout â†’ NutritionWorkspace
 * KEY DECISIONS: Today-first primary tabs; Restaurant, Garden, Farm Finder,
 * and Supplements stay available behind More.
 *
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  COMPONENT: NutritionWorkspace                               â•‘
 * â•‘  PURPOSE: Unified nutrition hub with 10 tabs                  â•‘
 * â•‘  OWNER: Claude Opus 4.6                                       â•‘
 * â•‘  LAST VALIDATED: 2026-03-26                                   â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * CLICK-OUTCOMES:
 * [Tab: Log Meal] â†’ FoodIntakeForm â†’ POST /api/macros
 * [Tab: Food Search] â†’ FoodSearchPanel â†’ USDA/barcode lookup
 * [Tab: Hydration] â†’ NutritionHydrationTab â†’ localStorage tracker
 * [Tab: My Macros] â†’ Victory MacroDonut + NutritionBalanceRadar
 * [Tab: Intelligence] â†’ FoodIntelligenceDashboard
 * [Tab: Learn] â†’ NutritionLearnTab â†’ NASM education accordion
 */

import React, { useCallback, useState, lazy, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Apple, HeartPulse } from 'lucide-react';
import NutritionWorkspaceCapture from './NutritionWorkspace.capture';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useHydration } from '../../../hooks/useHydration';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import { useWorkoutSessions } from '../../../hooks/useDashboardQueries';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import { hasWorkoutLoggedOnDate } from './NutritionTodayPanel.trainingDay';
import {
  readNutritionGentleModePreference,
  writeNutritionGentleModePreference,
} from './nutritionGentleModePreference';
import {
  ContentArea,
  Header,
  HeaderActions,
  HeaderIcon,
  HeaderSubtitle,
  HeaderTitle,
  GentleModeButton,
  MacroHiddenPanel,
  MacroHiddenText,
  MacroHiddenTitle,
  MacroGrid,
  MoreToolsLabel,
  MoreToolsRow,
  MoreToolsSelect,
  WorkspaceRoot,
} from './NutritionWorkspace.styles';
import {
  NUTRITION_MORE_TABS,
  NUTRITION_TAB_LABELS,
  isMoreNutritionTab,
  nutritionPanelId,
  nutritionTabId,
  type Tab,
} from './NutritionWorkspace.tabs';

// SECTION: Lazy imports
const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'));
const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'));
const FoodSearchPanel = lazy(() => import('../../FoodTracker/FoodSearchPanel'));
const NutritionHydrationTab = lazy(() => import('./NutritionHydrationTab'));
const NutritionLearnTab = lazy(() => import('./NutritionLearnTab'));
const RestaurantTab = lazy(() => import('../../FoodTracker/RestaurantTab'));
const GardeningTab = lazy(() => import('../../FoodTracker/GardeningTab'));
const FarmFinderTab = lazy(() => import('../../FoodTracker/FarmFinderTab'));
const SupplementsTab = lazy(() => import('../../FoodTracker/SupplementsTab'));
const MealPlanTab = lazy(() => import('../../FoodTracker/MealPlanTab'));
const VoiceNutritionPanel = lazy(() => import('../../FoodTracker/VoiceNutritionPanel'));
const NutritionTodayPanel = lazy(() => import('./NutritionTodayPanel'));
const MacroDonut = lazy(() => import('../../Charts/charts/pie/MacroDonut'));
const NutritionBalanceRadar = lazy(() => import('../../Charts/charts/radar/NutritionBalanceRadar'));

const OUNCES_TO_ML = 29.5735;

const MacroChartsPanel: React.FC<{ summary: MacroSummary | null; loading: boolean; gentleMode: boolean }> = ({ summary, loading, gentleMode }) => {
  const { filled: hydrationGlasses, dailyGoal: hydrationGoalGlasses, glassOz, loading: hydrationLoading } = useHydration();
  const hydrationMl = Math.round(hydrationGlasses * glassOz * OUNCES_TO_ML);
  const hydrationTargetMl = Math.round(hydrationGoalGlasses * glassOz * OUNCES_TO_ML);

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

const NutritionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [gentleMode, setGentleMode] = useState<boolean>(() => readNutritionGentleModePreference());
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAINutrition = isPro || isElite || isTrial;
  const { summary, loading: macroLoading, error: macroError, refetch: refetchMacroSummary } = useMacroSummary();
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const trainingDay = hasWorkoutLoggedOnDate(workoutSessions.data, summary?.date);
  const reduceMotion = Boolean(useReducedMotion());
  const activeMoreTab = isMoreNutritionTab(activeTab);
  const handleMealLogResult = useCallback((success: boolean) => {
    if (success) {
      refetchMacroSummary();
    }
  }, [refetchMacroSummary]);

  const toggleGentleMode = useCallback(() => {
    setGentleMode((current) => {
      const next = !current;
      writeNutritionGentleModePreference(next);
      return next;
    });
  }, []);

  const handleGentleCoach = useCallback(() => {
    const prompt = encodeURIComponent('I want gentle nutrition support without numbers or pressure.');
    window.location.href = `/dashboard/client/coach-assistant?teachPrompt=${prompt}`;
  }, []);
  const macroUnavailablePanel = macroError ? (
    <MacroHiddenPanel role="alert" aria-live="assertive" aria-label="Nutrition totals unavailable">
      <MacroHiddenTitle>Nutrition totals unavailable</MacroHiddenTitle>
      <MacroHiddenText>{macroError}</MacroHiddenText>
    </MacroHiddenPanel>
  ) : null;

  return (
    <WorkspaceRoot>
      <Header>
        <HeaderIcon><Apple size={28} /></HeaderIcon>
        <div>
          <HeaderTitle>Nutrition Intelligence</HeaderTitle>
          <HeaderSubtitle>Log meals, track macros, hydration, and learn nutrition science</HeaderSubtitle>
        </div>
        <HeaderActions>
          <GentleModeButton
            type="button"
            $active={gentleMode}
            aria-pressed={gentleMode}
            aria-label={gentleMode ? 'Turn Gentle Mode off' : 'Turn Gentle Mode on'}
            onClick={toggleGentleMode}
          >
            <HeartPulse size={16} /> Gentle Mode {gentleMode ? 'On' : 'Off'}
          </GentleModeButton>
        </HeaderActions>
      </Header>

      <NutritionWorkspaceCapture
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        summary={summary}
        macroLoading={macroLoading}
        gentleMode={gentleMode}
        trainingDay={trainingDay}
        reduceMotion={reduceMotion}
      />
      <MoreToolsRow>
        <MoreToolsLabel htmlFor="nutrition-more-tools">More</MoreToolsLabel>
        <MoreToolsSelect
          id="nutrition-more-tools"
          aria-label="More nutrition tools"
          aria-controls={activeMoreTab ? nutritionPanelId(activeTab) : undefined}
          value={activeMoreTab ? activeTab : ''}
          onChange={(event) => {
            const nextTab = event.target.value as Tab;
            if (nextTab) setActiveTab(nextTab);
          }}
        >
          <option value="">Choose a nutrition tool</option>
          {NUTRITION_MORE_TABS.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </MoreToolsSelect>
      </MoreToolsRow>

      <ContentArea
        role="tabpanel"
        id={nutritionPanelId(activeTab)}
        aria-labelledby={activeMoreTab ? undefined : nutritionTabId(activeTab)}
        aria-label={activeMoreTab ? NUTRITION_TAB_LABELS[activeTab] : undefined}
      >
        <ErrorBoundary>
          <Suspense fallback={<CosmicSuspenseLoader />}>
            {activeTab === 'today' && (macroUnavailablePanel || (
              <NutritionTodayPanel
                summary={summary}
                loading={macroLoading}
                onNavigate={(target) => setActiveTab(target)}
                onLogged={refetchMacroSummary}
                gentleMode={gentleMode}
                onAskCoach={handleGentleCoach}
                trainingDay={trainingDay}
              />
            ))}
            {activeTab === 'log' && <FoodIntakeForm onDataSent={handleMealLogResult} />}
            {activeTab === 'voice' && (
              <CrystallineLockOverlay
                isLocked={!hasAINutrition}
                featureName="Speak a Meal"
                description="Dictate what you ate and Swan Coach logs it after your review"
                ctaLabel="Upgrade to Swan Guardian"
                onConfigure={() => { window.location.href = '/ascension'; }}
              >
                <VoiceNutritionPanel onDataSent={handleMealLogResult} />
              </CrystallineLockOverlay>
            )}
            {activeTab === 'search' && <FoodSearchPanel onDataSent={handleMealLogResult} />}
            {activeTab === 'restaurant' && <RestaurantTab />}
            {activeTab === 'hydration' && <NutritionHydrationTab />}
            {activeTab === 'macros' && (macroUnavailablePanel || <MacroChartsPanel summary={summary} loading={macroLoading} gentleMode={gentleMode} />)}
            {activeTab === 'garden' && <GardeningTab />}
            {activeTab === 'farms' && <FarmFinderTab />}
            {activeTab === 'supplements' && <SupplementsTab />}
            {activeTab === 'meal-plan' && (
              <CrystallineLockOverlay
                isLocked={!hasAINutrition}
                featureName="Swan Coach Meal Planning"
                description="Swan Coach meal plans tailored to your macros and goals"
                ctaLabel="Upgrade to Swan Guardian"
                onConfigure={() => { window.location.href = '/ascension'; }}
              >
                <MealPlanTab onDataSent={handleMealLogResult} />
              </CrystallineLockOverlay>
            )}
            {activeTab === 'intelligence' && (
              <CrystallineLockOverlay
                isLocked={!hasAINutrition}
                featureName="Nutrition Intelligence"
                description="Swan Coach food analysis and personalized nutrition coaching"
                ctaLabel="Upgrade to Swan Guardian"
                onConfigure={() => { window.location.href = '/ascension'; }}
              >
                <FoodIntelligenceDashboard />
              </CrystallineLockOverlay>
            )}
            {activeTab === 'learn' && <NutritionLearnTab />}
          </Suspense>
        </ErrorBoundary>
      </ContentArea>
    </WorkspaceRoot>
  );
};

export default NutritionWorkspace;
