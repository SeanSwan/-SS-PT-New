/**
 * RevenueChart — Victory Area Chart for Revenue Trends
 * Shows MRR, total revenue trend over time with Victory area chart.
 * Theme: Crystalline Swan (Gilded Fern gold + Ice Wing cyan)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  VictoryChart, VictoryArea, VictoryAxis, VictoryTooltip,
  VictoryVoronoiContainer, VictoryLine, VictoryLegend,
} from 'victory';
import { DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  CHART_COLORS, victoryTheme, hexAlpha,
} from '../../../../Charts/chartTheme';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
}

interface RevenueChartData {
  overview: {
    totalRevenue: number;
    monthlyRecurring: number;
    averageTransaction: number;
    totalCustomers: number;
  };
  revenueHistory: RevenueDataPoint[];
}

const DEMO_DATA: RevenueChartData = {
  overview: {
    totalRevenue: 26250, monthlyRecurring: 8750,
    averageTransaction: 186, totalCustomers: 47,
  },
  revenueHistory: [
    { date: 'Jan', revenue: 5200, transactions: 28 },
    { date: 'Feb', revenue: 6100, transactions: 33 },
    { date: 'Mar', revenue: 5800, transactions: 31 },
    { date: 'Apr', revenue: 7200, transactions: 38 },
    { date: 'May', revenue: 7600, transactions: 41 },
    { date: 'Jun', revenue: 8100, transactions: 44 },
    { date: 'Jul', revenue: 8750, transactions: 47 },
  ],
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRevenueHistory = (value: unknown): RevenueDataPoint[] => {
  if (!Array.isArray(value)) return DEMO_DATA.revenueHistory;

  const normalized = value.map((entry, index) => {
    const point = (entry && typeof entry === 'object' ? entry : {}) as Partial<RevenueDataPoint>;
    return {
      date: typeof point.date === 'string' && point.date.trim() ? point.date : `Point ${index + 1}`,
      revenue: toFiniteNumber(point.revenue),
      transactions: toFiniteNumber(point.transactions),
    };
  });

  return normalized.length ? normalized : DEMO_DATA.revenueHistory;
};

const normalizeRevenueData = (value: unknown): RevenueChartData => {
  const payload = (value && typeof value === 'object' ? value : {}) as Partial<RevenueChartData> & {
    overview?: Partial<RevenueChartData['overview']>;
  };
  const overview = payload.overview ?? {};

  return {
    overview: {
      totalRevenue: toFiniteNumber(overview.totalRevenue, DEMO_DATA.overview.totalRevenue),
      monthlyRecurring: toFiniteNumber(overview.monthlyRecurring, DEMO_DATA.overview.monthlyRecurring),
      averageTransaction: toFiniteNumber(overview.averageTransaction, DEMO_DATA.overview.averageTransaction),
      totalCustomers: toFiniteNumber(overview.totalCustomers, DEMO_DATA.overview.totalCustomers),
    },
    revenueHistory: normalizeRevenueHistory(payload.revenueHistory),
  };
};

const RevenueChart: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<RevenueChartData>(DEMO_DATA);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('90d');
  const [loading, setLoading] = useState(false);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/admin/analytics/revenue', {
        params: { timeRange },
      });
      if (res.data?.data) setData(normalizeRevenueData(res.data.data));
    } catch {
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  }, [authAxios, timeRange]);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  const chartData = data.revenueHistory.map((d, i) => ({
    x: d.date, y: toFiniteNumber(d.revenue),
  }));

  return (
    <Wrapper>
      <Header>
        <HeaderLeft>
          <IconWrap><DollarSign size={18} /></IconWrap>
          <div>
            <Title>Revenue Trend</Title>
            <Subtitle>
              MRR: ${data.overview.monthlyRecurring.toLocaleString()}
              {' · '}Avg: ${data.overview.averageTransaction}
            </Subtitle>
          </div>
        </HeaderLeft>
        <Controls>
          {(['30d', '90d', '1y'] as const).map(r => (
            <RangeBtn key={r} $active={timeRange === r} onClick={() => setTimeRange(r)}>
              {r === '30d' ? '30D' : r === '90d' ? '90D' : '1Y'}
            </RangeBtn>
          ))}
          <RefreshBtn onClick={fetchRevenue} aria-label="Refresh revenue data">
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </RefreshBtn>
        </Controls>
      </Header>

      <ChartWrap>
        <VictoryChart
          theme={victoryTheme}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          height={220}
          padding={{ top: 30, bottom: 40, left: 60, right: 20 }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }: any) => `$${datum.y.toLocaleString()}`}
              labelComponent={<VictoryTooltip constrainToVisibleArea />}
            />
          }
        >
          <VictoryLegend
            x={60} y={2}
            orientation="horizontal"
            gutter={16}
            style={{ labels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Fira Code'" } }}
            data={[
              { name: 'Revenue', symbol: { fill: CHART_COLORS.gildedFern } },
            ]}
          />
          <VictoryAxis
            tickFormat={(t: string) => t}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(t: number) => `$${(t / 1000).toFixed(0)}k`}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          <VictoryArea
            data={chartData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: hexAlpha(CHART_COLORS.gildedFern, 0.15),
                stroke: CHART_COLORS.gildedFern,
                strokeWidth: 2.5,
              },
            }}
          />
          <VictoryLine
            data={chartData}
            interpolation="monotoneX"
            style={{
              data: { stroke: CHART_COLORS.gildedFern, strokeWidth: 2.5 },
            }}
          />
        </VictoryChart>
      </ChartWrap>
    </Wrapper>
  );
};

export default RevenueChart;

/* ── Styled Components ── */

const Wrapper = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconWrap = styled.div`
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${hexAlpha(CHART_COLORS.gildedFern, 0.15)};
  color: ${CHART_COLORS.gildedFern};
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

const Controls = styled.div`
  display: flex; gap: 4px; align-items: center;
`;

const RangeBtn = styled.button<{ $active: boolean }>`
  padding: 6px 12px; border: none; border-radius: 8px;
  font-size: 11px; font-weight: 600; cursor: pointer;
  min-height: 44px; transition: all 0.15s;
  background: ${p => p.$active ? hexAlpha(CHART_COLORS.gildedFern, 0.2) : 'transparent'};
  color: ${p => p.$active ? CHART_COLORS.gildedFern : 'rgba(255,255,255,0.5)'};
  &:hover { color: ${CHART_COLORS.gildedFern}; }
`;

const RefreshBtn = styled.button`
  width: 44px; height: 44px; border: none; border-radius: 10px;
  background: transparent; color: var(--text-secondary, rgba(224,236,244,0.5));
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { color: ${CHART_COLORS.iceWing}; background: rgba(96,192,240,0.1); }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const ChartWrap = styled.div`
  width: 100%; min-height: 220px;

  @media (prefers-reduced-motion: reduce) {
    svg * { animation: none !important; transition: none !important; }
  }
`;
