import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// material-ui
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// project imports
import MainCard from '../../../ui/MainCard';
import { gridSpacing } from '../../../../store/constant';
import CustomEvent from './CustomEvent';

// icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import TodayIcon from '@mui/icons-material/Today';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';

// Localizer for the calendar view
const localizer = momentLocalizer(moment);

/**
 * Interface for session data coming from API
 */
interface Session {
  id: string;
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'available' | 'requested' | 'confirmed';
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for calendar event format
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: Session['status'];
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location?: string;
  notes?: string;
  resource?: any;
}

/**
 * Interface for filter state
 */
interface FilterState {
  status: string;
  clientName: string;
  trainerName: string;
  type: string;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Interface for edit session dialog
 */
interface EditSessionState extends Omit<Session, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

/**
 * AdminSessionsView Component
 *
 * A comprehensive admin dashboard for viewing and managing all client sessions with both
 * tabular and calendar views. This component integrates session management functionality
 * with visual scheduling capabilities.
 * 
 * Features:
 * - Toggle between table and calendar views
 * - Filter sessions by status, client, trainer, type, and date range
 * - Edit session details
 * - Cancel or mark sessions as complete
 * - Add new sessions with visual confirmation
 * - View session details in a consistent format across both views
 * - Status-based color coding for quick visual reference
 *
 * The component is designed with responsive layouts that adapt to different screen sizes,
 * making it usable on both desktop and tablet devices.
 */
const AdminSessionsView: React.FC = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [tabValue, setTabValue] = useState<number>(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [sessionTypes, setSessionTypes] = useState<string[]>(['Personal', 'Group', 'Assessment', 'Consultation']);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [editSessionData, setEditSessionData] = useState<EditSessionState>({
    clientId: '',
    clientName: '',
    trainerId: '',
    trainerName: '',
    type: '',
    status: 'scheduled',
    startTime: '',
    endTime: '',
    notes: ''
  });

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    clientName: '',
    trainerName: '',
    type: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  // Define status styles and labels for consistent UI representation
  const statusConfig = {
    'available': { label: 'Available', color: 'success', icon: <AccessTimeIcon fontSize="small" /> },
    'requested': { label: 'Requested', color: 'warning', icon: <PendingIcon fontSize="small" /> },
    'scheduled': { label: 'Scheduled', color: 'primary', icon: <ScheduleIcon fontSize="small" /> },
    'confirmed': { label: 'Confirmed', color: 'secondary', icon: <DoneIcon fontSize="small" /> },
    'completed': { label: 'Completed', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    'cancelled': { label: 'Cancelled', color: 'error', icon: <CloseIcon fontSize="small" /> },
    'no-show': { label: 'No Show', color: 'warning', icon: <CancelIcon fontSize="small" /> }
  };

  /**
   * Convert API session data to calendar events format
   * 
   * @param sessions Array of session objects from the API
   * @returns Array of events formatted for the calendar component
   */
  const sessionsToCalendarEvents = (sessions: Session[]): CalendarEvent[] => {
    return sessions.map(session => ({
      id: session.id,
      title: `${session.type} - ${session.clientName}`,
      start: new Date(session.startTime),
      end: new Date(session.endTime),
      status: session.status,
      client: {
        id: session.clientId,
        firstName: session.clientName.split(' ')[0] || '',
        lastName: session.clientName.split(' ')[1] || ''
      },
      trainer: {
        id: session.trainerId,
        firstName: session.trainerName.split(' ')[0] || '',
        lastName: session.trainerName.split(' ')[1] || ''
      },
      notes: session.notes
    }));
  };

  /**
   * Fetch sessions data from API
   */
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch sessions
        const sessionsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/sessions`);
        
        // Fetch trainers and clients for dropdown options
        const trainersResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/users/trainers`);
        const clientsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/users/clients`);
        
        // Format trainer and client data for dropdowns
        const formattedTrainers = trainersResponse.data.map((trainer: any) => ({
          id: trainer.id,
          name: `${trainer.firstName} ${trainer.lastName}`
        }));
        
        const formattedClients = clientsResponse.data.map((client: any) => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`
        }));
        
        setSessions(sessionsResponse.data);
        setFilteredSessions(sessionsResponse.data);
        setTrainers(formattedTrainers);
        setClients(formattedClients);
      } catch (error) {
        console.error('Error fetching sessions data:', error);
        // Implement better error handling here
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Apply filters whenever filter state or tab changes
   */
  useEffect(() => {
    applyFilters();
  }, [filters, tabValue, sessions]);

  /**
   * Apply all filters to the sessions data
   */
  const applyFilters = () => {
    let filtered = [...sessions];

    // Apply tab filter (status)
    if (tabValue === 0) {
      // All sessions - no status filter
    } else if (tabValue === 1) {
      filtered = filtered.filter(session => ['scheduled', 'confirmed', 'requested'].includes(session.status));
    } else if (tabValue === 2) {
      filtered = filtered.filter(session => session.status === 'completed');
    } else if (tabValue === 3) {
      filtered = filtered.filter(session => ['cancelled', 'no-show'].includes(session.status));
    }

    // Apply additional filters
    if (filters.status) {
      filtered = filtered.filter(session => session.status === filters.status);
    }

    if (filters.clientName) {
      filtered = filtered.filter(session => 
        session.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
      );
    }

    if (filters.trainerName) {
      filtered = filtered.filter(session => 
        session.trainerName.toLowerCase().includes(filters.trainerName.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter(session => session.type === filters.type);
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(session => new Date(session.startTime) >= new Date(filters.dateRange.start));
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(session => new Date(session.startTime) <= new Date(filters.dateRange.end));
    }

    setFilteredSessions(filtered);
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  /**
   * Handle view mode toggle (table/calendar)
   */
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'table' | 'calendar',
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  /**
   * Handle calendar view change (month/week/day)
   */
  const handleCalendarViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'month' | 'week' | 'day',
  ) => {
    if (newView !== null) {
      setCalendarView(newView);
    }
  };

  /**
   * Handle pagination page change
   */
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Open edit session dialog
   */
  const handleEditSession = (session: Session) => {
    setEditSessionData({
      id: session.id,
      clientId: session.clientId,
      clientName: session.clientName,
      trainerId: session.trainerId,
      trainerName: session.trainerName,
      type: session.type,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      notes: session.notes || ''
    });
    setEditDialogOpen(true);
  };

  /**
   * Handle calendar event selected
   */
  const handleCalendarEventSelect = (event: CalendarEvent) => {
    // Find the corresponding session
    const session = sessions.find(s => s.id === event.id);
    if (session) {
      handleEditSession(session);
    }
  };

  /**
   * Handle calendar date change
   */
  const handleCalendarNavigate = (date: Date) => {
    setCalendarDate(date);
  };

  /**
   * Handle calendar slot selection (to create new session)
   */
  const handleCalendarSlotSelect = ({ start, end }: { start: Date; end: Date }) => {
    setEditSessionData({
      clientId: '',
      clientName: '',
      trainerId: '',
      trainerName: '',
      type: 'Personal',
      status: 'scheduled',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: ''
    });
    setEditDialogOpen(true);
  };

  /**
   * Open new session dialog
   */
  const handleNewSession = () => {
    // Set default times for the session (next hour, one hour duration)
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1, 0, 0, 0); // Next hour, on the hour
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1); // One hour later
    
    setEditSessionData({
      clientId: '',
      clientName: '',
      trainerId: '',
      trainerName: '',
      type: 'Personal',
      status: 'scheduled',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: ''
    });
    setEditDialogOpen(true);
  };

  /**
   * Open delete confirmation dialog
   */
  const handleOpenDeleteDialog = (sessionId: string) => {
    setCurrentSession(sessionId);
    setDeleteDialogOpen(true);
  };

  /**
   * Close delete confirmation dialog
   */
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentSession(null);
  };

  /**
   * Save session changes
   */
  const handleSaveSession = async () => {
    try {
      const sessionData = {
        ...editSessionData,
        // Ensure dates are properly formatted
        startTime: new Date(editSessionData.startTime).toISOString(),
        endTime: new Date(editSessionData.endTime).toISOString()
      };

      let response;
      if (sessionData.id) {
        // Update existing session
        response = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/sessions/${sessionData.id}`,
          sessionData
        );
        
        // Update sessions list
        setSessions(sessions.map(session => 
          session.id === sessionData.id ? { ...response.data } : session
        ));
      } else {
        // Create new session
        response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/sessions`,
          sessionData
        );
        
        // Add new session to list
        setSessions([...sessions, response.data]);
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving session:', error);
      // Implement better error handling / notification here
    }
  };

  /**
   * Delete session
   */
  const handleDeleteSession = async () => {
    if (!currentSession) return;
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/sessions/${currentSession}`
      );
      
      // Remove session from list
      setSessions(sessions.filter(session => session.id !== currentSession));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting session:', error);
      // Implement better error handling here
    }
  };

  /**
   * Handle quick status change
   */
  const handleStatusChange = async (session: Session, newStatus: Session['status']) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/sessions/${session.id}/status`,
        { status: newStatus }
      );
      
      // Update sessions list
      setSessions(sessions.map(s => 
        s.id === session.id ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error('Error updating session status:', error);
      // Implement better error handling / notification here
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Calculate session duration in minutes
   */
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} mins`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
  };

  /**
   * Render session status chip with consistent styling
   */
  const renderStatusChip = (status: Session['status']) => {
    const statusInfo = statusConfig[status];
    return (
      <Chip
        icon={statusInfo.icon}
        label={statusInfo.label}
        color={statusInfo.color as any}
        size="small"
        variant="filled"
        sx={{ 
          fontWeight: 500,
          '& .MuiChip-icon': {
            marginLeft: '4px'
          }
        }}
      />
    );
  };

  /**
   * Custom calendar event styling
   */
  const eventStyleGetter = (event: CalendarEvent) => {
    const statusColor = {
      available: theme.palette.success.main,
      requested: theme.palette.warning.main,
      scheduled: theme.palette.primary.main,
      confirmed: theme.palette.secondary.main,
      completed: theme.palette.success.dark,
      cancelled: theme.palette.error.main,
      'no-show': theme.palette.error.light
    };

    const backgroundColor = statusColor[event.status] || theme.palette.primary.main;
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: theme.palette.getContrastText(backgroundColor),
        border: 'none',
        display: 'block'
      }
    };
  };

  /**
   * Render filter controls
   */
  const renderFilters = () => {
    return (
      <Grid container spacing={2} sx={{ mb: 2, mt: 1 }}>
        <Grid xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="requested">Requested</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="no-show">No Show</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid xs={12} md={2}>
          <TextField
            fullWidth
            label="Client"
            size="small"
            value={filters.clientName}
            onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
          />
        </Grid>
        <Grid xs={12} md={2}>
          <TextField
            fullWidth
            label="Trainer"
            size="small"
            value={filters.trainerName}
            onChange={(e) => setFilters({ ...filters, trainerName: e.target.value })}
          />
        </Grid>
        <Grid xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="type-filter-label">Session Type</InputLabel>
            <Select
              labelId="type-filter-label"
              value={filters.type}
              label="Session Type"
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {sessionTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid xs={12} md={2}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateRange.start}
            onChange={(e) => setFilters({ 
              ...filters, 
              dateRange: { 
                ...filters.dateRange, 
                start: e.target.value 
              } 
            })}
          />
        </Grid>
        <Grid xs={12} md={2}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateRange.end}
            onChange={(e) => setFilters({ 
              ...filters, 
              dateRange: { 
                ...filters.dateRange, 
                end: e.target.value 
              } 
            })}
          />
        </Grid>
      </Grid>
    );
  };

  /**
   * Render table view
   */
  const renderTableView = () => {
    return (
      <>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="sessions table">
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Trainer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="subtitle1" color="textSecondary">
                      No sessions found matching your criteria
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
                          {session.clientName}
                        </Box>
                      </TableCell>
                      <TableCell>{session.trainerName}</TableCell>
                      <TableCell>{session.type}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TodayIcon sx={{ mr: 1, color: 'secondary.main' }} fontSize="small" />
                          {formatDate(session.startTime)}
                        </Box>
                      </TableCell>
                      <TableCell>{calculateDuration(session.startTime, session.endTime)}</TableCell>
                      <TableCell>{renderStatusChip(session.status)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {/* Show different actions based on status */}
                          {['scheduled', 'confirmed', 'requested'].includes(session.status) && (
                            <>
                              <Tooltip title="Mark Complete">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleStatusChange(session, 'completed')}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel Session">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleStatusChange(session, 'cancelled')}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditSession(session)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(session.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredSessions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  };

  /**
   * Render calendar view
   */
  const renderCalendarView = () => {
    const calendarEvents = sessionsToCalendarEvents(filteredSessions);
    
    return (
      <Box sx={{ height: 700, mt: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={calendarView}
            exclusive
            onChange={handleCalendarViewChange}
            aria-label="calendar view"
            size="small"
          >
            <ToggleButton value="month" aria-label="month view">
              Month
            </ToggleButton>
            <ToggleButton value="week" aria-label="week view">
              Week
            </ToggleButton>
            <ToggleButton value="day" aria-label="day view">
              Day
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          view={calendarView}
          views={['month', 'week', 'day']}
          step={30}
          defaultView="week"
          date={calendarDate}
          onNavigate={handleCalendarNavigate}
          onSelectEvent={handleCalendarEventSelect}
          onSelectSlot={handleCalendarSlotSelect}
          selectable
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent as any
          }}
          style={{ height: 'calc(100% - 40px)' }}
          formats={{
            timeGutterFormat: (date: Date, culture: any, localizer: any) => 
              localizer.format(date, 'h:mm a', culture),
            dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }, culture: any, localizer: any) =>
              `${localizer.format(start, 'MMM D', culture)} - ${localizer.format(end, 'MMM D, yyyy', culture)}`
          }}
          dayPropGetter={(date) => {
            const today = new Date();
            return {
              style: {
                backgroundColor: date.getDate() === today.getDate() && 
                               date.getMonth() === today.getMonth() && 
                               date.getFullYear() === today.getFullYear() 
                              ? alpha(theme.palette.primary.light, 0.1)
                              : undefined
              }
            };
          }}
        />
      </Box>
    );
  };

  return (
    <MainCard title="Session Management" 
      secondary={
        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="table" aria-label="table view">
              <ListAltIcon />
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="calendar view">
              <CalendarViewMonthIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNewSession}
            startIcon={<AccessTimeIcon />}
          >
            New Session
          </Button>
        </Stack>
      }
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={gridSpacing}>
              <Grid xs={12} md={9}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                >
                  <Tab label="All Sessions" />
                  <Tab label="Upcoming" />
                  <Tab label="Completed" />
                  <Tab label="Cancelled" />
                </Tabs>
              </Grid>
              <Grid xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button
                  startIcon={<FilterListIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                  color="secondary"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {showFilters && renderFilters()}

          {/* Render the selected view (table or calendar) */}
          {viewMode === 'table' ? renderTableView() : renderCalendarView()}

          {/* Edit Session Dialog */}
          <Dialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editSessionData.id ? 'Edit Session' : 'Create New Session'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="client-select-label">Client</InputLabel>
                    <Select
                      labelId="client-select-label"
                      value={editSessionData.clientId}
                      input={<OutlinedInput label="Client" />}
                      onChange={(e) => {
                        const selectedClient = clients.find(client => client.id === e.target.value);
                        setEditSessionData({
                          ...editSessionData,
                          clientId: e.target.value as string,
                          clientName: selectedClient ? selectedClient.name : ''
                        });
                      }}
                    >
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="trainer-select-label">Trainer</InputLabel>
                    <Select
                      labelId="trainer-select-label"
                      value={editSessionData.trainerId}
                      input={<OutlinedInput label="Trainer" />}
                      onChange={(e) => {
                        const selectedTrainer = trainers.find(trainer => trainer.id === e.target.value);
                        setEditSessionData({
                          ...editSessionData,
                          trainerId: e.target.value as string,
                          trainerName: selectedTrainer ? selectedTrainer.name : ''
                        });
                      }}
                    >
                      {trainers.map((trainer) => (
                        <MenuItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="session-type-label">Session Type</InputLabel>
                    <Select
                      labelId="session-type-label"
                      value={editSessionData.type}
                      input={<OutlinedInput label="Session Type" />}
                      onChange={(e) => setEditSessionData({
                        ...editSessionData,
                        type: e.target.value
                      })}
                    >
                      {sessionTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      value={editSessionData.status}
                      input={<OutlinedInput label="Status" />}
                      onChange={(e) => setEditSessionData({
                        ...editSessionData,
                        status: e.target.value as Session['status']
                      })}
                    >
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="requested">Requested</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="confirmed">Confirmed</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                      <MenuItem value="no-show">No Show</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date & Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={editSessionData.startTime ? new Date(editSessionData.startTime).toISOString().substring(0, 16) : ''}
                    onChange={(e) => setEditSessionData({
                      ...editSessionData,
                      startTime: e.target.value
                    })}
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date & Time"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={editSessionData.endTime ? new Date(editSessionData.endTime).toISOString().substring(0, 16) : ''}
                    onChange={(e) => setEditSessionData({
                      ...editSessionData,
                      endTime: e.target.value
                    })}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={4}
                    value={editSessionData.notes}
                    onChange={(e) => setEditSessionData({
                      ...editSessionData,
                      notes: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" color="primary" onClick={handleSaveSession}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={handleCloseDeleteDialog}
          >
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this session? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button variant="contained" color="error" onClick={handleDeleteSession}>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </MainCard>
  );
};

export default AdminSessionsView;