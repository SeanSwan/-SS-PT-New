/**
 * SwanStudios Activity Section Component
 * =====================================
 * 
 * Professional activity feed showing recent user actions and achievements
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity,
  Clock,
  Calendar,
  Trophy,
  Heart,
  MessageCircle,
  Share2,
  Target,
  Zap,
  Star,
  Award,
  Users,
  Camera,
  Video,
  Music,
  MapPin,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Professional styled components
const ActivityContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const ActivityTitle = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#3B82F6'
      : theme.background?.elevated || 'rgba(255,255,255,0.05)'
  };
  color: ${({ $active, theme }) => 
    $active 
      ? 'white'
      : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  border: 1px solid ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#3B82F6'
      : theme.borders?.subtle || 'rgba(255,255,255,0.1)'
  };
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: white;
    transform: translateY(-1px);
  }
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const StatCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  }
`;

const StatIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 0.75rem;
`;

const StatValue = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
`;

const StatLabel = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
  margin: 0;
  font-weight: 500;
`;

const ActivityFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ActivityIcon = styled.div<{ $color?: string }>`
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  width: 40px;
  height: 40px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const ActivityContent = styled.div`
  margin-left: 60px;
`;

const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const ActivityTitle = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
`;

const ActivityTime = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
  margin: 0;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    white-space: normal;
  }
`;

const ActivityDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.4;
`;

const ActivityMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ShowMoreButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-top: 1rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
`;

// Mock activity data
const mockStats = [
  {
    icon: Target,
    label: 'Goals Completed',
    value: '12',
    color: 'linear-gradient(135deg, #10B981, #059669)'
  },
  {
    icon: Zap,
    label: 'Workouts This Month',
    value: '18',
    color: 'linear-gradient(135deg, #F59E0B, #D97706)'
  },
  {
    icon: Heart,
    label: 'Community Likes',
    value: '142',
    color: 'linear-gradient(135deg, #EF4444, #DC2626)'
  },
  {
    icon: TrendingUp,
    label: 'Streak Days',
    value: '7',
    color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
  }
];

const mockActivities = [
  {
    id: 1,
    type: 'workout',
    title: 'Completed Full Body Strength Training',
    description: 'Crushed a 45-minute strength workout focusing on compound movements',
    icon: Zap,
    color: 'linear-gradient(135deg, #F59E0B, #D97706)',
    time: '2 hours ago',
    meta: {
      duration: '45 min',
      calories: '380',
      exercises: '8'
    }
  },
  {
    id: 2,
    type: 'social',
    title: 'Liked Alex Rivera\'s workout post',
    description: 'Showed support for a community member\'s morning routine',
    icon: Heart,
    color: 'linear-gradient(135deg, #EF4444, #DC2626)',
    time: '4 hours ago',
    meta: {
      type: 'Like',
      community: 'SwanStudios'
    }
  },
  {
    id: 3,
    type: 'achievement',
    title: 'Unlocked "Week Warrior" Badge',
    description: 'Completed workouts for 7 consecutive days',
    icon: Trophy,
    color: 'linear-gradient(135deg, #10B981, #059669)',
    time: '1 day ago',
    meta: {
      streak: '7 days',
      badge: 'Week Warrior'
    }
  },
  {
    id: 4,
    type: 'content',
    title: 'Shared a workout photo',
    description: 'Posted progress photo from today\'s training session',
    icon: Camera,
    color: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    time: '2 days ago',
    meta: {
      likes: '23',
      comments: '5'
    }
  },
  {
    id: 5,
    type: 'goal',
    title: 'Updated fitness goal',
    description: 'Set a new target to deadlift 200lbs by the end of the month',
    icon: Target,
    color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    time: '3 days ago',
    meta: {
      goal: 'Strength',
      target: '200lbs'
    }
  },
  {
    id: 6,
    type: 'community',
    title: 'Joined a community challenge',
    description: 'Signed up for the "30 Days of Movement" community challenge',
    icon: Users,
    color: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    time: '1 week ago',
    meta: {
      challenge: '30 Days Movement',
      participants: '156'
    }
  }
];

const filterOptions = [
  { id: 'all', label: 'All Activity', icon: Activity },
  { id: 'workout', label: 'Workouts', icon: Zap },
  { id: 'social', label: 'Social', icon: Heart },
  { id: 'achievement', label: 'Achievements', icon: Trophy },
  { id: 'content', label: 'Content', icon: Camera }
];

const ActivitySection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMore, setShowMore] = useState(false);
  const [activities] = useState(mockActivities);

  const filteredActivities = activities.filter(activity => 
    activeFilter === 'all' || activity.type === activeFilter
  );

  const displayedActivities = showMore ? filteredActivities : filteredActivities.slice(0, 4);

  const hasMoreActivities = filteredActivities.length > 4;

  return (
    <ActivityContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ActivityHeader>
        <ActivityTitle>
          <Activity size={24} />
          Recent Activity
        </ActivityTitle>
        <FilterContainer>
          {filterOptions.map((filter) => {
            const Icon = filter.icon;
            return (
              <FilterButton
                key={filter.id}
                $active={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={16} />
                {filter.label}
              </FilterButton>
            );
          })}
        </FilterContainer>
      </ActivityHeader>

      {/* Stats Overview */}
      <StatsOverview>
        {mockStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <StatIcon $color={stat.color}>
                <Icon size={24} />
              </StatIcon>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          );
        })}
      </StatsOverview>

      {/* Activity Feed */}
      <ActivityFeed>
        {displayedActivities.length > 0 ? (
          <AnimatePresence>
            {displayedActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <ActivityItem
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ActivityIcon $color={activity.color}>
                    <Icon size={20} />
                  </ActivityIcon>
                  
                  <ActivityContent>
                    <ActivityHeader>
                      <ActivityTitle>{activity.title}</ActivityTitle>
                      <ActivityTime>{activity.time}</ActivityTime>
                    </ActivityHeader>
                    
                    <ActivityDescription>{activity.description}</ActivityDescription>
                    
                    <ActivityMeta>
                      {Object.entries(activity.meta).map(([key, value]) => (
                        <MetaItem key={key}>
                          <span style={{ textTransform: 'capitalize' }}>{key}:</span>
                          <span style={{ fontWeight: 500 }}>{value}</span>
                        </MetaItem>
                      ))}
                    </ActivityMeta>
                  </ActivityContent>
                </ActivityItem>
              );
            })}
          </AnimatePresence>
        ) : (
          <EmptyState>
            <EmptyIcon>
              <Activity size={32} />
            </EmptyIcon>
            <h3 style={{ margin: '0 0 0.5rem', color: 'inherit' }}>No activities yet</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Start your fitness journey to see your activities here
            </p>
          </EmptyState>
        )}
        
        {hasMoreActivities && (
          <ShowMoreButton
            onClick={() => setShowMore(!showMore)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {showMore ? (
              <>
                Show Less
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                Show More Activities
                <ChevronDown size={16} />
              </>
            )}
          </ShowMoreButton>
        )}
      </ActivityFeed>
    </ActivityContainer>
  );
};

export default ActivitySection;