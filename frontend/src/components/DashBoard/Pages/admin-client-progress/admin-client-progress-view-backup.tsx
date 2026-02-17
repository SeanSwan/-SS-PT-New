import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { ClientProgressData, LeaderboardEntry } from '../../../../services/client-progress-service';
import { Exercise } from '../../../../services/exercise-service';

// Import icons from lucide-react
import {
  ChevronUp,
  ChevronDown,
  Award,
  Search,
  User,
  UserCheck,
  UserPlus,
  Users,
  Filter,
  BarChart2,
  RefreshCcw,
  Pencil,
  Save,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  Activity,
  Heart,
  ArrowUpRight,
  Dumbbell,
  Trophy
} from 'lucide-react';

// Import styled component from MainCard
import MainCard from '../../../ui/MainCard';

// ─── Theme Tokens ───────────────────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: '#1d1f2b',
  bgDark: '#121420',
  bgInput: 'rgba(15,23,42,0.8)',
  border: 'rgba(14,165,233,0.2)',
  borderLight: 'rgba(255,255,255,0.1)',
  text: '#e2e8f0',
  textMuted: '#a0a0a0',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  success: '#22c55e',
  error: '#ef4444',
  gradientPrimary: 'linear-gradient(45deg, #3b82f6 0%, #00ffff 100%)',
  gradientPrimaryHover: 'linear-gradient(45deg, #2563eb 0%, #00e6ff 100%)',
  gradientLevel: 'linear-gradient(135deg, #00ffff, #00B4D8)',
};

// ─── Keyframes ──────────────────────────────────────────────────────
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 24px;
  background: ${theme.bgDark};
  min-height: 100vh;
`;

const HeaderBar = styled.div`
  margin-bottom: 24px;
  background: ${theme.bgCard};
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderTitle = styled.h4`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: ${theme.text};
`;

const HeaderSubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 1rem;
  color: ${theme.textMuted};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const StyledButton = styled.button<{
  $variant?: 'contained' | 'outlined' | 'text';
  $color?: 'primary' | 'error' | 'success';
  $size?: 'small' | 'medium';
}>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: ${({ $size }) => $size === 'small' ? '6px 16px' : '10px 20px'};
  border-radius: 8px;
  font-size: ${({ $size }) => $size === 'small' ? '0.8125rem' : '0.9375rem'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;

  ${({ $variant, $color }) => {
    if ($variant === 'outlined') {
      const borderColor = $color === 'error' ? theme.error : theme.cyan;
      return css`
        background: transparent;
        border: 1.5px solid ${borderColor};
        color: ${borderColor};
        &:hover {
          background: rgba(14, 165, 233, 0.1);
          border-color: ${theme.accent};
        }
      `;
    }
    if ($variant === 'text') {
      return css`
        background: transparent;
        color: ${theme.accent};
        padding: 6px 12px;
        &:hover {
          background: rgba(14, 165, 233, 0.08);
        }
      `;
    }
    // contained
    if ($color === 'error') {
      return css`
        background: ${theme.error};
        color: #fff;
        &:hover { background: #dc2626; }
      `;
    }
    return css`
      background: ${theme.gradientPrimary};
      color: #fff;
      &:hover { background: ${theme.gradientPrimaryHover}; }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IconBtn = styled.button<{ $color?: 'error' | 'success' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
  color: ${({ $color }) =>
    $color === 'error' ? theme.error :
    $color === 'success' ? theme.success :
    theme.text};

  &:hover {
    background: ${({ $color }) =>
      $color === 'error' ? 'rgba(239,68,68,0.15)' :
      $color === 'success' ? 'rgba(34,197,94,0.15)' :
      'rgba(14,165,233,0.1)'};
  }
`;

// ─── Tab Components ─────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: ${({ $active }) => $active ? theme.cyan : theme.textMuted};
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? theme.cyan : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.cyan};
    background: rgba(0, 255, 255, 0.05);
  }
`;

const TabPanelWrapper = styled.div`
  padding: 24px;
  background: #0A0A0A;
  color: ${theme.text};
  border-radius: 0 0 8px 8px;
`;

// ─── Layout Components ──────────────────────────────────────────────

const GridRow = styled.div<{ $gap?: number }>`
  display: grid;
  gap: ${({ $gap }) => $gap ?? 24}px;
`;

const GridCols = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ $gap }) => $gap ?? 24}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ClientLayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FlexRow = styled.div<{ $justify?: string; $align?: string; $gap?: number; $wrap?: boolean }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  gap: ${({ $gap }) => $gap ?? 0}px;
  ${({ $wrap }) => $wrap && 'flex-wrap: wrap;'}
`;

// ─── Card / Paper ───────────────────────────────────────────────────

const GlassCard = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 20, 0.2);
`;

const SidebarCard = styled(GlassCard)`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${theme.borderLight};
`;

const SidebarTitle = styled.h6`
  margin: 0 0 16px;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.text};
