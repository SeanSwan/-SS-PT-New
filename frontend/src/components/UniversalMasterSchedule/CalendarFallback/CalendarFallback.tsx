/**
 * Calendar Fallback Component
 * ===========================
 * A robust fallback calendar solution when react-big-calendar fails to initialize
 * Provides basic scheduling functionality with a clean, professional interface
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Users, MapPin } from 'lucide-react';
import { Typography, Card, CardContent, Chip } from '@mui/material';

interface SessionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  client?: any;
  trainer?: any;
  location?: string;
}

interface CalendarFallbackProps {
  events: SessionEvent[];
  onEventClick?: (event: SessionEvent) => void;
  onSlotClick?: (date: Date) => void;
}

const CalendarFallbackContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
`;

const FallbackHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const EventCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const EventTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

const EventTitle = styled.div`
  color: white;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

const EventDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
`;

const StatusChip = styled(Chip)<{ status: string }>`
  && {
    height: 20px;
    font-size: 0.7rem;
    background: ${props => {
      switch (props.status) {
        case 'available': return 'rgba(34, 197, 94, 0.2)';
        case 'scheduled': 
        case 'confirmed': return 'rgba(59, 130, 246, 0.2)';
        case 'completed': return 'rgba(156, 163, 175, 0.2)';
        case 'cancelled': return 'rgba(239, 68, 68, 0.2)';
        default: return 'rgba(59, 130, 246, 0.2)';
      }
    }};
    color: ${props => {
      switch (props.status) {
        case 'available': return '#22c55e';
        case 'scheduled': 
        case 'confirmed': return '#3b82f6';
        case 'completed': return '#9ca3af';
        case 'cancelled': return '#ef4444';
        default: return '#3b82f6';
      }
    }};
    border: 1px solid ${props => {
      switch (props.status) {
        case 'available': return 'rgba(34, 197, 94, 0.3)';
        case 'scheduled': 
        case 'confirmed': return 'rgba(59, 130, 246, 0.3)';
        case 'completed': return 'rgba(156, 163, 175, 0.3)';
        case 'cancelled': return 'rgba(239, 68, 68, 0.3)';
        default: return 'rgba(59, 130, 246, 0.3)';
      }
    }};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
`;

export const CalendarFallback: React.FC<CalendarFallbackProps> = ({
  events,
  onEventClick,
  onSlotClick
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupEventsByDate = (events: SessionEvent[]) => {
    const grouped: { [key: string]: SessionEvent[] } = {};
    
    events.forEach(event => {
      const dateKey = event.start.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    const result: { date: string; events: SessionEvent[] }[] = [];
    sortedDates.forEach(date => {
      // Sort events by time
      grouped[date].sort((a, b) => a.start.getTime() - b.start.getTime());
      result.push({ date, events: grouped[date] });
    });
    
    return result;
  };

  const groupedEvents = groupEventsByDate(events);

  return (
    <CalendarFallbackContainer>
      <FallbackHeader>
        <CalendarIcon size={24} color="white" />
        <div>
          <Typography variant="h6" sx={{ color: 'white', margin: 0 }}>
            Schedule Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Fallback calendar view ({events.length} sessions)
          </Typography>
        </div>
      </FallbackHeader>

      {groupedEvents.length === 0 ? (
        <EmptyState>
          <CalendarIcon size={48} />
          <Typography variant="h6" sx={{ mt: 2, color: 'inherit' }}>
            No Sessions Found
          </Typography>
          <Typography variant="body2" sx={{ color: 'inherit' }}>
            Click to add a new session
          </Typography>
        </EmptyState>
      ) : (
        groupedEvents.map(({ date, events }, index) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'white', 
                mt: index > 0 ? 3 : 0, 
                mb: 1,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: 1
              }}
            >
              {formatDate(new Date(date))}
            </Typography>
            
            <EventsGrid>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <EventTime>
                    <Clock size={14} />
                    {formatTime(event.start)} - {formatTime(event.end)}
                    <StatusChip 
                      status={event.status}
                      label={event.status}
                      size="small"
                    />
                  </EventTime>
                  
                  <EventTitle>{event.title}</EventTitle>
                  
                  <EventDetails>
                    {event.trainer && (
                      <EventDetail>
                        <Users size={12} />
                        Trainer: {event.trainer.firstName} {event.trainer.lastName}
                      </EventDetail>
                    )}
                    
                    {event.location && (
                      <EventDetail>
                        <MapPin size={12} />
                        {event.location}
                      </EventDetail>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </motion.div>
        ))
      )}
    </CalendarFallbackContainer>
  );
};

export default CalendarFallback;
