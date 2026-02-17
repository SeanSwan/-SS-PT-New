import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Plus,
  Dumbbell,
  ClipboardList,
  Users,
  BarChart3,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  Play,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, Exercise, ClientProgress, WorkoutStatistics } from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';
import WorkoutPlanBuilder from './WorkoutPlanBuilder';
import ClientSelection from './ClientSelection';

// ─── Galaxy-Swan Theme Tokens ────────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  glass: 'rgba(255,255,255,0.05)',
};

// ─── Keyframes ───────────────────────────────────────────────────────
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 24px;
  color: ${theme.text};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const StyledButton = styled.button<{
  $variant?: 'contained' | 'outlined' | 'text';
  $color?: string;
  $size?: 'small' | 'medium';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: ${({ $size }) => ($size === 'small' ? '6px 12px' : '10px 20px')};
  font-size: ${({ $size }) => ($size === 'small' ? '0.8125rem' : '0.875rem')};
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;

  ${({ $variant, $color }) => {
    const c = $color || theme.accent;
    if ($variant === 'outlined') return css`
      background: transparent;
      color: ${c};
      border: 1px solid ${c};
      &:hover { background: rgba(14,165,233,0.1); }
    `;
    if ($variant === 'text') return css`
      background: transparent;
      color: ${c};
      border: none;
      &:hover { background: rgba(14,165,233,0.1); }
    `;
    return css`
      background: ${c};
      color: #fff;
      border: none;
      &:hover { filter: brightness(1.15); transform: translateY(-1px); }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IconBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $color }) => $color || theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14,165,233,0.1);
    color: ${({ $color }) => $color || theme.accent};
  }
`;

const AlertBox = styled.div<{ $severity?: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  border: 1px solid ${({ $severity }) => {
    switch ($severity) {
      case 'success': return 'rgba(34,197,94,0.3)';
      case 'error': return 'rgba(239,68,68,0.3)';
      case 'warning': return 'rgba(245,158,11,0.3)';
      default: return theme.border;
    }
  }};
  background: ${({ $severity }) => {
    switch ($severity) {
      case 'success': return 'rgba(34,197,94,0.08)';
      case 'error': return 'rgba(239,68,68,0.08)';
      case 'warning': return 'rgba(245,158,11,0.08)';
      default: return theme.glass;
    }
  }};
  color: ${theme.text};
`;

const AlertContent = styled.div`
  flex: 1;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const GlassCard = styled.div<{ $clickable?: boolean }>`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;

  ${({ $clickable }) => $clickable && css`
    cursor: pointer;
    &:hover {
      border-color: ${theme.accent};
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(14,165,233,0.15);
    }
  `}
`;

const CardCenter = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.accent};
  margin: 8px 0 4px;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 16px 0;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const ActionCardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 8px 0 4px;
`;

const TextSecondary = styled.span`
  color: ${theme.textSecondary};
  font-size: 0.875rem;
  line-height: 1.4;
`;

const TextCaption = styled.span`
  color: ${theme.textSecondary};
  font-size: 0.75rem;
`;

const GlassPaper = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const WorkoutListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;

  & + & {
    border-top: 1px solid ${theme.border};
  }
`;

const AvatarCircle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: rgba(14,165,233,0.15);
  color: ${theme.accent};
`;

const WorkoutInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkoutPrimary = styled.p`
  margin: 0 0 4px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${theme.text};
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  margin: 6px 0;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number }>`
  width: ${({ $value }) => $value}%;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, ${theme.accent}, ${theme.accentHover});
  transition: width 0.4s ease;
`;

const Chip = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid ${({ $color }) => {
    switch ($color) {
      case 'success': return 'rgba(34,197,94,0.4)';
      case 'warning': return 'rgba(245,158,11,0.4)';
      case 'error': return 'rgba(239,68,68,0.4)';
      case 'info': return 'rgba(59,130,246,0.4)';
      case 'primary': return 'rgba(14,165,233,0.4)';
      default: return theme.border;
    }
  }};
  background: ${({ $color }) => {
    switch ($color) {
      case 'success': return 'rgba(34,197,94,0.12)';
      case 'warning': return 'rgba(245,158,11,0.12)';
      case 'error': return 'rgba(239,68,68,0.12)';
      case 'info': return 'rgba(59,130,246,0.12)';
      case 'primary': return 'rgba(14,165,233,0.12)';
      default: return theme.glass;
    }
  }};
  color: ${({ $color }) => {
    switch ($color) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      case 'info': return theme.info;
      case 'primary': return theme.accent;
      default: return theme.textSecondary;
    }
  }};
`;

// ─── Tabs ────────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${theme.border};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? theme.accent : theme.textSecondary)};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${theme.accent};
    background: rgba(14,165,233,0.05);
  }
`;

// ─── Table ───────────────────────────────────────────────────────────

const TableWrapper = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  overflow-x: auto;
  backdrop-filter: blur(12px);
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: rgba(255,255,255,0.03);
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${theme.border};
`;

const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid ${theme.border};
  vertical-align: middle;
`;

const Tr = styled.tr`
  transition: background 0.15s ease;
  &:hover { background: rgba(14,165,233,0.04); }
  &:last-child td { border-bottom: none; }
`;

const PlanName = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.text};
`;

const PlanDesc = styled.p`
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: ${theme.textSecondary};
`;

const DateText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${theme.text};
  line-height: 1.6;
`;

