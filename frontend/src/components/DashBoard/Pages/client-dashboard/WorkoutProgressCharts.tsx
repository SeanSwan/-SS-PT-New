import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  VictoryChart,
  VictoryArea,
  VictoryPie,
  VictoryTooltip,
  VictoryPolarAxis,
} from 'victory';
import apiService from '../../../../services/api.service';
import { useAuth } from '../../../../context/AuthContext';

const ChartsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
`;

const ChartCard = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 2rem;
  color: white;
`;

const ChartTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #60C0F0;
`;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface TreemapNode {
  name: string;
  size: number;
  fill: string;
}

// Treemap replaced with VictoryPie for body composition proportions

const BodyCompositionTreemap: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<TreemapNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const measurement = await apiService.get(`/api/measurements/${userId}/latest`);
        const { weight, bodyFatPercentage, muscleMassPercentage, boneMass } = measurement.data;

        if (!weight) {
          setData([]);
          return;
        }

        const fatMass = (weight * (bodyFatPercentage || 0)) / 100;
        const muscleMass = (weight * (muscleMassPercentage || 0)) / 100;
        const bone = boneMass || 0;
        const other = Math.max(0, weight - fatMass - muscleMass - bone);

        const treemapData: TreemapNode[] = [
          { name: 'Muscle Mass', size: parseFloat(muscleMass.toFixed(1)), fill: '#10b981' },
          { name: 'Fat Mass', size: parseFloat(fatMass.toFixed(1)), fill: '#ef4444' },
          { name: 'Bone Mass', size: parseFloat(bone.toFixed(1)), fill: '#9ca3af' },
          { name: 'Other', size: parseFloat(other.toFixed(1)), fill: '#6b7280' },
        ].filter(item => item.size > 0);

        setData(treemapData);
      } catch (error) {
        console.error("Failed to fetch body composition data", error);
      }
    };
    fetchData();
  }, [userId]);

  if (data.length === 0) return null;

  return (
    <ChartCard variants={itemVariants}>
      <ChartTitle>Body Composition</ChartTitle>
      <VictoryPie
        data={data}
        x="name"
        y="size"
        innerRadius={50}
        padAngle={3}
        colorScale={['#4ECDC4', '#8B5CF6', '#4070C0', '#50A0F0']}
        animate={{ duration: 800, easing: 'cubicInOut' }}
        height={300}
        labels={({ datum }) => `${datum.name}\n${datum.size} lbs`}
        labelComponent={
          <VictoryTooltip
            flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
            style={{ fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 }}
            cornerRadius={8}
          />
        }
        style={{
          labels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Sora', sans-serif" },
        }}
      />
    </ChartCard>
  );
};

const StrengthProfileRadarChart: React.FC<{ userId: string }> = ({ userId: _userId }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Client-safe namespace: userId derived from JWT, never from URL.
        // Response shape: { success, data: { radarData: [...] } }
        const response = await apiService.get(`/api/client/analytics/strength-profile`);
        const radarData = response.data?.data?.radarData;
        setData(Array.isArray(radarData) ? radarData : []);
      } catch (error) {
        console.error("Failed to fetch strength profile data", error);
        setData([]);
      }
    };
    fetchData();
  }, []);

  if (data.length === 0) return null;

  return (
    <ChartCard variants={itemVariants}>
      <ChartTitle>Strength Profile</ChartTitle>
      <VictoryChart
        polar
        height={300}
        animate={{ duration: 800, easing: 'cubicInOut' }}
      >
        <VictoryPolarAxis
          tickValues={data.map((_: any, i: number) => i)}
          tickFormat={data.map((d: any) => d.subject)}
          style={{
            axis: { stroke: 'rgba(255,255,255,0.2)' },
            tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Sora', sans-serif" },
            grid: { stroke: 'rgba(255,255,255,0.2)' },
          }}
        />
        <VictoryPolarAxis
          dependentAxis
          domain={[0, 100]}
          style={{
            axis: { stroke: 'none' },
            tickLabels: { fill: 'transparent' },
            grid: { stroke: 'rgba(255,255,255,0.1)' },
          }}
        />
        <VictoryArea
          data={data.map((d: any, i: number) => ({ x: i, y: d.value }))}
          style={{
            data: {
              fill: 'rgba(80, 160, 240, 0.3)',
              stroke: '#50A0F0',
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartCard>
  );
};

const WorkoutProgressCharts: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view your progress charts.</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {},
      }}
    >
      <ChartTitle style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>
        Your Analytics Dashboard
      </ChartTitle>
      <ChartsGrid>
        {/* Existing charts would go here */}
        
        {/* New Charts */}
        <BodyCompositionTreemap userId={user.id} />
        <StrengthProfileRadarChart userId={user.id} />

      </ChartsGrid>
    </motion.div>
  );
};

export default WorkoutProgressCharts;