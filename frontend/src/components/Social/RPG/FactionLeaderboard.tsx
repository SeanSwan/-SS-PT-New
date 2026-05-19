/**
 * ┌─── SUB-COMPONENT: FactionLeaderboard ──────────────────────┐
 * │ PARENT: SocialFeed                                          │
 * │ PURPOSE: Compact 3-bar race showing faction point totals    │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ⚔ Vanguard   ████████░░ 12.4K   │                        │
 * │ │ ⚡ Syndicate  █████░░░░░  8.9K   │                        │
 * │ │ ★ Sentinels  ██████████ 15.1K   │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { factions }                                         │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { Shield, Zap, Star } from 'lucide-react';
import type { Faction } from '../../../hooks/social/useFaction';

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

interface FactionLeaderboardProps {
  factions: Faction[];
}

const FactionLeaderboard: React.FC<FactionLeaderboardProps> = memo(({ factions }) => {
  if (!factions.length) return null;

  const maxPoints = Math.max(...factions.map(f => Number(f.totalPoints)), 1);

  return (
    <LeaderboardWrap>
      <Title>Faction War</Title>
      {factions.map((faction) => {
        const Icon = ICON_MAP[faction.icon] || Shield;
        const pct = (Number(faction.totalPoints) / maxPoints) * 100;

        return (
          <BarRow key={faction.id}>
            <BarLabel>
              <Icon size={14} />
              <span>{faction.name.replace('The ', '')}</span>
            </BarLabel>
            <BarTrack>
              <BarFill $color={faction.color} style={{ width: `${Math.max(pct, 3)}%` }} />
            </BarTrack>
            <BarValue>{formatPoints(Number(faction.totalPoints))}</BarValue>
          </BarRow>
        );
      })}
    </LeaderboardWrap>
  );
});

FactionLeaderboard.displayName = 'FactionLeaderboard';
export default FactionLeaderboard;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

function formatPoints(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const LeaderboardWrap = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin: 12px 0;
`;

const Title = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0 0 10px;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
`;

const BarLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 90px;
  flex-shrink: 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const BarTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-base, #030712);
  overflow: hidden;
`;

const BarFill = styled.div<{ $color: string }>`
  height: 100%;
  border-radius: 4px;
  background: ${({ $color }) => $color};
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const BarValue = styled.span`
  width: 48px;
  text-align: right;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;
