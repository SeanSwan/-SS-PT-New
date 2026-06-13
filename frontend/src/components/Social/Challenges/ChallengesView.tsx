/**
 * ChallengesView.tsx
 * Crystalline Swan themed challenges UI with tabs for active/upcoming/completed.
 * Fetches real data from /api/v1/gamification/challenges and shows an
 * honest empty state when no live challenges are available.
 */
import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import {
  useChallenges,
  type Challenge,
  type ChallengeCategory,
  type ChallengeStatus,
} from '../../../hooks/useChallenges';
import {
  ALL_CATEGORIES,
  ALL_CHALLENGE_COLOR,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  TABS,
} from './ChallengesView.constants';
import { ChallengeCards } from './ChallengesView.cards';
import {
  filterChallenges,
  nextChallengeTab,
  panelTransitionFor,
} from './ChallengesView.logic';
import {
  CategoryFilterRow,
  CategoryPill,
  ChallengeList,
  Container,
  DemoBanner,
  LoadingContainer,
  Spinner,
  TabBar,
  TabButton,
} from './ChallengesView.styles';

const RETIRED_CHALLENGE_FIXTURE: Challenge[] = [];

const ChallengesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | 'all'>('all');
  const prefersReducedMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { challenges, loading, isDemoData, joinChallenge } = useChallenges();

  // Hook API failures now return an empty list; the retired fixture remains disabled.
  const displayData = isDemoData ? RETIRED_CHALLENGE_FIXTURE : challenges;
  const filtered = filterChallenges(displayData, activeTab, selectedCategory);

  const handleTabKeyDown = useCallback((event: React.KeyboardEvent) => {
    const nextTab = nextChallengeTab(activeTab, event.key);
    if (!nextTab) return;

    const nextIdx = TABS.findIndex((tab) => tab.key === nextTab);
    setActiveTab(TABS[nextIdx].key);
    tabRefs.current[nextIdx]?.focus();
    event.preventDefault();
  }, [activeTab]);

  const noMotion = prefersReducedMotion;

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size={32} />
        <span>Loading challenges...</span>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      {isDemoData && (
        <DemoBanner role="status" aria-live="polite">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Showing sample challenges - live data will appear once challenges are created.</span>
        </DemoBanner>
      )}

      <TabBar role="tablist" aria-label="Challenge status" onKeyDown={handleTabKeyDown}>
        {TABS.map(({ key, label, icon: Icon }, idx) => (
          <TabButton
            key={key}
            ref={(el) => { tabRefs.current[idx] = el; }}
            role="tab"
            id={`challenge-tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`challenge-panel-${key}`}
            tabIndex={activeTab === key ? 0 : -1}
            $active={activeTab === key}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </TabButton>
        ))}
      </TabBar>

      <CategoryFilterRow>
        {ALL_CATEGORIES.map(({ key, label }) => {
          const color = key === 'all' ? ALL_CHALLENGE_COLOR : CATEGORY_COLORS[key];
          const Icon = key === 'all' ? null : CATEGORY_ICONS[key];
          return (
            <CategoryPill
              key={key}
              $active={selectedCategory === key}
              $color={color}
              onClick={() => setSelectedCategory(key)}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {label}
            </CategoryPill>
          );
        })}
      </CategoryFilterRow>

      <div
        role="tabpanel"
        id={`challenge-panel-${activeTab}`}
        aria-labelledby={`challenge-tab-${activeTab}`}
        tabIndex={0}
      >
        <AnimatePresence mode="wait">
          <ChallengeList key={activeTab} {...panelTransitionFor(noMotion)}>
            <ChallengeCards
              activeTab={activeTab}
              challenges={filtered}
              isDemoData={isDemoData}
              noMotion={noMotion}
              onJoin={joinChallenge}
            />
          </ChallengeList>
        </AnimatePresence>
      </div>
    </Container>
  );
};

export { CATEGORY_COLORS } from './ChallengesView.constants';
export default ChallengesView;
