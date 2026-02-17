/**
 * TrainerOrientation.tsx
 * Component for trainers to view and manage client orientations
 */
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import {
  Eye,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  User,
  Mail,
  Phone,
  X
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─── Galaxy-Swan Theme Tokens ────────────────────────────────────────────────
const theme = {
  galaxyCore: '#0a0a1a',
  swanCyan: '#00ffff',
  cosmicPurple: '#7851a9',
  glassBg: 'rgba(29, 31, 43, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.85)',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  textDim: 'rgba(255, 255, 255, 0.5)',
  theadBg: 'rgba(15, 23, 42, 0.98)',
  successGreen: '#22c55e',
  warningAmber: '#f59e0b',
  infoBlue: '#3b82f6',
  errorRed: '#ef4444',
};

// ─── Styled Components ──────────────────────────────────────────────────────

const PageWrapper = styled.div`
  width: 100%;
`;

const GlassCard = styled.div`
  background: ${theme.glassBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.glassBorder};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
`;

const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.textPrimary};
  margin: 0 0 8px 0;
`;

const SubText = styled.p`
  font-size: 0.875rem;
  color: ${theme.textMuted};
  margin: 0 0 16px 0;
`;

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid ${theme.glassBorder};
  margin-top: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.swanCyan : 'transparent')};
  color: ${({ $active }) => ($active ? theme.swanCyan : theme.textMuted)};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${theme.textPrimary};
  }
`;

const BadgeCount = styled.span<{ $variant?: 'primary' | 'warning' | 'info' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${theme.textPrimary};
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'warning': return theme.warningAmber;
      case 'info': return theme.infoBlue;
      default: return theme.cosmicPurple;
    }
  }};
`;

// ─── Filter / Search Row ─────────────────────────────────────────────────────

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: end;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
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
    color: ${theme.textDim};
    pointer-events: none;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 40px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${theme.glassBorder};
  border-radius: 8px;
  color: ${theme.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${theme.textDim};
  }

  &:focus {
    border-color: ${theme.swanCyan};
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${theme.glassBorder};
  border-radius: 8px;
  color: ${theme.textPrimary};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    border-color: ${theme.swanCyan};
  }

  option {
    background: ${theme.galaxyCore};
    color: ${theme.textPrimary};
  }
`;

