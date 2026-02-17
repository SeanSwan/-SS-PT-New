import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import {
  Plus,
  Pencil,
  Eye,
  ClipboardList,
  BarChart3,
  User,
  Dumbbell,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Play,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, WorkoutSession, ClientProgress } from '../../../hooks/useWorkoutMcp';
import WorkoutPlanBuilder from '../../WorkoutManagement/WorkoutPlanBuilder';
import ClientSelection from '../../WorkoutManagement/ClientSelection';

/* ============================================================
   Galaxy-Swan Theme Tokens
   ============================================================ */
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  bgGlass: 'rgba(255,255,255,0.03)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#7851A9',
};

/* ============================================================
   Styled Components
   ============================================================ */

const PageContainer = styled.div`
  padding: 24px;
  color: ${theme.text};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 16px;
`;

const IconBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border: 1px solid ${theme.border};
  border-radius: 8px;
  background: ${theme.bgGlass};
  color: ${({ $color }) => $color || theme.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    border-color: ${theme.borderHover};
  }
`;

const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  border: 1px solid
    ${({ $severity }) =>
      $severity === 'success'
        ? theme.success
        : $severity === 'warning'
        ? theme.warning
        : $severity === 'error'
        ? theme.error
        : theme.info};
  background: ${({ $severity }) =>
    $severity === 'success'
      ? 'rgba(34,197,94,0.1)'
      : $severity === 'warning'
      ? 'rgba(245,158,11,0.1)'
      : $severity === 'error'
      ? 'rgba(239,68,68,0.1)'
      : 'rgba(59,130,246,0.1)'};
  color: ${theme.text};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const GlassCard = styled.div<{ $clickable?: boolean }>`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition: all 0.2s ease;

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        border-color: ${theme.borderHover};
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(14, 165, 233, 0.08);
      }
    `}
`;

const CardBody = styled.div`
  padding: 20px;
`;

const CardBodyCenter = styled(CardBody)`
  text-align: center;
`;

const CardFooter = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px 16px;
`;

const StatIcon = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color || theme.accent};
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

const StatValue = styled.h4<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: ${({ $color }) => $color || theme.accent};
`;

const StatLabel = styled.p`
  font-size: 0.85rem;
  color: ${theme.textSecondary};
  margin: 4px 0 0;
`;

const SectionTitle = styled.h6`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 16px;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCardTitle = styled.h6`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 4px;
`;

const ActionCardDesc = styled.p`
  font-size: 0.85rem;
  color: ${theme.textSecondary};
  margin: 0;
`;

const GlassPanel = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(12px);
`;

const ListContainer = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListRow = styled.li`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.accent}, ${theme.purple});
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ListTextBlock = styled.div`
  flex: 1;
  margin-left: 12px;
  min-width: 0;
`;

const ListPrimary = styled.span`
  display: block;
  color: ${theme.text};
  font-size: 0.95rem;
  font-weight: 500;
`;

const ListSecondary = styled.span`
  display: block;
  color: ${theme.textSecondary};
  font-size: 0.82rem;
  margin-top: 2px;
`;

const PulseDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.warning};
  margin-right: 6px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

const ChipBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 28px;
  color: #fff;
  background: ${({ $color }) => $color || theme.accent};
`;

const EmptyText = styled.p`
  text-align: center;
  padding: 24px 0;
  color: ${theme.textSecondary};
  font-size: 0.9rem;
  margin: 0;
`;

/* -- Tabs -- */
const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${theme.border};
  padding-bottom: 0;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? theme.accent : theme.textSecondary)};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.text};
  }
`;

/* -- Client Management -- */
const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, ${theme.accent}, ${theme.purple});
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const SmallButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: transparent;
  color: ${theme.accent};
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.08);
    border-color: ${theme.borderHover};
  }
`;

const ClientGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const ClientInfo = styled.div`
  flex: 1;
  margin-left: 12px;
  min-width: 0;
`;

const ClientName = styled.h6`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0;
`;

const ClientEmail = styled.p`
  font-size: 0.82rem;
  color: ${theme.textSecondary};
  margin: 2px 0 0;
`;

const SubLabel = styled.h6`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
`;

