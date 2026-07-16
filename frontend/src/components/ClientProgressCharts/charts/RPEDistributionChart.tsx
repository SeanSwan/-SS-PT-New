/**
 * ============================================================================
 * FILE: RPEDistributionChart.tsx
 * PURPOSE: Donut chart showing RPE zone distribution across workouts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows how effort is distributed — are they coasting,
 * grinding, or hitting a healthy mix? Trainers use this to adjust programming.
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → RPEDistributionChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { VictoryPie, VictoryTooltip, VictoryLabel } from 'victory';
import { RPEDistributionChartProps } from '../types/ClientProgressTypes';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 768px) { height: 250px; }
`;

const NoData = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 300px; color: #b8c9db; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const RPE_COLORS: Record<string, string> = {
  'Easy (1-3)': '#50A0F0',
  'Moderate (4-6)': '#60C0F0',
  'Hard (7-8)': '#8B5CF6',
  'Max Effort (9-10)': '#C6A84B',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const RPEDistributionChart: React.FC<RPEDistributionChartProps> = ({
  data, animate = true, className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter(d => d.count > 0).map(d => ({
      x: d.zone,
      y: d.count,
      label: `${d.zone}\n${d.percentage.toFixed(0)}% (${d.count})`,
      color: d.color || RPE_COLORS[d.zone] || '#60C0F0',
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return <NoData>Log workouts with RPE ratings to see effort distribution</NoData>;
  }

  return (
    <motion.div className={className}
      initial={animate ? { opacity: 0, scale: 0.9 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <ChartContainer>
        <svg viewBox="0 0 400 300" width="100%" height="100%">
          <VictoryPie
            standalone={false}
            data={chartData}
            innerRadius={70}
            radius={120}
            width={400}
            height={300}
            padAngle={2}
            animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
            colorScale={chartData.map(d => d.color)}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)', strokeWidth: 1 }}
                {...victoryStyleProps({ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" })}
                cornerRadius={8}
                flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
              />
            }
            {...victoryStyleProps({
              data: {
                stroke: '#0A0A0F',
                strokeWidth: 2,
              },
            })}
          />
          <VictoryLabel
            textAnchor="middle"
            verticalAnchor="middle"
            x={200}
            y={150}
            {...victoryStyleProps({ fill: '#E0ECF4', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 })}
            text="RPE"
          />
        </svg>
      </ChartContainer>
    </motion.div>
  );
};

export default RPEDistributionChart;
