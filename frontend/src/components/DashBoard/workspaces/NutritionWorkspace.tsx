/**
 * NutritionWorkspace — Unified Nutrition Hub
 * ============================================
 * Combines the Food Intake Logger (FoodIntakeForm) with the
 * Food Intelligence Dashboard (research tools, USDA search, etc.)
 * in a tabbed interface. Available to all roles.
 */

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Utensils, Search, Apple, ScanBarcode } from 'lucide-react';
import CosmicSuspenseLoader from '../../Shared/CosmicSuspenseLoader';
import ErrorBoundary from '../../../utils/error-boundary';

const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'));
const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'));
const FoodSearchPanel = lazy(() => import('../../FoodTracker/FoodSearchPanel'));

type Tab = 'log' | 'intelligence' | 'search';

const NutritionWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('log');

  return (
    <WorkspaceRoot>
      <Header>
        <HeaderIcon><Apple size={28} /></HeaderIcon>
        <div>
          <HeaderTitle>Nutrition Intelligence</HeaderTitle>
          <HeaderSubtitle>Log meals, track macros, and explore food data</HeaderSubtitle>
        </div>
      </Header>

      <TabRow role="tablist" aria-label="Nutrition workspace tabs">
        <TabBtn
          $active={activeTab === 'log'}
          onClick={() => setActiveTab('log')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="tab"
          aria-selected={activeTab === 'log'}
          aria-controls="nutrition-tab-log"
        >
          <Utensils size={16} />
          Log Meal
        </TabBtn>
        <TabBtn
          $active={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="tab"
          aria-selected={activeTab === 'search'}
          aria-controls="nutrition-tab-search"
        >
          <ScanBarcode size={16} />
          Food Search
        </TabBtn>
        <TabBtn
          $active={activeTab === 'intelligence'}
          onClick={() => setActiveTab('intelligence')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          role="tab"
          aria-selected={activeTab === 'intelligence'}
          aria-controls="nutrition-tab-intelligence"
        >
          <Search size={16} />
          Intelligence Hub
        </TabBtn>
      </TabRow>

      <ContentArea role="tabpanel" id={`nutrition-tab-${activeTab}`}>
        <ErrorBoundary>
          <Suspense fallback={<CosmicSuspenseLoader />}>
            {activeTab === 'log' && <FoodIntakeForm />}
            {activeTab === 'search' && <FoodSearchPanel />}
            {activeTab === 'intelligence' && <FoodIntelligenceDashboard />}
          </Suspense>
        </ErrorBoundary>
      </ContentArea>
    </WorkspaceRoot>
  );
};

export default NutritionWorkspace;

// ---- Styled Components ----

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
  border: 1px solid rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
  flex-shrink: 0;
`;

const HeaderTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0;
`;

const TabRow = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 2px;
`;

const TabBtn = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? '#8B5CF6' : 'transparent')};
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.08)' : 'transparent')};
  color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.65)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  min-height: 44px;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.9)')};
    background: rgba(255, 255, 255, 0.03);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
  }
`;

const ContentArea = styled.div`
  min-height: 400px;
`;