const CaptionText = styled.span`
  font-size: 0.78rem;
  color: ${theme.textSecondary};
`;

const AccentText = styled.span`
  font-size: 0.9rem;
  color: ${theme.accent};
`;

const MutedBlock = styled.div`
  margin-bottom: 16px;
`;

/* -- Table Styles -- */
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  border-bottom: 2px solid ${theme.border};
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: 0.9rem;
  color: ${theme.text};
  border-bottom: 1px solid ${theme.border};
  vertical-align: middle;
`;

const TdSubtitle = styled.span`
  display: block;
  font-weight: 600;
  color: ${theme.text};
  font-size: 0.9rem;
`;

const TdCaption = styled.span`
  display: block;
  color: ${theme.textSecondary};
  font-size: 0.78rem;
  margin-top: 2px;
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 8px;
`;

const SmallIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 6px;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: transparent;
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    border-color: ${theme.borderHover};
    color: ${theme.accent};
  }
`;

/* -- Empty State -- */
const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
`;

const EmptyIcon = styled.div`
  color: ${theme.textMuted};
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
`;

const EmptyTitle = styled.h6`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 8px;
`;

const EmptyDesc = styled.p`
  font-size: 0.9rem;
  color: ${theme.textSecondary};
  margin: 0 0 20px;
`;

/* -- Dialog / Modal -- */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div<{ $size?: 'lg' | 'xl' }>`
  position: relative;
  width: 95vw;
  max-width: ${({ $size }) => ($size === 'xl' ? '1280px' : '960px')};
  max-height: 90vh;
  overflow-y: auto;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.border};
`;

const ModalTitle = styled.h5`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0;
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${theme.border};
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: 1px solid ${theme.border};
  border-radius: 8px;
  background: transparent;
  color: ${theme.text};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${theme.borderHover};
  }
