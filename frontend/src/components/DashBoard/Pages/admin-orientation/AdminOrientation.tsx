/**
 * AdminOrientation.tsx
 * Component for admins to view and manage all client orientations
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Eye as ViewIcon,
  ClipboardList as AssignmentIcon,
  CheckCircle as CompleteIcon,
  XCircle as CancelIcon,
  Search as SearchIcon,
  Clock as ScheduleIcon,
  User as PersonIcon,
  Mail as EmailIcon,
  Phone as PhoneIcon,
  Plus as AddIcon,
  Pencil as EditIcon
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─── Galaxy-Swan Theme Tokens ─────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  bgGlass: 'rgba(15,23,42,0.6)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  // Status colors
  statusPending: '#f59e0b',
  statusPendingBg: 'rgba(245,158,11,0.15)',
  statusScheduled: '#3b82f6',
  statusScheduledBg: 'rgba(59,130,246,0.15)',
  statusCompleted: '#22c55e',
  statusCompletedBg: 'rgba(34,197,94,0.15)',
  statusCancelled: '#ef4444',
  statusCancelledBg: 'rgba(239,68,68,0.15)',
  // Card stat bg
  statPrimary: 'rgba(14,165,233,0.25)',
  statWarning: 'rgba(245,158,11,0.25)',
  statInfo: 'rgba(59,130,246,0.25)',
  statSuccess: 'rgba(34,197,94,0.25)',
};

// ─── Styled Components ────────────────────────────────────────────

const PageWrapper = styled.div`
  width: 100%;
`;

const GlassCard = styled.div`
  background: ${theme.bgCard};
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
`;

const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0 0 8px 0;
`;

const PageSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${theme.textMuted};
  margin: 0 0 16px 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div<{ $variant: 'primary' | 'warning' | 'info' | 'success' }>`
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'primary': return theme.statPrimary;
      case 'warning': return theme.statWarning;
      case 'info': return theme.statInfo;
      case 'success': return theme.statSuccess;
    }
  }};
  border: 1px solid ${theme.border};
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
`;

const StatLabel = styled.div`
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

/* ── Tabs ────────────────────────────────────────────────────── */

const TabsRow = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid ${theme.border};
  overflow-x: auto;
`;

const TabButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  background: transparent;
  color: ${({ $active }) => ($active ? theme.accent : theme.textMuted)};
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: ${({ $active }) => ($active ? theme.accent : 'transparent')};
    border-radius: 2px 2px 0 0;
  }

  &:hover {
    color: ${theme.accent};
  }
`;

const BadgeCount = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  background: ${({ $color }) => $color};
  border-radius: 10px;
`;

/* ── Filters ─────────────────────────────────────────────────── */

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: end;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
`;

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    color: ${theme.textMuted};
    pointer-events: none;
    width: 16px;
    height: 16px;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 12px 0 36px;
  background: ${theme.bgGlass};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  background: ${theme.bgGlass};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 32px;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${theme.accent};
  }

  option {
    background: #1e293b;
    color: ${theme.text};
  }
`;

/* ── Buttons ─────────────────────────────────────────────────── */

const PrimaryButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  background: ${theme.accent};
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${theme.accentHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: ${theme.textMuted};
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid ${theme.border};
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${theme.text};
    border-color: ${theme.borderHover};
  }
`;

const SuccessButton = styled(PrimaryButton)`
  background: ${theme.statusCompleted};

  &:hover {
    background: #16a34a;
  }
`;

const IconBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: ${({ $color }) => $color || theme.textMuted};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: ${theme.border};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

/* ── Table ────────────────────────────────────────────────────── */

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${theme.border};
  border-radius: 10px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: rgba(14, 165, 233, 0.08);
`;

const Th = styled.th`
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${theme.textMuted};
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: ${theme.text};
  border-top: 1px solid ${theme.border};
  vertical-align: middle;
`;

const Tr = styled.tr`
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const CellFlex = styled.div<{ $direction?: string; $gap?: number }>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction || 'row'};
  align-items: ${({ $direction }) => ($direction === 'column' ? 'flex-start' : 'center')};
  gap: ${({ $gap }) => ($gap ?? 8)}px;
`;

const TextPrimary = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${theme.text};
`;

const TextCaption = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

/* ── Status Chip ─────────────────────────────────────────────── */