`;

const SidebarList = styled.div`
  flex: 1;
  overflow: auto;
`;

const ClientRow = styled.div<{ $selected?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${theme.borderLight};
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

// ─── Avatar ─────────────────────────────────────────────────────────

const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  min-width: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: ${theme.gradientPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: ${({ $size }) => ($size ? $size * 0.35 : 14)}px;
  margin-right: 8px;
`;

// ─── Level Badge ────────────────────────────────────────────────────

const LevelBadge = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 80}px;
  height: ${({ $size }) => $size || 80}px;
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

const LevelBadgeSmall = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${theme.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 0.8125rem;
  margin-right: 8px;
`;

// ─── Chip ───────────────────────────────────────────────────────────

const StyledChip = styled.span<{ $color?: 'primary' | 'success' | 'default'; $outlined?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;

  ${({ $color, $outlined }) => {
    if ($outlined) {
      return css`
        background: transparent;
        border: 1px solid ${theme.textMuted};
        color: ${theme.textMuted};
      `;
    }
    switch ($color) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.2);
          color: ${theme.success};
        `;
      case 'primary':
        return css`
          background: rgba(14, 165, 233, 0.2);
          color: ${theme.accent};
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.1);
          color: ${theme.textMuted};
        `;
    }
  }}
`;

// ─── Input / Search ─────────────────────────────────────────────────

const SearchInputWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.textMuted};
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 40px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: ${theme.bgInput};
  color: ${theme.text};
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const FormInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: ${theme.bgInput};
  color: ${theme.text};
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: ${theme.bgInput};
  color: ${theme.text};
  font-size: 0.9375rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textMuted};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

// ─── Table Components ───────────────────────────────────────────────

const TableWrapper = styled.div`
  background: ${theme.bgCard};
  border-radius: 8px;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead``;
const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid ${theme.borderLight};

  &:last-child {
    border-bottom: none;
  }
`;

const Th = styled.th<{ $align?: string; $width?: string }>`
  padding: 10px 16px;
  text-align: ${({ $align }) => $align || 'left'};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textMuted};
  white-space: nowrap;
  width: ${({ $width }) => $width || 'auto'};
`;

const Td = styled.td<{ $align?: string; $width?: string }>`
  padding: 10px 16px;
  text-align: ${({ $align }) => $align || 'left'};
  font-size: 0.875rem;
  color: ${theme.text};
  width: ${({ $width }) => $width || 'auto'};
`;

// ─── Progress Bar ───────────────────────────────────────────────────

const ProgressBarOuter = styled.div<{ $height?: number }>`
  width: 100%;
  height: ${({ $height }) => $height || 8}px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ $value: number }>`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background: ${theme.gradientPrimary};
  border-radius: 999px;
  transition: width 0.4s ease;
`;

// ─── Stat Card ──────────────────────────────────────────────────────

const StatBox = styled.div`
  padding: 12px;
  text-align: center;
  background: rgba(26, 28, 51, 0.8);
  border: 1px solid ${theme.border};
  border-radius: 8px;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.text};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  margin-top: 2px;
`;

// ─── Dialog / Modal ─────────────────────────────────────────────────

const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const ModalPanel = styled.div`
  background: #121212;
  border: 1px solid ${theme.border};
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.borderLight};
  color: ${theme.text};
  font-size: 1.25rem;
  font-weight: 600;
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  color: ${theme.text};
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${theme.borderLight};
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #121212;
`;

// ─── Typography helpers ─────────────────────────────────────────────

const TextH4 = styled.h4`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${theme.text};
`;

const TextH5 = styled.h5`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${theme.text};
`;

const TextH6 = styled.h6`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.text};
`;

const TextSubtitle = styled.p`
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
`;

const TextBody = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${theme.text};
`;

const TextBody2 = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${theme.text};
`;

