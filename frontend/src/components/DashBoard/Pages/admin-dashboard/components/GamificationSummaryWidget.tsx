/**
 * GamificationSummaryWidget — XP, Achievements, Leaderboard Snapshot
 * Admin overview of gamification activity.
 * Theme: Crystalline Swan (Gilded Fern gold + Wing Purple)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Trophy, Star, Zap, Crown, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, hexAlpha } from '../../../../Charts/chartTheme';
import { StyledBox } from '@/components/ui/StyledBox';

interface LeaderEntry { rank: number; name: string; xp: number; level: number; }

interface GamificationData {
  topFiveXPAwarded: number;
  topLevel: number;
  leaderboard: LeaderEntry[];
}

const EMPTY_GAMIFICATION: GamificationData = {
  topFiveXPAwarded: 0,
  topLevel: 0,
  leaderboard: [],
};

// SWA-138 S8: badge/bar chrome uses theme tokens (Rule 6) — CHART_COLORS raw
// hex stays only on icon accents, matching the documented chart-color pattern.
const RARITY_COLORS: Record<number, string> = {
  1: 'var(--accent-gold, #C6A84B)',
  2: 'var(--accent-primary, #60C0F0)',
  3: 'var(--accent-secondary, #8B5CF6)',
};
const rankFallbackBackground = 'var(--surface-muted, rgba(255,255,255,0.05))';
const rankFallbackColor = 'var(--text-muted, rgba(224,236,244,0.5))';

const GamificationSummaryWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<GamificationData>(EMPTY_GAMIFICATION);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [lbRes] = await Promise.all([
        authAxios.get('/api/gamification/leaderboard', { params: { limit: 5 } }),
      ]);
      const lb = lbRes.data?.data ?? lbRes.data?.leaderboard;
      const rawLeaderboard = Array.isArray(lb) ? lb : [];
      const leaderboard = rawLeaderboard.slice(0, 5).map((u: any, i: number) => {
        const xp = u.totalXP ?? u.xp ?? u.points ?? 0;
        return {
          rank: i + 1,
          name: u.username ?? u.name ?? `User ${u.userId ?? i + 1}`,
          xp,
          level: u.level ?? Math.floor(xp / 200) + 1,
        };
      });

      setData({
        leaderboard,
        topFiveXPAwarded: leaderboard.reduce((sum: number, u: LeaderEntry) => sum + u.xp, 0),
        topLevel: Math.max(...leaderboard.map((u: LeaderEntry) => u.level), 0),
      });
    } catch {
      setData(EMPTY_GAMIFICATION);
      setError('Gamification leaderboard unavailable.');
    }
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxXP = Math.max(...data.leaderboard.map(l => l.xp), 1);

  return (
    <Wrapper>
      <Header>
        <IconWrap><Trophy size={18} /></IconWrap>
        <Title>Gamification Overview</Title>
      </Header>

      {/* Summary Stats */}
      <StatsRow>
        <MiniStat>
          <Zap size={16} color={CHART_COLORS.gildedFern} />
          <MiniValue>{(data.topFiveXPAwarded / 1000).toFixed(1)}k</MiniValue>
          <MiniLabel>Top 5 XP</MiniLabel>
        </MiniStat>
        <MiniStat>
          <Star size={16} color={CHART_COLORS.wingPurple} />
          <MiniValue>{data.leaderboard.length}</MiniValue>
          <MiniLabel>Entries</MiniLabel>
        </MiniStat>
        <MiniStat>
          <Crown size={16} color={CHART_COLORS.gildedFern} />
          <MiniValue>{data.topLevel}</MiniValue>
          <MiniLabel>Top Level</MiniLabel>
        </MiniStat>
      </StatsRow>

      {/* Leaderboard */}
      <LeaderLabel>Leaderboard Snapshot</LeaderLabel>
      <LeaderList>
        {error ? (
          <ErrorCopy role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchData}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorCopy>
        ) : data.leaderboard.length === 0 ? (
          <EmptyCopy>No leaderboard entries returned yet.</EmptyCopy>
        ) : data.leaderboard.map((entry) => (
          <LeaderRow key={entry.rank}>
            <RankBadge $rank={entry.rank}>
              {entry.rank <= 3 ? <Crown size={10} /> : entry.rank}
            </RankBadge>
            <LeaderInfo>
              <LeaderName>{entry.name}</LeaderName>
              <LeaderMeta>Lv.{entry.level}</LeaderMeta>
            </LeaderInfo>
            <XPBar>
              <StyledBox as={XPFill} $style={{ width: `${(entry.xp / maxXP) * 100}%` }} $rank={entry.rank} />
            </XPBar>
            <XPValue>{entry.xp.toLocaleString()} XP</XPValue>
          </LeaderRow>
        ))}
      </LeaderList>
    </Wrapper>
  );
};

