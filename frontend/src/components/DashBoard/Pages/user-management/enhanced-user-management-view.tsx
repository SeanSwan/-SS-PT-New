import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ErrorContainer,
  TabContainer,
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
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';

// Fallback component
const UserManagementFallback = lazy(() => import('./fallback-view'));

// Define types
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
  // Client-specific fields
  fitnessGoal?: string;
  trainingExperience?: string;
  availableSessions?: number;
  // Trainer-specific fields
  specialties?: string;
  certifications?: string;
}

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
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Enhanced User Management View Component
 * 
 * Provides comprehensive user management capabilities:
 * - List all users with role-based filtering
 * - Edit user details and roles
 * - Promote users to client status
 * - Set admin access via secure admin code
 * - View user session credits and training information
 */
const EnhancedUserManagementView: React.FC = () => {
  // Use auth context to get the authAxios instance
  const { authAxios } = useAuth();
  const { toast } = useToast();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAdminCodeDialog, setOpenAdminCodeDialog] = useState(false);
  const [openPromoteDialog, setOpenPromoteDialog] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    fitnessGoal: '',
    trainingExperience: '',
    availableSessions: 0
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Use authAxios instead of regular axios - this has the auth token set up in interceptors
      const response = await authAxios.get('/api/auth/users');
      
      if (response.data && response.data.success) {
        setUsers(response.data.users || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users from the server",
          variant: "destructive",
        });
        setError('Failed to fetch users from the server');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Error loading users. Please try again.",
        variant: "destructive",
      });
      setError('Error connecting to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filter users based on selected tab
  const getFilteredUsers = () => {
    switch (tabValue) {
      case 0: // All Users
        return users;
      case 1: // Clients
        return users.filter(user => user.role === 'client');
      case 2: // Trainers
        return users.filter(user => user.role === 'trainer');
      case 3: // Admin
        return users.filter(user => user.role === 'admin');
      case 4: // Regular Users
        return users.filter(user => user.role === 'user');
      default:
        return users;
    }
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open edit dialog
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      fitnessGoal: user.fitnessGoal || '',
      trainingExperience: user.trainingExperience || '',
      availableSessions: user.availableSessions || 0
    });
    setOpenEditDialog(true);
  };

  // Handle edit form field changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  // Save user edits
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await authAxios.put(`/api/auth/users/${selectedUser.id}`, editFormData);
      
      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        fetchUsers(); // Refresh user list
      } else {
        toast({
          title: "Error",
          description: "Failed to update user",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: "Error",
        description: "Error updating user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpenEditDialog(false);
    }
  };

  // Open admin code dialog
  const handlePromoteToAdmin = (user: User) => {
    setSelectedUser(user);
    setOpenAdminCodeDialog(true);
  };

  // Verify admin code and promote user
  const handleAdminCodeSubmit = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await authAxios.post('/api/auth/promote-admin', {
        userId: selectedUser.id,
        adminCode
      });
      
      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: `${selectedUser.firstName} ${selectedUser.lastName} is now an admin`,
        });
        fetchUsers(); // Refresh user list
      } else {
        toast({
          title: "Error",
          description: "Invalid admin code or insufficient permissions",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error promoting to admin:', err);
      toast({
        title: "Error",
        description: "Failed to promote user to admin. Please check your code and try again.",
        variant: "destructive",
      });
    } finally {
      setOpenAdminCodeDialog(false);
      setAdminCode('');
    }
  };

  // Open promote to client dialog
  const handlePromoteToClient = (user: User) => {
    setSelectedUser(user);
    setOpenPromoteDialog(true);
  };

  // Promote user to client
  const handlePromoteClientSubmit = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await authAxios.post('/api/auth/promote-client', {
        userId: selectedUser.id,
        availableSessions: editFormData.availableSessions
      });
      
      if (response.data && response.data.success) {
        toast({
          title: "Success",
          description: `${selectedUser.firstName} ${selectedUser.lastName} is now a client`,
        });
        fetchUsers(); // Refresh user list
      } else {
        toast({
          title: "Error",
          description: "Failed to promote user to client",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Error promoting to client:', err);
      toast({
        title: "Error",
        description: "Failed to promote user to client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpenPromoteDialog(false);
    }
  };

  // Get role chip color
  const getRoleChipColor = (role: string) => {
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

  // Get tab icon based on index
  const getTabIcon = (index: number) => {
    switch (index) {
      case 0: // All Users
        return <GroupIcon />;
      case 1: // Clients
        return <FitnessCenterIcon />;
      case 2: // Trainers
        return <FitnessCenterIcon style={{ transform: 'rotate(45deg)' }} />;
      case 3: // Admin
        return <SecurityIcon />;
      case 4: // Regular Users
        return <PersonIcon />;
      default:
        return <GroupIcon />;
    }
  };

  // Determine if we should show the fallback view
  if (error || (loading && users.length === 0)) {
    return (
      <Suspense fallback={
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      }>
        <UserManagementFallback />
      </Suspense>
    );
  }

  // Filter users for current page
  const filteredUsers = getFilteredUsers();
  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard component={motion.div} variants={itemVariants}>
            <CardHeader>
              <CardTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                  <AdminPanelSettingsIcon style={{ fontSize: 28 }} />
                  User Management
                </Stack>
              </CardTitle>
              <motion.div variants={itemVariants}>
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={() => fetchUsers()}
                  disabled={loading}
                >
                  Refresh Users
                </StyledButton>
              </motion.div>
            </CardHeader>
            <CardContent>
              <TabContainer>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  textColor="inherit"
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="user management tabs"
                >
                  <Tab icon={getTabIcon(0)} label="All Users" iconPosition="start" />
                  <Tab icon={getTabIcon(1)} label="Clients" iconPosition="start" />
                  <Tab icon={getTabIcon(2)} label="Trainers" iconPosition="start" />
                  <Tab icon={getTabIcon(3)} label="Admins" iconPosition="start" />
                  <Tab icon={getTabIcon(4)} label="Regular Users" iconPosition="start" />
                </Tabs>
              </TabContainer>
              
              <TabPanel value={tabValue} index={tabValue}>
                {loading ? (
                  <LoadingContainer>
                    <LoadingSpinner />
                  </LoadingContainer>
                ) : (
                  <StyledTableContainer>
                    <Table aria-label="users table">
                      <TableHead>
                        <StyledTableHead>
                          <StyledTableHeadCell>Name</StyledTableHeadCell>
                          <StyledTableHeadCell>Email</StyledTableHeadCell>
                          <StyledTableHeadCell>Username</StyledTableHeadCell>
                          <StyledTableHeadCell>Role</StyledTableHeadCell>
                          <StyledTableHeadCell>Status</StyledTableHeadCell>
                          <StyledTableHeadCell align="right">Actions</StyledTableHeadCell>
                        </StyledTableHead>
                      </TableHead>
                      <TableBody>
                        {paginatedUsers.length > 0 ? (
                          paginatedUsers.map((user) => (
                            <StyledTableRow key={user.id} component={motion.tr} variants={itemVariants}>
                              <StyledTableCell>
                                {user.firstName} {user.lastName}
                              </StyledTableCell>
                              <StyledTableCell>{user.email}</StyledTableCell>
                              <StyledTableCell>{user.username}</StyledTableCell>
                              <StyledTableCell>
                                <Chip 
                                  label={user.role.toUpperCase()} 
                                  color={getRoleChipColor(user.role) as any}
                                  size="small"
                                />
                              </StyledTableCell>
                              <StyledTableCell>
                                <Chip 
                                  label={user.isActive ? 'Active' : 'Inactive'} 
                                  color={user.isActive ? 'success' : 'default'}
                                  size="small"
                                />
                              </StyledTableCell>
                              <StyledTableCell align="right">
                                <IconButtonContainer>
                                  {/* Edit user button */}
                                  <StyledIconButton
                                    btncolor="primary"
                                    onClick={() => handleEditUser(user)}
                                    title="Edit user"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </StyledIconButton>

                                  {/* Promote to client button - only for regular users */}
                                  {user.role === 'user' && (
                                    <StyledIconButton
                                      btncolor="success"
                                      onClick={() => handlePromoteToClient(user)}
                                      title="Promote to client"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <PersonAddIcon fontSize="small" />
                                    </StyledIconButton>
                                  )}

                                  {/* Promote to admin button - for non-admin users */}
                                  {user.role !== 'admin' && (
                                    <StyledIconButton
                                      btncolor="error"
                                      onClick={() => handlePromoteToAdmin(user)}
                                      title="Promote to admin"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <KeyIcon fontSize="small" />
                                    </StyledIconButton>
                                  )}
                                </IconButtonContainer>
                              </StyledTableCell>
                            </StyledTableRow>
                          ))
                        ) : (
                          <TableRow>
                            <StyledTableCell colSpan={6}>
                              <EmptyStateContainer>
                                <EmptyStateIcon>👤</EmptyStateIcon>
                                <EmptyStateText>
                                  No users found in this category
                                </EmptyStateText>
                              </EmptyStateContainer>
                            </StyledTableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </StyledTableContainer>
                )}
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredUsers.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-displayedRows': { color: 'rgba(255, 255, 255, 0.9)' },
                    '.MuiTablePagination-select': { color: 'rgba(255, 255, 255, 0.9)' },
                    '.MuiTablePagination-actions button': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                />
              </TabPanel>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* Edit User Dialog */}
      <StyledDialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
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
                InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                InputProps={{ 
                  style: { color: 'rgba(255, 255, 255, 0.9)' },
                }}
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
                InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                InputProps={{ 
                  style: { color: 'rgba(255, 255, 255, 0.9)' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={editFormData.email}
                onChange={handleEditFormChange}
                variant="outlined"
                InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                InputProps={{ 
                  style: { color: 'rgba(255, 255, 255, 0.9)' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="role-select-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={editFormData.role}
                  label="Role"
                  onChange={handleEditFormChange as any}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    '.MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' },
                  }}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                  <MenuItem value="trainer">Trainer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Client-specific fields - shown only when role is 'client' */}
            {editFormData.role === 'client' && (
              <>
                <Grid item xs={12}>
                  <Divider textAlign="left" sx={{ color: 'rgba(255, 255, 255, 0.6)', '&::before, &::after': { borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                    Client Details
                  </Divider>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="fitness-goal-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Fitness Goal</InputLabel>
                    <Select
                      labelId="fitness-goal-label"
                      name="fitnessGoal"
                      value={editFormData.fitnessGoal}
                      label="Fitness Goal"
                      onChange={handleEditFormChange as any}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        '.MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' },
                      }}
                    >
                      <MenuItem value="weight-loss">Weight Loss</MenuItem>
                      <MenuItem value="muscle-gain">Muscle Gain</MenuItem>
                      <MenuItem value="endurance">Endurance</MenuItem>
                      <MenuItem value="flexibility">Flexibility</MenuItem>
                      <MenuItem value="general-fitness">General Fitness</MenuItem>
                      <MenuItem value="sports-specific">Sports Specific</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="training-experience-label" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Training Experience</InputLabel>
                    <Select
                      labelId="training-experience-label"
                      name="trainingExperience"
                      value={editFormData.trainingExperience}
                      label="Training Experience"
                      onChange={handleEditFormChange as any}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        '.MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.7)' },
                      }}
                    >
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                      <MenuItem value="professional">Professional</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Available Sessions"
                    name="availableSessions"
                    type="number"
                    InputProps={{ 
                      inputProps: { min: 0 },
                      style: { color: 'rgba(255, 255, 255, 0.9)' },
                    }}
                    value={editFormData.availableSessions}
                    onChange={handleEditFormChange}
                    variant="outlined"
                    InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <StyledButton 
            onClick={() => setOpenEditDialog(false)}
            variant="outlined"
          >
            Cancel
          </StyledButton>
          <StyledButton 
            onClick={handleSaveUser}
            variant="contained"
            color="primary"
          >
            Save Changes
          </StyledButton>
        </DialogActions>
      </StyledDialog>

      {/* Admin Code Dialog */}
      <StyledDialog open={openAdminCodeDialog} onClose={() => setOpenAdminCodeDialog(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <LockIcon sx={{ color: '#ff416c' }} />
            <Typography variant="h6">Admin Authorization</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Enter the admin access code to promote {selectedUser?.firstName} {selectedUser?.lastName} to admin role.
            This will grant them full system access.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Admin Access Code"
            type="password"
            fullWidth
            variant="outlined"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
            InputProps={{ 
              style: { color: 'rgba(255, 255, 255, 0.9)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <StyledButton 
            onClick={() => setOpenAdminCodeDialog(false)}
            variant="outlined"
          >
            Cancel
          </StyledButton>
          <StyledButton 
            onClick={handleAdminCodeSubmit}
            variant="contained"
            color="error"
          >
            Authorize
          </StyledButton>
        </DialogActions>
      </StyledDialog>

      {/* Promote to Client Dialog */}
      <StyledDialog open={openPromoteDialog} onClose={() => setOpenPromoteDialog(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <VerifiedUserIcon sx={{ color: '#00bf8f' }} />
            <Typography variant="h6">Promote to Client</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Promote {selectedUser?.firstName} {selectedUser?.lastName} to client status. 
            Enter the number of available training sessions to assign.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Available Sessions"
            type="number"
            fullWidth
            variant="outlined"
            InputProps={{ 
              inputProps: { min: 0 },
              style: { color: 'rgba(255, 255, 255, 0.9)' },
            }}
            value={editFormData.availableSessions}
            onChange={(e) => setEditFormData({ ...editFormData, availableSessions: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
            InputLabelProps={{ style: { color: 'rgba(255, 255, 255, 0.7)' } }}
          />
        </DialogContent>
        <DialogActions>
          <StyledButton 
            onClick={() => setOpenPromoteDialog(false)}
            variant="outlined"
          >
            Cancel
          </StyledButton>
          <StyledButton 
            onClick={handlePromoteClientSubmit}
            variant="contained"
            color="success"
          >
            Promote
          </StyledButton>
        </DialogActions>
      </StyledDialog>
    </PageContainer>
  );
};

export default EnhancedUserManagementView;