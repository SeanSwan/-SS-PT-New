import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Calendar, Clock, MapPin } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  ScheduleTimeline,
  ScheduleTimelineItem,
  itemVariants
} from '../styled-components';

import { ScheduledSession } from '../../types';

interface ScheduledSessionsCardProps {
  sessions: ScheduledSession[];
  onScheduleMore?: () => void;
}

const Description = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px;
`;

const SessionBox = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SessionTitle = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
`;

const SessionTypeBadge = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: ${props => props.$color};
`;

const MetaRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);

  svg {
    opacity: 0.7;
  }
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TrainerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const TrainerAvatar = styled.div<{ $src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$src ? `url(${props.$src}) center/cover` : '#00ffff'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const TrainerName = styled.span`
  font-size: 0.875rem;
  color: white;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  background: rgba(30, 30, 60, 0.3);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const EmptyTitle = styled.p`
  font-size: 1rem;
  color: white;
  margin: 0 0 8px;
`;

const EmptySubtext = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const ScheduleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: rgba(0, 255, 255, 0.05);
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 24px;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

/**
 * Component displaying upcoming scheduled training sessions
 */
const ScheduledSessionsCard: React.FC<ScheduledSessionsCardProps> = ({
  sessions,
  onScheduleMore
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  };

  const getSessionTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'strength': return 'rgba(0, 255, 255, 0.9)';
      case 'cardio': return 'rgba(255, 83, 83, 0.9)';
      case 'flexibility': return 'rgba(120, 81, 169, 0.9)';
      case 'balance': return 'rgba(255, 183, 0, 0.9)';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  };

  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Calendar size={22} />
          Upcoming Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Description>Your scheduled training sessions</Description>

        {sessions.length > 0 ? (
          <ScheduleTimeline>
            {sessions.map((session) => (
              <ScheduleTimelineItem key={session.id} active={session.isActive}>
                <SessionBox>
                  <SessionHeader>
                    <SessionTitle>{session.title}</SessionTitle>
                    <SessionTypeBadge $color={getSessionTypeColor(session.type)}>
                      {session.type}
                    </SessionTypeBadge>
                  </SessionHeader>

                  <MetaRow>
                    <MetaItem>
                      <Calendar size={14} />
                      {formatDate(session.date)}
                    </MetaItem>
                    <MetaItem>
                      <Clock size={14} />
                      {session.time} ({session.duration} min)
                    </MetaItem>
                  </MetaRow>

                  <FooterRow>
                    <MetaItem>
                      <MapPin size={14} />
                      {session.location}
                    </MetaItem>
                    <TrainerInfo>
                      Trainer:
                      <TrainerAvatar $src={session.trainerAvatar || undefined}>
                        {!session.trainerAvatar && session.trainerName.charAt(0)}
                      </TrainerAvatar>
                      <TrainerName>{session.trainerName}</TrainerName>
                    </TrainerInfo>
                  </FooterRow>
                </SessionBox>
              </ScheduleTimelineItem>
            ))}
          </ScheduleTimeline>
        ) : (
          <EmptyState>
            <EmptyTitle>No upcoming sessions scheduled</EmptyTitle>
            <EmptySubtext>Schedule a session to continue your fitness journey</EmptySubtext>
          </EmptyState>
        )}

        <ScheduleButton onClick={onScheduleMore}>
          Schedule New Session
        </ScheduleButton>
      </CardContent>
    </StyledCard>
  );
};

export default ScheduledSessionsCard;
