/**
 * AdminOverviewMetrics — Enhanced KPI metric cards
 * Uses AnimatedCounter for values + Victory sparkline for trend data.
 * Theme: Crystalline Swan
 */

import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { VictoryLine, VictoryGroup } from 'victory';
import { AdminDashboardMetric } from './AdminOverview.types';
import { MetricCommandCard, MetricGrid, ChartContainer } from './AdminOverview.styles';
import AnimatedCounter from '../../../../ui/animations/AnimatedCounter';

interface AdminOverviewMetricsProps {
  metrics: AdminDashboardMetric[];
}

const CHANGE_COLORS = {
  increase: 'var(--accent-primary, #60C0F0)',
  decrease: 'var(--error, #EF4444)',
  neutral: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
};

const getChangeColor = (type: string) => (
  type === 'increase' ? CHANGE_COLORS.increase :
  type === 'decrease' ? CHANGE_COLORS.decrease :
  CHANGE_COLORS.neutral
);

const metricAccentWash = (color: string) => `color-mix(in srgb, ${color} 20%, transparent)`;

const AdminOverviewMetrics: React.FC<AdminOverviewMetricsProps> = ({ metrics }) => {
  const renderSparkline = (trend: number[], color: string) => {
    if (!trend || trend.length < 2) return null;
    const data = trend.map((y, i) => ({
      x: i,
      y: Number.isFinite(Number(y)) ? Number(y) : 0,
    }));
    // Skip rendering if all values are 0 (no real data)
    if (data.every(d => d.y === 0)) return null;
    return (
      <SparklineWrap>
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <VictoryGroup standalone={false} width={100} height={32} padding={0}>
            <VictoryLine
              data={data}
              interpolation="linear"
              style={{ data: { stroke: color, strokeWidth: 2 } }}
            />
          </VictoryGroup>
        </svg>
      </SparklineWrap>
    );
  };

  const formatValue = (metric: AdminDashboardMetric) => {
    const val = Number(metric.value);
    if (isNaN(val)) return <ValueText style={{ color: metric.color }}>{metric.value}</ValueText>;

    return (
      <AnimatedCounter
        target={val}
        prefix={metric.format === 'currency' ? '$' : ''}
        suffix={metric.format === 'percentage' ? '%' : ''}
        duration={1800}
      />
    );
  };

  const renderMetricCard = (metric: AdminDashboardMetric) => (
    <MetricCommandCard key={metric.id} accentColor={metric.color} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <CardInner>
        <TopRow>
          <div style={{ flex: 1 }}>
            <Label>{metric.title}</Label>
            <ValueRow style={{ color: metric.color }}>
              {formatValue(metric)}
            </ValueRow>
            {metric.format !== 'text' && (
              <ChangeRow>
                {metric.changeType === 'increase' ? (
                  <TrendingUp size={14} color={CHANGE_COLORS.increase} />
                ) : metric.changeType === 'decrease' ? (
                  <TrendingDown size={14} color={CHANGE_COLORS.decrease} />
                ) : (
                  <Activity size={14} color={CHANGE_COLORS.neutral} />
                )}
                <ChangeText $type={metric.changeType}>
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </ChangeText>
              </ChangeRow>
            )}
          </div>
          <IconCol>
            <IconBubble style={{ background: metricAccentWash(metric.color), color: metric.color }}>
              {metric.icon}
            </IconBubble>
            {metric.target && (
              <TargetText>
                Target: {metric.target}{metric.format === 'percentage' ? '%' : ''}
              </TargetText>
            )}
          </IconCol>
        </TopRow>

        <Divider />
        <Description>{metric.description}</Description>

        {metric.target && (
          <ProgressWrap>
            <ProgressMeta>
              <span>Progress</span>
              <span>{((Number(metric.value) / metric.target) * 100).toFixed(1)}%</span>
            </ProgressMeta>
            <ProgressTrack>
              <ProgressFill
                style={{
                  width: `${Math.min((Number(metric.value) / metric.target) * 100, 100)}%`,
                  background: metric.color,
                }}
              />
            </ProgressTrack>
          </ProgressWrap>
        )}

        {metric.trend?.length >= 2 ? (
          renderSparkline(metric.trend, metric.color)
        ) : (
          <ChartContainer>Awaiting trend data</ChartContainer>
        )}
      </CardInner>
    </MetricCommandCard>
  );

  return <MetricGrid>{metrics.map(renderMetricCard)}</MetricGrid>;
};

export default AdminOverviewMetrics;

/* ── Inline styled helpers (kept minimal to stay under 300 lines) ── */

import styled from 'styled-components';

const CardInner = styled.div`padding: 1.5rem;`;

const TopRow = styled.div`
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 1rem;
`;

/* Kirin hero label — Sora 13px uppercase, Frost White 60% */
const Label = styled.div`
  color: rgba(224, 236, 244, 0.6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.75rem;
`;

/* Kirin hero metric — Cormorant Garamond Italic 48px editorial serif */
const ValueRow = styled.div`
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-style: italic;
  font-size: 3rem;
  font-weight: 600;
  line-height: 1.05;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    font-size: 2.25rem;
  }
`;

const ValueText = styled.span`
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-style: italic;
  font-size: 3rem;
  font-weight: 600;
  line-height: 1.05;

  @media (max-width: 768px) {
    font-size: 2.25rem;
  }
`;

const ChangeRow = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
`;

/* Fira Code for data readouts; Swan tokens for semantics */
const ChangeText = styled.span<{ $type: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${p => getChangeColor(p.$type)};
`;

const IconCol = styled.div`
  display: flex; flex-direction: column; align-items: center;
`;

const IconBubble = styled.div`
  padding: 0.75rem; border-radius: 12px; margin-bottom: 0.5rem;
`;

const TargetText = styled.div`
  font-size: 0.75rem; color: var(--text-muted, rgba(224,236,244,0.5));
  text-align: center;
`;

const Divider = styled.div`
  height: 1px; margin: 1rem 0;
  background: var(--border-subtle, rgba(255,255,255,0.08));
`;

const Description = styled.div`
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 0.875rem; margin-bottom: 1rem;
`;

const ProgressWrap = styled.div`margin-bottom: 1rem;`;

const ProgressMeta = styled.div`
  display: flex; justify-content: space-between; margin-bottom: 0.5rem;
  font-size: 0.75rem; color: var(--text-muted, rgba(224,236,244,0.5));
`;

const ProgressTrack = styled.div`
  height: 6px; border-radius: 3px; overflow: hidden;
  background: var(--border-subtle, rgba(255,255,255,0.08));
`;

const ProgressFill = styled.div`
  height: 100%; border-radius: 3px; transition: width 0.8s ease;
`;

const SparklineWrap = styled.div`
  width: 100%; height: 48px; margin-top: 0.75rem;
  @media (prefers-reduced-motion: reduce) {
    svg * { animation: none !important; transition: none !important; }
  }
`;
