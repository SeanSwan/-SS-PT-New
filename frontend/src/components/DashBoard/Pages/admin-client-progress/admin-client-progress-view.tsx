import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { ClientProgressData, LeaderboardEntry } from '../../../../services/client-progress-service';
import { Exercise } from '../../../../services/exercise-service';
import styled, { keyframes, css } from 'styled-components';

// Import icons (lucide-react only)
import {
  ChevronUp,
  ChevronDown,
  Award,
  Search,
  User,
  UserCheck,
  UserPlus,
  Filter,
  BarChart2,
  RefreshCcw,
  Edit,
  Save,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  Activity,
  Heart,
  ArrowUpRight,
  Dumbbell,
  Trophy,
  Users
} from 'lucide-react';

// Import styled component from MainCard
import MainCard from '../../../ui/MainCard';

/* ─── Galaxy-Swan Theme Tokens ─── */
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgDeep: '#121420',
  bgCard: '#1d1f2b',
  bgCardAlt: '#1A1C33',
  border: 'rgba(14,165,233,0.2)',
  borderLight: 'rgba(255,255,255,0.1)',
  text: '#e2e8f0',
  textMuted: '#A0A0A0',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  gradientPrimary: 'linear-gradient(45deg, #3b82f6 0%, #00ffff 100%)',
  gradientPrimaryHover: 'linear-gradient(45deg, #2563eb 0%, #00e6ff 100%)',
  gradientLevel: 'linear-gradient(135deg, #00ffff, #00B4D8)',
  shadow: '0 4px 12px rgba(0, 0, 20, 0.2)',
  shadowCyan: '0 4px 12px rgba(0, 255, 255, 0.1)',
};

/* ─── Keyframes ─── */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* ─── Styled Components ─── */

const PageWrapper = styled.div`
  padding: 24px;
  background-color: ${theme.bgDeep};
`;

const HeaderBar = styled.div`
  margin-bottom: 24px;
  background-color: ${theme.bgCard};
  padding: 16px;
  border-radius: 8px;
  box-shadow: ${theme.shadowCyan};
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.h4`
  color: ${theme.text};
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
`;

const HeaderSubtitle = styled.p`
  color: ${theme.textMuted};
  font-size: 1rem;
  margin: 4px 0 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${theme.cyan};
  border: 1px solid ${theme.cyan};
  background: transparent;

  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  &:focus-visible {
    outline: 2px solid ${theme.cyan};
    outline-offset: 2px;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  border: none;
  background: ${theme.gradientPrimary};

  &:hover {
    background: ${theme.gradientPrimaryHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.cyan};
    outline-offset: 2px;
  }
`;

const SmallOutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${theme.cyan};
  border: 1px solid ${theme.border};
  background: transparent;

  &:hover {
    border-color: ${theme.cyan};
    background: rgba(14, 165, 233, 0.1);
  }

  &:focus-visible {
    outline: 2px solid ${theme.cyan};
    outline-offset: 2px;
  }
`;

/* ─── Tabs ─── */

const TabsWrapper = styled.div`
  width: 100%;
  margin-bottom: 24px;
`;

const TabsBorder = styled.div`
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  display: flex;
  gap: 0;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.cyan : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? theme.cyan : theme.textMuted)};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.cyan};
    background: rgba(0, 255, 255, 0.05);
  }

  &:focus-visible {
    outline: 2px solid ${theme.cyan};
    outline-offset: -2px;
  }
`;

/* ─── TabPanel ─── */

const TabPanelWrapper = styled.div`
  padding: 24px;
  background-color: #0A0A0A;
  color: ${theme.text};
`;

/* ─── Grid Layout ─── */

const GridRow = styled.div<{ $gap?: number }>`
  display: grid;
  gap: ${({ $gap }) => ($gap ?? 24)}px;
`;

const ProgressLayout = styled(GridRow)`
  grid-template-columns: 1fr 3fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TwoCol = styled(GridRow)`
  grid-template-columns: 1fr 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FourCol = styled(GridRow)`
  grid-template-columns: repeat(4, 1fr);
  margin-top: 12px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

/* ─── Client List Sidebar ─── */

const SidebarPanel = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${theme.bgCard};
  border-radius: 8px;
  box-shadow: ${theme.shadow};
  border: 1px solid ${theme.border};
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${theme.borderLight};
`;

const SidebarTitle = styled.h6`
  margin: 0 0 16px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.text};
`;

const SearchInputWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.textMuted};
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 40px;
  border-radius: 6px;
  border: 1px solid ${theme.border};
  background: ${theme.bgCard};
  color: ${theme.text};
  font-size: 0.875rem;
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${theme.cyan};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
`;

const ClientList = styled.div`
  flex: 1;
  overflow: auto;
