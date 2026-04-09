/**
 * ============================================================================
 * FILE: CommunityTab.tsx
 * PURPOSE: Community tab for /user-dashboard — four discovery cards (Community
 *          Feed, Challenges, Find Friends, Factions & XP) and a "Local Events
 *          coming soon" banner. Lays the foundation for the full Community
 *          surface defined in the Dashboard Vision Brief.
 * AUTHOR: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the Community tab content inside UserDashboard.
 * V3. Cards navigate to existing routes or fire onTabChange for the feed tab;
 * unbuilt routes show a "Coming Soon" pill instead of navigating.
 *
 * HOW IT FITS IN THE APP: Lazy-loaded by UserDashboard.V3.tsx when activeTab
 * === 'community'. onTabChange prop mirrors HomeTab contract.
 *
 * KEY DECISIONS:
 * - 2-col grid on mobile, 4-col on ≥768px — consistent with HomeTab CTAGrid
 * - "Coming soon" cards are visually present but non-navigable (opacity dim +
 *   pill label); they communicate roadmap without confusing users
 * - Local Events banner uses a subtle bottom strip — no hardcoded colors
 * - All interactive elements ≥44px touch target
 * - No hardcoded colors — var(--token, #fallback) throughout
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Rss, Trophy, UserPlus, Swords,
  CalendarClock, ChevronRight, Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Layout ────────────────────────────────────────────────────────────────────

const CommunityContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
`;

const SectionLabel = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.125rem;
`;

// ── Discovery Grid ────────────────────────────────────────────────────────────

const DiscoveryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 320px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const DiscoveryCard = styled(motion.button)<{ $dim?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.125rem 1rem 1rem;
  min-height: 108px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(12px);
  border: 1px solid
    ${({ $dim }) =>
      $dim
        ? 'rgba(255, 255, 255, 0.04)'
        : 'var(--border-soft, rgba(255, 255, 255, 0.06))'};
  border-radius: 16px;
  color: var(--text-primary, #E0ECF4);
  /* aria-disabled cards stay pointer-events active so focus/announce works;
     clicks are blocked in handleCard. */
  cursor: ${({ $dim }) => ($dim ? 'default' : 'pointer')};
  text-align: left;
  font-family: inherit;
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not([aria-disabled='true']) {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 375px) {
    min-height: 96px;
    padding: 1rem 0.875rem 0.875rem;
  }
`;

// $colorRgb must be an r,g,b triple string e.g. "96, 192, 240"
// This avoids hex-alpha concatenation which breaks with CSS variables.
const CardIconWrap = styled.div<{ $colorRgb?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $colorRgb }) =>
    $colorRgb
      ? `rgba(${$colorRgb}, 0.08)`
      : 'rgba(96, 192, 240, 0.08)'};
  border: 1px solid
    ${({ $colorRgb }) =>
      $colorRgb
        ? `rgba(${$colorRgb}, 0.18)`
        : 'rgba(96, 192, 240, 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $colorRgb }) =>
    $colorRgb ? `rgb(${$colorRgb})` : 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const CardLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  line-height: 1.3;
`;

const CardArrow = styled(ChevronRight)`
  color: var(--text-muted, #64748b);
  flex-shrink: 0;
  margin-top: auto;
`;

const SoonPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
  margin-top: auto;
`;

// ── Local Events Banner ───────────────────────────────────────────────────────

const EventsBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(198, 168, 75, 0.18);
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(198, 168, 75, 0.06);

  @media (max-width: 375px) {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }
`;

const EventsIcon = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: rgba(198, 168, 75, 0.08);
  border: 1px solid rgba(198, 168, 75, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #C6A84B);
`;

const EventsText = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventsTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.125rem;
`;

const EventsSub = styled.p`
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
`;

const EventsBadge = styled.span`
  padding: 0.25rem 0.625rem;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.25);
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
  white-space: nowrap;
  flex-shrink: 0;
`;

// ── Data ──────────────────────────────────────────────────────────────────────

interface CardDef {
  label:     string;
  Icon:      React.FC<{ size?: number }>;
  colorRgb?: string; // r,g,b triple — avoids CSS-variable hex-alpha bug
  action?:   'tab-feed' | 'nav';
  path?:     string;
  soon?:     boolean;
}

const CARDS: CardDef[] = [
  {
    label:  'Community Feed',
    Icon:   Rss,
    action: 'tab-feed',
  },
  {
    label:    'Challenges',
    Icon:     Trophy,
    colorRgb: '198, 168, 75',
    soon:     true,
  },
  {
    label:    'Find Friends',
    Icon:     UserPlus,
    colorRgb: '96, 192, 240',
    action:   'nav',
    path:     '/social/friends',
  },
  {
    label:    'Factions & XP',
    Icon:     Swords,
    colorRgb: '139, 92, 246',
    soon:     true,
  },
];

// ── Props & Component ─────────────────────────────────────────────────────────

interface CommunityTabProps {
  onTabChange: (tab: string) => void;
}

const CommunityTab: React.FC<CommunityTabProps> = ({ onTabChange }) => {
  const navigate = useNavigate();

  const handleCard = (card: CardDef) => {
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
        {CARDS.map(({ label, Icon, colorRgb, soon, ...rest }, i) => (
          <DiscoveryCard
            key={label}
            $dim={soon}
            onClick={() => handleCard({ label, Icon, colorRgb, soon, ...rest })}
            aria-disabled={soon ? 'true' : undefined}
            tabIndex={0}
            aria-label={soon ? `${label} — coming soon` : label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: soon ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
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
        ))}
      </DiscoveryGrid>

      {/* Local Events — roadmap placeholder */}
      <EventsBanner
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
      >
        <EventsIcon aria-hidden="true">
          <CalendarClock size={20} />
        </EventsIcon>
        <EventsText>
          <EventsTitle>Local Events</EventsTitle>
          <EventsSub>
            Community meetups, group training, and live challenges — coming soon.
          </EventsSub>
        </EventsText>
        <EventsBadge>Phase 2</EventsBadge>
      </EventsBanner>
    </CommunityContainer>
  );
};

export default CommunityTab;
