/**
 * Client Management Dashboard - Business-Critical Admin Interface
 * ============================================================
 * 
 * Complete client management system for gym owners/administrators
 * Enables comprehensive client data collection, tracking, and management
 * 
 * BUSINESS FUNCTIONS:
 * - New client onboarding and data collection
 * - Existing client management and updates
 * - Trainer assignment and scheduling
 * - Progress tracking and analytics
 * - Financial management (sessions, payments)
 * - Communication and notes system
 * 
 * MOBILE-FIRST DESIGN:
 * - Touch-optimized interface for tablets
 * - Responsive design for all screen sizes
 * - Quick actions and bulk operations
 * - Search and filtering capabilities
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Material-UI Components
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Alert,
  AlertTitle,
  LinearProgress,
  Divider,
  Stack
} from '@mui/material';

// Icons
import {
  PersonAdd,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Assessment,
  Schedule,
  Payment,
  Message,
  Phone,
  Email,
  FitnessCenter,
  TrendingUp,
  Warning,
  CheckCircle,
  AccessTime,
  AttachMoney,
  Group,
  Settings,
  Download,
  Upload,
  Refresh,
  Close,
  Add,
  Remove
} from '@mui/icons-material';

// PWA Integration
import { useTouchGesture } from '../../PWA/TouchGestureProvider';

// Services
import { clientManagementService } from '../../../services/clientManagementService';
import { adminClientService } from '../../../services/adminClientService';

// Components
import ClientOnboardingWizard from './components/ClientOnboardingWizard';
import ClientDetailsPanel from './components/ClientDetailsPanel';
import ClientQuickActions from './components/ClientQuickActions';
import ClientBulkActions from './components/ClientBulkActions';
import ClientAnalyticsOverview from './components/ClientAnalyticsOverview';

// Types
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  fitnessGoal?: string;
  availableSessions: number;
  isActive: boolean;
  createdAt: string;
  lastActivity?: string;
  assignedTrainer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  progress?: {
    totalWorkouts: number;
    currentStreak: number;
    achievementLevel: string;
  };
  financial?: {
    totalSpent: number;
    outstandingBalance: number;
    nextPaymentDue?: string;
  };
}

interface FilterOptions {
  search: string;
  status: 'all' | 'active' | 'inactive';
  trainer: string;
  fitnessGoal: string;
  sessionStatus: 'all' | 'has_sessions' | 'no_sessions';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Styled Components
const DashboardContainer = styled(motion.div)`
  padding: 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
  color: white;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const ClientGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  
  @media (min-width: 1200px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const StatsCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled(Card)`
  background: rgba(59, 130, 246, 0.1) !important;
  border: 1px solid rgba(59, 130, 246, 0.2) !important;
  color: white !important;
`;

/**
 * Client Management Dashboard Component
 */
const ClientManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { hapticFeedback, isTouch } = useTouchGesture();
  
  // State Management
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter State
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    trainer: '',
    fitnessGoal: '',
    sessionStatus: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Statistics State
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    newThisMonth: 0,
    totalRevenue: 0,
    sessionsBooked: 0,
    averageSessionsPerClient: 0
  });
  
  // ==================== DATA FETCHING ====================
  
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminClientService.getClients({
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      });
      
      setClients(response.clients);
      setStats(response.stats);
      
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err.message || 'Failed to load clients');
      toast({
        title: 'Error',
        description: 'Failed to load client data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, toast]);
  
  const fetchClientDetails = useCallback(async (id: number) => {
    try {
      const client = await adminClientService.getClientDetails(id);
      setSelectedClient(client);
      setShowClientDetails(true);
    } catch (err: any) {
      console.error('Error fetching client details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load client details',
        variant: 'destructive'
      });
    }
  }, [toast]);
  
  // ==================== EVENT HANDLERS ====================
  
  const handleCreateClient = () => {
    setShowOnboarding(true);
    if (hapticFeedback) hapticFeedback('light');
  };
  
  const handleClientSelect = (clientId: number) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
    } else {
      setSelectedClients(prev => [...prev, clientId]);
    }
    if (hapticFeedback) hapticFeedback('light');
  };
  
  const handleViewClient = (client: Client) => {
    fetchClientDetails(client.id);
    if (hapticFeedback) hapticFeedback('medium');
  };
  
  const handleFilterChange = (filterKey: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPage(0); // Reset to first page when filtering
  };
  
  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleClientCreated = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    setStats(prev => ({ ...prev, totalClients: prev.totalClients + 1 }));
    setShowOnboarding(false);
    toast({
      title: 'Success',
      description: `Client ${newClient.firstName} ${newClient.lastName} created successfully`,
      variant: 'default'
    });
  };
  
  // ==================== EFFECTS ====================
  
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);
  
  // Handle direct client navigation
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === parseInt(clientId));
      if (client) {
        setSelectedClient(client);
        setShowClientDetails(true);
      }
    }
  }, [clientId, clients]);
  
  // ==================== COMPUTED VALUES ====================
  
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        if (!fullName.includes(searchLower) && 
            !client.email.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (filters.status !== 'all') {
        if (filters.status === 'active' && !client.isActive) return false;
        if (filters.status === 'inactive' && client.isActive) return false;
      }
      
      if (filters.sessionStatus !== 'all') {
        if (filters.sessionStatus === 'has_sessions' && client.availableSessions === 0) return false;
        if (filters.sessionStatus === 'no_sessions' && client.availableSessions > 0) return false;
      }
      
      return true;
    });
  }, [clients, filters]);
  
  // ==================== RENDER ====================
  
  if (!user || user.role !== 'admin') {
    return (
      <DashboardContainer>
        <Alert severity=\"error\">
          <AlertTitle>Access Denied</AlertTitle>\n          You don't have permission to access this page.\n        </Alert>\n      </DashboardContainer>\n    );\n  }\n\n  return (\n    <DashboardContainer\n      initial={{ opacity: 0, y: 20 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.5 }}\n    >\n      {/* Dashboard Header */}\n      <DashboardHeader>\n        <HeaderTitle>\n          <Group sx={{ fontSize: 32, color: '#3b82f6' }} />\n          <Typography variant=\"h4\" component=\"h1\">\n            Client Management\n          </Typography>\n          <Badge badgeContent={stats.totalClients} color=\"primary\">\n            <Chip \n              label={`${stats.activeClients} Active`}\n              color=\"success\"\n              size=\"small\"\n            />\n          </Badge>\n        </HeaderTitle>\n        \n        <HeaderActions>\n          <Button\n            variant=\"outlined\"\n            startIcon={<Download />}\n            onClick={() => {/* Export functionality */}}\n            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}\n          >\n            Export\n          </Button>\n          \n          <Button\n            variant=\"outlined\"\n            startIcon={<Refresh />}\n            onClick={fetchClients}\n            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}\n          >\n            Refresh\n          </Button>\n          \n          <Button\n            variant=\"contained\"\n            startIcon={<PersonAdd />}\n            onClick={handleCreateClient}\n            sx={{ \n              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',\n              '&:hover': {\n                background: 'linear-gradient(135deg, #2563eb, #1e40af)'\n              }\n            }}\n          >\n            Add Client\n          </Button>\n        </HeaderActions>\n      </DashboardHeader>\n      \n      {/* Statistics Cards */}\n      <StatsCards>\n        <StatCard>\n          <CardContent>\n            <Typography variant=\"h6\" gutterBottom>\n              Total Clients\n            </Typography>\n            <Typography variant=\"h3\" color=\"#3b82f6\">\n              {stats.totalClients}\n            </Typography>\n            <Typography variant=\"body2\" color=\"rgba(255,255,255,0.7)\">\n              {stats.newThisMonth} new this month\n            </Typography>\n          </CardContent>\n        </StatCard>\n        \n        <StatCard>\n          <CardContent>\n            <Typography variant=\"h6\" gutterBottom>\n              Active Clients\n            </Typography>\n            <Typography variant=\"h3\" color=\"#10b981\">\n              {stats.activeClients}\n            </Typography>\n            <Typography variant=\"body2\" color=\"rgba(255,255,255,0.7)\">\n              {((stats.activeClients / stats.totalClients) * 100).toFixed(1)}% of total\n            </Typography>\n          </CardContent>\n        </StatCard>\n        \n        <StatCard>\n          <CardContent>\n            <Typography variant=\"h6\" gutterBottom>\n              Sessions Booked\n            </Typography>\n            <Typography variant=\"h3\" color=\"#f59e0b\">\n              {stats.sessionsBooked}\n            </Typography>\n            <Typography variant=\"body2\" color=\"rgba(255,255,255,0.7)\">\n              Avg {stats.averageSessionsPerClient.toFixed(1)} per client\n            </Typography>\n          </CardContent>\n        </StatCard>\n        \n        <StatCard>\n          <CardContent>\n            <Typography variant=\"h6\" gutterBottom>\n              Total Revenue\n            </Typography>\n            <Typography variant=\"h3\" color=\"#8b5cf6\">\n              ${stats.totalRevenue.toLocaleString()}\n            </Typography>\n            <Typography variant=\"body2\" color=\"rgba(255,255,255,0.7)\">\n              This month\n            </Typography>\n          </CardContent>\n        </StatCard>\n      </StatsCards>\n      \n      {/* Filter Bar */}\n      <FilterBar>\n        <TextField\n          placeholder=\"Search clients...\"\n          value={filters.search}\n          onChange={(e) => handleFilterChange('search', e.target.value)}\n          InputProps={{\n            startAdornment: (\n              <InputAdornment position=\"start\">\n                <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />\n              </InputAdornment>\n            ),\n            sx: {\n              color: 'white',\n              '& .MuiOutlinedInput-notchedOutline': {\n                borderColor: 'rgba(255,255,255,0.3)'\n              },\n              '&:hover .MuiOutlinedInput-notchedOutline': {\n                borderColor: 'rgba(255,255,255,0.5)'\n              },\n              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {\n                borderColor: '#3b82f6'\n              }\n            }\n          }}\n          sx={{ minWidth: 300 }}\n        />\n        \n        <FormControl size=\"small\" sx={{ minWidth: 120 }}>\n          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>\n          <Select\n            value={filters.status}\n            onChange={(e) => handleFilterChange('status', e.target.value)}\n            label=\"Status\"\n            sx={{\n              color: 'white',\n              '& .MuiOutlinedInput-notchedOutline': {\n                borderColor: 'rgba(255,255,255,0.3)'\n              }\n            }}\n          >\n            <MenuItem value=\"all\">All</MenuItem>\n            <MenuItem value=\"active\">Active</MenuItem>\n            <MenuItem value=\"inactive\">Inactive</MenuItem>\n          </Select>\n        </FormControl>\n        \n        <FormControl size=\"small\" sx={{ minWidth: 120 }}>\n          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Sessions</InputLabel>\n          <Select\n            value={filters.sessionStatus}\n            onChange={(e) => handleFilterChange('sessionStatus', e.target.value)}\n            label=\"Sessions\"\n            sx={{\n              color: 'white',\n              '& .MuiOutlinedInput-notchedOutline': {\n                borderColor: 'rgba(255,255,255,0.3)'\n              }\n            }}\n          >\n            <MenuItem value=\"all\">All</MenuItem>\n            <MenuItem value=\"has_sessions\">Has Sessions</MenuItem>\n            <MenuItem value=\"no_sessions\">No Sessions</MenuItem>\n          </Select>\n        </FormControl>\n        \n        {selectedClients.length > 0 && (\n          <Chip\n            label={`${selectedClients.length} selected`}\n            onDelete={() => setSelectedClients([])}\n            color=\"primary\"\n            deleteIcon={<Close />}\n          />\n        )}\n      </FilterBar>\n      \n      {/* Main Content Grid */}\n      <ClientGrid>\n        {/* Client List/Table */}\n        <Paper sx={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}>\n          {loading ? (\n            <Box p={3}>\n              <LinearProgress sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />\n              <Typography variant=\"body2\" sx={{ mt: 2, textAlign: 'center' }}>\n                Loading client data...\n              </Typography>\n            </Box>\n          ) : error ? (\n            <Box p={3}>\n              <Alert severity=\"error\">\n                <AlertTitle>Error Loading Clients</AlertTitle>\n                {error}\n              </Alert>\n              <Button \n                onClick={fetchClients} \n                startIcon={<Refresh />}\n                sx={{ mt: 2 }}\n              >\n                Retry\n              </Button>\n            </Box>\n          ) : (\n            <>\n              <TableContainer>\n                <Table>\n                  <TableHead>\n                    <TableRow>\n                      <TableCell padding=\"checkbox\">\n                        {/* Select All Checkbox */}\n                      </TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Client</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Contact</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Goal</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Sessions</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Trainer</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>\n                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>\n                    </TableRow>\n                  </TableHead>\n                  <TableBody>\n                    {filteredClients.map((client) => (\n                      <TableRow \n                        key={client.id}\n                        hover\n                        sx={{ \n                          '&:hover': { \n                            backgroundColor: 'rgba(59, 130, 246, 0.1)' \n                          },\n                          cursor: 'pointer'\n                        }}\n                        onClick={() => handleViewClient(client)}\n                      >\n                        <TableCell padding=\"checkbox\">\n                          {/* Checkbox for selection */}\n                        </TableCell>\n                        <TableCell>\n                          <Box display=\"flex\" alignItems=\"center\" gap={2}>\n                            <Avatar src={client.photo} sx={{ width: 40, height: 40 }}>\n                              {client.firstName[0]}\n                            </Avatar>\n                            <Box>\n                              <Typography variant=\"body1\" sx={{ color: 'white', fontWeight: 500 }}>\n                                {client.firstName} {client.lastName}\n                              </Typography>\n                              <Typography variant=\"body2\" sx={{ color: 'rgba(255,255,255,0.7)' }}>\n                                Member since {new Date(client.createdAt).getFullYear()}\n                              </Typography>\n                            </Box>\n                          </Box>\n                        </TableCell>\n                        <TableCell>\n                          <Typography variant=\"body2\" sx={{ color: 'white' }}>\n                            {client.email}\n                          </Typography>\n                          {client.phone && (\n                            <Typography variant=\"body2\" sx={{ color: 'rgba(255,255,255,0.7)' }}>\n                              {client.phone}\n                            </Typography>\n                          )}\n                        </TableCell>\n                        <TableCell>\n                          <Typography variant=\"body2\" sx={{ color: 'white' }}>\n                            {client.fitnessGoal || 'Not specified'}\n                          </Typography>\n                        </TableCell>\n                        <TableCell>\n                          <Chip\n                            label={client.availableSessions}\n                            color={client.availableSessions > 0 ? 'success' : 'error'}\n                            size=\"small\"\n                          />\n                        </TableCell>\n                        <TableCell>\n                          {client.assignedTrainer ? (\n                            <Typography variant=\"body2\" sx={{ color: 'white' }}>\n                              {client.assignedTrainer.firstName} {client.assignedTrainer.lastName}\n                            </Typography>\n                          ) : (\n                            <Chip label=\"Unassigned\" color=\"warning\" size=\"small\" />\n                          )}\n                        </TableCell>\n                        <TableCell>\n                          <Chip\n                            label={client.isActive ? 'Active' : 'Inactive'}\n                            color={client.isActive ? 'success' : 'error'}\n                            size=\"small\"\n                          />\n                        </TableCell>\n                        <TableCell>\n                          <IconButton\n                            size=\"small\"\n                            onClick={(e) => {\n                              e.stopPropagation();\n                              handleViewClient(client);\n                            }}\n                            sx={{ color: 'white' }}\n                          >\n                            <Visibility />\n                          </IconButton>\n                          <IconButton\n                            size=\"small\"\n                            onClick={(e) => {\n                              e.stopPropagation();\n                              // Edit functionality\n                            }}\n                            sx={{ color: 'white' }}\n                          >\n                            <Edit />\n                          </IconButton>\n                        </TableCell>\n                      </TableRow>\n                    ))}\n                  </TableBody>\n                </Table>\n              </TableContainer>\n              \n              <TablePagination\n                component=\"div\"\n                count={stats.totalClients}\n                page={page}\n                onPageChange={handlePageChange}\n                rowsPerPage={rowsPerPage}\n                onRowsPerPageChange={handleRowsPerPageChange}\n                sx={{ \n                  color: 'white',\n                  '& .MuiTablePagination-selectIcon': {\n                    color: 'white'\n                  }\n                }}\n              />\n            </>\n          )}\n        </Paper>\n        \n        {/* Quick Analytics Panel */}\n        <ClientAnalyticsOverview stats={stats} />\n      </ClientGrid>\n      \n      {/* Floating Action Button for Mobile */}\n      {isTouch && (\n        <Fab\n          color=\"primary\"\n          onClick={handleCreateClient}\n          sx={{\n            position: 'fixed',\n            bottom: 24,\n            right: 24,\n            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'\n          }}\n        >\n          <PersonAdd />\n        </Fab>\n      )}\n      \n      {/* Client Onboarding Dialog */}\n      <Dialog\n        open={showOnboarding}\n        onClose={() => setShowOnboarding(false)}\n        maxWidth=\"md\"\n        fullWidth\n        PaperProps={{\n          sx: {\n            background: 'rgba(0,0,0,0.9)',\n            backdropFilter: 'blur(20px)',\n            border: '1px solid rgba(255,255,255,0.1)',\n            borderRadius: '16px'\n          }\n        }}\n      >\n        <ClientOnboardingWizard\n          onComplete={handleClientCreated}\n          onCancel={() => setShowOnboarding(false)}\n        />\n      </Dialog>\n      \n      {/* Client Details Dialog */}\n      <Dialog\n        open={showClientDetails}\n        onClose={() => setShowClientDetails(false)}\n        maxWidth=\"lg\"\n        fullWidth\n        PaperProps={{\n          sx: {\n            background: 'rgba(0,0,0,0.9)',\n            backdropFilter: 'blur(20px)',\n            border: '1px solid rgba(255,255,255,0.1)',\n            borderRadius: '16px'\n          }\n        }}\n      >\n        {selectedClient && (\n          <ClientDetailsPanel\n            client={selectedClient}\n            onClose={() => setShowClientDetails(false)}\n            onUpdate={(updatedClient) => {\n              setClients(prev => prev.map(c => \n                c.id === updatedClient.id ? updatedClient : c\n              ));\n              setSelectedClient(updatedClient);\n            }}\n          />\n        )}\n      </Dialog>\n    </DashboardContainer>\n  );\n};\n\nexport default ClientManagementDashboard;