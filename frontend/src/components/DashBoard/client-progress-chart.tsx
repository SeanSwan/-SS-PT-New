import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryLegend, VictoryScatter } from 'victory';
import { useAuth } from '../../context/AuthContext';
import { BarChart2 } from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const ChartCard = styled.div`
  border-radius: 12px;
  height: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: var(--bg-surface, rgba(30, 30, 60, 0.3));
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardContent = styled.div`
  padding: 24px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $mt?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  margin-top: ${props => props.$mt || '0'};
  border-radius: 4px;
`;

const TooltipBox = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 40, 0.95));
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
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

interface ProgressDataPoint {
  month: string;
  strength: number;
  cardio: number;
  flexibility: number;
}

interface ClientProgressChartProps {
  isLoading?: boolean;
  /** Pass data directly to skip internal fetch */
  data?: ProgressDataPoint[];
}

/**
 * Client Progress Chart Component
 *
 * Displays a line chart visualizing client fitness progress over time.
 * Fetches real session analytics from API. Shows empty state when no data exists.
 */
const ClientProgressChart: React.FC<ClientProgressChartProps> = ({ isLoading = false, data }) => {
  const { authAxios } = useAuth();
  const [apiData, setApiData] = useState<ProgressDataPoint[]>([]);
  const [fetching, setFetching] = useState(!data);

  // Fetch real session analytics if no data prop provided
  useEffect(() => {
    if (data) return; // Skip fetch when data is passed as prop
    let cancelled = false;

    const fetchProgress = async () => {
      try {
        const response = await authAxios.get('/api/sessions/analytics');
        if (!cancelled && response.data) {
          // Transform weekly progress into chart-compatible format
          const weekly = response.data.weeklyProgress || [];
          if (weekly.length > 0) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mapped: ProgressDataPoint[] = weekly.slice(-6).map((w: any, i: number) => {
              const date = w.date ? new Date(w.date) : new Date();
              return {
                month: months[date.getMonth()] || `W${i + 1}`,
                strength: w.strength ?? w.count ?? 0,
                cardio: w.cardio ?? 0,
                flexibility: w.flexibility ?? 0
              };
            });
            setApiData(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching client progress chart data:', err);
        // Graceful degradation — empty array shows empty state
        setApiData([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchProgress();
    return () => { cancelled = true; };
  }, [authAxios, data]);

  const progressData = useMemo(() => data || apiData, [data, apiData]);
  const showLoading = isLoading || fetching;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipBox>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: 'white' }}>
            {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div
              key={`item-${index}`}
              style={{
                color: entry.color,
                display: 'flex',
                alignItems: 'center',
                marginTop: 4,
                fontSize: '0.875rem'
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  marginRight: 8,
                  display: 'inline-block'
                }}
              />
              {entry.name}: {entry.value}%
            </div>
          ))}
        </TooltipBox>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <CardContent>
        {showLoading ? (
          <div>
            <SkeletonBlock $width="70%" $height="40px" />
            <SkeletonBlock $width="40%" $height="25px" $mt="8px" />
            <SkeletonBlock $height="220px" $mt="24px" />
          </div>
        ) : progressData.length === 0 ? (
          <>
            <h5 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-heading, white)' }}>
              Client Progress
            </h5>
            <EmptyStateContainer>
              <BarChart2 size={48} style={{ opacity: 0.4 }} />
              <h5>No progress data yet</h5>
              <p>Progress charts will appear as clients complete workouts.</p>
            </EmptyStateContainer>
          </>
        ) : (
          <>
            <h5 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-heading, white)' }}>
              Client Progress
            </h5>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, rgba(255, 255, 255, 0.6))', marginBottom: 16 }}>
              Recent fitness metrics
            </p>

            <div style={{ height: 300, marginTop: 16 }}>
              <VictoryChart
                padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
                animate={{ duration: 800, easing: 'cubicInOut' }}
                containerComponent={
                  <VictoryVoronoiContainer
                    labels={({ datum }) => {
                      const key = datum.childName?.replace('line-', '') || '';
                      return `${datum.month}: ${datum.y}%`;
                    }}
                    labelComponent={
                      <VictoryTooltip
                        style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                        flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                      />
                    }
                  />
                }
              >
                <VictoryAxis
                  style={{
                    axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
                    tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
                    grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t: number) => `${t}%`}
                  style={{
                    axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
                    tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
                    grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
                  }}
                />
                <VictoryLegend
                  x={60} y={0}
                  orientation="horizontal"
                  gutter={20}
                  style={{ labels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Sora', sans-serif" } }}
                  data={[
                    { name: 'Strength', symbol: { fill: '#50A0F0' } },
                    { name: 'Cardio', symbol: { fill: '#4ECDC4' } },
                    { name: 'Flexibility', symbol: { fill: '#8B5CF6' } },
                  ]}
                />
                <VictoryLine data={progressData} x="month" y="strength" style={{ data: { stroke: '#50A0F0', strokeWidth: 2 } }} />
                <VictoryLine data={progressData} x="month" y="cardio" style={{ data: { stroke: '#4ECDC4', strokeWidth: 2 } }} />
                <VictoryLine data={progressData} x="month" y="flexibility" style={{ data: { stroke: '#8B5CF6', strokeWidth: 2 } }} />
                <VictoryScatter data={progressData} x="month" y="strength" size={4} style={{ data: { fill: '#50A0F0' } }} />
                <VictoryScatter data={progressData} x="month" y="cardio" size={4} style={{ data: { fill: '#4ECDC4' } }} />
                <VictoryScatter data={progressData} x="month" y="flexibility" size={4} style={{ data: { fill: '#8B5CF6' } }} />
              </VictoryChart>
            </div>
          </>
        )}
      </CardContent>
    </ChartCard>
  );
};

export default ClientProgressChart;
