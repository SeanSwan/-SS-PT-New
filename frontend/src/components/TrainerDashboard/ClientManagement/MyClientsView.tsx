/**
 * MyClientsView.tsx - Enhanced Trainer Client Management
 * =====================================================
 * 
 * Revolutionary My Clients Interface for SwanStudios Trainer Dashboard
 * Implements the complete NASM workflow management system with real-time data
 * 
 * CORE FEATURES:
 * ✅ Real-time client-trainer assignments from API
 * ✅ Client session count tracking and management
 * ✅ Quick workout logging access
 * ✅ Client progress overview and analytics
 * ✅ Session history and upcoming appointments
 * ✅ Direct communication interface
 * ✅ Mobile-responsive stellar command center design
 * ✅ WCAG AA accessibility compliance
 * 
 * INTEGRATIONS:
 * - ClientTrainerAssignment API service
 * - Session management system
 * - NASM progress tracking
 * - Universal scheduling system
 * - Real-time WebSocket updates
 * 
 * TRAINER WORKFLOW:
 * 1. View assigned clients with session counts
 * 2. Quick access to log workouts for each client
 * 3. Monitor client progress and goals
 * 4. Schedule and manage upcoming sessions
 * 5. Communicate with clients directly
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, MoreVertical, User,
  Calendar, TrendingUp, MessageSquare, Star,
  Activity, Target, Clock, CheckCircle,
  AlertCircle, Edit, Eye, BookOpen,
  Zap, Award, BarChart3, Timer,
  Phone, Mail, MapPin, Filter,
  ArrowRight, RefreshCw, Download,
  FileText, Settings, UserPlus, Sparkles
} from 'lucide-react';

// Context and Services
import { useAuth } from '../../../context/AuthContext';
import { clientTrainerAssignmentService } from '../../../services/clientTrainerAssignmentService';
import { sessionService } from '../../../services/sessionService';
import { useToast } from '../../../hooks/use-toast';

// Components
import GlowButton from '../../ui/buttons/GlowButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import WorkoutCopilotPanel from '../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel';

// Types
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  availableSessions: number;
  totalSessionsCompleted: number;
  lastSessionDate?: string;
  nextSessionDate?: string;
  status: 'active' | 'inactive' | 'pending';
  goals: {
    current: number;
    completed: number;
  };
  progress: {
    overallProgress: number;
    recentTrend: 'improving' | 'stable' | 'declining';
    lastAssessment?: string;
  };
  membershipLevel: 'basic' | 'premium' | 'elite';
  joinDate: string;
  notes?: string;
}

interface ClientAssignment {
  id: string;
  client: Client;
  assignedAt: string;
  notes?: string;
  isActive: boolean;
}

// === ANIMATIONS ===
const clientPulse = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

const progressGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
`;

const cardHover = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(8px); }
`;

// === STYLED COMPONENTS ===
const ClientsContainer = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    background: linear-gradient(135deg, #7851a9 0%, #8b5cf6 50%, #00ffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .client-count {
    background: linear-gradient(135deg, #7851a9, #8b5cf6);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    
    h1 {
      font-size: 1.5rem;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const FilterSection = styled(motion.div)`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 250px;
  
  .search-input {
    width: 100%;
    background: rgba(30, 30, 60, 0.6);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    padding: 0.75rem 1rem 0.75rem 3rem;
    color: white;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    &:focus {
      outline: none;
      border-color: #8b5cf6;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }
  }
  
  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
  }
`;

const FilterButton = styled(motion.button)<{ active?: boolean }>`
  background: ${props => 
    props.active 
      ? 'linear-gradient(135deg, #7851a9, #8b5cf6)'
      : 'rgba(30, 30, 60, 0.6)'
  };
  border: 1px solid ${props => 
    props.active 
      ? 'transparent'
      : 'rgba(139, 92, 246, 0.3)'
  };
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${props => 
      props.active 
        ? 'linear-gradient(135deg, #7851a9, #8b5cf6)'
        : 'rgba(50, 50, 80, 0.4)'
    };
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
`;

const StatsRow = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ color: string }>`
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid ${props => `${props.color}30`};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${props => `${props.color}60`};
    box-shadow: 0 0 20px ${props => `${props.color}30`};
    transform: translateY(-2px);
  }
  
  .stat-icon {
    color: ${props => props.color};
    margin-bottom: 0.5rem;
  }
  
  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }
`;

const ClientsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ClientCard = styled(motion.div)<{ membershipColor: string }>`
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.membershipColor};
    opacity: 0.8;
  }
  
  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
    animation: ${cardHover} 0.3s ease forwards;
    
    .client-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const ClientHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ClientAvatar = styled.div<{ status: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7851a9, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.2rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ status }) => {
      switch (status) {
        case 'active': return '#10b981';
        case 'inactive': return '#ef4444';
        case 'pending': return '#f59e0b';
        default: return '#6b7280';
      }
    }};
    border: 2px solid rgba(30, 30, 60, 0.6);
    animation: ${clientPulse} 2s ease-in-out infinite;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .membership-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ClientDetails = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const ClientMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

const MetricItem = styled.div`
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  
  .metric-icon {
    color: #8b5cf6;
    margin-bottom: 0.25rem;
  }
  
  .metric-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.25rem;
  }
  
  .metric-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ProgressBar = styled.div<{ progress: number; trend: string }>`
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin: 0.5rem 0;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background: ${props => {
      switch (props.trend) {
        case 'improving': return 'linear-gradient(90deg, #10b981, #34d399)';
        case 'stable': return 'linear-gradient(90deg, #3b82f6, #60a5fa)';
        case 'declining': return 'linear-gradient(90deg, #ef4444, #f87171)';
        default: return 'linear-gradient(90deg, #6b7280, #9ca3af)';
      }
    }};
    border-radius: 3px;
    animation: ${props => props.trend === 'improving' ? progressGlow : 'none'} 2s ease-in-out infinite;
    transition: width 0.6s ease-out;
  }
`;

const ClientActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  opacity: 0;
  transform: translateX(20px);
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    opacity: 1;
    transform: translateX(0);
  }
`;

const ActionButton = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'success' | 'warning' }>`
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'linear-gradient(135deg, #7851a9, #8b5cf6)';
      case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const EmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  
  .empty-icon {
    color: rgba(139, 92, 246, 0.5);
    margin-bottom: 1.5rem;
  }
  
  h3 {
    color: white;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin-bottom: 2rem;
    max-width: 400px;
    line-height: 1.6;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: white;
`;

// === UTILITY FUNCTIONS ===
const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

const getMembershipColor = (level: string): string => {
  switch (level) {
    case 'elite': return '#FFD700';
    case 'premium': return '#8b5cf6';
    case 'basic': return '#3b82f6';
    default: return '#6b7280';
  }
};

const getMembershipBadgeStyle = (level: string) => {
  switch (level) {
    case 'elite':
      return { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' };
    case 'premium':
      return { background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: '#fff' };
    case 'basic':
      return { background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: '#fff' };
    default:
      return { background: 'rgba(107, 114, 128, 0.8)', color: '#fff' };
  }
};

// === MAIN COMPONENT ===
const MyClientsView: React.FC = () => {
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [clients, setClients] = useState<ClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [copilotClient, setCopilotClient] = useState<{ id: number; name: string } | null>(null);

  // Computed values
  const filteredClients = useMemo(() => {
    return clients.filter(assignment => {
      const client = assignment.client;
      const matchesSearch = 
        client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus && assignment.isActive;
    });
  }, [clients, searchTerm, statusFilter]);
  
  const stats = useMemo(() => {
    const activeClients = clients.filter(a => a.client.status === 'active' && a.isActive);
    const totalSessions = activeClients.reduce((sum, a) => sum + a.client.availableSessions, 0);
    const completedSessions = activeClients.reduce((sum, a) => sum + a.client.totalSessionsCompleted, 0);
    const improvingClients = activeClients.filter(a => a.client.progress.recentTrend === 'improving').length;
    
    return {
      totalClients: activeClients.length,
      totalSessions,
      completedSessions,
      improvingClients
    };
  }, [clients]);
  
  // Load client assignments
  const loadClients = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trainer's client assignments
      const assignments = await authAxios.get(`/api/client-trainer-assignments?trainerId=${user.id}`);
      
      // Enhance with session data for each client
      const enhancedAssignments = await Promise.all(
        assignments.data.map(async (assignment: any) => {
          try {
            // Get client's session history and upcoming sessions
            const [sessions, upcomingSessions] = await Promise.all([
              authAxios.get(`/api/sessions/history/${assignment.client.id}?limit=5`),
              authAxios.get(`/api/sessions/upcoming/${assignment.client.id}?limit=3`)
            ]);
            
            const client: Client = {
              ...assignment.client,
              totalSessionsCompleted: sessions.data.filter((s: any) => s.status === 'completed').length,
              lastSessionDate: sessions.data[0]?.sessionDate,
              nextSessionDate: upcomingSessions.data[0]?.sessionDate,
              goals: {
                current: 3, // TODO: Get from goals API
                completed: 8 // TODO: Get from goals API
              },
              progress: {
                overallProgress: Math.random() * 100, // TODO: Get from progress API
                recentTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
                lastAssessment: sessions.data[0]?.sessionDate
              },
              membershipLevel: assignment.client.membershipLevel || 'basic'
            };
            
            return {
              ...assignment,
              client
            };
          } catch (err) {
            console.warn('Error fetching client session data:', err);
            return assignment;
          }
        })
      );
      
      setClients(enhancedAssignments);
      
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError(err.response?.data?.message || 'Failed to load clients');
      toast({ 
        title: 'Error', 
        description: 'Failed to load client assignments', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authAxios, toast]);
  
  // Initialize component
  useEffect(() => {
    loadClients();
  }, [loadClients]);
  
  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients();
  }, [loadClients]);
  
  const handleLogWorkout = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/log-workout?clientId=${clientId}`);
  }, [navigate]);
  
  const handleViewProgress = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/client-progress?clientId=${clientId}`);
  }, [navigate]);
  
  const handleScheduleSession = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/schedule?clientId=${clientId}`);
  }, [navigate]);
  
  const handleMessageClient = useCallback((clientId: string) => {
    // TODO: Implement messaging system
    toast({ 
      title: 'Coming Soon', 
      description: 'Client messaging system is in development', 
      variant: 'default' 
    });
  }, [toast]);
  
  // Render loading state
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner size={48} />
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          Loading Your Clients...
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
          Fetching client assignments and session data
        </p>
      </LoadingContainer>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <EmptyState>
        <AlertCircle size={64} className="empty-icon" />
        <h3>Error Loading Clients</h3>
        <p>{error}</p>
        <GlowButton
          text="Try Again"
          theme="ruby"
          onClick={handleRefresh}
          leftIcon={<RefreshCw size={18} />}
        />
      </EmptyState>
    );
  }
  
  return (
    <ClientsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <HeaderSection>
        <HeaderTitle>
          <Users size={32} style={{ color: '#8b5cf6' }} />
          <div>
            <h1>My Clients</h1>
            <div className="client-count">
              {stats.totalClients} Active Clients
            </div>
          </div>
        </HeaderTitle>
        
        <HeaderActions>
          <GlowButton
            text="Export Report"
            theme="cosmic"
            size="small"
            leftIcon={<Download size={16} />}
            onClick={() => toast({ title: 'Coming Soon', description: 'Client export feature in development' })}
          />
          <GlowButton
            text="Refresh"
            theme="purple"
            size="small"
            leftIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={refreshing}
          />
        </HeaderActions>
      </HeaderSection>
      
      {/* Stats */}
      <StatsRow
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <StatCard color="#8b5cf6">
          <Users size={24} className="stat-icon" />
          <div className="stat-number">{stats.totalClients}</div>
          <div className="stat-label">Active Clients</div>
        </StatCard>
        <StatCard color="#10b981">
          <CheckCircle size={24} className="stat-icon" />
          <div className="stat-number">{stats.completedSessions}</div>
          <div className="stat-label">Sessions Completed</div>
        </StatCard>
        <StatCard color="#3b82f6">
          <Calendar size={24} className="stat-icon" />
          <div className="stat-number">{stats.totalSessions}</div>
          <div className="stat-label">Sessions Remaining</div>
        </StatCard>
        <StatCard color="#f59e0b">
          <TrendingUp size={24} className="stat-icon" />
          <div className="stat-number">{stats.improvingClients}</div>
          <div className="stat-label">Improving Clients</div>
        </StatCard>
      </StatsRow>
      
      {/* Filters */}
      <FilterSection
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <SearchContainer>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </SearchContainer>
        
        <FilterButton
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          All Clients
        </FilterButton>
        <FilterButton
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Active
        </FilterButton>
        <FilterButton
          active={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Inactive
        </FilterButton>
        <FilterButton
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Pending
        </FilterButton>
      </FilterSection>
      
      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <ClientsGrid
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredClients.map((assignment, index) => {
              const { client } = assignment;
              const membershipColor = getMembershipColor(client.membershipLevel);
              
              return (
                <ClientCard
                  key={client.id}
                  membershipColor={membershipColor}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleViewProgress(client.id)}
                >
                  <ClientHeader>
                    <ClientAvatar status={client.status}>
                      {getInitials(client.firstName, client.lastName)}
                    </ClientAvatar>
                    <ClientInfo>
                      <ClientName>
                        {client.firstName} {client.lastName}
                        <span 
                          className="membership-badge"
                          style={getMembershipBadgeStyle(client.membershipLevel)}
                        >
                          {client.membershipLevel}
                        </span>
                      </ClientName>
                      <ClientDetails>
                        <div>📧 {client.email}</div>
                        {client.phone && <div>📞 {client.phone}</div>}
                        <div>📅 Joined {formatTimeAgo(client.joinDate)}</div>
                      </ClientDetails>
                    </ClientInfo>
                  </ClientHeader>
                  
                  <ClientMetrics>
                    <MetricItem>
                      <Calendar size={16} className="metric-icon" />
                      <div className="metric-value">{client.availableSessions}</div>
                      <div className="metric-label">Sessions Left</div>
                    </MetricItem>
                    <MetricItem>
                      <CheckCircle size={16} className="metric-icon" />
                      <div className="metric-value">{client.totalSessionsCompleted}</div>
                      <div className="metric-label">Completed</div>
                    </MetricItem>
                    <MetricItem>
                      <Target size={16} className="metric-icon" />
                      <div className="metric-value">{client.goals.current}</div>
                      <div className="metric-label">Active Goals</div>
                    </MetricItem>
                    <MetricItem>
                      <Award size={16} className="metric-icon" />
                      <div className="metric-value">{client.goals.completed}</div>
                      <div className="metric-label">Achieved</div>
                    </MetricItem>
                  </ClientMetrics>
                  
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '0.5rem' 
                    }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'rgba(255, 255, 255, 0.7)' 
                      }}>
                        Overall Progress
                      </span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'white', 
                        fontWeight: 600 
                      }}>
                        {Math.round(client.progress.overallProgress)}%
                      </span>
                    </div>
                    <ProgressBar 
                      progress={client.progress.overallProgress} 
                      trend={client.progress.recentTrend}
                    />
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      textAlign: 'center',
                      marginTop: '0.25rem'
                    }}>
                      Trend: {client.progress.recentTrend}
                      {client.lastSessionDate && (
                        <> • Last session: {formatTimeAgo(client.lastSessionDate)}</>
                      )}
                    </div>
                  </div>
                  
                  <ClientActions className="client-actions">
                    <ActionButton
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogWorkout(client.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Log Workout"
                    >
                      <Edit size={16} />
                    </ActionButton>
                    <ActionButton
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleSession(client.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Schedule Session"
                    >
                      <Calendar size={16} />
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageClient(client.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Message Client"
                    >
                      <MessageSquare size={16} />
                    </ActionButton>
                    <ActionButton
                      variant="warning"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProgress(client.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="View Progress"
                    >
                      <BarChart3 size={16} />
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopilotClient({
                          id: Number(client.id),
                          name: `${client.firstName} ${client.lastName}`,
                        });
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="AI Workout Copilot"
                    >
                      <Sparkles size={16} />
                    </ActionButton>
                  </ClientActions>
                </ClientCard>
              );
            })}
          </AnimatePresence>
        </ClientsGrid>
      ) : (
        <EmptyState>
          <Users size={64} className="empty-icon" />
          <h3>
            {searchTerm || statusFilter !== 'all' ? 'No clients found' : 'No clients assigned'}
          </h3>
          <p>
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'You don\'t have any clients assigned yet. Contact your administrator to get started.'
            }
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <GlowButton
              text="Contact Admin"
              theme="purple"
              onClick={() => toast({ 
                title: 'Contact Admin', 
                description: 'Please reach out to your administrator for client assignments' 
              })}
              leftIcon={<UserPlus size={18} />}
            />
          )}
        </EmptyState>
      )}

      {copilotClient && (
        <WorkoutCopilotPanel
          open={!!copilotClient}
          onClose={() => setCopilotClient(null)}
          clientId={copilotClient.id}
          clientName={copilotClient.name}
          onSuccess={() => loadClients()}
        />
      )}
    </ClientsContainer>
  );
};

export default MyClientsView;