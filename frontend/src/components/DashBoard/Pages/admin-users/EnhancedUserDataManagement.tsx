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
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Lucide icons
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Eye,
  UserPlus,
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  Filter,
  XCircle,
  CheckCircle,
  X as XIcon,
  AlertTriangle,
  Info,
  Settings,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Star,
  PersonStanding,
  Brain,
  Heart,
  MessageCircle,
  Bell,
  PieChart,
  Gauge,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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
    width: 3rem;
    height: 3rem;
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
    display: inline-block;

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

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;

  svg {
    position: absolute;
    left: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    width: 1.25rem;
    height: 1.25rem;
    pointer-events: none;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem 0.625rem 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:hover {
    border-color: #00ffff;
  }

  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
`;

const StyledSelect = styled.select`
  min-height: 44px;
  min-width: 120px;
  padding: 0.625rem 2rem 0.625rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #00ffff;
  }

  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  option {
    background: #1e293b;
    color: #ffffff;
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #3b82f6 0%, #00ffff 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
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

const StyledTableContainer = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  background: rgba(30, 58, 138, 0.2);
`;

const StyledTh = styled.th`
  color: #ffffff;
  font-weight: 600;
  text-align: left;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
`;

const StyledTr = styled.tr`
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
  }
`;

const StyledTd = styled.td`
  padding: 0.875rem 1rem;
  color: #e2e8f0;
  vertical-align: middle;
`;

const LoadingBar = styled.div`
  height: 4px;
  width: 100%;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 40%;
    background: #00ffff;
    border-radius: 2px;
    animation: loading-slide 1.2s ease-in-out infinite;
  }

  @keyframes loading-slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AvatarCircle = styled.div<{ $bgColor: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background-color: ${({ $bgColor }) => $bgColor};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserNameBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  color: #ffffff;
  font-weight: 500;
  font-size: 0.95rem;
`;

const UserHandle = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
`;

const ContactBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const ContactEmail = styled.span`
  color: #ffffff;
  font-size: 0.875rem;
`;

const ContactPhone = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
`;

const RoleChip = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: ${({ $color }) => $color};
  color: #ffffff;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  white-space: nowrap;
`;

const StatusChip = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: ${({ $color }) => $color};
  color: #ffffff;
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
`;

const DateText = styled.span`
  color: #ffffff;
  font-size: 0.875rem;
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const IconBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $color }) => $color || '#ffffff'};
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const EmptyText = styled.span`
  color: rgba(255, 255, 255, 0.6);
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(59, 130, 246, 0.3);
  color: #ffffff;
  font-size: 0.875rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const PaginationLabel = styled.span`
  color: rgba(255, 255, 255, 0.8);
`;

const PaginationSelect = styled.select`
  min-height: 36px;
  padding: 0.25rem 1.75rem 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.35rem center;
  outline: none;

  option {
    background: #1e293b;
    color: #ffffff;
  }
`;

const PaginationButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  svg {
    width: 1rem;
    height: 1rem;
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
      icon: <Users className="stat-icon" />,
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
      icon: <Dumbbell className="stat-icon" />,
      number: stats.potentialClients,
      label: 'Potential Clients',
      change: 'High conversion probability',
      changeType: 'positive'
    },
    {
      icon: <GraduationCap className="stat-icon" />,
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

  // Pagination helpers
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = page * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);

  return (
    <DashboardContainer>
      {/* Header Section */}
      <HeaderSection
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Enhanced User Data Management</h1>
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
            <SearchInputWrapper>
              <Search />
              <StyledInput
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchInputWrapper>

            <StyledSelect
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="client">Clients</option>
              <option value="trainer">Trainers</option>
              <option value="admin">Admins</option>
            </StyledSelect>

            <StyledSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </StyledSelect>
          </SearchSection>

          <ActionButton
            onClick={() => navigate('/dashboard/admin/user-onboarding')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus size={18} />
            Add User
          </ActionButton>

          <ActionButton
            onClick={fetchUsers}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} />
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

        <StyledTableContainer>
          <StyledTable>
            <StyledThead>
              <tr>
                <StyledTh>User</StyledTh>
                <StyledTh>Contact</StyledTh>
                <StyledTh>Role</StyledTh>
                <StyledTh>Status</StyledTh>
                <StyledTh>Joined</StyledTh>
                <StyledTh>Actions</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <StyledTd colSpan={6}>
                      <LoadingBar />
                    </StyledTd>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <StyledTd colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <EmptyText>
                      No users found matching your criteria
                    </EmptyText>
                  </StyledTd>
                </tr>
              ) : (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <StyledTr
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsModalOpen(true);
                      }}
                    >
                      <StyledTd>
                        <UserCell>
                          <AvatarCircle $bgColor={getRoleColor(user.role)}>
                            {user.photo ? (
                              <img src={user.photo} alt={`${user.firstName} ${user.lastName}`} />
                            ) : (
                              user.firstName?.[0]?.toUpperCase()
                            )}
                          </AvatarCircle>
                          <UserNameBlock>
                            <UserName>
                              {user.firstName} {user.lastName}
                            </UserName>
                            <UserHandle>
                              @{user.username}
                            </UserHandle>
                          </UserNameBlock>
                        </UserCell>
                      </StyledTd>
                      <StyledTd>
                        <ContactBlock>
                          <ContactEmail>
                            {user.email}
                          </ContactEmail>
                          {user.phone && (
                            <ContactPhone>
                              {user.phone}
                            </ContactPhone>
                          )}
                        </ContactBlock>
                      </StyledTd>
                      <StyledTd>
                        <RoleChip $color={getRoleColor(user.role)}>
                          {user.role.toUpperCase()}
                        </RoleChip>
                      </StyledTd>
                      <StyledTd>
                        <StatusChip $color={getStatusColor(user.isActive)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </StatusChip>
                      </StyledTd>
                      <StyledTd>
                        <DateText>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </DateText>
                      </StyledTd>
                      <StyledTd>
                        <ActionsCell>
                          <IconBtn
                            $color="#00ffff"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setUserDetailsModalOpen(true);
                            }}
                          >
                            <Eye />
                          </IconBtn>
                          <IconBtn
                            $color="#ffffff"
                            title="Edit User"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle edit
                            }}
                          >
                            <Pencil />
                          </IconBtn>
                          <IconBtn
                            $color="#8b5cf6"
                            title="Convert Role"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setRoleConversionModalOpen(true);
                            }}
                          >
                            <ArrowRightLeft />
                          </IconBtn>
                        </ActionsCell>
                      </StyledTd>
                    </StyledTr>
                  ))
              )}
            </tbody>
          </StyledTable>
        </StyledTableContainer>

        <PaginationBar>
          <PaginationLabel>Rows per page:</PaginationLabel>
          <PaginationSelect
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </PaginationSelect>
          <PaginationLabel>
            {filteredUsers.length === 0 ? '0 of 0' : `${startIndex + 1}-${endIndex} of ${filteredUsers.length}`}
          </PaginationLabel>
          <PaginationButton
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </PaginationButton>
          <PaginationButton
            disabled={page >= totalPages - 1}
            onClick={() => setPage((prev) => prev + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </PaginationButton>
        </PaginationBar>
      </DataTable>
    </DashboardContainer>
  );
};

export default EnhancedUserDataManagement;
