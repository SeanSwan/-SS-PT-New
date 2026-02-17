import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Calendar,
  Clock,
  User,
  Plus,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Trash2,
  RefreshCw,
  Zap,
  CheckSquare,
  TableIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Styled Components (shared)
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
  DialogPanel,
  DialogTitleBar,
  DialogContentArea,
  DialogActionsBar,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from './styled-admin-sessions'; // Ensure path is correct

/* ─── Local Styled Components ──────────────────────────────────────────── */

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

const FlexRow = styled.div<{ $gap?: string; $align?: string; $justify?: string; $wrap?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: ${p => p.$align || 'center'};
  justify-content: ${p => p.$justify || 'flex-start'};
  gap: ${p => p.$gap || '0.5rem'};
  flex-wrap: ${p => p.$wrap ? 'wrap' : 'nowrap'};
`;

const FlexCol = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${p => p.$gap || '0.5rem'};
`;

const ViewToggleContainer = styled.div`
  background: rgba(30, 58, 138, 0.2);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  display: flex;
  gap: 4px;
`;

const TitleText = styled.span`
  font-weight: 300;
  font-size: 1.25rem;
  color: #e2e8f0;
`;

const SubtitleText = styled.span`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
`;

const BulkSelectedText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const NativeTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const NativeTableHead = styled.thead``;

const NativeTableBody = styled.tbody``;

const SortableHeaderCell = styled(StyledTableHeadCell)`
  cursor: pointer;
  user-select: none;
  &:hover {
    background: rgba(59, 130, 246, 0.15);
  }
`;

const CheckboxCell = styled(StyledTableHeadCell)`
  width: 48px;
  min-width: 48px;
`;

const CheckboxBodyCell = styled(StyledTableCell)`
  width: 48px;
  min-width: 48px;
`;

const ActionsCell = styled(StyledTableHeadCell)`
  text-align: right;
`;

const ActionsBodyCell = styled(StyledTableCell)`
  text-align: right;
`;

/* Styled Checkbox */
const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const CheckboxWrapper = styled.label<{ $checked?: boolean; $indeterminate?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  position: relative;

  &::before {
    content: '';
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid ${p => (p.$checked || p.$indeterminate) ? '#00ffff' : 'rgba(255,255,255,0.5)'};
    background: ${p => (p.$checked || p.$indeterminate) ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
    transition: all 0.2s ease;
  }

  &::after {
    content: '${p => p.$indeterminate ? '\\2014' : p.$checked ? '\\2713' : ''}';
    position: absolute;
    color: #00ffff;
    font-size: ${p => p.$indeterminate ? '14px' : '13px'};
    font-weight: bold;
    line-height: 1;
  }
`;

/* Avatar */
const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${p => p.$size || 32}px;
  height: ${p => p.$size || 32}px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(14, 165, 233, 0.3));
  border: 1px solid rgba(14, 165, 233, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${p => ((p.$size || 32) * 0.35)}px;
  font-weight: 600;
  color: #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/* Session count chip inside table */
const SessionCountChip = styled.span<{ $hasAvailable?: boolean }>`
  font-size: 0.7rem;
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  margin-top: 4px;
  border-radius: 10px;
  border: 1px solid ${p => p.$hasAvailable ? 'rgba(46, 125, 50, 0.5)' : 'rgba(211, 47, 47, 0.5)'};
  color: ${p => p.$hasAvailable ? 'rgba(46, 125, 50, 1)' : 'rgba(211, 47, 47, 1)'};
  background: ${p => p.$hasAvailable ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)'};
`;

const CellPrimaryText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  display: block;
`;

const CellSecondaryText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  display: block;
`;

const MutedText = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  font-size: 0.875rem;
`;

/* Pagination */
const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: rgba(255, 255, 255, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;

  select {
    background: rgba(20, 20, 40, 0.5);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
    min-height: 44px;

    &:focus {
      border-color: rgba(0, 255, 255, 0.5);
    }
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)'};
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  padding: 4px 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

/* Calendar wrapper */
const CalendarViewWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  background: rgba(30, 58, 138, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;
  min-height: 600px;

  & > div {
    height: 100%;
  }

  .rbc-calendar {
    background: rgba(20, 20, 40, 0.4);
    color: white;
  }
  .rbc-toolbar {
    background: rgba(30, 58, 138, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .rbc-toolbar-label {
    color: #e5e7eb;
    font-size: 1.2rem;
    font-weight: 500;
  }
  .rbc-header {
    background: rgba(30, 58, 138, 0.2);
    color: #e5e7eb;
    font-weight: 500;
    border-color: rgba(59, 130, 246, 0.15);
    padding: 0.75rem;
  }
  .rbc-event {
    background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
    border: none;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    border-radius: 6px;
    padding: 4px 8px;
    font-weight: 500;
  }
  .rbc-event.available {
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  }
  .rbc-event.confirmed {
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
  }
  .rbc-event.cancelled {
    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
    opacity: 0.7;
  }
  .rbc-event.completed {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  }
  .rbc-today {
    background: rgba(59, 130, 246, 0.1);
  }
  .rbc-off-range-bg {
    background: rgba(10, 10, 15, 0.3);
  }
  .rbc-date-cell {
    color: #e5e7eb;
  }
  .rbc-time-slot {
    color: #9ca3af;
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-day-bg, .rbc-month-row, .rbc-time-content {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-btn-group button {
    background: rgba(30, 58, 138, 0.4);
    color: white;
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 0.5rem 1rem;
    font-weight: 500;
    &:hover {
      background: rgba(59, 130, 246, 0.4);
    }
    &.rbc-active {
      background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
      border-color: #3b82f6;
    }
  }
  .rbc-time-view {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-month-view {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-agenda-view {
    color: #e5e7eb;
  }
  .rbc-agenda-date-cell, .rbc-agenda-time-cell {
    color: #9ca3af;
  }
  .rbc-agenda-event-cell {
    color: #e5e7eb;
  }
`;

const TestControlsWrapper = styled.div`
  margin-top: 2rem;
`;

/* Dialog form helpers */
const FormGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$columns || 2}, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div<{ $fullWidth?: boolean }>`
  grid-column: ${p => p.$fullWidth ? '1 / -1' : 'auto'};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FormLabel = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

const FormInput = styled.input`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const FormTextarea = styled.textarea`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const FormSelect = styled.select`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.15);
  }

  option {
    background: #1a1a2e;
    color: #e2e8f0;
  }
`;

const DialogDescriptionText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
`;

const OverlineLabel = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.25rem;
`;

const DetailValue = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: #e2e8f0;
  display: block;
`;

const NotesBox = styled.div`
  padding: 0.75rem;
  margin-top: 0.25rem;
  border-radius: 8px;
  min-height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: pre-wrap;
  color: #e2e8f0;
  font-size: 0.875rem;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const DetailFullRow = styled.div`
  grid-column: 1 / -1;
`;

/* Trainer Assignment Section styled components */
const AssignmentPanel = styled.div<{ $accentColor?: string }>`
  padding: 1.5rem;
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid ${p => p.$accentColor || 'rgba(0, 255, 255, 0.3)'};
  border-radius: 12px;
`;

const AssignmentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AssignmentStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const PanelHeading = styled.h3<{ $color?: string }>`
  margin: 0 0 1rem 0;
  color: ${p => p.$color || '#00FFFF'};
  font-size: 1.1rem;
  font-weight: 600;
`;

const SessionSelectItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border: ${p => p.$selected ? '2px solid #00FFFF' : '1px solid rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  margin: 0.5rem 0;
  cursor: pointer;
  background: ${p => p.$selected ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${p => p.$selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const ScrollableList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 300px;

  @media (max-width: 600px) {
    min-width: 100%;
  }

  svg {
    position: absolute;
    left: 10px;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }
`;

const SearchInputField = styled(SearchField)`
  padding-left: 2.25rem;
`;

const DateFilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const DateInput = styled(FormInput)`
  width: 140px;
  font-size: 0.85rem;
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
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
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
      await apiService.delete(`/api/sessions/${sessionToDelete.id}`);
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

  // Compute pagination values
  const totalPages = Math.ceil(sortedSessions.length / rowsPerPage);
  const paginatedSessions = sortedSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const displayStart = sortedSessions.length === 0 ? 0 : page * rowsPerPage + 1;
  const displayEnd = Math.min((page + 1) * rowsPerPage, sortedSessions.length);

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
                  <TitleText>Training Sessions Management</TitleText>
                </FlexRow>
              </CardTitle>
              <FlexRow $gap="0.75rem">
              {/* View Toggle Buttons */}
              <ViewToggleContainer>
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
              </ViewToggleContainer>

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
                 <StatsCard $variant="primary" as={motion.div} custom={0} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="primary"><Calendar size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.todaySessions}</StatsValue>
                             <StatsLabel>Sessions Today</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 2: Completed Hours */}
                 <StatsCard $variant="success" as={motion.div} custom={1} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="success"><Clock size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.completedHours}</StatsValue>
                             <StatsLabel>Hours Completed</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 3: Active Trainers */}
                 <StatsCard $variant="info" as={motion.div} custom={2} variants={staggeredItemVariants}>
                     <FlexRow $gap="1rem">
                         <StatsIconContainer $variant="info"><User size={24} /></StatsIconContainer>
                         <div>
                             <StatsValue>{loading ? '-' : statsData.activeTrainers}</StatsValue>
                             <StatsLabel>Active Trainers</StatsLabel>
                         </div>
                     </FlexRow>
                 </StatsCard>
                 {/* Stats Card 4: Completion Rate */}
                 <StatsCard $variant="warning" as={motion.div} custom={3} variants={staggeredItemVariants}>
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
              <FilterContainer as={motion.div} variants={itemVariants}>
                 <SearchInputWrapper>
                   <Search size={20} />
                   <SearchInputField
                     placeholder="Search client, trainer, status..."
                     value={searchTerm}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                   />
                 </SearchInputWrapper>
                 <DateFilterRow>
                    <DateInput
                      type="date"
                      value={startDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                      aria-label="From date"
                      title="From date"
                    />
                    <DateInput
                      type="date"
                      value={endDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                      aria-label="To date"
                      title="To date"
                    />
                 </DateFilterRow>
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
                        <BulkSelectedText>{selectedIds.length} selected</BulkSelectedText>
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
                    <EmptyStateIcon>!</EmptyStateIcon>
                    <EmptyStateText>Error loading sessions: {error}</EmptyStateText>
                    <GlowButton text="Retry" onClick={fetchSessions} theme="ruby" size="small" />
                 </EmptyStateContainer>
              ) : (
                <StyledTableContainer>
                  <NativeTable aria-label="sessions table">
                    <NativeTableHead>
                      <StyledTableHead>
                        <CheckboxCell>
                          <CheckboxWrapper
                            $indeterminate={selectedIds.length > 0 && selectedIds.length < sortedSessions.length}
                            $checked={sortedSessions.length > 0 && selectedIds.length === sortedSessions.length}
                          >
                            <HiddenCheckbox
                              checked={sortedSessions.length > 0 && selectedIds.length === sortedSessions.length}
                              onChange={handleSelectAll}
                              aria-label="select all sessions"
                            />
                          </CheckboxWrapper>
                        </CheckboxCell>
                        <SortableHeaderCell onClick={() => handleSort('client')}>
                          <FlexRow $gap="0.25rem">
                            <span>Client</span>
                            {sortConfig.key === 'client' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <SortableHeaderCell onClick={() => handleSort('trainer')}>
                          <FlexRow $gap="0.25rem">
                            <span>Trainer</span>
                            {sortConfig.key === 'trainer' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <SortableHeaderCell onClick={() => handleSort('sessionDate')}>
                          <FlexRow $gap="0.25rem">
                            <span>Date & Time</span>
                            {sortConfig.key === 'sessionDate' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <SortableHeaderCell onClick={() => handleSort('location')}>
                          <FlexRow $gap="0.25rem">
                            <span>Location</span>
                            {sortConfig.key === 'location' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <SortableHeaderCell onClick={() => handleSort('duration')}>
                          <FlexRow $gap="0.25rem">
                            <span>Duration</span>
                            {sortConfig.key === 'duration' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <SortableHeaderCell onClick={() => handleSort('status')}>
                          <FlexRow $gap="0.25rem">
                            <span>Status</span>
                            {sortConfig.key === 'status' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </FlexRow>
                        </SortableHeaderCell>
                        <ActionsCell>Actions</ActionsCell>
                      </StyledTableHead>
                    </NativeTableHead>
                    <NativeTableBody>
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
                              <CheckboxBodyCell>
                                <CheckboxWrapper
                                  $checked={selectedIds.indexOf(session.id) !== -1}
                                >
                                  <HiddenCheckbox
                                    checked={selectedIds.indexOf(session.id) !== -1}
                                    onChange={() => handleSelectOne(session.id)}
                                    aria-label={`select session ${session.id}`}
                                  />
                                </CheckboxWrapper>
                              </CheckboxBodyCell>
                              {/* Client Cell */}
                               <StyledTableCell>
                                 {session.client ? (
                                   <FlexRow $gap="0.5rem">
                                     <AvatarCircle $size={32}>
                                       {session.client.photo
                                         ? <img src={session.client.photo} alt={`${session.client.firstName} ${session.client.lastName}`} />
                                         : <>{session.client.firstName?.[0]}{session.client.lastName?.[0]}</>
                                       }
                                     </AvatarCircle>
                                     <div>
                                       <CellPrimaryText>
                                            {session.client.firstName} {session.client.lastName}
                                       </CellPrimaryText>
                                       <SessionCountChip $hasAvailable={(session.client.availableSessions ?? 0) > 0}>
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
                                       <AvatarCircle $size={32}>
                                         {session.trainer.photo
                                           ? <img src={session.trainer.photo} alt={`${session.trainer.firstName} ${session.trainer.lastName}`} />
                                           : <>{session.trainer.firstName?.[0]}{session.trainer.lastName?.[0]}</>
                                         }
                                       </AvatarCircle>
                                       <CellPrimaryText>
                                           {session.trainer.firstName} {session.trainer.lastName}
                                       </CellPrimaryText>
                                     </FlexRow>
                                   ) : (
                                     <MutedText>Unassigned</MutedText>
                                   )}
                                 </StyledTableCell>

                              {/* Date & Time Cell */}
                              <StyledTableCell>
                                 <CellPrimaryText>{formatDate(session.sessionDate)}</CellPrimaryText>
                                 <CellSecondaryText>{formatTime(session.sessionDate)}</CellSecondaryText>
                              </StyledTableCell>
                              <StyledTableCell>{session.location || 'N/A'}</StyledTableCell>
                              <StyledTableCell>{session.duration || 'N/A'} min</StyledTableCell>
                              <StyledTableCell>
                                <ChipContainer chipstatus={session.status}>
                                  {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
                                </ChipContainer>
                              </StyledTableCell>
                              <ActionsBodyCell>
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
                                    btncolor="secondary"
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
                              </ActionsBodyCell>
                            </StyledTableRow>
                          ))
                      ) : (
                        <StyledTableRow>
                          <StyledTableCell colSpan={9}>
                            <EmptyStateContainer>
                              <EmptyStateIcon>
                                <Calendar size={48} />
                              </EmptyStateIcon>
                              <EmptyStateText>
                                No sessions found matching your criteria.
                              </EmptyStateText>
                            </EmptyStateContainer>
                          </StyledTableCell>
                        </StyledTableRow>
                      )}
                    </NativeTableBody>
                  </NativeTable>
                </StyledTableContainer>
              )}

              {/* Pagination for Table View */}
              {sortedSessions.length > 0 && viewMode === 'table' && (
                <PaginationContainer>
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={handleChangeRowsPerPage}
                    aria-label="Rows per page"
                  >
                    {[5, 10, 25, 50].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span>{displayStart}-{displayEnd} of {sortedSessions.length}</span>
                  <FlexRow $gap="0.25rem">
                    <PaginationButton
                      $disabled={page === 0}
                      disabled={page === 0}
                      onClick={() => handleChangePage(null, page - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </PaginationButton>
                    <PaginationButton
                      $disabled={page >= totalPages - 1}
                      disabled={page >= totalPages - 1}
                      onClick={() => handleChangePage(null, page + 1)}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </PaginationButton>
                  </FlexRow>
                </PaginationContainer>
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
                <CalendarViewWrapper>
                  <ScheduleInitializer>
                    <ScheduleErrorBoundary>
                      <UnifiedCalendar />
                    </ScheduleErrorBoundary>
                  </ScheduleInitializer>
                </CalendarViewWrapper>
              )}

              {/* Development Testing Controls */}
              {process.env.NODE_ENV !== 'production' && viewMode === 'table' && (
                <TestControlsWrapper>
                  <SessionTestControls />
                </TestControlsWrapper>
              )}
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* --- DIALOGS --- */}

      {/* View Session Dialog */}
      <StyledDialog $open={openViewDialog} onClick={() => setOpenViewDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Calendar size={22} />
              <span>Session Details</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            {selectedSession ? (
              <>
                <DetailFullRow>
                  <OverlineLabel>Session ID</OverlineLabel>
                  <DetailValue>{selectedSession.id || 'N/A'}</DetailValue>
                </DetailFullRow>

                <DetailGrid style={{ marginTop: '1.25rem' }}>
                  <div>
                    <OverlineLabel>Status</OverlineLabel>
                    <ChipContainer chipstatus={selectedSession.status}>
                        {selectedSession.status ? selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1) : 'Unknown'}
                    </ChipContainer>
                  </div>
                  <div>
                    <OverlineLabel>Date & Time</OverlineLabel>
                    <DetailValue>
                        {formatDate(selectedSession.sessionDate)} at {formatTime(selectedSession.sessionDate)}
                    </DetailValue>
                  </div>
                  <div>
                    <OverlineLabel>Duration</OverlineLabel>
                    <DetailValue>{selectedSession.duration || 'N/A'} minutes</DetailValue>
                  </div>
                  <div>
                    <OverlineLabel>Location</OverlineLabel>
                    <DetailValue>{selectedSession.location || 'N/A'}</DetailValue>
                  </div>
                </DetailGrid>

                {/* Client Details */}
                <DetailFullRow style={{ marginTop: '1.25rem' }}>
                  <OverlineLabel>Client</OverlineLabel>
                  {selectedSession.client ? (
                    <FlexRow $gap="0.75rem" style={{ marginTop: '0.5rem' }}>
                      <AvatarCircle $size={40}>
                        {selectedSession.client.photo
                          ? <img src={selectedSession.client.photo} alt={`${selectedSession.client.firstName} ${selectedSession.client.lastName}`} />
                          : <>{selectedSession.client.firstName?.[0]}{selectedSession.client.lastName?.[0]}</>
                        }
                      </AvatarCircle>
                      <div style={{ flex: 1 }}>
                        <DetailValue>{selectedSession.client.firstName} {selectedSession.client.lastName}</DetailValue>
                        <CellSecondaryText>{selectedSession.client.email}</CellSecondaryText>
                      </div>
                      <SessionCountChip $hasAvailable={(selectedSession.client.availableSessions ?? 0) > 0}>
                        {selectedSession.client.availableSessions ?? 0} sessions
                      </SessionCountChip>
                    </FlexRow>
                  ) : (
                    <MutedText>No Client Assigned</MutedText>
                  )}
                </DetailFullRow>

                {/* Trainer Details */}
                <DetailFullRow style={{ marginTop: '1.25rem' }}>
                  <OverlineLabel>Trainer</OverlineLabel>
                  {selectedSession.trainer ? (
                    <FlexRow $gap="0.75rem" style={{ marginTop: '0.5rem' }}>
                      <AvatarCircle $size={40}>
                        {selectedSession.trainer.photo
                          ? <img src={selectedSession.trainer.photo} alt={`${selectedSession.trainer.firstName} ${selectedSession.trainer.lastName}`} />
                          : <>{selectedSession.trainer.firstName?.[0]}{selectedSession.trainer.lastName?.[0]}</>
                        }
                      </AvatarCircle>
                      <div>
                        <DetailValue>{selectedSession.trainer.firstName} {selectedSession.trainer.lastName}</DetailValue>
                        <CellSecondaryText>{selectedSession.trainer.email}</CellSecondaryText>
                      </div>
                    </FlexRow>
                  ) : (
                    <MutedText>No Trainer Assigned</MutedText>
                  )}
                </DetailFullRow>

                {/* Notes */}
                <DetailFullRow style={{ marginTop: '1.25rem' }}>
                  <OverlineLabel>Notes</OverlineLabel>
                  <NotesBox>
                    {selectedSession.notes || <MutedText>No notes for this session.</MutedText>}
                  </NotesBox>
                </DetailFullRow>
              </>
            ) : (
               <CellPrimaryText>Loading session details...</CellPrimaryText>
            )}
          </DialogContentArea>
          <DialogActionsBar>
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
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* Edit Session Dialog */}
      <StyledDialog $open={openEditDialog} onClick={() => setOpenEditDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Edit size={22} />
              <span>Edit Session</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogDescriptionText>
              Update the details for this session.
            </DialogDescriptionText>
            <FormGrid $columns={2}>
               {/* Client Select */}
               <FormField>
                 <FormLabel htmlFor="edit-client-select">Client</FormLabel>
                 <FormSelect
                   id="edit-client-select"
                   value={editSessionClient}
                   onChange={(e) => setEditSessionClient(e.target.value)}
                   disabled={loadingClients}
                 >
                   <option value="">Not Assigned</option>
                   {clients.map(client => (
                     <option key={client.id} value={client.id}>
                       {client.firstName} {client.lastName}
                     </option>
                   ))}
                 </FormSelect>
               </FormField>
               {/* Trainer Select */}
               <FormField>
                 <FormLabel htmlFor="edit-trainer-select">Trainer</FormLabel>
                 <FormSelect
                   id="edit-trainer-select"
                   value={editSessionTrainer}
                   onChange={(e) => setEditSessionTrainer(e.target.value)}
                   disabled={loadingTrainers}
                 >
                   <option value="">Not Assigned</option>
                   {trainers.map(trainer => (
                     <option key={trainer.id} value={trainer.id}>
                       {trainer.firstName} {trainer.lastName}
                     </option>
                   ))}
                 </FormSelect>
               </FormField>
              {/* Date Input */}
              <FormField>
                <FormLabel htmlFor="edit-date">Date</FormLabel>
                <FormInput
                  id="edit-date"
                  type="date"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </FormField>
              {/* Time Input */}
              <FormField>
                <FormLabel htmlFor="edit-time">Time</FormLabel>
                <FormInput
                  id="edit-time"
                  type="time"
                  value={editSessionTime}
                  onChange={(e) => setEditSessionTime(e.target.value)}
                />
              </FormField>
              {/* Duration Input */}
              <FormField>
                <FormLabel htmlFor="edit-duration">Duration (min)</FormLabel>
                <FormInput
                  id="edit-duration"
                  type="number"
                  value={editSessionDuration}
                  onChange={(e) => setEditSessionDuration(parseInt(e.target.value, 10) || 0)}
                  min={15}
                  max={240}
                  step={15}
                />
              </FormField>
              {/* Status Select */}
              <FormField>
                <FormLabel htmlFor="edit-status-select">Status</FormLabel>
                <FormSelect
                  id="edit-status-select"
                  value={editSessionStatus}
                  onChange={(e) => setEditSessionStatus(e.target.value as Session['status'])}
                >
                  {(['available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </FormSelect>
              </FormField>
              {/* Location Input */}
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-location">Location</FormLabel>
                <FormInput
                  id="edit-location"
                  value={editSessionLocation}
                  onChange={(e) => setEditSessionLocation(e.target.value)}
                  placeholder="e.g., Main Studio, Park, Online"
                />
              </FormField>
              {/* Notes Input */}
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-notes">Session Notes</FormLabel>
                <FormTextarea
                  id="edit-notes"
                  value={editSessionNotes}
                  onChange={(e) => setEditSessionNotes(e.target.value)}
                  placeholder="Add any relevant notes for this session..."
                  rows={3}
                />
              </FormField>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
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
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

       {/* New Session Dialog */}
       <StyledDialog $open={openNewDialog} onClick={() => setOpenNewDialog(false)}>
         <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
           <DialogTitleBar>
             <FlexRow $gap="0.75rem">
               <Plus size={22} />
               <span>Schedule New Session Slot</span>
             </FlexRow>
           </DialogTitleBar>
           <DialogContentArea>
             <DialogDescriptionText>
               Create a new available time slot. You can assign a client or trainer now, or leave it as generally available.
             </DialogDescriptionText>
             <FormGrid $columns={2}>
               {/* Client Select */}
               <FormField>
                 <FormLabel htmlFor="new-client-select">Assign Client (Optional)</FormLabel>
                 <FormSelect
                   id="new-client-select"
                   value={newSessionClient}
                   onChange={(e) => setNewSessionClient(e.target.value)}
                   disabled={loadingClients}
                 >
                   <option value="">Not Assigned</option>
                   {clients.map(client => (
                     <option key={client.id} value={client.id}>
                       {client.firstName} {client.lastName}
                     </option>
                   ))}
                 </FormSelect>
               </FormField>
               {/* Trainer Select */}
               <FormField>
                 <FormLabel htmlFor="new-trainer-select">Assign Trainer (Optional)</FormLabel>
                 <FormSelect
                   id="new-trainer-select"
                   value={newSessionTrainer}
                   onChange={(e) => setNewSessionTrainer(e.target.value)}
                   disabled={loadingTrainers}
                 >
                   <option value="">Not Assigned</option>
                   {trainers.map(trainer => (
                     <option key={trainer.id} value={trainer.id}>
                       {trainer.firstName} {trainer.lastName}
                     </option>
                   ))}
                 </FormSelect>
               </FormField>
               {/* Date Input */}
               <FormField>
                 <FormLabel htmlFor="new-date">Date</FormLabel>
                 <FormInput
                   id="new-date"
                   type="date"
                   value={newSessionDate}
                   onChange={(e) => setNewSessionDate(e.target.value)}
                   min={new Date().toISOString().slice(0, 10)}
                 />
               </FormField>
               {/* Time Input */}
               <FormField>
                 <FormLabel htmlFor="new-time">Time</FormLabel>
                 <FormInput
                   id="new-time"
                   type="time"
                   value={newSessionTime}
                   onChange={(e) => setNewSessionTime(e.target.value)}
                 />
               </FormField>
               {/* Duration Input */}
               <FormField>
                 <FormLabel htmlFor="new-duration">Duration (min)</FormLabel>
                 <FormInput
                   id="new-duration"
                   type="number"
                   value={newSessionDuration}
                   onChange={(e) => setNewSessionDuration(parseInt(e.target.value, 10) || 0)}
                   min={15}
                   max={240}
                   step={15}
                 />
               </FormField>
               {/* Location Input */}
               <FormField>
                 <FormLabel htmlFor="new-location">Location</FormLabel>
                 <FormInput
                   id="new-location"
                   value={newSessionLocation}
                   onChange={(e) => setNewSessionLocation(e.target.value)}
                   placeholder="e.g., Main Studio"
                 />
               </FormField>
               {/* Notes Input */}
               <FormField $fullWidth>
                 <FormLabel htmlFor="new-notes">Notes (Optional)</FormLabel>
                 <FormTextarea
                   id="new-notes"
                   value={newSessionNotes}
                   onChange={(e) => setNewSessionNotes(e.target.value)}
                   placeholder="e.g., Open slot for new clients, Focus on beginners"
                   rows={3}
                 />
               </FormField>
             </FormGrid>
           </DialogContentArea>
           <DialogActionsBar>
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
             />
           </DialogActionsBar>
         </DialogPanel>
       </StyledDialog>

      {/* Add Sessions Dialog */}
      <StyledDialog $open={openAddSessionsDialog} onClick={() => setOpenAddSessionsDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Zap size={22} />
              <span>Add Sessions to Client</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogDescriptionText>
              Manually add purchased or complimentary sessions to a client's account.
            </DialogDescriptionText>
            <FormGrid $columns={1}>
               {/* Client Select */}
               <FormField>
                 <FormLabel htmlFor="add-client-select">Select Client</FormLabel>
                 <FormSelect
                   id="add-client-select"
                   value={selectedClient}
                   onChange={(e) => setSelectedClient(e.target.value)}
                   disabled={loadingClients}
                 >
                   <option value="">-- Select a Client --</option>
                   {clients.map(client => (
                     <option key={client.id} value={client.id}>
                       {client.firstName} {client.lastName} ({client.availableSessions || 0} current sessions)
                     </option>
                   ))}
                 </FormSelect>
               </FormField>
               {/* Number of Sessions */}
               <FormField>
                 <FormLabel htmlFor="add-sessions-count">Number of Sessions to Add</FormLabel>
                 <FormInput
                   id="add-sessions-count"
                   type="number"
                   value={sessionsToAdd}
                   onChange={(e) => setSessionsToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                   min={1}
                   max={100}
                 />
               </FormField>
               {/* Admin Notes */}
               <FormField>
                 <FormLabel htmlFor="add-sessions-notes">Admin Notes (Optional)</FormLabel>
                 <FormTextarea
                   id="add-sessions-notes"
                   value={addSessionsNote}
                   onChange={(e) => setAddSessionsNote(e.target.value)}
                   placeholder="Reason for adding sessions (e.g., purchased package, referral bonus)"
                   rows={3}
                 />
               </FormField>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
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
             />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* Delete Confirmation Dialog */}
      <StyledDialog $open={openDeleteDialog} onClick={() => setOpenDeleteDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Trash2 size={22} />
              <span>Confirm Delete</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogDescriptionText>
              Are you sure you want to delete this session? This action cannot be undone.
            </DialogDescriptionText>
            {sessionToDelete && (
              <DetailValue style={{ marginTop: '0.5rem' }}>
                Session {sessionToDelete.id} - {formatDate(sessionToDelete.sessionDate)}
              </DetailValue>
            )}
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenDeleteDialog(false)}
              disabled={isProcessing}
            />
            <GlowButton
              text={isProcessing ? "Deleting..." : "Delete"}
              theme="ruby"
              size="small"
              leftIcon={<Trash2 size={16} />}
              onClick={handleConfirmDelete}
              disabled={isProcessing}
            />
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <StyledDialog $open={openBulkDeleteDialog} onClick={() => setOpenBulkDeleteDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
          <DialogTitleBar>
            <FlexRow $gap="0.75rem">
              <Trash2 size={22} />
              <span>Bulk Delete Sessions</span>
            </FlexRow>
          </DialogTitleBar>
          <DialogContentArea>
            <DialogDescriptionText>
              Are you sure you want to delete {selectedIds.length} selected sessions? This action cannot be undone.
            </DialogDescriptionText>
            <FormField>
              <FormLabel htmlFor="bulk-delete-reason">Reason (optional)</FormLabel>
              <FormTextarea
                id="bulk-delete-reason"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                placeholder="Reason for bulk deletion..."
                rows={2}
              />
            </FormField>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton
              text="Cancel"
              theme="cosmic"
              size="small"
              onClick={() => setOpenBulkDeleteDialog(false)}
              disabled={isProcessing}
            />
            <GlowButton
              text={isProcessing ? "Deleting..." : `Delete ${selectedIds.length} Sessions`}
              theme="ruby"
              size="small"
              leftIcon={<Trash2 size={16} />}
              onClick={handleConfirmBulkDelete}
              disabled={isProcessing}
            />
          </DialogActionsBar>
        </DialogPanel>
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
        <AssignmentStatsGrid>
          <StatsCard>
            <FlexRow $gap="1rem">
              <StatsIconContainer>
                <CheckCircle size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.sessionSummary?.assigned || 0}</StatsValue>
                <StatsLabel>Assigned Sessions</StatsLabel>
              </div>
            </FlexRow>
          </StatsCard>
          <StatsCard>
            <FlexRow $gap="1rem">
              <StatsIconContainer>
                <Clock size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.sessionSummary?.available || 0}</StatsValue>
                <StatsLabel>Unassigned Sessions</StatsLabel>
              </div>
            </FlexRow>
          </StatsCard>
          <StatsCard>
            <FlexRow $gap="1rem">
              <StatsIconContainer>
                <User size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{trainers.length}</StatsValue>
                <StatsLabel>Active Trainers</StatsLabel>
              </div>
            </FlexRow>
          </StatsCard>
          <StatsCard>
            <FlexRow $gap="1rem">
              <StatsIconContainer>
                <Zap size={24} />
              </StatsIconContainer>
              <div>
                <StatsValue>{assignmentStats.assignmentRate || 0}%</StatsValue>
                <StatsLabel>Assignment Rate</StatsLabel>
              </div>
            </FlexRow>
          </StatsCard>
        </AssignmentStatsGrid>
      )}

      {/* Assignment Controls */}
      <AssignmentGrid>
        <AssignmentPanel $accentColor="rgba(0, 255, 255, 0.3)">
          <PanelHeading $color="#00FFFF">
            Assign Trainer to Client
          </PanelHeading>

          <FlexCol $gap="1rem">
            <FormField>
              <FormLabel htmlFor="assign-client-select">Select Client</FormLabel>
              <FormSelect
                id="assign-client-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} - {client.availableSessions} sessions available
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField>
              <FormLabel htmlFor="assign-trainer-select">Select Trainer</FormLabel>
              <FormSelect
                id="assign-trainer-select"
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
              >
                <option value="">Select a trainer...</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}{trainer.specialties ? ` - ${trainer.specialties}` : ''}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            {selectedClient && (
              <div>
                <CellPrimaryText style={{ marginBottom: '0.5rem' }}>
                  Unassigned Sessions: {unassignedSessions.length}
                </CellPrimaryText>

                <FlexRow $gap="0.5rem" style={{ marginBottom: '1rem' }}>
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
                </FlexRow>
              </div>
            )}

            <GlowButton
              text={loading ? "Assigning..." : "Assign Trainer"}
              theme="emerald"
              size="medium"
              leftIcon={<User size={16} />}
              onClick={handleAssignTrainer}
              disabled={loading || !selectedTrainer || !selectedClient}
              fullWidth
            />
          </FlexCol>
        </AssignmentPanel>

        <AssignmentPanel $accentColor="rgba(255, 215, 0, 0.3)">
          <PanelHeading $color="#FFD700">
            Assignment Quick Actions
          </PanelHeading>

          <FlexCol $gap="1rem">
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
          </FlexCol>
        </AssignmentPanel>
      </AssignmentGrid>

      {/* Bulk Selection Dialog */}
      <StyledDialog $open={openBulkDialog} onClick={() => setOpenBulkDialog(false)}>
        <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
          <DialogTitleBar>Select Sessions to Assign</DialogTitleBar>
          <DialogContentArea>
            <CellPrimaryText style={{ marginBottom: '1rem' }}>
              Select specific sessions to assign to the trainer:
            </CellPrimaryText>

            {unassignedSessions.length > 0 ? (
              <ScrollableList>
                {unassignedSessions.map((session) => (
                  <SessionSelectItem
                    key={session.id}
                    $selected={selectedSessions.includes(session.id)}
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
                      style={{ marginRight: '0.5rem', flexShrink: 0 }}
                    />
                    <div>
                      <CellPrimaryText>
                        Session {session.id} - {session.duration} minutes
                      </CellPrimaryText>
                      <CellSecondaryText>
                        Location: {session.location || 'Not specified'}
                      </CellSecondaryText>
                    </div>
                  </SessionSelectItem>
                ))}
              </ScrollableList>
            ) : (
              <MutedText>
                No unassigned sessions available for this client.
              </MutedText>
            )}

            <CellPrimaryText style={{ marginTop: '1rem' }}>
              Selected: {selectedSessions.length} sessions
            </CellPrimaryText>
          </DialogContentArea>
          <DialogActionsBar>
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
          </DialogActionsBar>
        </DialogPanel>
      </StyledDialog>
    </div>
  );
};

export default EnhancedAdminSessionsView;
