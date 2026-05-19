/**
 * ┌─── SUB-COMPONENT: FactionSelector ─────────────────────────┐
 * │ PARENT: SocialFeed / UserProfilePage                        │
 * │ PURPOSE: 3-card faction picker with join/leave flow         │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
 * │ │ Vanguard │ │ Syndicate│ │ Sentinels│                     │
 * │ │ ⚔ 1.2K  │ │ ⚡ 890   │ │ ★ 1.5K  │                     │
 * │ │ [Join]   │ │ [Join]   │ │ [Joined] │                     │
 * │ └──────────┘ └──────────┘ └──────────┘                     │
 * │ Props: { onJoined? }                                        │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Join] → POST /api/social/factions/:slug/join → refresh     │
 * │ [Leave] → POST /api/social/factions/leave → refresh         │
 * │ GAMIFICATION: Faction join awards 25 XP (tribe_social tree) │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { Shield, Zap, Star } from 'lucide-react';
import { useFaction, type Faction } from '../../../hooks/social/useFaction';

// ─────────────────────────────────────────────────────────────
// SECTION: Icon Map
// ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  shield: Shield,
  zap: Zap,
  star: Star,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface FactionSelectorProps {
  onJoined?: () => void;
}

const FactionSelector: React.FC<FactionSelectorProps> = memo(({ onJoined }) => {
  const { factions, membership, isLoading, joinFaction, leaveFaction } = useFaction();
  const [joining, setJoining] = useState<string | null>(null);

  if (isLoading) return null;

  const handleJoin = async (slug: string) => {
    setJoining(slug);
    const ok = await joinFaction(slug);
    setJoining(null);
    if (ok && onJoined) onJoined();
  };

  const handleLeave = async () => {
    setJoining('leaving');
    await leaveFaction();
    setJoining(null);
  };

  return (
    <FactionGrid>
      {factions.map((faction) => {
        const Icon = ICON_MAP[faction.icon] || Shield;
        const isMine = membership?.factionId === faction.id;

        return (
          <FactionCard key={faction.id} $color={faction.color} $active={isMine}>
            <FactionIcon $color={faction.color}>
              <Icon size={24} />
            </FactionIcon>
            <FactionName>{faction.name}</FactionName>
            <FactionMotto>{faction.motto}</FactionMotto>
            <FactionStats>
              <StatPill>{faction.memberCount} members</StatPill>
              <StatPill>{Number(faction.totalPoints).toLocaleString()} pts</StatPill>
            </FactionStats>
            {isMine ? (
              <JoinedBtn onClick={handleLeave} disabled={joining === 'leaving'}>
                {joining === 'leaving' ? 'Leaving...' : 'Pledged'}
              </JoinedBtn>
            ) : !membership ? (
              <JoinBtn
                $color={faction.color}
                onClick={() => handleJoin(faction.slug)}
                disabled={!!joining}
              >
                {joining === faction.slug ? 'Joining...' : 'Pledge Allegiance'}
              </JoinBtn>
            ) : null}
          </FactionCard>
        );
      })}
    </FactionGrid>
  );
});

FactionSelector.displayName = 'FactionSelector';
export default FactionSelector;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const FactionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 16px 0;
`;

const FactionCard = styled.div<{ $color: string; $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $active, $color }) =>
    $active ? $color : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  transition: border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $active, $color }) => $active && `
    box-shadow: 0 0 20px ${$color}33;
  `}

  &:hover {
    border-color: ${({ $color }) => $color};
    transform: translateY(-2px);
  }
`;

const FactionIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color} 15%, transparent);
  color: ${({ $color }) => $color};
`;

const FactionName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

const FactionMotto = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-align: center;
  margin: 0;
`;

const FactionStats = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;

const StatPill = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--bg-base, #030712);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const JoinBtn = styled.button<{ $color: string }>`
  width: 100%;
  padding: 10px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 10%, transparent);
  color: ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-top: 8px;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const JoinedBtn = styled.button`
  width: 100%;
  padding: 10px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
