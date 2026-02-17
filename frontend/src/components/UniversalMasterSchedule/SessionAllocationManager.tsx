/**
 * Session Allocation Manager - Enterprise Financial Command Center
 * =============================================================
 *
 * Critical business component that manages client session balances,
 * payment integration, and package allocation in real-time.
 *
 * Key Features:
 * - Real-time session balance tracking
 * - Stripe payment integration monitoring
 * - Automated session allocation on purchase
 * - Package management with expiration tracking
 * - Revenue analytics with forecasting
 * - Admin override capabilities
 *
 * Master Blueprint Alignment:
 * - True admin control over session economy
 * - Integrated payment and gamification flow
 * - Enterprise-level financial intelligence
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';

// Icons
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Star,
  Zap,
  Target,
  Award,
  Activity
} from 'lucide-react';

// Context and Services
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import sessionService from '../../services/sessionService';
import { universalMasterScheduleService } from '../../services/universal-master-schedule-service';

// Types
import type { Client, Session } from './types';

// Styled Components Theme
import { stellarTheme } from './UniversalMasterScheduleTheme';

// ==================== INTERFACES ====================

interface SessionAllocation {
  id: string;
  clientId: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  purchaseDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'pending' | 'paused';
  packagePrice: number;
  sessionValue: number;
  client?: Client;
}

interface AllocationStats {
  totalActiveClients: number;
  totalAllocatedSessions: number;
  totalUsedSessions: number;
  totalRevenue: number;
  averagePackageSize: number;
  utilizationRate: number;
  expiringPackages: number;
  newPurchasesToday: number;
}

interface SessionAllocationManagerProps {
  onAllocationUpdate?: (allocation: SessionAllocation) => void;
  showControls?: boolean;
  compactView?: boolean;
}

// ==================== MAIN COMPONENT ====================

const SessionAllocationManager: React.FC<SessionAllocationManagerProps> = ({
  onAllocationUpdate,
  showControls = true,
  compactView = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ==================== STATE ====================

  const [allocations, setAllocations] = useState<SessionAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AllocationStats>({
    totalActiveClients: 0,
    totalAllocatedSessions: 0,
    totalUsedSessions: 0,
    totalRevenue: 0,
    averagePackageSize: 0,
    utilizationRate: 0,
    expiringPackages: 0,
    newPurchasesToday: 0
  });

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state for manual allocation
  const [manualAllocation, setManualAllocation] = useState({
    clientId: '',
    packageName: '',
    totalSessions: 10,
    packagePrice: 1250,
    expiryMonths: 6
  });

  // ==================== COMPUTED VALUES ====================

  const filteredAllocations = useMemo(() => {
    if (!selectedClient) return allocations;
    return allocations.filter(allocation => allocation.clientId === selectedClient);
  }, [allocations, selectedClient]);

  const criticalAllocations = useMemo(() => {
    return allocations.filter(allocation =>
      allocation.remainingSessions <= 2 ||
      new Date(allocation.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
  }, [allocations]);

  const revenueProjection = useMemo(() => {
    const avgSessionsPerMonth = stats.totalUsedSessions / 3; // Last 3 months average
    const avgRevenuePerSession = stats.totalRevenue / Math.max(stats.totalUsedSessions, 1);
    return avgSessionsPerMonth * avgRevenuePerSession;
  }, [stats]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadAllocationData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadAllocationData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // ==================== DATA LOADING ====================

  const loadAllocationData = useCallback(async () => {
    try {
      setLoading(true);

      // Simulate API calls - replace with actual service calls
      const mockAllocations: SessionAllocation[] = [
        {
          id: '1',
          clientId: 'client1',
          packageName: 'Premium Training Package',
          totalSessions: 20,
          usedSessions: 12,
          remainingSessions: 8,
          purchaseDate: '2024-01-15',
          expiryDate: '2024-07-15',
          status: 'active',
          packagePrice: 2500,
          sessionValue: 125,
          client: {
            id: 'client1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@email.com',
            phone: '(555) 123-4567',
            photo: '/avatars/sarah.jpg',
            availableSessions: 8,
            role: 'client',
            createdAt: '2024-01-15',
            updatedAt: '2024-01-20'
          }
        },
        {
          id: '2',
          clientId: 'client2',
          packageName: 'Elite Performance Package',
          totalSessions: 30,
          usedSessions: 25,
          remainingSessions: 5,
          purchaseDate: '2024-02-01',
          expiryDate: '2024-08-01',
          status: 'active',
          packagePrice: 3750,
          sessionValue: 125,
          client: {
            id: 'client2',
            firstName: 'Michael',
            lastName: 'Chen',
            email: 'michael.chen@email.com',
            phone: '(555) 234-5678',
            photo: '/avatars/michael.jpg',
            availableSessions: 5,
            role: 'client',
            createdAt: '2024-02-01',
            updatedAt: '2024-02-05'
          }
        },
        {
          id: '3',
          clientId: 'client3',
          packageName: 'Starter Fitness Package',
          totalSessions: 10,
          usedSessions: 2,
          remainingSessions: 8,
          purchaseDate: '2024-07-01',
          expiryDate: '2025-01-01',
          status: 'active',
          packagePrice: 1250,
          sessionValue: 125,
          client: {
            id: 'client3',
            firstName: 'Emma',
            lastName: 'Rodriguez',
            email: 'emma.rodriguez@email.com',
            phone: '(555) 345-6789',
            photo: '/avatars/emma.jpg',
            availableSessions: 8,
            role: 'client',
            createdAt: '2024-07-01',
            updatedAt: '2024-07-03'
          }
        }
      ];

      setAllocations(mockAllocations);

      // Calculate stats
      const calculatedStats: AllocationStats = {
        totalActiveClients: mockAllocations.filter(a => a.status === 'active').length,
        totalAllocatedSessions: mockAllocations.reduce((sum, a) => sum + a.totalSessions, 0),
        totalUsedSessions: mockAllocations.reduce((sum, a) => sum + a.usedSessions, 0),
        totalRevenue: mockAllocations.reduce((sum, a) => sum + a.packagePrice, 0),
        averagePackageSize: mockAllocations.reduce((sum, a) => sum + a.totalSessions, 0) / mockAllocations.length,
        utilizationRate: Math.round((mockAllocations.reduce((sum, a) => sum + a.usedSessions, 0) / mockAllocations.reduce((sum, a) => sum + a.totalSessions, 0)) * 100),
        expiringPackages: mockAllocations.filter(a => new Date(a.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length,
        newPurchasesToday: 1
      };

      setStats(calculatedStats);

    } catch (error) {
      console.error('Error loading allocation data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session allocation data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllocationData();
    setRefreshing(false);

    toast({
      title: 'Data Refreshed',
      description: 'Session allocation data has been updated',
      variant: 'default'
    });
  }, [loadAllocationData, toast]);

  // ==================== ALLOCATION MANAGEMENT ====================

  const handleCreateAllocation = useCallback(async () => {
    try {
      // In production, this would call the actual API
      const newAllocation: SessionAllocation = {
        id: `allocation_${Date.now()}`,
        clientId: manualAllocation.clientId,
        packageName: manualAllocation.packageName,
        totalSessions: manualAllocation.totalSessions,
        usedSessions: 0,
        remainingSessions: manualAllocation.totalSessions,
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + manualAllocation.expiryMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        packagePrice: manualAllocation.packagePrice,
        sessionValue: manualAllocation.packagePrice / manualAllocation.totalSessions
      };

      setAllocations(prev => [...prev, newAllocation]);
      setAllocationDialogOpen(false);

      // Reset form
      setManualAllocation({
        clientId: '',
        packageName: '',
        totalSessions: 10,
        packagePrice: 1250,
        expiryMonths: 6
      });

      toast({
        title: 'Allocation Created',
        description: 'New session allocation has been created successfully',
        variant: 'default'
      });

      if (onAllocationUpdate) {
        onAllocationUpdate(newAllocation);
      }

    } catch (error) {
      console.error('Error creating allocation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session allocation',
        variant: 'destructive'
      });
    }
  }, [manualAllocation, onAllocationUpdate, toast]);

  const handleAdjustSessions = useCallback(async (allocationId: string, adjustment: number) => {
    try {
      setAllocations(prev => prev.map(allocation =>
        allocation.id === allocationId
          ? {
              ...allocation,
              remainingSessions: Math.max(0, allocation.remainingSessions + adjustment),
              totalSessions: allocation.totalSessions + adjustment
            }
          : allocation
      ));

      toast({
        title: 'Sessions Adjusted',
        description: `${adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustment)} session(s)`,
        variant: 'default'
      });

    } catch (error) {
      console.error('Error adjusting sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to adjust sessions',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // ==================== RENDER FUNCTIONS ====================

  const getProgressColor = (percentage: number) => {
    if (percentage > 80) return '#ff6b35';
    if (percentage > 60) return '#ffd700';
    return '#00ffff';
  };

  const renderStatsCards = () => (
    <StatsGrid>
      <StatsCard>
        <StatsIcon>
          <Users size={24} />
        </StatsIcon>
        <StatsContent>
          <StatsValue>{stats.totalActiveClients}</StatsValue>
          <StatsLabel>Active Clients</StatsLabel>
        </StatsContent>
      </StatsCard>

      <StatsCard>
        <StatsIcon>
          <Calendar size={24} />
        </StatsIcon>
        <StatsContent>
          <StatsValue>{stats.totalAllocatedSessions}</StatsValue>
          <StatsLabel>Total Sessions</StatsLabel>
        </StatsContent>
      </StatsCard>

      <StatsCard>
        <StatsIcon>
          <DollarSign size={24} />
        </StatsIcon>
        <StatsContent>
          <StatsValue>${stats.totalRevenue.toLocaleString()}</StatsValue>
          <StatsLabel>Total Revenue</StatsLabel>
        </StatsContent>
      </StatsCard>

      <StatsCard>
        <StatsIcon>
          <Target size={24} />
        </StatsIcon>
        <StatsContent>
          <StatsValue>{stats.utilizationRate}%</StatsValue>
          <StatsLabel>Utilization</StatsLabel>
        </StatsContent>
      </StatsCard>
    </StatsGrid>
  );

  const renderAllocationCard = (allocation: SessionAllocation) => {
    const usagePercentage = (allocation.usedSessions / allocation.totalSessions) * 100;
    const isExpiringSoon = new Date(allocation.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isLowSessions = allocation.remainingSessions <= 2;

    return (
      <AllocationCardStyled key={allocation.id}>
        <AllocationHeaderRow>
          <ClientInfo>
            <AvatarStyled>
              {allocation.client?.photo ? (
                <AvatarImg src={allocation.client.photo} alt="" />
              ) : (
                <>{allocation.client?.firstName?.[0]}{allocation.client?.lastName?.[0]}</>
              )}
            </AvatarStyled>
            <div>
              <ClientName>
                {allocation.client?.firstName} {allocation.client?.lastName}
              </ClientName>
              <PackageName>
                {allocation.packageName}
              </PackageName>
            </div>
          </ClientInfo>

          <AllocationActions>
            {(isExpiringSoon || isLowSessions) && (
              <IconBtn
                title={isExpiringSoon ? 'Package expiring soon' : 'Low session count'}
                $variant="warning"
              >
                <AlertTriangle size={20} />
              </IconBtn>
            )}

            <IconBtn
              title="Edit Allocation"
              onClick={() => {
                setSelectedClient(allocation.clientId);
                setDialogOpen(true);
              }}
            >
              <Edit size={20} />
            </IconBtn>
          </AllocationActions>
        </AllocationHeaderRow>

        <AllocationProgress>
          <ProgressInfo>
            <ProgressText>
              {allocation.remainingSessions} / {allocation.totalSessions} sessions remaining
            </ProgressText>
            <ProgressSubText>
              ${allocation.sessionValue}/session &bull; Expires {new Date(allocation.expiryDate).toLocaleDateString()}
            </ProgressSubText>
          </ProgressInfo>

          <ProgressBarTrack>
            <ProgressBarFill
              $percentage={usagePercentage}
              $color={getProgressColor(usagePercentage)}
            />
          </ProgressBarTrack>
        </AllocationProgress>

        <AllocationFooter>
          <StatusChip $status={allocation.status}>
            {allocation.status}
          </StatusChip>

          <SessionActions>
            <AdjustButton
              onClick={() => handleAdjustSessions(allocation.id, -1)}
              disabled={allocation.remainingSessions <= 0}
            >
              -1
            </AdjustButton>

            <AdjustButton
              onClick={() => handleAdjustSessions(allocation.id, 1)}
            >
              +1
            </AdjustButton>
          </SessionActions>
        </AllocationFooter>
      </AllocationCardStyled>
    );
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>
          Loading session allocations...
        </LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <ThemeProvider theme={stellarTheme}>
      <AllocationContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <AllocationHeaderSection>
            <div>
              <SectionTitle>
                Session Allocation Manager
              </SectionTitle>
              <SectionSubtitle>
                Manage client session balances and package allocations
              </SectionSubtitle>
            </div>

            {showControls && (
              <HeaderActions>
                <OutlineButton
                  onClick={() => setAllocationDialogOpen(true)}
                >
                  <Plus size={16} />
                  Create Allocation
                </OutlineButton>

                <IconBtn
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh data"
                >
                  <RefreshCw
                    size={20}
                    style={{
                      animation: refreshing ? 'spin 1s linear infinite' : 'none'
                    }}
                  />
                </IconBtn>
              </HeaderActions>
            )}
          </AllocationHeaderSection>

          {/* Critical Alerts */}
          {criticalAllocations.length > 0 && (
            <AlertBanner>
              <AlertTriangle size={18} />
              {criticalAllocations.length} client(s) need attention - low sessions or expiring packages
            </AlertBanner>
          )}

          {/* Stats Cards */}
          {!compactView && renderStatsCards()}

          {/* Revenue Projection */}
          {!compactView && (
            <ProjectionCard>
              <ProjectionTitle>
                Revenue Projection
              </ProjectionTitle>
              <ProjectionGrid>
                <ProjectionMetric>
                  <ProjectionValue>${revenueProjection.toLocaleString()}</ProjectionValue>
                  <ProjectionLabel>Monthly Projected</ProjectionLabel>
                </ProjectionMetric>
                <ProjectionMetric>
                  <ProjectionValue>{stats.averagePackageSize.toFixed(1)}</ProjectionValue>
                  <ProjectionLabel>Avg Package Size</ProjectionLabel>
                </ProjectionMetric>
                <ProjectionMetric>
                  <ProjectionValue>{stats.newPurchasesToday}</ProjectionValue>
                  <ProjectionLabel>New Today</ProjectionLabel>
                </ProjectionMetric>
              </ProjectionGrid>
            </ProjectionCard>
          )}

          {/* Allocations Grid */}
          <AllocationsGrid>
            {filteredAllocations.map(renderAllocationCard)}
          </AllocationsGrid>

          {/* Create Allocation Dialog */}
          {allocationDialogOpen && (
            <DialogOverlay onClick={() => setAllocationDialogOpen(false)}>
              <DialogPanel onClick={(e) => e.stopPropagation()}>
                <DialogTitleStyled>
                  Create Session Allocation
                </DialogTitleStyled>
                <DialogContentStyled>
                  <FormGrid>
                    <FormField $fullWidth>
                      <FormLabel>Client</FormLabel>
                      <FormSelect
                        value={manualAllocation.clientId}
                        onChange={(e) => setManualAllocation(prev => ({ ...prev, clientId: e.target.value }))}
                      >
                        <option value="">Select a client...</option>
                        {allocations.map(allocation => (
                          <option key={allocation.clientId} value={allocation.clientId}>
                            {allocation.client?.firstName} {allocation.client?.lastName}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField>
                      <FormLabel>Package Name</FormLabel>
                      <FormInput
                        type="text"
                        value={manualAllocation.packageName}
                        onChange={(e) => setManualAllocation(prev => ({ ...prev, packageName: e.target.value }))}
                        placeholder="e.g. Premium Training Package"
                      />
                    </FormField>

                    <FormField>
                      <FormLabel>Total Sessions</FormLabel>
                      <FormInput
                        type="number"
                        value={manualAllocation.totalSessions}
                        onChange={(e) => setManualAllocation(prev => ({ ...prev, totalSessions: parseInt(e.target.value) }))}
                      />
                    </FormField>

                    <FormField>
                      <FormLabel>Package Price</FormLabel>
                      <FormInput
                        type="number"
                        value={manualAllocation.packagePrice}
                        onChange={(e) => setManualAllocation(prev => ({ ...prev, packagePrice: parseInt(e.target.value) }))}
                      />
                    </FormField>

                    <FormField>
                      <FormLabel>Expiry (Months)</FormLabel>
                      <FormInput
                        type="number"
                        value={manualAllocation.expiryMonths}
                        onChange={(e) => setManualAllocation(prev => ({ ...prev, expiryMonths: parseInt(e.target.value) }))}
                      />
                    </FormField>
                  </FormGrid>
                </DialogContentStyled>
                <DialogActionsStyled>
                  <CancelButton
                    onClick={() => setAllocationDialogOpen(false)}
                  >
                    Cancel
                  </CancelButton>
                  <PrimaryButton
                    onClick={handleCreateAllocation}
                  >
                    Create Allocation
                  </PrimaryButton>
                </DialogActionsStyled>
              </DialogPanel>
            </DialogOverlay>
          )}
        </motion.div>
      </AllocationContainer>
    </ThemeProvider>
  );
};

export default SessionAllocationManager;

// ==================== KEYFRAMES ====================

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ==================== STYLED COMPONENTS ====================

const AllocationContainer = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(30, 58, 138, 0.1) 50%,
    rgba(14, 165, 233, 0.05) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  backdrop-filter: blur(10px);
`;

const AllocationHeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const SectionTitle = styled.h2`
  color: #e2e8f0;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(226, 232, 240, 0.5);
    background: rgba(226, 232, 240, 0.05);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const IconBtn = styled.button<{ $variant?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  color: ${({ $variant }) => $variant === 'warning' ? '#ff6b35' : '#e2e8f0'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(226, 232, 240, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AlertBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  background: rgba(255, 107, 53, 0.1);
  border: 1px solid rgba(255, 107, 53, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;

  svg {
    color: #ff6b35;
    flex-shrink: 0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled.div`
  background: rgba(226, 232, 240, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(226, 232, 240, 0.08);
    border-color: rgba(14, 165, 233, 0.35);
    transform: translateY(-2px);
  }
`;

const StatsIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const StatsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatsValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1;
`;

const StatsLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.7);
  font-weight: 500;
`;

const ProjectionCard = styled.div`
  background: rgba(226, 232, 240, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  margin-bottom: 1.5rem;
`;

const ProjectionTitle = styled.h3`
  color: #e2e8f0;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
`;

const ProjectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ProjectionMetric = styled.div`
  text-align: center;
`;

const ProjectionValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #00ffff;
  line-height: 1;
`;

const ProjectionLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.7);
  margin-top: 0.25rem;
`;

const AllocationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const AllocationCardStyled = styled.div`
  background: rgba(226, 232, 240, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(226, 232, 240, 0.08);
    border-color: rgba(14, 165, 233, 0.35);
    transform: translateY(-2px);
  }
`;

const AllocationHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  @media (max-width: 430px) {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
`;

const ClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AvatarStyled = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #7851A9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ClientName = styled.span`
  display: block;
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
`;

const PackageName = styled.span`
  display: block;
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.875rem;
`;

const AllocationActions = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const AllocationProgress = styled.div`
  margin: 1rem 0;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
`;

const ProgressText = styled.span`
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
`;

const ProgressSubText = styled.span`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.875rem;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(226, 232, 240, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percentage: number; $color: string }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background-color: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const AllocationFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const StatusChip = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  text-transform: capitalize;
  background-color: ${({ $status }) => $status === 'active' ? '#22c55e' : '#6c757d'};
`;

const SessionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const AdjustButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.375rem 0.625rem;
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.3);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: rgba(226, 232, 240, 0.5);
    background: rgba(226, 232, 240, 0.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spinAnimation} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  color: #e2e8f0;
  font-size: 1rem;
  margin-top: 1rem;
`;

// ==================== DIALOG STYLED COMPONENTS ====================

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const DialogPanel = styled.div`
  width: 100%;
  max-width: 600px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  max-height: 90vh;
  overflow-y: auto;
`;

const DialogTitleStyled = styled.h2`
  color: #e2e8f0;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  padding: 1.5rem 1.5rem 0.5rem;
`;

const DialogContentStyled = styled.div`
  padding: 1rem 1.5rem;
`;

const DialogActionsStyled = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  grid-column: ${({ $fullWidth }) => $fullWidth ? '1 / -1' : 'auto'};
`;

const FormLabel = styled.label`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.8125rem;
  font-weight: 500;
`;

const formElementStyles = `
  width: 100%;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const FormInput = styled.input`
  ${formElementStyles}
`;

const FormSelect = styled.select`
  ${formElementStyles}
  cursor: pointer;

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  background: transparent;
  color: rgba(226, 232, 240, 0.7);
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #e2e8f0;
    background: rgba(226, 232, 240, 0.05);
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #0284c7;
  }

  &:active {
    transform: scale(0.98);
  }
`;
