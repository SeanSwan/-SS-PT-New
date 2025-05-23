/**
 * FullCalendar Component
 * 
 * A comprehensive calendar view using FullCalendar library for session scheduling.
 * Features:
 * - Displays sessions with color-coding based on status
 * - Allows different interactions based on user role (admin, trainer, client)
 * - Provides event click handlers for session details
 * - Supports mobile-responsive design
 */

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useDispatch, useSelector } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { 
  selectAllSessions, 
  selectScheduleStatus, 
  selectScheduleError,
  fetchSessions
} from '../../redux/slices/scheduleSlice';
import { Box, Typography, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { RootState } from '../../redux/store';
import { SessionEvent } from '../../redux/slices/scheduleSlice';

// Define types for component props
interface FullCalendarComponentProps {
  onEventClick: (event: SessionEvent) => void;
  userRole: 'admin' | 'trainer' | 'client';
  handleDateSelect?: (selectInfo: any) => void;
}

// Status color mapping
const statusColors = {
  available: '#4caf50',      // Green
  booked: '#2196f3',         // Blue
  scheduled: '#2196f3',      // Blue
  confirmed: '#9c27b0',      // Purple
  completed: '#757575',      // Gray
  cancelled: '#f44336',      // Red
  requested: '#ff9800',      // Orange
  blocked: '#212121'         // Dark Gray/Black for blocked time
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for selected date range
  const [viewDates, setViewDates] = useState({
    start: new Date(),
    end: new Date(new Date().setMonth(new Date().getMonth() + 1))
  });

  // Fetch sessions when component mounts or date range changes
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSessions());
    }
  }, [status, dispatch]);

  // Process sessions for the calendar
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

  // Handle date range navigation
  const handleDatesSet = (dateInfo: any) => {
    setViewDates({
      start: dateInfo.start,
      end: dateInfo.end
    });
  };

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    const sessionId = clickInfo.event.id;
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onEventClick(session);
    }
  };

  // If loading, show a loading indicator
  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  // If there was an error, show an error message
  if (status === 'failed') {
    return (
      <Box mt={2} mb={2}>
        <Alert severity="error">
          Error loading sessions: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
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
    </Box>
  );
};

export default ScheduleCalendar;