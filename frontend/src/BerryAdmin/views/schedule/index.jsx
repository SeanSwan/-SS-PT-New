// frontend/src/BerryAdmin/views/Schedule/index.js
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { format, addHours, parseISO, isBefore, isAfter } from 'date-fns';
import axios from 'axios';

// Material UI components
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  TextField,
  Typography,
  Chip,
  Avatar,
  Paper,
  CircularProgress,
  Tooltip,
  Slide,
  alpha,
  useTheme
} from '@mui/material';

// Material UI icons
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  EventNote as EventIcon,
  Add as AddIcon,
  EventAvailable as ConfirmIcon,
  EventBusy as CancelIcon,
  Message as MessageIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';

// Berry admin components
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import { gridSpacing } from 'store/constant';
import { createFilterOptions } from '@mui/material/Autocomplete';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Socket.io connection
let socket;

// Set up the Calendar localizer
const localizer = momentLocalizer(moment);

// Custom event component with animation
const CustomEvent = ({ event }) => {
  const theme = useTheme();
  const statusColors = {
    available: theme.palette.success.main,
    requested: theme.palette.warning.main,
    scheduled: theme.palette.primary.main,
    confirmed: theme.palette.secondary.main,
    completed: theme.palette.info.dark,
    cancelled: theme.palette.error.main
  };

  const bgColor = statusColors[event.status] || theme.palette.primary.main;
  
  return (
    <Tooltip
      title={
        <React.Fragment>
          <Typography color="inherit" variant="subtitle2">
            {event.title}
          </Typography>
          <Typography variant="body2">
            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
          </Typography>
          <Typography variant="caption">
            Status: {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Typography>
          {event.client && (
            <Typography variant="caption" display="block">
              Client: {event.client.firstName} {event.client.lastName}
            </Typography>
          )}
          {event.trainer && (
            <Typography variant="caption" display="block">
              Trainer: {event.trainer.firstName} {event.trainer.lastName}
            </Typography>
          )}
        </React.Fragment>
      }
      arrow
      placement="top"
    >
      <Paper
        elevation={3}
        sx={{
          height: '100%',
          overflow: 'hidden',
          backgroundColor: bgColor,
          color: theme.palette.getContrastText(bgColor),
          padding: '4px 8px',
          borderRadius: '4px',
          position: 'relative',
          border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[6],
          },
          cursor: 'pointer'
        }}
      >
        <Typography variant="subtitle2" noWrap>
          {event.title}
        </Typography>
        <Typography variant="caption" display="block" noWrap>
          {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
        </Typography>
        {event.status === 'requested' && (
          <Chip
            label="NEW"
            size="small"
            color="warning"
            sx={{
              position: 'absolute',
              right: 4,
              top: 4,
              height: '16px',
              fontSize: '0.65rem',
              animation: 'pulse 1.5s infinite'
            }}
          />
        )}
      </Paper>
    </Tooltip>
  );
};

// Animation keyframes
const pulseKeyframes = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(255, 152, 0, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
    }
  }
