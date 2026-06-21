/**
 * ============================================================================
 * FILE: NutritionWorkspace.tsx
 * PURPOSE: Unified Nutrition Hub — meal logging, food search, hydration,
 *          macro charts, and nutrition education in a tabbed interface
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Combines FoodIntakeForm, FoodSearchPanel,
 * FoodIntelligenceDashboard, HydrationTab, LearnTab, and macro Victory charts
 * in a scrollable tab bar. Available to all roles.
 *
 * HOW IT FITS IN THE APP: UniversalDashboardLayout → NutritionWorkspace
 * KEY DECISIONS: 11 tabs (Log, Search, Restaurant, Hydration, Macros, Garden, Farms, Supplements, AI Meal Plan, Intelligence, Learn)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: NutritionWorkspace                               ║
 * ║  PURPOSE: Unified nutrition hub with 10 tabs                  ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-26                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CLICK-OUTCOMES:
 * [Tab: Log Meal] → FoodIntakeForm → POST /api/macros
 * [Tab: Food Search] → FoodSearchPanel → USDA/barcode lookup
 * [Tab: Hydration] → NutritionHydrationTab → localStorage tracker
 * [Tab: My Macros] → Victory MacroDonut + NutritionBalanceRadar
 * [Tab: Intelligence] → FoodIntelligenceDashboard
 * [Tab: Learn] → NutritionLearnTab → NASM education accordion
 */

import React, { useCallback, useState, lazy, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Utensils, Search, Apple, ScanBarcode, Droplets, BookOpen, PieChart, Building2, Sprout, MapPin, Pill, Brain, Mic, CalendarCheck, HeartPulse } from 'lucide-react';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useHydration } from '../../../hooks/useHydration';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
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
  TabBtn,
  TabRow,
  WorkspaceRoot,
} from './NutritionWorkspace.styles';

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

type Tab = 'today' | 'log' | 'voice' | 'search' | 'restaurant' | 'hydration' | 'macros' | 'intelligence' | 'learn' | 'garden' | 'farms' | 'supplements' | 'meal-plan';

const nutritionTabId = (tab: Tab) => `nutrition-tab-${tab}-tab`;
const nutritionPanelId = (tab: Tab) => `nutrition-tab-${tab}`;

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <CalendarCheck size={16} /> },
  { id: 'log', label: 'Log Meal', icon: <Utensils size={16} /> },
  { id: 'voice', label: 'Speak a Meal', icon: <Mic size={16} /> },
  { id: 'search', label: 'Food Search', icon: <ScanBarcode size={16} /> },
  { id: 'restaurant', label: 'Restaurant', icon: <Building2 size={16} /> },
  { id: 'hydration', label: 'Hydration', icon: <Droplets size={16} /> },
  { id: 'macros', label: 'My Macros', icon: <PieChart size={16} /> },
  { id: 'garden', label: 'Garden', icon: <Sprout size={16} /> },
  { id: 'farms', label: 'Farm Finder', icon: <MapPin size={16} /> },
  { id: 'supplements', label: 'Supplements', icon: <Pill size={16} /> },
  { id: 'meal-plan', label: 'Swan Coach Meal Plan', icon: <Brain size={16} /> },
  { id: 'intelligence', label: 'Intelligence', icon: <Search size={16} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={16} /> },
];

const OUNCES_TO_ML = 29.5735;
const GENTLE_MODE_STORAGE_KEY = 'ss-nutrition-gentle-mode';

const readGentleModePreference = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GENTLE_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeGentleModePreference = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GENTLE_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage can be unavailable in private or embedded contexts; the UI state still works.
  }
};

const MacroChartsPanel: React.FC<{ summary: MacroSummary | null; loading: boolean; gentleMode: boolean }> = ({ summary, loading, gentleMode }) => {
  const { filled: hydrationGlasses, glassOz, loading: hydrationLoading } = useHydration();
  const hydrationMl = Math.round(hydrationGlasses * glassOz * OUNCES_TO_ML);

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
        loading={loading || hydrationLoading}
      />
    </MacroGrid>
  );
};

const NutritionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [gentleMode, setGentleMode] = useState<boolean>(() => readGentleModePreference());
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAINutrition = isPro || isElite || isTrial;
  const { summary, loading: macroLoading, error: macroError, refetch: refetchMacroSummary } = useMacroSummary();
  const reduceMotion = Boolean(useReducedMotion());
  const handleMealLogResult = useCallback((success: boolean) => {
    if (success) {
      refetchMacroSummary();
    }
  }, [refetchMacroSummary]);

  const toggleGentleMode = useCallback(() => {
    setGentleMode((current) => {
      const next = !current;
      writeGentleModePreference(next);
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

      <TabRow role="tablist" aria-label="Nutrition workspace tabs">
        {TABS.map(tab => (
          <TabBtn
            key={tab.id}
            id={nutritionTabId(tab.id)}
            type="button"
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={nutritionPanelId(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </TabBtn>
        ))}
      </TabRow>

      <ContentArea
        role="tabpanel"
        id={nutritionPanelId(activeTab)}
        aria-labelledby={nutritionTabId(activeTab)}
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
