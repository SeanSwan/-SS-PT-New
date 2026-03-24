import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { BarChart2 } from 'lucide-react';

interface MetricDataPoint {
  program: string;
  performance: number;
  satisfaction: number;
  attendance: number;
}

interface FitnessMetricsChartProps {
  isLoading?: boolean;
  /** Pass data directly to skip internal fetch */
  data?: MetricDataPoint[];
}

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const CardContainer = styled.div`
  border-radius: 12px;
  height: 100%;
  background: var(--bg-surface, rgba(29, 31, 43, 0.8));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const Title = styled.h5`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-heading, white);
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
  margin: 0;
`;

const ToggleGroup = styled.div`
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  min-height: 36px;
  border: none;
  background: ${props => props.$active ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
  color: ${props => props.$active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, rgba(255, 255, 255, 0.6))'};
  font-size: 0.8125rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }

  & + & {
    border-left: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  margin-bottom: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  color: ${props => props.$active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, rgba(255, 255, 255, 0.6))'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? 'var(--accent-primary, #60C0F0)' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const ChartContainer = styled.div`
  height: 360px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $mt?: number }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: 4px;
  margin-top: ${props => props.$mt ? `${props.$mt}px` : '0'};
`;

const TooltipBox = styled.div`
  background: var(--bg-elevated, rgba(15, 15, 30, 0.95));
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const TooltipTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  display: block;
  margin-bottom: 4px;
`;

const TooltipEntry = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8125rem;
`;

const TooltipDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$color};
  flex-shrink: 0;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  text-align: center;
  gap: 12px;

  h5 {
    color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }
`;

/**
 * Fitness Metrics Chart Component
 *
 * Displays program effectiveness metrics from real dashboard data.
 * Falls back to empty state when no session data exists.
 */
const FitnessMetricsChart: React.FC<FitnessMetricsChartProps> = ({ isLoading = false, data }) => {
  const { authAxios } = useAuth();
  const [timeRange, setTimeRange] = useState<string>('month');
  const [metricTab, setMetricTab] = useState<number>(0);
  const [apiData, setApiData] = useState<MetricDataPoint[]>([]);
  const [fetching, setFetching] = useState(!data);

  // Fetch real metrics from dashboard API
  useEffect(() => {
    if (data) return; // Skip fetch when data is passed as prop
    let cancelled = false;

    const fetchMetrics = async () => {
      try {
        // Map timeRange to API timeframe format
        const timeframeMap: Record<string, string> = { week: '7d', month: '30d', year: '365d' };
        const timeframe = timeframeMap[timeRange] || '30d';
        const response = await authAxios.get(`/api/dashboard/metrics?timeframe=${timeframe}`);

        if (!cancelled && response.data && response.data.success) {
          // Transform dashboard metrics into chart-compatible format
          // The dashboard returns session completion rate, satisfaction, etc.
          const d = response.data;
          const metrics: MetricDataPoint[] = [];

          // Build from workout completion trends if available
          const trends = d.workoutCompletionsTrend || d.newClientsTrend || [];
          if (trends.length > 0) {
            // Group by session type or create a summary row
            metrics.push({
              program: 'Sessions',
              performance: Math.round(d.sessionCompletion || 0),
              satisfaction: Math.round(d.clientSatisfaction ? d.clientSatisfaction * 20 : 0), // scale 5-star to %
              attendance: Math.round(d.sessionCompletion || 0)
            });
          }

          // If we have enough data, add growth metric
          if (d.growthRate !== undefined) {
            metrics.push({
              program: 'Growth',
              performance: Math.max(0, Math.round(d.growthRate || 0)),
              satisfaction: Math.round(d.clientSatisfaction ? d.clientSatisfaction * 20 : 0),
              attendance: Math.round(d.sessionCompletion || 0)
            });
          }

          setApiData(metrics);
        }
      } catch (err) {
        console.error('Error fetching fitness metrics:', err);
        // Graceful degradation — empty state
        if (!cancelled) setApiData([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    setFetching(true);
    fetchMetrics();
    return () => { cancelled = true; };
  }, [authAxios, data, timeRange]);

  const chartData = useMemo(() => data || apiData, [data, apiData]);
  const showLoading = isLoading || fetching;

  const getDataKeys = () => {
    switch (metricTab) {
      case 1: return [{ key: 'performance', color: '#1976d2' }];
      case 2: return [{ key: 'satisfaction', color: '#2e7d32' }];
      case 3: return [{ key: 'attendance', color: '#ed6c02' }];
      default: return [
        { key: 'performance', color: '#1976d2' },
        { key: 'satisfaction', color: '#2e7d32' },
        { key: 'attendance', color: '#ed6c02' }
      ];
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipBox>
          <TooltipTitle>{label}</TooltipTitle>
          {payload.map((entry: any, index: number) => (
            <TooltipEntry key={index} style={{ color: entry.color }}>
              <TooltipDot $color={entry.color} />
              {entry.name}: {entry.value}%
            </TooltipEntry>
          ))}
        </TooltipBox>
      );
    }
    return null;
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <CardContainer>
      <CardBody>
        {showLoading ? (
          <div>
            <SkeletonBlock $width="70%" $height="40px" />
            <SkeletonBlock $width="40%" $height="25px" $mt={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <SkeletonBlock $width="120px" $height="35px" />
              <SkeletonBlock $width="200px" $height="35px" />
            </div>
            <SkeletonBlock $height="320px" $mt={24} />
          </div>
        ) : chartData.length === 0 ? (
          <>
            <HeaderRow>
              <div>
                <Title>Fitness Metrics</Title>
                <Subtitle>Program effectiveness metrics</Subtitle>
              </div>
            </HeaderRow>
            <EmptyStateContainer>
              <BarChart2 size={48} style={{ opacity: 0.4 }} />
              <h5>No metrics data yet</h5>
              <p>Fitness metrics will appear as sessions are completed and rated.</p>
            </EmptyStateContainer>
          </>
        ) : (
          <>
            <HeaderRow>
              <div>
                <Title>Fitness Metrics</Title>
                <Subtitle>Program effectiveness metrics</Subtitle>
              </div>
              <ToggleGroup>
                {['week', 'month', 'year'].map(range => (
                  <ToggleBtn
                    key={range}
                    $active={timeRange === range}
                    onClick={() => setTimeRange(range)}
                  >
                    {capitalize(range)}
                  </ToggleBtn>
                ))}
              </ToggleGroup>
            </HeaderRow>

            <TabBar>
              {['All Metrics', 'Performance', 'Satisfaction', 'Attendance'].map((label, i) => (
                <TabButton key={i} $active={metricTab === i} onClick={() => setMetricTab(i)}>
                  {label}
                </TabButton>
              ))}
            </TabBar>

            <ChartContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="program"
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                  {getDataKeys().map(item => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={capitalize(item.key)}
                      fill={item.color}
                      barSize={30}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        )}
      </CardBody>
    </CardContainer>
  );
};

export default FitnessMetricsChart;
