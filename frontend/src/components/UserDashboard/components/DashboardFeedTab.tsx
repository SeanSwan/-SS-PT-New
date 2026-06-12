/**
 * ============================================================================
 * FILE: DashboardFeedTab.tsx
 * PURPOSE: Full social feed tab for the V3 user dashboard (workstream N —
 *          "Observatory absorbs Social"). Renders the coach companion dock,
 *          the canonical full feed (cover studio + composer + posts), and the
 *          desktop right rail (Live Activity / Active Challenge / Leaderboard
 *          / Next Best Action) that previously lived only on /social.
 * HOW IT FITS: Mounted by UserDashboardTabsV3 on the 'feed' tab. The feed's
 *          own FeedCoverStudio is the cover for this tab — UserDashboard.V3
 *          suppresses the classic banner header here to avoid a double cover.
 * ============================================================================
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import SocialCoachDock from '../../Social/CoachDock/SocialCoachDock';
import SocialFeed from '../../Social/Feed/SocialFeed';
import SocialRightRail from '../../../pages/Social/components/SocialRightRail';

// SSR-safe media query (same pattern as SocialPage.V3 — no render before mount).
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const FeedGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 1200px) {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
`;

const FeedColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const RailColumn = styled.aside`
  min-width: 0;
  position: sticky;
  top: 88px;
`;

const DashboardFeedTab: React.FC = () => {
  const isWideDesktop = useMediaQuery('(min-width: 1200px)');

  return (
    <FeedGrid>
      <FeedColumn>
        <SocialCoachDock />
        <SocialFeed />
      </FeedColumn>
      {isWideDesktop && (
        <RailColumn aria-label="Feed companions">
          <SocialRightRail />
        </RailColumn>
      )}
    </FeedGrid>
  );
};

export default DashboardFeedTab;
