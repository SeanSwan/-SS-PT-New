/**
 * UserGrowthChart — Victory Line Chart for User Growth
 * Shows new signups and active users over time.
 * Theme: Crystalline Swan (Ice Wing cyan + Wing Purple)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryTooltip,
  VictoryVoronoiContainer, VictoryLegend, VictoryScatter,
} from 'victory';
import { AlertTriangle, RefreshCw, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, victoryTheme, hexAlpha } from '../../../../Charts/chartTheme';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface GrowthPoint { date: string; signups: number; active: number; }

interface GrowthData {
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
  newThisMonth: number;
  retentionRate: number;
  history: GrowthPoint[];
}

const EMPTY_GROWTH_DATA: GrowthData = {
  totalUsers: 0, activeUsers: 0, newThisWeek: 0,
  newThisMonth: 0, retentionRate: 0, history: [],
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeGrowthHistory = (value: unknown): GrowthPoint[] => {
  if (!Array.isArray(value)) return [];

  const normalized = value.map((entry, index) => {
    const point = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    return {
      date: typeof point.date === 'string' && point.date.trim() ? point.date : `Point ${index + 1}`,
      signups: toFiniteNumber(point.signups ?? point.newUsers),
      active: toFiniteNumber(point.active ?? point.activeUsers),
    };
  });

  return normalized;
};

const normalizeGrowthData = (value: unknown): GrowthData => {
  const payload = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const overview = payload.overview && typeof payload.overview === 'object'
    ? payload.overview as Record<string, unknown>
    : payload;
  const history = Array.isArray(payload.history)
    ? normalizeGrowthHistory(payload.history)
    : normalizeGrowthHistory(payload.userActivity);
  const derivedNewThisMonth = history.reduce((sum, point) => sum + point.signups, 0);

  return {
    totalUsers: toFiniteNumber(overview.totalUsers),
    activeUsers: toFiniteNumber(overview.activeUsers ?? overview.activeToday),
    newThisWeek: toFiniteNumber(overview.newThisWeek),
    newThisMonth: toFiniteNumber(overview.newThisMonth, derivedNewThisMonth),
    retentionRate: Number(toFiniteNumber(overview.retentionRate).toFixed(1)),
    history,
  };
};

const UserGrowthChart: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<GrowthData>(EMPTY_GROWTH_DATA);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await authAxios.get('/api/admin/analytics/users');
      setData(normalizeGrowthData(res.data?.data));
    } catch {
      setData(EMPTY_GROWTH_DATA);
      setError('User growth data could not be loaded.');
    }
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const signupData = data.history.map(h => ({ x: h.date, y: h.signups }));
  const activeData = data.history.map(h => ({ x: h.date, y: h.active }));

  return (
    <Wrapper>
      <Header>
        <HeaderLeft>
          <IconWrap><Users size={18} /></IconWrap>
          <div>
            <Title>User Growth</Title>
            <Subtitle>
              {data.activeUsers} active · {data.retentionRate}% retention
            </Subtitle>
          </div>
        </HeaderLeft>
        <StatPills>
          <Pill $color={CHART_COLORS.iceWing}>
            <TrendingUp size={12} /> +{data.newThisWeek} this week
          </Pill>
          <Pill $color={CHART_COLORS.wingPurple}>
            +{data.newThisMonth} this month
          </Pill>
        </StatPills>
      </Header>

      <ChartWrap>
        {error ? (
          <ErrorState role="alert" aria-live="polite">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchData}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorState>
        ) : data.history.length === 0 ? (
          <EmptyState>No user growth data for this period.</EmptyState>
        ) : (
          <VictoryChart
            theme={victoryTheme}
            animate={{ onLoad: { duration: 600 } }}
            height={220}
            padding={{ top: 30, bottom: 56, left: 50, right: 20 }}
            containerComponent={
              <VictoryVoronoiContainer
                labels={({ datum }: any) => `${datum.y}`}
                labelComponent={<VictoryTooltip constrainToVisibleArea />}
              />
            }
          >
            <VictoryLegend
              x={50} y={2}
              orientation="horizontal"
              gutter={16}
              {...victoryStyleProps({ labels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Fira Code'" } })}
              data={[
                { name: 'Active', symbol: { fill: CHART_COLORS.iceWing } },
                { name: 'Signups', symbol: { fill: CHART_COLORS.wingPurple } },
              ]}
            />
            <VictoryAxis
              fixLabelOverlap
              tickCount={Math.min(data.history.length, 7)}
              {...victoryStyleProps({ tickLabels: { fontSize: 9, angle: -35, textAnchor: 'end', padding: 6 } })}
            />
            <VictoryAxis dependentAxis {...victoryStyleProps({ tickLabels: { fontSize: 10 } })} />
            <VictoryLine
              data={activeData}
              interpolation="linear"
              {...victoryStyleProps({ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2.5 } })}
            />
            <VictoryScatter data={activeData} size={3} {...victoryStyleProps({ data: { fill: CHART_COLORS.iceWing } })} />
            <VictoryLine
              data={signupData}
              interpolation="linear"
              {...victoryStyleProps({ data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2, strokeDasharray: '6 3' } })}
            />
            <VictoryScatter data={signupData} size={3} {...victoryStyleProps({ data: { fill: CHART_COLORS.wingPurple } })} />
          </VictoryChart>
        )}
      </ChartWrap>
    </Wrapper>
  );
};

export default UserGrowthChart;

/* ── Styled Components ── */

const Wrapper = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
`;

const HeaderLeft = styled.div`
  display: flex; align-items: center; gap: 10px;
`;

const IconWrap = styled.div`
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  color: ${CHART_COLORS.iceWing};
`;

const Title = styled.h3`
  font-size: 15px; font-weight: 700;
  color: var(--text-primary, #E0ECF4); margin: 0;
`;

const Subtitle = styled.p`
  font-size: 12px; margin: 2px 0 0;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-family: 'Fira Code', monospace;
`;

const StatPills = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap;
`;

const Pill = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; font-family: 'Fira Code', monospace;
  background: ${p => hexAlpha(p.$color, 0.12)};
  color: ${p => p.$color};
  border: 1px solid ${p => hexAlpha(p.$color, 0.2)};
`;

const ChartWrap = styled.div`
  width: 100%; min-height: 220px;
  @media (prefers-reduced-motion: reduce) {
    svg * { animation: none !important; transition: none !important; }
  }
`;

const ErrorState = styled.div`
  min-height: 220px; display: flex; align-items: center; justify-content: center;
  gap: 10px; flex-wrap: wrap; padding: 18px; text-align: center;
  color: var(--warning, #C6A84B);
  background: var(--surface-muted, rgba(198, 168, 75, 0.08));
  border: 1px solid var(--border-warning, rgba(198, 168, 75, 0.2));
  border-radius: 12px; font-size: 13px; font-weight: 600;
`;

const RetryInline = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; gap: 8px;
  border: 1px solid var(--border-warning, rgba(198, 168, 75, 0.28));
  border-radius: 10px; padding: 8px 14px; color: var(--warning, #C6A84B);
  background: var(--surface-muted, rgba(198, 168, 75, 0.12));
  cursor: pointer; font-size: 12px; font-weight: 700;
`;

const EmptyState = styled.div`
  min-height: 220px; display: flex; align-items: center; justify-content: center;
  padding: 18px; text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  border: 1px dashed var(--border-subtle, rgba(96, 192, 240, 0.16));
  border-radius: 12px; font-size: 13px;
`;
