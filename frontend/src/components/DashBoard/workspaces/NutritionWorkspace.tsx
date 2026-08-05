/**
 * FILE: NutritionWorkspace.tsx
 * PURPOSE: Mounted nutrition hub for capture, review, macros, hydration, and education.
 * HOW IT FITS: UniversalDashboardLayout -> role /meal-planner route -> NutritionWorkspace.
 */
import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Apple, HeartPulse } from 'lucide-react';
import NutritionWorkspaceCapture from './NutritionWorkspace.capture';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import { useWorkoutSessions } from '../../../hooks/useDashboardQueries';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';
import NutritionReviewDrawer from '../../FoodTracker/NutritionReviewDrawer';
import NutritionDiaryTimeline from './NutritionDiaryTimeline';
import { restaurantFoodToNutritionDraft } from '../../FoodTracker/nutritionDraft.adapters';
import type { RestaurantAddFoodPayload } from '../../FoodTracker/RestaurantTab.logic';
import type { NutritionEntryDraft } from '../../FoodTracker/nutritionDraft.types';
import { hasWorkoutLoggedOnDate } from './NutritionTodayPanel.trainingDay';
import MacroChartsPanel from './NutritionWorkspace.macroCharts';
import SegmentedTabBar from './SegmentedTabBar';
import QuickAddFab from '../../FoodTracker/QuickAddFab';
import StreakRing from '../../FoodTracker/StreakRing';
import CelebrationToast from '../../FoodTracker/CelebrationToast';
import SwanErrorCard from '../../FoodTracker/SwanErrorCard';
// Lazy: the Food Quality surface (resurrected ingredient-safety intelligence)
// is heavy and reached only through the Explore segment.
const FoodQualityTab = lazy(() => import('../../FoodTracker/FoodQualityTab'));
import {
  detectStreakMilestone,
  readCurrentLogStreak,
  streakMilestoneMessage,
} from '../../FoodTracker/nutritionStreakMilestones';
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
  WorkspaceRoot,
} from './NutritionWorkspace.styles';
import {
  NUTRITION_TAB_LABELS,
  nutritionPanelId,
  type Tab,
} from './NutritionWorkspace.tabs';