const StatusChip = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  white-space: nowrap;
  color: ${({ $status }) => {
    switch ($status) {
      case 'pending': return theme.statusPending;
      case 'scheduled': return theme.statusScheduled;
      case 'completed': return theme.statusCompleted;
      case 'cancelled': return theme.statusCancelled;
      default: return theme.textMuted;
    }
  }};
  background: ${({ $status }) => {
    switch ($status) {
      case 'pending': return theme.statusPendingBg;
      case 'scheduled': return theme.statusScheduledBg;
      case 'completed': return theme.statusCompletedBg;
      case 'cancelled': return theme.statusCancelledBg;
      default: return 'rgba(255,255,255,0.06)';
    }
  }};
`;

/* ── Dialog / Modal ──────────────────────────────────────────── */

const Overlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  padding: 16px;
`;

const DialogPanel = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '760px' : '500px')};
  max-height: 90vh;
  overflow-y: auto;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 14px;
  padding: 0;
`;

const DialogHeader = styled.div`
  padding: 20px 24px 12px;
  border-bottom: 1px solid ${theme.border};
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${theme.text};
`;

const DialogBody = styled.div`
  padding: 20px 24px;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px 20px;
  border-top: 1px solid ${theme.border};
`;

/* ── Detail Grid for Dialog ──────────────────────────────────── */

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const DetailFullWidth = styled.div`
  grid-column: 1 / -1;
`;

const DetailHeading = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.accent};
`;

const DetailText = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.875rem;
  color: ${theme.text};
  line-height: 1.5;

  strong {
    color: ${theme.textMuted};
    font-weight: 600;
    margin-right: 6px;
  }
