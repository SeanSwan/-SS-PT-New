/*
 * ============================================================================
 * COMPONENT: ObservatoryRightRail
 * PURPOSE: Phase 19B Observatory shell - desktop-only right rail. Tier card,
 *          Top Badges grid, and Next Best Action list. Pure presentational,
 *          zero hooks (no duplicate useGamificationData mount risk).
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Spec adherence (Phase 19 receipt Section 19B):
 *   - Tier card renders the real tier name string (no Crystal Voyager hardcode)
 *   - Top Badges renders pre-derived earned achievements only
 *   - Next Best Action renders the 4 existing HomeTab CTA labels
 *   - OMITTED here per spec: Stories, Reels Spotlight, Active Challenge,
 *     Live Activity, Trending hashtags, XP Gained toast
 *   - Per Codex P2: tier row uses styled components, no inline style props
 * ============================================================================
 */

import React from 'react';
import { Crown } from 'lucide-react';
import {
  ObservatoryRightRail as RightRailContainer,
  ObservatoryGlassPanel,
  ObservatoryPanelHeader,
  ObservatoryPanelTitle,
} from '../styles/ObservatoryShellLayoutStyles';
import {
  RightRailTierRow,
  RightRailTierIcon,
  RightRailTierName,
  RightRailBadgeGrid,
  RightRailBadgeCell,
  RightRailEmptyState,
  RightRailActionList,
  RightRailActionItem,
} from '../styles/ObservatoryRightRailStyles';
import type {
  ObservatoryBadge,
  ObservatoryNextBestAction,
} from './ObservatoryShellTypes';

interface ObservatoryRightRailProps {
  observatoryTierName: string;
  topBadges: ObservatoryBadge[];
  nextBestActions: ReadonlyArray<ObservatoryNextBestAction>;
}

const ObservatoryRightRail: React.FC<ObservatoryRightRailProps> = ({
  observatoryTierName,
  topBadges,
  nextBestActions,
}) => {
  return (
    <RightRailContainer aria-label="Profile observatory">
      <ObservatoryGlassPanel>
        <ObservatoryPanelHeader>
          <ObservatoryPanelTitle>Tier</ObservatoryPanelTitle>
        </ObservatoryPanelHeader>
        <RightRailTierRow>
          <RightRailTierIcon>
            <Crown size={20} aria-hidden="true" />
          </RightRailTierIcon>
          <RightRailTierName>{observatoryTierName}</RightRailTierName>
        </RightRailTierRow>
      </ObservatoryGlassPanel>

      <ObservatoryGlassPanel>
        <ObservatoryPanelHeader>
          <ObservatoryPanelTitle>Top Badges</ObservatoryPanelTitle>
        </ObservatoryPanelHeader>
        {topBadges.length > 0 ? (
          <RightRailBadgeGrid>
            {topBadges.map(badge => (
              <RightRailBadgeCell
                key={badge.id}
                title={badge.name}
                aria-label={badge.name}
              >
                {badge.icon}
              </RightRailBadgeCell>
            ))}
          </RightRailBadgeGrid>
        ) : (
          <RightRailEmptyState>
            Earn achievements to fill your showcase.
          </RightRailEmptyState>
        )}
      </ObservatoryGlassPanel>

      <ObservatoryGlassPanel>
        <ObservatoryPanelHeader>
          <ObservatoryPanelTitle>Next Best Action</ObservatoryPanelTitle>
        </ObservatoryPanelHeader>
        <RightRailActionList>
          {nextBestActions.map(({ label, Icon, run }) => (
            <RightRailActionItem
              key={label}
              type="button"
              onClick={run}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </RightRailActionItem>
          ))}
        </RightRailActionList>
      </ObservatoryGlassPanel>
    </RightRailContainer>
  );
};

export default ObservatoryRightRail;
