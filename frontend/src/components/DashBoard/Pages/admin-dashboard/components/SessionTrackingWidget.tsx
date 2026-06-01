/**
 * SessionTrackingWidget — Sessions logged, top clients, trainer utilization
 * Theme: Crystalline Swan (Ice Wing cyan + Wing Purple)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AlertTriangle, Dumbbell, Crown, Clock, RefreshCw } from 'lucide-react';
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

const EMPTY_SESSION_DATA: SessionData = {
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  trainerUtilization: 0,
  avgDuration: 0,
  topClients: [],
};
const sessionRankFallbackBackground = 'var(--surface-muted, rgba(255,255,255,0.05))';
const sessionRankFallbackColor = 'var(--text-muted, rgba(224,236,244,0.5))';

const toFiniteNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTopClients = (value: unknown): TopClient[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const sessions = Math.max(0, Math.round(toFiniteNumber(row.sessions)));
      return name && sessions > 0 ? { name, sessions } : null;
    })
    .filter((client): client is TopClient => Boolean(client));
};

const normalizeSessionData = (value: unknown): SessionData => {
  if (!value || typeof value !== 'object') return EMPTY_SESSION_DATA;

  const row = value as Record<string, unknown>;

  return {
    today: Math.round(toFiniteNumber(row.sessionsToday)),
    thisWeek: Math.round(toFiniteNumber(row.sessionsThisWeek)),
    thisMonth: Math.round(toFiniteNumber(row.sessionsThisMonth)),
    trainerUtilization: Number(toFiniteNumber(row.trainerUtilization).toFixed(1)),
    avgDuration: Number(toFiniteNumber(row.avgDuration).toFixed(1)),
    topClients: normalizeTopClients(row.topClients),
  };
};

const SessionTrackingWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<SessionData>(EMPTY_SESSION_DATA);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/analytics/statistics/workouts');
      setData(normalizeSessionData(res.data?.data));
      setError(null);
    } catch {
      setData(EMPTY_SESSION_DATA);
      setError('Session tracking data could not be loaded.');
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
        {error ? (
          <ErrorState role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchData}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorState>
        ) : data.topClients.length === 0 ? (
          <EmptyState>No completed client session activity for this period.</EmptyState>
        ) : (
          data.topClients.map((c, i) => (
            <ClientRow key={`${c.name}-${i}`}>
              <Rank $isTop={i === 0}>{i + 1}</Rank>
              <ClientName>{c.name}</ClientName>
              <BarWrapper>
                <Bar style={{ width: `${(c.sessions / maxSessions) * 100}%` }} $index={i} />
              </BarWrapper>
              <SessionCount>{c.sessions}</SessionCount>
            </ClientRow>
          ))
        )}
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
  background: color-mix(in srgb, var(--royal-depth, #003080) 30%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 10px; padding: 12px; text-align: center;
`;

const StatValue = styled.div`
  font-size: 20px; font-weight: 700; font-family: 'Fira Code', monospace;
  color: ${CHART_COLORS.iceWing};
`;

const StatLabel = styled.div`
  font-size: 10px; color: var(--text-muted, rgba(224,236,244,0.5));
  text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;
`;

const AvgRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; margin-bottom: 16px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent); border-radius: 8px;
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

const ErrorState = styled.div`
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

const EmptyState = styled.div`
  min-height: 44px; display: flex; align-items: center;
  padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 12px;
`;

const ClientRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const Rank = styled.div<{ $isTop: boolean }>`
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  background: ${p => p.$isTop ? hexAlpha(CHART_COLORS.gildedFern, 0.2) : sessionRankFallbackBackground};
  color: ${p => p.$isTop ? CHART_COLORS.gildedFern : sessionRankFallbackColor};
`;

const ClientName = styled.span`
  font-size: 13px; color: var(--text-primary, #E0ECF4);
  width: 80px; flex-shrink: 0; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
`;

const BarWrapper = styled.div`
  flex: 1; height: 6px; background: var(--surface-muted, rgba(255,255,255,0.05));
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
