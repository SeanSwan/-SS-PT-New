/**
 * ClientProgress Component
 * =======================
 * Displays a client's progress and workout statistics with visualizations
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';

// Types
interface ClientProgressData {
  userId: string;
  strengthLevel: number;
  cardioLevel: number;
  flexibilityLevel: number;
  balanceLevel: number;
  coreLevel: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalExercises: number;
  lastWorkoutDate: string;
  currentStreak: number;
  personalRecords?: Record<string, Array<{
    setId: string;
    weight: number;
    reps: number;
    date: string;
  }>>;
}

interface WorkoutStatistics {
  totalWorkouts: number;
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageIntensity: number;
  weekdayBreakdown: number[];
  exerciseBreakdown?: Array<{
    id: string;
    name: string;
    count: number;
    sets: number;
    reps: number;
    totalWeight: number;
    category: string;
  }>;
  muscleGroupBreakdown?: Array<{
    id: string;
    name: string;
    shortName: string;
    count: number;
    bodyRegion: string;
  }>;
  intensityTrends?: Array<{
    week: string;
    averageIntensity: number;
  }>;
  recentWorkouts?: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    exerciseCount: number;
    intensity: number;
  }>;
}

// Styled Components
const ProgressContainer = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #1e1e3f, #0a0a1a);
  border-radius: 12px;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  margin: 0;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  
  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover, &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: #00ffff;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ChartSection = styled.div`
  margin-bottom: 40px;
`;

const ChartTitle = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 20px;
  font-weight: 400;
`;

const ChartContainer = styled.div`
  height: 300px;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const NoDataMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

const SkillLevelCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SkillLevelTitle = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 20px;
  font-weight: 400;
`;

const SkillBar = styled.div<{ $percentage: number; $color: string }>`
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  margin-bottom: 15px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.$percentage}%;
    background: ${props => props.$color};
    border-radius: 5px;
    transition: width 1s ease-out;
  }
`;

const SkillLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  
  span:first-child {
    color: white;
  }
  
  span:last-child {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const ClientProgress: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, authAxios } = useAuth();
  const [timeRange, setTimeRange] = useState<string>('30days');
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<ClientProgressData | null>(null);
  const [statistics, setStatistics] = useState<WorkoutStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch progress and statistics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine which user to fetch data for
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) {
          setError('No user specified');
          setLoading(false);
          return;
        }
        
        // Calculate date range based on selected time filter
        const getDateRange = () => {
          const now = new Date();
          const endDate = now.toISOString().split('T')[0];
          let startDate = '';
          
          switch (timeRange) {
            case '7days':
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              startDate = sevenDaysAgo.toISOString().split('T')[0];
              break;
            case '30days':
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              startDate = thirtyDaysAgo.toISOString().split('T')[0];
              break;
            case '90days':
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              startDate = ninetyDaysAgo.toISOString().split('T')[0];
              break;
            case 'year':
              const oneYearAgo = new Date(now);
              oneYearAgo.setFullYear(now.getFullYear() - 1);
              startDate = oneYearAgo.toISOString().split('T')[0];
              break;
            case 'all':
            default:
              // No start date constraint for 'all'
              startDate = '';
          }
          
          return { startDate, endDate };
        };
        
        const { startDate, endDate } = getDateRange();
        
        // Fetch client progress
        const progressResponse = await authAxios.get(`/api/client-progress/${targetUserId}`);
        
        // Fetch workout statistics
        const statisticsResponse = await authAxios.get(`/api/workout/statistics/${targetUserId}`, {
          params: {
            startDate,
            endDate,
            includeExerciseBreakdown: true,
            includeMuscleGroupBreakdown: true,
            includeWeekdayBreakdown: true,
            includeIntensityTrends: true
          }
        });
        
        setProgress(progressResponse.data.progress);
        setStatistics(statisticsResponse.data.statistics);
      } catch (err: any) {
        console.error('Error fetching progress data:', err);
        setError(err.response?.data?.message || 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, user?.id, authAxios, timeRange]);
  
  // Function to get a summary of skill levels for the radar chart
  const getSkillData = () => {
    if (!progress) return [];
    
    return [
      {
        subject: 'Strength',
        value: progress.strengthLevel,
        fullMark: 10
      },
      {
        subject: 'Cardio',
        value: progress.cardioLevel,
        fullMark: 10
      },
      {
        subject: 'Flexibility',
        value: progress.flexibilityLevel,
        fullMark: 10
      },
      {
        subject: 'Balance',
        value: progress.balanceLevel,
        fullMark: 10
      },
      {
        subject: 'Core',
        value: progress.coreLevel,
        fullMark: 10
      }
    ];
  };
  
  // Function to format weekday breakdown data
  const getWeekdayData = () => {
    if (!statistics?.weekdayBreakdown) return [];
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return statistics.weekdayBreakdown.map((count, index) => ({
      day: weekdays[index],
      count
    }));
  };
  
  // Function to get exercise type breakdown
  const getExerciseTypeData = () => {
    if (!statistics?.exerciseBreakdown) return [];
    
    // Group exercises by category
    const categoryMap: Record<string, number> = {};
    
    statistics.exerciseBreakdown.forEach(exercise => {
      const category = exercise.category || 'other';
      categoryMap[category] = (categoryMap[category] || 0) + exercise.count;
    });
    
    // Convert to array
    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));
  };
  
  // Function to format intensity trends
  const getIntensityTrendData = () => {
    return statistics?.intensityTrends || [];
  };
  
  // Function to format top exercises
  const getTopExercises = () => {
    if (!statistics?.exerciseBreakdown) return [];
    
    // Sort by count and take top 5
    return [...statistics.exerciseBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };
  
  // Function to get muscle group distribution
  const getMuscleGroupData = () => {
    if (!statistics?.muscleGroupBreakdown) return [];
    
    // Sort by count and take top 6
    return [...statistics.muscleGroupBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(group => ({
        name: group.shortName,
        value: group.count
      }));
  };
  
  // Render loading state
  if (loading) {
    return (
      <ProgressContainer>
        <Title>Loading progress data...</Title>
      </ProgressContainer>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <ProgressContainer>
        <Title>Error Loading Data</Title>
        <p>{error}</p>
      </ProgressContainer>
    );
  }
  
  // Render no data state
  if (!progress || !statistics) {
    return (
      <ProgressContainer>
        <Title>No Progress Data Available</Title>
        <p>Start tracking your workouts to see progress data here.</p>
      </ProgressContainer>
    );
  }
  
  return (
    <ProgressContainer>
      <HeaderSection>
        <Title>Workout Progress</Title>
        
        <FilterContainer>
          <FilterSelect 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </FilterSelect>
        </FilterContainer>
      </HeaderSection>
      
      {/* Summary Metrics */}
      <MetricsGrid>
        <MetricCard>
          <MetricValue>{statistics.totalWorkouts}</MetricValue>
          <MetricLabel>Total Workouts</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{Math.round(statistics.totalDuration / 60)}</MetricValue>
          <MetricLabel>Total Hours</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{statistics.totalSets.toLocaleString()}</MetricValue>
          <MetricLabel>Total Sets</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{statistics.totalReps.toLocaleString()}</MetricValue>
          <MetricLabel>Total Reps</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{Math.round(statistics.totalWeight).toLocaleString()}</MetricValue>
          <MetricLabel>Total Weight (lbs)</MetricLabel>
        </MetricCard>
        
        <MetricCard>
          <MetricValue>{progress.currentStreak}</MetricValue>
          <MetricLabel>Current Streak</MetricLabel>
        </MetricCard>
      </MetricsGrid>
      
      {/* Skill Levels */}
      <SkillLevelCard>
        <SkillLevelTitle>Skill Levels</SkillLevelTitle>
        
        <SkillLabel>
          <span>Strength</span>
          <span>Level {progress.strengthLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.strengthLevel * 10} $color="#ff4757" />
        
        <SkillLabel>
          <span>Cardio</span>
          <span>Level {progress.cardioLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.cardioLevel * 10} $color="#1e90ff" />
        
        <SkillLabel>
          <span>Flexibility</span>
          <span>Level {progress.flexibilityLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.flexibilityLevel * 10} $color="#ffa502" />
        
        <SkillLabel>
          <span>Balance</span>
          <span>Level {progress.balanceLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.balanceLevel * 10} $color="#2ed573" />
        
        <SkillLabel>
          <span>Core</span>
          <span>Level {progress.coreLevel}</span>
        </SkillLabel>
        <SkillBar $percentage={progress.coreLevel * 10} $color="#7d5fff" />
      </SkillLevelCard>
      
      {/* Skill Radar Chart */}
      <ChartSection>
        <ChartTitle>Skill Balance</ChartTitle>
        <ChartContainer>
          {getSkillData().length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={getSkillData()}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'white' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: 'white' }} />
                <Radar
                  name="Skills"
                  dataKey="value"
                  stroke="#00ffff"
                  fill="#00ffff"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    color: 'white'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataMessage>No skill data available</NoDataMessage>
          )}
        </ChartContainer>
      </ChartSection>
      
      {/* Two Column Charts */}
      <TwoColumnGrid>
        {/* Workout Frequency by Day */}
        <ChartSection>
          <ChartTitle>Workout Frequency by Weekday</ChartTitle>
          <ChartContainer>
            {getWeekdayData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getWeekdayData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="day" tick={{ fill: 'white' }} />
                  <YAxis tick={{ fill: 'white' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="count" fill="#00ffff" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataMessage>No workout data available</NoDataMessage>
            )}
          </ChartContainer>
        </ChartSection>
        
        {/* Exercise Types */}
        <ChartSection>
          <ChartTitle>Exercise Types</ChartTitle>
          <ChartContainer>
            {getExerciseTypeData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getExerciseTypeData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis type="number" tick={{ fill: 'white' }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'white' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="value" fill="#1e90ff" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataMessage>No exercise type data available</NoDataMessage>
            )}
          </ChartContainer>
        </ChartSection>
      </TwoColumnGrid>
      
      {/* Intensity Trends */}
      <ChartSection>
        <ChartTitle>Workout Intensity Trends</ChartTitle>
        <ChartContainer>
          {getIntensityTrendData().length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getIntensityTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="week" tick={{ fill: 'white' }} />
                <YAxis domain={[0, 10]} tick={{ fill: 'white' }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    color: 'white'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="averageIntensity" 
                  stroke="#00ffff" 
                  strokeWidth={2}
                  name="Intensity"
                  dot={{ fill: '#00ffff', r: 4 }}
                  activeDot={{ r: 6, fill: '#00ffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataMessage>No intensity data available</NoDataMessage>
          )}
        </ChartContainer>
      </ChartSection>
      
      {/* Two Column Charts */}
      <TwoColumnGrid>
        {/* Top Exercises */}
        <ChartSection>
          <ChartTitle>Top Exercises</ChartTitle>
          <ChartContainer>
            {getTopExercises().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopExercises()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis type="number" tick={{ fill: 'white' }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'white' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="count" fill="#2ed573" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataMessage>No exercise data available</NoDataMessage>
            )}
          </ChartContainer>
        </ChartSection>
        
        {/* Muscle Group Distribution */}
        <ChartSection>
          <ChartTitle>Muscle Group Focus</ChartTitle>
          <ChartContainer>
            {getMuscleGroupData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMuscleGroupData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="name" tick={{ fill: 'white' }} />
                  <YAxis tick={{ fill: 'white' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="value" fill="#7d5fff" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataMessage>No muscle group data available</NoDataMessage>
            )}
          </ChartContainer>
        </ChartSection>
      </TwoColumnGrid>
    </ProgressContainer>
  );
};

export default ClientProgress;