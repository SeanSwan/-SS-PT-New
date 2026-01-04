import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
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
  color: #00ffff;
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

const CustomizedTreemapContent = ({ root, depth, x, y, width, height, index, colors, name, value }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: '#1e293b',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 25} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={12}>
        {value} lbs
      </text>
    </g>
  );
};

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
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={data}
          dataKey="size"
          ratio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedTreemapContent colors={['#10b981', '#ef4444', '#9ca3af', '#6b7280']} />}
        />
      </ResponsiveContainer>
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
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ffff" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'white', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Strength Profile" dataKey="value" stroke="#00ffff" fill="url(#radarGradient)" fillOpacity={0.6} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #00ffff',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'white' }}
          />
        </RadarChart>
      </ResponsiveContainer>
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