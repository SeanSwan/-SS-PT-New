import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useQuery } from '@tanstack/react-query';
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
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  const fetchEvents = async ({ queryKey }: any) => {
    const [_key, { start, end }] = queryKey;
    const response = await api.get('/api/schedule', {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
    // Parse date strings back to Date objects
    return response.data.map((event: any) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  };

  const { data: events = [], isLoading, error } = useQuery<Event[]>({
    queryKey: ['scheduleEvents', dateRange],
    queryFn: fetchEvents,
    enabled: !!user, // Only fetch if user is logged in
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load schedule');
    }
  }, [error]);

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    const newRange = Array.isArray(range)
      ? { start: range[0], end: range[range.length - 1] }
      : { start: range.start, end: range.end };
    setDateRange({
      start: startOfDay(newRange.start),
      end: endOfDay(newRange.end),
    });
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
          onRangeChange={handleRangeChange}
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
      {isLoading && (
        <LoadingOverlay>
          <p>Loading Schedule...</p>
        </LoadingOverlay>
      )}
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

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 14, 26, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  z-index: 10;
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
