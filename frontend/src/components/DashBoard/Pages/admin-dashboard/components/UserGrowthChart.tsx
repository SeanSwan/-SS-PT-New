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
import { Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, victoryTheme, hexAlpha } from '../../../../Charts/chartTheme';

interface GrowthPoint { date: string; signups: number; active: number; }

interface GrowthData {
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
  newThisMonth: number;
  retentionRate: number;
  history: GrowthPoint[];
}

const DEMO: GrowthData = {
  totalUsers: 142, activeUsers: 47, newThisWeek: 3,
  newThisMonth: 12, retentionRate: 87.5,
  history: [
    { date: 'Week 1', signups: 4, active: 38 },
    { date: 'Week 2', signups: 3, active: 40 },
    { date: 'Week 3', signups: 5, active: 41 },
    { date: 'Week 4', signups: 2, active: 43 },
    { date: 'Week 5', signups: 6, active: 44 },
    { date: 'Week 6', signups: 4, active: 45 },
    { date: 'Week 7', signups: 3, active: 47 },
  ],
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeGrowthHistory = (value: unknown): GrowthPoint[] => {
  if (!Array.isArray(value)) return DEMO.history;

  const normalized = value.map((entry, index) => {
    const point = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    return {
      date: typeof point.date === 'string' && point.date.trim() ? point.date : `Point ${index + 1}`,
      signups: toFiniteNumber(point.signups ?? point.newUsers),
      active: toFiniteNumber(point.active ?? point.activeUsers),
    };
  });

  return normalized.length ? normalized : DEMO.history;
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
    totalUsers: toFiniteNumber(overview.totalUsers, DEMO.totalUsers),
    activeUsers: toFiniteNumber(overview.activeUsers ?? overview.activeToday, DEMO.activeUsers),
    newThisWeek: toFiniteNumber(overview.newThisWeek, DEMO.newThisWeek),
    newThisMonth: toFiniteNumber(overview.newThisMonth, derivedNewThisMonth || DEMO.newThisMonth),
    retentionRate: Number(toFiniteNumber(overview.retentionRate, DEMO.retentionRate).toFixed(1)),
    history,
  };
};

const UserGrowthChart: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<GrowthData>(DEMO);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/admin/analytics/users');
      if (res.data?.data) setData(normalizeGrowthData(res.data.data));
    } catch {
      setData(DEMO);
    } finally {
      setLoading(false);
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
        <VictoryChart
          theme={victoryTheme}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          height={220}
          padding={{ top: 30, bottom: 40, left: 50, right: 20 }}
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
            style={{ labels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Fira Code'" } }}
            data={[
              { name: 'Active', symbol: { fill: CHART_COLORS.iceWing } },
              { name: 'Signups', symbol: { fill: CHART_COLORS.wingPurple } },
            ]}
          />
          <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
          <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
          <VictoryLine
            data={activeData}
            interpolation="monotoneX"
            style={{ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2.5 } }}
          />
          <VictoryScatter
            data={activeData}
            size={3}
            style={{ data: { fill: CHART_COLORS.iceWing } }}
          />
          <VictoryLine
            data={signupData}
            interpolation="monotoneX"
            style={{ data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2, strokeDasharray: '6 3' } }}
          />
          <VictoryScatter
            data={signupData}
            size={3}
            style={{ data: { fill: CHART_COLORS.wingPurple } }}
          />
        </VictoryChart>
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