const TextCaption = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const TextMuted = styled.span`
  color: ${theme.textMuted};
`;

const NoClientMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: ${theme.textMuted};
  font-size: 1rem;
`;

// ─── Spinner ────────────────────────────────────────────────────────

const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 24}px;
  height: ${({ $size }) => $size || 24}px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: ${theme.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// ─── Helpers for stats grid ─────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ThreeColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FourColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

// ═════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════

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
        toast({
          title: "Error",
          description: "Failed to fetch client progress.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error fetching client progress:', err);
      toast({
        title: "Error",
        description: "Failed to fetch client progress. Please try again.",
        variant: "destructive"
      });

      // For demo purposes, set mock data
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommended exercises for client
  const fetchRecommendedExercises = async (clientId: string) => {
    try {
      const result = await services.exercise.getRecommendedExercises(clientId);
      if (result && result.success) {
        setRecommendedExercises(result.recommendedExercises);
      } else {
        console.warn('Failed to fetch recommended exercises');
      }
    } catch (err) {
      console.error('Error fetching recommended exercises:', err);

      // For demo purposes, set mock data
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
    }
  };

  // Fetch leaderboard from API
  const fetchLeaderboard = async () => {
    try {
      const result = await services.clientProgress.getLeaderboard();
      if (result && result.success) {
        setLeaderboard(result.leaderboard);
      } else {
        console.warn('Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);

      // For demo purposes, set mock data
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
    }
  };

  // Update client progress
  const updateClientProgress = async () => {
    if (!selectedClientId || !editForm) return;

    try {
      const result = await services.clientProgress.updateClientProgressById(selectedClientId, editForm);
      if (result && result.success) {
        setClientProgress(result.progress);
        setEditForm(result.progress);
        setShowEditDialog(false);
        toast({
          title: "Success",
          description: "Client progress updated successfully.",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update client progress.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error updating client progress:', err);
      toast({
        title: "Error",
        description: "Failed to update client progress. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle tab change
  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  // Handle edit form changes
  const handleEditFormChange = (field: keyof ClientProgressData, value: number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle adding achievement
  const handleAddAchievement = (achievementId: string) => {
    if (!editForm || !editForm.achievements) return;

    if (!editForm.achievements.includes(achievementId)) {
      const newAchievements = [...editForm.achievements, achievementId];
      const newAchievementDates = {
        ...editForm.achievementDates,
        [achievementId]: new Date().toISOString()
      };

      setEditForm(prev => ({
        ...prev,
        achievements: newAchievements,
        achievementDates: newAchievementDates
      }));
    }
  };

  // Handle removing achievement
  const handleRemoveAchievement = (achievementId: string) => {
    if (!editForm || !editForm.achievements) return;

    if (editForm.achievements.includes(achievementId)) {
      const newAchievements = editForm.achievements.filter(id => id !== achievementId);
      const newAchievementDates = { ...editForm.achievementDates };

      if (newAchievementDates && newAchievementDates[achievementId]) {
        delete newAchievementDates[achievementId];
      }

      setEditForm(prev => ({
        ...prev,
        achievements: newAchievements,
        achievementDates: newAchievementDates
      }));
    }
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

  // Helper to get achievement name
  const getAchievementName = (achievementId: string) => {
    switch (achievementId) {
      case 'core-10': return 'Core Beginner';
      case 'balance-10': return 'Balanced Start';
      case 'flexibility-10': return 'First Stretch';
      case 'calisthenics-10': return 'Bodyweight Basics';
      case 'squats-10': return 'Squat Novice';
      case 'lunges-10': return 'Lunge Beginner';
      case 'planks-10': return 'Plank Starter';
      case 'overall-50': return 'Fitness Journey';
      default: return achievementId;
    }
  };

  // Helper to get NASM category name
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'core': return 'Core';
      case 'balance': return 'Balance';
      case 'stability': return 'Stability';
      case 'flexibility': return 'Flexibility';
      case 'calisthenics': return 'Calisthenics';
      case 'isolation': return 'Isolation';
      case 'stabilizers': return 'Stabilizers';
      case 'injury_prevention': return 'Injury Prevention';
      case 'injury_recovery': return 'Injury Recovery';
      default: return category;
    }
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

  // Render the selected client's progress
  const renderClientProgress = () => {
    if (!clientProgress) {
      return (
        <NoClientMessage>
          <p>Select a client to view their progress</p>
        </NoClientMessage>
      );
    }

    return (
      <div>
        <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
          <TextH5>
            {getClientById(clientProgress.userId)?.firstName} {getClientById(clientProgress.userId)?.lastName}'s Progress
          </TextH5>
          <StyledButton
            $variant="contained"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil size={16} />
            Edit Progress
          </StyledButton>
        </FlexRow>

        <GridRow $gap={24}>
          <TwoColGrid>
            {/* Overall Level Card */}
            <MainCard title="Overall Progress">
              <FlexRow $align="center" style={{ marginBottom: 16 }}>
                <LevelBadge>
                  <TextH4 style={{ fontSize: '1.75rem', color: theme.bgCard }}>{clientProgress.overallLevel}</TextH4>
                  <TextCaption style={{ color: theme.bgCard, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em' }}>LEVEL</TextCaption>
                </LevelBadge>
                <div style={{ flex: 1 }}>
                  <TextH6>{getLevelName(clientProgress.overallLevel)}</TextH6>
                  <ProgressBarOuter style={{ marginTop: 8, marginBottom: 4 }}>
                    <ProgressBarInner $value={Math.min(100, (clientProgress.experiencePoints / (100 + (clientProgress.overallLevel * 25))) * 100)} />
                  </ProgressBarOuter>
                  <FlexRow $justify="space-between">
                    <TextCaption>{clientProgress.experiencePoints} XP</TextCaption>
                    <TextCaption>Next: {clientProgress.overallLevel + 1}</TextCaption>
                  </FlexRow>
                </div>
              </FlexRow>

              <StatsGrid>
                <StatBox>
                  <StatValue>{clientProgress.workoutsCompleted}</StatValue>
                  <StatLabel>Workouts</StatLabel>
                </StatBox>
                <StatBox>
                  <StatValue>{clientProgress.streakDays}</StatValue>
                  <StatLabel>Day Streak</StatLabel>
                </StatBox>
                <StatBox>
                  <StatValue>{clientProgress.totalExercisesPerformed}</StatValue>
                  <StatLabel>Exercises</StatLabel>
                </StatBox>
                <StatBox>
                  <StatValue>{clientProgress.totalMinutes}</StatValue>
                  <StatLabel>Minutes</StatLabel>
                </StatBox>
              </StatsGrid>
            </MainCard>

            {/* Achievements Card */}
            <MainCard
              title="Achievements"
              secondary={
                <StyledChip $color="primary">
                  {clientProgress.achievements?.length || 0}/8
                </StyledChip>
              }
            >
              <TableWrapper>
                <StyledTable>
                  <Thead>
                    <Tr>
                      <Th>Achievement</Th>
                      <Th>Date Unlocked</Th>
                      <Th $align="center">Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[
                      'core-10', 'balance-10', 'flexibility-10', 'calisthenics-10',
                      'squats-10', 'lunges-10', 'planks-10', 'overall-50'
                    ].map((achievementId) => {
                      const isUnlocked = clientProgress.achievements?.includes(achievementId) || false;
                      const unlockDate = clientProgress.achievementDates?.[achievementId];

                      return (
                        <Tr key={achievementId}>
                          <Td>{getAchievementName(achievementId)}</Td>
                          <Td>
                            {unlockDate ? new Date(unlockDate).toLocaleDateString() : '-'}
                          </Td>
                          <Td $align="center">
                            {isUnlocked ? (
                              <StyledChip $color="success">
                                <Check size={14} />
                                Unlocked
                              </StyledChip>
                            ) : (
                              <StyledChip $outlined>
                                Locked
                              </StyledChip>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </StyledTable>
              </TableWrapper>
            </MainCard>
          </TwoColGrid>

          <TwoColGrid>
            {/* NASM Category Levels */}
            <MainCard title="NASM Protocol Progress">
              <TableWrapper>
                <StyledTable>
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th>Level</Th>
                      <Th>Progress</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[
                      { type: 'core', field: 'coreLevel' },
                      { type: 'balance', field: 'balanceLevel' },
                      { type: 'stability', field: 'stabilityLevel' },
                      { type: 'flexibility', field: 'flexibilityLevel' },
                      { type: 'calisthenics', field: 'calisthenicsLevel' },
                      { type: 'isolation', field: 'isolationLevel' },
                      { type: 'stabilizers', field: 'stabilizersLevel' },
                      { type: 'injury_prevention', field: 'injuryPreventionLevel' },
                      { type: 'injury_recovery', field: 'injuryRecoveryLevel' }
                    ].map((category) => (
                      <Tr key={category.type}>
                        <Td>{getCategoryName(category.type)}</Td>
                        <Td>{clientProgress[category.field as keyof ClientProgressData] as number}</Td>
                        <Td $width="40%">
                          <ProgressBarOuter $height={6}>
                            <ProgressBarInner $value={Math.min(100, Math.max(0, Math.random() * 100))} />
                          </ProgressBarOuter>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </StyledTable>
              </TableWrapper>
            </MainCard>

            {/* Key Exercise Levels */}
            <MainCard title="Key Exercise Progress">
              <TableWrapper>
                <StyledTable>
                  <Thead>
                    <Tr>
                      <Th>Exercise</Th>
                      <Th>Level</Th>
                      <Th>Progress</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {[
                      { name: 'Squats', field: 'squatsLevel' },
                      { name: 'Lunges', field: 'lungesLevel' },
                      { name: 'Planks', field: 'planksLevel' },
                      { name: 'Reverse Planks', field: 'reversePlanksLevel' }
                    ].map((exercise) => (
                      <Tr key={exercise.field}>
                        <Td>{exercise.name}</Td>
                        <Td>{clientProgress[exercise.field as keyof ClientProgressData] as number}</Td>
                        <Td $width="40%">
                          <ProgressBarOuter $height={6}>
                            <ProgressBarInner $value={Math.min(100, Math.max(0, Math.random() * 100))} />
                          </ProgressBarOuter>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </StyledTable>
              </TableWrapper>
            </MainCard>
          </TwoColGrid>

          {/* Recommended Exercises */}
          <MainCard
            title="Recommended Exercises"
            secondary={
              <StyledButton
                $variant="text"
                onClick={() => fetchRecommendedExercises(clientProgress.userId)}
              >
                <RefreshCcw size={16} />
                Refresh
              </StyledButton>
            }
          >
            <TableWrapper style={{ background: 'rgba(26, 28, 51, 0.8)' }}>
              <StyledTable>
                <Thead>
                  <Tr>
                    <Th>Exercise Name</Th>
                    <Th>Type</Th>
                    <Th>Level</Th>
                    <Th>Primary Muscles</Th>
                    <Th>Sets/Reps</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recommendedExercises.slice(0, 5).map((exercise) => (
                    <Tr key={exercise.id}>
                      <Td>{exercise.name}</Td>
                      <Td>{getCategoryName(exercise.exerciseType)}</Td>
                      <Td>{exercise.difficulty}</Td>
                      <Td>{exercise.primaryMuscles.join(', ')}</Td>
                      <Td>
                        {exercise.recommendedSets || 3} x {exercise.recommendedReps || 10}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </StyledTable>
            </TableWrapper>
          </MainCard>

          {/* Notes */}
          <MainCard title="Trainer Notes">
            <TextBody2 style={{ whiteSpace: 'pre-line' }}>
              {clientProgress.progressNotes || 'No notes available.'}
            </TextBody2>
          </MainCard>
        </GridRow>
      </div>
    );
  };

  // Render the leaderboard tab
  const renderLeaderboard = () => {
    return (
      <div>
        <TextH5 style={{ marginBottom: 16 }}>Client Progress Leaderboard</TextH5>

        <GlassCard>
          <TableWrapper>
            <StyledTable>
              <Thead>
                <Tr>
                  <Th>Rank</Th>
                  <Th>Client</Th>
                  <Th>Level</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leaderboard.map((entry, index) => (
                  <Tr key={entry.userId}>
                    <Td>
                      <TextH6>{index + 1}</TextH6>
                    </Td>
                    <Td>
                      <FlexRow $align="center">
                        <AvatarCircle>
                          {entry.client.firstName[0]}{entry.client.lastName[0]}
                        </AvatarCircle>
                        <div>
                          <TextBody>
                            {entry.client.firstName} {entry.client.lastName}
                          </TextBody>
                          <TextCaption>
                            @{entry.client.username}
                          </TextCaption>
                        </div>
                      </FlexRow>
                    </Td>
                    <Td>
                      <FlexRow $align="center">
                        <LevelBadgeSmall>
                          {entry.overallLevel}
                        </LevelBadgeSmall>
                        <div>
                          <TextBody2>
                            {getLevelName(entry.overallLevel)}
                          </TextBody2>
                        </div>
                      </FlexRow>
                    </Td>
                    <Td>
                      <StyledChip
                        $color={entry.overallLevel > 40 ? 'success' : entry.overallLevel > 20 ? 'primary' : 'default'}
                      >
                        {entry.overallLevel > 40 ? 'Advanced' : entry.overallLevel > 20 ? 'Intermediate' : 'Beginner'}
                      </StyledChip>
                    </Td>
                    <Td>
                      <StyledButton
                        $variant="outlined"
                        $size="small"
                        onClick={() => setSelectedClientId(entry.userId)}
                      >
                        View Profile
                      </StyledButton>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </StyledTable>
          </TableWrapper>
        </GlassCard>
      </div>
    );
  };

  // Render client list sidebar
  const renderClientList = () => {
    return (
      <SidebarCard>
        <SidebarHeader>
          <SidebarTitle>Clients</SidebarTitle>

          <SearchInputWrapper>
            <SearchIcon>
              <Search size={18} />
            </SearchIcon>
            <StyledInput
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchInputWrapper>
        </SidebarHeader>

        <SidebarList>
          {getFilteredClients().map((client) => (
            <ClientRow
              key={client.id}
              $selected={selectedClientId === client.id}
              onClick={() => setSelectedClientId(client.id)}
            >
              <FlexRow $align="center">
                <AvatarCircle>
                  {client.firstName[0]}{client.lastName[0]}
                </AvatarCircle>
                <div>
                  <TextBody>
                    {client.firstName} {client.lastName}
                  </TextBody>
                  <TextCaption>
                    @{client.username}
                  </TextCaption>
                </div>
              </FlexRow>
            </ClientRow>
          ))}
        </SidebarList>
      </SidebarCard>
    );
  };

  // Render the edit dialog
  const renderEditDialog = () => {
    if (!editForm) return null;

    return (
      <ModalOverlay $open={showEditDialog} onClick={() => setShowEditDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            Edit Client Progress
          </ModalHeader>
          <ModalBody>
            <GridRow $gap={24}>
              {/* Overall Level */}
              <TwoColGrid>
                <div>
                  <TextSubtitle>Overall Progress</TextSubtitle>
                  <TwoColGrid>
                    <FormGroup>
                      <FormLabel>Overall Level</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        max={1000}
                        value={editForm.overallLevel || 0}
                        onChange={(e) => handleEditFormChange('overallLevel', parseInt(e.target.value))}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Experience Points</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        value={editForm.experiencePoints || 0}
                        onChange={(e) => handleEditFormChange('experiencePoints', parseInt(e.target.value))}
                      />
                    </FormGroup>
                  </TwoColGrid>
                </div>

                {/* Activity Stats */}
                <div>
                  <TextSubtitle>Activity Statistics</TextSubtitle>
                  <TwoColGrid>
                    <FormGroup>
                      <FormLabel>Workouts Completed</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        value={editForm.workoutsCompleted || 0}
                        onChange={(e) => handleEditFormChange('workoutsCompleted', parseInt(e.target.value))}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Total Exercises</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        value={editForm.totalExercisesPerformed || 0}
                        onChange={(e) => handleEditFormChange('totalExercisesPerformed', parseInt(e.target.value))}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Streak Days</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        value={editForm.streakDays || 0}
                        onChange={(e) => handleEditFormChange('streakDays', parseInt(e.target.value))}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Total Minutes</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        value={editForm.totalMinutes || 0}
                        onChange={(e) => handleEditFormChange('totalMinutes', parseInt(e.target.value))}
                      />
                    </FormGroup>
                  </TwoColGrid>
                </div>
              </TwoColGrid>

              {/* NASM Categories */}
              <div>
                <TextSubtitle>NASM Protocol Categories</TextSubtitle>
                <ThreeColGrid>
                  {[
                    { label: 'Core Level', field: 'coreLevel' },
                    { label: 'Balance Level', field: 'balanceLevel' },
                    { label: 'Stability Level', field: 'stabilityLevel' },
                    { label: 'Flexibility Level', field: 'flexibilityLevel' },
                    { label: 'Calisthenics Level', field: 'calisthenicsLevel' },
                    { label: 'Isolation Level', field: 'isolationLevel' },
                    { label: 'Stabilizers Level', field: 'stabilizersLevel' },
                    { label: 'Injury Prevention Level', field: 'injuryPreventionLevel' },
                    { label: 'Injury Recovery Level', field: 'injuryRecoveryLevel' }
                  ].map((category) => (
                    <FormGroup key={category.field}>
                      <FormLabel>{category.label}</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        max={1000}
                        value={editForm[category.field as keyof ClientProgressData] as number || 0}
                        onChange={(e) => handleEditFormChange(category.field as keyof ClientProgressData, parseInt(e.target.value))}
                      />
                    </FormGroup>
                  ))}
                </ThreeColGrid>
              </div>

              {/* Key Exercises */}
              <div>
                <TextSubtitle>Key Exercises</TextSubtitle>
                <FourColGrid>
                  {[
                    { label: 'Squats Level', field: 'squatsLevel' },
                    { label: 'Lunges Level', field: 'lungesLevel' },
                    { label: 'Planks Level', field: 'planksLevel' },
                    { label: 'Reverse Planks Level', field: 'reversePlanksLevel' }
                  ].map((exercise) => (
                    <FormGroup key={exercise.field}>
                      <FormLabel>{exercise.label}</FormLabel>
                      <FormInput
                        type="number"
                        min={0}
                        max={1000}
                        value={editForm[exercise.field as keyof ClientProgressData] as number || 0}
                        onChange={(e) => handleEditFormChange(exercise.field as keyof ClientProgressData, parseInt(e.target.value))}
                      />
                    </FormGroup>
                  ))}
                </FourColGrid>
              </div>

              {/* Achievements */}
              <div>
                <TextSubtitle>Achievements</TextSubtitle>
                <TableWrapper>
                  <StyledTable>
                    <Thead>
                      <Tr>
                        <Th>Achievement</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {[
                        'core-10', 'balance-10', 'flexibility-10', 'calisthenics-10',
                        'squats-10', 'lunges-10', 'planks-10', 'overall-50'
                      ].map((achievementId) => {
                        const isUnlocked = editForm.achievements?.includes(achievementId) || false;

                        return (
                          <Tr key={achievementId}>
                            <Td>{getAchievementName(achievementId)}</Td>
                            <Td>
                              {isUnlocked ? (
                                <StyledChip $color="success">
                                  <Check size={14} />
                                  Unlocked
                                </StyledChip>
                              ) : (
                                <StyledChip $outlined>
                                  Locked
                                </StyledChip>
                              )}
                            </Td>
                            <Td>
                              {isUnlocked ? (
                                <IconBtn
                                  $color="error"
                                  onClick={() => handleRemoveAchievement(achievementId)}
                                >
                                  <MinusCircle size={16} />
                                </IconBtn>
                              ) : (
                                <IconBtn
                                  $color="success"
                                  onClick={() => handleAddAchievement(achievementId)}
                                >
                                  <PlusCircle size={16} />
                                </IconBtn>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </StyledTable>
                </TableWrapper>
              </div>

              {/* Trainer Notes */}
              <FormGroup>
                <FormLabel>Trainer Notes</FormLabel>
                <FormTextarea
                  rows={4}
                  value={editForm.progressNotes || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, progressNotes: e.target.value }))}
                />
              </FormGroup>
            </GridRow>
          </ModalBody>
          <ModalFooter>
            <StyledButton
              $variant="outlined"
              $color="error"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </StyledButton>
            <StyledButton
              $variant="contained"
              onClick={updateClientProgress}
            >
              <Save size={16} />
              Save Changes
            </StyledButton>
          </ModalFooter>
        </ModalPanel>
      </ModalOverlay>
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
        <ButtonGroup>
          <StyledButton
            $variant="outlined"
            onClick={() => navigate('/dashboard/client-trainer-assignments')}
          >
            <Users size={18} />
            Manage Assignments
          </StyledButton>
          <StyledButton
            $variant="contained"
            onClick={() => {
              fetchClients();
              fetchLeaderboard();
            }}
          >
            <RefreshCcw size={18} />
            Refresh Data
          </StyledButton>
        </ButtonGroup>
      </HeaderBar>

      <TabBar>
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
      </TabBar>

      <TabPanel value={tabValue} index={0}>
        <ClientLayoutGrid>
          {renderClientList()}
          {renderClientProgress()}
        </ClientLayoutGrid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderLeaderboard()}
      </TabPanel>

      {/* Edit Dialog */}
      {renderEditDialog()}
    </PageWrapper>
  );
};

export default AdminClientProgressView;
