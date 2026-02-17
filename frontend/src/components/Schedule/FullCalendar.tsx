/**
 * FullCalendar Component
 *
 * A comprehensive calendar view using FullCalendar library for session scheduling.
 */

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useDispatch, useSelector } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import styled, { keyframes } from 'styled-components';
import {
  selectAllSessions,
  selectScheduleStatus,
  selectScheduleError,
  fetchSessions
} from '../../redux/slices/scheduleSlice';
import { RootState } from '../../redux/store';
import { SessionEvent } from '../../redux/slices/scheduleSlice';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 8px;
  font-size: 0.875rem;
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
`;

const CalendarContainer = styled.div`
  height: 100%;
  width: 100%;
`;

// Define types for component props
interface FullCalendarComponentProps {
  onEventClick: (event: SessionEvent) => void;
  userRole: 'admin' | 'trainer' | 'client';
  handleDateSelect?: (selectInfo: any) => void;
}

// Status color mapping
const statusColors = {
  available: '#4caf50',
  booked: '#2196f3',
  scheduled: '#2196f3',
  confirmed: '#9c27b0',
  completed: '#757575',
  cancelled: '#f44336',
  requested: '#ff9800',
  blocked: '#212121'
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const ScheduleCalendar: React.FC<FullCalendarComponentProps> = ({
  onEventClick,
  userRole,
  handleDateSelect
}) => {
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
  const sessions = useSelector(selectAllSessions);
  const status = useSelector(selectScheduleStatus);
  const error = useSelector(selectScheduleError);
  const isMobile = useIsMobile();

  const [viewDates, setViewDates] = useState({
    start: new Date(),
    end: new Date(new Date().setMonth(new Date().getMonth() + 1))
  });

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSessions());
    }
  }, [status, dispatch]);

  const calendarEvents = sessions.map(session => ({
    id: session.id,
    title: session.status === 'blocked'
      ? `Blocked: ${session.reason || 'Unavailable'}`
      : session.title || `Session with ${session.trainer?.firstName || 'TBD'}`,
    start: new Date(session.start),
    end: new Date(session.end),
    backgroundColor: statusColors[session.status as keyof typeof statusColors] || '#757575',
    borderColor: statusColors[session.status as keyof typeof statusColors] || '#757575',
    textColor: '#ffffff',
    extendedProps: { ...session }
  }));

  const handleDatesSet = (dateInfo: any) => {
    setViewDates({
      start: dateInfo.start,
      end: dateInfo.end
    });
  };

  const handleEventClick = (clickInfo: any) => {
    const sessionId = clickInfo.event.id;
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onEventClick(session);
    }
  };

  if (status === 'loading') {
    return (
      <LoadingContainer>
        <Spinner />
      </LoadingContainer>
    );
  }

  if (status === 'failed') {
    return (
      <ErrorBanner>
        Error loading sessions: {error}
      </ErrorBanner>
    );
  }

  return (
    <CalendarContainer>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: isMobile ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
        editable={userRole === 'admin' || userRole === 'trainer'}
        selectable={userRole === 'admin' || userRole === 'trainer'}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={calendarEvents}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        select={handleDateSelect}
        height="auto"
        expandRows={true}
        stickyHeaderDates={true}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        nowIndicator={true}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          omitZeroMinute: false,
          meridiem: 'short'
        }}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
      />
    </CalendarContainer>
  );
};

export default ScheduleCalendar;
