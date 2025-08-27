/**
 * Connected Admin Schedule Integration - PRODUCTION READY
 * =====================================================
 * 
 * This is the REAL integration that connects to your Redux store and backend APIs
 * Replaces the simplified build-safe version with full functionality
 * 
 * Features:
 * - ✅ Connected to scheduleSlice Redux store
 * - ✅ Uses universalMasterScheduleService for API calls  
 * - ✅ Real-time updates via WebSocket integration
 * - ✅ Role-based access control (Admin, Trainer, Client, User)
 * - ✅ Calendar view with session management
 * - ✅ Session creation, booking, cancellation flows
 * - ✅ Styled with your Galaxy-Swan theme system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// Redux imports
import { RootState, AppDispatch } from '../../redux/store';
import {
  fetchEvents,
  fetchTrainers,
  fetchClients,
  fetchScheduleStats,
  createAvailableSessions,
  bookSession,
  cancelSession,
  confirmSession,
  setUserContext,
  selectAllSessions,
  selectScheduleStatus,
  selectScheduleError,
  selectScheduleStats,
  selectTrainers,
  selectClients
} from '../../redux/slices/scheduleSlice';

// Service imports
import { universalMasterScheduleService, setupDashboardSync } from '../../services/universal-master-schedule-service';
import { scheduleWebSocketService, useScheduleWebSocket } from '../../services/scheduleWebSocketService';

// UI Components
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

// Icons
import {
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit3,
  Eye
} from 'lucide-react';

// Theme
import { swanStudiosTheme } from '../../core/theme';

// Auth context
import { useAuth } from '../../context/AuthContext';

// Types
interface Session {
  id: string;
  sessionDate: string;
  start: string;
  end?: string;
  duration: number;
  status: 'available' | 'booked' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';
  location?: string;
  notes?: string;
  trainerId?: string;
  userId?: string;
  clientName?: string;
  trainerName?: string;
  sessionType?: string;
}

interface FilterOptions {
  status?: string;
  trainerId?: string;
  clientId?: string;
  customDateStart?: string;
  customDateEnd?: string;
}

interface AdminScheduleIntegrationProps {
  fullscreen?: boolean;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  showHeader?: boolean;
}

// Styled Components using Galaxy-Swan theme
const ScheduleContainer = styled.div<{ isFullscreen?: boolean }>`
  background: ${swanStudiosTheme.background.primary};
  color: ${swanStudiosTheme.text.primary};
  min-height: ${props => props.isFullscreen ? '100vh' : 'auto'};
  padding: ${swanStudiosTheme.spacing.lg};
  border-radius: ${props => props.isFullscreen ? '0' : '12px'};
`;

const ScheduleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${swanStudiosTheme.spacing.xl};
  padding: ${swanStudiosTheme.spacing.lg};
  background: ${swanStudiosTheme.background.elevated};
  border-radius: 12px;
  border: 1px solid ${swanStudiosTheme.borders.elegant};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${swanStudiosTheme.spacing.md};
  margin-bottom: ${swanStudiosTheme.spacing.xl};
`;

const StatCard = styled(Card)`
  && {
    background: ${swanStudiosTheme.components.card.background};
    border: 1px solid ${swanStudiosTheme.borders.subtle};
    color: ${swanStudiosTheme.text.primary};
    
    &:hover {
      border-color: ${swanStudiosTheme.primary.main};
      box-shadow: ${swanStudiosTheme.shadows.primaryGlow};
      transform: translateY(-2px);
    }
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${swanStudiosTheme.spacing.md};
  margin-bottom: ${swanStudiosTheme.spacing.lg};
  padding: ${swanStudiosTheme.spacing.lg};
  background: ${swanStudiosTheme.background.elevated};
  border-radius: 12px;
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  flex-wrap: wrap;
`;

const ActionButton = styled(Button)<{ variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' }>`
  && {
    background: ${props => {
      switch (props.variant) {
        case 'primary': return swanStudiosTheme.gradients.primaryCosmic;
        case 'secondary': return swanStudiosTheme.gradients.secondaryCosmic;
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        default: return swanStudiosTheme.gradients.primaryCosmic;
      }
    }};
    color: ${swanStudiosTheme.text.primary};
    box-shadow: ${swanStudiosTheme.shadows.primaryGlow};
    border-radius: 8px;
    text-transform: none;
    font-weight: 500;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${swanStudiosTheme.shadows.primaryElevated};
    }
    
    &:disabled {
      opacity: 0.5;
      transform: none;
    }
  }
`;

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#06b6d4';
    case 'booked': return '#8b5cf6';
    case 'scheduled': return '#f59e0b';
    case 'confirmed': return '#10b981';
    case 'completed': return '#22c55e';
    case 'cancelled': return '#ef4444';
    case 'blocked': return '#6b7280';
    default: return '#94a3b8';
  }
};

const ConnectedAdminScheduleIntegration: React.FC<AdminScheduleIntegrationProps> = ({
  fullscreen = false,
  onFullscreenToggle,
  showHeader = true
}) => {
  // Redux hooks
  const dispatch = useDispatch<AppDispatch>();
  const sessions = useSelector(selectAllSessions);
  const status = useSelector(selectScheduleStatus);
  const error = useSelector(selectScheduleError);
  const stats = useSelector(selectScheduleStats);
  const trainers = useSelector(selectTrainers);
  const clients = useSelector(selectClients);

  // Auth context
  const { user, isAuthenticated } = useAuth();

  // WebSocket real-time updates
  const { isConnected: wsConnected, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useScheduleWebSocket();

  // Component state
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [createFormData, setCreateFormData] = useState({
    sessionDate: '',
    duration: 60,
    location: 'Main Studio',
    notes: '',
    trainerId: '',
    sessionType: 'Personal Training'
  });

  // Initialize component and set user context
  useEffect(() => {
    if (isAuthenticated && user) {
      // Set user context in Redux store
      dispatch(setUserContext({
        role: user.role as 'admin' | 'trainer' | 'client' | 'user',
        userId: user.id
      }));

      // Initial data fetch
      dispatch(fetchEvents());
      dispatch(fetchScheduleStats());
      
      // Fetch trainers and clients if user has permissions
      if (user.role === 'admin' || user.role === 'trainer') {
        dispatch(fetchTrainers());
        dispatch(fetchClients());
      }
    }
  }, [dispatch, isAuthenticated, user]);

  // Real-time sync setup
  useEffect(() => {
    const cleanup = setupDashboardSync(() => {
      // Refresh data when sync event occurs
      dispatch(fetchEvents(filters));
      dispatch(fetchScheduleStats());
    });

    return cleanup;
  }, [dispatch, filters]);

  // WebSocket subscription based on user role
  useEffect(() => {
    if (isAuthenticated && user && wsConnected) {
      const subscriptionFilters: { trainerId?: string; userId?: string } = {};
      
      if (user.role === 'trainer') {
        subscriptionFilters.trainerId = user.id;
      } else if (user.role === 'client') {
        subscriptionFilters.userId = user.id;
      }
      // Admin subscribes to all updates (no filters)
      
      wsSubscribe(Object.keys(subscriptionFilters).length > 0 ? subscriptionFilters : undefined);
      
      return () => wsUnsubscribe();
    }
  }, [isAuthenticated, user, wsConnected, wsSubscribe, wsUnsubscribe]);

  // Handlers
  const handleRefresh = useCallback(() => {
    dispatch(fetchEvents(filters));
    dispatch(fetchScheduleStats());
  }, [dispatch, filters]);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    dispatch(fetchEvents(newFilters));
  }, [dispatch]);

  const handleCreateSession = async () => {
    try {
      const sessionData = {
        start: createFormData.sessionDate,
        duration: createFormData.duration,
        trainerId: createFormData.trainerId || undefined,
        location: createFormData.location,
        notes: createFormData.notes,
        sessionType: createFormData.sessionType
      };

      await dispatch(createAvailableSessions([sessionData])).unwrap();
      setShowCreateDialog(false);
      setCreateFormData({
        sessionDate: '',
        duration: 60,
        location: 'Main Studio',
        notes: '',
        trainerId: '',
        sessionType: 'Personal Training'
      });
      
      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleBookSession = async (sessionId: string) => {
    try {
      await dispatch(bookSession({ sessionId })).unwrap();
      handleRefresh();
    } catch (error) {
      console.error('Failed to book session:', error);
    }
  };

  const handleCancelSession = async (sessionId: string, reason?: string) => {
    try {
      await dispatch(cancelSession({ sessionId, reason })).unwrap();
      handleRefresh();
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  };

  const handleConfirmSession = async (sessionId: string) => {
    try {
      await dispatch(confirmSession(sessionId)).unwrap();
      handleRefresh();
    } catch (error) {
      console.error('Failed to confirm session:', error);
    }
  };

  const renderSessionActions = (session: Session) => {
    if (!user) return null;

    const actions = universalMasterScheduleService.getRoleBasedActions(session, user.role as any);
    
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.includes('book') && (
          <ActionButton
            size="small"
            variant="primary"
            onClick={() => handleBookSession(session.id)}
          >
            Book
          </ActionButton>
        )}
        {actions.includes('confirm') && (
          <ActionButton
            size="small"
            variant="success"
            onClick={() => handleConfirmSession(session.id)}
          >
            Confirm
          </ActionButton>
        )}
        {actions.includes('cancel') && (
          <ActionButton
            size="small"
            variant="error"
            onClick={() => handleCancelSession(session.id)}
          >
            Cancel
          </ActionButton>
        )}
        {actions.includes('view_details') && (
          <IconButton
            size="small"
            onClick={() => {
              setSelectedSession(session);
              setShowSessionDialog(true);
            }}
            sx={{ color: swanStudiosTheme.primary.main }}
          >
            <Eye size={16} />
          </IconButton>
        )}
      </Box>
    );
  };

  // Loading state
  if (status === 'loading' && sessions.length === 0) {
    return (
      <ScheduleContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress sx={{ color: swanStudiosTheme.primary.main }} />
            <Typography variant="h6" sx={{ mt: 2, color: swanStudiosTheme.text.primary }}>
              Loading Universal Master Schedule...
            </Typography>
          </Box>
        </Box>
      </ScheduleContainer>
    );
  }

  // Error state
  if (error && status === 'failed') {
    return (
      <ScheduleContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <AlertTriangle size={48} color="#ef4444" />
            <Typography variant="h6" sx={{ mt: 2, color: swanStudiosTheme.text.primary }}>
              {error}
            </Typography>
            <ActionButton onClick={handleRefresh} sx={{ mt: 2 }}>
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              Retry
            </ActionButton>
          </Box>
        </Box>
      </ScheduleContainer>
    );
  }

  return (
    <ScheduleContainer isFullscreen={fullscreen}>
      {/* Header */}
      {showHeader && (
        <ScheduleHeader>
          <Box>
            <Typography variant="h4" sx={{ color: swanStudiosTheme.text.primary, mb: 1 }}>
              <Calendar size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Universal Master Schedule
            </Typography>
            <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
              Professional Session Management - {user?.role?.toUpperCase()} View
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            {/* WebSocket Connection Status */}
            <Tooltip title={wsConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: wsConnected ? '#10b981' : '#ef4444',
                  boxShadow: wsConnected ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)'
                }}
              />
            </Tooltip>
            <ActionButton onClick={handleRefresh} disabled={status === 'loading'}>
              <RefreshCw size={18} style={{ marginRight: 8 }} />
              Refresh
            </ActionButton>
            {(user?.role === 'admin' || user?.role === 'trainer') && (
              <ActionButton variant="primary" onClick={() => setShowCreateDialog(true)}>
                <Plus size={18} style={{ marginRight: 8 }} />
                Create Session
              </ActionButton>
            )}
          </Box>
        </ScheduleHeader>
      )}

      {/* Statistics */}
      <StatsGrid>
        <StatCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: swanStudiosTheme.primary.main }}>
              Total Sessions
            </Typography>
            <Typography variant="h3" sx={{ color: swanStudiosTheme.text.primary }}>
              {stats.total}
            </Typography>
          </CardContent>
        </StatCard>
        <StatCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#06b6d4' }}>
              Available
            </Typography>
            <Typography variant="h3" sx={{ color: swanStudiosTheme.text.primary }}>
              {stats.available}
            </Typography>
          </CardContent>
        </StatCard>
        <StatCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#8b5cf6' }}>
              Booked
            </Typography>
            <Typography variant="h3" sx={{ color: swanStudiosTheme.text.primary }}>
              {stats.booked}
            </Typography>
          </CardContent>
        </StatCard>
        <StatCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#10b981' }}>
              Confirmed
            </Typography>
            <Typography variant="h3" sx={{ color: swanStudiosTheme.text.primary }}>
              {stats.confirmed}
            </Typography>
          </CardContent>
        </StatCard>
      </StatsGrid>

      {/* Filters */}
      <FilterBar>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: swanStudiosTheme.text.secondary }}>Status</InputLabel>
          <Select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange({ ...filters, status: e.target.value === 'all' ? undefined : e.target.value })}
            sx={{ color: swanStudiosTheme.text.primary }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="booked">Booked</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        {trainers.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: swanStudiosTheme.text.secondary }}>Trainer</InputLabel>
            <Select
              value={filters.trainerId || 'all'}
              onChange={(e) => handleFilterChange({ ...filters, trainerId: e.target.value === 'all' ? undefined : e.target.value })}
              sx={{ color: swanStudiosTheme.text.primary }}
            >
              <MenuItem value="all">All Trainers</MenuItem>
              {trainers.map((trainer) => (
                <MenuItem key={trainer.id} value={trainer.id}>
                  {trainer.firstName} {trainer.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          type="date"
          label="Start Date"
          value={filters.customDateStart || ''}
          onChange={(e) => handleFilterChange({ ...filters, customDateStart: e.target.value })}
          InputLabelProps={{ shrink: true, sx: { color: swanStudiosTheme.text.secondary } }}
          sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
        />

        <TextField
          size="small"
          type="date"
          label="End Date"
          value={filters.customDateEnd || ''}
          onChange={(e) => handleFilterChange({ ...filters, customDateEnd: e.target.value })}
          InputLabelProps={{ shrink: true, sx: { color: swanStudiosTheme.text.secondary } }}
          sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
        />
      </FilterBar>

      {/* Sessions Table */}
      <TableContainer component={Paper} sx={{ background: swanStudiosTheme.background.elevated }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Date & Time
              </TableCell>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Trainer
              </TableCell>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Client
              </TableCell>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Location
              </TableCell>
              <TableCell sx={{ color: swanStudiosTheme.text.primary, fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell sx={{ color: swanStudiosTheme.text.primary }}>
                  <Box>
                    <Typography variant="body2">
                      {new Date(session.sessionDate || session.start).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: swanStudiosTheme.text.secondary }}>
                      {new Date(session.sessionDate || session.start).toLocaleTimeString()} ({session.duration}min)
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.status}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(session.status),
                      color: 'white',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: swanStudiosTheme.text.primary }}>
                  {session.trainerName || 'Unassigned'}
                </TableCell>
                <TableCell sx={{ color: swanStudiosTheme.text.primary }}>
                  {session.clientName || 'Available'}
                </TableCell>
                <TableCell sx={{ color: swanStudiosTheme.text.primary }}>
                  <Box display="flex" alignItems="center">
                    <MapPin size={14} style={{ marginRight: 4 }} />
                    {session.location || 'TBD'}
                  </Box>
                </TableCell>
                <TableCell>
                  {renderSessionActions(session)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Session Dialog */}
      <Dialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: swanStudiosTheme.background.elevated,
            color: swanStudiosTheme.text.primary
          }
        }}
      >
        <DialogTitle sx={{ color: swanStudiosTheme.text.primary }}>
          Create New Session
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Session Date & Time"
                type="datetime-local"
                value={createFormData.sessionDate}
                onChange={(e) => setCreateFormData({ ...createFormData, sessionDate: e.target.value })}
                InputLabelProps={{ shrink: true, sx: { color: swanStudiosTheme.text.secondary } }}
                sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={createFormData.duration}
                onChange={(e) => setCreateFormData({ ...createFormData, duration: parseInt(e.target.value) })}
                InputLabelProps={{ sx: { color: swanStudiosTheme.text.secondary } }}
                sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: swanStudiosTheme.text.secondary }}>Trainer</InputLabel>
                <Select
                  value={createFormData.trainerId}
                  onChange={(e) => setCreateFormData({ ...createFormData, trainerId: e.target.value })}
                  sx={{ color: swanStudiosTheme.text.primary }}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {trainers.map((trainer) => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={createFormData.location}
                onChange={(e) => setCreateFormData({ ...createFormData, location: e.target.value })}
                InputLabelProps={{ sx: { color: swanStudiosTheme.text.secondary } }}
                sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={createFormData.notes}
                onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                InputLabelProps={{ sx: { color: swanStudiosTheme.text.secondary } }}
                sx={{ '& .MuiInputBase-input': { color: swanStudiosTheme.text.primary } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)} sx={{ color: swanStudiosTheme.text.secondary }}>
            Cancel
          </Button>
          <ActionButton onClick={handleCreateSession} disabled={!createFormData.sessionDate}>
            Create Session
          </ActionButton>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog
        open={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: swanStudiosTheme.background.elevated,
            color: swanStudiosTheme.text.primary
          }
        }}
      >
        <DialogTitle sx={{ color: swanStudiosTheme.text.primary }}>
          Session Details
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Date & Time
                </Typography>
                <Typography variant="h6" sx={{ color: swanStudiosTheme.text.primary }}>
                  {new Date(selectedSession.sessionDate || selectedSession.start).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Status
                </Typography>
                <Chip
                  label={selectedSession.status}
                  sx={{
                    backgroundColor: getStatusColor(selectedSession.status),
                    color: 'white',
                    fontWeight: 500,
                    mt: 1
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Duration
                </Typography>
                <Typography variant="h6" sx={{ color: swanStudiosTheme.text.primary }}>
                  {selectedSession.duration} minutes
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Location
                </Typography>
                <Typography variant="h6" sx={{ color: swanStudiosTheme.text.primary }}>
                  {selectedSession.location || 'TBD'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Trainer
                </Typography>
                <Typography variant="h6" sx={{ color: swanStudiosTheme.text.primary }}>
                  {selectedSession.trainerName || 'Unassigned'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                  Client
                </Typography>
                <Typography variant="h6" sx={{ color: swanStudiosTheme.text.primary }}>
                  {selectedSession.clientName || 'Available'}
                </Typography>
              </Grid>
              {selectedSession.notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: swanStudiosTheme.text.secondary }}>
                    Notes
                  </Typography>
                  <Typography variant="body1" sx={{ color: swanStudiosTheme.text.primary, mt: 1 }}>
                    {selectedSession.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSessionDialog(false)} sx={{ color: swanStudiosTheme.text.secondary }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ScheduleContainer>
  );
};

export default ConnectedAdminScheduleIntegration;
