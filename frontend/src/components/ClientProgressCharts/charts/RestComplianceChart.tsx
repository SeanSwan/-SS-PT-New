/**
 * ============================================================================
 * FILE: RestComplianceChart.tsx
 * PURPOSE: Grouped bar chart comparing prescribed vs actual rest periods
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: NASM OPT phases prescribe specific rest periods.
 * This chart shows whether clients are resting too long (wasting time)
 * or cutting rest short (compromising recovery). Critical for Phase 4/5.
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → RestComplianceChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart, VictoryBar, VictoryAxis, VictoryGroup,
  VictoryTooltip, VictoryLegend,
} from 'victory';
import { RestComplianceChartProps } from '../types/ClientProgressTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;
  @media (max-width: 768px) { height: 250px; }
`;

const NoData = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 300px; color: #b8c9db; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
`;

const AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const RestComplianceChart: React.FC<RestComplianceChartProps> = ({
  data, animate = true, className,
}) => {
  const { prescribedData, actualData, categories } = useMemo(() => {
    if (!data || data.length === 0) return { prescribedData: [], actualData: [], categories: [] };
    const cats = data.map(d => d.phase);
    return {
      prescribedData: data.map((d, i) => ({ x: i + 1, y: d.prescribed })),
      actualData: data.map((d, i) => ({ x: i + 1, y: d.actual })),
      categories: cats,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return <NoData>Log rest periods to see compliance vs NASM guidelines</NoData>;
  }

  return (
    <motion.div className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 50, right: 30, left: 60, bottom: 50 }}
          domainPadding={{ x: 40 }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
        >
          <VictoryLegend
            x={80} y={10}
            orientation="horizontal"
            gutter={20}
            style={{ labels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" } }}
            data={[
              { name: 'Prescribed', symbol: { fill: '#60C0F0' } },
              { name: 'Actual', symbol: { fill: '#8B5CF6' } },
            ]}
          />

          <VictoryAxis style={AXIS_STYLE}
            tickValues={data.map((_, i) => i + 1)}
            tickFormat={categories}
          />
          <VictoryAxis dependentAxis style={{
            ...AXIS_STYLE,
            axisLabel: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 40 },
          }} label="Rest (seconds)" />

          <VictoryGroup offset={20}>
            <VictoryBar data={prescribedData}
              style={{ data: { fill: '#60C0F0', width: 18, opacity: 0.8 } }}
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(96, 192, 240, 0.3)' }}
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  cornerRadius={8}
                />
              }
              labels={({ datum }) => `Prescribed: ${datum.y}s`}
            />
            <VictoryBar data={actualData}
              style={{ data: { fill: '#8B5CF6', width: 18, opacity: 0.8 } }}
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  cornerRadius={8}
                />
              }
              labels={({ datum }) => `Actual: ${datum.y}s`}
            />
          </VictoryGroup>
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default RestComplianceChart;
