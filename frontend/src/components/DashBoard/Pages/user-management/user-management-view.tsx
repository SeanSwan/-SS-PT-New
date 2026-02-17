import React, { useState, useEffect, Suspense, lazy } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Edit, UserPlus, Key, Lock, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

// Import fallback component
const UserManagementFallback = lazy(() => import('./fallback-view'));

// Import Auth Context
import { useAuth } from '../../../../context/AuthContext';

// project imports
import { gridSpacing } from '../../../../store/constant';
import MainCard from '../../../../components/ui/MainCard';

// ─── Galaxy-Swan Theme Tokens ──────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgSurface: 'rgba(15,23,42,0.7)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  glass: 'rgba(15,23,42,0.6)',
  blur: 'blur(12px)',
};

// ─── Keyframes ─────────────────────────────────────────────────────
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

// ─── Styled Components ─────────────────────────────────────────────

const PageGrid = styled.div<{ $gap?: number }>`
  display: grid;
  gap: ${({ $gap }) => ($gap ?? 2) * 8}px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
  border-bottom: 1px solid ${theme.border};
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.border};
    border-radius: 2px;
  }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  background: ${({ $active }) => ($active ? `rgba(14,165,233,0.15)` : 'transparent')};
  color: ${({ $active }) => ($active ? theme.accent : theme.textMuted)};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};
  transition: all 0.2s ease;
  border-radius: 4px 4px 0 0;

  &:hover {
    background: rgba(14,165,233,0.1);
    color: ${theme.accent};
  }

  &:focus-visible {
    outline: 2px solid ${theme.accent};
    outline-offset: -2px;
  }
`;

const TabPanelWrapper = styled.div`
  padding: 16px 0;
  animation: ${slideIn} 0.2s ease;
`;

const GlassPanel = styled.div`
  background: ${theme.glass};
  backdrop-filter: ${theme.blur};
  -webkit-backdrop-filter: ${theme.blur};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  overflow: hidden;
  margin-top: 16px;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
  color: ${theme.text};
`;

const StyledThead = styled.thead`
  background: rgba(14,165,233,0.08);
`;

const StyledTh = styled.th<{ $align?: string }>`
  padding: 14px 16px;
  text-align: ${({ $align }) => $align || 'left'};
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${theme.textMuted};
  border-bottom: 1px solid ${theme.border};
`;

const StyledTbody = styled.tbody``;

const StyledTr = styled.tr`
  transition: background 0.15s ease;
  &:hover {
    background: rgba(14,165,233,0.06);
  }
  &:not(:last-child) td {
    border-bottom: 1px solid rgba(14,165,233,0.08);
  }
`;

const StyledTd = styled.td<{ $align?: string }>`
  padding: 12px 16px;
  text-align: ${({ $align }) => $align || 'left'};
  font-size: 0.875rem;
  color: ${theme.text};
`;

interface ChipVariant {
  $variant?: 'default' | 'success' | 'error' | 'warning';
}

const chipColors: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  success: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  error: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
};

const RoleChip = styled.span<ChipVariant>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: ${({ $variant }) => chipColors[$variant || 'default'].bg};
  color: ${({ $variant }) => chipColors[$variant || 'default'].text};
  border: 1px solid ${({ $variant }) => chipColors[$variant || 'default'].border};
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
`;

const RoundButton = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${theme.border};
  background: transparent;
  color: ${({ $color }) => $color || theme.accent};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14,165,233,0.12);
    border-color: ${theme.borderHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.accent};
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: ${theme.textMuted};
`;

const PaginationSelect = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  background: ${theme.bgSurface};
  backdrop-filter: ${theme.blur};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.85rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${theme.accent};
    outline-offset: 2px;
  }

  option {
    background: ${theme.bg};
    color: ${theme.text};
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: transparent;
  color: ${({ $disabled }) => ($disabled ? 'rgba(148,163,184,0.3)' : theme.accent)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14,165,233,0.12);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// ─── Modal / Dialog ────────────────────────────────────────────────

const ModalOverlay = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.15s ease;
`;

const ModalPanel = styled.div<{ $maxWidth?: string }>`
  position: relative;
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth || '480px'};
  max-height: 90vh;
  overflow-y: auto;
  background: ${theme.bg};
  backdrop-filter: ${theme.blur};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  animation: ${slideIn} 0.2s ease;
  margin: 16px;
`;

const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px 12px;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${theme.text};
`;

