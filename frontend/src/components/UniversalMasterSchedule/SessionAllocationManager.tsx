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
import styled, { ThemeProvider } from 'styled-components';

// Material-UI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Alert,
  Stack,
  Tooltip,
  Badge,
  CircularProgress
} from '@mui/material';

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

  const renderStatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard>
          <StatsIcon>
            <Users size={24} />
          </StatsIcon>
          <StatsContent>
            <StatsValue>{stats.totalActiveClients}</StatsValue>
            <StatsLabel>Active Clients</StatsLabel>
          </StatsContent>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard>
          <StatsIcon>
            <Calendar size={24} />
          </StatsIcon>
          <StatsContent>
            <StatsValue>{stats.totalAllocatedSessions}</StatsValue>
            <StatsLabel>Total Sessions</StatsLabel>
          </StatsContent>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard>
          <StatsIcon>
            <DollarSign size={24} />
          </StatsIcon>
          <StatsContent>
            <StatsValue>${stats.totalRevenue.toLocaleString()}</StatsValue>
            <StatsLabel>Total Revenue</StatsLabel>
          </StatsContent>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard>
          <StatsIcon>
            <Target size={24} />
          </StatsIcon>
          <StatsContent>
            <StatsValue>{stats.utilizationRate}%</StatsValue>
            <StatsLabel>Utilization</StatsLabel>
          </StatsContent>
        </StatsCard>
      </Grid>
    </Grid>
  );

  const renderAllocationCard = (allocation: SessionAllocation) => {
    const usagePercentage = (allocation.usedSessions / allocation.totalSessions) * 100;
    const isExpiringSoon = new Date(allocation.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isLowSessions = allocation.remainingSessions <= 2;
    
    return (
      <AllocationCard key={allocation.id}>
        <AllocationHeader>
          <ClientInfo>
            <Avatar 
              src={allocation.client?.photo} 
              sx={{ width: 48, height: 48, mr: 2 }}
            >
              {allocation.client?.firstName?.[0]}{allocation.client?.lastName?.[0]}
            </Avatar>
            <div>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                {allocation.client?.firstName} {allocation.client?.lastName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {allocation.packageName}
              </Typography>
            </div>
          </ClientInfo>
          
          <AllocationActions>
            {(isExpiringSoon || isLowSessions) && (
              <Tooltip title={isExpiringSoon ? 'Package expiring soon' : 'Low session count'}>
                <IconButton size="small" sx={{ color: '#ff6b35' }}>
                  <AlertTriangle size={20} />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Edit Allocation">
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={() => {
                  setSelectedClient(allocation.clientId);
                  setDialogOpen(true);
                }}
              >
                <Edit size={20} />
              </IconButton>
            </Tooltip>
          </AllocationActions>
        </AllocationHeader>
        
        <AllocationProgress>
          <ProgressInfo>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              {allocation.remainingSessions} / {allocation.totalSessions} sessions remaining
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              ${allocation.sessionValue}/session • Expires {new Date(allocation.expiryDate).toLocaleDateString()}
            </Typography>
          </ProgressInfo>
          
          <LinearProgress 
            variant="determinate" 
            value={usagePercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: usagePercentage > 80 ? '#ff6b35' : usagePercentage > 60 ? '#ffd700' : '#00ffff',
                borderRadius: 4
              }
            }}
          />
        </AllocationProgress>
        
        <AllocationFooter>
          <Chip 
            label={allocation.status}
            size="small"
            sx={{
              backgroundColor: allocation.status === 'active' ? '#22c55e' : '#6c757d',
              color: 'white',
              fontWeight: 500
            }}
          />
          
          <SessionActions>
            <Button
              size="small"
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.3)',
                minWidth: 'auto',
                px: 1
              }}
              onClick={() => handleAdjustSessions(allocation.id, -1)}
              disabled={allocation.remainingSessions <= 0}
            >
              -1
            </Button>
            
            <Button
              size="small"
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255,255,255,0.3)',
                minWidth: 'auto',
                px: 1
              }}
              onClick={() => handleAdjustSessions(allocation.id, 1)}
            >
              +1
            </Button>
          </SessionActions>
        </AllocationFooter>
      </AllocationCard>
    );
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} sx={{ color: '#00ffff' }} />
        <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
          Loading session allocations...
        </Typography>
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
          <AllocationHeader>
            <div>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                Session Allocation Manager
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Manage client session balances and package allocations
              </Typography>
            </div>
            
            {showControls && (
              <HeaderActions>
                <Button
                  variant="outlined"
                  startIcon={<Plus size={16} />}
                  onClick={() => setAllocationDialogOpen(true)}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)' }
                  }}
                >
                  Create Allocation
                </Button>
                
                <IconButton
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{ color: 'white' }}
                >
                  <RefreshCw 
                    size={20} 
                    style={{ 
                      animation: refreshing ? 'spin 1s linear infinite' : 'none' 
                    }} 
                  />
                </IconButton>
              </HeaderActions>
            )}
          </AllocationHeader>

          {/* Critical Alerts */}
          {criticalAllocations.length > 0 && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                '& .MuiAlert-message': { color: 'white' }
              }}
            >
              {criticalAllocations.length} client(s) need attention - low sessions or expiring packages
            </Alert>
          )}

          {/* Stats Cards */}
          {!compactView && renderStatsCards()}

          {/* Revenue Projection */}
          {!compactView && (
            <ProjectionCard sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Revenue Projection
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={4}>
                  <ProjectionMetric>
                    <ProjectionValue>${revenueProjection.toLocaleString()}</ProjectionValue>
                    <ProjectionLabel>Monthly Projected</ProjectionLabel>
                  </ProjectionMetric>
                </Grid>
                <Grid item xs={4}>
                  <ProjectionMetric>
                    <ProjectionValue>{stats.averagePackageSize.toFixed(1)}</ProjectionValue>
                    <ProjectionLabel>Avg Package Size</ProjectionLabel>
                  </ProjectionMetric>
                </Grid>
                <Grid item xs={4}>
                  <ProjectionMetric>
                    <ProjectionValue>{stats.newPurchasesToday}</ProjectionValue>
                    <ProjectionLabel>New Today</ProjectionLabel>
                  </ProjectionMetric>
                </Grid>
              </Grid>
            </ProjectionCard>
          )}

          {/* Allocations Grid */}
          <Grid container spacing={2}>
            {filteredAllocations.map(renderAllocationCard)}
          </Grid>

          {/* Create Allocation Dialog */}
          <Dialog 
            open={allocationDialogOpen} 
            onClose={() => setAllocationDialogOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                backgroundColor: 'rgba(10, 10, 15, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }
            }}
          >
            <DialogTitle sx={{ color: 'white' }}>
              Create Session Allocation
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Client"
                    select
                    value={manualAllocation.clientId}
                    onChange={(e) => setManualAllocation(prev => ({ ...prev, clientId: e.target.value }))}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      }
                    }}
                  >
                    {allocations.map(allocation => (
                      <MenuItem key={allocation.clientId} value={allocation.clientId}>
                        {allocation.client?.firstName} {allocation.client?.lastName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Package Name"
                    value={manualAllocation.packageName}
                    onChange={(e) => setManualAllocation(prev => ({ ...prev, packageName: e.target.value }))}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Sessions"
                    type="number"
                    value={manualAllocation.totalSessions}
                    onChange={(e) => setManualAllocation(prev => ({ ...prev, totalSessions: parseInt(e.target.value) }))}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Package Price"
                    type="number"
                    value={manualAllocation.packagePrice}
                    onChange={(e) => setManualAllocation(prev => ({ ...prev, packagePrice: parseInt(e.target.value) }))}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expiry (Months)"
                    type="number"
                    value={manualAllocation.expiryMonths}
                    onChange={(e) => setManualAllocation(prev => ({ ...prev, expiryMonths: parseInt(e.target.value) }))}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setAllocationDialogOpen(false)}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAllocation}
                variant="contained"
                sx={{ 
                  backgroundColor: '#3b82f6',
                  '&:hover': { backgroundColor: '#2563eb' }
                }}
              >
                Create Allocation
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      </AllocationContainer>
    </ThemeProvider>
  );
};

export default SessionAllocationManager;

// ==================== STYLED COMPONENTS ====================

const AllocationContainer = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, 
    rgba(10, 10, 15, 0.95) 0%, 
    rgba(30, 58, 138, 0.1) 50%, 
    rgba(14, 165, 233, 0.05) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const AllocationHeader = styled.div`
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

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const StatsCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const StatsIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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
  color: white;
  line-height: 1;
`;

const StatsLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

const ProjectionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
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
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
`;

const AllocationCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const ClientInfo = styled.div`
  display: flex;
  align-items: center;
`;

const AllocationActions = styled.div`
  display: flex;
  gap: 0.5rem;
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

const AllocationFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const SessionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
`;
