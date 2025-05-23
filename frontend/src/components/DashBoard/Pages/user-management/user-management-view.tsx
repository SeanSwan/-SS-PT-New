import React, { useState, useEffect, Suspense, lazy } from 'react';

// Import fallback component
const UserManagementFallback = lazy(() => import('./fallback-view'));

// Import Auth Context
import { useAuth } from '../../../../context/AuthContext';

// material-ui
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Alert
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyIcon from '@mui/icons-material/Key';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

// project imports
import { gridSpacing } from '../../../../store/constant';
import MainCard from '../../../../components/ui/MainCard';

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
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * User Management View Component
 * 
 * Provides comprehensive user management capabilities:
 * - List all users with role-based filtering
 * - Edit user details and roles
 * - Promote users to client status
 * - Set admin access via secure admin code
 * - View user session credits and training information
 */
const UserManagementView: React.FC = () => {
  // Use auth context to get the authAxios instance
  const { authAxios } = useAuth();
  
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
  const [alertMessage, setAlertMessage] = useState({ message: '', severity: 'success' });
  const [openAlert, setOpenAlert] = useState(false);
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
        showAlert('Failed to fetch users', 'error');
        setError('Failed to fetch users from the server');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      showAlert(`Error loading users: ${err.response?.data?.message || 'Please try again.'}`, 'error');
      setError('Error connecting to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Show alert message
  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setAlertMessage({ message, severity });
    setOpenAlert(true);
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
        showAlert('User updated successfully', 'success');
        fetchUsers(); // Refresh user list
      } else {
        showAlert('Failed to update user', 'error');
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      showAlert('Error updating user. Please try again.', 'error');
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
        showAlert(`${selectedUser.firstName} ${selectedUser.lastName} is now an admin`, 'success');
        fetchUsers(); // Refresh user list
      } else {
        showAlert('Invalid admin code or insufficient permissions', 'error');
      }
    } catch (err: any) {
      console.error('Error promoting to admin:', err);
      showAlert('Failed to promote user to admin. Please check your code and try again.', 'error');
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
        showAlert(`${selectedUser.firstName} ${selectedUser.lastName} is now a client`, 'success');
        fetchUsers(); // Refresh user list
      } else {
        showAlert('Failed to promote user to client', 'error');
      }
    } catch (err: any) {
      console.error('Error promoting to client:', err);
      showAlert('Failed to promote user to client. Please try again.', 'error');
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

  // Determine if we should show the fallback view
  if (error || (loading && users.length === 0)) {
    return (
      <Suspense fallback={<div>Loading fallback view...</div>}>
        <UserManagementFallback />
      </Suspense>
    );
  }

  // Filter users for current page
  const filteredUsers = getFilteredUsers();
  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <MainCard title="User Management">
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            aria-label="user management tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All Users" />
            <Tab label="Clients" />
            <Tab label="Trainers" />
            <Tab label="Admins" />
            <Tab label="Regular Users" />
          </Tabs>
          
          <TabPanel value={tabValue} index={tabValue}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="users table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role.toUpperCase()} 
                            color={getRoleChipColor(user.role) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.isActive ? 'Active' : 'Inactive'} 
                            color={user.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {/* Edit user button */}
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <EditIcon />
                            </IconButton>

                            {/* Promote to client button - only for regular users */}
                            {user.role === 'user' && (
                              <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => handlePromoteToClient(user)}
                                title="Promote to client"
                              >
                                <PersonAddIcon />
                              </IconButton>
                            )}

                            {/* Promote to admin button - for non-admin users */}
                            {user.role !== 'admin' && (
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handlePromoteToAdmin(user)}
                                title="Promote to admin"
                              >
                                <KeyIcon />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1">
                          {loading ? 'Loading users...' : 'No users found'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TabPanel>
        </Grid>
      </Grid>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={editFormData.firstName}
                onChange={handleEditFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={editFormData.lastName}
                onChange={handleEditFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={editFormData.email}
                onChange={handleEditFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={editFormData.role}
                  label="Role"
                  onChange={handleEditFormChange as any}
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
                  <Divider textAlign="left">Client Details</Divider>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Fitness Goal</InputLabel>
                    <Select
                      name="fitnessGoal"
                      value={editFormData.fitnessGoal}
                      label="Fitness Goal"
                      onChange={handleEditFormChange as any}
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
                  <FormControl fullWidth>
                    <InputLabel>Training Experience</InputLabel>
                    <Select
                      name="trainingExperience"
                      value={editFormData.trainingExperience}
                      label="Training Experience"
                      onChange={handleEditFormChange as any}
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
                    InputProps={{ inputProps: { min: 0 } }}
                    value={editFormData.availableSessions}
                    onChange={handleEditFormChange}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Admin Code Dialog */}
      <Dialog open={openAdminCodeDialog} onClose={() => setOpenAdminCodeDialog(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <LockIcon color="error" />
            <Typography variant="h6">Admin Authorization</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdminCodeDialog(false)}>Cancel</Button>
          <Button onClick={handleAdminCodeSubmit} variant="contained" color="error">
            Authorize
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promote to Client Dialog */}
      <Dialog open={openPromoteDialog} onClose={() => setOpenPromoteDialog(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <VerifiedUserIcon color="success" />
            <Typography variant="h6">Promote to Client</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
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
            InputProps={{ inputProps: { min: 0 } }}
            value={editFormData.availableSessions}
            onChange={(e) => setEditFormData({ ...editFormData, availableSessions: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPromoteDialog(false)}>Cancel</Button>
          <Button onClick={handlePromoteClientSubmit} variant="contained" color="success">
            Promote
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={openAlert}
        autoHideDuration={6000}
        onClose={() => setOpenAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setOpenAlert(false)} 
          severity={alertMessage.severity as any} 
          variant="filled"
        >
          {alertMessage.message}
        </Alert>
      </Snackbar>
    </MainCard>
  );
};

export default UserManagementView;