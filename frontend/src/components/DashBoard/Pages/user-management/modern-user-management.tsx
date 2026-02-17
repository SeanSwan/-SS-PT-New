import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";

// Icons (lucide-react)
import {
  ShieldCheck,
  User,
  Edit,
  UserPlus,
  Shield,
  Users,
  Dumbbell,
  CheckCircle2,
  Lock,
} from 'lucide-react';

// Styled Components
import {
  PageContainer,
  ContentContainer,
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  StyledTableRow,
  StyledTableCell,
  StyledTableHead,
  StyledTableHeadCell,
  StyledButton,
  IconButtonContainer,
  StyledIconButton,
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  containerVariants,
  itemVariants,
  // New styled components replacing MUI
  ModalOverlay,
  ModalPanel,
  ModalTitle,
  ModalContent as ModalContentStyled,
  ModalActions,
  GlassPanel,
  ContentGrid,
  FlexRow,
  FlexCol,
  DescriptionBox,
  SectionTitle,
  BodyText,
  UserName,
  UserMeta,
  ModalSubText,
  FormGrid,
  FormField,
  FormLabel,
  FormInput,
  FormSelect,
  FeatureItem,
  SubTitle,
} from './styled-user-management';

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

  // Handle select change for forms
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Handle boolean conversion for isActive
    let processedValue: string | boolean = value;
    if (name === 'isActive') {
      processedValue = value === 'true';
    }
    setEditFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
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
          <StyledCard as={motion.div} {...itemVariants}>
            <CardHeader>
              <CardTitle>
                <ShieldCheck size={28} />
                User Management System
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Description */}
              <DescriptionBox>
                <BodyText>
                  This dashboard allows you to manage all users in the system, including clients, trainers, and administrators.
                  You can view, edit, and manage permissions for all users from this central location.
                </BodyText>
              </DescriptionBox>

              {/* Main Content Grid */}
              <ContentGrid>
                {/* Left Column: User List */}
                <motion.div variants={itemVariants}>
                  <GlassPanel>
                    <SectionTitle>Sample User List</SectionTitle>

                    <BodyText $muted style={{ marginBottom: '1.5rem' }}>
                      Below is a representation of the user management interface. When fully implemented, you'll be able to:
                    </BodyText>

                    {loading ? (
                      <LoadingContainer>
                        <LoadingSpinner />
                      </LoadingContainer>
                    ) : error ? (
                      <EmptyStateContainer>
                        <EmptyStateIcon>&#9888;&#65039;</EmptyStateIcon>
                        <EmptyStateText>{error}</EmptyStateText>
                        <StyledButton
                          $variant="contained"
                          onClick={fetchUsers}
                          style={{ marginTop: '1rem' }}
                        >
                          Retry
                        </StyledButton>
                      </EmptyStateContainer>
                    ) : (
                      <div>
                        {/* Real User List Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {users && users.length > 0 ? (
                              users.map(user => (
                                <StyledTableRow key={user.id}>
                                  <StyledTableCell style={{ paddingLeft: '0.5rem' }}>
                                    <FlexRow $gap="0.75rem">
                                      <User size={20} />
                                      <div>
                                        <UserName>{user.firstName} {user.lastName}</UserName>
                                        <br />
                                        <UserMeta>
                                          Role: {user.role} &bull; Status: {user.isActive ? 'Active' : 'Inactive'}
                                        </UserMeta>
                                      </div>
                                    </FlexRow>
                                  </StyledTableCell>
                                  <StyledTableCell $align="right">
                                    <StyledButton
                                      $variant="contained"
                                      $color="primary"
                                      $size="small"
                                      onClick={() => handleEditUser(user)}
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
                                  <StyledTableCell style={{ paddingLeft: '0.5rem' }}>
                                    <FlexRow $gap="0.75rem">
                                      <User size={20} />
                                      <div>
                                        <UserName>Admin User</UserName>
                                        <br />
                                        <UserMeta>
                                          Role: admin &bull; Status: Active
                                        </UserMeta>
                                      </div>
                                    </FlexRow>
                                  </StyledTableCell>
                                  <StyledTableCell $align="right">
                                    <StyledButton
                                      $variant="contained"
                                      $color="primary"
                                      $size="small"
                                      onClick={() => {}}
                                    >
                                      Edit
                                    </StyledButton>
                                  </StyledTableCell>
                                </StyledTableRow>
                                <StyledTableRow>
                                  <StyledTableCell style={{ paddingLeft: '0.5rem' }}>
                                    <FlexRow $gap="0.75rem">
                                      <User size={20} />
                                      <div>
                                        <UserName>Trainer User</UserName>
                                        <br />
                                        <UserMeta>
                                          Role: trainer &bull; Status: Active
                                        </UserMeta>
                                      </div>
                                    </FlexRow>
                                  </StyledTableCell>
                                  <StyledTableCell $align="right">
                                    <StyledButton
                                      $variant="contained"
                                      $color="primary"
                                      $size="small"
                                      onClick={() => {}}
                                    >
                                      Edit
                                    </StyledButton>
                                  </StyledTableCell>
                                </StyledTableRow>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </GlassPanel>
                </motion.div>

                {/* Right Column: Features & Admin Tools */}
                <div>
                  {/* User Management Features */}
                  <motion.div variants={itemVariants}>
                    <GlassPanel $mb="1.5rem">
                      <SectionTitle>User Management Features</SectionTitle>

                      <FlexCol $gap="0.75rem">
                        <FeatureItem>
                          <CheckCircle2 size={20} color="#22c55e" />
                          View all users by role
                        </FeatureItem>

                        <FeatureItem>
                          <CheckCircle2 size={20} color="#22c55e" />
                          Edit user details
                        </FeatureItem>

                        <FeatureItem>
                          <CheckCircle2 size={20} color="#22c55e" />
                          Promote users to client
                        </FeatureItem>

                        <FeatureItem>
                          <CheckCircle2 size={20} color="#22c55e" />
                          Manage admin permissions
                        </FeatureItem>
                      </FlexCol>
                    </GlassPanel>
                  </motion.div>

                  {/* Admin Tools */}
                  <motion.div variants={itemVariants}>
                    <GlassPanel>
                      <SectionTitle>Admin Tools</SectionTitle>

                      <FlexCol $gap="0.75rem">
                        <StyledButton
                          $fullWidth
                          $variant="contained"
                          $color="primary"
                          onClick={handleAddUser}
                        >
                          <UserPlus size={18} />
                          Add New User
                        </StyledButton>

                        <StyledButton
                          $fullWidth
                          $variant="outlined"
                          onClick={handleShowPermissions}
                        >
                          <Shield size={18} />
                          User Permissions
                        </StyledButton>

                        <StyledButton
                          $fullWidth
                          $variant="outlined"
                          $color="error"
                          onClick={handleShowSecuritySettings}
                        >
                          <Lock size={18} />
                          Security Settings
                        </StyledButton>
                      </FlexCol>
                    </GlassPanel>
                  </motion.div>
                </div>
              </ContentGrid>
            </CardContent>
          </StyledCard>
        </motion.div>
      </ContentContainer>

      {/* Add User Dialog */}
      <ModalOverlay $open={isAddUserModalOpen} onClick={() => setIsAddUserModalOpen(false)}>
        <ModalPanel $maxWidth="600px" onClick={e => e.stopPropagation()}>
          <ModalTitle>
            <UserPlus size={22} />
            <h3>Add New User</h3>
          </ModalTitle>
          <ModalContentStyled>
            <ModalSubText>
              Create a new user account. The user will receive a welcome email with instructions to set their password.
            </ModalSubText>

            <FormGrid $columns={2} $gap="1rem">
              <FormField>
                <FormLabel htmlFor="add-firstName">First Name *</FormLabel>
                <FormInput
                  id="add-firstName"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditFormChange}
                  required
                  placeholder="First Name"
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="add-lastName">Last Name *</FormLabel>
                <FormInput
                  id="add-lastName"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditFormChange}
                  required
                  placeholder="Last Name"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="add-email">Email *</FormLabel>
                <FormInput
                  id="add-email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  required
                  placeholder="Email"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="add-username">Username *</FormLabel>
                <FormInput
                  id="add-username"
                  name="username"
                  value={editFormData.username}
                  onChange={handleEditFormChange}
                  required
                  placeholder="Username"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="add-role">Role</FormLabel>
                <FormSelect
                  id="add-role"
                  name="role"
                  value={editFormData.role}
                  onChange={handleSelectChange}
                >
                  <option value="user">Regular User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Administrator</option>
                </FormSelect>
              </FormField>
            </FormGrid>
          </ModalContentStyled>
          <ModalActions>
            <StyledButton $variant="outlined" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </StyledButton>
            <StyledButton $variant="contained" $color="success" onClick={handleCreateUser}>
              Create User
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Edit User Dialog */}
      <ModalOverlay $open={isEditModalOpen} onClick={() => setIsEditModalOpen(false)}>
        <ModalPanel $maxWidth="600px" onClick={e => e.stopPropagation()}>
          <ModalTitle>
            <Edit size={22} />
            <h3>Edit User</h3>
          </ModalTitle>
          <ModalContentStyled>
            <FormGrid $columns={2} $gap="1rem">
              <FormField>
                <FormLabel htmlFor="edit-firstName">First Name</FormLabel>
                <FormInput
                  id="edit-firstName"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditFormChange}
                  placeholder="First Name"
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="edit-lastName">Last Name</FormLabel>
                <FormInput
                  id="edit-lastName"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditFormChange}
                  placeholder="Last Name"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-email">Email</FormLabel>
                <FormInput
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  placeholder="Email"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-username">Username</FormLabel>
                <FormInput
                  id="edit-username"
                  name="username"
                  value={editFormData.username}
                  onChange={handleEditFormChange}
                  disabled
                  placeholder="Username"
                />
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-role">Role</FormLabel>
                <FormSelect
                  id="edit-role"
                  name="role"
                  value={editFormData.role}
                  onChange={handleSelectChange}
                >
                  <option value="user">Regular User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Administrator</option>
                </FormSelect>
              </FormField>
              <FormField $fullWidth>
                <FormLabel htmlFor="edit-isActive">Status</FormLabel>
                <FormSelect
                  id="edit-isActive"
                  name="isActive"
                  value={String(editFormData.isActive)}
                  onChange={handleSelectChange}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </FormSelect>
              </FormField>
            </FormGrid>
          </ModalContentStyled>
          <ModalActions>
            <StyledButton $variant="outlined" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </StyledButton>
            <StyledButton $variant="contained" $color="primary" onClick={handleSaveUser}>
              Save Changes
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Permissions Dialog */}
      <ModalOverlay $open={isPermissionsModalOpen} onClick={() => setIsPermissionsModalOpen(false)}>
        <ModalPanel $maxWidth="900px" onClick={e => e.stopPropagation()}>
          <ModalTitle>
            <Shield size={22} />
            <h3>User Permissions</h3>
          </ModalTitle>
          <ModalContentStyled>
            <ModalSubText>
              Manage what different user roles can access in the system. Changes will affect all users with the selected role.
            </ModalSubText>

            <div style={{ marginBottom: '2rem' }}>
              <SectionTitle>Role Permissions</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <StyledTableHead>
                    <StyledTableHeadCell>Permission</StyledTableHeadCell>
                    <StyledTableHeadCell $align="center">Admin</StyledTableHeadCell>
                    <StyledTableHeadCell $align="center">Trainer</StyledTableHeadCell>
                    <StyledTableHeadCell $align="center">Client</StyledTableHeadCell>
                    <StyledTableHeadCell $align="center">User</StyledTableHeadCell>
                  </StyledTableHead>
                </thead>
                <tbody>
                  <StyledTableRow>
                    <StyledTableCell>View Dashboard</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <StyledTableCell>Manage Users</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <StyledTableCell>Create Sessions</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <StyledTableCell>Book Sessions</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <StyledTableCell>Access Reports</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">&check;</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                    <StyledTableCell $align="center">-</StyledTableCell>
                  </StyledTableRow>
                </tbody>
              </table>
            </div>
          </ModalContentStyled>
          <ModalActions>
            <StyledButton onClick={() => setIsPermissionsModalOpen(false)}>
              Close
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Security Settings Dialog */}
      <ModalOverlay $open={isSecurityModalOpen} onClick={() => setIsSecurityModalOpen(false)}>
        <ModalPanel $maxWidth="600px" onClick={e => e.stopPropagation()}>
          <ModalTitle>
            <Lock size={22} />
            <h3>Security Settings</h3>
          </ModalTitle>
          <ModalContentStyled>
            <ModalSubText>
              Configure security settings for the user management system.
            </ModalSubText>

            <SubTitle>Password Policy</SubTitle>
            <div style={{ marginBottom: '1.5rem' }}>
              <FormField $fullWidth>
                <FormLabel htmlFor="sec-pwd-length">Minimum Password Length</FormLabel>
                <FormSelect id="sec-pwd-length" defaultValue="8">
                  <option value="6">6 characters</option>
                  <option value="8">8 characters</option>
                  <option value="10">10 characters</option>
                  <option value="12">12 characters</option>
                </FormSelect>
              </FormField>

              <FormField $fullWidth>
                <FormLabel htmlFor="sec-pwd-complex">Password Complexity</FormLabel>
                <FormSelect id="sec-pwd-complex" defaultValue="medium">
                  <option value="low">Low (letters only)</option>
                  <option value="medium">Medium (letters + numbers)</option>
                  <option value="high">High (letters + numbers + symbols)</option>
                </FormSelect>
              </FormField>
            </div>

            <SubTitle>Account Security</SubTitle>
            <div>
              <FormField $fullWidth>
                <FormLabel htmlFor="sec-timeout">Session Timeout</FormLabel>
                <FormSelect id="sec-timeout" defaultValue="30">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </FormSelect>
              </FormField>

              <FormField $fullWidth>
                <FormLabel htmlFor="sec-attempts">Failed Login Attempts</FormLabel>
                <FormSelect id="sec-attempts" defaultValue="5">
                  <option value="3">3 attempts</option>
                  <option value="5">5 attempts</option>
                  <option value="10">10 attempts</option>
                </FormSelect>
              </FormField>
            </div>
          </ModalContentStyled>
          <ModalActions>
            <StyledButton $variant="outlined" onClick={() => setIsSecurityModalOpen(false)}>
              Cancel
            </StyledButton>
            <StyledButton $variant="contained" $color="primary">
              Save Settings
            </StyledButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>
    </PageContainer>
  );
};

export default ModernUserManagementSystem;
