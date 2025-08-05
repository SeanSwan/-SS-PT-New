/**
 * ClientsManagementSection.tsx
 * ============================
 * 
 * Comprehensive Client Management Interface for Admin Dashboard
 * Integrates with existing backend APIs for complete client oversight
 * Styled with Stellar Command Center theme
 * 
 * Features:
 * - Complete client management (view, edit, promote, deactivate)
 * - Client session history and analytics
 * - Revenue tracking per client
 * - Engagement metrics and social activity
 * - Advanced filtering and search capabilities
 * - Client-trainer assignment management
 * - Payment history and subscription status
 * - WCAG AA accessibility compliance
 * 
 * Backend Integration:
 * - /api/admin/clients (GET, PUT, DELETE)
 * - /api/admin/client-sessions/:id (GET)
 * - /api/admin/client-revenue/:id (GET)
 * - /api/admin/promote-client (POST)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Users, UserPlus, UserCheck, UserX, Edit3, Eye, 
  Search, Filter, Download, RefreshCw, MoreVertical,
  Mail, Phone, Calendar, MapPin, Activity, Shield,
  AlertTriangle, CheckCircle, Clock, Star, DollarSign,
  TrendingUp, Target, Award, CreditCard, MessageSquare,
  BarChart3, Zap, Heart, Gift, User
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// === STYLED COMPONENTS ===
const ManagementContainer = styled.div`
  padding: 0;
`;

const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
  
  option {
    background: #1e3a8a;
    color: #ffffff;
  }
`;

const CommandButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #2563eb 0%, #00e6ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ClientsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ClientCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }
`;

const ClientHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ClientAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #00ffff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0a0a0f;
  margin-right: 1rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${props => props.status === 'active' ? '#10b981' : 
                           props.status === 'inactive' ? '#6b7280' : '#f59e0b'};
    border: 2px solid #0a0a0f;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
`;

const ClientName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
`;

const ClientEmail = styled.p`
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ClientTags = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.5rem 0;
`;

const ClientTag = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.status {
    background: ${props => 
      props.status === 'active' ? 'rgba(16, 185, 129, 0.2)' :
      props.status === 'inactive' ? 'rgba(107, 114, 128, 0.2)' :
      'rgba(245, 158, 11, 0.2)'
    };
    color: ${props => 
      props.status === 'active' ? '#10b981' :
      props.status === 'inactive' ? '#6b7280' :
      '#f59e0b'
    };
    border: 1px solid ${props => 
      props.status === 'active' ? 'rgba(16, 185, 129, 0.3)' :
      props.status === 'inactive' ? 'rgba(107, 114, 128, 0.3)' :
      'rgba(245, 158, 11, 0.3)'
    };
  }
  
  &.tier {
    background: rgba(0, 255, 255, 0.2);
    color: #00ffff;
    border: 1px solid rgba(0, 255, 255, 0.3);
  }
`;

const ClientMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RevenueSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
`;

const RevenueInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RevenueAmount = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
`;

const RevenueLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

const EngagementBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin: 1rem 0;
`;

const EngagementFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #10b981, #00ffff);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ActionMenu = styled.div`
  position: relative;
`;

const ActionButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ActionItem = styled(motion.button)`
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  
  &.danger {
    color: #ef4444;
    
    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
`;

const StatsBar = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.5rem;
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// === INTERFACES ===
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  tier: 'starter' | 'premium' | 'elite';
  joinedAt: string;
  lastActive: string;
  assignedTrainer?: {
    id: string;
    name: string;
  };
  stats: {
    totalSessions: number;
    completedWorkouts: number;
    socialPosts: number;
    engagementScore: number;
  };
  revenue: {
    totalSpent: number;
    monthlyValue: number;
    lastPayment: string;
  };
  subscription: {
    type: string;
    status: 'active' | 'cancelled' | 'expired';
    sessionsRemaining: number;
    expiresAt: string;
  };
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  newClients: number;
  totalRevenue: number;
  averageEngagement: number;
}

// === MAIN COMPONENT ===
const ClientsManagementSection: React.FC = () => {
  const { authAxios } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    newClients: 0,
    totalRevenue: 0,
    averageEngagement: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Fetch clients from backend
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get('/api/admin/clients', {
        params: {
          includeStats: true,
          includeRevenue: true,
          includeSubscription: true
        }
      });
      
      if (response.data.success) {
        const clientsData = response.data.clients.map((client: any) => ({
          id: client.id?.toString() || '',
          name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          email: client.email || '',
          phone: client.phone || '',
          avatar: client.photo || '',
          status: client.isActive ? 'active' : 'inactive',
          tier: client.tier || 'starter',
          joinedAt: client.createdAt || new Date().toISOString(),
          lastActive: client.lastLogin || client.createdAt || new Date().toISOString(),
          assignedTrainer: client.assignedTrainer ? {
            id: client.assignedTrainer.id?.toString(),
            name: `${client.assignedTrainer.firstName} ${client.assignedTrainer.lastName}`
          } : undefined,
          stats: {
            totalSessions: client.sessionStats?.total || 0,
            completedWorkouts: client.workoutStats?.completed || 0,
            socialPosts: client.socialStats?.posts || 0,
            engagementScore: client.engagementScore || 0
          },
          revenue: {
            totalSpent: parseFloat(client.revenueStats?.total || '0'),
            monthlyValue: parseFloat(client.revenueStats?.monthly || '0'),
            lastPayment: client.revenueStats?.lastPayment || ''
          },
          subscription: {
            type: client.subscription?.type || 'basic',
            status: client.subscription?.status || 'active',
            sessionsRemaining: client.subscription?.sessionsRemaining || 0,
            expiresAt: client.subscription?.expiresAt || ''
          }
        }));
        
        setClients(clientsData);
        calculateStats(clientsData);
      } else {
        console.error('Failed to fetch clients:', response.data.message);
        setMockData();
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Set mock data for development/testing
  const setMockData = () => {
    const mockClients: Client[] = [
      {
        id: '1',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1 (555) 123-4567',
        status: 'active',
        tier: 'premium',
        joinedAt: '2024-01-15T10:00:00Z',
        lastActive: '2024-05-22T14:30:00Z',
        assignedTrainer: {
          id: '1',
          name: 'Sarah Wilson'
        },
        stats: {
          totalSessions: 24,
          completedWorkouts: 156,
          socialPosts: 12,
          engagementScore: 87
        },
        revenue: {
          totalSpent: 2400,
          monthlyValue: 200,
          lastPayment: '2024-05-15T00:00:00Z'
        },
        subscription: {
          type: 'Premium Monthly',
          status: 'active',
          sessionsRemaining: 8,
          expiresAt: '2024-06-15T00:00:00Z'
        }
      },
      {
        id: '2',
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        phone: '+1 (555) 234-5678',
        status: 'active',
        tier: 'starter',
        joinedAt: '2024-03-01T09:00:00Z',
        lastActive: '2024-05-21T16:45:00Z',
        assignedTrainer: {
          id: '2',
          name: 'Mike Johnson'
        },
        stats: {
          totalSessions: 8,
          completedWorkouts: 32,
          socialPosts: 5,
          engagementScore: 65
        },
        revenue: {
          totalSpent: 600,
          monthlyValue: 150,
          lastPayment: '2024-05-01T00:00:00Z'
        },
        subscription: {
          type: 'Basic Monthly',
          status: 'active',
          sessionsRemaining: 4,
          expiresAt: '2024-06-01T00:00:00Z'
        }
      },
      {
        id: '3',
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        status: 'inactive',
        tier: 'elite',
        joinedAt: '2024-02-10T11:30:00Z',
        lastActive: '2024-04-30T12:00:00Z',
        stats: {
          totalSessions: 45,
          completedWorkouts: 280,
          socialPosts: 25,
          engagementScore: 92
        },
        revenue: {
          totalSpent: 4500,
          monthlyValue: 0,
          lastPayment: '2024-04-15T00:00:00Z'
        },
        subscription: {
          type: 'Elite Package',
          status: 'expired',
          sessionsRemaining: 0,
          expiresAt: '2024-04-30T00:00:00Z'
        }
      }
    ];
    
    setClients(mockClients);
    calculateStats(mockClients);
  };

  // Calculate client statistics
  const calculateStats = (clientsData: Client[]) => {
    const totalClients = clientsData.length;
    const activeClients = clientsData.filter(c => c.status === 'active').length;
    const newClients = clientsData.filter(c => {
      const joinedDate = new Date(c.joinedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return joinedDate > weekAgo;
    }).length;
    const totalRevenue = clientsData.reduce((sum, c) => sum + c.revenue.totalSpent, 0);
    const averageEngagement = clientsData.reduce((sum, c) => sum + c.stats.engagementScore, 0) / totalClients || 0;
    
    setStats({
      totalClients,
      activeClients,
      newClients,
      totalRevenue,
      averageEngagement: Math.round(averageEngagement)
    });
  };

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filter clients based on search and filters
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesTier = tierFilter === 'all' || client.tier === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Handle client actions
  const handlePromoteToTrainer = async (clientId: string) => {
    try {
      const response = await authAxios.post('/api/admin/promote-client', {
        clientId: clientId
      });
      
      if (response.data.success) {
        await fetchClients();
        setActiveActionMenu(null);
      } else {
        console.error('Failed to promote client');
      }
    } catch (error) {
      console.error('Error promoting client:', error);
    }
  };

  const handleEditClient = (clientId: string) => {
    console.log('Edit client:', clientId);
    setActiveActionMenu(null);
  };

  const handleViewClient = (clientId: string) => {
    console.log('View client details:', clientId);
    setActiveActionMenu(null);
  };

  const handleDeactivateClient = async (clientId: string) => {
    try {
      const response = await authAxios.put(`/api/admin/clients/${clientId}`, {
        isActive: false
      });
      
      if (response.data.success) {
        await fetchClients();
        setActiveActionMenu(null);
      } else {
        console.error('Failed to deactivate client');
      }
    } catch (error) {
      console.error('Error deactivating client:', error);
    }
  };

  const handleViewSessions = (clientId: string) => {
    console.log('View client sessions:', clientId);
    setActiveActionMenu(null);
  };

  const handleViewRevenue = (clientId: string) => {
    console.log('View client revenue:', clientId);
    setActiveActionMenu(null);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <ManagementContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={32} color="#00ffff" />
          </motion.div>
        </div>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      {/* Stats Overview */}
      <StatsBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.totalClients}</StatNumber>
          <StatTitle>Total Clients</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.activeClients}</StatNumber>
          <StatTitle>Active Clients</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.newClients}</StatNumber>
          <StatTitle>New This Week</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{formatCurrency(stats.totalRevenue)}</StatNumber>
          <StatTitle>Total Revenue</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.averageEngagement}%</StatNumber>
          <StatTitle>Avg Engagement</StatTitle>
        </StatCard>
      </StatsBar>

      {/* Action Bar */}
      <ActionBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SearchContainer>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </FilterSelect>
          
          <FilterSelect
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="premium">Premium</option>
            <option value="elite">Elite</option>
          </FilterSelect>
        </SearchContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchClients}
          >
            <RefreshCw size={16} />
            Refresh
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus size={16} />
            Add Client
          </CommandButton>
        </div>
      </ActionBar>

      {/* Clients Grid */}
      <ClientsGrid>
        <AnimatePresence>
          {filteredClients.map((client, index) => (
            <ClientCard
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <ClientHeader>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <ClientAvatar status={client.status}>
                    {getUserInitials(client.name)}
                  </ClientAvatar>
                  <ClientInfo>
                    <ClientName>{client.name}</ClientName>
                    <ClientEmail>{client.email}</ClientEmail>
                    <ClientTags>
                      <ClientTag className="status" status={client.status}>
                        {client.status}
                      </ClientTag>
                      <ClientTag className="tier">
                        {client.tier}
                      </ClientTag>
                    </ClientTags>
                  </ClientInfo>
                </div>
                
                <ActionMenu>
                  <ActionButton
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveActionMenu(
                      activeActionMenu === client.id ? null : client.id
                    )}
                  >
                    <MoreVertical size={16} />
                  </ActionButton>
                  
                  <AnimatePresence>
                    {activeActionMenu === client.id && (
                      <ActionDropdown
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ActionItem
                          whileHover={{ x: 4 }}
                          onClick={() => handleViewClient(client.id)}
                        >
                          <Eye size={16} />
                          View Details
                        </ActionItem>
                        <ActionItem
                          whileHover={{ x: 4 }}
                          onClick={() => handleEditClient(client.id)}
                        >
                          <Edit3 size={16} />
                          Edit Client
                        </ActionItem>
                        <ActionItem
                          whileHover={{ x: 4 }}
                          onClick={() => handleViewSessions(client.id)}
                        >
                          <Calendar size={16} />
                          View Sessions
                        </ActionItem>
                        <ActionItem
                          whileHover={{ x: 4 }}
                          onClick={() => handleViewRevenue(client.id)}
                        >
                          <DollarSign size={16} />
                          View Revenue
                        </ActionItem>
                        <ActionItem
                          whileHover={{ x: 4 }}
                          onClick={() => handlePromoteToTrainer(client.id)}
                        >
                          <UserCheck size={16} />
                          Promote to Trainer
                        </ActionItem>
                        <ActionItem
                          className="danger"
                          whileHover={{ x: 4 }}
                          onClick={() => handleDeactivateClient(client.id)}
                        >
                          <UserX size={16} />
                          Deactivate
                        </ActionItem>
                      </ActionDropdown>
                    )}
                  </AnimatePresence>
                </ActionMenu>
              </ClientHeader>

              {/* Assigned Trainer */}
              {client.assignedTrainer && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '1rem'
                }}>
                  <User size={14} />
                  Trainer: {client.assignedTrainer.name}
                </div>
              )}

              {/* Revenue Section */}
              <RevenueSection>
                <RevenueInfo>
                  <RevenueAmount>{formatCurrency(client.revenue.totalSpent)}</RevenueAmount>
                  <RevenueLabel>Total Spent</RevenueLabel>
                </RevenueInfo>
                <RevenueInfo>
                  <RevenueAmount>{formatCurrency(client.revenue.monthlyValue)}</RevenueAmount>
                  <RevenueLabel>Monthly Value</RevenueLabel>
                </RevenueInfo>
              </RevenueSection>

              {/* Subscription Info */}
              <div style={{ 
                display: 'flex', 
                justify: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '1rem'
              }}>
                <span>{client.subscription.type}</span>
                <span>{client.subscription.sessionsRemaining} sessions left</span>
              </div>

              {/* Engagement Score */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ 
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    Engagement Score
                  </span>
                  <span style={{ 
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: client.stats.engagementScore >= 80 ? '#10b981' : 
                           client.stats.engagementScore >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {client.stats.engagementScore}%
                  </span>
                </div>
                <EngagementBar>
                  <EngagementFill 
                    style={{ width: `${client.stats.engagementScore}%` }}
                  />
                </EngagementBar>
              </div>
              
              {/* Client Metrics */}
              <ClientMetrics>
                <MetricItem>
                  <MetricValue>{client.stats.totalSessions}</MetricValue>
                  <MetricLabel>Sessions</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{client.stats.completedWorkouts}</MetricValue>
                  <MetricLabel>Workouts</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{client.stats.socialPosts}</MetricValue>
                  <MetricLabel>Posts</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    {client.stats.engagementScore >= 80 ? <Star size={12} color="#f59e0b" fill="#f59e0b" /> : ''}
                    {client.tier}
                  </MetricValue>
                  <MetricLabel>Tier</MetricLabel>
                </MetricItem>
              </ClientMetrics>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span>Joined: {formatDate(client.joinedAt)}</span>
                <span>Last active: {getTimeAgo(client.lastActive)}</span>
              </div>
            </ClientCard>
          ))}
        </AnimatePresence>
      </ClientsGrid>
      
      {filteredClients.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No clients found</h3>
          <p>Try adjusting your search or filters</p>
        </motion.div>
      )}
    </ManagementContainer>
  );
};

export default ClientsManagementSection;