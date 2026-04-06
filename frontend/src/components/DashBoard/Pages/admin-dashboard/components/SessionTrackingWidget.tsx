/**
 * SessionTrackingWidget — Sessions logged, top clients, trainer utilization
 * Theme: Crystalline Swan (Ice Wing cyan + Wing Purple)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Dumbbell, Crown, Clock, Activity } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, hexAlpha } from '../../../../Charts/chartTheme';

interface TopClient { name: string; sessions: number; }

interface SessionData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  trainerUtilization: number;
  avgDuration: number;
  topClients: TopClient[];
}

const DEMO: SessionData = {
  today: 4, thisWeek: 18, thisMonth: 62,
  trainerUtilization: 78, avgDuration: 52,
  topClients: [
    { name: 'Client A', sessions: 14 },
    { name: 'Client B', sessions: 12 },
    { name: 'Client C', sessions: 11 },
    { name: 'Client D', sessions: 9 },
    { name: 'Client E', sessions: 8 },
  ],
};

const SessionTrackingWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<SessionData>(DEMO);

  const fetchData = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/analytics/statistics/workouts');
      const d = res.data?.data;
      if (d) {
        setData({
          today: d.sessionsToday ?? DEMO.today,
          thisWeek: d.sessionsThisWeek ?? DEMO.thisWeek,
          thisMonth: d.sessionsThisMonth ?? DEMO.thisMonth,
          trainerUtilization: d.trainerUtilization ?? DEMO.trainerUtilization,
          avgDuration: d.avgDuration ?? DEMO.avgDuration,
          topClients: d.topClients?.length ? d.topClients : DEMO.topClients,
        });
      }
    } catch {
      setData(DEMO);
    }
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxSessions = Math.max(...data.topClients.map(c => c.sessions), 1);

  return (
    <Wrapper>
      <Header>
        <IconWrap><Dumbbell size={18} /></IconWrap>
        <Title>Session Tracking</Title>
      </Header>

      {/* Stat Row */}
      <StatGrid>
        <StatCard>
          <StatValue>{data.today}</StatValue>
          <StatLabel>Today</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{data.thisWeek}</StatValue>
          <StatLabel>This Week</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{data.thisMonth}</StatValue>
          <StatLabel>This Month</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{data.trainerUtilization}%</StatValue>
          <StatLabel>Utilization</StatLabel>
        </StatCard>
      </StatGrid>

      {/* Avg Duration */}
      <AvgRow>
        <Clock size={14} color={CHART_COLORS.textSecondary} />
        <AvgText>Avg session: {data.avgDuration} min</AvgText>
      </AvgRow>

      {/* Top Clients */}
      <SectionLabel>
        <Crown size={14} color={CHART_COLORS.gildedFern} />
        Top Clients by Activity
      </SectionLabel>
      <ClientList>
        {data.topClients.map((c, i) => (
          <ClientRow key={i}>
            <Rank $isTop={i === 0}>{i + 1}</Rank>
            <ClientName>{c.name}</ClientName>
            <BarWrapper>
              <Bar style={{ width: `${(c.sessions / maxSessions) * 100}%` }} $index={i} />
            </BarWrapper>
            <SessionCount>{c.sessions}</SessionCount>
          </ClientRow>
        ))}
      </ClientList>
    </Wrapper>
  );
};

export default SessionTrackingWidget;

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
  background: ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  color: ${CHART_COLORS.wingPurple};
`;

const Title = styled.h3`
  font-size: 15px; font-weight: 700;
  color: var(--text-primary, #E0ECF4); margin: 0;
`;

const StatGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  margin-bottom: 12px;
  @media (max-width: 430px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard = styled.div`
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px; padding: 12px; text-align: center;
`;

const StatValue = styled.div`
  font-size: 20px; font-weight: 700; font-family: 'Fira Code', monospace;
  color: ${CHART_COLORS.iceWing};
`;

const StatLabel = styled.div`
  font-size: 10px; color: rgba(224,236,244,0.5);
  text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;
`;

const AvgRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; margin-bottom: 16px;
  background: rgba(0, 32, 96, 0.2); border-radius: 8px;
`;

const AvgText = styled.span`
  font-size: 12px; color: var(--text-secondary, rgba(224,236,244,0.7));
  font-family: 'Fira Code', monospace;
`;

const SectionLabel = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--text-secondary, rgba(224,236,244,0.7));
  margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
`;

const ClientList = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const ClientRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const Rank = styled.div<{ $isTop: boolean }>`
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  background: ${p => p.$isTop ? hexAlpha(CHART_COLORS.gildedFern, 0.2) : 'rgba(255,255,255,0.05)'};
  color: ${p => p.$isTop ? CHART_COLORS.gildedFern : 'rgba(224,236,244,0.5)'};
`;

const ClientName = styled.span`
  font-size: 13px; color: var(--text-primary, #E0ECF4);
  width: 80px; flex-shrink: 0; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
`;

const BarWrapper = styled.div`
  flex: 1; height: 6px; background: rgba(255,255,255,0.05);
  border-radius: 3px; overflow: hidden;
`;

const barColors = [CHART_COLORS.gildedFern, CHART_COLORS.iceWing, CHART_COLORS.wingPurple, CHART_COLORS.arcticCyan, CHART_COLORS.swanLavender];

const Bar = styled.div<{ $index: number }>`
  height: 100%; border-radius: 3px;
  background: ${p => barColors[p.$index % barColors.length]};
  transition: width 0.6s ease;
`;

const SessionCount = styled.span`
  font-size: 12px; font-weight: 600; font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  width: 28px; text-align: right; flex-shrink: 0;
`;
