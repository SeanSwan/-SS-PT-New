/**
 * Admin Client Management View
 * Comprehensive client management interface for administrators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import {
  AdminClient,
  AdminClientFilters,
  CreateClientRequest,
  UpdateClientRequest,
  AdminClientServiceInterface,
  createAdminClientService
} from '../../../../services/adminClientService';
import CreateClientModal from './CreateClientModal';

// Import UI components
import {
  Box,
  Typography,
  Grid,
  Paper,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Menu,
  ListItemIcon,
  Alert,
  Skeleton
} from '@mui/material';

// Import icons
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Refresh,
  Download,
  Upload,
  Visibility,
  PersonAdd,
  Key,
  UserPlus,
  FilterList,
  ClearAll,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  TrendingUp,
  Timeline,
  Assessment,
  Settings,
  Sync,
  ExpandMore,
  Close,
  Save
} from '@mui/icons-material';

// Styled components for dark theme
import { styled } from '@mui/material/styles';

const DarkPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: '#1d1f2b',
  color: '#e0e0e0',
  '& .MuiTableCell-head': {
    backgroundColor: '#252742',
    color: '#e0e0e0',
    fontWeight: 600,
  },
  '& .MuiTableCell-body': {
    color: '#e0e0e0',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#a0a0a0',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#00ffff',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  '&.primary': {
    background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
    color: '#0a0a1a',
    '&:hover': {
      background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 255, 255, 0.3)',
    },
  },
  '&.secondary': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(0, 255, 255, 0.5)',
    },
  },
}));

const StatusChip = styled(Chip)(({ theme, status }: { theme: any; status: string }) => ({
  fontWeight: 600,
  '& .MuiChip-label': {
    textTransform: 'capitalize',
  },
  ...(status === 'active' && {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4caf50',
    border: '1px solid rgba(76, 175, 80, 0.5)',
  }),
  ...(status === 'inactive' && {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#f44336',
    border: '1px solid rgba(244, 67, 54, 0.5)',
  }),
  ...(status === 'pending' && {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    color: '#ff9800',
    border: '1px solid rgba(255, 152, 0, 0.5)',
  }),
}));

// Component interfaces
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Service initialization error</Typography>
        <Typography variant="body2">Please refresh the page and try again.</Typography>
      </Box>
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
  const [mcpStatus, setMcpStatus] = useState<any>(null);

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

  const handlePageChange = (event: unknown, newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: AdminClient) => {
    setAnchorEl(event.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  const handleViewDetails = async (client: AdminClient) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
    handleMenuClose();
  };

  const handleEdit = (client: AdminClient) => {
    setSelectedClient(client);
    setShowEditModal(true);
    handleMenuClose();
  };

  const handleDelete = async (client: AdminClient) => {
    if (window.confirm(`Are you sure you want to deactivate ${client.firstName} ${client.lastName}?`)) {
      try {
        const response = await adminClientService.deleteClient(client.id, true);
        if (response.success) {
          toast({
            title: "Success",
            description: "Client deactivated successfully",
            variant: "default"
          });
          fetchClients();
        } else {
          toast({
            title: "Error",
            description: "Failed to deactivate client",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to deactivate client",
          variant: "destructive"
        });
      }
    }
    handleMenuClose();
  };

  const handleResetPassword = async (client: AdminClient) => {
    const newPassword = prompt("Enter new password for client:");
    if (newPassword && newPassword.length >= 6) {
      try {
        const response = await adminClientService.resetClientPassword(client.id, { newPassword });
        if (response.success) {
          toast({
            title: "Success",
            description: "Password reset successfully",
            variant: "default"
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to reset password",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive"
        });
      }
    } else if (newPassword !== null) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
    }
    handleMenuClose();
  };

  const handleCreateClient = async (data: CreateClientRequest) => {
    try {
      const response = await adminClientService.createClient(data);
      if (response.success) {
        toast({
          title: "Success",
          description: "Client created successfully",
          variant: "default"
        });
        setShowCreateModal(false);
        fetchClients();
      } else {
        throw new Error(response.message || "Failed to create client");
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw error; // Re-throw to let modal handle it
    }
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

  // Render methods
  const renderClientTable = () => (
    <DarkPaper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sessions</TableCell>
              <TableCell>Last Activity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box>
                        <Skeleton variant="text" width={120} />
                        <Skeleton variant="text" width={80} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={150} />
                    <Skeleton variant="text" width={100} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rounded" width={70} height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={60} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={100} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="circular" width={40} height={40} />
                  </TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <PersonAdd sx={{ fontSize: 64, color: '#666', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No clients found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first client'}
                    </Typography>
                    <StyledButton 
                      className="primary"
                      startIcon={<Add />}
                      onClick={() => setShowCreateModal(true)}
                    >
                      Add Client
                    </StyledButton>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#00ffff', color: '#0a0a1a' }}>
                        {getInitials(client.firstName, client.lastName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {client.firstName} {client.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{client.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{client.email}</Typography>
                    {client.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {client.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      status={client.isActive ? 'active' : 'inactive'}
                      label={client.isActive ? 'Active' : 'Inactive'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {client.availableSessions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        available
                      </Typography>
                    </Box>
                    {client.totalWorkouts !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        {client.totalWorkouts} completed
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.lastWorkout ? (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(client.lastWorkout.completedAt).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No workouts yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, client)}
                      sx={{ color: '#e0e0e0' }}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={currentPage}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        sx={{ 
          color: '#e0e0e0',
          '& .MuiTablePagination-selectIcon': { color: '#e0e0e0' },
          '& .MuiTablePagination-select': { color: '#e0e0e0' },
          '& .MuiIconButton-root': { color: '#e0e0e0' },
        }}
      />
    </DarkPaper>
  );

  const renderMCPStatus = () => (
    <Card sx={{ mb: 3, bgcolor: '#1d1f2b', color: '#e0e0e0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            MCP Server Status
          </Typography>
          <Tooltip title="Refresh Status">
            <IconButton onClick={fetchMCPStatus} sx={{ color: '#00ffff' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
        
        {mcpStatus ? (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#4caf50' }}>
                      {mcpStatus?.summary?.online || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Online
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#f44336' }}>
                      {mcpStatus?.summary?.offline || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Offline
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#ff9800' }}>
                      {mcpStatus?.summary?.error || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Error
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(mcpStatus?.servers || []).map((server: any) => (
                <Chip
                  key={server.name}
                  label={server.name}
                  color={
                    server.status === 'online' ? 'success' :
                    server.status === 'offline' ? 'error' : 'warning'
                  }
                  size="small"
                  icon={
                    server.status === 'online' ? <CheckCircle /> :
                    server.status === 'offline' ? <Cancel /> : <Warning />
                  }
                />
              ))}
            </Box>
          </Box>
        ) : (
          <CircularProgress size={24} sx={{ color: '#00ffff' }} />
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#00ffff', mb: 1 }}>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage client accounts, sessions, and progress
          </Typography>
        </Box>

        {/* MCP Status */}
        {renderMCPStatus()}

        {/* Search and Actions */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, maxWidth: 400 }}>
            <SearchField
              fullWidth
              placeholder="Search clients..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: '#a0a0a0' }} />,
              }}
            />
          </Box>
          
          <StyledButton
            className="primary"
            startIcon={<Add />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Client
          </StyledButton>
          
          <StyledButton
            className="secondary"
            startIcon={<Refresh />}
            onClick={fetchClients}
          >
            Refresh
          </StyledButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)', mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { 
                color: '#a0a0a0',
                '&.Mui-selected': { color: '#00ffff' }
              },
              '& .MuiTabs-indicator': { backgroundColor: '#00ffff' }
            }}
          >
            <Tab label="All Clients" />
            <Tab label="Analytics" disabled />
            <Tab label="Reports" disabled />
          </Tabs>
        </Box>

        {/* Content */}
        <TabPanel value={currentTab} index={0}>
          {renderClientTable()}
        </TabPanel>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#252742',
            color: '#e0e0e0',
            '& .MuiMenuItem-root:hover': {
              bgcolor: 'rgba(0, 255, 255, 0.1)',
            }
          }
        }}
      >
        <MenuItem onClick={() => menuClient && handleViewDetails(menuClient)}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Visibility />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem onClick={() => menuClient && handleEdit(menuClient)}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Edit />
          </ListItemIcon>
          Edit Client
        </MenuItem>
        <MenuItem onClick={() => menuClient && handleResetPassword(menuClient)}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Key />
          </ListItemIcon>
          Reset Password
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <MenuItem 
          onClick={() => menuClient && handleDelete(menuClient)}
          sx={{ color: '#f44336' }}
        >
          <ListItemIcon sx={{ color: '#f44336' }}>
            <Delete />
          </ListItemIcon>
          Deactivate
        </MenuItem>
      </Menu>

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
        trainers={[]} // TODO: Add trainers list when available
      />
    </Box>
  );
};

export default AdminClientManagementView;
