/*
 * ============================================================================
 * COMPONENT: ObservatoryShell
 * PURPOSE: Phase 19B Crystalline Creator Observatory shell - thin orchestrator
 *          that composes the left rail and right rail around the dashboard's
 *          existing main-column tab content.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * This file holds zero hooks and zero rendering details - those live in
 * ObservatoryLeftRail and ObservatoryRightRail so each presentational module
 * stays under the Rule 4 300-line cap.
 *
 * Spec adherence (Phase 19 receipt Section 19B):
 *   - No second mount of useGamificationData / useSocialFeed / useActivityTicker
 *     / useFaction / useParty
 *   - Spec-forbidden surfaces (Stories, Reels Spotlight, Active Challenge,
 *     Live Activity, Trending hashtags, persistent XP toast, mobile Inbox)
 *     are not introduced anywhere in the shell tree
 *   - children render inside ObservatoryMain so the existing ProfileHeader,
 *     TabNavigation, and tab panels keep their behavior unchanged
 * ============================================================================
 */

import React from 'react';

import {
  ObservatoryGrid,
  ObservatoryMain,
} from '../styles/ObservatoryShellLayoutStyles';
import ObservatoryLeftRail from './ObservatoryLeftRail';
import ObservatoryRightRail from './ObservatoryRightRail';
import type {
  ObservatoryNavItem,
  ObservatoryBadge,
} from './ObservatoryShellTypes';
import type { TabId } from '../types/UserDashboardTypes';

export type {
  ObservatoryNavItem,
  ObservatoryBadge,
} from './ObservatoryShellTypes';

interface ObservatoryShellProps {
  activeTab: TabId;
  focusMode?: boolean;
  onTabChange: (tab: TabId) => void;
  observatoryLevel: number;
  observatoryPoints: number;
  observatoryTierName: string;
  observatoryProgressPct: number;
  observatoryXpToNext: number;
  observatoryStreakDays: number;
  /** Whether the gamification record is known; false suppresses the momentum numbers. */
  gamificationKnown?: boolean;
  topBadges: ObservatoryBadge[];
  navItems: ReadonlyArray<ObservatoryNavItem>;
  children: React.ReactNode;
}

const ObservatoryShell: React.FC<ObservatoryShellProps> = ({
  activeTab,
  focusMode = false,
  onTabChange,
  observatoryLevel,
  observatoryPoints,
  observatoryTierName,
  observatoryProgressPct,
  observatoryXpToNext,
  observatoryStreakDays,
  gamificationKnown,
  topBadges,
  navItems,
  children,
}) => {
  return (
    <>
      <ObservatoryGrid $focusMode={focusMode} data-user-dashboard-scroll-root>
        <ObservatoryLeftRail
          activeTab={activeTab}
          onTabChange={onTabChange}
          navItems={navItems}
          observatoryLevel={observatoryLevel}
          observatoryPoints={observatoryPoints}
          observatoryTierName={observatoryTierName}
          observatoryProgressPct={observatoryProgressPct}
          observatoryXpToNext={observatoryXpToNext}
          observatoryStreakDays={observatoryStreakDays}
          gamificationKnown={gamificationKnown}
        />

        <ObservatoryMain data-user-dashboard-scroll-root>{children}</ObservatoryMain>

        {!focusMode && (
          <ObservatoryRightRail
            observatoryTierName={observatoryTierName}
            topBadges={topBadges}
          />
        )}
      </ObservatoryGrid>
    </>
  );
};

export default ObservatoryShell;
