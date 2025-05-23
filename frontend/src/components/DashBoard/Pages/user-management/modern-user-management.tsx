import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";

// Styled Components
import {
  PageContainer,
  ContentContainer,
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  StyledTableContainer,
  StyledTableHead,
  StyledTableHeadCell,
  StyledTableCell,
  StyledTableRow,
  StyledButton,
  IconButtonContainer,
  StyledIconButton,
  StyledDialog,
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  containerVariants,
  itemVariants,
} from './styled-user-management';

// Material UI Components
import {
  Box,
  Table,
  TableBody,
  TableHead,
  TablePagination,
  TableRow,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Select,
  Paper,
} from '@mui/material';

// Icons
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'user' | 'client' | 'trainer' | 'admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  photo?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  roles: string[];
}

/**
 * Modern User Management System Component
 * 
 * A redesigned user management interface based on the mockup image
 */
const ModernUserManagementSystem: React.FC = () => {
  // Auth and toast hooks
  const { authAxios } = useAuth();
  const { toast } = useToast();
  
  // User state
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  
  // Form state
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: 'user' as const,
    isActive: true,
  });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.get('/api/auth/users');
      
      if (response.data && response.data.success) {
        setUsers(response.data.users || []);
        applyFilters(response.data.users || [], searchTerm, roleFilter);
        
        toast({
          title: "Success",
          description: "Users loaded successfully",
        });
      } else {
        throw new Error(response.data?.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || err.message || 'Error connecting to the server');
      toast({
        title: "Error",
        description: "Could not load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to users
  const applyFilters = (userList: User[], term: string, role: string) => {
    let result = [...userList];
    
    // Apply search filter
    if (term) {
      const lowerCaseTerm = term.toLowerCase();
      result = result.filter(user => 
        user.firstName.toLowerCase().includes(lowerCaseTerm) ||
        user.lastName.toLowerCase().includes(lowerCaseTerm) ||
        user.email.toLowerCase().includes(lowerCaseTerm) ||
        user.username.toLowerCase().includes(lowerCaseTerm)
      );
    }
    
    // Apply role filter
    if (role && role !== 'all') {
      result = result.filter(user => user.role === role);
    }
    
    setFilteredUsers(result);
  };
  
  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Update filters when search term or role filter changes
  useEffect(() => {
    applyFilters(users, searchTerm, roleFilter);
  }, [searchTerm, roleFilter, users]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle role filter change
  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
  };
  
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditModalOpen(true);
  };
  
  // Handle edit form change
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };
  
  // Handle save user changes
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await authAxios.put(`/api/auth/users/${selectedUser.id}`, editFormData);
      
      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        fetchUsers();
        setIsEditModalOpen(false);
      } else {
        throw new Error(response.data?.message || 'Failed to update user');
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || 'Error updating user',
        variant: "destructive",
      });
    }
  };
  
  // Handle add new user
  const handleAddUser = () => {
    setEditFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      role: 'user',
      isActive: true,
    });
    setIsAddUserModalOpen(true);
  };
  
  // Handle create new user
  const handleCreateUser = async () => {
    try {
      const response = await authAxios.post('/api/auth/users', {
        ...editFormData,
        password: 'DefaultPassword123!', // Default password that user will be prompted to change
      });
      
      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: "New user created successfully",
        });
        fetchUsers();
        setIsAddUserModalOpen(false);
      } else {
        throw new Error(response.data?.message || 'Failed to create user');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || 'Error creating user',
        variant: "destructive",
      });
    }
  };
  
  // Handle show permissions
  const handleShowPermissions = () => {
    setIsPermissionsModalOpen(true);
  };
  
  // Handle show security settings
  const handleShowSecuritySettings = () => {
    setIsSecurityModalOpen(true);
  };
  
  // Get role color for chips
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'trainer':
        return 'warning';
      case 'client':
        return 'success';
      default:
        return 'default';
    }
  };
  
  // Get pagination
  const getPaginatedUsers = () => {
    return filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Main User Management Card */}
          <StyledCard component={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                  <AdminPanelSettingsIcon style={{ fontSize: 28 }} />
                  User Management System
                </Stack>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {/* Description */}
              <Box sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2, 
                background: 'rgba(0, 255, 255, 0.1)', 
                border: '1px solid rgba(0, 255, 255, 0.2)' 
              }}>
                <Typography variant="body1" color="rgba(255, 255, 255, 0.9)">
                  This dashboard allows you to manage all users in the system, including clients, trainers, and administrators. 
                  You can view, edit, and manage permissions for all users from this central location.
                </Typography>
              </Box>
              
              {/* Main Content Grid */}
              <Grid container spacing={3}>
                {/* Left Column: User List */}
                <Grid item xs={12} md={8}>
                  <motion.div variants={itemVariants}>
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="h6" mb={2}>
                        Sample User List
                      </Typography>
                      
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={3}>
                        Below is a representation of the user management interface. When fully implemented, you'll be able to:
                      </Typography>
                      
                      {loading ? (
                        <LoadingContainer>
                          <LoadingSpinner />
                        </LoadingContainer>
                      ) : error ? (
                        <EmptyStateContainer>
                          <EmptyStateIcon>⚠️</EmptyStateIcon>
                          <EmptyStateText>{error}</EmptyStateText>
                          <StyledButton onClick={fetchUsers} variant="contained" sx={{ mt: 2 }}>
                            Retry
                          </StyledButton>
                        </EmptyStateContainer>
                      ) : (
                        <Box>
                          {/* Real User List Table */}
                          <Table size="small">
                            <TableBody>
                              {users && users.length > 0 ? (
                                users.map(user => (
                                  <StyledTableRow key={user.id}>
                                    <StyledTableCell sx={{ pl: 1 }}>
                                      <Stack direction="row" spacing={2} alignItems="center">
                                        <PersonIcon />
                                        <Box>
                                          <Typography variant="body1" fontWeight="500">{user.firstName} {user.lastName}</Typography>
                                          <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                                            Role: {user.role} • Status: {user.isActive ? 'Active' : 'Inactive'}
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </StyledTableCell>
                                    <StyledTableCell align="right">
                                      <StyledButton
                                        variant="contained"
                                        color="primary"
                                        onClick={() => handleEditUser(user)}
                                        size="small"
                                      >
                                        Edit
                                      </StyledButton>
                                    </StyledTableCell>
                                  </StyledTableRow>
                                ))
                              ) : (
                                // Sample users if none loaded
                                <>
                                  <StyledTableRow>
                                    <StyledTableCell sx={{ pl: 1 }}>
                                      <Stack direction="row" spacing={2} alignItems="center">
                                        <PersonIcon />
                                        <Box>
                                          <Typography variant="body1" fontWeight="500">Admin User</Typography>
                                          <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                                            Role: admin • Status: Active
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </StyledTableCell>
                                    <StyledTableCell align="right">
                                      <StyledButton
                                        variant="contained"
                                        color="primary"
                                        onClick={() => {}}
                                        size="small"
                                      >
                                        Edit
                                      </StyledButton>
                                    </StyledTableCell>
                                  </StyledTableRow>
                                  <StyledTableRow>
                                    <StyledTableCell sx={{ pl: 1 }}>
                                      <Stack direction="row" spacing={2} alignItems="center">
                                        <PersonIcon />
                                        <Box>
                                          <Typography variant="body1" fontWeight="500">Trainer User</Typography>
                                          <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
                                            Role: trainer • Status: Active
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </StyledTableCell>
                                    <StyledTableCell align="right">
                                      <StyledButton
                                        variant="contained"
                                        color="primary"
                                        onClick={() => {}}
                                        size="small"
                                      >
                                        Edit
                                      </StyledButton>
                                    </StyledTableCell>
                                  </StyledTableRow>
                                </>
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      )}
                    </Paper>
                  </motion.div>
                </Grid>
                
                {/* Right Column: Features & Admin Tools */}
                <Grid item xs={12} md={4}>
                  {/* User Management Features */}
                  <motion.div variants={itemVariants}>
                    <Paper sx={{ 
                      p: 3, 
                      mb: 3,
                      borderRadius: 2, 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="h6" mb={2}>
                        User Management Features
                      </Typography>
                      
                      <Stack spacing={1.5}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <CheckCircleIcon color="success" />
                          <Typography variant="body1">
                            View all users by role
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <CheckCircleIcon color="success" />
                          <Typography variant="body1">
                            Edit user details
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <CheckCircleIcon color="success" />
                          <Typography variant="body1">
                            Promote users to client
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <CheckCircleIcon color="success" />
                          <Typography variant="body1">
                            Manage admin permissions
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </motion.div>
                  
                  {/* Admin Tools */}
                  <motion.div variants={itemVariants}>
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="h6" mb={2}>
                        Admin Tools
                      </Typography>
                      
                      <Stack spacing={2}>
                        <StyledButton
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<PersonAddIcon />}
                          onClick={handleAddUser}
                        >
                          Add New User
                        </StyledButton>
                        
                        <StyledButton
                          fullWidth
                          variant="outlined"
                          startIcon={<SecurityIcon />}
                          onClick={handleShowPermissions}
                        >
                          User Permissions
                        </StyledButton>
                        
                        <StyledButton
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<LockIcon />}
                          onClick={handleShowSecuritySettings}
                        >
                          Security Settings
                        </StyledButton>
                      </Stack>
                    </Paper>
                  </motion.div>
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>
      
      {/* Add User Dialog */}
      <StyledDialog open={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PersonAddIcon />
            <Typography variant="h6">Add New User</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
            Create a new user account. The user will receive a welcome email with instructions to set their password.
          </DialogContentText>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={editFormData.firstName}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={editFormData.lastName}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={editFormData.email}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={editFormData.username}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={editFormData.role}
                  label="Role"
                  onChange={handleEditFormChange as any}
                >
                  <MenuItem value="user">Regular User</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="trainer">Trainer</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setIsAddUserModalOpen(false)} variant="outlined">
            Cancel
          </StyledButton>
          <StyledButton onClick={handleCreateUser} variant="contained" color="success">
            Create User
          </StyledButton>
        </DialogActions>
      </StyledDialog>
      
      {/* Edit User Dialog */}
      <StyledDialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EditIcon />
            <Typography variant="h6">Edit User</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={editFormData.firstName}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={editFormData.lastName}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={editFormData.email}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={editFormData.username}
                onChange={handleEditFormChange}
                variant="outlined"
                margin="normal"
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="edit-role-select-label">Role</InputLabel>
                <Select
                  labelId="edit-role-select-label"
                  name="role"
                  value={editFormData.role}
                  label="Role"
                  onChange={handleEditFormChange as any}
                >
                  <MenuItem value="user">Regular User</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="trainer">Trainer</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  name="isActive"
                  value={editFormData.isActive}
                  label="Status"
                  onChange={handleEditFormChange as any}
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setIsEditModalOpen(false)} variant="outlined">
            Cancel
          </StyledButton>
          <StyledButton onClick={handleSaveUser} variant="contained" color="primary">
            Save Changes
          </StyledButton>
        </DialogActions>
      </StyledDialog>
      
      {/* Permissions Dialog */}
      <StyledDialog open={isPermissionsModalOpen} onClose={() => setIsPermissionsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SecurityIcon />
            <Typography variant="h6">User Permissions</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
            Manage what different user roles can access in the system. Changes will affect all users with the selected role.
          </DialogContentText>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Role Permissions</Typography>
            <Table size="small">
              <TableHead>
                <StyledTableHead>
                  <StyledTableHeadCell>Permission</StyledTableHeadCell>
                  <StyledTableHeadCell align="center">Admin</StyledTableHeadCell>
                  <StyledTableHeadCell align="center">Trainer</StyledTableHeadCell>
                  <StyledTableHeadCell align="center">Client</StyledTableHeadCell>
                  <StyledTableHeadCell align="center">User</StyledTableHeadCell>
                </StyledTableHead>
              </TableHead>
              <TableBody>
                <StyledTableRow>
                  <StyledTableCell>View Dashboard</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                </StyledTableRow>
                <StyledTableRow>
                  <StyledTableCell>Manage Users</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                </StyledTableRow>
                <StyledTableRow>
                  <StyledTableCell>Create Sessions</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                </StyledTableRow>
                <StyledTableRow>
                  <StyledTableCell>Book Sessions</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                </StyledTableRow>
                <StyledTableRow>
                  <StyledTableCell>Access Reports</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">✓</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                  <StyledTableCell align="center">-</StyledTableCell>
                </StyledTableRow>
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setIsPermissionsModalOpen(false)}>
            Close
          </StyledButton>
        </DialogActions>
      </StyledDialog>
      
      {/* Security Settings Dialog */}
      <StyledDialog open={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LockIcon />
            <Typography variant="h6">Security Settings</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
            Configure security settings for the user management system.
          </DialogContentText>
          
          <Typography variant="subtitle1" gutterBottom>Password Policy</Typography>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Minimum Password Length</InputLabel>
              <Select
                value={8}
                label="Minimum Password Length"
              >
                <MenuItem value={6}>6 characters</MenuItem>
                <MenuItem value={8}>8 characters</MenuItem>
                <MenuItem value={10}>10 characters</MenuItem>
                <MenuItem value={12}>12 characters</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Password Complexity</InputLabel>
              <Select
                value="medium"
                label="Password Complexity"
              >
                <MenuItem value="low">Low (letters only)</MenuItem>
                <MenuItem value="medium">Medium (letters + numbers)</MenuItem>
                <MenuItem value="high">High (letters + numbers + symbols)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>Account Security</Typography>
          <Box>
            <FormControl fullWidth margin="normal">
              <InputLabel>Session Timeout</InputLabel>
              <Select
                value={30}
                label="Session Timeout"
              >
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
                <MenuItem value={120}>2 hours</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Failed Login Attempts</InputLabel>
              <Select
                value={5}
                label="Failed Login Attempts"
              >
                <MenuItem value={3}>3 attempts</MenuItem>
                <MenuItem value={5}>5 attempts</MenuItem>
                <MenuItem value={10}>10 attempts</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <StyledButton onClick={() => setIsSecurityModalOpen(false)} variant="outlined">
            Cancel
          </StyledButton>
          <StyledButton variant="contained" color="primary">
            Save Settings
          </StyledButton>
        </DialogActions>
      </StyledDialog>
    </PageContainer>
  );
};

export default ModernUserManagementSystem;