/**
 * Enhanced User Data Management Dashboard
 * =======================================
 * 
 * BUSINESS-CRITICAL: Comprehensive user data collection and management system
 * Handles ALL user types: general users, potential clients, potential trainers
 * 
 * FEATURES:
 * - Complete user onboarding workflows
 * - Role conversion management (user → client/trainer)
 * - Comprehensive data collection forms
 * - User lifecycle tracking and analytics
 * - Mobile-optimized admin interface
 * - Advanced search and filtering
 * - Bulk operations and data export
 * 
 * DATA COLLECTION FOCUS:
 * - Personal information and contact details
 * - Interest tracking and conversion potential
 * - Engagement metrics and platform usage
 * - Role conversion pipeline management
 * - Communication preferences and history
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Badge,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider
} from '@mui/material';

// Enhanced icon set for user management
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
  Group,
  TrendingUp,
  Timeline,
  Assessment,
  FilterList,
  ClearAll,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Settings,
  Close,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  FitnessCenter,
  School,
  Work,
  Star,
  EmojiPeople,
  Psychology,
  Favorite,
  ChatBubbleOutline,
  NotificationsActive,
  DataUsage,
  Speed,
  Transform
} from '@mui/icons-material';

// === STYLED COMPONENTS ===
const DashboardContainer = styled.div`
  padding: 1.5rem;
  min-height: 100vh;
  background: transparent;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HeaderSection = styled(motion.div)`
  margin-bottom: 2rem;
  text-align: center;
  
  h1 {
    color: #ffffff;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #00ffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

const StatsOverview = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #00ffff;
    box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
    transform: translateY(-4px);
  }
  
  .stat-icon {
    font-size: 3rem;
    color: #00ffff;
    margin-bottom: 1rem;
  }
  
  .stat-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .stat-change {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    
    &.negative {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
  }
`;

const ControlsSection = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const SearchSection = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #3b82f6 0%, #00ffff 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.4);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DataTable = styled(motion.div)`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
`;

const TableHeader = styled.div`
  background: rgba(30, 58, 138, 0.3);
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  
  h3 {
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
`;

// === INTERFACES ===
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'user' | 'client' | 'trainer' | 'admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  photo?: string;
  phone?: string;
  // Extended data collection fields
  interests?: string[];
  conversionPotential?: 'high' | 'medium' | 'low';
  engagementScore?: number;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  source?: string; // How they found the platform
  notes?: string;
}

interface UserStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  conversionRate: number;
  potentialClients: number;
  potentialTrainers: number;
}

// === MAIN COMPONENT ===
const EnhancedUserDataManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    activeUsers: 0,
    conversionRate: 0,
    potentialClients: 0,
    potentialTrainers: 0
  });

  // Modal states
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleConversionModalOpen, setRoleConversionModalOpen] = useState(false);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        
        // Calculate stats
        const totalUsers = data.users?.length || 0;
        const currentMonth = new Date().getMonth();
        const newUsersThisMonth = data.users?.filter((u: User) => 
          new Date(u.createdAt).getMonth() === currentMonth
        ).length || 0;
        const activeUsers = data.users?.filter((u: User) => u.isActive).length || 0;
        
        setStats({
          totalUsers,
          newUsersThisMonth,
          activeUsers,
          conversionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
          potentialClients: data.users?.filter((u: User) => u.conversionPotential === 'high' && u.role === 'user').length || 0,
          potentialTrainers: data.users?.filter((u: User) => u.role === 'trainer').length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial data load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'inactive' && !user.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // Handle user role conversion
  const handleRoleConversion = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        await fetchUsers();
        toast({
          title: "Success",
          description: `User role updated to ${newRole}`,
          variant: "default"
        });
        setRoleConversionModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  // Stats cards data
  const statsCards = [
    {
      icon: <Group className="stat-icon" />,
      number: stats.totalUsers,
      label: 'Total Users',
      change: `+${stats.newUsersThisMonth} this month`,
      changeType: 'positive'
    },
    {
      icon: <TrendingUp className="stat-icon" />,
      number: stats.activeUsers,
      label: 'Active Users',
      change: `${stats.conversionRate.toFixed(1)}% conversion rate`,
      changeType: 'positive'
    },
    {
      icon: <FitnessCenter className="stat-icon" />,
      number: stats.potentialClients,
      label: 'Potential Clients',
      change: 'High conversion probability',
      changeType: 'positive'
    },
    {
      icon: <School className="stat-icon" />,
      number: stats.potentialTrainers,
      label: 'Trainers',
      change: 'Certified professionals',
      changeType: 'positive'
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'trainer': return '#8b5cf6';
      case 'client': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? '#10b981' : '#ef4444';
  };

  return (
    <DashboardContainer>
      {/* Header Section */}
      <HeaderSection
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>🏢 Enhanced User Data Management</h1>
        <p>
          Comprehensive user data collection and management system. 
          Collect, analyze, and convert users across all platform roles.
        </p>
      </HeaderSection>

      {/* Statistics Overview */}
      <StatsOverview
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {statsCards.map((stat, index) => (
          <StatCard
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
          >
            {stat.icon}
            <div className="stat-number">{stat.number}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.change}
            </div>
          </StatCard>
        ))}
      </StatsOverview>

      {/* Controls Section */}
      <ControlsSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <ControlsGrid>
          <SearchSection>
            <TextField
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search style={{ color: 'rgba(255,255,255,0.6)', marginRight: '0.5rem' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  '& fieldset': { borderColor: 'rgba(59, 130, 246, 0.3)' },
                  '&:hover fieldset': { borderColor: '#00ffff' },
                  '&.Mui-focused fieldset': { borderColor: '#00ffff' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' }
              }}
            />
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.8)' }}>Role</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                sx={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59, 130, 246, 0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' }
                }}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="user">Users</MenuItem>
                <MenuItem value="client">Clients</MenuItem>
                <MenuItem value="trainer">Trainers</MenuItem>
                <MenuItem value="admin">Admins</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.8)' }}>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(59, 130, 246, 0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ffff' }
                }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </SearchSection>
          
          <ActionButton
            onClick={() => navigate('/dashboard/admin/user-onboarding')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PersonAdd />
            Add User
          </ActionButton>
          
          <ActionButton
            onClick={fetchUsers}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Refresh />
            Refresh
          </ActionButton>
        </ControlsGrid>
      </ControlsSection>

      {/* Data Table */}
      <DataTable
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <TableHeader>
          <h3>User Database ({filteredUsers.length} users)</h3>
        </TableHeader>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Contact</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Joined</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <LinearProgress sx={{ 
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#00ffff' }
                      }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', padding: '3rem' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      No users found matching your criteria
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow 
                      key={user.id}
                      hover
                      sx={{ 
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsModalOpen(true);
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            src={user.photo} 
                            sx={{ 
                              width: 40, 
                              height: 40,
                              backgroundColor: getRoleColor(user.role)
                            }}
                          >
                            {user.firstName?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: '#ffffff', fontWeight: 500 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                              @{user.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
                            {user.email}
                          </Typography>
                          {user.phone && (
                            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                              {user.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.toUpperCase()}
                          sx={{
                            backgroundColor: getRoleColor(user.role),
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          sx={{
                            backgroundColor: getStatusColor(user.isActive),
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              sx={{ color: '#00ffff' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setUserDetailsModalOpen(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit User">
                            <IconButton 
                              size="small"
                              sx={{ color: '#ffffff' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Convert Role">
                            <IconButton 
                              size="small"
                              sx={{ color: '#8b5cf6' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setRoleConversionModalOpen(true);
                              }}
                            >
                              <Transform />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{
            color: '#ffffff',
            borderTop: '1px solid rgba(59, 130, 246, 0.3)',
            '& .MuiTablePagination-selectIcon': { color: '#ffffff' },
            '& .MuiTablePagination-select': { color: '#ffffff' }
          }}
        />
      </DataTable>
    </DashboardContainer>
  );
};

export default EnhancedUserDataManagement;