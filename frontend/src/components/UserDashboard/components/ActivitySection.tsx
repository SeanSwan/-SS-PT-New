import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Activity, Dumbbell, Award, Users, Calendar, TrendingUp } from 'lucide-react';

const ActivityContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const ActivityTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.08)'};
  }
`;

const ActivityIcon = styled.div<{ variant?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ variant, theme }) => {
    switch (variant) {
      case 'workout': return '#4ade8020';
      case 'achievement': return '#f59e0b20';
      case 'social': return '#8b5cf620';
      case 'milestone': return '#ef444420';
      default: return theme.colors?.primary + '20' || '#00ffff20';
    }
  }};
  color: ${({ variant, theme }) => {
    switch (variant) {
      case 'workout': return '#4ade80';
      case 'achievement': return '#f59e0b';
      case 'social': return '#8b5cf6';
      case 'milestone': return '#ef4444';
      default: return theme.colors?.primary || '#00ffff';
    }
  }};
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
`;

const ActivityAction = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
`;

const ActivityTime = styled.span`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  font-size: 0.8rem;
`;

const ActivityDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ActivityStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border-radius: 8px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
`;

const FilterTab = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#00ffff'
      : theme.background?.elevated || 'rgba(255,255,255,0.1)'
  };
  color: ${({ $active, theme }) => 
    $active 
      ? '#000' 
      : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-size: 0.9rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#00ffff'};
    color: #000;
  }
`;

// Mock activity data
const mockActivities = [
  {
    id: 1,
    type: 'workout',
    action: 'Completed Upper Body Workout',
    description: 'Chest, shoulders, and triceps session - 60 minutes',
    time: '2 hours ago',
    icon: Dumbbell
  },
  {
    id: 2,
    type: 'achievement',
    action: 'Earned "Week Warrior" Badge',
    description: 'Completed 7 workouts in a row',
    time: '1 day ago',
    icon: Award
  },
  {
    id: 3,
    type: 'social',
    action: 'Joined Fitness Challenge',
    description: 'Summer Shred Challenge with 150 participants',
    time: '2 days ago',
    icon: Users
  },
  {
    id: 4,
    type: 'workout',
    action: 'Completed Cardio Session',
    description: '30-minute HIIT workout with burpees and mountain climbers',
    time: '3 days ago',
    icon: Activity
  },
  {
    id: 5,
    type: 'milestone',
    action: 'Reached 100 Workouts Milestone',
    description: 'Celebrated with a new personal record!',
    time: '1 week ago',
    icon: TrendingUp
  },
  {
    id: 6,
    type: 'social',
    action: 'Posted Transformation Photo',
    description: 'Shared 3-month progress with the community',
    time: '1 week ago',
    icon: Users
  }
];

const activityStats = [
  { label: 'This Week', value: '5', subtitle: 'Workouts' },
  { label: 'This Month', value: '18', subtitle: 'Activities' },
  { label: 'Streak', value: '7', subtitle: 'Days' },
  { label: 'Total', value: '104', subtitle: 'Workouts' }
];

const filters = ['All', 'Workouts', 'Achievements', 'Social', 'Milestones'];

/**
 * Optimized Activity Section Component
 * Displays user's recent fitness and social activities
 */
const ActivitySection: React.FC = () => {
  const [activeFilter, setActiveFilter] = React.useState('All');
  
  const filteredActivities = React.useMemo(() => {
    if (activeFilter === 'All') return mockActivities;
    
    const filterMap = {
      'Workouts': 'workout',
      'Achievements': 'achievement',
      'Social': 'social',
      'Milestones': 'milestone'
    };
    
    return mockActivities.filter(activity => 
      activity.type === filterMap[activeFilter as keyof typeof filterMap]
    );
  }, [activeFilter]);

  return (
    <ActivityContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ActivityTitle>
        <Activity size={24} />
        Recent Activity
      </ActivityTitle>

      <ActivityStats>
        {activityStats.map((stat, index) => (
          <StatCard key={index}>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
            <div style={{ 
              fontSize: '0.7rem', 
              color: 'rgba(255,255,255,0.5)', 
              marginTop: '0.25rem' 
            }}>
              {stat.subtitle}
            </div>
          </StatCard>
        ))}
      </ActivityStats>

      <FilterTabs>
        {filters.map(filter => (
          <FilterTab
            key={filter}
            $active={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </FilterTab>
        ))}
      </FilterTabs>

      <ActivityList>
        {filteredActivities.map((activity, index) => {
          const IconComponent = activity.icon;
          return (
            <ActivityItem
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ActivityIcon variant={activity.type}>
                <IconComponent size={24} />
              </ActivityIcon>
              
              <ActivityContent>
                <ActivityHeader>
                  <ActivityAction>{activity.action}</ActivityAction>
                  <ActivityTime>{activity.time}</ActivityTime>
                </ActivityHeader>
                <ActivityDescription>{activity.description}</ActivityDescription>
              </ActivityContent>
            </ActivityItem>
          );
        })}
      </ActivityList>

      {filteredActivities.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'rgba(255,255,255,0.7)'
        }}>
          No {activeFilter.toLowerCase()} activities found.
        </div>
      )}
    </ActivityContainer>
  );
};

export default React.memo(ActivitySection);