export default GamificationSummaryWidget;

/* ── Styled Components ── */

const Wrapper = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
`;

const Header = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
`;

const IconWrap = styled.div`
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${hexAlpha(CHART_COLORS.gildedFern, 0.15)};
  color: ${CHART_COLORS.gildedFern};
`;

const Title = styled.h3`
  font-size: 15px; font-weight: 700;
  color: var(--text-primary, #E0ECF4); margin: 0;
`;

const StatsRow = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
  margin-bottom: 16px;
  @media (max-width: 430px) { grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); }
`;

const MiniStat = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 8px; border-radius: 10px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 25%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  gap: 4px;
`;

const MiniValue = styled.div`
  font-size: 18px; font-weight: 700; font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
`;

const MiniLabel = styled.div`
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-muted, rgba(224,236,244,0.45));
`;

const LeaderLabel = styled.div`
  font-size: 12px; font-weight: 600; color: var(--text-secondary, rgba(224,236,244,0.6));
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
`;

const LeaderList = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const EmptyCopy = styled.div`
  color: var(--text-muted, #94A3B8);
  font-size: 0.85rem;
  padding: 8px 0;
`;

const ErrorCopy = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px;
  min-height: 44px; padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--warning, #F59E0B) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #F59E0B) 26%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  @media (max-width: 430px) { grid-template-columns: auto 1fr; }
`;

const RetryInline = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent); border-radius: 8px; padding: 0 12px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 40%, transparent); color: var(--text-primary, #E0ECF4);
  font-size: 12px; font-weight: 700; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (max-width: 430px) { grid-column: 1 / -1; width: 100%; }
`;

const LeaderRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0;
`;

const RankBadge = styled.div<{ $rank: number }>`
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  background: ${p => p.$rank <= 3 ? `color-mix(in srgb, ${RARITY_COLORS[p.$rank] || 'var(--accent-primary, #60C0F0)'} 20%, transparent)` : rankFallbackBackground};
  color: ${p => p.$rank <= 3 ? (RARITY_COLORS[p.$rank] || 'var(--accent-primary, #60C0F0)') : rankFallbackColor};
`;

const LeaderInfo = styled.div`
  width: 80px; flex-shrink: 0;
`;

const LeaderName = styled.div`
  font-size: 13px; color: var(--text-primary, #E0ECF4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;

const LeaderMeta = styled.div`
  font-size: 10px; color: var(--text-muted, rgba(224,236,244,0.4));
  font-family: 'Fira Code', monospace;
`;

const XPBar = styled.div`
  flex: 1; height: 6px; background: var(--surface-muted, rgba(255,255,255,0.05));
  border-radius: 3px; overflow: hidden;
`;

const XPFill = styled.div<{ $rank: number }>`
  height: 100%; border-radius: 3px;
  background: ${p => RARITY_COLORS[p.$rank] || 'var(--accent-tertiary, #4070C0)'};
  transition: width 0.6s ease;
`;

const XPValue = styled.span`
  font-size: 11px; font-weight: 600; font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  width: 70px; text-align: right; flex-shrink: 0;
`;