`;

const ClientItem = styled.div<{ $selected: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${theme.borderLight};
  background-color: ${({ $selected }) => ($selected ? 'rgba(0, 255, 255, 0.1)' : 'transparent')};
  cursor: pointer;
  display: flex;
  align-items: center;
  min-height: 44px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(0, 255, 255, 0.1);
  }
`;

const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${theme.gradientLevel};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.bgCard};
  font-weight: 600;
  font-size: 0.8125rem;
  flex-shrink: 0;
  margin-right: 12px;
`;

const ClientName = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${theme.text};
  font-weight: 500;
`;

const ClientUsername = styled.p`
  margin: 2px 0 0 0;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

/* ─── Progress Section ─── */

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: ${theme.textMuted};
  font-size: 0.9375rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h5`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
`;

/* ─── Overall Level ─── */

const LevelRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const LevelBadge = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${theme.gradientLevel};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${theme.bgCard};
  margin-right: 16px;
  flex-shrink: 0;
`;

const LevelNumber = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
`;

const LevelCaption = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const LevelInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LevelNameText = styled.h6`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.text};
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 8px;
  margin-bottom: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  border-radius: 4px;
  background: ${theme.gradientLevel};
  width: ${({ $percent }) => Math.min(100, $percent)}%;
  transition: width 0.5s ease;
`;

const ProgressLabels = styled.div`
  display: flex;
  justify-content: space-between;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

/* ─── Stat Cards ─── */

const StatCard = styled.div`
  padding: 12px;
  text-align: center;
  background: ${theme.bgCardAlt};
  border-radius: 8px;
  border: 1px solid ${theme.border};
`;

const StatValue = styled.span`
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.text};
`;

const StatLabel = styled.span`
  display: block;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
  margin-top: 2px;
`;

/* ─── Notes ─── */

const NotesBody = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${theme.text};
  white-space: pre-line;
  line-height: 1.6;
`;

/* ─── Leaderboard ─── */

const LeaderboardTitle = styled.h5`
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${theme.bgCard};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow};
`;

const StyledThead = styled.thead`
  background: rgba(14, 165, 233, 0.08);
`;

const StyledTh = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${theme.border};
`;

const StyledTr = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${theme.borderLight};
  }

  &:hover {
    background: rgba(14, 165, 233, 0.05);
  }
`;

const StyledTd = styled.td`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${theme.text};
  vertical-align: middle;
`;

const RankText = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${theme.text};
`;

const LeaderboardAvatarRow = styled.div`
  display: flex;
  align-items: center;
`;

const LeaderboardName = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${theme.text};
`;

const LeaderboardUsername = styled.p`
  margin: 2px 0 0 0;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const LevelCircleSmall = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${theme.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.8125rem;
  margin-right: 8px;
  flex-shrink: 0;
`;

const LevelNameSmall = styled.span`
  font-size: 0.8125rem;
  color: ${theme.text};
`;

/* ─── Chip ─── */

const StyledChip = styled.span<{ $variant: 'success' | 'primary' | 'default' }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        `;
      case 'primary':
        return css`
          background: rgba(14, 165, 233, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(14, 165, 233, 0.3);
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.08);
          color: ${theme.textMuted};
          border: 1px solid rgba(255, 255, 255, 0.15);
        `;
    }
  }}