// ─── Table ───────────────────────────────────────────────────────────────────

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid ${theme.glassBorder};
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: ${theme.theadBg};
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${theme.glassBorder};
`;

const Tr = styled.tr`
  &:not(:last-child) td {
    border-bottom: 1px solid ${theme.glassBorder};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: ${theme.textSecondary};
  vertical-align: middle;
`;

// ─── Cell Helpers ────────────────────────────────────────────────────────────

const ClientCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ClientName = styled.span`
  font-weight: 500;
  color: ${theme.textPrimary};
`;

const ClientMeta = styled.span`
  font-size: 0.75rem;
  color: ${theme.textDim};
`;

const ContactStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ContactRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: ${theme.textSecondary};

  svg {
    color: ${theme.textDim};
    flex-shrink: 0;
  }
`;

// ─── Chip / Status ───────────────────────────────────────────────────────────

type ChipVariant = 'warning' | 'info' | 'success' | 'error' | 'default';

const chipColors: Record<ChipVariant, { bg: string; text: string; border: string }> = {
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: theme.warningAmber, border: 'rgba(245, 158, 11, 0.3)' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', text: theme.infoBlue, border: 'rgba(59, 130, 246, 0.3)' },
  success: { bg: 'rgba(34, 197, 94, 0.15)', text: theme.successGreen, border: 'rgba(34, 197, 94, 0.3)' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: theme.errorRed, border: 'rgba(239, 68, 68, 0.3)' },
  default: { bg: 'rgba(255, 255, 255, 0.08)', text: theme.textMuted, border: theme.glassBorder },
};

const StatusChip = styled.span<{ $variant: ChipVariant }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  background: ${({ $variant }) => chipColors[$variant].bg};
  color: ${({ $variant }) => chipColors[$variant].text};
  border: 1px solid ${({ $variant }) => chipColors[$variant].border};
`;

// ─── Action Buttons ──────────────────────────────────────────────────────────

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const IconBtn = styled.button<{ $color?: 'default' | 'primary' | 'success' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid ${theme.glassBorder};
  border-radius: 8px;
  background: transparent;
  color: ${({ $color }) => {
    switch ($color) {
      case 'primary': return theme.swanCyan;
      case 'success': return theme.successGreen;
      default: return theme.textMuted;
    }
  }};
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: ${theme.textPrimary};
    border-color: ${({ $color }) => {
      switch ($color) {
        case 'primary': return theme.swanCyan;
        case 'success': return theme.successGreen;
        default: return theme.textMuted;
      }
    }};
  }
`;

// ─── Buttons ─────────────────────────────────────────────────────────────────

const PrimaryButton = styled.button<{ $variant?: 'solid' | 'success'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  color: ${theme.textPrimary};

  ${({ $variant }) =>
    $variant === 'success'
      ? css`
          background: ${theme.successGreen};
        `
      : css`
          background: linear-gradient(135deg, ${theme.cosmicPurple}, ${theme.swanCyan});
        `}

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  min-height: 44px;
  border: 1px solid ${theme.glassBorder};
  border-radius: 8px;
  background: transparent;
  color: ${theme.textMuted};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: ${theme.textPrimary};
  }
`;

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: ${theme.textMuted};
  font-size: 0.9375rem;
`;

// ─── Modal / Dialog ──────────────────────────────────────────────────────────

const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 9999;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div<{ $wide?: boolean }>`
  width: 90%;
  max-width: ${({ $wide }) => ($wide ? '720px' : '480px')};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${theme.galaxyCore};
  border: 1px solid ${theme.glassBorder};
  border-radius: 16px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.glassBorder};
`;

const ModalTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  margin: 0;
`;

const ModalCloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${theme.glassBorder};
`;

// ─── Detail Grid ─────────────────────────────────────────────────────────────

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const DetailSection = styled.div<{ $fullWidth?: boolean }>`
  ${({ $fullWidth }) => $fullWidth && css`grid-column: 1 / -1;`}
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  margin: 0 0 12px 0;
`;

const DetailLine = styled.p`
  font-size: 0.875rem;
  color: ${theme.textSecondary};
  margin: 0 0 6px 0;
  line-height: 1.6;

  strong {
    color: ${theme.textPrimary};
  }
`;

// ─── Alert ───────────────────────────────────────────────────────────────────

const AlertBox = styled.div<{ $severity?: 'info' | 'success' | 'warning' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border-left: 4px solid;
  font-size: 0.875rem;
  color: ${theme.textSecondary};

  ${({ $severity }) => {
    switch ($severity) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border-left-color: ${theme.successGreen};
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          border-left-color: ${theme.warningAmber};
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border-left-color: ${theme.errorRed};
        `;
      case 'info':
      default:
        return css`
          background: rgba(59, 130, 246, 0.1);
          border-left-color: ${theme.infoBlue};
        `;
    }
  }}
`;

// ─── Schedule Input (no icon prefix) ─────────────────────────────────────────

const DateTimeInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  margin-top: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${theme.glassBorder};
  border-radius: 8px;
  color: ${theme.textPrimary};
  font-size: 0.875rem;
  outline: none;
  color-scheme: dark;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${theme.swanCyan};
  }
`;

// ─── Mock Data ───────────────────────────────────────────────────────────────

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
    waiverInitials: 'JD'
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
    waiverInitials: 'JS'
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
    waiverInitials: 'MJ'
  }
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
}

/**
 * TrainerOrientation Component
 * Allows trainers to view and manage client orientations assigned to them
 */
const TrainerOrientation: React.FC = () => {
  const { user } = useAuth();
  const [orientations, setOrientations] = useState<Orientation[]>(mockOrientations);
  const [selectedOrientation, setSelectedOrientation] = useState<Orientation | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Filter orientations based on status and search term
  const filteredOrientations = orientations.filter(orientation => {
    const matchesStatus = filterStatus === 'all' || orientation.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      orientation.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orientation.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Show based on tab selection
    if (tabValue === 0) {
      // All orientations assigned to this trainer
      return matchesStatus && matchesSearch && orientation.assignedTrainer === user?.name;
    } else if (tabValue === 1) {
      // Pending orientations that need assignment
      return orientation.status === 'pending' && !orientation.assignedTrainer && matchesSearch;
    } else {
      // All orientations (admin view)
      return matchesStatus && matchesSearch;
    }
  });

  // Get counts for badges
  const getCounts = () => {
    const myOrientations = orientations.filter(o => o.assignedTrainer === user?.name);
    const pendingAssignment = orientations.filter(o => o.status === 'pending' && !o.assignedTrainer);

    return {
      my: myOrientations.length,
      pending: pendingAssignment.length,
      all: orientations.length
    };
  };

  const counts = getCounts();

  // Handle viewing orientation details
  const handleViewDetails = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setDetailDialog(true);
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

  // Handle taking assignment of unassigned orientation
  const handleTakeAssignment = (orientationId: number) => {
    setOrientations(prev => prev.map(o =>
      o.id === orientationId
        ? { ...o, assignedTrainer: user?.name || '', status: 'scheduled' }
        : o
    ));
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

  // Get status color
  const getStatusColor = (status: string): ChipVariant => {
    switch (status) {
      case 'pending': return 'warning';
      case 'scheduled': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
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
        <PageTitle>Client Orientations</PageTitle>
        <SubText>
          Manage client orientation requests and schedule initial consultations
        </SubText>

        {/* Tabs */}
        <TabBar>
          <TabButton $active={tabValue === 0} onClick={() => setTabValue(0)}>
            My Orientations
            <BadgeCount $variant="primary">{counts.my}</BadgeCount>
          </TabButton>
          <TabButton $active={tabValue === 1} onClick={() => setTabValue(1)}>
            Needs Assignment
            <BadgeCount $variant="warning">{counts.pending}</BadgeCount>
          </TabButton>
          <TabButton $active={tabValue === 2} onClick={() => setTabValue(2)}>
            All Orientations
            <BadgeCount $variant="info">{counts.all}</BadgeCount>
          </TabButton>
        </TabBar>
      </GlassCard>

      {/* Filters and Search */}
      <GlassCard>
        <FilterGrid>
          <FieldWrapper>
            <FieldLabel htmlFor="orientation-search">Search orientations</FieldLabel>
            <InputWithIcon>
              <Search size={16} />
              <StyledInput
                id="orientation-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputWithIcon>
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel htmlFor="status-filter">Status Filter</FieldLabel>
            <StyledSelect
              id="status-filter"
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
        </FilterGrid>
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
                <Th>Actions</Th>
              </tr>
            </THead>
            <tbody>
              {filteredOrientations.map((orientation) => (
                <Tr key={orientation.id}>
                  <Td>
                    <ClientCell>
                      <User size={18} color={theme.textDim} />
                      <ClientInfo>
                        <ClientName>{orientation.fullName}</ClientName>
                        <ClientMeta>{orientation.experienceLevel}</ClientMeta>
                      </ClientInfo>
                    </ClientCell>
                  </Td>
                  <Td>
                    <ContactStack>
                      <ContactRow>
                        <Mail size={14} />
                        {orientation.email}
                      </ContactRow>
                      <ContactRow>
                        <Phone size={14} />
                        {orientation.phone}
                      </ContactRow>
                    </ContactStack>
                  </Td>
                  <Td>
                    <StatusChip $variant={getStatusColor(orientation.status)}>
                      {orientation.status.charAt(0).toUpperCase() + orientation.status.slice(1)}
                    </StatusChip>
                  </Td>
                  <Td>{formatDate(orientation.submittedAt)}</Td>
                  <Td>{orientation.assignedTrainer || 'Unassigned'}</Td>
                  <Td>
                    <ActionGroup>
                      <IconBtn
                        onClick={() => handleViewDetails(orientation)}
                        title="View Details"
                      >
                        <Eye size={18} />
                      </IconBtn>

                      {orientation.status === 'pending' && !orientation.assignedTrainer && (
                        <IconBtn
                          $color="primary"
                          onClick={() => handleTakeAssignment(orientation.id)}
                          title="Take Assignment"
                        >
                          <ClipboardList size={18} />
                        </IconBtn>
                      )}

                      {orientation.status === 'scheduled' && orientation.assignedTrainer === user?.name && (
                        <IconBtn
                          $color="success"
                          onClick={() => handleComplete(orientation.id)}
                          title="Mark as Completed"
                        >
                          <CheckCircle2 size={18} />
                        </IconBtn>
                      )}
                    </ActionGroup>
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
      <ModalOverlay $open={detailDialog} onClick={() => setDetailDialog(false)}>
        <ModalPanel $wide onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>
              Orientation Details - {selectedOrientation?.fullName}
            </ModalTitle>
            <ModalCloseBtn onClick={() => setDetailDialog(false)} aria-label="Close">
              <X size={20} />
            </ModalCloseBtn>
          </ModalHeader>
          <ModalBody>
            {selectedOrientation && (
              <DetailGrid>
                <DetailSection>
                  <SectionTitle>Contact Information</SectionTitle>
                  <DetailLine><strong>Name:</strong> {selectedOrientation.fullName}</DetailLine>
                  <DetailLine><strong>Email:</strong> {selectedOrientation.email}</DetailLine>
                  <DetailLine><strong>Phone:</strong> {selectedOrientation.phone}</DetailLine>
                </DetailSection>

                <DetailSection>
                  <SectionTitle>Training Information</SectionTitle>
                  <DetailLine><strong>Experience Level:</strong> {selectedOrientation.experienceLevel}</DetailLine>
                  <DetailLine><strong>Waiver Initials:</strong> {selectedOrientation.waiverInitials}</DetailLine>
                  {selectedOrientation.assignedTrainer && (
                    <DetailLine><strong>Assigned Trainer:</strong> {selectedOrientation.assignedTrainer}</DetailLine>
                  )}
                </DetailSection>

                <DetailSection $fullWidth>
                  <SectionTitle>Health Information</SectionTitle>
                  <DetailLine>{selectedOrientation.healthInfo}</DetailLine>
                </DetailSection>

                <DetailSection $fullWidth>
                  <SectionTitle>Training Goals</SectionTitle>
                  <DetailLine>{selectedOrientation.trainingGoals}</DetailLine>
                </DetailSection>

                {selectedOrientation.scheduledDate && (
                  <DetailSection $fullWidth>
                    <AlertBox $severity="info">
                      <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><strong>Scheduled for:</strong> {formatDate(selectedOrientation.scheduledDate)}</span>
                    </AlertBox>
                  </DetailSection>
                )}
              </DetailGrid>
            )}
          </ModalBody>
          <ModalFooter>
            <GhostButton onClick={() => setDetailDialog(false)}>Close</GhostButton>
            {selectedOrientation?.status === 'scheduled' && selectedOrientation?.assignedTrainer === user?.name && (
              <PrimaryButton
                $variant="success"
                onClick={() => {
                  handleComplete(selectedOrientation.id);
                  setDetailDialog(false);
                }}
              >
                Mark as Completed
              </PrimaryButton>
            )}
          </ModalFooter>
        </ModalPanel>
      </ModalOverlay>

      {/* Schedule Dialog */}
      <ModalOverlay $open={scheduleDialog} onClick={() => setScheduleDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Schedule Orientation</ModalTitle>
            <ModalCloseBtn onClick={() => setScheduleDialog(false)} aria-label="Close">
              <X size={20} />
            </ModalCloseBtn>
          </ModalHeader>
          <ModalBody>
            <DetailLine>
              Schedule orientation for {selectedOrientation?.fullName}
            </DetailLine>
            <FieldWrapper style={{ marginTop: 12 }}>
              <FieldLabel htmlFor="schedule-datetime">Orientation Date & Time</FieldLabel>
              <DateTimeInput
                id="schedule-datetime"
                type="datetime-local"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </FieldWrapper>
          </ModalBody>
          <ModalFooter>
            <GhostButton onClick={() => setScheduleDialog(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={handleSaveSchedule}
              disabled={!selectedDate}
            >
              Schedule
            </PrimaryButton>
          </ModalFooter>
        </ModalPanel>
      </ModalOverlay>
    </PageWrapper>
  );
};

export default TrainerOrientation;
