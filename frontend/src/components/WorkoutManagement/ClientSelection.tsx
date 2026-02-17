import React, { useState, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Search as SearchIcon,
  User as PersonIcon,
  Dumbbell as WorkoutIcon,
  TrendingUp as ProgressIcon,
  ClipboardList as PlanIcon,
  CheckCircle2 as CompleteIcon,
  Clock as ScheduleIcon,
  Mail as EmailIcon,
  Phone as PhoneIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────
   Galaxy-Swan Theme Tokens
   ───────────────────────────────────────────── */
const T = {
  bg: 'rgba(15, 23, 42, 0.95)',
  bgCard: 'rgba(15, 23, 42, 0.85)',
  bgCardHover: 'rgba(20, 30, 55, 0.95)',
  bgInput: 'rgba(15, 23, 42, 0.7)',
  border: 'rgba(14, 165, 233, 0.2)',
  borderSelected: '#0ea5e9',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentPurple: '#7851A9',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  overlay: 'rgba(0, 0, 0, 0.65)',
  radius: '12px',
  radiusSm: '8px',
  radiusXs: '6px',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  shadowHover: '0 8px 32px rgba(14, 165, 233, 0.15)',
  glassBg: 'rgba(15, 23, 42, 0.6)',
  glassBorder: 'rgba(14, 165, 233, 0.15)',
};

/* ─────────────────────────────────────────────
   Types / Interfaces
   ───────────────────────────────────────────── */
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  currentPlan?: {
    id: string;
    name: string;
    progress: number;
    startDate: string;
    endDate: string;
  };
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    lastWorkout: string;
  };
  goals: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
}

interface ClientSelectionProps {
  onClientSelect: (client: Client) => void;
  selectedClients?: string[];
  multiSelect?: boolean;
  showDetails?: boolean;
  filterOptions?: {
    status?: string[];
    level?: string[];
    hasActivePlan?: boolean;
  };
}

/* ─────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const modalSlideUp = keyframes`
  from { opacity: 0; transform: translateY(32px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

/* ─────────────────────────────────────────────
   Styled Components
   ───────────────────────────────────────────── */

/* Layout Containers */
const PageRoot = styled.div`
  animation: ${fadeIn} 0.3s ease;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Heading = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.text};
  margin: 0;
`;

/* Chips */
const ChipBase = styled.span<{ $variant?: 'filled' | 'outlined'; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
  line-height: 1.4;
  transition: background 0.2s;

  ${({ $variant, $color }) => {
    const c = $color || T.accent;
    if ($variant === 'outlined') {
      return css`
        background: transparent;
        border: 1px solid ${c};
        color: ${c};
      `;
    }
    return css`
      background: ${c}22;
      border: 1px solid ${c}44;
      color: ${c};
    `;
  }}
`;

/* Filters Row */
const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 3fr 1fr 1fr 1fr;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 16px 0 44px;
  background: ${T.bgInput};
  border: 1px solid ${T.border};
  border-radius: ${T.radiusSm};
  color: ${T.text};
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${T.textMuted};
  }

  &:focus {
    border-color: ${T.accent};
  }
`;

const SearchIconWrap = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: ${T.textMuted};
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const SelectLabel = styled.label`
  position: absolute;
  top: -8px;
  left: 12px;
  padding: 0 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${T.textMuted};
  background: ${T.bg};
  z-index: 1;
  letter-spacing: 0.02em;
`;

const NativeSelect = styled.select`
  width: 100%;
  height: 48px;
  padding: 0 32px 0 14px;
  background: ${T.bgInput};
  border: 1px solid ${T.border};
  border-radius: ${T.radiusSm};
  color: ${T.text};
  font-size: 0.9rem;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    border-color: ${T.accent};
  }

  option {
    background: #1e293b;
    color: ${T.text};
  }
`;

/* Tabs */
const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  overflow-x: auto;
  border-bottom: 1px solid ${T.border};
  padding-bottom: 0;

  /* hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? T.accent : 'transparent')};
  color: ${({ $active }) => ($active ? T.accent : T.textMuted)};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${T.text};
  }
`;

/* Client Cards */
const SectionTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${T.text};
  margin: 16px 0 12px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ClientCard = styled.div<{ $selected?: boolean }>`
  background: ${T.bgCard};
  border: ${({ $selected }) => ($selected ? `2px solid ${T.borderSelected}` : `1px solid ${T.border}`)};
  border-radius: ${T.radius};
  cursor: pointer;
  transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
  overflow: hidden;

  &:hover {
    box-shadow: ${T.shadowHover};
    transform: translateY(-2px);
    border-color: ${T.borderSelected};
  }
`;

const CardBody = styled.div`
  padding: 16px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 14px;
`;

const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 56}px;
  height: ${({ $size }) => $size || 56}px;
  min-width: ${({ $size }) => $size || 56}px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.accent}44, ${T.accentPurple}44);
  border: 2px solid ${T.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => ($size ? $size * 0.4 : 22)}px;
  font-weight: 700;
  color: ${T.accent};
  margin-right: 12px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h4`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClientEmail = styled.p`
  font-size: 0.82rem;
  color: ${T.textMuted};
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 44px; /* touch target */
  cursor: pointer;
  accent-color: ${T.accent};
  margin-left: 8px;
