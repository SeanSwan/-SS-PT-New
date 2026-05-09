/**
 * COMPONENT: CommunityTab
 * PURPOSE: Active UserDashboard V3 community discovery surface.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Discover label]
 * [Community Feed] [Challenges] [Find Friends] [Factions & XP]
 * [Local Events banner]
 *
 * DATA FLOW:
 * Props In: { onTabChange }
 * State: none.
 * API Calls: none.
 * Events: feed card changes dashboard tab, route cards navigate, non-live cards are gated.
 * Children: none.
 *
 * ARCHITECTURE:
 * CommunityTab -> COMMUNITY_CARDS -> discovery buttons
 * CommunityTab -> Local Events banner
 */

import React from 'react';
import { CalendarClock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COMMUNITY_CARDS, type CommunityCardDef } from './CommunityTab.data';
import {
  CardArrow,
  CardIconWrap,
  CardLabel,
  CommunityContainer,
  DiscoveryCard,
  DiscoveryGrid,
  EventsBadge,
  EventsBanner,
  EventsIcon,
  EventsSub,
  EventsText,
  EventsTitle,
  SectionLabel,
  SoonPill,
} from './CommunityTab.styles';

interface CommunityTabProps {
  onTabChange: (tab: string) => void;
}

const CommunityTab: React.FC<CommunityTabProps> = ({ onTabChange }) => {
  const navigate = useNavigate();

  const handleCard = (card: CommunityCardDef) => {
    if (card.soon || card.action === undefined) return;
    if (card.action === 'tab-feed') onTabChange('feed');
    if (card.action === 'nav' && card.path) navigate(card.path);
  };

  return (
    <CommunityContainer>
      <div>
        <SectionLabel>Discover</SectionLabel>
      </div>

      <DiscoveryGrid>
        {COMMUNITY_CARDS.map((card, index) => {
          const { label, Icon, colorRgb, soon } = card;

          return (
            <DiscoveryCard
              key={label}
              $dim={soon}
              type="button"
              onClick={() => handleCard(card)}
              aria-disabled={soon ? 'true' : undefined}
              aria-label={soon ? `${label} coming soon` : label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: soon ? 0.55 : 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
              whileHover={soon ? {} : { y: -3 }}
              whileTap={soon ? {} : { scale: 0.97 }}
            >
              <CardIconWrap $colorRgb={colorRgb}>
                <Icon size={18} />
              </CardIconWrap>
              <CardLabel>{label}</CardLabel>
              {soon ? (
                <SoonPill>
                  <Lock size={9} />
                  Soon
                </SoonPill>
              ) : (
                <CardArrow size={14} />
              )}
            </DiscoveryCard>
          );
        })}
      </DiscoveryGrid>

      <EventsBanner initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
        <EventsIcon aria-hidden="true">
          <CalendarClock size={20} />
        </EventsIcon>
        <EventsText>
          <EventsTitle>Local Events</EventsTitle>
          <EventsSub>Community meetups, group training, and live challenges coming soon.</EventsSub>
        </EventsText>
        <EventsBadge>Phase 2</EventsBadge>
      </EventsBanner>
    </CommunityContainer>
  );
};

export default CommunityTab;
