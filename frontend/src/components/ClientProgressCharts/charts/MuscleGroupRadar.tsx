/**
 * MuscleGroupRadar.tsx
 * =====================
 *
 * RadarChart for muscle group volume distribution
 * Current period in Ice Wing, previous period overlay in Wing Purple
 *
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { MuscleGroupRadarProps } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 350px;

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const TooltipContainer = styled.div`
  background: rgba(0, 32, 96, 0.95);
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #E0ECF4;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
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

// ==================== INTERFACES ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ==================== COMPONENTS ====================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <TooltipContainer>
      <div style={{ color: '#60C0F0', fontWeight: 600, marginBottom: '0.25rem' }}>
        {label}
      </div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toLocaleString()} lbs
        </div>
      ))}
    </TooltipContainer>
  );
};

// ==================== MAIN COMPONENT ====================

const MuscleGroupRadar: React.FC<MuscleGroupRadarProps> = ({ data }) => {
  const hasPrevious = data?.some(d => d.previousVolume !== undefined);

  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Muscle Group Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log workouts to see your muscle group volume distribution!
            </p>
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
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="rgba(96, 192, 240, 0.1)"
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="muscleGroup"
              tick={{
                fill: '#E0ECF4',
                fontSize: 12,
                fontFamily: "'Fira Code', monospace"
              }}
            />
            <PolarRadiusAxis
              tick={{
                fill: '#b8c9db',
                fontSize: 10,
                fontFamily: "'Fira Code', monospace"
              }}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasPrevious && (
              <Radar
                name="Previous Period"
                dataKey="previousVolume"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="#8B5CF6"
                fillOpacity={0.2}
              />
            )}
            <Radar
              name="Current Period"
              dataKey="volume"
              stroke="#60C0F0"
              strokeWidth={2}
              fill="#60C0F0"
              fillOpacity={0.3}
            />
            <Legend
              wrapperStyle={{
                color: '#b8c9db',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.8rem'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default MuscleGroupRadar;
