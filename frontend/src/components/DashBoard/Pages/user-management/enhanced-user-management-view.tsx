import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";

// lucide-react icons
import {
  Edit,
  UserPlus,
  Key,
  Lock,
  ShieldCheck,
  Settings,
  Users,
  Dumbbell,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Styled Components (zero MUI)
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
  ModalOverlay,
  ModalPanel,
  ModalTitle,
  ModalContent,
  ModalActions,
  ModalSubText,
  LoadingContainer,
  LoadingSpinner,
  ErrorContainer,
  TabContainer,
  TabBar,
  TabButton,
  RoleChip,
  StatusChip,
  FormGrid,
  FormField,
  FormLabel,
  FormInput,
  FormSelect,
  FormDivider,
  PaginationBar,
  PaginationSelect,
  PaginationButton,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  containerVariants,
  itemVariants,
} from './styled-user-management';

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
        <div style={{ paddingTop: '1rem' }}>
          {children}
        </div>
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
  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
    setPage(0);
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
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
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
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  // Get tab icon based on index
  const getTabIcon = (index: number) => {
    switch (index) {
      case 0: return <Users size={18} />;
      case 1: return <Dumbbell size={18} />;
      case 2: return <Dumbbell size={18} style={{ transform: 'rotate(45deg)' }} />;
      case 3: return <Shield size={18} />;
      case 4: return <User size={18} />;
      default: return <Users size={18} />;
    }
  };

  // Tab definitions
  const tabs = [
    { label: 'All Users', index: 0 },
    { label: 'Clients', index: 1 },
    { label: 'Trainers', index: 2 },
    { label: 'Admins', index: 3 },
    { label: 'Regular Users', index: 4 },
  ];

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
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const startRow = page * rowsPerPage + 1;
  const endRow = Math.min((page + 1) * rowsPerPage, filteredUsers.length);

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <StyledCard as={motion.div} {...itemVariants}>
            <CardHeader>
              <CardTitle>
                <Settings size={28} />
                User Management
              </CardTitle>
              <motion.div variants={itemVariants}>
                <StyledButton
                  $variant="contained"
                  $color="primary"
                  onClick={() => fetchUsers()}
                  disabled={loading}
                >
                  Refresh Users
                </StyledButton>
              </motion.div>
            </CardHeader>
            <CardContent>
              <TabContainer>
                <TabBar role="tablist" aria-label="user management tabs">
                  {tabs.map((tab) => (
                    <TabButton
                      key={tab.index}
                      $active={tabValue === tab.index}
                      onClick={() => handleTabChange(tab.index)}
                      role="tab"
                      aria-selected={tabValue === tab.index}
                      aria-controls={`user-tabpanel-${tab.index}`}
                      id={`user-tab-${tab.index}`}
                    >
                      {getTabIcon(tab.index)}
                      {tab.label}
                    </TabButton>
                  ))}
                </TabBar>
              </TabContainer>

              <TabPanel value={tabValue} index={tabValue}>
                {loading ? (
                  <LoadingContainer>
                    <LoadingSpinner />
                  </LoadingContainer>
                ) : (
                  <StyledTableContainer>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="users table">
                      <thead>
                        <StyledTableHead>
                          <StyledTableHeadCell>Name</StyledTableHeadCell>
                          <StyledTableHeadCell>Email</StyledTableHeadCell>
                          <StyledTableHeadCell>Username</StyledTableHeadCell>
                          <StyledTableHeadCell>Role</StyledTableHeadCell>
                          <StyledTableHeadCell>Status</StyledTableHeadCell>
                          <StyledTableHeadCell $align="right">Actions</StyledTableHeadCell>
                        </StyledTableHead>
                      </thead>
                      <tbody>
                        {paginatedUsers.length > 0 ? (
                          paginatedUsers.map((user) => (
                            <StyledTableRow key={user.id}>
                              <StyledTableCell>
                                {user.firstName} {user.lastName}
                              </StyledTableCell>
                              <StyledTableCell>{user.email}</StyledTableCell>
                              <StyledTableCell>{user.username}</StyledTableCell>
                              <StyledTableCell>
                                <RoleChip $role={user.role}>
                                  {user.role.toUpperCase()}
                                </RoleChip>
                              </StyledTableCell>
                              <StyledTableCell>
                                <StatusChip $active={user.isActive}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </StatusChip>
                              </StyledTableCell>
                              <StyledTableCell $align="right">
                                <IconButtonContainer>
                                  {/* Edit user button */}
                                  <StyledIconButton
                                    $btnColor="primary"
                                    onClick={() => handleEditUser(user)}
                                    title="Edit user"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Edit size={16} />
                                  </StyledIconButton>

                                  {/* Promote to client button - only for regular users */}
                                  {user.role === 'user' && (
                                    <StyledIconButton
                                      $btnColor="success"
                                      onClick={() => handlePromoteToClient(user)}
                                      title="Promote to client"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <UserPlus size={16} />
                                    </StyledIconButton>
                                  )}

                                  {/* Promote to admin button - for non-admin users */}
                                  {user.role !== 'admin' && (
                                    <StyledIconButton
                                      $btnColor="error"
                                      onClick={() => handlePromoteToAdmin(user)}
                                      title="Promote to admin"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Key size={16} />
                                    </StyledIconButton>
                                  )}
                                </IconButtonContainer>
                              </StyledTableCell>
                            </StyledTableRow>
                          ))
                        ) : (
                          <tr>
                            <StyledTableCell colSpan={6}>
                              <EmptyStateContainer>
                                <EmptyStateIcon>
                                  <User size={48} />
                                </EmptyStateIcon>
                                <EmptyStateText>
                                  No users found in this category
                                </EmptyStateText>
                              </EmptyStateContainer>
                            </StyledTableCell>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </StyledTableContainer>
                )}

                {/* Custom Pagination */}
                <PaginationBar>
                  <span>Rows per page:</span>
                  <PaginationSelect
                    value={rowsPerPage}
                    onChange={handleChangeRowsPerPage}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </PaginationSelect>
                  <span>
                    {filteredUsers.length > 0
                      ? `${startRow}-${endRow} of ${filteredUsers.length}`
                      : '0 of 0'}
                  </span>
                  <PaginationButton
                    disabled={page === 0}
                    onClick={() => handleChangePage(page - 1)}
                    title="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </PaginationButton>
                  <PaginationButton
                    disabled={page >= totalPages - 1}
                    onClick={() => handleChangePage(page + 1)}
                    title="Next page"
                  >
                    <ChevronRight size={18} />
                  </PaginationButton>
                </PaginationBar>
              </TabPanel>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* Edit User Dialog */}
      <ModalOverlay $open={openEditDialog} onClick={() => setOpenEditDialog(false)}>
        <ModalPanel $maxWidth="560px" onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            <Edit size={20} />
            <h3>Edit User</h3>
          </ModalTitle>
          <ModalContent>
            <FormGrid $columns={2} $gap="1rem">
              <FormField>
                <FormLabel htmlFor="edit-firstName">First Name</FormLabel>
                <FormInput
                  id="edit-firstName"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditFormChange}
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="edit-lastName">Last Name</FormLabel>
                <FormInput
                  id="edit-lastName"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditFormChange}
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-email">Email</FormLabel>
                <FormInput
                  id="edit-email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-role">Role</FormLabel>
                <FormSelect
                  id="edit-role"
                  name="role"
                  value={editFormData.role}
                  onChange={handleEditFormChange}
                >
                  <option value="user">User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </FormSelect>
              </FormField>

              {/* Client-specific fields - shown only when role is 'client' */}
              {editFormData.role === 'client' && (
                <>
                  <FormDivider>Client Details</FormDivider>
                  <FormField $fullWidth>
                    <FormLabel htmlFor="edit-fitnessGoal">Fitness Goal</FormLabel>
                    <FormSelect
                      id="edit-fitnessGoal"
                      name="fitnessGoal"
                      value={editFormData.fitnessGoal}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select a goal</option>
                      <option value="weight-loss">Weight Loss</option>
                      <option value="muscle-gain">Muscle Gain</option>
                      <option value="endurance">Endurance</option>
                      <option value="flexibility">Flexibility</option>
                      <option value="general-fitness">General Fitness</option>
                      <option value="sports-specific">Sports Specific</option>
                      <option value="other">Other</option>
                    </FormSelect>
                  </FormField>
                  <FormField $fullWidth>
                    <FormLabel htmlFor="edit-trainingExperience">Training Experience</FormLabel>
                    <FormSelect
                      id="edit-trainingExperience"
                      name="trainingExperience"
                      value={editFormData.trainingExperience}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select experience level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="professional">Professional</option>
                    </FormSelect>
                  </FormField>
                  <FormField $fullWidth>
                    <FormLabel htmlFor="edit-availableSessions">Available Sessions</FormLabel>
                    <FormInput
                      id="edit-availableSessions"
                      name="availableSessions"
                      type="number"
                      min={0}
                      value={editFormData.availableSessions}
                      onChange={handleEditFormChange}
                    />
                  </FormField>
                </>
              )}
            </FormGrid>
          </ModalContent>
          <ModalActions>
            <StyledButton
              $variant="outlined"
              onClick={() => setOpenEditDialog(false)}
            >
              Cancel
            </StyledButton>
            <StyledButton
              $variant="contained"
              $color="primary"
              onClick={handleSaveUser}
            >
              Save Changes
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Admin Code Dialog */}
      <ModalOverlay $open={openAdminCodeDialog} onClick={() => setOpenAdminCodeDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            <Lock size={20} style={{ color: '#ff416c' }} />
            <h3>Admin Authorization</h3>
          </ModalTitle>
          <ModalContent>
            <ModalSubText>
              Enter the admin access code to promote {selectedUser?.firstName} {selectedUser?.lastName} to admin role.
              This will grant them full system access.
            </ModalSubText>
            <FormField>
              <FormLabel htmlFor="admin-code">Admin Access Code</FormLabel>
              <FormInput
                id="admin-code"
                type="password"
                autoFocus
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
            </FormField>
          </ModalContent>
          <ModalActions>
            <StyledButton
              $variant="outlined"
              onClick={() => setOpenAdminCodeDialog(false)}
            >
              Cancel
            </StyledButton>
            <StyledButton
              $variant="contained"
              $color="error"
              onClick={handleAdminCodeSubmit}
            >
              Authorize
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Promote to Client Dialog */}
      <ModalOverlay $open={openPromoteDialog} onClick={() => setOpenPromoteDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            <ShieldCheck size={20} style={{ color: '#00bf8f' }} />
            <h3>Promote to Client</h3>
          </ModalTitle>
          <ModalContent>
            <ModalSubText>
              Promote {selectedUser?.firstName} {selectedUser?.lastName} to client status.
              Enter the number of available training sessions to assign.
            </ModalSubText>
            <FormField>
              <FormLabel htmlFor="promote-sessions">Available Sessions</FormLabel>
              <FormInput
                id="promote-sessions"
                type="number"
                autoFocus
                min={0}
                value={editFormData.availableSessions}
                onChange={(e) => setEditFormData({ ...editFormData, availableSessions: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </ModalContent>
          <ModalActions>
            <StyledButton
              $variant="outlined"
              onClick={() => setOpenPromoteDialog(false)}
            >
              Cancel
            </StyledButton>
            <StyledButton
              $variant="contained"
              $color="success"
              onClick={handlePromoteClientSubmit}
            >
              Promote
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>
    </PageContainer>
  );
};

export default EnhancedUserManagementView;
