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
 * KEY DECISIONS: 6 tabs (Log, Search, Hydration, Macros, Intelligence, Learn)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: NutritionWorkspace                               ║
 * ║  PURPOSE: Unified nutrition hub with 6 tabs                   ║
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

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Utensils, Search, Apple, ScanBarcode, Droplets, BookOpen, PieChart, Building2, Sprout, MapPin } from 'lucide-react';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';
import { useMacroSummary } from '../../../hooks/useMacroSummary';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy imports
// ─────────────────────────────────────────────────────────────
const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'));
const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'));
const FoodSearchPanel = lazy(() => import('../../FoodTracker/FoodSearchPanel'));
const NutritionHydrationTab = lazy(() => import('./NutritionHydrationTab'));
const NutritionLearnTab = lazy(() => import('./NutritionLearnTab'));
const RestaurantTab = lazy(() => import('../../FoodTracker/RestaurantTab'));
const GardeningTab = lazy(() => import('../../FoodTracker/GardeningTab'));
const FarmFinderTab = lazy(() => import('../../FoodTracker/FarmFinderTab'));
const MacroDonut = lazy(() => import('../../Charts/charts/pie/MacroDonut'));
const NutritionBalanceRadar = lazy(() => import('../../Charts/charts/radar/NutritionBalanceRadar'));

// ─────────────────────────────────────────────────────────────
// SECTION: Tab config
// ─────────────────────────────────────────────────────────────
type Tab = 'log' | 'search' | 'restaurant' | 'hydration' | 'macros' | 'intelligence' | 'learn' | 'garden' | 'farms';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'log', label: 'Log Meal', icon: <Utensils size={16} /> },
  { id: 'search', label: 'Food Search', icon: <ScanBarcode size={16} /> },
  { id: 'restaurant', label: 'Restaurant', icon: <Building2 size={16} /> },
  { id: 'hydration', label: 'Hydration', icon: <Droplets size={16} /> },
  { id: 'macros', label: 'My Macros', icon: <PieChart size={16} /> },
  { id: 'garden', label: 'Garden', icon: <Sprout size={16} /> },
  { id: 'farms', label: 'Farm Finder', icon: <MapPin size={16} /> },
  { id: 'intelligence', label: 'Intelligence', icon: <Search size={16} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={16} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const NutritionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const { summary, loading: macroLoading } = useMacroSummary();

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
            {activeTab === 'log' && <FoodIntakeForm />}
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
            {activeTab === 'intelligence' && <FoodIntelligenceDashboard />}
            {activeTab === 'learn' && <NutritionLearnTab />}
          </Suspense>
        </ErrorBoundary>
      </ContentArea>
    </WorkspaceRoot>
  );
};

export default NutritionWorkspace;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const WorkspaceRoot = styled.div`
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
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: thin;

  /* Hide scrollbar but keep scrollable on mobile */
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--border-soft, rgba(96,192,240,0.12)); border-radius: 3px; }
`;

const TabBtn = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent')};
  background: ${(p) => (p.$active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, rgba(224,236,244,0.5))')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  min-height: 44px;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: ${(p) => (p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)')};
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -2px;
  }
`;

const ContentArea = styled.div`
  min-height: 400px;
`;

const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
