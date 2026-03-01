/**
 * Admin Client Management View
 * Comprehensive client management interface for administrators
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic gradients, glass surfaces, swan motifs)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { useSocket } from '../../../../hooks/use-socket';
import {
  AdminClient,
  AdminClientFilters,
  CreateClientRequest,
  UpdateClientRequest,
  AdminClientServiceInterface,
  createAdminClientService
} from '../../../../services/adminClientService';
import CreateClientModal from './CreateClientModal';
import AdminOnboardingPanel from './components/AdminOnboardingPanel';
import WorkoutLoggerModal from './components/WorkoutLoggerModal';
import ClientMeasurementPanel from './components/ClientMeasurementPanel';
import ClientWeighInPanel from './components/ClientWeighInPanel';
import { useClientActions } from './hooks/useClientActions';
import { getMeasurementColor } from '../../../../utils/measurementStatus';

// Import icons from lucide-react
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Eye,
  UserPlus,
  Key,
  Filter,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  ClipboardList,
  Dumbbell,
  Scale,
  Ruler
} from 'lucide-react';

// ─── Keyframes ───────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─── Layout Primitives ──────────────────────────────────────
const PageWrapper = styled.div`
  background-color: #0a0a1a;
  min-height: 100vh;
  color: #e2e8f0;
`;

const PageContent = styled.div`
  padding: 24px;
`;

const SectionHeader = styled.div`
  margin-bottom: 32px;
`;

const FlexRow = styled.div<{ $gap?: string; $wrap?: boolean; $align?: string; $justify?: string }>`
  display: flex;
  gap: ${({ $gap }) => $gap || '8px'};
  align-items: ${({ $align }) => $align || 'center'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`;

const FlexGrow = styled.div`
  flex: 1;
  max-width: 400px;
`;

const TabPanelContent = styled.div`
  padding: 24px 0;
`;

// ─── Typography ─────────────────────────────────────────────
const PageTitle = styled.h2`
  color: #00ffff;
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 700;
`;

const PageSubtitle = styled.p`
  color: #94a3b8;
  margin: 0;
  font-size: 1rem;
`;

const SectionTitle = styled.h3`
  color: #00ffff;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

const StatNumber = styled.h2<{ $color?: string }>`
  color: ${({ $color }) => $color || '#e2e8f0'};
  font-size: 2.25rem;
  margin: 0;
  font-weight: 700;
  text-align: center;
`;

const BodyText = styled.p<{ $color?: string; $weight?: number; $size?: string }>`
  color: ${({ $color }) => $color || '#e2e8f0'};
  font-weight: ${({ $weight }) => $weight || 400};
  font-size: ${({ $size }) => $size || '0.875rem'};
  margin: 0;
`;

const MutedText = styled.span`
  color: #94a3b8;
  font-size: 0.875rem;
`;

// ─── Surfaces / Glass Panels ────────────────────────────────
const DarkSurface = styled.div`
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  overflow: hidden;
`;

const CardPanel = styled.div<{ $bgTint?: string }>`
  background: ${({ $bgTint }) => $bgTint || 'rgba(15, 23, 42, 0.95)'};
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  color: #e2e8f0;
`;

const StatCard = styled.div<{ $bgTint?: string }>`
  background: ${({ $bgTint }) => $bgTint || 'rgba(15, 23, 42, 0.95)'};
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
`;

// ─── Table ──────────────────────────────────────────────────
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: rgba(37, 39, 66, 0.95);
`;

const TBody = styled.tbody``;

const TRow = styled.tr`
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.06);
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Td = styled.td<{ $align?: string }>`
  padding: 14px 16px;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: ${({ $align }) => $align || 'left'};
  vertical-align: middle;
`;

// ─── Pagination ─────────────────────────────────────────────
const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 12px 16px;
  color: #94a3b8;
  font-size: 0.875rem;
`;

const PaginationSelect = styled.select`
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 6px 8px;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #1d1f2b;
    color: #e2e8f0;
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: ${({ $disabled }) => ($disabled ? '#555' : '#e2e8f0')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

// ─── Buttons ────────────────────────────────────────────────
const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  color: #0a0a1a;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const RoundIconButton = styled.button<{ $color?: string; $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  min-width: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  height: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  width: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ $color }) => $color || '#e2e8f0'};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.12);
  }
`;

// ─── Inputs ─────────────────────────────────────────────────
const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px 10px 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  transition: border-color 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(0, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: #00ffff;
    background: rgba(255, 255, 255, 0.08);
  }
`;

// ─── Status Chip ────────────────────────────────────────────
const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;

  ${({ $status }) =>
    $status === 'active' &&
    `
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.5);
  `}

  ${({ $status }) =>
    $status === 'inactive' &&
    `
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.5);
  `}

  ${({ $status }) =>
    $status === 'pending' &&
    `
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.5);
  `}
`;

// ─── Check-in Status Dot ────────────────────────────────────
const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => $color}80;
  flex-shrink: 0;
`;

// ─── Server Status Chip ─────────────────────────────────────
const ServerChip = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;

  ${({ $status }) =>
    $status === 'online' &&
    `
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.4);
  `}

  ${({ $status }) =>
    $status === 'offline' &&
    `
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
    border: 1px solid rgba(244, 67, 54, 0.4);
  `}

  ${({ $status }) =>
    $status === 'error' &&
    `
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.4);
  `}
`;

// ─── Avatar ─────────────────────────────────────────────────
const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #00ffff;
  color: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
`;

// ─── Tabs ───────────────────────────────────────────────────
const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active: boolean; $disabled?: boolean }>`
  min-height: 44px;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#00ffff' : 'transparent')};
  background: transparent;
  color: ${({ $active, $disabled }) =>
    $disabled ? '#555' : $active ? '#00ffff' : '#94a3b8'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? '#00ffff' : '#e2e8f0')};
  }
`;

// ─── Context Menu ───────────────────────────────────────────
const ContextMenuOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const ContextMenuPanel = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${({ $y }) => $y}px;
  left: ${({ $x }) => $x}px;
  z-index: 1000;
  background: rgba(37, 39, 66, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 10px;
  padding: 6px 0;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: ${({ $danger }) => ($danger ? '#f44336' : '#e2e8f0')};
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.08);
  }

  svg {
    flex-shrink: 0;
    color: ${({ $danger }) => ($danger ? '#f44336' : '#e2e8f0')};
  }
`;

const MenuDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 4px 0;
`;

// ─── Skeleton ───────────────────────────────────────────────
const SkeletonBox = styled.div<{ $width?: string; $height?: string; $circle?: boolean }>`
  background: rgba(255, 255, 255, 0.08);
  border-radius: ${({ $circle }) => ($circle ? '50%' : '6px')};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

// ─── Spinner ────────────────────────────────────────────────
const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 24}px;
  height: ${({ $size }) => $size || 24}px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// ─── Grid (CSS Grid) ───────────────────────────────────────
const GridRow = styled.div<{ $columns?: string; $gap?: string }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns || 'repeat(3, 1fr)'};
  gap: ${({ $gap }) => $gap || '16px'};
`;

// ─── Empty State ────────────────────────────────────────────
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
  color: #94a3b8;
`;

// ─── Chip Wrapper (for server chips) ────────────────────────
const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// ─── Component interfaces ───────────────────────────────────
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
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <TabPanelContent>{children}</TabPanelContent>}
    </div>
  );
}

const AdminClientManagementView: React.FC = () => {
  const { authAxios, services } = useAuth();
  const { toast } = useToast();

  // Use service from auth context if available, otherwise create new instance
  const adminClientService = services?.adminClient || createAdminClientService(authAxios);

  // Add a check to ensure we have a valid service
  if (!adminClientService) {
    console.error('Admin client service not available');
    toast({
      title: "Error",
      description: "Service not available. Please try refreshing the page.",
      variant: "destructive"
    });
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ color: '#e2e8f0' }}>Service initialization error</h3>
        <p style={{ color: '#94a3b8' }}>Please refresh the page and try again.</p>
      </div>
    );
  }

  // State
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AdminClientFilters>({});
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<AdminClient | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mcpStatus, setMcpStatus] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [actionClient, setActionClient] = useState<AdminClient | null>(null);

  // Add socket connection for real-time updates
  const {
    lastMessage,
    isConnected: isSocketConnected
  } = useSocket('/ws/admin-dashboard');

  // Update socket effect to use fetchClients after it's defined
  useEffect(() => {
    if (lastMessage) {
      console.log('Received message:', lastMessage);
      // Handle purchase updates
      if (lastMessage.type === 'purchase' ||
          (lastMessage.type === 'dashboard:update' && lastMessage.data?.type === 'purchase')) {
        // Refresh clients list to show updated session counts
        fetchClients();
        toast({
          title: "Client Purchase",
          description: `${lastMessage.data.userName} purchased ${lastMessage.data.sessionsPurchased || ''} sessions`,
          variant: "default"
        });
      }
    }
  }, [lastMessage, toast, fetchClients]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminClientService.getClients({
        page: currentPage + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        ...filters
      });

      console.log('Client fetch response:', response);

      if (response.success) {
        // Handle both real and mock responses
        if (response.message === 'Mock response for /api/admin/clients') {
          // Handle mock response structure
          console.log('Handling mock client response');
          // Create mock client data for testing
          setClients([
            {
              id: '1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              username: 'johndoe',
              isActive: true,
              availableSessions: 5,
              role: 'client',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              totalWorkouts: 12,
              totalOrders: 3
            },
            {
              id: '2',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              username: 'janesmith',
              isActive: true,
              availableSessions: 3,
              role: 'client',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              totalWorkouts: 8,
              totalOrders: 1
            }
          ]);
          setTotalCount(2);
        } else {
          // Handle real response structure
          if (response.data && Array.isArray(response.data.clients)) {
            setClients(response.data.clients);
            setTotalCount(response.data.pagination?.total || 0);
          } else {
            console.error('Invalid response structure:', response);
            toast({
              title: "Error",
              description: "Invalid response structure from server",
              variant: "destructive"
            });
          }
        }
      } else {
        console.error('API returned success=false:', response);
        toast({
          title: "Error",
          description: response.message || "Failed to fetch clients",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [adminClientService, currentPage, rowsPerPage, searchTerm, filters, toast]);

  // Fetch MCP status
  const fetchMCPStatus = useCallback(async () => {
    try {
      const response = await adminClientService.getMCPStatus();
      console.log('MCP status response:', response);
      if (response.success && response.data) {
        // Handle both real and mock responses
        if (response.message === 'Mock response for /api/admin/mcp-status') {
          // Handle mock response structure
          console.log('Handling mock MCP status response');
          setMcpStatus({
            servers: [
              { name: 'Workout MCP', url: 'http://localhost:8000', status: 'online', lastChecked: new Date().toISOString() },
              { name: 'Gamification MCP', url: 'http://localhost:8001', status: 'online', lastChecked: new Date().toISOString() },
              { name: 'YOLO MCP', url: 'http://localhost:8002', status: 'offline', lastChecked: new Date().toISOString() },
              { name: 'Social Media MCP', url: 'http://localhost:8003', status: 'online', lastChecked: new Date().toISOString() },
              { name: 'Food Scanner MCP', url: 'http://localhost:8004', status: 'error', lastChecked: new Date().toISOString() },
              { name: 'Video Processing MCP', url: 'http://localhost:8005', status: 'online', lastChecked: new Date().toISOString() }
            ],
            summary: { online: 4, offline: 1, error: 1 }
          });
        } else {
          // Handle real response structure
          if (response.data.servers && response.data.summary) {
            setMcpStatus(response.data);
          } else {
            console.error('Invalid MCP status structure:', response.data);
            // Set a default structure to prevent errors
            setMcpStatus({
              servers: [],
              summary: { online: 0, offline: 0, error: 0 }
            });
          }
        }
      } else {
        console.error('Failed to fetch MCP status:', response);
        // Set default structure on failure
        setMcpStatus({
          servers: [],
          summary: { online: 0, offline: 0, error: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching MCP status:', error);
      // Set default structure on error
      setMcpStatus({
        servers: [],
        summary: { online: 0, offline: 0, error: 0 }
      });
    }
  }, [adminClientService]);

  // Effects
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchMCPStatus();
    // Refresh MCP status every 30 seconds
    const interval = setInterval(fetchMCPStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchMCPStatus]);

  // Handlers
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setCurrentPage(0);
    fetchClients();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: AdminClient) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    setAnchorEl(event.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  // Extracted action handlers
  const {
    handleViewDetails,
    handleEdit,
    handleDelete,
    handleResetPassword,
    handleCreateClient,
  } = useClientActions({
    adminClientService,
    toast,
    fetchClients,
    setSelectedClient,
    setShowDetailsModal,
    setShowEditModal,
    setShowCreateModal,
    handleMenuClose,
  });

  const openOnboarding = (client: AdminClient) => {
    setActionClient(client);
    setShowOnboarding(true);
    handleMenuClose();
  };

  const openWorkoutLogger = (client: AdminClient) => {
    setActionClient(client);
    setShowWorkoutLogger(true);
    handleMenuClose();
  };

  const openMeasurements = (client: AdminClient) => {
    setActionClient(client);
    setShowMeasurements(true);
    handleMenuClose();
  };

  const openWeighIn = (client: AdminClient) => {
    setActionClient(client);
    setShowWeighIn(true);
    handleMenuClose();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const pageStart = currentPage * rowsPerPage + 1;
  const pageEnd = Math.min((currentPage + 1) * rowsPerPage, totalCount);

  // Render methods
  const renderClientTable = () => (
    <DarkSurface>
      <div style={{ overflowX: 'auto' }}>
        <StyledTable>
          <THead>
            <TRow>
              <Th>Client</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Check-ins</Th>
              <Th>Sessions</Th>
              <Th>Last Activity</Th>
              <Th>Actions</Th>
            </TRow>
          </THead>
          <TBody>
            {loading ? (
              // Loading skeleton
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TRow key={index}>
                  <Td>
                    <FlexRow $gap="12px">
                      <SkeletonBox $width="40px" $height="40px" $circle />
                      <div>
                        <SkeletonBox $width="120px" $height="16px" />
                        <SkeletonBox $width="80px" $height="14px" style={{ marginTop: 6 }} />
                      </div>
                    </FlexRow>
                  </Td>
                  <Td>
                    <SkeletonBox $width="150px" $height="16px" />
                    <SkeletonBox $width="100px" $height="14px" style={{ marginTop: 6 }} />
                  </Td>
                  <Td>
                    <SkeletonBox $width="70px" $height="26px" />
                  </Td>
                  <Td>
                    <FlexRow $gap="6px">
                      <SkeletonBox $width="12px" $height="12px" $circle />
                      <SkeletonBox $width="12px" $height="12px" $circle />
                    </FlexRow>
                  </Td>
                  <Td>
                    <SkeletonBox $width="60px" $height="16px" />
                  </Td>
                  <Td>
                    <SkeletonBox $width="100px" $height="16px" />
                  </Td>
                  <Td>
                    <SkeletonBox $width="40px" $height="40px" $circle />
                  </Td>
                </TRow>
              ))
            ) : clients.length === 0 ? (
              <TRow>
                <Td colSpan={7} $align="center">
                  <EmptyState>
                    <UserPlus size={64} color="#666" style={{ marginBottom: 16 }} />
                    <h3 style={{ color: '#94a3b8', margin: '0 0 8px 0', fontWeight: 600 }}>
                      No clients found
                    </h3>
                    <BodyText $color="#94a3b8" style={{ marginBottom: 16 }}>
                      {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first client'}
                    </BodyText>
                    <PrimaryButton onClick={() => setShowCreateModal(true)}>
                      <Plus size={18} />
                      Add Client
                    </PrimaryButton>
                  </EmptyState>
                </Td>
              </TRow>
            ) : (
              clients.map((client) => (
                <TRow key={client.id}>
                  <Td>
                    <FlexRow $gap="12px">
                      <AvatarCircle>
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarCircle>
                      <div>
                        <BodyText $weight={600}>
                          {client.firstName} {client.lastName}
                        </BodyText>
                        <BodyText $color="#94a3b8" $size="0.8rem">
                          @{client.username}
                        </BodyText>
                      </div>
                    </FlexRow>
                  </Td>
                  <Td>
                    <BodyText>{client.email}</BodyText>
                    {client.phone && (
                      <BodyText $color="#94a3b8">{client.phone}</BodyText>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge $status={client.isActive ? 'active' : 'inactive'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <FlexRow $gap="8px" title="Measurement | Weigh-In">
                      <StatusDot
                        $color={getMeasurementColor((client as any).measurementSchedule?.measurementStatus)}
                        title={`Measurement: ${(client as any).measurementSchedule?.measurementDaysRemaining ?? '?'} days`}
                      />
                      <StatusDot
                        $color={getMeasurementColor((client as any).measurementSchedule?.weighInStatus)}
                        title={`Weigh-In: ${(client as any).measurementSchedule?.weighInDaysRemaining ?? '?'} days`}
                      />
                    </FlexRow>
                  </Td>
                  <Td>
                    <FlexRow $gap="6px">
                      <BodyText $weight={600}>
                        {client.availableSessions}
                      </BodyText>
                      <MutedText>available</MutedText>
                    </FlexRow>
                    {client.totalWorkouts !== undefined && (
                      <BodyText $color="#94a3b8">
                        {client.totalWorkouts} completed
                      </BodyText>
                    )}
                  </Td>
                  <Td>
                    {client.lastWorkout ? (
                      <BodyText $color="#94a3b8">
                        {new Date(client.lastWorkout.completedAt).toLocaleDateString()}
                      </BodyText>
                    ) : (
                      <BodyText $color="#94a3b8">
                        No workouts yet
                      </BodyText>
                    )}
                  </Td>
                  <Td>
                    <RoundIconButton
                      onClick={(e) => handleMenuOpen(e, client)}
                      title="Actions"
                    >
                      <MoreVertical size={20} />
                    </RoundIconButton>
                  </Td>
                </TRow>
              ))
            )}
          </TBody>
        </StyledTable>
      </div>
      <PaginationBar>
        <span>Rows per page:</span>
        <PaginationSelect
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </PaginationSelect>
        <span>
          {totalCount > 0 ? `${pageStart}-${pageEnd} of ${totalCount}` : '0 of 0'}
        </span>
        <PaginationButton
          $disabled={currentPage === 0}
          disabled={currentPage === 0}
          onClick={() => handlePageChange(currentPage - 1)}
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </PaginationButton>
        <PaginationButton
          $disabled={currentPage >= totalPages - 1}
          disabled={currentPage >= totalPages - 1}
          onClick={() => handlePageChange(currentPage + 1)}
          title="Next page"
        >
          <ChevronRight size={20} />
        </PaginationButton>
      </PaginationBar>
    </DarkSurface>
  );

  const renderMCPStatus = () => (
    <CardPanel>
      <FlexRow $justify="space-between" style={{ marginBottom: 16 }}>
        <SectionTitle>MCP Server Status</SectionTitle>
        <RoundIconButton
          onClick={fetchMCPStatus}
          $color="#00ffff"
          title="Refresh Status"
        >
          <RefreshCw size={20} />
        </RoundIconButton>
      </FlexRow>

      {mcpStatus ? (
        <div>
          <GridRow $columns="repeat(3, 1fr)" $gap="16px" style={{ marginBottom: 16 }}>
            <StatCard $bgTint="rgba(76, 175, 80, 0.1)">
              <StatNumber $color="#4caf50">
                {mcpStatus?.summary?.online || '0'}
              </StatNumber>
              <MutedText>Online</MutedText>
            </StatCard>
            <StatCard $bgTint="rgba(244, 67, 54, 0.1)">
              <StatNumber $color="#f44336">
                {mcpStatus?.summary?.offline || '0'}
              </StatNumber>
              <MutedText>Offline</MutedText>
            </StatCard>
            <StatCard $bgTint="rgba(255, 152, 0, 0.1)">
              <StatNumber $color="#ff9800">
                {mcpStatus?.summary?.error || '0'}
              </StatNumber>
              <MutedText>Error</MutedText>
            </StatCard>
          </GridRow>

          <ChipWrap>
            {(mcpStatus?.servers || []).map((server: any) => (
              <ServerChip key={server.name} $status={server.status}>
                {server.status === 'online' ? (
                  <CheckCircle2 size={14} />
                ) : server.status === 'offline' ? (
                  <XCircle size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                {server.name}
              </ServerChip>
            ))}
          </ChipWrap>
        </div>
      ) : (
        <Spinner />
      )}
    </CardPanel>
  );

  return (
    <PageWrapper>
      <PageContent>
        {/* Header */}
        <SectionHeader>
          <PageTitle>Client Management</PageTitle>
          <PageSubtitle>Manage client accounts, sessions, and progress</PageSubtitle>
        </SectionHeader>

        {/* MCP Status */}
        {renderMCPStatus()}

        {/* Search and Actions */}
        <FlexRow $gap="12px" $wrap style={{ marginBottom: 24 }}>
          <FlexGrow>
            <form onSubmit={handleSearchSubmit}>
              <SearchInputWrapper>
                <SearchIcon>
                  <Search size={18} />
                </SearchIcon>
                <StyledInput
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </SearchInputWrapper>
            </form>
          </FlexGrow>

          <PrimaryButton onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Add Client
          </PrimaryButton>

          <SecondaryButton onClick={fetchClients}>
            <RefreshCw size={18} />
            Refresh
          </SecondaryButton>
        </FlexRow>

        {/* Tabs */}
        <TabBar>
          <TabButton
            $active={currentTab === 0}
            onClick={() => handleTabChange(0)}
          >
            All Clients
          </TabButton>
          <TabButton
            $active={currentTab === 1}
            $disabled
            disabled
            onClick={() => {}}
          >
            Analytics
          </TabButton>
          <TabButton
            $active={currentTab === 2}
            $disabled
            disabled
            onClick={() => {}}
          >
            Reports
          </TabButton>
        </TabBar>

        {/* Content */}
        <TabPanel value={currentTab} index={0}>
          {renderClientTable()}
        </TabPanel>
      </PageContent>

      {/* Context Menu */}
      {anchorEl && (
        <>
          <ContextMenuOverlay onClick={handleMenuClose} />
          <ContextMenuPanel $x={menuPos.x} $y={menuPos.y}>
            <ContextMenuItem onClick={() => menuClient && handleViewDetails(menuClient)}>
              <Eye size={18} />
              View Details
            </ContextMenuItem>
            <ContextMenuItem onClick={() => menuClient && handleEdit(menuClient)}>
              <Edit size={18} />
              Edit Client
            </ContextMenuItem>
            <ContextMenuItem onClick={() => menuClient && handleResetPassword(menuClient)}>
              <Key size={18} />
              Reset Password
            </ContextMenuItem>
            <MenuDivider />
            <ContextMenuItem
              data-testid="menu-start-onboarding"
              onClick={() => menuClient && openOnboarding(menuClient)}
            >
              <ClipboardList size={18} />
              Start Onboarding
            </ContextMenuItem>
            <ContextMenuItem
              data-testid="menu-log-workout"
              onClick={() => menuClient && openWorkoutLogger(menuClient)}
            >
              <Dumbbell size={18} />
              Log Workout
            </ContextMenuItem>
            <ContextMenuItem
              data-testid="menu-measurements"
              onClick={() => menuClient && openMeasurements(menuClient)}
            >
              <Ruler size={18} />
              Measurements
            </ContextMenuItem>
            <ContextMenuItem
              data-testid="menu-weigh-in"
              onClick={() => menuClient && openWeighIn(menuClient)}
            >
              <Scale size={18} />
              Weigh-In
            </ContextMenuItem>
            <MenuDivider />
            <ContextMenuItem
              $danger
              onClick={() => menuClient && handleDelete(menuClient)}
            >
              <Trash2 size={18} />
              Deactivate
            </ContextMenuItem>
          </ContextMenuPanel>
        </>
      )}

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
        trainers={[]} // TODO: Add trainers list when available
      />

      {showOnboarding && actionClient && (
        <AdminOnboardingPanel
          clientId={Number(actionClient.id)}
          clientName={`${actionClient.firstName} ${actionClient.lastName}`}
          onClose={() => { setShowOnboarding(false); setActionClient(null); }}
          onComplete={fetchClients}
        />
      )}

      <WorkoutLoggerModal
        open={showWorkoutLogger}
        onClose={() => { setShowWorkoutLogger(false); setActionClient(null); }}
        clientId={Number(actionClient?.id || 0)}
        clientName={actionClient ? `${actionClient.firstName} ${actionClient.lastName}` : ''}
        onSuccess={fetchClients}
      />

      {showMeasurements && actionClient && (
        <ClientMeasurementPanel
          clientId={Number(actionClient.id)}
          clientName={`${actionClient.firstName} ${actionClient.lastName}`}
          onClose={() => { setShowMeasurements(false); setActionClient(null); }}
          onUpdate={fetchClients}
        />
      )}

      {showWeighIn && actionClient && (
        <ClientWeighInPanel
          clientId={Number(actionClient.id)}
          clientName={`${actionClient.firstName} ${actionClient.lastName}`}
          onClose={() => { setShowWeighIn(false); setActionClient(null); }}
          onUpdate={fetchClients}
        />
      )}
    </PageWrapper>
  );
};

export default AdminClientManagementView;