`;

/* ============================================================
   Helper to map goal/status to color
   ============================================================ */
const getStatusChipColor = (status: string): string => {
  switch (status) {
    case 'active':
      return theme.success;
    case 'completed':
      return theme.info;
    case 'in_progress':
      return theme.warning;
    default:
      return theme.textMuted;
  }
};

const getGoalChipColor = (goal: string): string => {
  switch (goal) {
    case 'strength':
      return theme.accent;
    case 'weight_loss':
      return theme.error;
    case 'endurance':
      return theme.warning;
    case 'general':
      return theme.info;
    default:
      return theme.textMuted;
  }
};

/* ============================================================
   Interfaces
   ============================================================ */

interface ClientWithPlan {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currentPlan?: WorkoutPlan;
  progress?: ClientProgress;
  lastWorkout?: string;
  activeWorkout?: WorkoutSession;
}

/**
 * TrainerWorkoutManagement Component
 *
 * Provides workout management functionality for trainers
 * - Create and assign workout plans
 * - Monitor client progress
 * - Track active workouts
 * - View workout analytics
 */
const TrainerWorkoutManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    generateWorkoutPlan,
    getClientProgress,
    getWorkoutStatistics,
    checkMcpHealth,
    loading,
    error
  } = useWorkoutMcp();

  const [activeTab, setActiveTab] = useState(0);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [clientsWithPlans, setClientsWithPlans] = useState<ClientWithPlan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithPlan | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalClients: 0,
    activePlans: 0,
    completedToday: 0,
    avgCompletionRate: 0
  });

  // Mock data for demonstration
  const mockClientsWithPlans: ClientWithPlan[] = [
    {
      id: 'client-1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      currentPlan: {
        id: 'plan-1',
        name: 'Strength Building Program',
        description: 'Progressive strength training',
        trainerId: user?.id || '',
        clientId: 'client-1',
        goal: 'strength',
        startDate: '2024-03-01',
        endDate: '2024-05-01',
        status: 'active'
      },
      progress: {
        userId: 'client-1',
        strengthLevel: 7,
        cardioLevel: 5,
        flexibilityLevel: 4,
        balanceLevel: 6,
        coreLevel: 6,
        totalWorkouts: 32,
        totalSets: 420,
        totalReps: 2850,
        totalWeight: 12500,
        totalExercises: 85,
        currentStreak: 5
      },
      lastWorkout: '2024-05-12'
    },
    {
      id: 'client-2',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      currentPlan: {
        id: 'plan-2',
        name: 'Weight Loss Journey',
        description: 'Cardio and strength combination',
        trainerId: user?.id || '',
        clientId: 'client-2',
        goal: 'weight_loss',
        startDate: '2024-04-01',
        endDate: '2024-06-01',
        status: 'active'
      },
      progress: {
        userId: 'client-2',
        strengthLevel: 4,
        cardioLevel: 8,
        flexibilityLevel: 6,
        balanceLevel: 5,
        coreLevel: 7,
        totalWorkouts: 28,
        totalSets: 350,
        totalReps: 2100,
        totalWeight: 8500,
        totalExercises: 65,
        currentStreak: 8
      },
      lastWorkout: '2024-05-13',
      activeWorkout: {
        id: 'active-1',
        userId: 'client-2',
        title: 'Upper Body HIIT',
        status: 'in_progress',
        startedAt: '2024-05-13T14:30:00Z'
      }
    },
    {
      id: 'client-3',
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      progress: {
        userId: 'client-3',
        strengthLevel: 3,
        cardioLevel: 4,
        flexibilityLevel: 3,
        balanceLevel: 3,
        coreLevel: 4,
        totalWorkouts: 8,
        totalSets: 96,
        totalReps: 580,
        totalWeight: 2400,
        totalExercises: 24,
        currentStreak: 2
      },
      lastWorkout: '2024-05-10'
    }
  ];

  useEffect(() => {
    checkMcpConnection();
    loadTrainerData();
  }, []);

  const checkMcpConnection = async () => {
    const isConnected = await checkMcpHealth();
    setMcpConnected(isConnected);
  };

  const loadTrainerData = async () => {
    // Load mock data for demonstration
    setClientsWithPlans(mockClientsWithPlans);

    // Calculate dashboard stats
    const stats = mockClientsWithPlans.reduce(
      (acc, client) => {
        if (client.currentPlan) acc.activePlans++;
        if (client.lastWorkout === '2024-05-13') acc.completedToday++;
        return acc;
      },
      { totalClients: mockClientsWithPlans.length, activePlans: 0, completedToday: 0, avgCompletionRate: 85 }
    );
    setDashboardStats(stats);
  };

  const handlePlanCreated = (plan: WorkoutPlan) => {
    setWorkoutPlans([...workoutPlans, plan]);
    setPlanBuilderOpen(false);
    loadTrainerData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'in_progress': return 'warning';
      default: return 'default';
    }
  };

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'strength': return 'primary';
      case 'weight_loss': return 'error';
      case 'endurance': return 'warning';
      case 'general': return 'info';
      default: return 'default';
    }
  };

  const renderDashboard = () => (
    <div>
      {/* MCP Connection Status */}
      <AlertBox $severity={mcpConnected ? 'success' : 'warning'}>
        <span>MCP Workout Server: {mcpConnected ? 'Connected' : 'Disconnected'}</span>
        <SmallButton onClick={checkMcpConnection}>
          <RefreshCw size={16} />
          Check
        </SmallButton>
      </AlertBox>

      {/* Dashboard Stats */}
      <StatsGrid>
        <GlassCard>
          <CardBodyCenter>
            <StatIcon $color={theme.accent}>
              <Users size={48} />
            </StatIcon>
            <StatValue $color={theme.accent}>
              {dashboardStats.totalClients}
            </StatValue>
            <StatLabel>Total Clients</StatLabel>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard>
          <CardBodyCenter>
            <StatIcon $color={theme.purple}>
              <ClipboardList size={48} />
            </StatIcon>
            <StatValue $color={theme.purple}>
              {dashboardStats.activePlans}
            </StatValue>
            <StatLabel>Active Plans</StatLabel>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard>
          <CardBodyCenter>
            <StatIcon $color={theme.success}>
              <CheckCircle size={48} />
            </StatIcon>
            <StatValue $color={theme.success}>
              {dashboardStats.completedToday}
            </StatValue>
            <StatLabel>Completed Today</StatLabel>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard>
          <CardBodyCenter>
            <StatIcon $color={theme.info}>
              <TrendingUp size={48} />
            </StatIcon>
            <StatValue $color={theme.info}>
              {dashboardStats.avgCompletionRate}%
            </StatValue>
            <StatLabel>Avg Completion</StatLabel>
          </CardBodyCenter>
        </GlassCard>
      </StatsGrid>

      {/* Quick Actions */}
      <SectionTitle>Quick Actions</SectionTitle>
      <QuickActionsGrid>
        <GlassCard $clickable onClick={() => setPlanBuilderOpen(true)}>
          <CardBodyCenter>
            <StatIcon $color={theme.accent}>
              <Plus size={40} />
            </StatIcon>
            <ActionCardTitle>Create Plan</ActionCardTitle>
            <ActionCardDesc>Build new workout plan</ActionCardDesc>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard $clickable onClick={() => setClientSelectionOpen(true)}>
          <CardBodyCenter>
            <StatIcon $color={theme.purple}>
              <ClipboardList size={40} />
            </StatIcon>
            <ActionCardTitle>Assign Plan</ActionCardTitle>
            <ActionCardDesc>Assign plan to clients</ActionCardDesc>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard $clickable onClick={() => setAnalyticsOpen(true)}>
          <CardBodyCenter>
            <StatIcon $color={theme.info}>
              <BarChart3 size={40} />
            </StatIcon>
            <ActionCardTitle>View Analytics</ActionCardTitle>
            <ActionCardDesc>Client progress reports</ActionCardDesc>
          </CardBodyCenter>
        </GlassCard>

        <GlassCard $clickable>
          <CardBodyCenter>
            <StatIcon $color={theme.warning}>
              <Clock size={40} />
            </StatIcon>
            <ActionCardTitle>Schedule Session</ActionCardTitle>
            <ActionCardDesc>Book training session</ActionCardDesc>
          </CardBodyCenter>
        </GlassCard>
      </QuickActionsGrid>

      {/* Active Workouts */}
      <SectionTitle>Active Workouts</SectionTitle>
      <GlassPanel>
        {clientsWithPlans.filter(c => c.activeWorkout).length > 0 ? (
          <ListContainer>
            {clientsWithPlans.filter(c => c.activeWorkout).map((client) => (
              <ListRow key={client.id}>
                <AvatarCircle>
                  {client.avatar ? (
                    <img src={client.avatar} alt={client.name} />
                  ) : (
                    client.name.charAt(0)
                  )}
                </AvatarCircle>
                <ListTextBlock>
                  <ListPrimary>{client.name} - {client.activeWorkout?.title}</ListPrimary>
                  <ListSecondary>
                    Started: {new Date(client.activeWorkout!.startedAt!).toLocaleTimeString()}
                  </ListSecondary>
                </ListTextBlock>
                <ChipBadge $color={theme.warning}>
                  <PulseDot />
                  <Play size={12} />
                  In Progress
                </ChipBadge>
              </ListRow>
            ))}
          </ListContainer>
        ) : (
          <EmptyText>No active workouts</EmptyText>
        )}
      </GlassPanel>
    </div>
  );

  const renderClientManagement = () => (
    <div>
      <SectionHeader>
        <SectionTitle style={{ marginBottom: 0 }}>
          Client Management ({clientsWithPlans.length})
        </SectionTitle>
        <PrimaryButton onClick={() => setClientSelectionOpen(true)}>
          <Plus size={18} />
          Assign Plan
        </PrimaryButton>
      </SectionHeader>

      <ClientGrid>
        {clientsWithPlans.map((client) => (
          <GlassCard key={client.id}>
            <CardBody>
              <ClientHeader>
                <AvatarCircle>
                  {client.avatar ? (
                    <img src={client.avatar} alt={client.name} />
                  ) : (
                    client.name.charAt(0)
                  )}
                </AvatarCircle>
                <ClientInfo>
                  <ClientName>{client.name}</ClientName>
                  <ClientEmail>{client.email}</ClientEmail>
                </ClientInfo>
                {client.activeWorkout && (
                  <span style={{ position: 'relative' }}>
                    <Dumbbell size={20} color={theme.warning} />
                    <PulseDot style={{ position: 'absolute', top: -2, right: -2 }} />
                  </span>
                )}
              </ClientHeader>

              {client.currentPlan ? (
                <MutedBlock>
                  <SubLabel>Current Plan</SubLabel>
                  <AccentText>{client.currentPlan.name}</AccentText>
                  <div style={{ marginTop: 8 }}>
                    <ChipBadge $color={getGoalChipColor(client.currentPlan.goal)}>
                      {client.currentPlan.goal}
                    </ChipBadge>
                  </div>
                </MutedBlock>
              ) : (
                <MutedBlock>
                  <CaptionText>No active plan</CaptionText>
                </MutedBlock>
              )}

              {client.progress && (
                <MutedBlock>
                  <SubLabel>Progress</SubLabel>
                  <ProgressGrid>
                    <CaptionText>Workouts: {client.progress.totalWorkouts}</CaptionText>
                    <CaptionText>Streak: {client.progress.currentStreak} days</CaptionText>
                    <CaptionText>Strength: {client.progress.strengthLevel}/10</CaptionText>
                    <CaptionText>Cardio: {client.progress.cardioLevel}/10</CaptionText>
                  </ProgressGrid>
                </MutedBlock>
              )}

              <CaptionText>
                Last workout: {client.lastWorkout ? new Date(client.lastWorkout).toLocaleDateString() : 'Never'}
              </CaptionText>
            </CardBody>
            <CardFooter>
              <SmallButton onClick={() => setSelectedClient(client)}>
                <Eye size={16} />
                View Details
              </SmallButton>
              <SmallButton
                onClick={() => {
                  setSelectedClient(client);
                  setPlanBuilderOpen(true);
                }}
              >
                <ClipboardList size={16} />
                Assign Plan
              </SmallButton>
            </CardFooter>
          </GlassCard>
        ))}
      </ClientGrid>
    </div>
  );

  const renderPlanManagement = () => (
    <div>
      <SectionHeader>
        <SectionTitle style={{ marginBottom: 0 }}>
          My Workout Plans ({workoutPlans.length})
        </SectionTitle>
        <PrimaryButton onClick={() => setPlanBuilderOpen(true)}>
          <Plus size={18} />
          Create New Plan
        </PrimaryButton>
      </SectionHeader>

      <GlassPanel style={{ padding: 0 }}>
        <StyledTable>
          <TableHeader>
            <tr>
              <Th>Plan Name</Th>
              <Th>Goal</Th>
              <Th>Client</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </TableHeader>
          <tbody>
            {workoutPlans.map((plan) => (
              <tr key={plan.id}>
                <Td>
                  <TdSubtitle>{plan.name}</TdSubtitle>
                  <TdCaption>{plan.description}</TdCaption>
                </Td>
                <Td>
                  <ChipBadge $color={getGoalChipColor(plan.goal)}>
                    {plan.goal}
                  </ChipBadge>
                </Td>
                <Td>
                  {clientsWithPlans.find(c => c.id === plan.clientId)?.name || 'Unassigned'}
                </Td>
                <Td>
                  <ChipBadge $color={getStatusChipColor(plan.status)}>
                    {plan.status}
                  </ChipBadge>
                </Td>
                <Td>
                  {new Date(plan.startDate!).toLocaleDateString()}
                </Td>
                <Td>
                  <ActionsCell>
                    <SmallIconBtn
                      title="Edit Plan"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setPlanBuilderOpen(true);
                      }}
                    >
                      <Pencil size={16} />
                    </SmallIconBtn>
                    <SmallIconBtn title="View Details">
                      <Eye size={16} />
                    </SmallIconBtn>
                    <SmallIconBtn title="Analytics" onClick={() => setAnalyticsOpen(true)}>
                      <BarChart3 size={16} />
                    </SmallIconBtn>
                  </ActionsCell>
                </Td>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </GlassPanel>

      {workoutPlans.length === 0 && (
        <GlassPanel style={{ marginTop: 16 }}>
          <EmptyState>
            <EmptyIcon>
              <ClipboardList size={48} />
            </EmptyIcon>
            <EmptyTitle>No Workout Plans Created</EmptyTitle>
            <EmptyDesc>
              Create your first workout plan to get started with client training.
            </EmptyDesc>
            <PrimaryButton onClick={() => setPlanBuilderOpen(true)}>
              <Plus size={18} />
              Create First Plan
            </PrimaryButton>
          </EmptyState>
        </GlassPanel>
      )}
    </div>
  );

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader>
        <PageTitle>Workout Management</PageTitle>
        <HeaderActions>
          <IconBtn
            $color={mcpConnected ? theme.success : theme.error}
            onClick={checkMcpConnection}
          >
            <RefreshCw size={20} />
          </IconBtn>
        </HeaderActions>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <AlertBox $severity="error">
          <span>{error}</span>
        </AlertBox>
      )}

      {/* Main Tabs */}
      <TabRow>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          Dashboard
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          Clients
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          My Plans
        </TabButton>
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          Analytics
        </TabButton>
      </TabRow>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderClientManagement()}
        {activeTab === 2 && renderPlanManagement()}
        {activeTab === 3 && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <EmptyIcon>
              <BarChart3 size={64} />
            </EmptyIcon>
            <EmptyTitle>Workout Analytics</EmptyTitle>
            <EmptyDesc>
              Detailed analytics and reporting tools for trainer insights.
            </EmptyDesc>
            <PrimaryButton style={{ marginTop: 16 }} onClick={() => setAnalyticsOpen(true)}>
              View Full Analytics
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Dialogs */}

      {/* Workout Plan Builder Dialog */}
      {planBuilderOpen && (
        <ModalOverlay onClick={() => setPlanBuilderOpen(false)}>
          <ModalPanel $size="xl" onClick={(e) => e.stopPropagation()}>
            <ModalBody style={{ padding: 0 }}>
              <WorkoutPlanBuilder
                clientId={selectedClient?.id}
                onPlanCreated={handlePlanCreated}
                existingPlan={selectedPlan || undefined}
                mode={selectedPlan ? 'edit' : 'create'}
              />
            </ModalBody>
          </ModalPanel>
        </ModalOverlay>
      )}

      {/* Client Selection Dialog */}
      {clientSelectionOpen && (
        <ModalOverlay onClick={() => setClientSelectionOpen(false)}>
          <ModalPanel $size="lg" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Select Client for Plan Assignment</ModalTitle>
              <IconBtn onClick={() => setClientSelectionOpen(false)}>
                <X size={20} />
              </IconBtn>
            </ModalHeader>
            <ModalBody>
              <ClientSelection
                onClientSelect={(client) => {
                  setSelectedClient(client as any);
                  setClientSelectionOpen(false);
                  setPlanBuilderOpen(true);
                }}
                showDetails={true}
              />
            </ModalBody>
            <ModalFooter>
              <GhostButton onClick={() => setClientSelectionOpen(false)}>Cancel</GhostButton>
            </ModalFooter>
          </ModalPanel>
        </ModalOverlay>
      )}

      {/* Analytics Dialog */}
      {analyticsOpen && (
        <ModalOverlay onClick={() => setAnalyticsOpen(false)}>
          <ModalPanel $size="lg" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Workout Analytics</ModalTitle>
              <IconBtn onClick={() => setAnalyticsOpen(false)}>
                <X size={20} />
              </IconBtn>
            </ModalHeader>
            <ModalBody>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <StatIcon $color={theme.accent}>
                  <BarChart3 size={96} />
                </StatIcon>
                <EmptyTitle style={{ fontSize: '1.4rem', marginTop: 16 }}>
                  Advanced Analytics Dashboard
                </EmptyTitle>
                <EmptyDesc>
                  Comprehensive analytics including client progress tracking,
                  plan effectiveness metrics, exercise performance analysis,
                  and more detailed reporting features coming soon.
                </EmptyDesc>
              </div>
            </ModalBody>
            <ModalFooter>
              <GhostButton onClick={() => setAnalyticsOpen(false)}>Close</GhostButton>
            </ModalFooter>
          </ModalPanel>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default TrainerWorkoutManagement;