const ModalContent = styled.div`
  padding: 8px 24px 16px;
  color: ${theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.6;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 24px 20px;
`;

// ─── Form Elements ─────────────────────────────────────────────────

const FormGrid = styled.div<{ $columns?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns || 1}, 1fr);
  gap: ${({ $gap }) => ($gap ?? 2) * 8}px;
  margin-top: 8px;
`;

const FieldGroup = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $span }) => $span && css`grid-column: span ${$span};`}
`;

const FieldLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const StyledInput = styled.input`
  min-height: 44px;
  padding: 10px 14px;
  background: ${theme.bgSurface};
  backdrop-filter: ${theme.blur};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.accent};
    box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
  }

  &::placeholder {
    color: rgba(148,163,184,0.5);
  }
`;

const StyledSelect = styled.select`
  min-height: 44px;
  padding: 10px 14px;
  background: ${theme.bgSurface};
  backdrop-filter: ${theme.blur};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${theme.accent};
    box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
  }

  option {
    background: ${theme.bg};
    color: ${theme.text};
  }
`;

const SectionDivider = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${theme.border};
  }

  span {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${theme.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
`;

// ─── Buttons ───────────────────────────────────────────────────────

const ActionButton = styled.button<{ $variant?: 'primary' | 'error' | 'success' | 'ghost' }>`
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.accent};
          color: #fff;
          &:hover { background: ${theme.accentHover}; }
        `;
      case 'error':
        return css`
          background: ${theme.error};
          color: #fff;
          &:hover { background: #dc2626; }
        `;
      case 'success':
        return css`
          background: ${theme.success};
          color: #fff;
          &:hover { background: #16a34a; }
        `;
      default:
        return css`
          background: transparent;
          color: ${theme.textMuted};
          border-color: ${theme.border};
          &:hover {
            background: rgba(14,165,233,0.08);
            color: ${theme.text};
          }
        `;
    }
  }}

  &:focus-visible {
    outline: 2px solid ${theme.accent};
    outline-offset: 2px;
  }
`;

// ─── Snackbar / Toast ──────────────────────────────────────────────

const ToastContainer = styled.div<{ $open?: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1400;
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  animation: ${slideIn} 0.25s ease;
`;

const severityMap: Record<string, { bg: string; border: string; accent: string }> = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', accent: '#22c55e' },
  error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', accent: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', accent: '#f59e0b' },
  info:    { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)', accent: '#0ea5e9' },
};

const AlertBox = styled.div<{ $severity?: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  backdrop-filter: ${theme.blur};
  min-width: 280px;
  max-width: 420px;
  background: ${({ $severity }) => severityMap[$severity || 'info'].bg};
  border: 1px solid ${({ $severity }) => severityMap[$severity || 'info'].border};
  color: ${({ $severity }) => severityMap[$severity || 'info'].accent};
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
`;

const EmptyRow = styled.td`
  padding: 40px 16px;
  text-align: center;
  color: ${theme.textMuted};
  font-size: 0.9rem;
`;

const DialogDescription = styled.p`
  margin: 0 0 8px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${theme.textMuted};
`;

// ─── Types ─────────────────────────────────────────────────────────

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
        <TabPanelWrapper>
          {children}
        </TabPanelWrapper>
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

  // Auto-dismiss alert
  useEffect(() => {
    if (!openAlert) return;
    const timer = setTimeout(() => setOpenAlert(false), 6000);
    return () => clearTimeout(timer);
  }, [openAlert]);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle tab change
  const handleTabChange = (newValue: number) => {
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
      [name]: value
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

  // Get role chip variant
  const getRoleChipVariant = (role: string): ChipVariant['$variant'] => {
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
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  const tabLabels = ['All Users', 'Clients', 'Trainers', 'Admins', 'Regular Users'];

  return (
    <MainCard title="User Management">
      <PageGrid $gap={gridSpacing}>
        <div>
          <TabBar role="tablist" aria-label="user management tabs">
            {tabLabels.map((label, idx) => (
              <TabButton
                key={label}
                role="tab"
                $active={tabValue === idx}
                aria-selected={tabValue === idx}
                aria-controls={`user-tabpanel-${idx}`}
                id={`user-tab-${idx}`}
                onClick={() => handleTabChange(idx)}
              >
                {label}
              </TabButton>
            ))}
          </TabBar>

          <TabPanel value={tabValue} index={tabValue}>
            <GlassPanel>
              <div style={{ overflowX: 'auto' }}>
                <StyledTable aria-label="users table">
                  <StyledThead>
                    <tr>
                      <StyledTh>Name</StyledTh>
                      <StyledTh>Email</StyledTh>
                      <StyledTh>Username</StyledTh>
                      <StyledTh>Role</StyledTh>
                      <StyledTh>Status</StyledTh>
                      <StyledTh $align="right">Actions</StyledTh>
                    </tr>
                  </StyledThead>
                  <StyledTbody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <StyledTr key={user.id}>
                          <StyledTd>
                            {user.firstName} {user.lastName}
                          </StyledTd>
                          <StyledTd>{user.email}</StyledTd>
                          <StyledTd>{user.username}</StyledTd>
                          <StyledTd>
                            <RoleChip $variant={getRoleChipVariant(user.role)}>
                              {user.role.toUpperCase()}
                            </RoleChip>
                          </StyledTd>
                          <StyledTd>
                            <RoleChip $variant={user.isActive ? 'success' : 'default'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </RoleChip>
                          </StyledTd>
                          <StyledTd $align="right">
                            <ActionsRow>
                              {/* Edit user button */}
                              <RoundButton
                                $color={theme.accent}
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                <Edit />
                              </RoundButton>

                              {/* Promote to client button - only for regular users */}
                              {user.role === 'user' && (
                                <RoundButton
                                  $color={theme.success}
                                  onClick={() => handlePromoteToClient(user)}
                                  title="Promote to client"
                                >
                                  <UserPlus />
                                </RoundButton>
                              )}

                              {/* Promote to admin button - for non-admin users */}
                              {user.role !== 'admin' && (
                                <RoundButton
                                  $color={theme.error}
                                  onClick={() => handlePromoteToAdmin(user)}
                                  title="Promote to admin"
                                >
                                  <Key />
                                </RoundButton>
                              )}
                            </ActionsRow>
                          </StyledTd>
                        </StyledTr>
                      ))
                    ) : (
                      <tr>
                        <EmptyRow colSpan={6}>
                          {loading ? 'Loading users...' : 'No users found'}
                        </EmptyRow>
                      </tr>
                    )}
                  </StyledTbody>
                </StyledTable>
              </div>
            </GlassPanel>

            <PaginationBar>
              <span>Rows per page:</span>
              <PaginationSelect
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </PaginationSelect>
              <span>
                {filteredUsers.length === 0
                  ? '0 of 0'
                  : `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of ${filteredUsers.length}`}
              </span>
              <PaginationButton
                $disabled={page === 0}
                onClick={() => handleChangePage(page - 1)}
                title="Previous page"
              >
                <ChevronLeft />
              </PaginationButton>
              <PaginationButton
                $disabled={page >= totalPages - 1}
                onClick={() => handleChangePage(page + 1)}
                title="Next page"
              >
                <ChevronRight />
              </PaginationButton>
            </PaginationBar>
          </TabPanel>
        </div>
      </PageGrid>

      {/* Edit User Dialog */}
      <ModalOverlay $open={openEditDialog} onClick={() => setOpenEditDialog(false)}>
        <ModalPanel $maxWidth="560px" onClick={(e) => e.stopPropagation()}>
          <ModalTitle>Edit User</ModalTitle>
          <ModalContent>
            <FormGrid $columns={2} $gap={2}>
              <FieldGroup>
                <FieldLabel htmlFor="edit-firstName">First Name</FieldLabel>
                <StyledInput
                  id="edit-firstName"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditFormChange}
                  placeholder="First name"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="edit-lastName">Last Name</FieldLabel>
                <StyledInput
                  id="edit-lastName"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditFormChange}
                  placeholder="Last name"
                />
              </FieldGroup>
              <FieldGroup $span={2}>
                <FieldLabel htmlFor="edit-email">Email</FieldLabel>
                <StyledInput
                  id="edit-email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  placeholder="Email address"
                />
              </FieldGroup>
              <FieldGroup $span={2}>
                <FieldLabel htmlFor="edit-role">Role</FieldLabel>
                <StyledSelect
                  id="edit-role"
                  name="role"
                  value={editFormData.role}
                  onChange={handleEditFormChange}
                >
                  <option value="user">User</option>
                  <option value="client">Client</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </StyledSelect>
              </FieldGroup>

              {/* Client-specific fields - shown only when role is 'client' */}
              {editFormData.role === 'client' && (
                <>
                  <SectionDivider>
                    <span>Client Details</span>
                  </SectionDivider>
                  <FieldGroup $span={2}>
                    <FieldLabel htmlFor="edit-fitnessGoal">Fitness Goal</FieldLabel>
                    <StyledSelect
                      id="edit-fitnessGoal"
                      name="fitnessGoal"
                      value={editFormData.fitnessGoal}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select a goal...</option>
                      <option value="weight-loss">Weight Loss</option>
                      <option value="muscle-gain">Muscle Gain</option>
                      <option value="endurance">Endurance</option>
                      <option value="flexibility">Flexibility</option>
                      <option value="general-fitness">General Fitness</option>
                      <option value="sports-specific">Sports Specific</option>
                      <option value="other">Other</option>
                    </StyledSelect>
                  </FieldGroup>
                  <FieldGroup $span={2}>
                    <FieldLabel htmlFor="edit-trainingExperience">Training Experience</FieldLabel>
                    <StyledSelect
                      id="edit-trainingExperience"
                      name="trainingExperience"
                      value={editFormData.trainingExperience}
                      onChange={handleEditFormChange}
                    >
                      <option value="">Select experience...</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="professional">Professional</option>
                    </StyledSelect>
                  </FieldGroup>
                  <FieldGroup $span={2}>
                    <FieldLabel htmlFor="edit-availableSessions">Available Sessions</FieldLabel>
                    <StyledInput
                      id="edit-availableSessions"
                      name="availableSessions"
                      type="number"
                      min={0}
                      value={editFormData.availableSessions}
                      onChange={handleEditFormChange}
                    />
                  </FieldGroup>
                </>
              )}
            </FormGrid>
          </ModalContent>
          <ModalActions>
            <ActionButton onClick={() => setOpenEditDialog(false)}>Cancel</ActionButton>
            <ActionButton $variant="primary" onClick={handleSaveUser}>Save</ActionButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Admin Code Dialog */}
      <ModalOverlay $open={openAdminCodeDialog} onClick={() => setOpenAdminCodeDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            <Lock size={20} color={theme.error} />
            Admin Authorization
          </ModalTitle>
          <ModalContent>
            <DialogDescription>
              Enter the admin access code to promote {selectedUser?.firstName} {selectedUser?.lastName} to admin role.
              This will grant them full system access.
            </DialogDescription>
            <FieldGroup>
              <FieldLabel htmlFor="admin-code">Admin Access Code</FieldLabel>
              <StyledInput
                id="admin-code"
                type="password"
                autoFocus
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter access code"
              />
            </FieldGroup>
          </ModalContent>
          <ModalActions>
            <ActionButton onClick={() => setOpenAdminCodeDialog(false)}>Cancel</ActionButton>
            <ActionButton $variant="error" onClick={handleAdminCodeSubmit}>
              Authorize
            </ActionButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Promote to Client Dialog */}
      <ModalOverlay $open={openPromoteDialog} onClick={() => setOpenPromoteDialog(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalTitle>
            <ShieldCheck size={20} color={theme.success} />
            Promote to Client
          </ModalTitle>
          <ModalContent>
            <DialogDescription>
              Promote {selectedUser?.firstName} {selectedUser?.lastName} to client status.
              Enter the number of available training sessions to assign.
            </DialogDescription>
            <FieldGroup>
              <FieldLabel htmlFor="promote-sessions">Available Sessions</FieldLabel>
              <StyledInput
                id="promote-sessions"
                type="number"
                autoFocus
                min={0}
                value={editFormData.availableSessions}
                onChange={(e) => setEditFormData({ ...editFormData, availableSessions: parseInt(e.target.value) || 0 })}
                placeholder="Number of sessions"
              />
            </FieldGroup>
          </ModalContent>
          <ModalActions>
            <ActionButton onClick={() => setOpenPromoteDialog(false)}>Cancel</ActionButton>
            <ActionButton $variant="success" onClick={handlePromoteClientSubmit}>
              Promote
            </ActionButton>
          </ModalActions>
        </ModalPanel>
      </ModalOverlay>

      {/* Alert Toast */}
      <ToastContainer $open={openAlert}>
        <AlertBox $severity={alertMessage.severity} onClick={() => setOpenAlert(false)}>
          {alertMessage.message}
        </AlertBox>
      </ToastContainer>
    </MainCard>
  );
};

export default UserManagementView;
