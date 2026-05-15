/*
 * ============================================================================
 * COMPONENT: ObservatoryShell
 * PURPOSE: Phase 19B Crystalline Creator Observatory shell - thin orchestrator
 *          that composes the left rail, right rail, and mobile bottom nav
 *          around the dashboard's existing main-column tab content.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * This file holds zero hooks and zero rendering details - those live in
 * ObservatoryLeftRail, ObservatoryRightRail, and ObservatoryMobileNav so each
 * presentational module stays under the Rule 4 300-line cap.
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
import ObservatoryMobileNav from './ObservatoryMobileNav';
import type {
  ObservatoryNavItem,
  ObservatoryNextBestAction,
  ObservatoryBadge,
} from './ObservatoryShellTypes';
import type { TabId } from '../types/UserDashboardTypes';

export type {
  ObservatoryNavItem,
  ObservatoryNextBestAction,
  ObservatoryBadge,
} from './ObservatoryShellTypes';

interface ObservatoryShellProps {
  activeTab: TabId;
  profileHeaderVisible?: boolean;
  onTabChange: (tab: TabId) => void;
  onNavigate: (path: string) => void;
  observatoryLevel: number;
  observatoryPoints: number;
  observatoryTierName: string;
  observatoryProgressPct: number;
  observatoryXpToNext: number;
  observatoryStreakDays: number;
  topBadges: ObservatoryBadge[];
  navItems: ReadonlyArray<ObservatoryNavItem>;
  nextBestActions: ReadonlyArray<ObservatoryNextBestAction>;
  children: React.ReactNode;
}

const ObservatoryShell: React.FC<ObservatoryShellProps> = ({
  activeTab,
  profileHeaderVisible = false,
  onTabChange,
  onNavigate,
  observatoryLevel,
  observatoryPoints,
  observatoryTierName,
  observatoryProgressPct,
  observatoryXpToNext,
  observatoryStreakDays,
  topBadges,
  navItems,
  nextBestActions,
  children,
}) => {
  return (
    <>
      <ObservatoryGrid>
        <ObservatoryLeftRail
          activeTab={activeTab}
          profileHeaderVisible={profileHeaderVisible}
          onTabChange={onTabChange}
          navItems={navItems}
          observatoryLevel={observatoryLevel}
          observatoryPoints={observatoryPoints}
          observatoryTierName={observatoryTierName}
          observatoryProgressPct={observatoryProgressPct}
          observatoryXpToNext={observatoryXpToNext}
          observatoryStreakDays={observatoryStreakDays}
        />

        <ObservatoryMain>{children}</ObservatoryMain>

        <ObservatoryRightRail
          profileHeaderVisible={profileHeaderVisible}
          observatoryTierName={observatoryTierName}
          topBadges={topBadges}
          nextBestActions={nextBestActions}
        />
      </ObservatoryGrid>

      <ObservatoryMobileNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onNavigate={onNavigate}
      />
    </>
  );
};

export default ObservatoryShell;
