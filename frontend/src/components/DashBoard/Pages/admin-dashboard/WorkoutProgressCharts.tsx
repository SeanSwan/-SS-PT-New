import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  VictoryChart,
  VictoryArea,
  VictoryBar,
  VictoryAxis,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryPolarAxis,
} from 'victory';
import apiService from '../../../../services/api.service';

const ChartsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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
  [key: string]: any;
}

interface VolumeDataPoint {
  date: string;
  volume: number;
  label: string;
}

interface SessionUsageData {
  type: string;
  count: number;
  fill: string;
}

// Treemap replaced with VictoryPie for body composition proportions

const BodyCompositionTreemap: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<TreemapNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get(`/api/measurements/user/${userId}/latest`);
        const measurement = response.data;
        const { weight, bodyFatPercentage, muscleMassPercentage, boneMass } = measurement;

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

const StrengthProfileRadarChart: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get(`/api/analytics/${userId}/strength-profile`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch strength profile data", error);
      }
    };
    fetchData();
  }, [userId]);

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

const VolumeProgressionChart: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<VolumeDataPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get(`/api/analytics/${userId}/volume-progression`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch volume progression data", error);
      }
    };
    fetchData();
  }, [userId]);

  if (data.length === 0) return null;

  return (
    <ChartCard variants={itemVariants}>
      <ChartTitle>Volume Progression</ChartTitle>
      <VictoryChart
        height={300}
        padding={{ top: 20, bottom: 50, left: 60, right: 30 }}
        animate={{ duration: 800, easing: 'cubicInOut' }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) => `${datum.date}\nVolume: ${datum.volume}`}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                style={{ fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 }}
                cornerRadius={8}
              />
            }
          />
        }
      >
        <VictoryAxis
          style={{
            axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
            tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace" },
            grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
            tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace" },
            grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
          }}
        />
        <VictoryArea
          data={data}
          x="date"
          y="volume"
          style={{
            data: {
              fill: 'rgba(80, 160, 240, 0.2)',
              stroke: '#50A0F0',
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartCard>
  );
};

const SessionUsageChart: React.FC<{ userId: string }> = ({ userId }) => {
  const [data, setData] = useState<SessionUsageData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get(`/api/analytics/${userId}/session-usage`);
        const sessionData = response.data;

        // NOTE: Only showing workout types, NOT session credit deductions
        // Solo = Client self-logged workouts (NO session credits used)
        // Trainer-Led = Workouts completed with trainer (session credits deducted)
        setData([
          { type: 'Solo Workouts', count: sessionData.solo?.count || 0, fill: '#10b981' },
          { type: 'Trainer Sessions', count: sessionData.trainerLed?.count || 0, fill: '#f59e0b' }
        ]);
      } catch (error) {
        console.error("Failed to fetch session usage data", error);
      }
    };
    fetchData();
  }, [userId]);

  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ChartCard variants={itemVariants}>
      <ChartTitle>Workout Type Distribution</ChartTitle>
      <VictoryChart
        height={300}
        domainPadding={{ x: 60 }}
        padding={{ top: 20, bottom: 50, left: 60, right: 30 }}
        animate={{ duration: 800, easing: 'cubicInOut' }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
            tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace" },
            grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
          }}
        />
        <VictoryAxis
          dependentAxis
          label="Workouts"
          style={{
            axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
            tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace" },
            grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
            axisLabel: { fill: 'rgba(255,255,255,0.7)', fontSize: 12, padding: 40 },
          }}
        />
        <VictoryBar
          data={data}
          x="type"
          y="count"
          cornerRadius={{ topLeft: 8, topRight: 8 }}
          labels={({ datum }) => {
            const pct = total > 0 ? ((datum.count / total) * 100).toFixed(1) : 0;
            return `${datum.count} (${pct}%)`;
          }}
          labelComponent={
            <VictoryTooltip
              flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
              style={{ fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 }}
              cornerRadius={8}
            />
          }
          style={{
            data: {
              fill: ({ datum }) => datum.fill || '#50A0F0',
              width: 40,
            },
          }}
        />
      </VictoryChart>
    </ChartCard>
  );
};

interface WorkoutProgressChartsProps {
  userId: string;
  title?: string;
}

const WorkoutProgressCharts: React.FC<WorkoutProgressChartsProps> = ({
  userId,
  title = "Client Analytics Dashboard"
}) => {
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
        {title}
      </ChartTitle>
      <ChartsGrid>
        <BodyCompositionTreemap userId={userId} />
        <StrengthProfileRadarChart userId={userId} />
        <VolumeProgressionChart userId={userId} />
        <SessionUsageChart userId={userId} />
      </ChartsGrid>
    </motion.div>
  );
};

export default WorkoutProgressCharts;
