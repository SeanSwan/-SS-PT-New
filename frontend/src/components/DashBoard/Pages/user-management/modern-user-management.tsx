import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from "../../../../hooks/use-toast";
import GlowButton from '../../../ui/buttons/GlowButton';

// Icons (lucide-react)
import {
  ShieldCheck,
  User,
  Edit,
  UserPlus,
  Shield,
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
  CompactTableCell,
  StyledButton,
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
  UserManagementTable,
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
  IntroBodyText,
  UserName,
  UserMeta,
  ModalSubText,
  PermissionsSection,
  RetryActionWrap,
  SettingsGroup,
  FormGrid,
  FormField,
  FormLabel,
  FormInput,
  FormSelect,
  SetupLinkCheckbox,
  SetupLinkResult,
  SetupLinkToggle,
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

interface SetupLinkHandoff {
  credentialAction?: 'setup_link_sent' | 'setup_link_ready' | string;
  resetEmailSent?: boolean;
  emailSent?: boolean;
  resetUrl?: string;
  resetExpiresAt?: string;
  expiresInMinutes?: number;
}

interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as ApiErrorLike;
    return maybeError.response?.data?.message || maybeError.message || fallback;
  }

  return fallback;
};

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
  const [createdSetupLink, setCreatedSetupLink] = useState<SetupLinkHandoff | null>(null);

  // Form state
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'user' as User['role'],
    isActive: true,
    sendSetupLink: true,
  });

  // Filter defaults stay centralized until the search/filter controls are restored.
  const searchTerm = '';
  const roleFilter = 'all';

  // Apply filters to users
  const applyFilters = useCallback((userList: User[], term: string, role: string) => {
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
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      setError(getApiErrorMessage(err, 'Error connecting to the server'));
      toast({
        title: "Error",
        description: "Could not load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [applyFilters, authAxios, roleFilter, searchTerm, toast]);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update filters when search term or role filter changes
  useEffect(() => {
    applyFilters(users, searchTerm, roleFilter);
  }, [applyFilters, searchTerm, roleFilter, users]);

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      isActive: user.isActive,
      sendSetupLink: false,
    });
    setIsEditModalOpen(true);
  };

  // Handle edit form change
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setEditFormData(prev => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  // Handle save user changes
  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const { password, sendSetupLink, ...updatePayload } = editFormData;
      const response = await authAxios.put(`/api/auth/users/${selectedUser.id}`, updatePayload);

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
    } catch (err: unknown) {
      console.error('Error updating user:', err);
      toast({
        title: "Error",
        description: getApiErrorMessage(err, 'Error updating user'),
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
      password: '',
      role: 'user',
      isActive: true,
      sendSetupLink: true,
    });
    setCreatedSetupLink(null);
    setIsAddUserModalOpen(true);
  };

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setCreatedSetupLink(null);
  };

  // Handle create new user
  const handleCreateUser = async () => {
    try {
      setCreatedSetupLink(null);

      if (!editFormData.sendSetupLink && !editFormData.password) {
        throw new Error('Temporary password is required for backend account creation');
      }

      const createPayload = {
        ...editFormData,
        password: editFormData.sendSetupLink ? '' : editFormData.password,
      };

      const response = await authAxios.post('/api/auth/user', createPayload);

      if (response.data && response.data.success) {
        const setupLinkData = response.data?.data as SetupLinkHandoff | undefined;
        const credentialAction = setupLinkData?.credentialAction;
        const setupLinkReady = credentialAction === 'setup_link_ready';
        const setupLinkSent = credentialAction === 'setup_link_sent';

        if (setupLinkData) {
          setCreatedSetupLink(setupLinkData);
        } else {
          setCreatedSetupLink(null);
        }

        toast({
          title: "Success",
          description: setupLinkReady
            ? "User created. Email delivery failed, so copy the setup link below."
            : setupLinkSent
              ? "User created and setup link sent. Copy the link below if they need a manual handoff."
              : "New user created successfully",
        });
        fetchUsers();

        if (editFormData.sendSetupLink && setupLinkData?.resetUrl) {
          return;
        }

        setIsAddUserModalOpen(false);
      } else {
        throw new Error(response.data?.message || 'Failed to create user');
      }
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      toast({
        title: "Error",
        description: getApiErrorMessage(err, 'Error creating user'),
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
        <div>
          {/* Main User Management Card */}
          <StyledCard>
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
                <div>
                  <GlassPanel>
                    <SectionTitle>User Directory</SectionTitle>

                    <IntroBodyText $muted>
                      User records come from the protected admin user API.
                    </IntroBodyText>

                    {loading ? (
                      <LoadingContainer>
                        <LoadingSpinner />
                      </LoadingContainer>
                    ) : error ? (
                      <EmptyStateContainer>
                        <EmptyStateIcon>&#9888;&#65039;</EmptyStateIcon>
                        <EmptyStateText>{error}</EmptyStateText>
                        <RetryActionWrap>
                          <GlowButton
                            variant="cosmic"
                            size="small"
                            onClick={fetchUsers}
                          >
                            Retry
                          </GlowButton>
                        </RetryActionWrap>
                      </EmptyStateContainer>
                    ) : (
                      <div>
                        {/* Real User List Table */}
                        <UserManagementTable>
                          <tbody>
                            {filteredUsers && filteredUsers.length > 0 ? (
                              filteredUsers.map(user => (
                                <StyledTableRow key={user.id}>
                                  <CompactTableCell>
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
                                  </CompactTableCell>
                                  <StyledTableCell $align="right">
                                    <GlowButton
                                      variant="cosmic"
                                      size="small"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      Edit
                                    </GlowButton>
                                  </StyledTableCell>
                                </StyledTableRow>
                              ))
                            ) : null}
                          </tbody>
                        </UserManagementTable>
                        {(!filteredUsers || filteredUsers.length === 0) && (
                          <EmptyStateContainer>
                            <EmptyStateIcon>
                              <User size={28} />
                            </EmptyStateIcon>
                            <EmptyStateText>
                              No users were returned by the admin user API.
                            </EmptyStateText>
                          </EmptyStateContainer>
                        )}
                      </div>
                    )}
                  </GlassPanel>
                </div>

                {/* Right Column: Features & Admin Tools */}
                <div>
                  {/* User Management Features */}
                  <div>
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
                  </div>

                  {/* Admin Tools */}
                  <div>
                    <GlassPanel>
                      <SectionTitle>Admin Tools</SectionTitle>

                      <FlexCol $gap="0.75rem">
                        <GlowButton
                          fullWidth
                          variant="cosmic"
                          size="medium"
                          leftIcon={<UserPlus size={18} />}
                          onClick={handleAddUser}
                        >
                          Add New User
                        </GlowButton>

                        <GlowButton
                          fullWidth
                          variant="cosmic"
                          size="medium"
                          leftIcon={<Shield size={18} />}
                          onClick={handleShowPermissions}
                        >
                          User Permissions
                        </GlowButton>

                        <GlowButton
                          fullWidth
                          variant="ruby"
                          size="medium"
                          leftIcon={<Lock size={18} />}
                          onClick={handleShowSecuritySettings}
                        >
                          Security Settings
                        </GlowButton>
                      </FlexCol>
                    </GlassPanel>
                  </div>
                </div>
              </ContentGrid>
            </CardContent>
          </StyledCard>
        </div>
      </ContentContainer>

      {/* Add User Dialog */}
      <ModalOverlay $open={isAddUserModalOpen} onClick={closeAddUserModal}>
        <ModalPanel $maxWidth="600px" onClick={e => e.stopPropagation()}>
          <ModalTitle>
            <UserPlus size={22} />
            <h3>Add New User</h3>
          </ModalTitle>
          <ModalContentStyled>
            <ModalSubText>
              Invite the user with a setup link so they set their own password before signing in.
            </ModalSubText>

            {createdSetupLink && (
              <SetupLinkResult>
                <SectionTitle>Setup Link Ready</SectionTitle>
                <ModalSubText>
                  {createdSetupLink.credentialAction === 'setup_link_sent'
                    ? 'Email was sent. Keep this copy available in case they need a manual handoff.'
                    : 'Email delivery needs manual handoff. Copy this link and send it directly to the user.'}{' '}
                  {createdSetupLink.expiresInMinutes
                    ? `Expires in ${createdSetupLink.expiresInMinutes} minutes.`
                    : 'Use it before it expires.'}
                </ModalSubText>
                {createdSetupLink.resetUrl && (
                  <FormField $fullWidth>
                    <FormLabel htmlFor="add-setupLink">Setup Link</FormLabel>
                    <FormInput id="add-setupLink" value={createdSetupLink.resetUrl} readOnly onFocus={e => e.currentTarget.select()} />
                  </FormField>
                )}
              </SetupLinkResult>
            )}

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
              <SetupLinkToggle htmlFor="add-sendSetupLink">
                <SetupLinkCheckbox
                  id="add-sendSetupLink"
                  name="sendSetupLink"
                  type="checkbox"
                  checked={editFormData.sendSetupLink}
                  onChange={handleEditFormChange}
                />
                <div>
                  <BodyText>Send setup link instead of temporary password</BodyText>
                  <ModalSubText>
                    Recommended for administrators and trainers. The account is created, then the user chooses their own password from the secure link.
                  </ModalSubText>
                </div>
              </SetupLinkToggle>
              <FormField $fullWidth>
                <FormLabel htmlFor="add-password">
                  {editFormData.sendSetupLink ? 'Manual Password' : 'Manual Password *'}
                </FormLabel>
                <FormInput
                  id="add-password"
                  name="password"
                  type="password"
                  value={editFormData.password}
                  onChange={handleEditFormChange}
                  disabled={editFormData.sendSetupLink}
                  required={!editFormData.sendSetupLink}
                  placeholder={editFormData.sendSetupLink ? 'Setup link lets them choose a password' : 'Set an initial password'}
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
            {createdSetupLink ? (
              <StyledButton $variant="contained" $color="success" onClick={closeAddUserModal}>
                Done
              </StyledButton>
            ) : (
              <>
                <StyledButton $variant="outlined" onClick={closeAddUserModal}>
                  Cancel
                </StyledButton>
                <StyledButton $variant="contained" $color="success" onClick={handleCreateUser}>
                  Create User
                </StyledButton>
              </>
            )}
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

            <PermissionsSection>
              <SectionTitle>Role Permissions</SectionTitle>
              <UserManagementTable>
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
              </UserManagementTable>
            </PermissionsSection>
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
            <SettingsGroup $mb="1.5rem">
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
            </SettingsGroup>

            <SubTitle>Account Security</SubTitle>
            <SettingsGroup>
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
            </SettingsGroup>
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