`;

/* ── Alert Box ───────────────────────────────────────────────── */

const AlertBox = styled.div<{ $severity: 'info' | 'success' }>`
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${theme.text};
  line-height: 1.5;
  border: 1px solid ${({ $severity }) =>
    $severity === 'info' ? 'rgba(59,130,246,0.3)' : 'rgba(34,197,94,0.3)'};
  background: ${({ $severity }) =>
    $severity === 'info' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)'};

  strong {
    margin-right: 6px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 16px;
  color: ${theme.textMuted};
  font-size: 0.9375rem;
`;

const DateInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  margin-top: 12px;
  background: ${theme.bgGlass};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
  color-scheme: dark;

  &:focus {
    border-color: ${theme.accent};
  }
`;

// ─── Mock Data ────────────────────────────────────────────────────

// Mock data for demonstration - replace with actual API calls
const mockOrientations = [
  {
    id: 1,
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    status: 'pending',
    submittedAt: '2024-01-15T10:30:00Z',
    assignedTrainer: null,
    healthInfo: 'No previous injuries. Wants to build muscle.',
    trainingGoals: 'Build muscle and improve strength',
    experienceLevel: 'Beginner',
    waiverInitials: 'JD',
    source: 'website'
  },
  {
    id: 2,
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '(555) 987-6543',
    status: 'scheduled',
    submittedAt: '2024-01-14T14:15:00Z',
    assignedTrainer: 'Sean Swan',
    scheduledDate: '2024-01-20T09:00:00Z',
    healthInfo: 'Previous ankle injury. Working on flexibility.',
    trainingGoals: 'Improve flexibility and overall fitness',
    experienceLevel: 'Intermediate',
    waiverInitials: 'JS',
    source: 'website'
  },
  {
    id: 3,
    fullName: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '(555) 456-7890',
    status: 'completed',
    submittedAt: '2024-01-12T16:45:00Z',
    assignedTrainer: 'Sean Swan',
    completedDate: '2024-01-18T11:00:00Z',
    healthInfo: 'History of back problems. Needs proper form guidance.',
    trainingGoals: 'Lose weight and strengthen core',
    experienceLevel: 'Beginner',
    waiverInitials: 'MJ',
    source: 'website'
  }
];

// Mock trainers data
const mockTrainers = [
  { id: 1, name: 'Sean Swan', specialties: ['Strength Training', 'Flexibility'] },
  { id: 2, name: 'Sarah Johnson', specialties: ['Cardio', 'Weight Loss'] },
  { id: 3, name: 'Mike Chen', specialties: ['PowerLifting', 'Sports Training'] }
];

interface Orientation {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  submittedAt: string;
  assignedTrainer?: string | null;
  scheduledDate?: string;
  completedDate?: string;
  healthInfo: string;
  trainingGoals: string;
  experienceLevel: string;
  waiverInitials: string;
  source: string;
}

/**
 * AdminOrientation Component
 * Comprehensive orientation management for administrators
 */
const AdminOrientation: React.FC = () => {
  const { user } = useAuth();
  const [orientations, setOrientations] = useState<Orientation[]>(mockOrientations);
  const [selectedOrientation, setSelectedOrientation] = useState<Orientation | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrainer, setFilterTrainer] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Filter orientations based on criteria
  const filteredOrientations = orientations.filter(orientation => {
    const matchesStatus = filterStatus === 'all' || orientation.status === filterStatus;
    const matchesTrainer = filterTrainer === 'all' || orientation.assignedTrainer === filterTrainer;
    const matchesSearch = searchTerm === '' ||
      orientation.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orientation.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Show based on tab selection
    if (tabValue === 0) {
      // All orientations
      return matchesStatus && matchesTrainer && matchesSearch;
    } else if (tabValue === 1) {
      // Pending orientations
      return orientation.status === 'pending' && matchesSearch;
    } else if (tabValue === 2) {
      // Scheduled orientations
      return orientation.status === 'scheduled' && matchesTrainer && matchesSearch;
    } else {
      // Completed orientations
      return orientation.status === 'completed' && matchesTrainer && matchesSearch;
    }
  });

  // Get counts for badges
  const getCounts = () => {
    return {
      all: orientations.length,
      pending: orientations.filter(o => o.status === 'pending').length,
      scheduled: orientations.filter(o => o.status === 'scheduled').length,
      completed: orientations.filter(o => o.status === 'completed').length
    };
  };

  const counts = getCounts();

  // Handle viewing orientation details
  const handleViewDetails = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setDetailDialog(true);
  };

  // Handle assigning trainer
  const handleAssignTrainer = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setAssignDialog(true);
    setSelectedTrainer('');
  };

  // Handle scheduling orientation
  const handleSchedule = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setScheduleDialog(true);
    setSelectedDate('');
  };

  // Handle completing orientation
  const handleComplete = (orientationId: number) => {
    setOrientations(prev => prev.map(o =>
      o.id === orientationId
        ? { ...o, status: 'completed', completedDate: new Date().toISOString() }
        : o
    ));
  };

  // Handle cancelling orientation
  const handleCancel = (orientationId: number) => {
    setOrientations(prev => prev.map(o =>
      o.id === orientationId
        ? { ...o, status: 'cancelled' }
        : o
    ));
  };

  // Handle saving trainer assignment
  const handleSaveAssignment = () => {
    if (selectedOrientation && selectedTrainer) {
      setOrientations(prev => prev.map(o =>
        o.id === selectedOrientation.id
          ? { ...o, assignedTrainer: selectedTrainer }
          : o
      ));
      setAssignDialog(false);
    }
  };

  // Handle saving scheduled date
  const handleSaveSchedule = () => {
    if (selectedOrientation && selectedDate) {
      setOrientations(prev => prev.map(o =>
        o.id === selectedOrientation.id
          ? { ...o, status: 'scheduled', scheduledDate: selectedDate }
          : o
      ));
      setScheduleDialog(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageWrapper>
      {/* Header Card */}
      <GlassCard>
        <PageTitle>Client Orientation Management</PageTitle>
        <PageSubtitle>
          View and manage all client orientation requests, assign trainers, and schedule consultations
        </PageSubtitle>

        {/* Statistics Cards */}
        <StatsGrid>
          <StatCard $variant="primary">
            <StatValue>{counts.all}</StatValue>
            <StatLabel>Total Requests</StatLabel>
          </StatCard>
          <StatCard $variant="warning">
            <StatValue>{counts.pending}</StatValue>
            <StatLabel>Pending</StatLabel>
          </StatCard>
          <StatCard $variant="info">
            <StatValue>{counts.scheduled}</StatValue>
            <StatLabel>Scheduled</StatLabel>
          </StatCard>
          <StatCard $variant="success">
            <StatValue>{counts.completed}</StatValue>
            <StatLabel>Completed</StatLabel>
          </StatCard>
        </StatsGrid>

        {/* Tabs */}
        <TabsRow>
          <TabButton $active={tabValue === 0} onClick={() => setTabValue(0)}>
            All Orientations
            <BadgeCount $color={theme.accent}>{counts.all}</BadgeCount>
          </TabButton>
          <TabButton $active={tabValue === 1} onClick={() => setTabValue(1)}>
            Pending
            <BadgeCount $color={theme.statusPending}>{counts.pending}</BadgeCount>
          </TabButton>
          <TabButton $active={tabValue === 2} onClick={() => setTabValue(2)}>
            Scheduled
            <BadgeCount $color={theme.statusScheduled}>{counts.scheduled}</BadgeCount>
          </TabButton>
          <TabButton $active={tabValue === 3} onClick={() => setTabValue(3)}>
            Completed
            <BadgeCount $color={theme.statusCompleted}>{counts.completed}</BadgeCount>
          </TabButton>
        </TabsRow>
      </GlassCard>

      {/* Filters and Search */}
      <GlassCard>
        <FiltersGrid>
          <FieldWrapper>
            <FieldLabel>Search</FieldLabel>
            <InputWithIcon>
              <SearchIcon />
              <StyledInput
                type="text"
                placeholder="Search orientations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputWithIcon>
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel>Status Filter</FieldLabel>
            <StyledSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </StyledSelect>
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel>Trainer Filter</FieldLabel>
            <StyledSelect
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
            >
              <option value="all">All Trainers</option>
              <option value="">Unassigned</option>
              {mockTrainers.map(trainer => (
                <option key={trainer.id} value={trainer.name}>
                  {trainer.name}
                </option>
              ))}
            </StyledSelect>
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel>&nbsp;</FieldLabel>
            <PrimaryButton $fullWidth onClick={() => {/* Handle manual orientation creation */}}>
              <AddIcon size={16} />
              Add Orientation
            </PrimaryButton>
          </FieldWrapper>
        </FiltersGrid>
      </GlassCard>

      {/* Orientations Table */}
      <GlassCard>
        <TableWrapper>
          <StyledTable>
            <THead>
              <tr>
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th>Assigned Trainer</Th>
                <Th>Scheduled Date</Th>
                <Th>Actions</Th>
              </tr>
            </THead>
            <tbody>
              {filteredOrientations.map((orientation) => (
                <Tr key={orientation.id}>
                  <Td>
                    <CellFlex>
                      <PersonIcon size={18} color={theme.textMuted} />
                      <div>
                        <TextPrimary>{orientation.fullName}</TextPrimary>
                        <br />
                        <TextCaption>
                          {orientation.experienceLevel} &bull; From {orientation.source}
                        </TextCaption>
                      </div>
                    </CellFlex>
                  </Td>
                  <Td>
                    <CellFlex $direction="column" $gap={4}>
                      <CellFlex $gap={6}>
                        <EmailIcon size={14} color={theme.textMuted} />
                        <TextCaption style={{ color: theme.text }}>{orientation.email}</TextCaption>
                      </CellFlex>
                      <CellFlex $gap={6}>
                        <PhoneIcon size={14} color={theme.textMuted} />
                        <TextCaption style={{ color: theme.text }}>{orientation.phone}</TextCaption>
                      </CellFlex>
                    </CellFlex>
                  </Td>
                  <Td>
                    <StatusChip $status={orientation.status}>
                      {orientation.status.charAt(0).toUpperCase() + orientation.status.slice(1)}
                    </StatusChip>
                  </Td>
                  <Td>
                    <TextCaption style={{ color: theme.text }}>
                      {formatDate(orientation.submittedAt)}
                    </TextCaption>
                  </Td>
                  <Td>
                    <TextCaption style={{ color: theme.text }}>
                      {orientation.assignedTrainer || 'Unassigned'}
                    </TextCaption>
                  </Td>
                  <Td>
                    <TextCaption style={{ color: theme.text }}>
                      {orientation.scheduledDate ? formatDate(orientation.scheduledDate) : 'Not scheduled'}
                    </TextCaption>
                  </Td>
                  <Td>
                    <CellFlex $gap={4}>
                      <IconBtn
                        onClick={() => handleViewDetails(orientation)}
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconBtn>

                      {orientation.status === 'pending' && (
                        <IconBtn
                          $color={theme.accent}
                          onClick={() => handleAssignTrainer(orientation)}
                          title="Assign Trainer"
                        >
                          <AssignmentIcon />
                        </IconBtn>
                      )}

                      {orientation.status !== 'completed' && orientation.status !== 'cancelled' && (
                        <IconBtn
                          $color={theme.statusScheduled}
                          onClick={() => handleSchedule(orientation)}
                          title="Schedule"
                        >
                          <ScheduleIcon />
                        </IconBtn>
                      )}

                      {orientation.status === 'scheduled' && (
                        <IconBtn
                          $color={theme.statusCompleted}
                          onClick={() => handleComplete(orientation.id)}
                          title="Mark as Completed"
                        >
                          <CompleteIcon />
                        </IconBtn>
                      )}

                      {orientation.status !== 'completed' && orientation.status !== 'cancelled' && (
                        <IconBtn
                          $color={theme.statusCancelled}
                          onClick={() => handleCancel(orientation.id)}
                          title="Cancel"
                        >
                          <CancelIcon />
                        </IconBtn>
                      )}
                    </CellFlex>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </StyledTable>
        </TableWrapper>

        {filteredOrientations.length === 0 && (
          <EmptyState>
            No orientations found matching your criteria.
          </EmptyState>
        )}
      </GlassCard>

      {/* Detail Dialog */}
      <Overlay $open={detailDialog} onClick={() => setDetailDialog(false)}>
        <DialogPanel $wide onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              Orientation Details - {selectedOrientation?.fullName}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedOrientation && (
              <>
                <DetailGrid>
                  <div>
                    <DetailHeading>Contact Information</DetailHeading>
                    <DetailText><strong>Name:</strong> {selectedOrientation.fullName}</DetailText>
                    <DetailText><strong>Email:</strong> {selectedOrientation.email}</DetailText>
                    <DetailText><strong>Phone:</strong> {selectedOrientation.phone}</DetailText>
                    <DetailText><strong>Source:</strong> {selectedOrientation.source}</DetailText>
                  </div>

                  <div>
                    <DetailHeading>Training Information</DetailHeading>
                    <DetailText><strong>Experience Level:</strong> {selectedOrientation.experienceLevel}</DetailText>
                    <DetailText><strong>Waiver Initials:</strong> {selectedOrientation.waiverInitials}</DetailText>
                    {selectedOrientation.assignedTrainer && (
                      <DetailText><strong>Assigned Trainer:</strong> {selectedOrientation.assignedTrainer}</DetailText>
                    )}
                  </div>

                  <DetailFullWidth>
                    <DetailHeading>Health Information</DetailHeading>
                    <DetailText>{selectedOrientation.healthInfo}</DetailText>
                  </DetailFullWidth>

                  <DetailFullWidth>
                    <DetailHeading>Training Goals</DetailHeading>
                    <DetailText>{selectedOrientation.trainingGoals}</DetailText>
                  </DetailFullWidth>

                  {selectedOrientation.scheduledDate && (
                    <DetailFullWidth>
                      <AlertBox $severity="info">
                        <strong>Scheduled for:</strong> {formatDate(selectedOrientation.scheduledDate)}
                      </AlertBox>
                    </DetailFullWidth>
                  )}

                  {selectedOrientation.completedDate && (
                    <DetailFullWidth>
                      <AlertBox $severity="success">
                        <strong>Completed on:</strong> {formatDate(selectedOrientation.completedDate)}
                      </AlertBox>
                    </DetailFullWidth>
                  )}
                </DetailGrid>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setDetailDialog(false)}>Close</GhostButton>
            {selectedOrientation?.status === 'pending' && (
              <PrimaryButton
                onClick={() => {
                  setDetailDialog(false);
                  handleAssignTrainer(selectedOrientation);
                }}
              >
                Assign Trainer
              </PrimaryButton>
            )}
            {selectedOrientation?.status === 'scheduled' && (
              <SuccessButton
                onClick={() => {
                  handleComplete(selectedOrientation.id);
                  setDetailDialog(false);
                }}
              >
                Mark as Completed
              </SuccessButton>
            )}
          </DialogFooter>
        </DialogPanel>
      </Overlay>

      {/* Assign Trainer Dialog */}
      <Overlay $open={assignDialog} onClick={() => setAssignDialog(false)}>
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Assign Trainer</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DetailText style={{ marginBottom: 12 }}>
              Assign a trainer for {selectedOrientation?.fullName}
            </DetailText>
            <FieldWrapper>
              <FieldLabel>Select Trainer</FieldLabel>
              <StyledSelect
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
              >
                <option value="">-- Select a Trainer --</option>
                {mockTrainers.map(trainer => (
                  <option key={trainer.id} value={trainer.name}>
                    {trainer.name} - {trainer.specialties.join(', ')}
                  </option>
                ))}
              </StyledSelect>
            </FieldWrapper>
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setAssignDialog(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={handleSaveAssignment}
              disabled={!selectedTrainer}
            >
              Assign Trainer
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </Overlay>

      {/* Schedule Dialog */}
      <Overlay $open={scheduleDialog} onClick={() => setScheduleDialog(false)}>
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Schedule Orientation</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DetailText style={{ marginBottom: 4 }}>
              Schedule orientation for {selectedOrientation?.fullName}
            </DetailText>
            <FieldWrapper>
              <FieldLabel>Orientation Date &amp; Time</FieldLabel>
              <DateInput
                type="datetime-local"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </FieldWrapper>
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setScheduleDialog(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={handleSaveSchedule}
              disabled={!selectedDate}
            >
              Schedule
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </Overlay>
    </PageWrapper>
  );
};

export default AdminOrientation;
