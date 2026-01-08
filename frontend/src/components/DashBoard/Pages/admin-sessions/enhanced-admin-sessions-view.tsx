import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";
import { useSocket } from "../../../../hooks/use-socket";
import GlowButton from '../../../ui/buttons/GlowButton'; // Ensure path is correct
import SessionTestControls from './session-test-controls';
import services from '../../../../services/index';
import apiService from '../../../../services/api.service'; // Import apiService directly

// Import Schedule Components
import ScheduleErrorBoundary from '../../../Schedule/ScheduleErrorBoundary';
import ScheduleInitializer from '../../../Schedule/ScheduleInitializer';
import UnifiedCalendar from '../../../Schedule/schedule';

// Import Icons
import {
  Search,
  Edit,
  // FileText, // Not used?
  Calendar,
  Clock,
  User,
  // Filter, // Not used?
  Plus,
  Download,
  Eye,
  CheckCircle,
  // XCircle, // Not used?
  // AlarmClock, // Not used?
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Trash2,
  RefreshCw,
  Zap,
  CheckSquare,
  TableIcon,
  CalendarDays,
  // UserPlus // Not used?
} from 'lucide-react';

// Material UI Components
import {
  Table,
  TableBody,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Grid,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Avatar,
  Chip,
  Checkbox,
  // Badge, // Not used?
  // Tooltip // Not used?
  Box as MuiBox // Use MUI Box directly if needed
} from '@mui/material';

