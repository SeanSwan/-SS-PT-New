/*
 * ============================================================================
 * COMPONENT: ObservatoryLeftRail
 * PURPOSE: Phase 19B Observatory shell - desktop-only left rail. Brand block,
 *          5-tab nav, Create Post CTA, and momentum cards (level + creator
 *          streak count). Pure presentational, zero hooks.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Spec adherence (Phase 19 receipt Section 19B):
 *   - Tier label = real tier from props (no hardcoded "Crystal Voyager")
 *   - Creator streak = count only (no weekday completion dots)
 *   - Sidebar nav mirrors the 5-tab contract; lens labels never become tabs
 * ============================================================================
 */

import React from 'react';
import { Sparkles, Plus, Crown, Activity } from 'lucide-react';
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
  LeftRailCreateButton,
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
  observatoryTierName,
  observatoryProgressPct,
  observatoryXpToNext,
  observatoryStreakDays,
}) => {
  return (
    <LeftRailContainer aria-label="Dashboard sidebar">
      <LeftRailBrand>
        <LeftRailBrandMark>
          <Sparkles size={18} aria-hidden="true" />
        </LeftRailBrandMark>
        <LeftRailBrandText>
          <LeftRailBrandTitle>SwanStudios</LeftRailBrandTitle>
          <LeftRailBrandSubtitle>Crystalline Observatory</LeftRailBrandSubtitle>
        </LeftRailBrandText>
      </LeftRailBrand>
      <ObservatoryGlassPanel>
        <LeftRailNavList role="navigation" aria-label="Dashboard sections">
          {navItems.map(({ id, label, Icon }) => (
            <LeftRailNavItem
              key={id}
              type="button"
              $active={activeTab === id}
              onClick={() => onTabChange(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </LeftRailNavItem>
          ))}
        </LeftRailNavList>
        <LeftRailCreateButton
          type="button"
          onClick={() => onTabChange('feed')}
          aria-label="Create a new post"
        >
          <Plus size={16} aria-hidden="true" /> Create Post
        </LeftRailCreateButton>
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
        {observatoryXpToNext > 0 && (
          <LeftRailMomentumMeta>
            {observatoryXpToNext.toLocaleString()} XP to next level
          </LeftRailMomentumMeta>
        )}
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
