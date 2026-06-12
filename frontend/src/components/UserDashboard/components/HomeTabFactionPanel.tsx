/**
 * ============================================================================
 * FILE: HomeTabFactionPanel.tsx
 * PURPOSE: Faction War panel for the /user-dashboard Home right rail
 *          (workstream O — Feed-tab consolidation). The 3-bar faction race
 *          previously lived ONLY on the retired Feed tab; Home now carries it
 *          so the gamification signal survives the Feed unmount.
 * HOW IT FITS: Mounted by HomeTabVisionRightRail with factions fetched by
 *          HomeTab via useFaction (GET /api/social/factions). Renders nothing
 *          when no factions exist — same honest gate the feed surface used
 *          (SocialFeedFactionGate), no dead panel chrome.
 * KEY DECISIONS:
 * - Reuses FactionLeaderboard (frameless) so the bar math/format stays in one
 *   place shared with ClientCommunityPage.
 * - Wing Purple tone — RPG/epic accent per the rarity palette.
 * ============================================================================
 */
import React from 'react';
import { Swords } from 'lucide-react';
import FactionLeaderboard from '../../Social/RPG/FactionLeaderboard';
import type { Faction } from '../../../hooks/social/useFaction';
import { Eyebrow, Panel } from './HomeTabVision.styles';
import { Chip } from './HomeTabVisionCards.styles';
import { RailHeader } from './HomeTabVisionRightRail.styles';

interface HomeTabFactionPanelProps {
  factions: Faction[];
}

const HomeTabFactionPanel: React.FC<HomeTabFactionPanelProps> = ({ factions }) => {
  if (!factions.length) return null;

  return (
    <Panel $tone="violet">
      <RailHeader>
        <Eyebrow $tone="violet">Faction War</Eyebrow>
        <Chip $tone="violet">
          <Swords size={13} aria-hidden="true" />
        </Chip>
      </RailHeader>
      <FactionLeaderboard factions={factions} frameless />
    </Panel>
  );
};

export default HomeTabFactionPanel;