const ActionCell = styled.div`
  display: flex;
  gap: 4px;
`;

const PlansHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

// ─── Dialog (Modal) ──────────────────────────────────────────────────

const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  padding: 24px;
`;

const ModalPanel = styled.div<{ $maxWidth?: string }>`
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  max-width: ${({ $maxWidth }) => $maxWidth || '900px'};
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
`;

const ModalTitle = styled.div`
  padding: 20px 24px;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.text};
  border-bottom: 1px solid ${theme.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalContent = styled.div<{ $noPadding?: boolean }>`
  padding: ${({ $noPadding }) => ($noPadding ? '0' : '24px')};
  overflow-y: auto;
  flex: 1;
`;

const ModalActions = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid ${theme.border};
`;

// ─── Spinner ─────────────────────────────────────────────────────────

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(14,165,233,0.2);
  border-top-color: ${theme.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const CenteredBox = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
`;

const EmptyText = styled.p`
  text-align: center;
  color: ${theme.textSecondary};
  font-size: 0.875rem;
  padding: 24px 0;
  margin: 0;
`;

const AnalyticsPlaceholder = styled.div`
  padding: 24px;
  text-align: center;
`;

const AnalyticsTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 16px 0 8px;
`;

const AnalyticsBody = styled.p`
  color: ${theme.textSecondary};
  font-size: 0.9375rem;
  margin: 0 0 16px;
  line-height: 1.6;
`;

// Mock data for demonstration
const mockWorkoutPlans: WorkoutPlan[] = [
  {
    id: '1',
    name: 'Strength Building Program',
    description: 'Comprehensive strength training for intermediate clients',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    goal: 'strength',
    startDate: '2024-03-01',
    endDate: '2024-05-01',
    status: 'active',
    days: []
  },
  {
    id: '2',
    name: 'Weight Loss Journey',
    description: 'Cardio and strength combination for weight loss',
    trainerId: 'trainer-1',
    clientId: 'client-2',
    goal: 'weight_loss',
    startDate: '2024-04-01',
    endDate: '2024-06-01',
    status: 'active',
    days: []
  },
  {
    id: '3',
    name: 'Beginner Full Body',
    description: 'Introduction to fitness for new clients',
    trainerId: 'trainer-2',
    clientId: 'client-3',
    goal: 'general',
    startDate: '2024-04-15',
    endDate: '2024-06-15',
    status: 'active',
    days: []
  }
];

const mockActiveWorkouts = [
  {
    id: 'w1',
    clientName: 'John Doe',
    planName: 'Strength Building Program',
    progress: 75,
    currentDay: 'Day 3: Upper Body',
    startedAt: '2024-05-13T10:00:00Z',
    status: 'in_progress'
  },
  {
    id: 'w2',
    clientName: 'Jane Smith',
    planName: 'Weight Loss Journey',
    progress: 40,
    currentDay: 'Day 2: Cardio',
    startedAt: '2024-05-13T14:30:00Z',
    status: 'in_progress'
  }
];

/**
 * AdminWorkoutManagement Component
 *
 * Main workout management interface for administrators
 * Integrates with the Workout MCP server for full functionality
 */
const AdminWorkoutManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    generateWorkoutPlan,
    checkMcpHealth,
    loading,
    error
  } = useWorkoutMcp();

  const [activeTab, setActiveTab] = useState(0);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalPlans: 0,
    activeWorkouts: 0,
    totalClients: 0,
    completedToday: 0
  });

  // Dialog states
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Data states
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>(mockWorkoutPlans);
  const [activeWorkouts, setActiveWorkouts] = useState(mockActiveWorkouts);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  // Check MCP connection on component mount
  useEffect(() => {
    checkMcpConnection();
    loadDashboardData();
  }, []);

  const checkMcpConnection = async () => {
    const isConnected = await checkMcpHealth();
    setMcpConnected(isConnected);
  };

  const loadDashboardData = async () => {
    try {
      // Load dashboard statistics
      setDashboardStats({
        totalPlans: workoutPlans.length,
        activeWorkouts: activeWorkouts.length,
        totalClients: 15, // Mock data
        completedToday: 8 // Mock data
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePlanCreated = (plan: WorkoutPlan) => {
    setWorkoutPlans([...workoutPlans, plan]);
    setPlanBuilderOpen(false);
    loadDashboardData();
  };

  const handleDeletePlan = (planId: string) => {
    setWorkoutPlans(workoutPlans.filter(plan => plan.id !== planId));
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'archived': return 'default';
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

  // Dashboard Overview Tab
  const renderDashboardOverview = () => (
    <div>
      {/* MCP Connection Status */}
      <AlertBox $severity={mcpConnected ? 'success' : 'warning'}>
        <AlertContent>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.9375rem' }}>
            MCP Workout Server: {mcpConnected ? 'Connected' : 'Disconnected'}
          </p>
          {!mcpConnected && (
            <TextSecondary style={{ display: 'block', marginTop: '4px' }}>
              Server should be running on http://localhost:8000
              <br />
              Use the 'start-mcp-simple.bat' script to start the server
            </TextSecondary>
          )}
        </AlertContent>
        <StyledButton $size="small" $variant="outlined" onClick={checkMcpConnection}>
          <RefreshCw size={16} />
          Check
        </StyledButton>
      </AlertBox>

      {/* Quick Stats */}
      <StatsGrid>
        <GlassCard>
          <CardCenter>
            <ClipboardList size={48} color={theme.accent} />
            <StatValue $color={theme.accent}>
              {dashboardStats.totalPlans}
            </StatValue>
            <TextSecondary>Active Workout Plans</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard>
          <CardCenter>
            <Play size={48} color={theme.warning} />
            <StatValue $color={theme.warning}>
              {dashboardStats.activeWorkouts}
            </StatValue>
            <TextSecondary>Active Workouts</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard>
          <CardCenter>
            <Users size={48} color={theme.purple} />
            <StatValue $color={theme.purple}>
              {dashboardStats.totalClients}
            </StatValue>
            <TextSecondary>Total Clients</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard>
          <CardCenter>
            <CheckCircle size={48} color={theme.success} />
            <StatValue $color={theme.success}>
              {dashboardStats.completedToday}
            </StatValue>
            <TextSecondary>Completed Today</TextSecondary>
          </CardCenter>
        </GlassCard>
      </StatsGrid>

      {/* Quick Actions */}
      <SectionTitle>Quick Actions</SectionTitle>
      <QuickActionsGrid>
        <GlassCard $clickable onClick={() => setPlanBuilderOpen(true)}>
          <CardCenter>
            <Plus size={40} color={theme.accent} />
            <ActionCardTitle>Create Plan</ActionCardTitle>
            <TextSecondary>Build a new workout plan</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard $clickable onClick={() => setExerciseLibraryOpen(true)}>
          <CardCenter>
            <Dumbbell size={40} color={theme.purple} />
            <ActionCardTitle>Exercise Library</ActionCardTitle>
            <TextSecondary>Browse exercises</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard $clickable onClick={() => setClientSelectionOpen(true)}>
          <CardCenter>
            <Users size={40} color={theme.info} />
            <ActionCardTitle>Select Clients</ActionCardTitle>
            <TextSecondary>Assign workout plans</TextSecondary>
          </CardCenter>
        </GlassCard>

        <GlassCard $clickable onClick={() => setAnalyticsOpen(true)}>
          <CardCenter>
            <BarChart3 size={40} color={theme.success} />
            <ActionCardTitle>Analytics</ActionCardTitle>
            <TextSecondary>View progress reports</TextSecondary>
          </CardCenter>
        </GlassCard>
      </QuickActionsGrid>

      {/* Active Workouts */}
      <SectionTitle>Active Workouts</SectionTitle>
      <GlassPaper>
        {activeWorkouts.length > 0 ? (
          <div>
            {activeWorkouts.map((workout) => (
              <WorkoutListItem key={workout.id}>
                <AvatarCircle>
                  <Play size={20} />
                </AvatarCircle>
                <WorkoutInfo>
                  <WorkoutPrimary>{workout.clientName} - {workout.planName}</WorkoutPrimary>
                  <TextSecondary style={{ display: 'block' }}>
                    {workout.currentDay}
                  </TextSecondary>
                  <ProgressBarTrack>
                    <ProgressBarFill $value={workout.progress} />
                  </ProgressBarTrack>
                  <TextCaption>
                    {workout.progress}% complete
                  </TextCaption>
                </WorkoutInfo>
                <Chip $color={getStatusColor(workout.status)}>
                  {workout.status}
                </Chip>
              </WorkoutListItem>
            ))}
          </div>
        ) : (
          <EmptyText>No active workouts</EmptyText>
        )}
      </GlassPaper>
    </div>
  );

  // Workout Plans Tab
  const renderWorkoutPlans = () => (
    <div>
      <PlansHeader>
        <SectionTitle style={{ margin: 0 }}>
          Workout Plans ({workoutPlans.length})
        </SectionTitle>
        <StyledButton $variant="contained" onClick={() => setPlanBuilderOpen(true)}>
          <Plus size={18} />
          Create New Plan
        </StyledButton>
      </PlansHeader>

      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <Th>Plan Name</Th>
              <Th>Goal</Th>
              <Th>Client</Th>
              <Th>Status</Th>
              <Th>Date Range</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {workoutPlans.map((plan) => (
              <Tr key={plan.id}>
                <Td>
                  <PlanName>{plan.name}</PlanName>
                  <PlanDesc>{plan.description}</PlanDesc>
                </Td>
                <Td>
                  <Chip $color={getGoalColor(plan.goal)}>
                    {plan.goal}
                  </Chip>
                </Td>
                <Td>
                  <TextSecondary>Client {plan.clientId}</TextSecondary>
                </Td>
                <Td>
                  <Chip $color={getStatusColor(plan.status)}>
                    {plan.status}
                  </Chip>
                </Td>
                <Td>
                  <DateText>
                    {new Date(plan.startDate!).toLocaleDateString()} -<br />
                    {new Date(plan.endDate!).toLocaleDateString()}
                  </DateText>
                </Td>
                <Td>
                  <ActionCell>
                    <IconBtn
                      title="View Details"
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <Eye size={18} />
                    </IconBtn>
                    <IconBtn
                      title="Edit Plan"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setPlanBuilderOpen(true);
                      }}
                    >
                      <Pencil size={18} />
                    </IconBtn>
                    <IconBtn
                      title="Delete Plan"
                      $color={theme.error}
                      onClick={() => handleDeletePlan(plan.id!)}
                    >
                      <Trash2 size={18} />
                    </IconBtn>
                  </ActionCell>
                </Td>
              </Tr>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </div>
  );

  const tabLabels = ['Dashboard', 'Workout Plans', 'Exercise Library', 'Client Management', 'Analytics'];

  return (
    <PageWrapper>
      {/* Page Header */}
      <PageHeader>
        <PageTitle>Workout Management</PageTitle>
        <HeaderActions>
          <IconBtn
            onClick={checkMcpConnection}
            $color={mcpConnected ? theme.success : theme.error}
            title="Refresh MCP Connection"
          >
            <RefreshCw size={20} />
          </IconBtn>
          <StyledButton
            $variant="outlined"
            onClick={() => {}} // TODO: Open MCP settings
          >
            <Settings size={18} />
            MCP Settings
          </StyledButton>
        </HeaderActions>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <AlertBox $severity="error">
          <AlertContent>{error}</AlertContent>
        </AlertBox>
      )}

      {/* Loading Indicator */}
      {loading && (
        <CenteredBox>
          <Spinner />
        </CenteredBox>
      )}

      {/* Main Tabs */}
      <TabBar>
        {tabLabels.map((label, index) => (
          <TabButton
            key={label}
            $active={activeTab === index}
            onClick={() => handleTabChange(index)}
          >
            {label}
          </TabButton>
        ))}
      </TabBar>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 0 && renderDashboardOverview()}
        {activeTab === 1 && renderWorkoutPlans()}
        {activeTab === 2 && (
          <ExerciseLibrary
            onExerciseSelect={(exercise) => console.log('Selected exercise:', exercise)}
          />
        )}
        {activeTab === 3 && (
          <ClientSelection
            onClientSelect={(client) => console.log('Selected client:', client)}
            multiSelect={true}
            showDetails={true}
          />
        )}
        {activeTab === 4 && (
          <AnalyticsPlaceholder>
            <BarChart3 size={64} color={theme.textSecondary} />
            <AnalyticsTitle>Analytics Dashboard</AnalyticsTitle>
            <TextSecondary>
              Comprehensive workout analytics and reporting tools.
            </TextSecondary>
            <StyledButton
              $variant="contained"
              style={{ marginTop: '16px' }}
              onClick={() => setAnalyticsOpen(true)}
            >
              View Analytics
            </StyledButton>
          </AnalyticsPlaceholder>
        )}
      </div>

      {/* Dialogs */}

      {/* Exercise Library Dialog */}
      <ModalOverlay $open={exerciseLibraryOpen} onClick={() => setExerciseLibraryOpen(false)}>
        <ModalPanel $maxWidth="900px" onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            Exercise Library
            <IconBtn onClick={() => setExerciseLibraryOpen(false)} title="Close">
              <X size={20} />
            </IconBtn>
          </ModalTitle>
          <ModalContent>
            <ExerciseLibrary
              onExerciseSelect={(exercise) => {
                console.log('Selected exercise:', exercise);
                setExerciseLibraryOpen(false);
              }}
            />
          </ModalContent>
          <ModalActions>
            <StyledButton $variant="text" onClick={() => setExerciseLibraryOpen(false)}>Close</StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Workout Plan Builder Dialog */}
      <ModalOverlay $open={planBuilderOpen} onClick={() => setPlanBuilderOpen(false)}>
        <ModalPanel $maxWidth="1200px" onClick={(e) => e.stopPropagation()}>
          <ModalContent $noPadding>
            <WorkoutPlanBuilder
              onPlanCreated={handlePlanCreated}
              existingPlan={selectedPlan || undefined}
              mode={selectedPlan ? 'edit' : 'create'}
            />
          </ModalContent>
        </ModalPanel>
      </ModalOverlay>

      {/* Client Selection Dialog */}
      <ModalOverlay $open={clientSelectionOpen} onClick={() => setClientSelectionOpen(false)}>
        <ModalPanel $maxWidth="900px" onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            Select Clients for Workout Assignment
            <IconBtn onClick={() => setClientSelectionOpen(false)} title="Close">
              <X size={20} />
            </IconBtn>
          </ModalTitle>
          <ModalContent>
            <ClientSelection
              onClientSelect={(client) => {
                console.log('Selected client for assignment:', client);
                setClientSelectionOpen(false);
              }}
              multiSelect={true}
              showDetails={true}
            />
          </ModalContent>
          <ModalActions>
            <StyledButton $variant="text" onClick={() => setClientSelectionOpen(false)}>Close</StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Analytics Dialog */}
      <ModalOverlay $open={analyticsOpen} onClick={() => setAnalyticsOpen(false)}>
        <ModalPanel $maxWidth="900px" onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            Workout Analytics
            <IconBtn onClick={() => setAnalyticsOpen(false)} title="Close">
              <X size={20} />
            </IconBtn>
          </ModalTitle>
          <ModalContent>
            <AnalyticsPlaceholder>
              <BarChart3 size={96} color={theme.accent} />
              <AnalyticsTitle style={{ fontSize: '1.5rem' }}>Analytics Dashboard</AnalyticsTitle>
              <AnalyticsBody>
                Advanced analytics and reporting features will be implemented here.
                This will include client progress tracking, workout completion rates,
                exercise performance metrics, and more.
              </AnalyticsBody>
            </AnalyticsPlaceholder>
          </ModalContent>
          <ModalActions>
            <StyledButton $variant="text" onClick={() => setAnalyticsOpen(false)}>Close</StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>
    </PageWrapper>
  );
};

export default AdminWorkoutManagement;
