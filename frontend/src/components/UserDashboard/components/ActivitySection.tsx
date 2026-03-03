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
  ChevronUp,
  Loader2
} from 'lucide-react';
import { useProfile } from '../../../hooks/profile/useProfile';

// Professional styled components
const ActivityContainer = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  padding: 2rem;
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  background: ${({ $active }) =>
    $active
      ? 'var(--accent-primary)'
      : 'var(--bg-elevated)'
  };
  color: ${({ $active }) =>
    $active
      ? 'white'
      : 'var(--text-secondary)'
  };
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-primary)'
      : 'var(--border-soft)'
  };
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    background: var(--accent-primary);
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
  background: var(--bg-surface, var(--bg-elevated));
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
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
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
`;

const StatLabel = styled.p`
  color: var(--text-secondary);
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
  background: var(--bg-surface, var(--bg-elevated));
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
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

const ActivityItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const ActivityItemTitle = styled.h4`
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
`;

const ActivityTime = styled.p`
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0;
  white-space: nowrap;

  @media (max-width: 768px) {
    white-space: normal;
  }
`;

const ActivityDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.4;
`;

const ActivityMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ShowMoreButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-top: 1rem;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  background: var(--bg-surface, var(--bg-elevated));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: var(--text-muted);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: var(--text-muted);

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Stats and activities are now loaded from useProfile hook


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
  const { stats, posts, isLoadingStats, isLoadingPosts } = useProfile();

  const realStats = React.useMemo(() => [
    { icon: Target, label: 'Workouts', value: String(stats?.workouts || 0), color: '#60C0F0' },
    { icon: Zap, label: 'Streak Days', value: String(stats?.streak || 0), color: '#C6A84B' },
    { icon: Heart, label: 'Followers', value: String(stats?.followers || 0), color: '#F472B6' },
    { icon: TrendingUp, label: 'Level', value: String(stats?.level || 0), color: '#4ADE80' },
  ], [stats]);

  const realActivities = React.useMemo(() => {
    if (!posts || posts.length === 0) return [];
    return posts.slice(0, 6).map((post, index) => {
      const typeMap: Record<string, { icon: any; color: string; label: string }> = {
        workout: { icon: Zap, color: '#60C0F0', label: 'Workout' },
        achievement: { icon: Award, color: '#C6A84B', label: 'Achievement' },
        challenge: { icon: Target, color: '#4ADE80', label: 'Challenge' },
        milestone: { icon: TrendingUp, color: '#F472B6', label: 'Milestone' },
        general: { icon: Activity, color: '#50A0F0', label: 'Post' },
      };
      const typeInfo = typeMap[post.type] || typeMap.general;

      // Format relative time
      const postDate = new Date(post.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - postDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      let timeStr = 'Just now';
      if (diffDays > 0) timeStr = `${diffDays}d ago`;
      else if (diffHours > 0) timeStr = `${diffHours}h ago`;

      return {
        id: post.id || String(index),
        type: typeInfo.label,
        title: post.content?.substring(0, 60) || typeInfo.label,
        description: post.content || '',
        icon: typeInfo.icon,
        color: typeInfo.color,
        time: timeStr,
      };
    });
  }, [posts]);

  const filteredActivities = realActivities.filter(activity =>
    activeFilter === 'all' || activity.type.toLowerCase() === activeFilter
  );

  const displayedActivities = showMore ? filteredActivities : filteredActivities.slice(0, 4);

  const hasMoreActivities = filteredActivities.length > 4;

  if (isLoadingStats || isLoadingPosts) {
    return (
      <ActivityContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LoadingContainer>
          <Loader2 size={40} />
          <p style={{ marginTop: '1rem' }}>Loading activity...</p>
        </LoadingContainer>
      </ActivityContainer>
    );
  }

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
        {realStats.map((stat, index) => {
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
                    <ActivityItemHeader>
                      <ActivityItemTitle>{activity.title}</ActivityItemTitle>
                      <ActivityTime>{activity.time}</ActivityTime>
                    </ActivityItemHeader>
                    
                    <ActivityDescription>{activity.description}</ActivityDescription>
                    
                    <ActivityMeta>
                      <MetaItem>
                        <span style={{ fontWeight: 500 }}>{activity.type}</span>
                      </MetaItem>
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
            <h3 style={{ margin: '0 0 0.5rem', color: 'inherit' }}>No recent activity yet</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Start a workout or create a post!
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