import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Activity, 
  Dumbbell, 
  BarChart as BarChartIcon,
  Calendar,
  Clock,
  Trophy,
  Zap,
  Heart
} from 'lucide-react';

// Import chart components
import ProgressAreaChart from './charts/ProgressAreaChart';
import RadarProgressChart from './charts/RadarProgressChart';
import BarProgressChart from './charts/BarProgressChart';

// Import MCP hooks
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const Card = styled.div`
  background: rgba(30, 30, 60, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.columns || 1}, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
`;

const StatIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${(props) => props.color ? `${props.color}22` : 'rgba(0, 255, 255, 0.15)'};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const StatChange = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isPositive'].includes(prop),
})<{ isPositive?: boolean }>`
  font-size: 0.8rem;
  color: ${(props) => props.isPositive ? '#4CAF50' : '#F44336'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<{ active?: boolean }>`
  background: ${(props) => props.active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(30, 30, 60, 0.5)'};
  border: 1px solid ${(props) => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.1)'};
  color: ${(props) => props.active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

/**
 * ProgressDashboard Component
 * 
 * A comprehensive dashboard for displaying fitness progress data
 * from the workout and gamification MCP servers.
 * 
 * This component visualizes the synchronized data from both workout and gamification
 * MCP servers, providing a unified view of the client's fitness journey including
 * physical progress metrics, NASM protocol progress, achievements, and rewards.
 * 
 * The data displayed here is synchronized with the admin dashboard to ensure
 * coaches and clients see the same information.
 * 
 * @component
 */
const ProgressDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const { progress, gamification, loading, error, refreshAll } = useClientDashboardMcp();
  
  useEffect(() => {
    // Refresh data whenever time range changes
    refreshAll();
  }, [timeRange, refreshAll]); // Removed progress and gamification dependencies
  
  // Separate useEffect for logging - doesn't trigger refreshes
  useEffect(() => {
    if (progress && gamification) {
      console.log('Data synchronized from both MCP servers:', {
        workout: progress.lastUpdated,
        gamification: gamification.profile ? 'Loaded' : 'Not loaded'
      });
    }
  }, [progress, gamification]);
  
  // If loading or error, show appropriate state
  if (loading) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Activity size={30} color="#FF6B6B" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>Error Loading Progress Data</h3>
          <p style={{ margin: '0 0 1.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            {error}
          </p>
          <Button onClick={refreshAll}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }
  
  // Mock data for charts - would be replaced with actual MCP data
  const mockProgressData = [
    { month: 'Jan', weight: 75.5, strength: 60, cardio: 55, flexibility: 50 },
    { month: 'Feb', weight: 74.2, strength: 65, cardio: 58, flexibility: 53 },
    { month: 'Mar', weight: 73.8, strength: 67, cardio: 63, flexibility: 55 },
    { month: 'Apr', weight: 72.5, strength: 70, cardio: 67, flexibility: 60 },
    { month: 'May', weight: 71.2, strength: 73, cardio: 70, flexibility: 65 },
    { month: 'Jun', weight: 70.5, strength: 75, cardio: 72, flexibility: 68 },
  ];
  
  const mockNasmData = [
    { category: 'Core', value: 75 },
    { category: 'Balance', value: 65 },
    { category: 'Stability', value: 70 },
    { category: 'Flexibility', value: 80 },
    { category: 'Calisthenics', value: 60 },
    { category: 'Isolation', value: 55 },
    { category: 'Stabilizers', value: 68 },
  ];
  
  const mockBodyPartData = [
    { part: 'Chest', progress: 75 },
    { part: 'Back', progress: 80 },
    { part: 'Arms', progress: 65 },
    { part: 'Shoulders', progress: 60 },
    { part: 'Core', progress: 85 },
    { part: 'Legs', progress: 70 },
  ];
  
  // Use real data if available, otherwise fall back to mock data
  const progressData = progress?.monthlyProgress || mockProgressData;
  const nasmData = progress?.nasmProtocolData ? progress.nasmProtocolData.map((item: any) => ({
    category: item.name,
    value: item.progress
  })) : mockNasmData;
  
  const bodyPartData = progress?.bodyParts || mockBodyPartData;
  
  // Statistics from MCP server data
  const stats = {
    workoutsCompleted: progress?.workoutsCompleted || 12,
    totalExercisesPerformed: progress?.totalExercisesPerformed || 156,
    streakDays: progress?.streakDays || 3,
    totalMinutes: progress?.totalMinutes || 420,
    level: progress?.overallLevel || 27,
    xp: progress?.experiencePoints || 1250,
    achievements: (progress?.achievements || []).length
  };
  
  return (
    <DashboardContainer>
      <ButtonContainer>
        <Button 
          active={timeRange === 'week'} 
          onClick={() => setTimeRange('week')}
        >
          Week
        </Button>
        <Button 
          active={timeRange === 'month'} 
          onClick={() => setTimeRange('month')}
        >
          Month
        </Button>
        <Button 
          active={timeRange === 'year'} 
          onClick={() => setTimeRange('year')}
        >
          Year
        </Button>
      </ButtonContainer>
      
      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Activity size={20} />
            Overall Progress
          </CardTitle>
        </CardHeader>
        
        <Grid columns={4}>
          <StatCard>
            <StatIcon color="#00ffff">
              <Zap size={24} color="#00ffff" />
            </StatIcon>
            <StatValue>Level {stats.level}</StatValue>
            <StatLabel>Overall Level</StatLabel>
            <StatChange isPositive={true}>↑ 2 levels this month</StatChange>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#7851a9">
              <Trophy size={24} color="#7851a9" />
            </StatIcon>
            <StatValue>{stats.xp} XP</StatValue>
            <StatLabel>Experience Points</StatLabel>
            <StatChange isPositive={true}>↑ 250 XP this week</StatChange>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#FF6B6B">
              <Dumbbell size={24} color="#FF6B6B" />
            </StatIcon>
            <StatValue>{stats.workoutsCompleted}</StatValue>
            <StatLabel>Workouts Completed</StatLabel>
            <StatChange isPositive={true}>↑ 3 this month</StatChange>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#4CAF50">
              <Heart size={24} color="#4CAF50" />
            </StatIcon>
            <StatValue>{stats.streakDays}</StatValue>
            <StatLabel>Day Streak</StatLabel>
            <StatChange isPositive={true}>Current streak</StatChange>
          </StatCard>
        </Grid>
      </Card>
      
      {/* Progress Charts */}
      <Grid columns={2}>
        <Card>
          <CardHeader>
            <CardTitle>
              <BarChartIcon size={20} />
              Progress Over Time
            </CardTitle>
          </CardHeader>
          
          <ProgressAreaChart 
            data={progressData}
            xKey="month"
            yKeys={[
              { key: 'strength', name: 'Strength', color: '#00ffff' },
              { key: 'cardio', name: 'Cardio', color: '#FF6B6B' },
              { key: 'flexibility', name: 'Flexibility', color: '#4CAF50' }
            ]}
            height={300}
          />
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity size={20} />
              NASM Protocol Progress
            </CardTitle>
          </CardHeader>
          
          <RadarProgressChart 
            data={nasmData}
            name="Progress"
            nameKey="category"
            dataKey="value"
            height={300}
            color="#00ffff"
          />
        </Card>
      </Grid>
      
      <Card>
        <CardHeader>
          <CardTitle>
            <Dumbbell size={20} />
            Body Part Progress
          </CardTitle>
        </CardHeader>
        
        <BarProgressChart 
          data={bodyPartData}
          xKey="part"
          yKey="progress"
          height={300}
          horizontal={false}
          title=""
          colors={['#00ffff', '#7851a9', '#FF6B6B', '#4CAF50', '#FFC107', '#00bcd4']}
          labelKey="Body Part"
          valueFormatter={(value) => `${value}%`}
        />
      </Card>
      
      <Grid columns={2}>
        <Card>
          <CardHeader>
            <CardTitle>
              <Clock size={20} />
              Activity Statistics
            </CardTitle>
          </CardHeader>
          
          <Grid columns={2}>
            <StatCard>
              <StatIcon color="#FFC107">
                <Calendar size={24} color="#FFC107" />
              </StatIcon>
              <StatValue>{stats.totalExercisesPerformed}</StatValue>
              <StatLabel>Total Exercises</StatLabel>
            </StatCard>
            
            <StatCard>
              <StatIcon color="#00bcd4">
                <Clock size={24} color="#00bcd4" />
              </StatIcon>
              <StatValue>{stats.totalMinutes}</StatValue>
              <StatLabel>Total Minutes</StatLabel>
            </StatCard>
          </Grid>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Trophy size={20} />
              Achievements
            </CardTitle>
          </CardHeader>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            padding: '1.5rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(120, 81, 169, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Trophy size={40} color="#7851a9" />
              </div>
              <StatValue>{stats.achievements}</StatValue>
              <StatLabel>Achievements Unlocked</StatLabel>
              <div style={{ marginTop: '0.5rem' }}>
                <Button>View All</Button>
              </div>
            </div>
          </div>
        </Card>
      </Grid>
    </DashboardContainer>
  );
};

export default ProgressDashboard;