const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'));
const NutritionBarcodeCapture = lazy(() => import('../../FoodTracker/NutritionBarcodeCapture'));
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
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [gentleMode, setGentleMode] = useState<boolean>(() => readNutritionGentleModePreference());
  const [reviewDraft, setReviewDraft] = useState<NutritionEntryDraft | null>(null);
  // Bumped on every successful meal save. The macro-error diary branch keys
  // its refetch on this — a constant key there meant the diary NEVER
  // refetched after a save while the summary endpoint was down; only a full
  // reload recovered.
  const [diarySaveTick, setDiarySaveTick] = useState(0);
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAINutrition = isPro || isElite || isTrial;
  const { summary, loading: macroLoading, error: macroError, refetch: refetchMacroSummary } = useMacroSummary();
  const workoutSessions = useWorkoutSessions({ limit: 50 });
  const trainingDay = hasWorkoutLoggedOnDate(workoutSessions.data, summary?.date);
  const reduceMotion = Boolean(useReducedMotion());
  const logStreak = readCurrentLogStreak(summary);
  const [celebration, setCelebration] = useState<string | null>(null);
  // Milestone watcher (4C): a log action refetches the summary; when the
  // refreshed streak crosses 3/7/30 the toast fires once. First load (null
  // prev) and Gentle Mode never celebrate — ED-safe, numbers stay hidden.
  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    // No summary (loading or error) leaves the last real streak untouched so
    // an error→recovery refetch can never fake a milestone crossing.
    if (macroLoading || !summary) return;
    const prev = prevStreakRef.current;
    prevStreakRef.current = logStreak;
    if (prev === null || gentleMode) return;
    const milestone = detectStreakMilestone(prev, logStreak);
    if (milestone !== null) setCelebration(streakMilestoneMessage(milestone));
  }, [logStreak, macroLoading, summary, gentleMode]);
  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const handleMealLogResult = useCallback((success: boolean) => {
    if (success) {
      refetchMacroSummary();
      setDiarySaveTick((tick) => tick + 1);
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

  const handleRestaurantFood = useCallback((food: RestaurantAddFoodPayload) => {
    setReviewDraft(restaurantFoodToNutritionDraft(food));
  }, []);

  const handleReviewSaved = useCallback((success: boolean, options?: { closeDrawer?: boolean }) => {
    if (success) {
      handleMealLogResult(true);
      setActiveTab('today');
    }
    if (success && options?.closeDrawer !== false) setReviewDraft(null);
  }, [handleMealLogResult]);

  const handleCloseReview = useCallback(() => setReviewDraft(null), []);

  const macroUnavailablePanel = macroError ? (
    <SwanErrorCard
      title="Nutrition totals unavailable"
      message={macroError}
      onRetry={refetchMacroSummary}
      ariaLabel="Nutrition totals unavailable"
    />
  ) : null;

  return (
    <WorkspaceRoot>
      <Header>
        <HeaderIcon><Apple size={28} /></HeaderIcon>
        <div>
          <HeaderTitle>Nutrition Intelligence</HeaderTitle>
          <HeaderSubtitle>Today&apos;s diary, macro balance, hydration, and trainer review</HeaderSubtitle>
        </div>
        <HeaderActions>
          {!gentleMode && logStreak > 0 && (
            <StreakRing streak={logStreak} reduceMotion={reduceMotion} />
          )}
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
      <SegmentedTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        premiumLocked={!hasAINutrition}
      />

      <ContentArea
        role="region"
        id={nutritionPanelId(activeTab)}
        aria-label={NUTRITION_TAB_LABELS[activeTab]}
      >
        <ErrorBoundary>
          <Suspense fallback={<CosmicSuspenseLoader />}>
            {activeTab === 'today' && (
              macroError ? (
                <>
                  {macroUnavailablePanel}
                  <section aria-label="Nutrition Today diary">
                    <NutritionDiaryTimeline
                      gentleMode={gentleMode}
                      refreshKey={`summary-unavailable:${diarySaveTick}`}
                      onReviewDraft={setReviewDraft}
                    />
                  </section>
                </>
              ) : (
                <NutritionTodayPanel
                  summary={summary}
                  loading={macroLoading}
                  onNavigate={(target) => setActiveTab(target)}
                  onReviewDraft={setReviewDraft}
                  gentleMode={gentleMode}
                  onAskCoach={handleGentleCoach}
                  trainingDay={trainingDay}
                />
              )
            )}
            {activeTab === 'log' && <FoodIntakeForm onDataSent={handleMealLogResult} onReviewDraft={setReviewDraft} />}
            {activeTab === 'voice' && (
              <CrystallineLockOverlay
                isLocked={!hasAINutrition}
                featureName="Speak a Meal"
                description="Dictate what you ate and Swan Coach logs it after your review"
                ctaLabel="Upgrade to Swan Guardian"
                onConfigure={() => { window.location.href = '/ascension'; }}
              >
                <VoiceNutritionPanel onDataSent={handleMealLogResult} onReviewDraft={setReviewDraft} />
              </CrystallineLockOverlay>
            )}
            {activeTab === 'search' && <FoodSearchPanel onDataSent={handleMealLogResult} onReviewDraft={setReviewDraft} />}
            {activeTab === 'barcode' && <NutritionBarcodeCapture onReviewDraft={setReviewDraft} />}
            {activeTab === 'restaurant' && <RestaurantTab onAddFood={handleRestaurantFood} />}
            {activeTab === 'hydration' && <NutritionHydrationTab />}
            {activeTab === 'macros' && (macroUnavailablePanel || <MacroChartsPanel summary={summary} loading={macroLoading} gentleMode={gentleMode} />)}
            {activeTab === 'garden' && <GardeningTab />}
            {activeTab === 'farms' && <FarmFinderTab />}
            {activeTab === 'supplements' && <SupplementsTab />}
            {activeTab === 'quality' && (
              <Suspense fallback={<CosmicSuspenseLoader />}>
                <FoodQualityTab />
              </Suspense>
            )}
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
      <NutritionReviewDrawer draft={reviewDraft} onClose={handleCloseReview} onSaved={handleReviewSaved} />
      <QuickAddFab
        onReviewDraft={setReviewDraft}
        onNavigate={setActiveTab}
        reduceMotion={reduceMotion}
        gentleMode={gentleMode}
      />
      <CelebrationToast message={celebration} onDismiss={dismissCelebration} reduceMotion={reduceMotion} />
    </WorkspaceRoot>
  );
};

export default NutritionWorkspace;
