// C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\src\components\DashBoard\Pages\admin-sessions\enhanced-admin-sessions-view.tsx
// (Code is identical to the large block you provided earlier, confirming its structure and features)

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";
import GlowButton from '../../../Button/glowButton'; // Ensure path is correct
import PurchaseCreditsModal from './PurchaseCreditsModal';
import CreateSessionModal from './CreateSessionModal';
import ViewSessionModal from './ViewSessionModal';
import EditSessionModal from './EditSessionModal';

// Import Icons
import {
  Search,
  Edit,
  Calendar,
  Clock,
  User,
  Plus,
  Download,
  Eye,
  CheckCircle,
  RefreshCw,
  Zap,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  DialogPanel,
  DialogTitleBar,
  DialogContentArea,
  DialogActionsBar,
  FlexRow,
  StyledAvatar,
  SessionCountChip,
  DateInput,
  SearchInputWrapper,
  SearchIconSpan,
  SearchInput,
  PaginationContainer,
  PaginationSelect,
  PaginationButton,
  MutedText,
  BodyText,
  CaptionText,
  DeleteDetailBox,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from './styled-admin-sessions'; // Ensure path is correct

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
  const { authAxios } = useAuth();
  const { toast } = useToast();

  // State for data, loading and errors
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for UI controls
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  // State for dialogs
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openAddSessionsDialog, setOpenAddSessionsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [sessionsToAdd, setSessionsToAdd] = useState<number>(1);
  const [addSessionsNote, setAddSessionsNote] = useState<string>('');

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

  // Fetch sessions from API
  const fetchSessions = async () => {
    setLoading(true);
    setError(null); // Reset error on new fetch
    try {
      // TODO: Add query params for server-side filtering/pagination if needed
      const response = await authAxios.get('/api/sessions');

      if (response.data && Array.isArray(response.data)) {
        setSessions(response.data);

        // Calculate stats
        const today = new Date().toLocaleDateString();

        const todaySessionsCount = response.data.filter(session =>
          new Date(session.sessionDate).toLocaleDateString() === today
        ).length;

        const completedSessions = response.data.filter(session =>
          session.status === 'completed'
        );

        const completedHours = completedSessions.reduce((total, session) =>
          total + (session.duration / 60), 0
        );

        const uniqueTrainers = new Set(
          response.data
            .filter(session => session.trainerId)
            .map(session => session.trainerId)
        );

        const relevantSessionsForRate = response.data.filter(session =>
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
        console.warn('Received unexpected data structure for sessions:', response.data);
        setError('Failed to fetch sessions data: Invalid format');
        toast({
          title: "Error",
          description: "Failed to load sessions (invalid format)",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error connecting to the server';
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
      const response = await authAxios.get('/api/auth/clients'); // Ensure this endpoint returns clients

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

  // Fetch trainers for session assignment
  const fetchTrainers = async () => {
    setLoadingTrainers(true);
    try {
      const response = await authAxios.get('/api/auth/trainers'); // Ensure this endpoint returns trainers

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Assuming authAxios and toast are stable references

  // Handle pagination change
  const handleChangePage = (_direction: 'prev' | 'next') => {
    if (_direction === 'prev') {
      setPage((prev) => Math.max(0, prev - 1));
    } else {
      setPage((prev) => prev + 1);
    }
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
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
    setOpenEditDialog(true);
  };

  // Handle save edited session (now accepts data object)
  const handleSaveEditedSession = async (updatedSessionData: any) => {
    if (!selectedSession) return;

    try {
      // Make the API call
      const response = await authAxios.put(`/api/sessions/${selectedSession.id}`, updatedSessionData);

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

  // Handle create new session
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

      const response = await authAxios.post('/api/sessions', newSessionData);

      if (response.status === 201) {
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

  // Handle adding sessions to client (Admin action)
  const handleAddSessions = async () => {
    if (!selectedClient) {
      toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
      return;
    }
    if (isNaN(sessionsToAdd) || sessionsToAdd <= 0) {
      toast({ title: "Error", description: "Please enter a valid positive number of sessions.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await authAxios.post(`/api/session-packages/add-sessions/${selectedClient}`, {
        sessions: sessionsToAdd,
        notes: addSessionsNote // Include admin notes
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: `Added ${sessionsToAdd} session(s) to the client.`,
        });

        fetchClients(); // Refresh client list to show updated session count
        fetchSessions(); // Refresh sessions if adding sessions affects display (e.g., available count)
        setOpenAddSessionsDialog(false);

        // Reset add sessions form
        setSelectedClient('');
        setSessionsToAdd(1);
        setAddSessionsNote('');
      } else {
        toast({
          title: "Error",
          description: response.data?.message || "Failed to add sessions.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error adding sessions:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Server error adding sessions';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Refresh sessions data
  const handleRefreshSessions = () => {
    toast({ title: "Refreshing...", description: "Fetching latest session data." });
    fetchSessions();
    fetchClients(); // Also refresh clients in case their session counts changed
    fetchTrainers();
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

  // Pagination computed values
  const totalPages = Math.ceil(filteredSessions.length / rowsPerPage);
  const paginatedSessions = filteredSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const startItem = filteredSessions.length === 0 ? 0 : page * rowsPerPage + 1;
  const endItem = Math.min((page + 1) * rowsPerPage, filteredSessions.length);

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard as={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <FlexRow $gap="0.75rem">
                  <Calendar size={28} />
                  <span style={{ fontWeight: 300, fontSize: '1.25rem' }}>
                     Training Sessions Management
                  </span>
                </FlexRow>
              </CardTitle>
              <FlexRow $gap="0.75rem">
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
              </FlexRow>
            </CardHeader>

            <CardContent>
              {/* Stats Cards */}
              <StatsGridContainer>
                 {/* Stats Card 1: Today's Sessions */}
                 <StatsCard $variant="primary" custom={0} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="primary"><Calendar size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.todaySessions}</StatsValue>
                             <StatsLabel>Sessions Today</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 2: Completed Hours */}
                 <StatsCard $variant="success" custom={1} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="success"><Clock size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.completedHours}</StatsValue>
                             <StatsLabel>Hours Completed</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 3: Active Trainers */}
                 <StatsCard $variant="info" custom={2} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="info"><User size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.activeTrainers}</StatsValue>
                             <StatsLabel>Active Trainers</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 4: Completion Rate */}
                 <StatsCard $variant="warning" custom={3} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="warning"><CheckCircle size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : `${statsData.completionRate}%`}</StatsValue>
                             <StatsLabel>Completion Rate</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
              </StatsGridContainer>

              {/* Filters and Search */}
              <FilterContainer variants={itemVariants}>
                 <SearchInputWrapper>
                     <SearchIconSpan>
                         <Search size={20} />
                     </SearchIconSpan>
                     <SearchInput
                         placeholder="Search client, trainer, status..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                     />
                 </SearchInputWrapper>
                 <FlexRow $gap="0.5rem">
                    <DateInput
                      type="date"
                      aria-label="From date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <DateInput
                      type="date"
                      aria-label="To date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                 </FlexRow>
                 <FilterButtonsContainer>
                     {/* Filter Buttons */}
                     {(['all', 'available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
                         <FilterButton
                             key={status}
                             $isActive={statusFilter === status}
                             $buttonColor={
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

              {/* Sessions Table */}
              {loading ? (
                <LoadingContainer><LoadingSpinner /></LoadingContainer>
              ) : error ? (
                 <EmptyStateContainer>
                    <EmptyStateIcon>&#9888;&#65039;</EmptyStateIcon>
                    <EmptyStateText>Error loading sessions: {error}</EmptyStateText>
                    <GlowButton text="Retry" onClick={fetchSessions} theme="ruby" size="small" />
                 </EmptyStateContainer>
              ) : (
                <StyledTableContainer>
                  <table aria-label="sessions table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <StyledTableHead>
                        <StyledTableHeadCell>Client</StyledTableHeadCell>
                        <StyledTableHeadCell>Trainer</StyledTableHeadCell>
                        <StyledTableHeadCell>Date &amp; Time</StyledTableHeadCell>
                        <StyledTableHeadCell>Location</StyledTableHeadCell>
                        <StyledTableHeadCell>Duration</StyledTableHeadCell>
                        <StyledTableHeadCell>Status</StyledTableHeadCell>
                        <StyledTableHeadCell style={{ textAlign: 'right' }}>Actions</StyledTableHeadCell>
                      </StyledTableHead>
                    </thead>
                    <tbody>
                      {paginatedSessions.length > 0 ? (
                        paginatedSessions
                          .map((session, index) => (
                            <StyledTableRow
                              key={session.id || index} // Use index as fallback key if id is missing
                              as={motion.tr}
                              custom={index}
                              variants={staggeredItemVariants}
                              initial="hidden"
                              animate="visible"
                              layout // Animate layout changes
                            >
                              {/* Client Cell */}
                               <StyledTableCell>
                                 {session.client ? (
                                   <FlexRow $gap="0.5rem">
                                     <StyledAvatar $size={32}>
                                       {session.client.photo ? (
                                         <img
                                           src={session.client.photo}
                                           alt={`${session.client.firstName} ${session.client.lastName}`}
                                         />
                                       ) : (
                                         <>
                                           {session.client.firstName?.[0]}
                                           {session.client.lastName?.[0]}
                                         </>
                                       )}
                                     </StyledAvatar>
                                     <div>
                                       <BodyText $weight={500}>
                                            {session.client.firstName} {session.client.lastName}
                                       </BodyText>
                                       <br />
                                       <SessionCountChip $hasCredits={(session.client.availableSessions ?? 0) > 0}>
                                         {session.client.availableSessions ?? 0} sessions
                                       </SessionCountChip>
                                     </div>
                                   </FlexRow>
                                 ) : (
                                   <MutedText>
                                        {session.status === 'available' ? 'Available Slot' : 'No Client'}
                                   </MutedText>
                                 )}
                               </StyledTableCell>

                               {/* Trainer Cell */}
                               <StyledTableCell>
                                   {session.trainer ? (
                                     <FlexRow $gap="0.5rem">
                                       <StyledAvatar $size={32}>
                                         {session.trainer.photo ? (
                                           <img
                                             src={session.trainer.photo}
                                             alt={`${session.trainer.firstName} ${session.trainer.lastName}`}
                                           />
                                         ) : (
                                           <>
                                              {session.trainer.firstName?.[0]}
                                              {session.trainer.lastName?.[0]}
                                           </>
                                         )}
                                       </StyledAvatar>
                                       <BodyText>
                                           {session.trainer.firstName} {session.trainer.lastName}
                                       </BodyText>
                                     </FlexRow>
                                   ) : (
                                     <MutedText>
                                        Unassigned
                                     </MutedText>
                                   )}
                                 </StyledTableCell>

                              {/* Date & Time Cell */}
                              <StyledTableCell>
                                 <BodyText>{formatDate(session.sessionDate)}</BodyText>
                                 <br />
                                 <CaptionText>{formatTime(session.sessionDate)}</CaptionText>
                              </StyledTableCell>
                              <StyledTableCell>{session.location || 'N/A'}</StyledTableCell>
                              <StyledTableCell>{session.duration || 'N/A'} min</StyledTableCell>
                              <StyledTableCell>
                                <ChipContainer $chipStatus={session.status}>
                                  {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
                                </ChipContainer>
                              </StyledTableCell>
                              <StyledTableCell style={{ textAlign: 'right' }}>
                                <IconButtonContainer>
                                  <StyledIconButton
                                    $btnColor="primary"
                                    onClick={() => handleViewSession(session)}
                                    title="View Details"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Eye size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    $btnColor="secondary"
                                    onClick={() => handleEditSession(session)}
                                    title="Edit Session"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Edit size={16} />
                                  </StyledIconButton>
                                  <StyledIconButton
                                    $btnColor="error"
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
                          <StyledTableCell colSpan={7}>
                            <EmptyStateContainer>
                              <EmptyStateIcon>&#128197;</EmptyStateIcon>
                              <EmptyStateText>
                                No sessions found matching your criteria.
                              </EmptyStateText>
                            </EmptyStateContainer>
                          </StyledTableCell>
                        </StyledTableRow>
                      )}
                    </tbody>
                  </table>
                </StyledTableContainer>
              )}

              {/* Pagination */}
              {filteredSessions.length > 0 && (
                <PaginationContainer>
                  <FlexRow $gap="0.5rem">
                    <span>Rows per page:</span>
                    <PaginationSelect
                      value={rowsPerPage}
                      onChange={handleChangeRowsPerPage}
                    >
                      {[5, 10, 25, 50].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </PaginationSelect>
                  </FlexRow>
                  <span>
                    {startItem}-{endItem} of {filteredSessions.length}
                  </span>
                  <FlexRow $gap="0.25rem">
                    <PaginationButton
                      $disabled={page === 0}
                      disabled={page === 0}
                      onClick={() => handleChangePage('prev')}
                      title="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </PaginationButton>
                    <PaginationButton
                      $disabled={page >= totalPages - 1}
                      disabled={page >= totalPages - 1}
                      onClick={() => handleChangePage('next')}
                      title="Next page"
                    >
                      <ChevronRight size={18} />
                    </PaginationButton>
                  </FlexRow>
                </PaginationContainer>
              )}

              {/* Action Buttons */}
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
                  onClick={() => {
                    toast({
                      title: "Feature Pending",
                      description: "Session data export is not yet implemented.",
                    });
                    // Add export logic here when ready (e.g., generate CSV)
                  }}
                  disabled={loading || filteredSessions.length === 0}
                />
              </FooterActionsContainer>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* --- DIALOGS --- */}

      {/* View Session Dialog */}
      <ViewSessionModal
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        session={selectedSession}
        onEdit={(session) => {
          setOpenViewDialog(false);
          handleEditSession(session);
        }}
      />

      {/* Edit Session Dialog */}
      <EditSessionModal
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        session={selectedSession}
        clients={clients}
        trainers={trainers}
        loadingClients={loadingClients}
        loadingTrainers={loadingTrainers}
        onSave={handleSaveEditedSession}
      />

       {/* New Session Dialog */}
       <CreateSessionModal
         open={openNewDialog}
         onClose={() => setOpenNewDialog(false)}
         clients={clients}
         trainers={trainers}
         loadingClients={loadingClients}
         loadingTrainers={loadingTrainers}
         client={newSessionClient}
         onClientChange={setNewSessionClient}
         trainer={newSessionTrainer}
         onTrainerChange={setNewSessionTrainer}
         date={newSessionDate}
         onDateChange={setNewSessionDate}
         time={newSessionTime}
         onTimeChange={setNewSessionTime}
         duration={newSessionDuration}
         onDurationChange={setNewSessionDuration}
         location={newSessionLocation}
         onLocationChange={setNewSessionLocation}
         notes={newSessionNotes}
         onNotesChange={setNewSessionNotes}
         onSubmit={handleCreateNewSession}
       />

      {/* Add Sessions Dialog */}
      <PurchaseCreditsModal
        open={openAddSessionsDialog}
        onClose={() => setOpenAddSessionsDialog(false)}
        clients={clients}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        sessionsToAdd={sessionsToAdd}
        onSessionsChange={setSessionsToAdd}
        notes={addSessionsNote}
        onNotesChange={setAddSessionsNote}
        onSubmit={handleAddSessions}
        loadingClients={loadingClients}
        isProcessing={isProcessing}
      />

      {/* Delete Confirmation Dialog */}
      <StyledDialog
        $open={openDeleteDialog}
        onClick={() => setOpenDeleteDialog(false)}
      >
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem" style={{ color: '#ef4444' }}>
              <AlertCircle size={22} />
              <span>Confirm Deletion</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            {sessionToDelete && (
              <DeleteDetailBox>
                <BodyText $weight={600} $color="white">
                  {formatDate(sessionToDelete.sessionDate)} at {formatTime(sessionToDelete.sessionDate)}
                </BodyText>
                {sessionToDelete.client && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <BodyText $color="rgba(255,255,255,0.7)">
                      Client: {sessionToDelete.client.firstName} {sessionToDelete.client.lastName}
                    </BodyText>
                  </div>
                )}
              </DeleteDetailBox>
            )}
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton text="Cancel" theme="cosmic" size="small" onClick={() => setOpenDeleteDialog(false)} />
            <GlowButton
              text="Delete"
              theme="ruby"
              size="small"
              onClick={handleConfirmDelete}
              isLoading={isProcessing}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

    </PageContainer>
  );
};

export default EnhancedAdminSessionsView;