`;

/* Plan progress in card */
const PlanBlock = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  background: ${T.glassBg};
  border: 1px solid ${T.glassBorder};
  border-radius: ${T.radiusXs};
`;

const PlanTitle = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${T.text};
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`;

const ProgressBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${T.accent};
`;

/* Stats grid inside card */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const StatCell = styled.div`
  text-align: center;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ $color }) => $color || T.accent};
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${T.textMuted};
  margin-top: 2px;
`;

/* Goals section in card */
const GoalsBlock = styled.div`
  margin-top: 12px;
`;

const GoalsLabel = styled.span`
  font-size: 0.75rem;
  color: ${T.textMuted};
`;

const GoalsChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

/* Card actions */
const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px 12px;
`;

const BtnGhost = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid ${T.border};
  border-radius: ${T.radiusSm};
  color: ${T.accent};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${T.accent}11;
    border-color: ${T.accent};
  }
`;

const BtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 20px;
  background: linear-gradient(135deg, ${T.accent}, ${T.accentPurple});
  border: none;
  border-radius: ${T.radiusSm};
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

/* Modal (replaces Dialog) */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${T.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${overlayFadeIn} 0.2s ease;
  padding: 24px;
`;

const ModalPanel = styled.div`
  background: ${T.bg};
  border: 1px solid ${T.border};
  border-radius: ${T.radius};
  width: 100%;
  max-width: 840px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${T.shadow};
  animation: ${modalSlideUp} 0.25s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 16px;
  border-bottom: 1px solid ${T.border};
`;

const ModalHeaderInfo = styled.div``;

const ModalTitle = styled.h3`
  font-size: 1.35rem;
  font-weight: 700;
  color: ${T.text};
  margin: 0 0 4px;
`;

const ModalSubtitle = styled.p`
  font-size: 0.85rem;
  color: ${T.textMuted};
  margin: 0;
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${T.border};
`;

/* Modal inner layout */
const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FullWidthSection = styled.div`
  @media (min-width: 768px) {
    grid-column: 1 / -1;
  }
`;

const SectionHeading = styled.h4`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 12px;
`;

/* List (replaces MUI List) */
const InfoList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const InfoListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;

  & + & {
    border-top: 1px solid ${T.glassBorder};
  }
`;

const InfoListAvatar = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: ${T.accent}22;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.accent};
`;

const InfoListTextBlock = styled.div``;

const InfoListPrimary = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${T.text};
`;

const InfoListSecondary = styled.div`
  font-size: 0.82rem;
  color: ${T.textMuted};
`;