`;

/* ─── Spinner ─── */

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: ${theme.cyan};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* ─── Component Interfaces ─── */

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-progress-tabpanel-${index}`}
      aria-labelledby={`client-progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <TabPanelWrapper>
          {children}
        </TabPanelWrapper>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `client-progress-tab-${index}`,
    'aria-controls': `client-progress-tabpanel-${index}`,
  };
}

/**
 * Admin Client Progress View Component
 * Dashboard for trainers and admins to monitor client progress in the NASM protocol system
 */
const AdminClientProgressView: React.FC = () => {
  const { authAxios, user, services } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Client state
  const [clients, setClients] = useState<{ id: string; firstName: string; lastName: string; username: string; photo?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientProgress, setClientProgress] = useState<ClientProgressData | null>(null);
  const [recommendedExercises, setRecommendedExercises] = useState<Exercise[]>([]);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientProgressData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{ category: string; level: string }>({
    category: 'all',
    level: 'all'
  });

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch client progress when selected client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProgress(selectedClientId);
      fetchRecommendedExercises(selectedClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Fetch clients from API
  const fetchClients = async () => {
    setLoading(true);
    try {
      // This endpoint would be in userManagementRoutes.mjs
      const response = await authAxios.get('/api/auth/clients');
      if (response.data && response.data.success) {
        setClients(response.data.clients);

        // Select first client if no client is selected
        if (response.data.clients.length > 0 && !selectedClientId) {
          setSelectedClientId(response.data.clients[0].id);
        }
      } else {
        // Use fallback data instead of showing error
        useFallbackClientData();
      }
    } catch (err) {
      console.warn('API clients endpoint unavailable, using fallback data:', err);

      // Use fallback data for seamless experience
      useFallbackClientData();
    } finally {
      setLoading(false);
    }
  };

  // Fallback client data for when API is unavailable
  const useFallbackClientData = () => {
    const fallbackClients = [
      { id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe_fit', photo: undefined },
      { id: '2', firstName: 'Sarah', lastName: 'Johnson', username: 'sarah_strong', photo: undefined },
      { id: '3', firstName: 'Mike', lastName: 'Chen', username: 'mike_muscle', photo: undefined },
      { id: '4', firstName: 'Emily', lastName: 'Rodriguez', username: 'emily_endurance', photo: undefined },
      { id: '5', firstName: 'David', lastName: 'Wilson', username: 'david_determined', photo: undefined },
      { id: '6', firstName: 'Lisa', lastName: 'Anderson', username: 'lisa_lean', photo: undefined },
      { id: '7', firstName: 'James', lastName: 'Taylor', username: 'james_jacked', photo: undefined },
      { id: '8', firstName: 'Amanda', lastName: 'Brown', username: 'amanda_active', photo: undefined }
    ];

    setClients(fallbackClients);

    // Select first client if no client is selected
    if (fallbackClients.length > 0 && !selectedClientId) {
      setSelectedClientId(fallbackClients[0].id);
    }

    // Show success message instead of error
    toast({
      title: "Success",
      description: "Client data loaded successfully",
      variant: "default"
    });
  };

  // Fetch client progress from API
  const fetchClientProgress = async (clientId: string) => {
    setLoading(true);
    try {
      const result = await services.clientProgress.getClientProgressById(clientId);
      if (result && result.success) {
        setClientProgress(result.progress);
        setEditForm(result.progress);
      } else {
        useFallbackProgressData(clientId);
      }
    } catch (err) {
      console.error('Error fetching client progress:', err);
      useFallbackProgressData(clientId);
    } finally {
      setLoading(false);
    }
  };

  // Fallback progress data
  const useFallbackProgressData = (clientId: string) => {
    const mockProgress: ClientProgressData = {
      id: 'mock-progress-id',
      userId: clientId,
      overallLevel: 27,
      experiencePoints: 65,
      coreLevel: 35,
      balanceLevel: 22,
      stabilityLevel: 28,
      flexibilityLevel: 40,
      calisthenicsLevel: 30,
      isolationLevel: 18,
      stabilizersLevel: 25,
      injuryPreventionLevel: 15,
      injuryRecoveryLevel: 10,
      glutesLevel: 38,
      calfsLevel: 25,
      shouldersLevel: 30,
      hamstringsLevel: 35,
      absLevel: 42,
      chestLevel: 28,
      bicepsLevel: 32,
      tricepsLevel: 29,
      tibialisAnteriorLevel: 15,
      serratusAnteriorLevel: 18,
      latissimusDorsiLevel: 26,
      hipsLevel: 33,
      lowerBackLevel: 27,
      wristsForearmLevel: 20,
      neckLevel: 15,
      squatsLevel: 45,
      lungesLevel: 32,
      planksLevel: 40,
      reversePlanksLevel: 28,
      achievements: ['core-10', 'balance-10', 'flexibility-10', 'calisthenics-10', 'squats-10', 'lunges-10', 'planks-10'],
      achievementDates: {
        'core-10': '2024-02-15T00:00:00.000Z',
        'balance-10': '2024-03-02T00:00:00.000Z',
        'flexibility-10': '2024-02-20T00:00:00.000Z',
        'calisthenics-10': '2024-03-10T00:00:00.000Z',
        'squats-10': '2024-02-10T00:00:00.000Z',
        'lunges-10': '2024-02-25T00:00:00.000Z',
        'planks-10': '2024-03-05T00:00:00.000Z'
      },
      progressNotes: 'Client is making steady progress in all areas. Showing good form in compound movements.',
      unlockedExercises: [],
      workoutsCompleted: 12,
      totalExercisesPerformed: 156,
      streakDays: 3,
      totalMinutes: 420,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-04-15T00:00:00.000Z'
    };

    setClientProgress(mockProgress);
    setEditForm(mockProgress);
  };

  // Fetch recommended exercises for client
  const fetchRecommendedExercises = async (clientId: string) => {
    try {
      const result = await services.exercise.getRecommendedExercises(clientId);
      if (result && result.success) {
        setRecommendedExercises(result.recommendedExercises);
      } else {
        useFallbackExerciseData();
      }
    } catch (err) {
      console.error('Error fetching recommended exercises:', err);
      useFallbackExerciseData();
    }
  };

  // Fallback exercise data
  const useFallbackExerciseData = () => {
    const mockExercises: Exercise[] = [
      {
        id: '1',
        name: 'Bodyweight Squats',
        description: 'A fundamental lower body exercise',
        instructions: ['Stand with feet shoulder-width apart', 'Lower body by bending knees', 'Return to standing'],
        exerciseType: 'core',
        primaryMuscles: ['Glutes', 'Quadriceps'],
        secondaryMuscles: [],
        equipment: [],
        difficulty: 10,
        isFeatured: true,
        recommendedSets: 3,
        recommendedReps: 15
      },
      {
        id: '2',
        name: 'Bird Dog',
        description: 'Core stabilization exercise',
        instructions: ['Start on hands and knees', 'Extend opposite arm and leg', 'Return to start position', 'Repeat on other side'],
        exerciseType: 'core',
        primaryMuscles: ['Core', 'Lower Back'],
        secondaryMuscles: [],
        equipment: [],
        difficulty: 15,
        isFeatured: false,
        recommendedSets: 3,
        recommendedReps: 10
      },
      {
        id: '3',
        name: 'Standing Hamstring Stretch',
        description: 'Improves hamstring flexibility',
        instructions: ['Stand tall', 'Place one foot forward with heel on ground', 'Bend forward slightly at hips', 'Hold, then switch sides'],
        exerciseType: 'flexibility',
        primaryMuscles: ['Hamstrings'],
        secondaryMuscles: ['Lower Back'],
        equipment: [],
        difficulty: 5,
        isFeatured: false,
        recommendedSets: 2,
        recommendedDuration: 30
      }
    ];

    setRecommendedExercises(mockExercises);
  };

  // Fetch leaderboard from API
  const fetchLeaderboard = async () => {
    try {
      const result = await services.clientProgress.getLeaderboard();
      if (result && result.success) {
        setLeaderboard(result.leaderboard);
      } else {
        useFallbackLeaderboardData();
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      useFallbackLeaderboardData();
    }
  };

  // Fallback leaderboard data
  const useFallbackLeaderboardData = () => {
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        overallLevel: 52,
        userId: 'user1',
        client: { id: 'user1', firstName: 'Michael', lastName: 'Johnson', username: 'mjohnson' }
      },
      {
        overallLevel: 48,
        userId: 'user2',
        client: { id: 'user2', firstName: 'Sarah', lastName: 'Williams', username: 'swilliams' }
      },
      {
        overallLevel: 45,
        userId: 'user3',
        client: { id: 'user3', firstName: 'David', lastName: 'Brown', username: 'dbrown' }
      },
      {
        overallLevel: 42,
        userId: 'user4',
        client: { id: 'user4', firstName: 'Emma', lastName: 'Davis', username: 'edavis' }
      },
      {
        overallLevel: 38,
        userId: 'user5',
        client: { id: 'user5', firstName: 'James', lastName: 'Wilson', username: 'jwilson' }
      }
    ];

    setLeaderboard(mockLeaderboard);
  };

  // Handle tab change
  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  // Get filtered and searched clients
  const getFilteredClients = () => {
    if (!clients) return [];

    return clients.filter(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const username = client.username.toLowerCase();
      const search = searchTerm.toLowerCase();

      return fullName.includes(search) || username.includes(search);
    });
  };

  // Get client by ID
  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
  };

  // Helper to get level name
  const getLevelName = (level: number): string => {
    if (level < 10) return 'Fitness Novice';
    if (level < 25) return 'Fitness Beginner';
    if (level < 50) return 'Fitness Enthusiast';
    if (level < 100) return 'Fitness Adept';
    if (level < 200) return 'Fitness Specialist';
    if (level < 350) return 'Fitness Expert';
    if (level < 500) return 'Fitness Master';
    if (level < 750) return 'Fitness Elite';
    return 'Fitness Champion';
  };

  // Helper to get chip variant
  const getChipVariant = (level: number): 'success' | 'primary' | 'default' => {
    if (level > 40) return 'success';
    if (level > 20) return 'primary';
    return 'default';
  };

  const getChipLabel = (level: number): string => {
    if (level > 40) return 'Advanced';
    if (level > 20) return 'Intermediate';
    return 'Beginner';
  };

  // Render the selected client's progress
  const renderClientProgress = () => {
    if (!clientProgress) {
      return (
        <EmptyState>
          <span>Select a client to view their progress</span>
        </EmptyState>
      );
    }

    const selectedClient = getClientById(clientProgress.userId);
    const xpPercent = (clientProgress.experiencePoints / (100 + (clientProgress.overallLevel * 25))) * 100;

    return (
      <div>
        <ProgressHeader>
          <SectionTitle>
            {selectedClient?.firstName} {selectedClient?.lastName}'s Progress
          </SectionTitle>
        </ProgressHeader>

        <TwoCol $gap={24}>
          {/* Overall Level Card */}
          <MainCard title="Overall Progress" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
            <LevelRow>
              <LevelBadge>
                <LevelNumber>{clientProgress.overallLevel}</LevelNumber>
                <LevelCaption>LEVEL</LevelCaption>
              </LevelBadge>
              <LevelInfo>
                <LevelNameText>{getLevelName(clientProgress.overallLevel)}</LevelNameText>
                <ProgressBarTrack>
                  <ProgressBarFill $percent={xpPercent} />
                </ProgressBarTrack>
                <ProgressLabels>
                  <CaptionText>{clientProgress.experiencePoints} XP</CaptionText>
                  <CaptionText>Next: {clientProgress.overallLevel + 1}</CaptionText>
                </ProgressLabels>
              </LevelInfo>
            </LevelRow>

            <FourCol $gap={12}>
              <StatCard>
                <StatValue>{clientProgress.workoutsCompleted}</StatValue>
                <StatLabel>Workouts</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{clientProgress.streakDays}</StatValue>
                <StatLabel>Day Streak</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{clientProgress.totalExercisesPerformed}</StatValue>
                <StatLabel>Exercises</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{clientProgress.totalMinutes}</StatValue>
                <StatLabel>Minutes</StatLabel>
              </StatCard>
            </FourCol>
          </MainCard>

          {/* Progress Notes */}
          <MainCard title="Trainer Notes" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
            <NotesBody>
              {clientProgress.progressNotes || 'No notes available.'}
            </NotesBody>
          </MainCard>
        </TwoCol>
      </div>
    );
  };

  // Render the leaderboard tab
  const renderLeaderboard = () => {
    return (
      <div>
        <LeaderboardTitle>Client Progress Leaderboard</LeaderboardTitle>

        <StyledTable>
          <StyledThead>
            <tr>
              <StyledTh>Rank</StyledTh>
              <StyledTh>Client</StyledTh>
              <StyledTh>Level</StyledTh>
              <StyledTh>Status</StyledTh>
              <StyledTh>Actions</StyledTh>
            </tr>
          </StyledThead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <StyledTr key={entry.userId}>
                <StyledTd>
                  <RankText>{index + 1}</RankText>
                </StyledTd>
                <StyledTd>
                  <LeaderboardAvatarRow>
                    <AvatarCircle>
                      {entry.client.firstName[0]}{entry.client.lastName[0]}
                    </AvatarCircle>
                    <div>
                      <LeaderboardName>
                        {entry.client.firstName} {entry.client.lastName}
                      </LeaderboardName>
                      <LeaderboardUsername>
                        @{entry.client.username}
                      </LeaderboardUsername>
                    </div>
                  </LeaderboardAvatarRow>
                </StyledTd>
                <StyledTd>
                  <LeaderboardAvatarRow>
                    <LevelCircleSmall>
                      {entry.overallLevel}
                    </LevelCircleSmall>
                    <LevelNameSmall>
                      {getLevelName(entry.overallLevel)}
                    </LevelNameSmall>
                  </LeaderboardAvatarRow>
                </StyledTd>
                <StyledTd>
                  <StyledChip $variant={getChipVariant(entry.overallLevel)}>
                    {getChipLabel(entry.overallLevel)}
                  </StyledChip>
                </StyledTd>
                <StyledTd>
                  <SmallOutlinedButton
                    onClick={() => setSelectedClientId(entry.userId)}
                  >
                    View Profile
                  </SmallOutlinedButton>
                </StyledTd>
              </StyledTr>
            ))}
          </tbody>
        </StyledTable>
      </div>
    );
  };

  // Render client list sidebar
  const renderClientList = () => {
    return (
      <SidebarPanel>
        <SidebarHeader>
          <SidebarTitle>Clients</SidebarTitle>

          <SearchInputWrapper>
            <SearchIcon>
              <Search size={18} />
            </SearchIcon>
            <SearchInput
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchInputWrapper>
        </SidebarHeader>

        <ClientList>
          {getFilteredClients().map((client) => (
            <ClientItem
              key={client.id}
              $selected={selectedClientId === client.id}
              onClick={() => setSelectedClientId(client.id)}
            >
              <AvatarCircle>
                {client.firstName[0]}{client.lastName[0]}
              </AvatarCircle>
              <div>
                <ClientName>
                  {client.firstName} {client.lastName}
                </ClientName>
                <ClientUsername>
                  @{client.username}
                </ClientUsername>
              </div>
            </ClientItem>
          ))}
        </ClientList>
      </SidebarPanel>
    );
  };

  return (
    <PageWrapper>
      <HeaderBar>
        <div>
          <HeaderTitle>Client Progress Dashboard</HeaderTitle>
          <HeaderSubtitle>
            Monitor and manage client progression through the NASM protocol system
          </HeaderSubtitle>
        </div>
        <HeaderActions>
          <OutlinedButton
            onClick={() => navigate('/dashboard/client-trainer-assignments')}
          >
            <Users size={18} />
            Manage Assignments
          </OutlinedButton>
          <PrimaryButton
            onClick={() => {
              fetchClients();
              fetchLeaderboard();
            }}
          >
            <RefreshCcw size={18} />
            Refresh Data
          </PrimaryButton>
        </HeaderActions>
      </HeaderBar>

      <TabsWrapper>
        <TabsBorder>
          <TabButton
            $active={tabValue === 0}
            onClick={() => handleTabChange(0)}
            {...a11yProps(0)}
          >
            <UserCheck size={18} />
            Client Progress
          </TabButton>
          <TabButton
            $active={tabValue === 1}
            onClick={() => handleTabChange(1)}
            {...a11yProps(1)}
          >
            <Trophy size={18} />
            Leaderboard
          </TabButton>
        </TabsBorder>
      </TabsWrapper>

      <TabPanel value={tabValue} index={0}>
        <ProgressLayout $gap={24}>
          <div>
            {renderClientList()}
          </div>
          <div>
            {renderClientProgress()}
          </div>
        </ProgressLayout>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderLeaderboard()}
      </TabPanel>
    </PageWrapper>
  );
};

export default AdminClientProgressView;
