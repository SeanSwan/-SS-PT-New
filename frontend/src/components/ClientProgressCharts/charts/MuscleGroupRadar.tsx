/**
 * MuscleGroupRadar.tsx
 * =====================
 *
 * Polar radar chart for muscle group volume distribution
 * Current period in Ice Wing, previous period overlay in Wing Purple
 *
 * MIGRATED: Recharts RadarChart → Victory polar chart for cross-platform compatibility
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart,
  VictoryArea,
  VictoryPolarAxis,
  VictoryLegend,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { MuscleGroupRadarProps } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 350px;

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: #b8c9db;
  text-align: center;
`;

const NoDataTitle = styled.h4`
  margin: 0 0 0.5rem;
  color: var(--text-secondary, #b8c9db);
`;

const NoDataCopy = styled.p`
  margin: 0;
  font-size: 0.875rem;
`;

const TOOLTIP_PROPS = {
  flyoutStyle: {
    fill: '#141419',
    stroke: 'rgba(139, 92, 246, 0.3)',
    strokeWidth: 1,
  },
  style: {
    fill: '#E0ECF4',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
};

const ANGULAR_AXIS_PROPS = {
  style: {
    axis: { stroke: 'rgba(96, 192, 240, 0.1)' },
    tickLabels: {
      fill: '#E0ECF4',
      fontSize: 11,
      fontFamily: "'Fira Code', monospace",
      padding: 15,
    },
    grid: {
      stroke: 'rgba(96, 192, 240, 0.1)',
      strokeDasharray: '4,4',
    },
  },
};

const RADIAL_AXIS_PROPS = {
  style: {
    axis: { stroke: 'none' },
    tickLabels: {
      fill: '#b8c9db',
      fontSize: 9,
      fontFamily: "'Fira Code', monospace",
    },
    grid: {
      stroke: 'rgba(96, 192, 240, 0.08)',
      strokeDasharray: '4,4',
    },
  },
};

const PREVIOUS_AREA_PROPS = {
  style: {
    data: {
      fill: '#8B5CF6',
      fillOpacity: 0.15,
      stroke: '#8B5CF6',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    },
  },
};

const CURRENT_AREA_PROPS = {
  style: {
    data: {
      fill: '#60C0F0',
      fillOpacity: 0.25,
      stroke: '#60C0F0',
      strokeWidth: 2,
    },
  },
};

const LEGEND_PROPS = {
  style: {
    labels: {
      fill: '#E0ECF4',
      fontFamily: "'Sora', sans-serif",
      fontSize: 10,
    },
  },
};

type MuscleGroupDatum = {
  label: string;
  y?: number;
};

// ==================== MAIN COMPONENT ====================

const MuscleGroupRadar: React.FC<MuscleGroupRadarProps> = ({ data }) => {
  const hasPrevious = data?.some(d => d.previousVolume !== undefined);

  // Compute max value for the radial domain
  const maxVal = useMemo(() => {
    if (!data || data.length === 0) return 100;
    const allVals = data.flatMap(d => [d.volume, d.previousVolume ?? 0]);
    return Math.max(...allVals) * 1.1 || 100;
  }, [data]);

  // Map data into Victory polar format (index-based x for even angular spacing)
  const currentData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => ({
      x: i,
      y: d.volume,
      label: d.muscleGroup,
    }));
  }, [data]);

  const previousData = useMemo(() => {
    if (!data || !hasPrevious) return [];
    return data.map((d, i) => ({
      x: i,
      y: d.previousVolume ?? 0,
      label: d.muscleGroup,
    }));
  }, [data, hasPrevious]);

  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <NoDataTitle>No Muscle Group Data</NoDataTitle>
            <NoDataCopy>
              Log workouts to see your muscle group volume distribution!
            </NoDataCopy>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <VictoryChart
          polar
          padding={{ top: 60, right: 60, bottom: 60, left: 60 }}
          domain={{ y: [0, maxVal] }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => {
                const d = datum as MuscleGroupDatum;
                return `${d.label}: ${d.y?.toLocaleString()} lbs`;
              }}
              labelComponent={
                <VictoryTooltip
                  {...TOOLTIP_PROPS}
                  cornerRadius={8}
                  flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
                />
              }
            />
          }
        >
          {/* Angular axis (muscle group labels) */}
          <VictoryPolarAxis
            tickValues={data.map((_, i) => i)}
            tickFormat={data.map(d => d.muscleGroup)}
            {...ANGULAR_AXIS_PROPS}
          />

          {/* Radial axis (values) */}
          <VictoryPolarAxis
            dependentAxis
            {...RADIAL_AXIS_PROPS}
            tickCount={5}
          />

          {/* Previous period area (behind current) */}
          {hasPrevious && previousData.length > 0 && (
            <VictoryArea
              data={previousData}
              {...PREVIOUS_AREA_PROPS}
            />
          )}

          {/* Current period area */}
          <VictoryArea
            data={currentData}
            {...CURRENT_AREA_PROPS}
          />

          {/* Legend */}
          <VictoryLegend
            x={20}
            y={5}
            orientation="horizontal"
            gutter={16}
            {...LEGEND_PROPS}
            data={[
              { name: 'Current Period', symbol: { fill: '#60C0F0' } },
              ...(hasPrevious
                ? [{ name: 'Previous Period', symbol: { fill: '#8B5CF6' } }]
                : []),
            ]}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default MuscleGroupRadar;
