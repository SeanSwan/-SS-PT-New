// frontend/src/BerryAdmin/views/ScheduleManagement/index.js
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { io } from 'socket.io-client';
import { format, addDays, addHours, parseISO, getDay } from 'date-fns';
import axios from 'axios';

// To these correctly referenced imports:
import MainCard from '../../ui-component/cards/MainCard';
import SubCard from '../../ui-component/cards/SubCard';
import { gridSpacing } from '../../store/constant';


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
  useTheme,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Stack
} from '@mui/material';

// Material UI icons
import {
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  ScheduleOutlined as ScheduleIcon,
  PersonAdd as PersonAddIcon,
  Repeat as RepeatIcon,
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Loop as LoopIcon,
  DateRange as DateRangeIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

// Date pickers from MUI X
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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

// Days of week options for recurring sessions
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

// Common time slots for recurring sessions
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// Main Schedule Management component
const ScheduleManagement = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [events, setEvents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  
  // For creating available slots
  const [openSlotDialog, setOpenSlotDialog] = useState(false);
  const [slotDate, setSlotDate] = useState(new Date());
  const [slotTime, setSlotTime] = useState(new Date());
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotTrainer, setSlotTrainer] = useState('');
  const [slotLocation, setSlotLocation] = useState('Main Studio');
  
  // For creating recurring slots
  const [openRecurringDialog, setOpenRecurringDialog] = useState(false);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date());
  const [recurringEndDate, setRecurringEndDate] = useState(addDays(new Date(), 30));
  const [recurringDays, setRecurringDays] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [recurringTimes, setRecurringTimes] = useState(['09:00', '17:00']);
  const [recurringTrainer, setRecurringTrainer] = useState('');
  const [recurringLocation, setRecurringLocation] = useState('Main Studio');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  
  // For assigning trainers
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  
  // For session details
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  
  // For requests tab
  const [requestedSessions, setRequestedSessions] = useState([]);
  
  // Socket connection
  useEffect(() => {
    socket = io(API_BASE_URL);
    
    socket.on('connect', () => {
      console.log('Socket.io connected');
    });
    
    socket.on('sessions:updated', (data) => {
      console.log('Sessions updated:', data);
      fetchSessions();
      
      if (data.type === 'requested') {
        enqueueSnackbar('New session request received', { 
          variant: 'info',
          action: (key) => (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                setTabValue(1); // Switch to requests tab
                closeSnackbar(key);
              }}
            >
              View
            </Button>
          )
        });
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  // Fetch sessions on component mount and when dependencies change
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchSessions();
      fetchTrainers();
      fetchClients();
    }
  }, [user, view, date]);
  
  // Format events for the calendar
  const formatEvents = (sessions) => {
    return sessions.map(session => ({
      id: session.id,
      title: getEventTitle(session),
      start: new Date(session.sessionDate),
      end: session.endDate ? new Date(session.endDate) : addHours(new Date(session.sessionDate), session.duration || 60),
      status: session.status,
      confirmed: session.confirmed,
      client: session.client,
      trainer: session.trainer,
      location: session.location || 'Main Studio',
      notes: session.notes,
      privateNotes: session.privateNotes,
      sessionType: session.sessionType,
      duration: session.duration,
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
      
      // Filter out requested sessions for the Requests tab
      const requested = response.data.filter(session => session.status === 'requested');
      setRequestedSessions(requested);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      enqueueSnackbar('Failed to load schedule', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch trainers from the API
  const fetchTrainers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/auth/users/trainers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      enqueueSnackbar('Failed to load trainers', { variant: 'error' });
    }
  };
  
  // Fetch clients from the API
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/auth/users/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle clicking on an event in the calendar
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setPrivateNotes(event.privateNotes || '');
    setOpenDetailsDialog(true);
  };
  
  // Handle clicking on an empty slot in the calendar
  const handleSelectSlot = (slotInfo) => {
    // Set up the slot creation dialog
    setSlotDate(slotInfo.start);
    setSlotTime(slotInfo.start);
    setOpenSlotDialog(true);
  };
  
  // Rest of the component functionality continues...
  
  // ...
  
  // Logo path - import dynamically from your project
  const logoPath = '/static/images/logo.png'; // Update this with your logo path
  
  return (
    <MainCard 
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              src={logoPath} 
              variant="rounded" 
              sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
            />
            <Typography variant="h3">Schedule Management</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {requestedSessions.length > 0 && (
              <Chip
                icon={<NotificationsIcon />}
                label={`${requestedSessions.length} Requests`}
                color="warning"
                onClick={() => setTabValue(1)} // Switch to Requests tab
                sx={{ cursor: 'pointer' }}
              />
            )}
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenSlotDialog(true)}
            >
              Add Slot
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<RepeatIcon />}
              onClick={() => setOpenRecurringDialog(true)}
              sx={{ ml: 1 }}
            >
              Recurring
            </Button>
            
            <IconButton 
              color="primary" 
              onClick={fetchSessions}
              sx={{ ml: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      }
    >
      <style>
        {pulseKeyframes}
      </style>
      
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<CalendarIcon />} 
              iconPosition="start" 
              label="Calendar" 
            />
            <Tab 
              icon={<NotificationsIcon />} 
              iconPosition="start" 
              label={`Requests (${requestedSessions.length})`} 
            />
          </Tabs>
          
          {/* Calendar View */}
          {tabValue === 0 && (
            <SubCard>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip 
                  icon={<EventAvailableIcon />} 
                  label="Available" 
                  sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark }}
                />
                <Chip 
                  icon={<EventAvailableIcon />} 
                  label="Scheduled" 
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.dark }}
                />
                <Chip 
                  icon={<EventAvailableIcon />} 
                  label="Confirmed" 
                  sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.dark }}
                />
                <Chip 
                  icon={<EventAvailableIcon />} 
                  label="Requested" 
                  sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.dark }}
                />
                <Chip 
                  icon={<EventAvailableIcon />} 
                  label="Completed" 
                  sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.dark }}
                />
                <Chip 
                  icon={<EventBusyIcon />} 
                  label="Cancelled" 
                  sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.dark }}
                />
              </Box>
              
              <Box sx={{ 
                height: 700, 
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
                  eventPropGetter={eventStyleGetter}
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
          )}
          
          {/* Requests Tab */}
          {tabValue === 1 && (
            <SubCard>
              {requestedSessions.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="textSecondary">
                    No pending session requests
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {requestedSessions.map(session => (
                    <Grid item xs={12} sm={6} md={4} key={session.id}>
                      <Card 
                        elevation={3}
                        sx={{ 
                          position: 'relative',
                          overflow: 'visible',
                          '&:hover': { 
                            boxShadow: theme.shadows[10],
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s'
                          }
                        }}
                      >
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            top: -12,
                            right: 16,
                            zIndex: 1,
                            animation: 'pulse 1.5s infinite'
                          }}
                        >
                          <Chip 
                            label="New Request" 
                            color="warning"
                            size="small"
                          />
                        </Box>
                        
                        <CardContent>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <Typography variant="h5" gutterBottom>
                                {session.client?.firstName} {session.client?.lastName}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CalendarIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2">
                                  {format(new Date(session.sessionDate), 'EEEE, MMMM d, yyyy')}
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TimeIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                <Typography variant="body2">
                                  {format(new Date(session.sessionDate), 'h:mm a')} - 
                                  {session.endDate 
                                    ? format(new Date(session.endDate), ' h:mm a')
                                    : format(addHours(new Date(session.sessionDate), 1), ' h:mm a')}
                                </Typography>
                              </Box>
                            </Grid>
                            
                            {session.location && (
                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <LocationIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                  <Typography variant="body2">
                                    {session.location}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            
                            {session.notes && (
                              <Grid item xs={12}>
                                <Box sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 1 }}>
                                  <Typography variant="caption" fontWeight="bold">Notes:</Typography>
                                  <Typography variant="body2">{session.notes}</Typography>
                                </Box>
                              </Grid>
                            )}
                            
                            <Grid item xs={12}>
                              <Divider sx={{ my: 1 }} />
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Button
                                  variant="outlined"
                                  startIcon={<PersonAddIcon />}
                                  size="small"
                                  onClick={() => {
                                    setSelectedEvent({
                                      id: session.id,
                                      client: session.client
                                    });
                                    setOpenAssignDialog(true);
                                  }}
                                >
                                  Assign
                                </Button>
                                
                                <Button
                                  variant="contained"
                                  startIcon={<CheckIcon />}
                                  color="success"
                                  size="small"
                                  onClick={() => handleConfirmSession(session.id)}
                                >
                                  Confirm
                                </Button>
                                
                                <Button
                                  variant="outlined"
                                  startIcon={<CloseIcon />}
                                  color="error"
                                  size="small"
                                  onClick={() => handleCancelSession(session.id)}
                                >
                                  Decline
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </SubCard>
          )}
        </Grid>
      </Grid>
      
      {/* Dialogs would be included here... */}
      {/* Create Slot Dialog */}
      {/* Create Recurring Slots Dialog */}
      {/* Assign Trainer Dialog */}
      {/* Session Details Dialog */}
      
    </MainCard>
  );
};

export default ScheduleManagement;