const BodyText = styled.p<{ $muted?: boolean }>`
  font-size: 0.85rem;
  color: ${({ $muted }) => ($muted ? T.textMuted : T.text)};
  margin: 0 0 4px;
`;

/* Stat cards inside modal */
const StatCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  text-align: center;
  padding: 20px 12px;
  background: ${T.bgCard};
  border: 1px solid ${T.border};
  border-radius: ${T.radiusSm};
`;

const StatCardIcon = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color || T.accent};
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

const StatCardValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color || T.accent};
`;

const StatCardLabel = styled.div`
  font-size: 0.8rem;
  color: ${T.textMuted};
  margin-top: 4px;
`;

/* Current plan card in modal */
const PlanCard = styled.div`
  background: ${T.bgCard};
  border: 1px solid ${T.border};
  border-radius: ${T.radiusSm};
  padding: 16px;
`;

const PlanCardTitle = styled.h5`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 4px;
`;

const PlanCardDates = styled.p`
  font-size: 0.82rem;
  color: ${T.textMuted};
  margin: 0 0 12px;
`;

const PlanProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

/* ─────────────────────────────────────────────
   Helper Functions for Chip Colors
   ───────────────────────────────────────────── */
const getStatusChipColor = (status: string): string => {
  switch (status) {
    case 'active': return T.success;
    case 'inactive': return T.error;
    case 'pending': return T.warning;
    default: return T.textMuted;
  }
};