// Styled Components
import {
  PageContainer,
  ContentContainer,
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  StatsGridContainer,
  StatsCard,
  StatsIconContainer,
  StatsValue,
  StatsLabel,
  FilterContainer,
  SearchField,
  FilterButtonsContainer,
  FilterButton,
  StyledTableContainer,
  StyledTableHead,
  StyledTableHeadCell,
  StyledTableCell,
  StyledTableRow,
  ChipContainer,
  IconButtonContainer,
  StyledIconButton,
  FooterActionsContainer,
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  StyledDialog,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from './styled-admin-sessions'; // Ensure path is correct

const BulkActionsBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: white;
  backdrop-filter: blur(5px);
`;


// Interface for client data
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  availableSessions: number;
}

// Interface for trainer data
interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  specialties?: string;
}

// Interface for session data
interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null; // Allow null for available sessions
  trainerId: string | null; // Allow null
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: Client | null; // Allow null
  trainer?: Trainer | null; // Allow null
}

/**
 * Enhanced Admin Sessions View Component
 *
 * Provides a modern, animated interface for managing training sessions
 * with improved styling, animations, and user experience.
 */
const EnhancedAdminSessionsView: React.FC = () => {
  const { user } = useAuth(); // Remove authAxios destructuring
  const { toast } = useToast();

  // State for data, loading and errors
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  // Connect to WebSocket for real-time updates
  const { lastMessage } = useSocket('/ws/admin-dashboard');

  // State for UI controls
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'sessionDate', direction: 'descending' });
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');

  // State for dialogs
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openAddSessionsDialog, setOpenAddSessionsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [sessionsToAdd, setSessionsToAdd] = useState<number>(1);
  const [addSessionsNote, setAddSessionsNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for view toggle (table vs calendar)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Form state for edit session
  const [editSessionDate, setEditSessionDate] = useState<string>('');
  const [editSessionTime, setEditSessionTime] = useState<string>('');
  const [editSessionDuration, setEditSessionDuration] = useState<number>(60);
  const [editSessionLocation, setEditSessionLocation] = useState<string>('');
  const [editSessionNotes, setEditSessionNotes] = useState<string>('');
  const [editSessionStatus, setEditSessionStatus] = useState<Session['status']>('scheduled');
  const [editSessionClient, setEditSessionClient] = useState<string>('');
  const [editSessionTrainer, setEditSessionTrainer] = useState<string>('');

  // Form state for new session
  const [newSessionDate, setNewSessionDate] = useState<string>('');
  const [newSessionTime, setNewSessionTime] = useState<string>('');
  const [newSessionDuration, setNewSessionDuration] = useState<number>(60);
  const [newSessionLocation, setNewSessionLocation] = useState<string>('Main Studio');
  const [newSessionNotes, setNewSessionNotes] = useState<string>('');
  const [newSessionClient, setNewSessionClient] = useState<string>('');
  const [newSessionTrainer, setNewSessionTrainer] = useState<string>('');

  // Stats summary data
  const [statsData, setStatsData] = useState({
    todaySessions: 0,
    completedHours: 0,
    activeTrainers: 0,
    completionRate: 0
  });

  // Fetch sessions from API using our session service
  const fetchSessions = async () => {
    setLoading(true);
    setError(null); // Reset error on new fetch
    try {
      // Use the session service to fetch sessions
      const result = await services.sessionService.getSessions();

      if (result.success && result.data && Array.isArray(result.data)) {
        setSessions(result.data);

        // Calculate stats
        const today = new Date().toLocaleDateString();

        const todaySessionsCount = result.data.filter(session =>
          new Date(session.sessionDate).toLocaleDateString() === today
        ).length;

        const completedSessions = result.data.filter(session =>
          session.status === 'completed'
        );

        const completedHours = completedSessions.reduce((total, session) =>
          total + (session.duration / 60), 0
        );

        const uniqueTrainers = new Set(
          result.data
            .filter(session => session.trainerId)
            .map(session => session.trainerId)
        );

        const relevantSessionsForRate = result.data.filter(session =>
          ['scheduled', 'confirmed', 'completed'].includes(session.status)
        );

        const completionRate = relevantSessionsForRate.length > 0
          ? Math.round((completedSessions.length / relevantSessionsForRate.length) * 100)
          : 0;

        setStatsData({
          todaySessions: todaySessionsCount,
          completedHours: Math.round(completedHours * 10) / 10, // Round to 1 decimal place
          activeTrainers: uniqueTrainers.size,
          completionRate
        });

        toast({
          title: "Success",
          description: "Sessions loaded successfully",
        });
      } else {
        console.warn('Received unexpected data structure for sessions:', result.data);
        setError('Failed to fetch sessions data: ' + (result.message || 'Invalid format'));
        toast({
          title: "Error",
          description: "Failed to load sessions (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      const errorMsg = err.message || 'Error connecting to the server';
      setError(errorMsg);
      toast({
        title: "Error",
        description: `Could not load sessions: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients for adding sessions
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      // Use the user service endpoint for clients
      const response = await apiService.get('/api/auth/clients');

      if (response.data && Array.isArray(response.data)) {
        setClients(response.data);
      } else {
        console.warn('Received unexpected data structure for clients:', response.data);
        toast({
          title: "Warning",
          description: "Failed to load clients (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Could not load clients';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch trainers for session assignment using the correct API endpoint
  const fetchTrainers = async () => {
    setLoadingTrainers(true);
    try {
      // Use the existing API endpoint for trainers
      const response = await apiService.get('/api/auth/trainers');

      if (response.data && Array.isArray(response.data)) {
        setTrainers(response.data);
      } else {
        console.warn('Received unexpected data structure for trainers:', response.data);
        toast({
          title: "Warning",
          description: "Failed to load trainers (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching trainers:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Could not load trainers';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoadingTrainers(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchSessions();
    fetchClients();
    fetchTrainers();
  }, []); // Remove the authAxios dependency since we're using apiService

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      console.log('Received message in sessions view:', lastMessage);
      // If it's a purchase notification, refresh sessions data
      if (lastMessage.type === 'purchase' || 
          (lastMessage.type === 'dashboard:update' && lastMessage.data?.type === 'purchase')) {
        toast({
          title: "New Sessions",
          description: `${lastMessage.data.userName} purchased ${lastMessage.data.sessionsPurchased || ''} sessions`,
        });
        // Refresh data to show updated sessions
        fetchClients();
        fetchSessions();
      }
    }
  }, [lastMessage, toast, fetchClients, fetchSessions]);

  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter sessions based on search term and status filter
  const filteredSessions = sessions.filter(session => {
    // Only show sessions with real clients (not test users) or available slots
    const hasRealClient = session.client && session.client.id;

    if (!hasRealClient && session.status !== 'available') {
      return false; // Filter out sessions without a client unless they are 'available' slots
    }

    const clientName = session.client
      ? `${session.client.firstName} ${session.client.lastName}`.toLowerCase()
      : '';

    const trainerName = session.trainer
      ? `${session.trainer.firstName} ${session.trainer.lastName}`.toLowerCase()
      : '';

    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      clientName.includes(searchTermLower) ||
      trainerName.includes(searchTermLower) ||
      (session.location || '').toLowerCase().includes(searchTermLower) ||
      (session.id || '').toString().toLowerCase().includes(searchTermLower) ||
      (session.status || '').toLowerCase().includes(searchTermLower);


    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;

    let matchesDate = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const sessionDate = new Date(session.sessionDate);
      matchesDate = matchesDate && sessionDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const sessionDate = new Date(session.sessionDate);
      matchesDate = matchesDate && sessionDate <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const sortedSessions = React.useMemo(() => {
    let sortableItems = [...filteredSessions];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        let aValue: any = null;
        let bValue: any = null;

        switch (sortConfig.key) {
          case 'client':
            aValue = a.client ? `${a.client.firstName} ${a.client.lastName}`.toLowerCase() : 'zzzz';
            bValue = b.client ? `${b.client.firstName} ${b.client.lastName}`.toLowerCase() : 'zzzz';
            break;
          case 'trainer':
            aValue = a.trainer ? `${a.trainer.firstName} ${a.trainer.lastName}`.toLowerCase() : 'zzzz';
            bValue = b.trainer ? `${b.trainer.firstName} ${b.trainer.lastName}`.toLowerCase() : 'zzzz';
            break;
          case 'sessionDate':
            aValue = new Date(a.sessionDate).getTime();
            bValue = new Date(b.sessionDate).getTime();
            break;
          default:
            aValue = a[sortConfig.key as keyof Session];
            bValue = b[sortConfig.key as keyof Session];
            break;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSessions, sortConfig]);

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  // Format time for display
  const formatTime = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A';
      try {
          return new Date(dateString).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
          });
      } catch (e) {
          console.error("Error formatting time:", dateString, e);
          return "Invalid Time";
      }
  };

  // Open view session details dialog
  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setOpenViewDialog(true);
  };

  // Open edit session dialog and pre-fill form
  const handleEditSession = (session: Session) => {
    setSelectedSession(session);

    try {
        const sessionDate = new Date(session.sessionDate);
        setEditSessionDate(sessionDate.toISOString().split('T')[0]);
        setEditSessionTime(sessionDate.toTimeString().slice(0, 5));
    } catch (e) {
        console.error("Error parsing session date for editing:", session.sessionDate, e);
        setEditSessionDate('');
        setEditSessionTime('');
        toast({ title: "Error", description: "Invalid session date found.", variant: "destructive" });
    }

    setEditSessionDuration(session.duration || 60);
    setEditSessionLocation(session.location || '');
    setEditSessionNotes(session.notes || '');
    setEditSessionStatus(session.status || 'scheduled'); // Default to scheduled if status missing
    setEditSessionClient(session.userId || '');
    setEditSessionTrainer(session.trainerId || '');

    setOpenEditDialog(true);
  };

  // Handle save edited session
  const handleSaveEditedSession = async () => {
    if (!selectedSession) return;

    try {
        // Combine date and time safely
        if (!editSessionDate || !editSessionTime) {
             toast({ title: "Error", description: "Please provide a valid date and time.", variant: "destructive" });
             return;
        }
        const updatedSessionDateTime = new Date(`${editSessionDate}T${editSessionTime}`);
        if (isNaN(updatedSessionDateTime.getTime())) {
            toast({ title: "Error", description: "Invalid date/time format.", variant: "destructive" });
            return;
        }

      const updatedSessionData = {
        sessionDate: updatedSessionDateTime.toISOString(),
        duration: editSessionDuration,
        location: editSessionLocation,
        notes: editSessionNotes,
        status: editSessionStatus,
        // Send null if no client/trainer selected, otherwise send the ID
        userId: editSessionClient || null,
        trainerId: editSessionTrainer || null
      };

      // Make the API call using the correct endpoint
      const response = await apiService.put(`/api/sessions/${selectedSession.id}`, updatedSessionData);

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Session updated successfully",
        });

        fetchSessions(); // Refresh sessions list
        setOpenEditDialog(false); // Close dialog
      } else {
         // Handle non-200 success responses if necessary
         console.warn('Session update returned status:', response.status);
         toast({
           title: "Warning",
           description: `Session updated, but received status: ${response.status}`,
           variant: "default", // Or "warning" if you have one
         });
         fetchSessions();
         setOpenEditDialog(false);
      }
    } catch (err: any) {
      console.error('Error updating session:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error updating session';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle create new session using the correct API endpoint
  const handleCreateNewSession = async () => {
    try {
       // Combine date and time safely
        if (!newSessionDate || !newSessionTime) {
             toast({ title: "Error", description: "Please provide a valid date and time for the new session.", variant: "destructive" });
             return;
        }
        const newSessionDateTime = new Date(`${newSessionDate}T${newSessionTime}`);
         if (isNaN(newSessionDateTime.getTime())) {
            toast({ title: "Error", description: "Invalid date/time format for new session.", variant: "destructive" });
            return;
        }
         // Optional: Check if date is in the past
        if (newSessionDateTime < new Date()) {
            toast({ title: "Warning", description: "Creating a session in the past.", variant: "default"});
            // Decide if you want to prevent this or just warn
            // return;
        }

      const newSessionData = {
        sessionDate: newSessionDateTime.toISOString(),
        duration: newSessionDuration,
        location: newSessionLocation,
        notes: newSessionNotes,
        status: 'available', // Default status for admin-created sessions
        userId: newSessionClient || null, // Assign client if selected
        trainerId: newSessionTrainer || null // Assign trainer if selected
      };

      // Use the correct API endpoint for creating sessions
      const response = await apiService.post('/api/sessions', newSessionData);

      if (response.status === 201 || response.status === 200) {
        toast({
          title: "Success",
          description: "New session created successfully",
        });

        fetchSessions(); // Refresh the list
        setOpenNewDialog(false); // Close the dialog

        // Reset the new session form
        setNewSessionDate('');
        setNewSessionTime('');
        setNewSessionDuration(60);
        setNewSessionLocation('Main Studio');
        setNewSessionNotes('');
        setNewSessionClient('');
        setNewSessionTrainer('');
      } else {
        console.warn('Session creation returned status:', response.status);
        toast({
          title: "Error",
          description: `Failed to create session (status: ${response.status})`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error creating session:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error creating session';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle adding sessions to client (Admin action) using enhanced session service
  const handleAddSessions = async () => {
    if (!selectedClient) {
      toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
      return;
    }
    if (isNaN(sessionsToAdd) || sessionsToAdd <= 0) {
      toast({ title: "Error", description: "Please enter a valid positive number of sessions.", variant: "destructive" });
      return;
    }

    try {
      console.log('[AdminSessions] Adding sessions to client', {
        clientId: selectedClient,
        sessionCount: sessionsToAdd,
        reason: addSessionsNote
      });

      // Use the enhanced session service to add sessions
      const result = await services.session.addSessionsToClient(
        selectedClient,
        sessionsToAdd,
        addSessionsNote || 'Manually added by admin via dashboard'
      );

      if (result.success) {
        console.log('[AdminSessions] Sessions added successfully', result.data);
        
        toast({
          title: "Success",
          description: `Added ${sessionsToAdd} session(s) to the client.`,
        });

        // Refresh all data to show updates
        fetchClients(); // Refresh client list to show updated session count
        fetchSessions(); // Refresh sessions to show new available sessions
        setOpenAddSessionsDialog(false);

        // Reset add sessions form
        setSelectedClient('');
        setSessionsToAdd(1);
        setAddSessionsNote('');
      } else {
        console.error('[AdminSessions] Failed to add sessions', result);
        toast({
          title: "Error",
          description: result.message || "Failed to add sessions.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('[AdminSessions] Error adding sessions:', err);
      const errorMsg = err.message || 'Server error adding sessions';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Handle delete session click
  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setOpenDeleteDialog(true);
  };

  // Confirm delete session
  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsProcessing(true);
    try {
      await authAxios.delete(`/api/sessions/${sessionToDelete.id}`);
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      fetchSessions();
    } catch (err: any) {
      console.error('Error deleting session:', err);
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setOpenDeleteDialog(false);
      setSessionToDelete(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = filteredSessions.map((session) => session.id);
      setSelectedIds(newSelectedIds);
      return;
    }
    setSelectedIds([]);
  };

  const handleSelectOne = (id: string) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelectedIds: string[] = [];

    if (selectedIndex === -1) {
      newSelectedIds = newSelectedIds.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelectedIds = newSelectedIds.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelectedIds = newSelectedIds.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelectedIds = newSelectedIds.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1),
      );
    }

    setSelectedIds(newSelectedIds);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      // Use the new admin endpoint for bulk deletion
      await apiService.delete('/api/admin/sessions/bulk', { data: { ids: selectedIds, reason: bulkDeleteReason } });
      toast({
        title: "Success",
        description: `${selectedIds.length} sessions deleted successfully.`,
      });
      fetchSessions();
      setSelectedIds([]); // Clear selection
      setBulkDeleteReason('');
    } catch (err: any) {
      console.error('Error bulk deleting sessions:', err);
      toast({ title: "Error", description: "Failed to delete selected sessions.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setOpenBulkDeleteDialog(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Session ID', 'Date', 'Time', 'Client Name', 'Trainer Name', 'Status', 'Duration (min)', 'Location'];
    const csvRows = [headers.join(',')];
    const dataToExport = filteredSessions.map(session => [session.id, formatDate(session.sessionDate), formatTime(session.sessionDate), session.client ? `${session.client.firstName} ${session.client.lastName}` : 'N/A', session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'N/A', session.status, session.duration, session.location || 'N/A'].join(','));
    const csvString = [csvRows, ...dataToExport].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sessions-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: "CSV export started." });
  };

  // Refresh sessions data with enhanced logging
  const handleRefreshSessions = async () => {
    toast({ title: "Refreshing...", description: "Fetching latest session data." });
    
    try {
      // Check session allocation service health
      const healthCheck = await services.session.checkAllocationHealth();
      console.log('[AdminSessions] Session allocation service health:', healthCheck);
      
      // Refresh all data
      await Promise.all([
        fetchSessions(),
        fetchClients(),
        fetchTrainers()
      ]);
      
      toast({
        title: "Success",
        description: "Session data refreshed successfully.",
      });
    } catch (error) {
      console.error('[AdminSessions] Error during refresh:', error);
      // Still attempt basic refresh even if health check fails
      fetchSessions();
      fetchClients();
      fetchTrainers();
    }
  };

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard component={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Calendar size={28} />
                  <Typography variant="h5" component="span" sx={{ fontWeight: 300 }}>
                     Training Sessions Management
                  </Typography>
                </Stack>
              </CardTitle>
              <Stack direction="row" spacing={1.5} alignItems="center">
              {/* View Toggle Buttons */}
              <Stack direction="row" spacing={0.5} sx={{ 
              background: 'rgba(30, 58, 138, 0.2)', 
              borderRadius: '8px', 
              padding: '4px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <GlowButton
                  text="Table"
                theme={viewMode === 'table' ? 'cosmic' : 'ruby'}
                size="small"
                leftIcon={<TableIcon size={16} />}
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)' 
                        : 'rgba(30, 58, 138, 0.3)',
                      border: viewMode === 'table' ? '1px solid #3b82f6' : '1px solid transparent'
                    }}
                  />
                  <GlowButton
                    text="Calendar"
                    theme={viewMode === 'calendar' ? 'cosmic' : 'ruby'}
                    size="small"
                    leftIcon={<CalendarDays size={16} />}
                    onClick={() => setViewMode('calendar')}
                    style={{
                      background: viewMode === 'calendar' 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)' 
                        : 'rgba(30, 58, 138, 0.3)',
                      border: viewMode === 'calendar' ? '1px solid #3b82f6' : '1px solid transparent'
                    }}
                  />
                </Stack>
                
                <GlowButton
                  text="Add Sessions"
                  theme="emerald"
                  size="small"
                  leftIcon={<Zap size={16} />}
                  onClick={() => setOpenAddSessionsDialog(true)}
                  disabled={loadingClients} // Disable if clients are loading
                />
                <GlowButton
                  text="Refresh"
                  theme="purple"
                  size="small"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={handleRefreshSessions}
                  isLoading={loading} // Show spinner if main sessions are loading
                />
              </Stack>
            </CardHeader>

            <CardContent>
              {/* Stats Cards */}
              <StatsGridContainer>
                 {/* Stats Card 1: Today's Sessions */}
                 <StatsCard variant="primary" as={motion.div} custom={0} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="primary"><Calendar size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.todaySessions}</StatsValue>
                             <StatsLabel>Sessions Today</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 2: Completed Hours */}
                 <StatsCard variant="success" as={motion.div} custom={1} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="success"><Clock size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.completedHours}</StatsValue>
                             <StatsLabel>Hours Completed</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 3: Active Trainers */}
                 <StatsCard variant="info" as={motion.div} custom={2} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="info"><User size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : statsData.activeTrainers}</StatsValue>
                             <StatsLabel>Active Trainers</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
                 {/* Stats Card 4: Completion Rate */}
                 <StatsCard variant="warning" as={motion.div} custom={3} variants={staggeredItemVariants}>
                     <Stack direction="row" alignItems="center" spacing={2}>
                         <StatsIconContainer variant="warning"><CheckCircle size={24} /></StatsIconContainer>
                         <MuiBox>
                             <StatsValue>{loading ? '-' : `${statsData.completionRate}%`}</StatsValue>
                             <StatsLabel>Completion Rate</StatsLabel>
                         </MuiBox>
                     </Stack>
                 </StatsCard>
              </StatsGridContainer>

              {/* Filters and Search */}
              <FilterContainer as={motion.div} variants={itemVariants}>
                 <SearchField
                     size="small"
                     placeholder="Search client, trainer, status..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     sx={{ minWidth: { xs: '100%', sm: 300 } }}
                     InputProps={{
                         startAdornment: (
                             <InputAdornment position="start">
                                 <Search size={20} />
                             </InputAdornment>
                         )
                     }}
                 />
                 <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="From"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      sx={{ width: 140 }}
                    />
                    <TextField
                      label="To"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      sx={{ width: 140 }}
                    />
                 </Stack>
                 <FilterButtonsContainer>
                     {/* Filter Buttons */}
                     {(['all', 'available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
                         <FilterButton
                             key={status}
                             isactive={(statusFilter === status).toString() as "true" | "false"}
                             buttoncolor={
                                 status === 'completed' || status === 'confirmed' ? 'success' :
                                 status === 'scheduled' || status === 'available' ? 'primary' :
                                 status === 'cancelled' ? 'error' : undefined
                             }
                             onClick={() => setStatusFilter(status)}
                         >
                             {status.charAt(0).toUpperCase() + status.slice(1)}
                         </FilterButton>
                     ))}
                 </FilterButtonsContainer>
              </FilterContainer>

              {/* Conditional Rendering based on View Mode */}
              {viewMode === 'table' ? (
                <>
                  <AnimatePresence>
                    {selectedIds.length > 0 && (
                      <BulkActionsBar
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Typography variant="subtitle1">{selectedIds.length} selected</Typography>
                        <GlowButton
                          text="Delete Selected"
                          theme="ruby"
                          size="small"
                          leftIcon={<Trash2 size={16} />}
                          onClick={() => setOpenBulkDeleteDialog(true)}
                        />
                      </BulkActionsBar>
                    )}
                  </AnimatePresence>
                  {/* Sessions Table View */}
                  {loading ? (
                <LoadingContainer><LoadingSpinner /></LoadingContainer>
              ) : error ? (
                 <EmptyStateContainer>
                    <EmptyStateIcon>⚠️</EmptyStateIcon>
                    <EmptyStateText>Error loading sessions: {error}</EmptyStateText>
                    <GlowButton text="Retry" onClick={fetchSessions} theme="ruby" size="small" />
                 </EmptyStateContainer>
              ) : (
                <StyledTableContainer component={Paper}>
                  <Table aria-label="sessions table" size="small">
                    <TableHead>
                      <StyledTableHead>
                        <StyledTableHeadCell padding="checkbox">
                          <Checkbox
                            indeterminate={selectedIds.length > 0 && selectedIds.length < sortedSessions.length}
                            checked={sortedSessions.length > 0 && selectedIds.length === sortedSessions.length}
                            onChange={handleSelectAll}
                            inputProps={{ 'aria-label': 'select all sessions' }}
                            sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#00ffff' }, '&.MuiCheckbox-indeterminate': { color: '#00ffff' } }}
                          />
                        </StyledTableHeadCell>
                        {/* <StyledTableHeadCell>ID</StyledTableHeadCell> */}
                        <StyledTableHeadCell onClick={() => handleSort('client')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Client</span>
                            {sortConfig.key === 'client' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        <StyledTableHeadCell onClick={() => handleSort('trainer')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Trainer</span>
                            {sortConfig.key === 'trainer' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        <StyledTableHeadCell onClick={() => handleSort('sessionDate')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Date & Time</span>
                            {sortConfig.key === 'sessionDate' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        {/* <StyledTableHeadCell>Time</StyledTableHeadCell> */}
                        <StyledTableHeadCell onClick={() => handleSort('location')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Location</span>
                            {sortConfig.key === 'location' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        <StyledTableHeadCell onClick={() => handleSort('duration')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Duration</span>
                            {sortConfig.key === 'duration' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        <StyledTableHeadCell onClick={() => handleSort('status')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>Status</span>
                            {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </Stack>
                        </StyledTableHeadCell>
                        <StyledTableHeadCell align="right">Actions</StyledTableHeadCell>
                      </StyledTableHead>
                    </TableHead>
                    <TableBody>
                      {sortedSessions.length > 0 ? (
                        sortedSessions
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((session, index) => (
                            <StyledTableRow
                              key={session.id || index} // Use index as fallback key if id is missing
                              component={motion.tr}
                              custom={index}
                              variants={staggeredItemVariants}
                              initial="hidden"
                              animate="visible"
                              layout // Animate layout changes
                            >
                              <StyledTableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedIds.indexOf(session.id) !== -1}
                                  onChange={() => handleSelectOne(session.id)}
                                  inputProps={{ 'aria-label': `select session ${session.id}` }}
                                  sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#00ffff' } }}
                                />
                              </StyledTableCell>
                              {/* <StyledTableCell>{session.id || 'N/A'}</StyledTableCell> */}
                              {/* Client Cell */}
                               <StyledTableCell>
                                 {session.client ? (
                                   <Stack direction="row" spacing={1} alignItems="center">
                                     <Avatar
                                       src={session.client.photo || undefined} // Pass undefined if no photo
                                       alt={`${session.client.firstName} ${session.client.lastName}`}
                                       sx={{ width: 32, height: 32, fontSize: '0.8rem' }}
                                     >
                                       {/* Fallback Initials */}
                                       {session.client.firstName?.[0]}
                                       {session.client.lastName?.[0]}
                                     </Avatar>
                                     <MuiBox>
                                       <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {session.client.firstName} {session.client.lastName}
                                       </Typography>
                                       <Chip
                                         label={`${session.client.availableSessions ?? 0} sessions`}
                                         size="small"
                                         variant="outlined" // Use outlined for better contrast
                                         sx={{
                                           fontSize: '0.7rem',
                                           height: '20px',
                                           mt: 0.5,
                                           borderColor: (session.client.availableSessions ?? 0) > 0
                                             ? 'rgba(46, 125, 50, 0.5)'
                                             : 'rgba(211, 47, 47, 0.5)',
                                           color: (session.client.availableSessions ?? 0) > 0
                                              ? 'rgba(46, 125, 50, 1)'
                                              : 'rgba(211, 47, 47, 1)',
                                           bgcolor: (session.client.availableSessions ?? 0) > 0
                                              ? 'rgba(46, 125, 50, 0.1)'
                                              : 'rgba(211, 47, 47, 0.1)',

                                         }}
                                       />
                                     </MuiBox>
                                   </Stack>
                                 ) : (
                                   <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                                        {session.status === 'available' ? 'Available Slot' : 'No Client'}
                                   </Typography>
                                 )}
                               </StyledTableCell>

                               {/* Trainer Cell */}
                               <StyledTableCell>
                                   {session.trainer ? (
                                     <Stack direction="row" spacing={1} alignItems="center">
                                       <Avatar
                                         src={session.trainer.photo || undefined}
                                         alt={`${session.trainer.firstName} ${session.trainer.lastName}`}
                                         sx={{ width: 32, height: 32, fontSize: '0.8rem' }}
                                       >
                                          {session.trainer.firstName?.[0]}
                                          {session.trainer.lastName?.[0]}
                                       </Avatar>
                                       <Typography variant="body2">
                                           {session.trainer.firstName} {session.trainer.lastName}
                                       </Typography>
                                     </Stack>
                                   ) : (
                                     <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                                        Unassigned
                                     </Typography>
                                   )}
                                 </StyledTableCell>

                              {/* Date & Time Cell */}
                              <StyledTableCell>
                                 <Typography variant="body2">{formatDate(session.sessionDate)}</Typography>
                                 <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{formatTime(session.sessionDate)}</Typography>
                              </StyledTableCell>
                              {/* <StyledTableCell>{formatTime(session.sessionDate)}</StyledTableCell> */}
                              <StyledTableCell>{session.location || 'N/A'}</StyledTableCell>
                              <StyledTableCell>{session.duration || 'N/A'} min</StyledTableCell>
                              <StyledTableCell>
                                <ChipContainer chipstatus={session.status}>
                                  {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
                                </ChipContainer>
                              </StyledTableCell>
                              <StyledTableCell align="right">
                                <IconButtonContainer>
                                  <StyledIconButton
                                    btncolor="primary"
                                    onClick={() => handleViewSession(session)}
                                    title="View Details"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Eye size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    btncolor="secondary" // Use a different color maybe?
                                    onClick={() => handleEditSession(session)}
                                    title="Edit Session"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Edit size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    btncolor="error"
                                    onClick={() => handleDeleteClick(session)}
                                    title="Delete Session"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Trash2 size={16} />
                                  </StyledIconButton>
                                </IconButtonContainer>
                              </StyledTableCell>
                            </StyledTableRow>
                          ))
                      ) : (
                        <StyledTableRow>
                          <StyledTableCell colSpan={9}>
                            <EmptyStateContainer>
                              <EmptyStateIcon>📅</EmptyStateIcon>
                              <EmptyStateText>
                                No sessions found matching your criteria.
                              </EmptyStateText>
                            </EmptyStateContainer>
                          </StyledTableCell>
                        </StyledTableRow>
                      )}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              )}

              {/* Pagination for Table View */}
              {sortedSessions.length > 0 && viewMode === 'table' && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={sortedSessions.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    mt: 2,
                    '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-displayedRows': { color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem' },
                    '.MuiTablePagination-select': { color: 'rgba(255, 255, 255, 0.9)' },
                    '.MuiTablePagination-actions button': { color: 'rgba(255, 255, 255, 0.7)', '&:disabled': { color: 'rgba(255, 255, 255, 0.3)' } },
                    '.MuiInputBase-root': { color: 'white !important' } // Ensure select dropdown text is white
                  }}
                />
              )}

              {/* Action Buttons for Table View */}
              {viewMode === 'table' && (
                <FooterActionsContainer>
                <GlowButton
                  text="Schedule New Slot"
                  theme="cosmic"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setOpenNewDialog(true)}
                   disabled={loadingTrainers} // Disable if trainers are loading
                />
                <GlowButton
                  text="Export Sessions"
                  theme="ruby"
                  leftIcon={<Download size={18} />}
                  onClick={handleExportCSV}
                  disabled={loading || sortedSessions.length === 0}
                />
                </FooterActionsContainer>
              )}
                </>
              ) : (
                /* Calendar View */
                <MuiBox sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  mt: 2,
                  background: 'rgba(30, 58, 138, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  overflow: 'hidden',
                  minHeight: '600px',
                  '& > div': {
                    height: '100%',
                    '& .rbc-calendar': {
                      background: 'rgba(20, 20, 40, 0.4)',
                      color: 'white',
                    },
                    '& .rbc-toolbar': {
                      background: 'rgba(30, 58, 138, 0.3)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      '& .rbc-toolbar-label': {
                        color: '#e5e7eb',
                        fontSize: '1.2rem',
                        fontWeight: 500,
                      },
                    },
                    '& .rbc-header': {
                      background: 'rgba(30, 58, 138, 0.2)',
                      color: '#e5e7eb',
                      fontWeight: 500,
                      borderColor: 'rgba(59, 130, 246, 0.15)',
                      padding: '0.75rem',
                    },
                    '& .rbc-event': {
                      background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontWeight: 500,
                    },
                    '& .rbc-event.available': {
                      background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    },
                    '& .rbc-event.confirmed': {
                      background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                    },
                    '& .rbc-event.cancelled': {
                      background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                      opacity: 0.7,
                    },
                    '& .rbc-event.completed': {
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    },
                    '& .rbc-today': {
                      background: 'rgba(59, 130, 246, 0.1)',
                    },
                    '& .rbc-off-range-bg': {
                      background: 'rgba(10, 10, 15, 0.3)',
                    },
                    '& .rbc-date-cell': {
                      color: '#e5e7eb',
                    },
                    '& .rbc-time-slot': {
                      color: '#9ca3af',
                      borderColor: 'rgba(59, 130, 246, 0.1)',
                    },
                    '& .rbc-day-bg, & .rbc-month-row, & .rbc-time-content': {
                      borderColor: 'rgba(59, 130, 246, 0.1)',
                    },
                    '& .rbc-btn-group button': {
                      background: 'rgba(30, 58, 138, 0.4)',
                      color: 'white',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '0.5rem 1rem',
                      fontWeight: 500,
                      '&:hover': {
                        background: 'rgba(59, 130, 246, 0.4)',
                      },
                      '&.rbc-active': {
                        background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
                        borderColor: '#3b82f6',
                      },
                    },
                    '& .rbc-time-view': {
                      borderColor: 'rgba(59, 130, 246, 0.1)',
                    },
                    '& .rbc-month-view': {
                      borderColor: 'rgba(59, 130, 246, 0.1)',
                    },
                    '& .rbc-agenda-view': {
                      color: '#e5e7eb',
                      '& .rbc-agenda-date-cell, & .rbc-agenda-time-cell': {
                        color: '#9ca3af',
                      },
                      '& .rbc-agenda-event-cell': {
                        color: '#e5e7eb',
                      },
                    },
                  }
                }}>
                  <ScheduleInitializer>
                    <ScheduleErrorBoundary>
                      <UnifiedCalendar />
                    </ScheduleErrorBoundary>
                  </ScheduleInitializer>
                </MuiBox>
              )}

              {/* Development Testing Controls */}
              {process.env.NODE_ENV !== 'production' && viewMode === 'table' && (
                <MuiBox sx={{ mt: 4 }}>
                  <SessionTestControls />
                </MuiBox>
              )}
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* --- DIALOGS --- */}

      {/* View Session Dialog */}
      <StyledDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Calendar />
            <Typography variant="h6">Session Details</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers> {/* Add dividers */}
          {selectedSession ? (
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
               <Grid item xs={12}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Session ID</Typography>
                 <Typography variant="body1" fontWeight="500">
                    {selectedSession.id || 'N/A'}
                 </Typography>
               </Grid>
               <Grid item xs={12} sm={6}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Status</Typography>
                 <ChipContainer chipstatus={selectedSession.status}>
                     {selectedSession.status ? selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1) : 'Unknown'}
                 </ChipContainer>
               </Grid>
               <Grid item xs={12} sm={6}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Date & Time</Typography>
                 <Typography variant="body1" fontWeight="500">
                     {formatDate(selectedSession.sessionDate)} at {formatTime(selectedSession.sessionDate)}
                 </Typography>
               </Grid>
               <Grid item xs={12} sm={6}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Duration</Typography>
                 <Typography variant="body1" fontWeight="500">
                     {selectedSession.duration || 'N/A'} minutes
                 </Typography>
               </Grid>
               <Grid item xs={12} sm={6}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Location</Typography>
                 <Typography variant="body1" fontWeight="500">
                     {selectedSession.location || 'N/A'}
                 </Typography>
               </Grid>

               {/* Client Details */}
               <Grid item xs={12}> <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Client</Typography> </Grid>
               <Grid item xs={12}>
                 {selectedSession.client ? (
                   <Stack direction="row" spacing={1.5} alignItems="center">
                     <Avatar
                       src={selectedSession.client.photo || undefined}
                       alt={`${selectedSession.client.firstName} ${selectedSession.client.lastName}`}
                     >
                       {selectedSession.client.firstName?.[0]}{selectedSession.client.lastName?.[0]}
                     </Avatar>
                     <MuiBox>
                       <Typography variant="body1" fontWeight="500">
                         {selectedSession.client.firstName} {selectedSession.client.lastName}
                       </Typography>
                       <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                         {selectedSession.client.email}
                       </Typography>
                       {/* Link to client profile? */}
                     </MuiBox>
                     <Chip
                         label={`${selectedSession.client.availableSessions ?? 0} sessions`}
                         size="small" variant="outlined"
                         sx={{ ml: 'auto', /* styles from table */ }} />
                   </Stack>
                 ) : (
                   <Typography variant="body1" color="rgba(255, 255, 255, 0.5)" fontStyle="italic">
                     No Client Assigned
                   </Typography>
                 )}
               </Grid>

               {/* Trainer Details */}
                <Grid item xs={12}> <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Trainer</Typography> </Grid>
                <Grid item xs={12}>
                 {selectedSession.trainer ? (
                   <Stack direction="row" spacing={1.5} alignItems="center">
                     <Avatar
                       src={selectedSession.trainer.photo || undefined}
                       alt={`${selectedSession.trainer.firstName} ${selectedSession.trainer.lastName}`}
                     >
                        {selectedSession.trainer.firstName?.[0]}{selectedSession.trainer.lastName?.[0]}
                     </Avatar>
                     <MuiBox>
                       <Typography variant="body1" fontWeight="500">
                         {selectedSession.trainer.firstName} {selectedSession.trainer.lastName}
                       </Typography>
                       <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                         {selectedSession.trainer.email}
                       </Typography>
                       {/* Link to trainer profile? */}
                     </MuiBox>
                   </Stack>
                 ) : (
                   <Typography variant="body1" color="rgba(255, 255, 255, 0.5)" fontStyle="italic">
                     No Trainer Assigned
                   </Typography>
                 )}
               </Grid>

               {/* Notes */}
               <Grid item xs={12}>
                 <Typography variant="overline" color="rgba(255, 255, 255, 0.7)">Notes</Typography>
                 <Typography
                   variant="body2" // Use body2 for notes maybe?
                   sx={{
                     p: 1.5, mt: 0.5, borderRadius: '8px', minHeight: '60px',
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     whiteSpace: 'pre-wrap' // Preserve line breaks
                   }}
                 >
                   {selectedSession.notes || <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>No notes for this session.</span>}
                 </Typography>
               </Grid>
            </Grid>
          ) : (
             <Typography>Loading session details...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Close"
            theme="cosmic"
            size="small"
            onClick={() => setOpenViewDialog(false)}
          />
          <GlowButton
            text="Edit Session"
            theme="purple"
            size="small"
            leftIcon={<Edit size={16} />}
            onClick={() => {
              if (selectedSession) {
                 setOpenViewDialog(false);
                 handleEditSession(selectedSession); // Reuse edit handler
              }
            }}
             disabled={!selectedSession}
          />
        </DialogActions>
      </StyledDialog>

      {/* Edit Session Dialog */}
      <StyledDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Edit />
            <Typography variant="h6">Edit Session</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            Update the details for this session.
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
             {/* Client Select */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel id="edit-client-select-label">Client</InputLabel>
                    <Select
                        labelId="edit-client-select-label"
                        value={editSessionClient}
                        onChange={(e) => setEditSessionClient(e.target.value)}
                        label="Client"
                        disabled={loadingClients}
                    >
                        <MenuItem value=""><em>Not Assigned</em></MenuItem>
                        {clients.map(client => (
                            <MenuItem key={client.id} value={client.id}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Avatar src={client.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{client.firstName?.[0]}{client.lastName?.[0]}</Avatar>
                                    <span>{client.firstName} {client.lastName}</span>
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
              </Grid>
              {/* Trainer Select */}
               <Grid item xs={12} sm={6}>
                   <FormControl fullWidth variant="outlined" size="small">
                       <InputLabel id="edit-trainer-select-label">Trainer</InputLabel>
                       <Select
                           labelId="edit-trainer-select-label"
                           value={editSessionTrainer}
                           onChange={(e) => setEditSessionTrainer(e.target.value)}
                           label="Trainer"
                           disabled={loadingTrainers}
                       >
                           <MenuItem value=""><em>Not Assigned</em></MenuItem>
                           {trainers.map(trainer => (
                               <MenuItem key={trainer.id} value={trainer.id}>
                                   <Stack direction="row" spacing={1} alignItems="center">
                                       <Avatar src={trainer.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{trainer.firstName?.[0]}{trainer.lastName?.[0]}</Avatar>
                                       <span>{trainer.firstName} {trainer.lastName}</span>
                                   </Stack>
                               </MenuItem>
                           ))}
                       </Select>
                   </FormControl>
               </Grid>
            {/* Date Input */}
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Date" type="date" size="small" fullWidth variant="outlined"
                    value={editSessionDate}
                    onChange={(e) => setEditSessionDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: new Date().toISOString().slice(0, 10) }} // Prevent past dates
                />
            </Grid>
            {/* Time Input */}
             <Grid item xs={12} sm={6}>
                 <TextField
                     label="Time" type="time" size="small" fullWidth variant="outlined"
                     value={editSessionTime}
                     onChange={(e) => setEditSessionTime(e.target.value)}
                     InputLabelProps={{ shrink: true }}
                 />
             </Grid>
            {/* Duration Input */}
             <Grid item xs={12} sm={6}>
                 <TextField
                     label="Duration (min)" type="number" size="small" fullWidth variant="outlined"
                     value={editSessionDuration}
                     onChange={(e) => setEditSessionDuration(parseInt(e.target.value, 10) || 0)}
                     InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }}
                 />
             </Grid>
              {/* Status Select */}
               <Grid item xs={12} sm={6}>
                   <FormControl fullWidth variant="outlined" size="small">
                       <InputLabel id="edit-status-select-label">Status</InputLabel>
                       <Select
                           labelId="edit-status-select-label"
                           value={editSessionStatus}
                           onChange={(e) => setEditSessionStatus(e.target.value as Session['status'])}
                           label="Status"
                       >
                           {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
                              <MenuItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</MenuItem>
                           ))}
                       </Select>
                   </FormControl>
               </Grid>
            {/* Location Input */}
            <Grid item xs={12}>
                <TextField
                    label="Location" size="small" fullWidth variant="outlined"
                    value={editSessionLocation}
                    onChange={(e) => setEditSessionLocation(e.target.value)}
                    placeholder="e.g., Main Studio, Park, Online"
                />
            </Grid>
            {/* Notes Input */}
            <Grid item xs={12}>
              <TextField
                label="Session Notes" size="small" fullWidth multiline rows={3} variant="outlined"
                value={editSessionNotes}
                onChange={(e) => setEditSessionNotes(e.target.value)}
                placeholder="Add any relevant notes for this session..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Cancel"
            theme="cosmic"
            size="small"
            onClick={() => setOpenEditDialog(false)}
          />
          <GlowButton
            text="Save Changes"
            theme="emerald"
            size="small"
            leftIcon={<CheckSquare size={16} />}
            onClick={handleSaveEditedSession}
            // Optionally disable if saving
          />
        </DialogActions>
      </StyledDialog>

       {/* New Session Dialog */}
       <StyledDialog
           open={openNewDialog}
           onClose={() => setOpenNewDialog(false)}
           maxWidth="sm"
           fullWidth
       >
           <DialogTitle>
               <Stack direction="row" spacing={1.5} alignItems="center">
                   <Plus />
                   <Typography variant="h6">Schedule New Session Slot</Typography>
               </Stack>
           </DialogTitle>
           <DialogContent dividers>
               <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                   Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
               </DialogContentText>
               <Grid container spacing={2} sx={{ mt: 0.5 }}>
                   {/* Client Select */}
                   <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel id="new-client-select-label">Assign Client (Optional)</InputLabel>
                          <Select
                              labelId="new-client-select-label"
                              value={newSessionClient}
                              onChange={(e) => setNewSessionClient(e.target.value)}
                              label="Assign Client (Optional)"
                              disabled={loadingClients}
                          >
                              <MenuItem value=""><em>Not Assigned</em></MenuItem>
                              {clients.map(client => (
                                  <MenuItem key={client.id} value={client.id}>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                          <Avatar src={client.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{client.firstName?.[0]}{client.lastName?.[0]}</Avatar>
                                          <span>{client.firstName} {client.lastName}</span>
                                      </Stack>
                                  </MenuItem>
                              ))}
                          </Select>
                      </FormControl>
                   </Grid>
                   {/* Trainer Select */}
                   <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel id="new-trainer-select-label">Assign Trainer (Optional)</InputLabel>
                          <Select
                              labelId="new-trainer-select-label"
                              value={newSessionTrainer}
                              onChange={(e) => setNewSessionTrainer(e.target.value)}
                              label="Assign Trainer (Optional)"
                              disabled={loadingTrainers}
                          >
                              <MenuItem value=""><em>Not Assigned</em></MenuItem>
                              {trainers.map(trainer => (
                                  <MenuItem key={trainer.id} value={trainer.id}>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                          <Avatar src={trainer.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{trainer.firstName?.[0]}{trainer.lastName?.[0]}</Avatar>
                                          <span>{trainer.firstName} {trainer.lastName}</span>
                                      </Stack>
                                  </MenuItem>
                              ))}
                          </Select>
                      </FormControl>
                   </Grid>
                   {/* Date Input */}
                   <Grid item xs={12} sm={6}>
                       <TextField
                           label="Date" type="date" size="small" fullWidth variant="outlined"
                           value={newSessionDate}
                           onChange={(e) => setNewSessionDate(e.target.value)}
                           InputLabelProps={{ shrink: true }}
                           inputProps={{ min: new Date().toISOString().slice(0, 10) }}
                       />
                   </Grid>
                   {/* Time Input */}
                   <Grid item xs={12} sm={6}>
                       <TextField
                           label="Time" type="time" size="small" fullWidth variant="outlined"
                           value={newSessionTime}
                           onChange={(e) => setNewSessionTime(e.target.value)}
                           InputLabelProps={{ shrink: true }}
                       />
                   </Grid>
                   {/* Duration Input */}
                   <Grid item xs={12} sm={6}>
                       <TextField
                           label="Duration (min)" type="number" size="small" fullWidth variant="outlined"
                           value={newSessionDuration}
                           onChange={(e) => setNewSessionDuration(parseInt(e.target.value, 10) || 0)}
                            InputProps={{ inputProps: { min: 15, max: 240, step: 15 } }}
                       />
                   </Grid>
                   {/* Location Input */}
                   <Grid item xs={12} sm={6}>
                       <TextField
                           label="Location" size="small" fullWidth variant="outlined"
                           value={newSessionLocation}
                           onChange={(e) => setNewSessionLocation(e.target.value)}
                            placeholder="e.g., Main Studio"
                       />
                   </Grid>
                   {/* Notes Input */}
                   <Grid item xs={12}>
                       <TextField
                           label="Notes (Optional)" size="small" fullWidth multiline rows={3} variant="outlined"
                           value={newSessionNotes}
                           onChange={(e) => setNewSessionNotes(e.target.value)}
                           placeholder="e.g., Open slot for new clients, Focus on beginners"
                       />
                   </Grid>
               </Grid>
           </DialogContent>
           <DialogActions>
               <GlowButton
                   text="Cancel"
                   theme="cosmic"
                   size="small"
                   onClick={() => setOpenNewDialog(false)}
               />
               <GlowButton
                   text="Create Session Slot"
                   theme="emerald"
                   size="small"
                   leftIcon={<Plus size={16} />}
                   onClick={handleCreateNewSession}
                   // Optionally disable while creating
               />
           </DialogActions>
       </StyledDialog>

      {/* Add Sessions Dialog */}
      <StyledDialog
        open={openAddSessionsDialog}
        onClose={() => setOpenAddSessionsDialog(false)}
        maxWidth="xs" // Make this dialog smaller
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Zap />
            <Typography variant="h6">Add Sessions to Client</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2.5 }}>
            Manually add purchased or complimentary sessions to a client's account.
          </DialogContentText>
          <Grid container spacing={2}>
             {/* Client Select */}
              <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="add-client-select-label">Select Client</InputLabel>
                      <Select
                          labelId="add-client-select-label"
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          label="Select Client"
                          disabled={loadingClients}
                      >
                          <MenuItem value=""><em>-- Select a Client --</em></MenuItem>
                          {clients.map(client => (
                              <MenuItem key={client.id} value={client.id}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                      <Avatar src={client.photo || undefined} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{client.firstName?.[0]}{client.lastName?.[0]}</Avatar>
                                      <MuiBox>
                                        <Typography variant="body2">{client.firstName} {client.lastName}</Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                            ({client.availableSessions || 0} current sessions)
                                        </Typography>
                                      </MuiBox>
                                  </Stack>
                              </MenuItem>
                          ))}
                      </Select>
                  </FormControl>
              </Grid>
             {/* Number of Sessions */}
              <Grid item xs={12}>
                  <TextField
                      label="Number of Sessions to Add" type="number" size="small" fullWidth variant="outlined"
                      value={sessionsToAdd}
                      onChange={(e) => setSessionsToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))} // Ensure positive number
                      InputProps={{ inputProps: { min: 1, max: 100 } }}
                  />
              </Grid>
             {/* Admin Notes */}
              <Grid item xs={12}>
                  <TextField
                      label="Admin Notes (Optional)" size="small" fullWidth multiline rows={3} variant="outlined"
                      value={addSessionsNote}
                      onChange={(e) => setAddSessionsNote(e.target.value)}
                      placeholder="Reason for adding sessions (e.g., purchased package, referral bonus)"
                  />
              </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
           <GlowButton
             text="Cancel"
             theme="cosmic"
             size="small"
             onClick={() => setOpenAddSessionsDialog(false)}
           />
           <GlowButton
             text="Add Sessions"
             theme="emerald"
             size="small"
             leftIcon={<Zap size={16} />}
             onClick={handleAddSessions}
             disabled={!selectedClient || sessionsToAdd <= 0} // Basic validation
             // Optionally disable while processing
           />
        </DialogActions>
      </StyledDialog>

      {/* TRAINER ASSIGNMENT SECTION */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ marginTop: '2rem' }}
      >
        <StyledCard>
          <CardHeader>
            <CardTitle>
              <User size={24} style={{ marginRight: '0.5rem' }} />
              Trainer Assignment Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrainerAssignmentSection
              sessions={sessions}
              clients={clients}
              trainers={trainers}
              onAssignmentSuccess={fetchSessions}
              toast={toast}
            />
          </CardContent>
        </StyledCard>
      </motion.div>

    </PageContainer>
  );
};

/**
 * TrainerAssignmentSection Component
 * ==================================
 * 
 * Comprehensive trainer assignment interface for admin dashboard.
 * Features assignment controls, statistics, and bulk operations.
 */
interface TrainerAssignmentSectionProps {
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  onAssignmentSuccess: () => void;
  toast: any;
}

const TrainerAssignmentSection: React.FC<TrainerAssignmentSectionProps> = ({
  sessions,
  clients,
  trainers,
  onAssignmentSuccess,
  toast
}) => {
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState<any>(null);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  
  // Get unassigned sessions for the selected client
  const getUnassignedSessions = () => {
    return sessions.filter(session => 
      session.status === 'available' && 
      session.trainerId === null &&
      (!selectedClient || session.userId === selectedClient)
    );
  };
  
  // Get assignment statistics
  useEffect(() => {
    const fetchAssignmentStats = async () => {
      try {
        const response = await services.sessionService.getAssignmentStatistics();
        if (response.success) {
          setAssignmentStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching assignment statistics:', error);
      }
    };
    
    fetchAssignmentStats();
  }, [sessions]);
  
  // Handle trainer assignment
  const handleAssignTrainer = async () => {
    if (!selectedTrainer || !selectedClient) {
      toast({
        title: "Missing Information",
        description: "Please select both a trainer and client.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const sessionIds = assignmentMode === 'bulk' ? selectedSessions : [];
      const response = await services.sessionService.assignTrainerToClient(
        selectedTrainer,
        selectedClient,
        sessionIds
      );
      
      if (response.success) {
        toast({
          title: "Assignment Successful",
          description: response.message,
          variant: "default"
        });
        
        // Reset form
        setSelectedTrainer('');
        setSelectedClient('');
        setSelectedSessions([]);
        setOpenBulkDialog(false);
        
        // Refresh data
        onAssignmentSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || 'Failed to assign trainer',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle assignment removal
  const handleRemoveAssignment = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    
    setLoading(true);
    try {
      const response = await services.sessionService.removeTrainerAssignment(sessionIds);
      
      if (response.success) {
        toast({
          title: "Assignment Removed",
          description: response.message,
          variant: "default"
        });
        onAssignmentSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message || 'Failed to remove assignment',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const unassignedSessions = getUnassignedSessions();
  
  return (
    <div>
      {/* Assignment Statistics */}
      {assignmentStats && (
        <Grid container spacing={2} style={{ marginBottom: '2rem' }}>
          <Grid item xs={12} sm={3}>
            <StatsCard>
              <StatsIconContainer>
                <CheckCircle size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.sessionSummary?.assigned || 0}</StatsValue>
                <StatsLabel>Assigned Sessions</StatsLabel>
              </div>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={3}>
            <StatsCard>
              <StatsIconContainer>
                <Clock size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.sessionSummary?.available || 0}</StatsValue>
                <StatsLabel>Unassigned Sessions</StatsLabel>
              </div>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={3}>
            <StatsCard>
              <StatsIconContainer>
                <User size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{trainers.length}</StatsValue>
                <StatsLabel>Active Trainers</StatsLabel>
              </div>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={3}>
            <StatsCard>
              <StatsIconContainer>
                <Zap size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.assignmentRate || 0}%</StatsValue>
                <StatsLabel>Assignment Rate</StatsLabel>
              </div>
            </StatsCard>
          </Grid>
        </Grid>
      )}
      
      {/* Assignment Controls */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '1.5rem', background: 'rgba(30, 30, 60, 0.4)', border: '1px solid rgba(0, 255, 255, 0.3)' }}>
            <Typography variant="h6" style={{ marginBottom: '1rem', color: '#00FFFF' }}>
              Assign Trainer to Client
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Client</InputLabel>
                  <Select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    label="Select Client"
                  >
                    <MenuItem value="">
                      <em>Select a client...</em>
                    </MenuItem>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            src={client.photo}
                            sx={{ width: 24, height: 24 }}
                          >
                            {client.firstName.charAt(0)}
                          </Avatar>
                          <div>
                            <Typography variant="body2">
                              {client.firstName} {client.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {client.availableSessions} sessions available
                            </Typography>
                          </div>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Trainer</InputLabel>
                  <Select
                    value={selectedTrainer}
                    onChange={(e) => setSelectedTrainer(e.target.value)}
                    label="Select Trainer"
                  >
                    <MenuItem value="">
                      <em>Select a trainer...</em>
                    </MenuItem>
                    {trainers.map((trainer) => (
                      <MenuItem key={trainer.id} value={trainer.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar
                            src={trainer.photo}
                            sx={{ width: 24, height: 24 }}
                          >
                            {trainer.firstName.charAt(0)}
                          </Avatar>
                          <div>
                            <Typography variant="body2">
                              {trainer.firstName} {trainer.lastName}
                            </Typography>
                            {trainer.specialties && (
                              <Typography variant="caption" color="textSecondary">
                                {trainer.specialties}
                              </Typography>
                            )}
                          </div>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {selectedClient && (
                <Grid item xs={12}>
                  <Typography variant="body2" style={{ marginBottom: '0.5rem' }}>
                    Unassigned Sessions: {unassignedSessions.length}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} style={{ marginBottom: '1rem' }}>
                    <GlowButton
                      text="Assign All Available"
                      theme="cyan"
                      size="small"
                      onClick={() => setAssignmentMode('single')}
                      variant={assignmentMode === 'single' ? 'solid' : 'outline'}
                    />
                    <GlowButton
                      text="Select Specific"
                      theme="purple"
                      size="small"
                      onClick={() => {
                        setAssignmentMode('bulk');
                        setOpenBulkDialog(true);
                      }}
                      variant={assignmentMode === 'bulk' ? 'solid' : 'outline'}
                    />
                  </Stack>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <GlowButton
                  text={loading ? "Assigning..." : "Assign Trainer"}
                  theme="emerald"
                  size="medium"
                  leftIcon={<User size={16} />}
                  onClick={handleAssignTrainer}
                  disabled={loading || !selectedTrainer || !selectedClient}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper style={{ padding: '1.5rem', background: 'rgba(30, 30, 60, 0.4)', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
            <Typography variant="h6" style={{ marginBottom: '1rem', color: '#FFD700' }}>
              Assignment Quick Actions
            </Typography>
            
            <Stack spacing={2}>
              <GlowButton
                text="View Assignment Statistics"
                theme="cosmic"
                size="small"
                leftIcon={<Eye size={16} />}
                onClick={() => {
                  // Could open a detailed statistics modal
                  console.log('Assignment stats:', assignmentStats);
                }}
                fullWidth
              />
              
              <GlowButton
                text="Bulk Remove Assignments"
                theme="red"
                size="small"
                leftIcon={<RefreshCw size={16} />}
                onClick={() => {
                  const assignedSessionIds = sessions
                    .filter(session => session.trainerId && session.status === 'assigned')
                    .map(session => session.id);
                  
                  if (assignedSessionIds.length > 0) {
                    handleRemoveAssignment(assignedSessionIds);
                  } else {
                    toast({
                      title: "No Assignments Found",
                      description: "No assigned sessions to remove.",
                      variant: "default"
                    });
                  }
                }}
                fullWidth
              />
              
              <GlowButton
                text="Export Assignment Report"
                theme="purple"
                size="small"
                leftIcon={<Download size={16} />}
                onClick={() => {
                  // Generate and download assignment report
                  const reportData = {
                    assignmentStats,
                    trainerWorkload: assignmentStats?.trainerWorkload || [],
                    timestamp: new Date().toISOString()
                  };
                  
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `trainer-assignments-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                fullWidth
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Bulk Selection Dialog */}
      <Dialog
        open={openBulkDialog}
        onClose={() => setOpenBulkDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Sessions to Assign</DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ marginBottom: '1rem' }}>
            Select specific sessions to assign to the trainer:
          </Typography>
          
          {unassignedSessions.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {unassignedSessions.map((session) => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem',
                    border: selectedSessions.includes(session.id) ? '2px solid #00FFFF' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    margin: '0.5rem 0',
                    cursor: 'pointer',
                    background: selectedSessions.includes(session.id) ? 'rgba(0, 255, 255, 0.1)' : 'transparent'
                  }}
                  onClick={() => {
                    setSelectedSessions(prev => 
                      prev.includes(session.id)
                        ? prev.filter(id => id !== session.id)
                        : [...prev, session.id]
                    );
                  }}
                >
                  <CheckSquare 
                    size={20} 
                    color={selectedSessions.includes(session.id) ? '#00FFFF' : '#666'}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <div>
                    <Typography variant="body2">
                      Session {session.id} - {session.duration} minutes
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Location: {session.location || 'Not specified'}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No unassigned sessions available for this client.
            </Typography>
          )}
          
          <Typography variant="body2" style={{ marginTop: '1rem' }}>
            Selected: {selectedSessions.length} sessions
          </Typography>
        </DialogContent>
        <DialogActions>
          <GlowButton
            text="Cancel"
            theme="cosmic"
            size="small"
            onClick={() => {
              setOpenBulkDialog(false);
              setSelectedSessions([]);
            }}
          />
          <GlowButton
            text={`Assign ${selectedSessions.length} Sessions`}
            theme="emerald"
            size="small"
            onClick={() => {
              setAssignmentMode('bulk');
              setOpenBulkDialog(false);
            }}
            disabled={selectedSessions.length === 0}
          />
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EnhancedAdminSessionsView;u