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
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { Utensils, Search, Apple, ScanBarcode, Droplets, BookOpen, PieChart, Building2, Sprout, MapPin, Pill, Brain } from 'lucide-react';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useMacroSummary } from '../../../hooks/useMacroSummary';
import { useSubscription } from '../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../Shared/CrystallineLockOverlay';

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
const MacroDonut = lazy(() => import('../../Charts/charts/pie/MacroDonut'));
const NutritionBalanceRadar = lazy(() => import('../../Charts/charts/radar/NutritionBalanceRadar'));

type Tab = 'log' | 'search' | 'restaurant' | 'hydration' | 'macros' | 'intelligence' | 'learn' | 'garden' | 'farms' | 'supplements' | 'meal-plan';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'log', label: 'Log Meal', icon: <Utensils size={16} /> },
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

const nutritionVars = css`
  --nutrition-panel: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  --nutrition-panel-deep: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  --nutrition-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  --nutrition-soft: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

const nutritionPanelCss = css`
  ${nutritionVars}
  border: 1px solid var(--nutrition-border);
  border-radius: 22px;
  background:
    linear-gradient(160deg, var(--nutrition-panel), var(--nutrition-panel-deep)),
    var(--bg-elevated, #141419);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent),
    0 16px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  backdrop-filter: blur(18px);
`;

const nutritionCardCss = css`
  ${nutritionVars}
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;

const nutritionControlCss = css`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--nutrition-border);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    transform: translateY(-1px);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const nutritionAccentButtonCss = css`
  ${nutritionControlCss}
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--text-inverse, #0F172A);
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
`;

const NutritionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAINutrition = isPro || isElite || isTrial;
  const { summary, loading: macroLoading, refetch: refetchMacroSummary } = useMacroSummary();
  const handleMealLogResult = useCallback((success: boolean) => {
    if (success) {
      refetchMacroSummary();
    }
  }, [refetchMacroSummary]);

  return (
    <WorkspaceRoot>
      <Header>
        <HeaderIcon><Apple size={28} /></HeaderIcon>
        <div>
          <HeaderTitle>Nutrition Intelligence</HeaderTitle>
          <HeaderSubtitle>Log meals, track macros, hydration, and learn nutrition science</HeaderSubtitle>
        </div>
      </Header>

      <TabRow role="tablist" aria-label="Nutrition workspace tabs">
        {TABS.map(tab => (
          <TabBtn
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`nutrition-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </TabBtn>
        ))}
      </TabRow>

      <ContentArea role="tabpanel" id={`nutrition-tab-${activeTab}`}>
        <ErrorBoundary>
          <Suspense fallback={<CosmicSuspenseLoader />}>
            {activeTab === 'log' && <FoodIntakeForm onDataSent={handleMealLogResult} />}
            {activeTab === 'search' && <FoodSearchPanel />}
            {activeTab === 'restaurant' && <RestaurantTab />}
            {activeTab === 'hydration' && <NutritionHydrationTab />}
            {activeTab === 'macros' && (
              <MacroGrid>
                <MacroDonut
                  protein={summary?.totalProtein}
                  carbs={summary?.totalCarbs}
                  fat={summary?.totalFat}
                  totalCalories={summary?.totalCalories}
                  loading={macroLoading}
                />
                <NutritionBalanceRadar
                  protein={summary?.totalProtein}
                  carbs={summary?.totalCarbs}
                  fat={summary?.totalFat}
                  fiber={summary?.totalFiber}
                  loading={macroLoading}
                />
              </MacroGrid>
            )}
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
                <MealPlanTab />
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

const WorkspaceRoot = styled.div`
  ${nutritionPanelCss}
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(96, 192, 240, 0.15));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
`;

const HeaderTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 4px 0 0;
`;

const TabRow = styled.div`
  ${nutritionCardCss}
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  scrollbar-width: thin;

  /* Hide scrollbar but keep scrollable on mobile */
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--border-soft, rgba(96,192,240,0.12)); border-radius: 3px; }
`;

const TabBtn = styled(motion.button)<{ $active: boolean }>`
  ${({ $active }) => ($active ? nutritionAccentButtonCss : nutritionControlCss)}
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
`;

const ContentArea = styled.div`
  ${nutritionCardCss}
  min-height: 400px;
  padding: clamp(1rem, 1.5vw, 1.35rem);
`;

const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
