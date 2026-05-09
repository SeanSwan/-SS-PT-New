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

import React, { Suspense, lazy } from 'react';
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

/* Phase 20 Surface A: mount existing self-fetching TrendingHashtags
   component inside the dashboard right rail. No new fetch on the
   compact SocialFeed path (which doesn't render this component);
   one incremental fetch on dashboard load. Lazy to keep the
   right-rail bundle lean. */
const TrendingHashtags = lazy(() => import('../../Social/Feed/TrendingHashtags'));

/* Phase 20.1 (B1 fix): error boundary around the lazy chunk so a
   ChunkLoadError (stale Render bundle, ad-blocker, network blip)
   does not leave users staring at an empty "Trending" header.
   Renders an honest fallback message and logs the failure. */
class TrendingHashtagsBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[TrendingHashtagsBoundary] failed to load:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <RightRailEmptyState>
          Trending unavailable right now.
        </RightRailEmptyState>
      );
    }
    return this.props.children;
  }
}
import type {
  ObservatoryBadge,
  ObservatoryNextBestAction,
} from './ObservatoryShellTypes';

interface ObservatoryRightRailProps {
  profileHeaderVisible?: boolean;
  observatoryTierName: string;
  topBadges: ObservatoryBadge[];
  nextBestActions: ReadonlyArray<ObservatoryNextBestAction>;
}

const ObservatoryRightRail: React.FC<ObservatoryRightRailProps> = ({
  profileHeaderVisible = false,
  observatoryTierName,
  topBadges,
  nextBestActions,
}) => {
  return (
    <RightRailContainer aria-label="Profile observatory" $profileHeaderVisible={profileHeaderVisible}>
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

      {/* Phase 20 Surface A: Trending hashtags. Placed between Top Badges
          and Next Best Action per spec Q3 answer (a). Lazy so the bundle
          loads only when the right rail renders (>=1280px viewport).
          Phase 20.1 B1: error boundary catches ChunkLoadError so a stale
          Render bundle / ad-blocker / network blip does not silently
          ship an empty panel header. */}
      <ObservatoryGlassPanel>
        <ObservatoryPanelHeader>
          <ObservatoryPanelTitle>Trending</ObservatoryPanelTitle>
        </ObservatoryPanelHeader>
        <TrendingHashtagsBoundary>
          <Suspense fallback={
            <RightRailEmptyState>Loading trending...</RightRailEmptyState>
          }>
            {/* Phase 20.2: showEmptyState makes the dashboard rail render
                an honest "No trending hashtags yet." message instead of
                returning null when the backend returns 0 hashtags, so the
                outer panel header is never visually orphaned. */}
            <TrendingHashtags showEmptyState />
          </Suspense>
        </TrendingHashtagsBoundary>
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
