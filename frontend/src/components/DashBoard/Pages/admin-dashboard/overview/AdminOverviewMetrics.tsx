/**
 * AdminOverviewMetrics - Enhanced KPI metric cards
 * Uses AnimatedCounter for values + Victory sparkline for trend data.
 * Theme: Crystalline Swan
 */

import React, { type CSSProperties } from 'react';
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
  neutral: 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 40%, transparent))',
};

const METRIC_ACCENT_TOKENS: Record<string, string> = {
  'total-revenue': 'var(--accent-gold, #C6A84B)',
  'active-users': 'var(--accent-primary, #60C0F0)',
  'completion-rate': 'var(--accent-secondary, #8B5CF6)',
  'system-health': 'var(--surface-accent, var(--accent-secondary, #8B5CF6))',
};

const DEFAULT_METRIC_ACCENT = 'var(--accent-primary, #60C0F0)';

type MetricCardStyle = CSSProperties & { '--admin-metric-accent': string };

const getMetricAccent = (metric: AdminDashboardMetric): string => (
  METRIC_ACCENT_TOKENS[metric.id] ?? DEFAULT_METRIC_ACCENT
);

const metricCardStyle = (accent: string): MetricCardStyle => ({
  '--admin-metric-accent': accent,
});

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
        <StyledBox as="svg" viewBox="0 0 100 32" preserveAspectRatio="none" $style={{ width: '100%', height: '100%' }}>
          <VictoryGroup standalone={false} width={100} height={32} padding={0}>
            <VictoryLine
              data={data}
              interpolation="linear"
              {...victoryStyleProps({ data: { stroke: color, strokeWidth: 2 } })}
            />
          </VictoryGroup>
        </StyledBox>
      </SparklineWrap>
    );
  };

  const formatValue = (metric: AdminDashboardMetric, accent: string) => {
    const val = Number(metric.value);
    if (isNaN(val)) return <StyledBox as={ValueText} $style={{ color: accent }}>{metric.value}</StyledBox>;

    return (
      <AnimatedCounter
        target={val}
        prefix={metric.format === 'currency' ? '$' : ''}
        suffix={metric.format === 'percentage' ? '%' : ''}
        duration={1800}
      />
    );
  };

  const renderMetricCard = (metric: AdminDashboardMetric) => {
    const accent = getMetricAccent(metric);

    return (
      <StyledBox as={MetricCommandCard} key={metric.id} $style={metricCardStyle(accent)} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <CardInner>
          <TopRow>
            <StyledBox as="div" $style={{ flex: 1 }}>
              <Label>{metric.title}</Label>
              <StyledBox as={ValueRow} $style={{ color: accent }}>
                {formatValue(metric, accent)}
              </StyledBox>
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
            </StyledBox>
            <IconCol>
              <StyledBox as={IconBubble} $style={{ background: metricAccentWash(accent), color: accent }}>
                {metric.icon}
              </StyledBox>
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
                <StyledBox as={ProgressFill}
                  $style={{
                    width: `${Math.min((Number(metric.value) / metric.target) * 100, 100)}%`,
                    background: accent,
                  }}
                />
              </ProgressTrack>
            </ProgressWrap>
          )}

          {metric.trend?.length >= 2 ? (
            renderSparkline(metric.trend, accent)
          ) : (
            <ChartContainer>Awaiting trend data</ChartContainer>
          )}
        </CardInner>
      </StyledBox>
    );
  };
  return <MetricGrid>{metrics.map(renderMetricCard)}</MetricGrid>;
};

export default AdminOverviewMetrics;

/* Inline styled helpers (kept minimal to stay under 300 lines) */

import styled from 'styled-components';
import { StyledBox } from '@/components/ui/StyledBox';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

const CardInner = styled.div`padding: 1.5rem;`;

const TopRow = styled.div`
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 1rem;
`;

/* Kirin hero label - Sora 13px uppercase, Frost White 60% */
const Label = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.75rem;
`;

/* Kirin hero metric - Cormorant Garamond Italic 48px editorial serif */
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
  font-size: 0.75rem; color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent));
  text-align: center;
`;

const Divider = styled.div`
  height: 1px; margin: 1rem 0;
  background: var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent));
`;

const Description = styled.div`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-size: 0.875rem; margin-bottom: 1rem;
`;

const ProgressWrap = styled.div`margin-bottom: 1rem;`;

const ProgressMeta = styled.div`
  display: flex; justify-content: space-between; margin-bottom: 0.5rem;
  font-size: 0.75rem; color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent));
`;

const ProgressTrack = styled.div`
  height: 6px; border-radius: 3px; overflow: hidden;
  background: var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent));
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
