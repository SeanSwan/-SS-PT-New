/**
 * FILE: NutritionWorkspace.tsx
 * PURPOSE: Mounted nutrition hub for capture, review, macros, hydration, and education.
 * HOW IT FITS: UniversalDashboardLayout -> role /meal-planner route -> NutritionWorkspace.
 */
import React, { useCallback, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { Apple, HeartPulse } from 'lucide-react';
import NutritionWorkspaceCapture from './NutritionWorkspace.capture';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import { useWorkoutSessions } from '../../../hooks/useDashboardQueries';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';
import LogFoodCommandCenter, { type LogFoodCommand } from '../../FoodTracker/LogFoodCommandCenter';
import NutritionReviewDrawer from '../../FoodTracker/NutritionReviewDrawer';
import { restaurantFoodToNutritionDraft } from '../../FoodTracker/nutritionDraft.adapters';
import type { RestaurantAddFoodPayload } from '../../FoodTracker/RestaurantTab.logic';
import type { NutritionEntryDraft } from '../../FoodTracker/nutritionDraft.types';
import { hasWorkoutLoggedOnDate } from './NutritionTodayPanel.trainingDay';
import MacroChartsPanel from './NutritionWorkspace.macroCharts';
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

const NutritionWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [gentleMode, setGentleMode] = useState<boolean>(() => readNutritionGentleModePreference());
  const [reviewDraft, setReviewDraft] = useState<NutritionEntryDraft | null>(null);
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAINutrition = isPro || isElite || isTrial;
  const { summary, loading: macroLoading, error: macroError, refetch: refetchMacroSummary } = useMacroSummary();
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const trainingDay = hasWorkoutLoggedOnDate(workoutSessions.data, summary?.date);
  const reduceMotion = Boolean(useReducedMotion());
  const activeMoreTab = isMoreNutritionTab(activeTab);

  const handleMealLogResult = useCallback((success: boolean) => {
    if (success) refetchMacroSummary();
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

  const handleRestaurantFood = useCallback((food: RestaurantAddFoodPayload) => {
    setReviewDraft(restaurantFoodToNutritionDraft(food));
  }, []);

  const handleReviewSaved = useCallback((success: boolean, options?: { closeDrawer?: boolean }) => {
    if (success) handleMealLogResult(true);
    if (success && options?.closeDrawer !== false) setReviewDraft(null);
  }, [handleMealLogResult]);

  const handleLogFoodCommand = useCallback((command: LogFoodCommand) => {
    const tabByCommand: Partial<Record<LogFoodCommand, Tab>> = {
      manual: 'log',
      voice: 'voice',
      snap: 'meal-plan',
      search: 'search',
      restaurant: 'restaurant',
    };
    if (command === 'scan') {
      // BP02 5.3: SPA navigation — the old full-page reload dropped auth
      // context and re-downloaded the bundle on every scan tap.
      navigate('/food-scanner');
      return;
    }
    const nextTab = tabByCommand[command];
    if (nextTab) setActiveTab(nextTab);
  }, [navigate]);

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
              <>
                <LogFoodCommandCenter onCommand={handleLogFoodCommand} />
                <NutritionTodayPanel
                  summary={summary}
                  loading={macroLoading}
                  onNavigate={(target) => setActiveTab(target)}
                  onLogged={refetchMacroSummary}
                  gentleMode={gentleMode}
                  onAskCoach={handleGentleCoach}
                  trainingDay={trainingDay}
                />
              </>
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
            {activeTab === 'restaurant' && <RestaurantTab onAddFood={handleRestaurantFood} />}
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
      <NutritionReviewDrawer draft={reviewDraft} onClose={() => setReviewDraft(null)} onSaved={handleReviewSaved} />
    </WorkspaceRoot>
  );
};

export default NutritionWorkspace;