`;

// Main Schedule component
const Schedule = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [requestNote, setRequestNote] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(600);
  
  // Logo path - import dynamically from your project
  const logoPath = '/static/images/logo.png'; // Update this with your logo path
  
  // Connect to socket.io
  useEffect(() => {
    socket = io(API_BASE_URL);
    
    socket.on('connect', () => {
      console.log('Socket.io connected');
      setSocketConnected(true);
    });
    
    socket.on('sessions:updated', (data) => {
      console.log('Sessions updated:', data);
      fetchSessions();
      
      if (data.type === 'booked') {
        enqueueSnackbar('New session booked', { variant: 'success' });
      } else if (data.type === 'cancelled') {
        enqueueSnackbar('Session cancelled', { variant: 'warning' });
      } else if (data.type === 'requested') {
        enqueueSnackbar('New session request', { variant: 'info' });
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  // Adjust calendar height based on window size
  useEffect(() => {
    const handleResize = () => {
      // Calculate appropriate height based on window size
      const height = window.innerHeight * 0.65; // 65% of viewport height
      setCalendarHeight(height);
    };
    
    handleResize(); // Set initial height
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Fetch sessions on component mount and when dependencies change
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, view, date]);
  
  // Format events for the calendar
  const formatEvents = (sessions) => {
    return sessions.map(session => ({
      id: session.id,
      title: getEventTitle(session),
      start: new Date(session.sessionDate),
      end: session.endDate ? new Date(session.endDate) : addHours(new Date(session.sessionDate), 1),
      status: session.status,
      confirmed: session.confirmed,
      client: session.client,
      trainer: session.trainer,
      location: session.location || 'Main Studio',
      notes: session.notes,
      sessionType: session.sessionType,
      allDay: false,
      resource: session
    }));
  };
  
  // Generate event title based on session data
  const getEventTitle = (session) => {
    if (session.status === 'available') {
      return `Available${session.trainer ? ` (${session.trainer.firstName})` : ''}`;
    } else if (session.status === 'requested') {
      return `Requested by ${session.client?.firstName || 'Client'}`;
    } else if (session.client) {
      const trainerInfo = session.trainer 
        ? ` with ${session.trainer.firstName}`
        : '';
      return `${session.client.firstName}${trainerInfo}`;
    } else {
      return `Session (${session.status})`;
    }
  };
  
  // Fetch sessions from the API
  const fetchSessions = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setIsLoading(false);
        return;
      }
      
      // Determine date range for the query based on current view
      let startDate, endDate;
      const now = new Date(date);
      
      if (view === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (view === 'week') {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else if (view === 'day') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else {
        // Agenda or any other view - show 2 weeks
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);
      }
      
      // Format dates for API
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();
      
      const response = await axios.get(`${API_BASE_URL}/api/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        }
      });
      
      const formattedEvents = formatEvents(response.data);
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      enqueueSnackbar('Failed to load schedule', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clicking on an event
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };
  
  // Handle clicking on an empty slot
  const handleSelectSlot = (slotInfo) => {
    if (user.role === 'admin') {
      // Admins can create available slots
      // You can implement this functionality
    } else {
      // Clients can request sessions
      setSelectedSlot(slotInfo);
      setShowRequestDialog(true);
    }
  };
  
  // Handle booking an available session
  const handleBookSession = async () => {
    if (!selectedEvent || selectedEvent.status !== 'available') return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/schedule/book`, 
        { sessionId: selectedEvent.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowEventDialog(false);
      fetchSessions();
      enqueueSnackbar('Session booked successfully', { variant: 'success' });
      
      // If session was deducted, show message
      if (response.data.deductionResult?.deducted) {
        enqueueSnackbar(
          `Session deducted. Remaining sessions: ${response.data.deductionResult.remainingSessions}`, 
          { variant: 'info' }
        );
      }
    } catch (error) {
      console.error('Error booking session:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to book session', 
        { variant: 'error' }
      );
    }
  };
  
  // Handle canceling a session
  const handleCancelSession = async () => {
    if (!selectedEvent) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_BASE_URL}/api/schedule/cancel/${selectedEvent.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowEventDialog(false);
      fetchSessions();
      enqueueSnackbar('Session cancelled successfully', { variant: 'info' });
    } catch (error) {
      console.error('Error cancelling session:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to cancel session', 
        { variant: 'error' }
      );
    }
  };
  
  // Handle confirming a session (admin/trainer only)
  const handleConfirmSession = async () => {
    if (!selectedEvent || !['admin', 'trainer'].includes(user.role)) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/schedule/confirm/${selectedEvent.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowEventDialog(false);
      fetchSessions();
      enqueueSnackbar('Session confirmed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error confirming session:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to confirm session', 
        { variant: 'error' }
      );
    }
  };
  
  // Handle completing a session (admin/trainer only)
  const handleCompleteSession = async () => {
    if (!selectedEvent || !['admin', 'trainer'].includes(user.role)) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/schedule/complete/${selectedEvent.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowEventDialog(false);
      fetchSessions();
      enqueueSnackbar('Session marked as complete', { variant: 'success' });
    } catch (error) {
      console.error('Error completing session:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to complete session', 
        { variant: 'error' }
      );
    }
  };
  
  // Handle requesting a session
  const handleRequestSession = async () => {
    if (!selectedSlot || !requestNote) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_BASE_URL}/api/schedule/request`,
        {
          start: selectedSlot.start.toISOString(),
          end: selectedSlot.end.toISOString(),
          notes: requestNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowRequestDialog(false);
      setRequestNote('');
      fetchSessions();
      enqueueSnackbar('Session request submitted', { variant: 'success' });
    } catch (error) {
      console.error('Error requesting session:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to request session', 
        { variant: 'error' }
      );
    }
  };
  
  // Calendar event styling
  const eventStyleGetter = (event) => {
    const statusColors = {
      available: theme.palette.success.main,
      requested: theme.palette.warning.main,
      scheduled: theme.palette.primary.main,
      confirmed: theme.palette.secondary.main,
      completed: theme.palette.info.dark,
      cancelled: theme.palette.error.main
    };
    
    const backgroundColor = statusColors[event.status] || theme.palette.primary.main;
    
    return {
      style: {
        backgroundColor: 'transparent' // Custom component handles styling
      }
    };
  };
  
  // Render function for each calendar event
  const eventPropGetter = (event) => {
    return {
      style: {
        padding: 0,
        margin: 0,
        borderRadius: 0
      }
    };
  };
  
  return (
    <MainCard title={
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar 
          src={logoPath} 
          variant="rounded" 
          sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
        />
        <Typography variant="h3">Swan Studios Schedule</Typography>
      </Box>
    }>
      <style>
        {pulseKeyframes}
      </style>
      
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <SubCard>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                icon={<EventIcon />} 
                label="Available" 
                sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark }}
              />
              <Chip 
                icon={<EventIcon />} 
                label="Scheduled" 
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.dark }}
              />
              <Chip 
                icon={<EventIcon />} 
                label="Confirmed" 
                sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.dark }}
              />
              <Chip 
                icon={<EventIcon />} 
                label="Requested" 
                sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark }}
              />
              <Chip 
                icon={<EventIcon />} 
                label="Completed" 
                sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.dark }}
              />
              <Chip 
                icon={<EventIcon />} 
                label="Cancelled" 
                sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.dark }}
              />
            </Box>
            
            <Box sx={{ 
              height: calendarHeight, 
              position: 'relative',
              pb: 2
            }}>
              {isLoading && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.background.paper, 0.7),
                  zIndex: 5
                }}>
                  <CircularProgress />
                </Box>
              )}
              
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                selectable
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                style={{ height: '100%' }}
                defaultView={Views.WEEK}
                views={['month', 'week', 'day', 'agenda']}
                onView={setView}
                date={date}
                onNavigate={setDate}
                eventPropGetter={eventPropGetter}
                components={{
                  event: CustomEvent
                }}
                tooltipAccessor={null} // Disable default tooltips in favor of our custom ones
                popup
                step={60}
                timeslots={1}
              />
            </Box>
          </SubCard>
        </Grid>
      </Grid>
      
      {/* Session Details Dialog */}
      <Dialog
        open={showEventDialog}
        onClose={() => setShowEventDialog(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          elevation: 5,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          {selectedEvent?.status === 'available' ? 'Book Session' : 'Session Details'}
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedEvent && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    {format(new Date(selectedEvent.start), 'EEEE, MMMM d, yyyy')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimeIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    {format(new Date(selectedEvent.start), 'h:mm a')} - {format(new Date(selectedEvent.end), 'h:mm a')}
                  </Typography>
                </Box>
              </Grid>
              
              {selectedEvent.location && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {selectedEvent.location}
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedEvent.client && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      Client: {selectedEvent.client.firstName} {selectedEvent.client.lastName}
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedEvent.trainer && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      Trainer: {selectedEvent.trainer.firstName} {selectedEvent.trainer.lastName}
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedEvent.notes && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <MessageIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
                    <div>
                      <Typography variant="body2" fontWeight="bold">Notes:</Typography>
                      <Typography variant="body2">{selectedEvent.notes}</Typography>
                    </div>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EventIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    Status: <Chip 
                      size="small"
                      label={selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                      color={
                        selectedEvent.status === 'available' ? 'success' :
                        selectedEvent.status === 'scheduled' ? 'primary' :
                        selectedEvent.status === 'confirmed' ? 'secondary' :
                        selectedEvent.status === 'requested' ? 'warning' :
                        selectedEvent.status === 'completed' ? 'info' : 'error'
                      }
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowEventDialog(false)}
          >
            Close
          </Button>
          
          {/* Book button - for available sessions */}
          {selectedEvent?.status === 'available' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<EventIcon />}
              onClick={handleBookSession}
            >
              Book Session
            </Button>
          )}
          
          {/* Cancel button - for user's own bookings */}
          {selectedEvent?.status === 'scheduled' &&
           selectedEvent?.client?.id === user?.id && (
            <Button
              variant="contained"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancelSession}
            >
              Cancel
            </Button>
          )}
          
          {/* Admin/Trainer actions */}
          {['admin', 'trainer'].includes(user?.role) && (
            <>
              {/* Confirm button - for requested or scheduled sessions */}
              {['requested', 'scheduled'].includes(selectedEvent?.status) && !selectedEvent?.confirmed && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ConfirmIcon />}
                  onClick={handleConfirmSession}
                >
                  Confirm
                </Button>
              )}
              
              {/* Complete button - for confirmed or scheduled sessions */}
              {['confirmed', 'scheduled'].includes(selectedEvent?.status) && (
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<CompleteIcon />}
                  onClick={handleCompleteSession}
                >
                  Complete
                </Button>
              )}
              
              {/* Cancel button - admin can cancel any non-cancelled session */}
              {selectedEvent?.status !== 'cancelled' && user?.role === 'admin' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelSession}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Request Session Dialog */}
      <Dialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          elevation: 5,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          Request a Training Session
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {selectedSlot && format(new Date(selectedSlot.start), 'EEEE, MMMM d, yyyy')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TimeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {selectedSlot && format(new Date(selectedSlot.start), 'h:mm a')} - {selectedSlot && format(new Date(selectedSlot.end), 'h:mm a')}
                </Typography>
              </Box>
              
              <TextField
                label="Tell us about your training goals for this session"
                multiline
                rows={4}
                fullWidth
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                required
                placeholder="Please share any details about what you'd like to focus on in this session..."
                sx={{ mt: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => setShowRequestDialog(false)}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            disabled={!requestNote}
            onClick={handleRequestSession}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default Schedule;