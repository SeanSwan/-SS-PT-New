/*
 * ============================================================================
 * COMPONENT: ObservatoryLeftRail
 * PURPOSE: Phase 19B Observatory shell - desktop-only left rail. Brand block,
 *          section nav and momentum cards (level + creator streak count).
 *          Pure presentational, zero hooks.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Spec adherence (Phase 19 receipt Section 19B):
 *   - Tier label = real Swan rank from props (no hardcoded legacy rank labels)
 *   - Creator streak = count only (no weekday completion dots)
 *   - Sidebar nav is desktop-only; mobile uses UserDashboardTabBarV3
 * ============================================================================
 */

import React from 'react';
import { Crown, Activity } from 'lucide-react';
import brandLogo from '../../../assets/Logo.png';
import {
  ObservatoryLeftRail as LeftRailContainer,
  ObservatoryGlassPanel,
} from '../styles/ObservatoryShellLayoutStyles';
import {
  LeftRailBrand,
  LeftRailBrandMark,
  LeftRailBrandText,
  LeftRailBrandTitle,
  LeftRailBrandSubtitle,
  LeftRailNavList,
  LeftRailNavItem,
  LeftRailMomentumCard,
  LeftRailMomentumHeader,
  LeftRailMomentumLabel,
  LeftRailMomentumValue,
  LeftRailMomentumUnit,
  LeftRailMomentumProgress,
  LeftRailMomentumProgressFill,
  LeftRailMomentumMeta,
} from '../styles/ObservatoryLeftRailStyles';
import type { ObservatoryNavItem } from './ObservatoryShellTypes';
import type { TabId } from '../types/UserDashboardTypes';

interface ObservatoryLeftRailProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  navItems: ReadonlyArray<ObservatoryNavItem>;
  observatoryLevel: number;
  observatoryPoints: number;
  observatoryTierName: string;
  observatoryProgressPct: number;
  observatoryXpToNext: number;
  observatoryStreakDays: number;
}

const ObservatoryLeftRail: React.FC<ObservatoryLeftRailProps> = ({
  activeTab,
  onTabChange,
  navItems,
  observatoryLevel,
  observatoryPoints,
  observatoryTierName,
  observatoryProgressPct,
  observatoryXpToNext,
  observatoryStreakDays,
}) => {
  return (
    <LeftRailContainer aria-label="Dashboard sidebar">
      <LeftRailBrand>
        <LeftRailBrandMark>
          <img src={brandLogo} alt="" aria-hidden="true" />
        </LeftRailBrandMark>
        <LeftRailBrandText>
          <LeftRailBrandTitle>SwanStudios</LeftRailBrandTitle>
          <LeftRailBrandSubtitle>Crystalline Observatory</LeftRailBrandSubtitle>
        </LeftRailBrandText>
      </LeftRailBrand>
      <ObservatoryGlassPanel>
        <LeftRailNavList role="navigation" aria-label="Dashboard sections">
          {navItems.map(({ id, label, Icon, matches }) => {
            const isActive = matches ? matches.includes(activeTab) : activeTab === id;
            return (
              <LeftRailNavItem
                key={id}
                type="button"
                $active={isActive}
                onClick={() => onTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </LeftRailNavItem>
            );
          })}
        </LeftRailNavList>
      </ObservatoryGlassPanel>
      <LeftRailMomentumCard>
        <LeftRailMomentumHeader>
          <Crown size={14} aria-hidden="true" />
          <LeftRailMomentumLabel>Level</LeftRailMomentumLabel>
        </LeftRailMomentumHeader>
        <LeftRailMomentumValue>
          {observatoryLevel}
          <LeftRailMomentumUnit>{observatoryTierName}</LeftRailMomentumUnit>
        </LeftRailMomentumValue>
        <LeftRailMomentumProgress aria-hidden="true">
          <LeftRailMomentumProgressFill $pct={observatoryProgressPct} />
        </LeftRailMomentumProgress>
        <LeftRailMomentumMeta>
          {observatoryPoints.toLocaleString()} pts now
          {observatoryXpToNext > 0
            ? ` - ${observatoryXpToNext.toLocaleString()} XP to next level`
            : ' - next level ready'}
        </LeftRailMomentumMeta>
      </LeftRailMomentumCard>
      <LeftRailMomentumCard>
        <LeftRailMomentumHeader>
          <Activity size={14} aria-hidden="true" />
          <LeftRailMomentumLabel>Creator Streak</LeftRailMomentumLabel>
        </LeftRailMomentumHeader>
        <LeftRailMomentumValue>
          {observatoryStreakDays}
          <LeftRailMomentumUnit>
            {observatoryStreakDays === 1 ? 'day' : 'days'}
          </LeftRailMomentumUnit>
        </LeftRailMomentumValue>
        <LeftRailMomentumMeta>Keep showing up.</LeftRailMomentumMeta>
      </LeftRailMomentumCard>
    </LeftRailContainer>
  );
};

export default ObservatoryLeftRail;
