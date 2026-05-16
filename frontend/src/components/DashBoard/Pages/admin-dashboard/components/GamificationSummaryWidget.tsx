/**
 * GamificationSummaryWidget — XP, Achievements, Leaderboard Snapshot
 * Admin overview of gamification activity.
 * Theme: Crystalline Swan (Gilded Fern gold + Wing Purple)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Trophy, Star, Zap, Crown, Medal } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, hexAlpha } from '../../../../Charts/chartTheme';

interface LeaderEntry { rank: number; name: string; xp: number; level: number; }

interface GamificationData {
  totalXPAwarded: number;
  achievementsThisWeek: number;
  totalAchievements: number;
  activeStreaks: number;
  topLevel: number;
  leaderboard: LeaderEntry[];
}

const EMPTY_GAMIFICATION: GamificationData = {
  totalXPAwarded: 0,
  achievementsThisWeek: 0,
  totalAchievements: 0,
  activeStreaks: 0,
  topLevel: 0,
  leaderboard: [],
};

const RARITY_COLORS: Record<number, string> = {
  1: CHART_COLORS.gildedFern,
  2: CHART_COLORS.iceWing,
  3: CHART_COLORS.wingPurple,
};

const GamificationSummaryWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<GamificationData>(EMPTY_GAMIFICATION);

  const fetchData = useCallback(async () => {
    try {
      const [lbRes] = await Promise.all([
        authAxios.get('/api/gamification/leaderboard', { params: { limit: 5 } }),
      ]);
      const lb = lbRes.data?.data ?? lbRes.data?.leaderboard;
      if (lb?.length) {
        setData(prev => ({
          ...prev,
          leaderboard: lb.slice(0, 5).map((u: any, i: number) => ({
            rank: i + 1,
            name: u.username ?? u.name ?? `User ${u.userId ?? i + 1}`,
            xp: u.totalXP ?? u.xp ?? u.points ?? 0,
            level: u.level ?? Math.floor((u.totalXP ?? 0) / 200) + 1,
          })),
          totalXPAwarded: lb.reduce((sum: number, u: any) => sum + (u.totalXP ?? u.xp ?? 0), 0),
        }));
      }
    } catch {
      setData(EMPTY_GAMIFICATION);
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
          <MiniValue>{(data.totalXPAwarded / 1000).toFixed(1)}k</MiniValue>
          <MiniLabel>Total XP</MiniLabel>
        </MiniStat>
        <MiniStat>
          <Star size={16} color={CHART_COLORS.wingPurple} />
          <MiniValue>{data.achievementsThisWeek}</MiniValue>
          <MiniLabel>This Week</MiniLabel>
        </MiniStat>
        <MiniStat>
          <Medal size={16} color={CHART_COLORS.iceWing} />
          <MiniValue>{data.totalAchievements}</MiniValue>
          <MiniLabel>Total</MiniLabel>
        </MiniStat>
        <MiniStat>
          <Crown size={16} color={CHART_COLORS.gildedFern} />
          <MiniValue>{data.activeStreaks}</MiniValue>
          <MiniLabel>Streaks</MiniLabel>
        </MiniStat>
      </StatsRow>

      {/* Leaderboard */}
      <LeaderLabel>Leaderboard Snapshot</LeaderLabel>
      <LeaderList>
        {data.leaderboard.length === 0 ? (
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
              <XPFill style={{ width: `${(entry.xp / maxXP) * 100}%` }} $rank={entry.rank} />
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
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  margin-bottom: 16px;
  @media (max-width: 430px) { grid-template-columns: repeat(2, 1fr); }
`;

const MiniStat = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 12px 8px; border-radius: 10px;
  background: rgba(0, 32, 96, 0.25);
  border: 1px solid rgba(96, 192, 240, 0.06);
  gap: 4px;
`;

const MiniValue = styled.div`
  font-size: 18px; font-weight: 700; font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
`;

const MiniLabel = styled.div`
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
  color: rgba(224,236,244,0.45);
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

const LeaderRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0;
`;

const RankBadge = styled.div<{ $rank: number }>`
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  background: ${p => p.$rank <= 3 ? hexAlpha(RARITY_COLORS[p.$rank] || CHART_COLORS.iceWing, 0.2) : 'rgba(255,255,255,0.05)'};
  color: ${p => p.$rank <= 3 ? (RARITY_COLORS[p.$rank] || CHART_COLORS.iceWing) : 'rgba(224,236,244,0.5)'};
`;

const LeaderInfo = styled.div`
  width: 80px; flex-shrink: 0;
`;

const LeaderName = styled.div`
  font-size: 13px; color: var(--text-primary, #E0ECF4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;

const LeaderMeta = styled.div`
  font-size: 10px; color: rgba(224,236,244,0.4);
  font-family: 'Fira Code', monospace;
`;

const XPBar = styled.div`
  flex: 1; height: 6px; background: rgba(255,255,255,0.05);
  border-radius: 3px; overflow: hidden;
`;

const XPFill = styled.div<{ $rank: number }>`
  height: 100%; border-radius: 3px;
  background: ${p => RARITY_COLORS[p.$rank] || CHART_COLORS.swanLavender};
  transition: width 0.6s ease;
`;

const XPValue = styled.span`
  font-size: 11px; font-weight: 600; font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  width: 70px; text-align: right; flex-shrink: 0;
`;
