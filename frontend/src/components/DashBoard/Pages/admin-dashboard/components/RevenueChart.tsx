/**
 * RevenueChart - Victory area chart for admin revenue trends.
 * Shows real API-backed MRR and revenue history without demo fallbacks.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  CHART_COLORS,
  hexAlpha,
  victoryTheme,
} from '../../../../Charts/chartTheme';
import type { RevenueChartData, RevenueDataPoint } from './RevenueChart.types';
import {
  ChartWrap,
  Controls,
  EmptyState,
  ErrorState,
  Header,
  HeaderLeft,
  IconWrap,
  RangeBtn,
  RefreshBtn,
  RetryInline,
  Subtitle,
  Title,
  Wrapper,
} from './RevenueChart.styles';

const EMPTY_REVENUE_DATA: RevenueChartData = {
  overview: {
    totalRevenue: 0,
    monthlyRecurring: 0,
    averageTransaction: 0,
    totalCustomers: 0,
  },
  revenueHistory: [],
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRevenueHistory = (value: unknown): RevenueDataPoint[] => {
  if (!Array.isArray(value)) return [];

  return value.map((entry, index) => {
    const point = (entry && typeof entry === 'object' ? entry : {}) as Partial<RevenueDataPoint>;

    return {
      date: typeof point.date === 'string' && point.date.trim() ? point.date : `Point ${index + 1}`,
      revenue: toFiniteNumber(point.revenue),
      transactions: toFiniteNumber(point.transactions),
    };
  });
};

const normalizeRevenueData = (value: unknown): RevenueChartData => {
  const payload = (value && typeof value === 'object' ? value : {}) as Partial<RevenueChartData> & {
    overview?: Partial<RevenueChartData['overview']>;
  };
  const overview: Partial<RevenueChartData['overview']> = payload.overview ?? {};

  return {
    overview: {
      totalRevenue: toFiniteNumber(overview.totalRevenue),
      monthlyRecurring: toFiniteNumber(overview.monthlyRecurring),
      averageTransaction: toFiniteNumber(overview.averageTransaction),
      totalCustomers: toFiniteNumber(overview.totalCustomers),
    },
    revenueHistory: normalizeRevenueHistory(payload.revenueHistory),
  };
};

const RevenueChart: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<RevenueChartData>(EMPTY_REVENUE_DATA);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('90d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/admin/analytics/revenue', {
        params: { timeRange },
      });
      setData(normalizeRevenueData(res.data?.data));
      setError(null);
    } catch {
      setData(EMPTY_REVENUE_DATA);
      setError('Revenue data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [authAxios, timeRange]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const chartData = data.revenueHistory.map((d) => ({
    x: d.date,
    y: toFiniteNumber(d.revenue),
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
              {' - '}Avg: ${data.overview.averageTransaction}
            </Subtitle>
          </div>
        </HeaderLeft>
        <Controls>
          {(['30d', '90d', '1y'] as const).map((range) => (
            <RangeBtn key={range} $active={timeRange === range} onClick={() => setTimeRange(range)}>
              {range === '30d' ? '30D' : range === '90d' ? '90D' : '1Y'}
            </RangeBtn>
          ))}
          <RefreshBtn onClick={fetchRevenue} aria-label="Refresh revenue data">
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </RefreshBtn>
        </Controls>
      </Header>

      <ChartWrap>
        {error ? (
          <ErrorState role="alert" aria-live="polite">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchRevenue}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorState>
        ) : chartData.length === 0 ? (
          <EmptyState>No revenue trend data for this period.</EmptyState>
        ) : (
          <VictoryChart
            theme={victoryTheme}
            animate={{ onLoad: { duration: 600 } }}
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
              x={60}
              y={2}
              orientation="horizontal"
              gutter={16}
              style={{ labels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Fira Code'" } }}
              data={[{ name: 'Revenue', symbol: { fill: CHART_COLORS.gildedFern } }]}
            />
            <VictoryAxis tickFormat={(tick: string) => tick} style={{ tickLabels: { fontSize: 10 } }} />
            <VictoryAxis
              dependentAxis
              tickFormat={(tick: number) => `$${(tick / 1000).toFixed(0)}k`}
              style={{ tickLabels: { fontSize: 10 } }}
            />
            <VictoryArea
              data={chartData}
              interpolation="linear"
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
              interpolation="linear"
              style={{
                data: { stroke: CHART_COLORS.gildedFern, strokeWidth: 2.5 },
              }}
            />
          </VictoryChart>
        )}
      </ChartWrap>
    </Wrapper>
  );
};

export default RevenueChart;
