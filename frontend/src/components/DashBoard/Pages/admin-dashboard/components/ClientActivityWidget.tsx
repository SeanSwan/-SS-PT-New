import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Award, Dumbbell, MessageSquare, UserPlus } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import WidgetSkeleton from './WidgetSkeleton';
import { CommandCard } from '../admin-dashboard-view';

const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 350px;
  overflow-y: auto;
`;

const ActivityItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const IconWrapper = styled.div<{ type: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${props => {
    if (props.type === 'milestone') return 'rgba(251, 191, 36, 0.2)';
    if (props.type === 'workout') return 'rgba(16, 185, 129, 0.2)';
    if (props.type === 'signup') return 'rgba(59, 130, 246, 0.2)';
    return 'rgba(107, 114, 128, 0.2)';
  }};
  color: ${props => {
    if (props.type === 'milestone') return '#fbbf24';
    if (props.type === 'workout') return '#10b981';
    if (props.type === 'signup') return '#3b82f6';
    return '#9ca3af';
  }};
`;

const ActivityText = styled.div`
  flex: 1;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const ClientActivityWidget: React.FC = () => {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await apiService.get('/api/admin/activity-feed');
        setFeed(response.data);
      } catch (error) {
        console.error("Failed to fetch activity feed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <Award size={20} />;
      case 'workout': return <Dumbbell size={20} />;
      case 'signup': return <UserPlus size={20} />;
      default: return <MessageSquare size={20} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffSeconds = Math.round((now.getTime() - then.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <CommandCard style={{ padding: '2rem', height: '100%' }}>
      <h3 style={{ color: '#00ffff', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Live Activity Feed</h3>
      {loading ? ( <WidgetSkeleton count={5} /> ) : (
        <ActivityList>
          {feed.map((item, index) => (
            <ActivityItem key={index} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.1 }}>
              <IconWrapper type={item.type}>{getIcon(item.type)}</IconWrapper>
              <ActivityText><strong>{item.user.firstName} {item.user.lastName}</strong> {item.type === 'workout' ? 'completed' : item.type === 'signup' ? 'just signed up!' : item.type === 'milestone' ? 'achieved' : item.title}</ActivityText>
              <ActivityTime>{formatTime(item.timestamp)}</ActivityTime>
            </ActivityItem>
          ))}
        </ActivityList>
      )}
    </CommandCard>
  );
};

export default ClientActivityWidget;