const getLevelChipColor = (level: string): string => {
  switch (level) {
    case 'beginner': return T.accent;
    case 'intermediate': return T.accentPurple;
    case 'advanced': return T.warning;
    default: return T.textMuted;
  }
};

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
const ClientSelection: React.FC<ClientSelectionProps> = ({
  onClientSelect,
  selectedClients = [],
  multiSelect = false,
  showDetails = true,
  filterOptions = {}
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    level: '',
    hasActivePlan: ''
  });

  // Mock clients data for demo
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1 (555) 123-4567',
      joinDate: '2024-01-15',
      status: 'active',
      currentPlan: {
        id: 'plan-1',
        name: 'Strength Building Program',
        progress: 75,
        startDate: '2024-03-01',
        endDate: '2024-05-01'
      },
      stats: {
        totalWorkouts: 48,
        currentStreak: 12,
        lastWorkout: '2024-05-10'
      },
      goals: ['Strength', 'Muscle Building'],
      level: 'intermediate'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '+1 (555) 234-5678',
      joinDate: '2024-02-20',
      status: 'active',
      currentPlan: {
        id: 'plan-2',
        name: 'Weight Loss Journey',
        progress: 40,
        startDate: '2024-04-01',
        endDate: '2024-06-01'
      },
      stats: {
        totalWorkouts: 32,
        currentStreak: 8,
        lastWorkout: '2024-05-11'
      },
      goals: ['Weight Loss', 'Endurance'],
      level: 'beginner'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      phone: '+1 (555) 345-6789',
      joinDate: '2024-03-10',
      status: 'active',
      stats: {
        totalWorkouts: 15,
        currentStreak: 5,
        lastWorkout: '2024-05-09'
      },
      goals: ['General Fitness'],
      level: 'beginner'
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@email.com',
      joinDate: '2023-12-01',
      status: 'active',
      currentPlan: {
        id: 'plan-3',
        name: 'Advanced Athlete Training',
        progress: 90,
        startDate: '2024-02-15',
        endDate: '2024-04-15'
      },
      stats: {
        totalWorkouts: 85,
        currentStreak: 25,
        lastWorkout: '2024-05-12'
      },
      goals: ['Performance', 'Strength', 'Agility'],
      level: 'advanced'
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david.brown@email.com',
      joinDate: '2024-04-05',
      status: 'pending',
      stats: {
        totalWorkouts: 2,
        currentStreak: 0,
        lastWorkout: '2024-04-07'
      },
      goals: ['Rehabilitation'],
      level: 'beginner'
    }
  ];

  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients based on search and filters
  useEffect(() => {
    let filtered = clients;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(client => client.status === filters.status);
    }

    // Level filter
    if (filters.level) {
      filtered = filtered.filter(client => client.level === filters.level);
    }

    // Has active plan filter
    if (filters.hasActivePlan === 'yes') {
      filtered = filtered.filter(client => !!client.currentPlan);
    } else if (filters.hasActivePlan === 'no') {
      filtered = filtered.filter(client => !client.currentPlan);
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, filters]);

  const loadClients = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the backend API
      // For now, we'll use mock data
      setClients(mockClients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (client: Client) => {
    if (multiSelect) {
      onClientSelect(client);
    } else {
      setSelectedClient(client);
      if (showDetails) {
        setDetailsOpen(true);
      } else {
        onClientSelect(client);
      }
    }
  };

  const isClientSelected = (clientId: string) => {
    return selectedClients.includes(clientId);
  };

  const categorizedClients = {
    active: filteredClients.filter(c => c.status === 'active'),
    withPlans: filteredClients.filter(c => c.currentPlan),
    withoutPlans: filteredClients.filter(c => !c.currentPlan),
    pending: filteredClients.filter(c => c.status === 'pending')
  };

  /* ── Render: Client Card ── */
  const renderClientCard = (client: Client) => (
    <ClientCard
      key={client.id}
      $selected={isClientSelected(client.id)}
      onClick={() => handleClientClick(client)}
    >
      <CardBody>
        <CardHeader>
          <AvatarCircle $size={56}>
            {client.avatar
              ? <img src={client.avatar} alt={client.name} />
              : client.name.charAt(0)}
          </AvatarCircle>
          <ClientInfo>
            <ClientName>{client.name}</ClientName>
            <ClientEmail>{client.email}</ClientEmail>
            <ChipsRow>
              <ChipBase $color={getStatusChipColor(client.status)}>
                {client.status}
              </ChipBase>
              <ChipBase $color={getLevelChipColor(client.level)}>
                {client.level}
              </ChipBase>
            </ChipsRow>
          </ClientInfo>
          {multiSelect && (
            <StyledCheckbox
              checked={isClientSelected(client.id)}
              onChange={(e) => {
                e.stopPropagation();
                onClientSelect(client);
              }}
            />
          )}
        </CardHeader>

        {client.currentPlan && (
          <PlanBlock>
            <PlanTitle>Current Plan: {client.currentPlan.name}</PlanTitle>
            <ProgressRow>
              <span style={{ fontSize: '0.75rem', color: T.textMuted }}>Progress:</span>
              <ProgressBadge>
                <ProgressIcon size={14} />
                {client.currentPlan.progress}%
              </ProgressBadge>
            </ProgressRow>
          </PlanBlock>
        )}

        <StatsGrid>
          <StatCell>
            <StatValue $color={T.accent}>{client.stats.totalWorkouts}</StatValue>
            <StatLabel>Workouts</StatLabel>
          </StatCell>
          <StatCell>
            <StatValue $color={T.accentPurple}>{client.stats.currentStreak}</StatValue>
            <StatLabel>Day Streak</StatLabel>
          </StatCell>
          <StatCell>
            <StatLabel>Last Workout</StatLabel>
            <BodyText>{new Date(client.stats.lastWorkout).toLocaleDateString()}</BodyText>
          </StatCell>
        </StatsGrid>

        <GoalsBlock>
          <GoalsLabel>Goals:</GoalsLabel>
          <GoalsChips>
            {client.goals.map((goal, index) => (
              <ChipBase key={index} $variant="outlined" $color={T.accent}>
                {goal}
              </ChipBase>
            ))}
          </GoalsChips>
        </GoalsBlock>
      </CardBody>

      <CardFooter>
        <BtnGhost
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClient(client);
            setDetailsOpen(true);
          }}
        >
          <PersonIcon size={16} />
          Details
        </BtnGhost>
        {!multiSelect && (
          <BtnPrimary
            onClick={(e) => {
              e.stopPropagation();
              onClientSelect(client);
            }}
          >
            Select
          </BtnPrimary>
        )}
      </CardFooter>
    </ClientCard>
  );

  /* ── Render: Client List Section ── */
  const renderClientList = (clientList: Client[], title: string) => (
    <div>
      <SectionTitle>{title} ({clientList.length})</SectionTitle>
      <CardGrid>
        {clientList.map((client) => renderClientCard(client))}
      </CardGrid>
    </div>
  );

  /* ── Main Render ── */
  return (
    <PageRoot>
      {/* Header */}
      <HeaderRow>
        <Heading>Select Client{multiSelect ? 's' : ''}</Heading>
        {selectedClients.length > 0 && multiSelect && (
          <ChipBase $color={T.accent}>
            <CompleteIcon size={14} />
            {selectedClients.length} selected
          </ChipBase>
        )}
      </HeaderRow>

      {/* Search and Filters */}
      <FilterGrid>
        <SearchWrapper>
          <SearchIconWrap><SearchIcon size={18} /></SearchIconWrap>
          <SearchInput
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchWrapper>

        <SelectWrapper>
          <SelectLabel>Status</SelectLabel>
          <NativeSelect
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </NativeSelect>
        </SelectWrapper>

        <SelectWrapper>
          <SelectLabel>Level</SelectLabel>
          <NativeSelect
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </NativeSelect>
        </SelectWrapper>

        <SelectWrapper>
          <SelectLabel>Has Plan</SelectLabel>
          <NativeSelect
            value={filters.hasActivePlan}
            onChange={(e) => setFilters({ ...filters, hasActivePlan: e.target.value })}
          >
            <option value="">All</option>
            <option value="yes">With Plan</option>
            <option value="no">No Plan</option>
          </NativeSelect>
        </SelectWrapper>
      </FilterGrid>

      {/* Tabs */}
      <TabBar>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          All Clients ({filteredClients.length})
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          Active ({categorizedClients.active.length})
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          With Plans ({categorizedClients.withPlans.length})
        </TabButton>
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          No Plans ({categorizedClients.withoutPlans.length})
        </TabButton>
      </TabBar>

      {/* Client Grid */}
      {activeTab === 0 && renderClientList(filteredClients, 'All Clients')}
      {activeTab === 1 && renderClientList(categorizedClients.active, 'Active Clients')}
      {activeTab === 2 && renderClientList(categorizedClients.withPlans, 'Clients with Active Plans')}
      {activeTab === 3 && renderClientList(categorizedClients.withoutPlans, 'Clients without Plans')}

      {/* Client Details Modal */}
      {detailsOpen && selectedClient && (
        <ModalOverlay onClick={() => setDetailsOpen(false)}>
          <ModalPanel onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <AvatarCircle $size={56}>
                {selectedClient.avatar
                  ? <img src={selectedClient.avatar} alt={selectedClient.name} />
                  : selectedClient.name.charAt(0)}
              </AvatarCircle>
              <ModalHeaderInfo>
                <ModalTitle>{selectedClient.name}</ModalTitle>
                <ModalSubtitle>
                  Member since {new Date(selectedClient.joinDate).toLocaleDateString()}
                </ModalSubtitle>
              </ModalHeaderInfo>
            </ModalHeader>

            <ModalContent>
              <ModalGrid>
                {/* Contact Information */}
                <div>
                  <SectionHeading>Contact Information</SectionHeading>
                  <InfoList>
                    <InfoListItem>
                      <InfoListAvatar><EmailIcon size={18} /></InfoListAvatar>
                      <InfoListTextBlock>
                        <InfoListPrimary>Email</InfoListPrimary>
                        <InfoListSecondary>{selectedClient.email}</InfoListSecondary>
                      </InfoListTextBlock>
                    </InfoListItem>
                    {selectedClient.phone && (
                      <InfoListItem>
                        <InfoListAvatar><PhoneIcon size={18} /></InfoListAvatar>
                        <InfoListTextBlock>
                          <InfoListPrimary>Phone</InfoListPrimary>
                          <InfoListSecondary>{selectedClient.phone}</InfoListSecondary>
                        </InfoListTextBlock>
                      </InfoListItem>
                    )}
                  </InfoList>
                </div>

                {/* Fitness Profile */}
                <div>
                  <SectionHeading>Fitness Profile</SectionHeading>
                  <div style={{ marginBottom: 12 }}>
                    <BodyText $muted>Level: {selectedClient.level}</BodyText>
                    <BodyText $muted>Status: {selectedClient.status}</BodyText>
                  </div>
                  <BodyText $muted>Goals:</BodyText>
                  <ChipsRow style={{ marginTop: 6 }}>
                    {selectedClient.goals.map((goal, index) => (
                      <ChipBase key={index} $variant="outlined" $color={T.accent}>
                        {goal}
                      </ChipBase>
                    ))}
                  </ChipsRow>
                </div>

                {/* Workout Statistics */}
                <FullWidthSection>
                  <SectionHeading>Workout Statistics</SectionHeading>
                  <StatCardsGrid>
                    <StatCard>
                      <StatCardIcon $color={T.accent}>
                        <WorkoutIcon size={40} />
                      </StatCardIcon>
                      <StatCardValue $color={T.accent}>
                        {selectedClient.stats.totalWorkouts}
                      </StatCardValue>
                      <StatCardLabel>Total Workouts</StatCardLabel>
                    </StatCard>
                    <StatCard>
                      <StatCardIcon $color={T.accentPurple}>
                        <ScheduleIcon size={40} />
                      </StatCardIcon>
                      <StatCardValue $color={T.accentPurple}>
                        {selectedClient.stats.currentStreak}
                      </StatCardValue>
                      <StatCardLabel>Current Streak</StatCardLabel>
                    </StatCard>
                    <StatCard>
                      <StatCardIcon $color={T.success}>
                        <CompleteIcon size={40} />
                      </StatCardIcon>
                      <StatCardValue $color={T.success} style={{ fontSize: '1.1rem' }}>
                        {new Date(selectedClient.stats.lastWorkout).toLocaleDateString()}
                      </StatCardValue>
                      <StatCardLabel>Last Workout</StatCardLabel>
                    </StatCard>
                  </StatCardsGrid>
                </FullWidthSection>

                {/* Current Workout Plan */}
                {selectedClient.currentPlan && (
                  <FullWidthSection>
                    <SectionHeading>Current Workout Plan</SectionHeading>
                    <PlanCard>
                      <PlanCardTitle>{selectedClient.currentPlan.name}</PlanCardTitle>
                      <PlanCardDates>
                        {new Date(selectedClient.currentPlan.startDate).toLocaleDateString()} -{' '}
                        {new Date(selectedClient.currentPlan.endDate).toLocaleDateString()}
                      </PlanCardDates>
                      <PlanProgressRow>
                        <BodyText>Progress: {selectedClient.currentPlan.progress}%</BodyText>
                        <ChipBase $variant="outlined" $color={T.accent}>
                          <PlanIcon size={14} />
                          {selectedClient.currentPlan.progress}% Complete
                        </ChipBase>
                      </PlanProgressRow>
                    </PlanCard>
                  </FullWidthSection>
                )}
              </ModalGrid>
            </ModalContent>

            <ModalFooter>
              <BtnGhost onClick={() => setDetailsOpen(false)}>
                Close
              </BtnGhost>
              <BtnPrimary
                onClick={() => {
                  onClientSelect(selectedClient);
                  setDetailsOpen(false);
                }}
              >
                Select Client
              </BtnPrimary>
            </ModalFooter>
          </ModalPanel>
        </ModalOverlay>
      )}
    </PageRoot>
  );
};

export default ClientSelection;
