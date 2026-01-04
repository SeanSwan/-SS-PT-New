import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { toast } from 'react-toastify';

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
  type: 'session' | 'block' | 'class';
}

const UnifiedSchedule: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [date, view]);

  const fetchEvents = async () => {
    try {
      // In a real implementation, this would fetch based on date range and user role
      // const response = await api.get('/api/schedule', { params: { start, end } });
      // setEvents(response.data);
      
      // Mock data for now
      setEvents([
        {
          id: '1',
          title: 'PT Session with John',
          start: new Date(new Date().setHours(10, 0, 0, 0)),
          end: new Date(new Date().setHours(11, 0, 0, 0)),
          type: 'session'
        }
      ]);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Handle slot selection (booking or blocking time) based on role
    if (user?.role === 'trainer') {
      // Open modal to block time or schedule session
      console.log('Trainer selected slot:', start, end);
    } else if (user?.role === 'client') {
      // Open modal to request booking
      console.log('Client selected slot:', start, end);
    }
  };

  const handleSelectEvent = (event: Event) => {
    // Handle event click
    console.log('Selected event:', event);
  };

  return (
    <ScheduleContainer>
      <Header>
        <Title>Schedule</Title>
        <Controls>
          {/* Add custom controls here if needed */}
        </Controls>
      </Header>
      
      <CalendarWrapper>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 200px)' }}
          view={view}
          onView={(newView: any) => setView(newView)}
          date={date}
          onNavigate={(newDate: any) => setDate(newDate)}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.type === 'session' ? 'var(--primary-cyan, #00CED1)' : 'var(--accent-purple, #9D4EDD)',
              borderRadius: '4px',
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block'
            }
          })}
        />
      </CalendarWrapper>
    </ScheduleContainer>
  );
};

const ScheduleContainer = styled.div`
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
`;

const CalendarWrapper = styled.div`
  flex: 1;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);

  /* Customize React Big Calendar Styles for Galaxy Theme */
  .rbc-calendar {
    color: var(--text-primary, #FFFFFF);
  }

  .rbc-toolbar button {
    color: var(--text-primary, #FFFFFF);
    border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
    
    &:hover {
      background-color: var(--glass-border, rgba(0, 206, 209, 0.2));
    }
    
    &.rbc-active {
      background-color: var(--primary-cyan, #00CED1);
      color: var(--dark-bg, #0a0e1a);
    }
  }

  .rbc-header {
    border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  }

  .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
    border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  }

  .rbc-day-bg + .rbc-day-bg {
    border-left: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  }

  .rbc-timeslot-group {
    border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  }

  .rbc-day-slot .rbc-time-slot {
    border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.1));
  }
  
  .rbc-off-range-bg {
    background-color: rgba(0, 0, 0, 0.2);
  }
  
  .rbc-today {
    background-color: rgba(0, 206, 209, 0.1);
  }
`;

export default UnifiedSchedule;