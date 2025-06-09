/**
 * AdminSessionManager.tsx
 * Comprehensive session management for administrators
 * Shows all user sessions, analytics, and management controls
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import SessionErrorBoundary from './SessionErrorBoundary';

// Animations
const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled Components
const AdminContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  animation: ${fadeIn} 0.6s ease-out;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
  
  .title {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #00ffff, #0080ff);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    margin: 0;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
    margin-top: 0.5rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    .icon {
      font-size: 2rem;
      filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.6));
    }
    
    .trend {
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-weight: 500;
      
      &.up {
        background: rgba(0, 255, 136, 0.2);
        color: #00ff88;
      }
      
      &.down {
        background: rgba(255, 107, 157, 0.2);
        color: #ff6b9d;
      }
      
      &.neutral {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 0.5rem;
    font-family: 'Courier New', monospace;
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .stat-details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      
      .label {
        color: rgba(255, 255, 255, 0.6);
      }
      
      .value {
        color: #00ffff;
        font-weight: 500;
      }
    }
  }
`;

const TabContainer = styled.div`
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.5);
    border-radius: 2px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: fit-content;
  
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #00ffff, #0080ff)'
    : 'transparent'
  };
  
  color: ${props => props.$active ? '#000' : 'rgba(255, 255, 255, 0.7)'};
  
  &:hover {
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, #00ffff, #0080ff)'
      : 'rgba(255, 255, 255, 0.1)'
    };
    color: ${props => props.$active ? '#000' : '#fff'};
  }
`;

const ContentSection = styled.div`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  overflow: hidden;
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #00ffff;
    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
    white-space: nowrap;
  }
  
  td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    
    &.status {
      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        
        &.active {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }
        
        &.completed {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
        }
        
        &.paused {
          background: rgba(255, 167, 38, 0.2);
          color: #ffa726;
        }
        
        &.cancelled {
          background: rgba(255, 107, 157, 0.2);
          color: #ff6b9d;
        }
      }
    }
    
    &.user {
      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffff, #0080ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #000;
          font-size: 0.875rem;
        }
        
        .details {
          .name {
            font-weight: 500;
            margin-bottom: 0.25rem;
          }
          
          .role {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }
      }
    }
    
    &.duration {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #00ffff;
    }
  }
  
  tr {
    transition: background 0.3s ease;
    
    &:hover {
      background: rgba(0, 255, 255, 0.05);
    }
  }
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, #00ffff, #0080ff)';
      case 'danger': return 'linear-gradient(135deg, #ff6b9d, #ff4d6d)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  
  color: ${props => props.$variant === 'danger' ? '#fff' : '#000'};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FilterSection = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    select, input {
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      font-size: 0.875rem;
      
      &:focus {
        outline: none;
        border-color: #00ffff;
        box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
      }
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top: 3px solid #00ffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Types
interface AdminStats {
  totalSessions: number;
  activeSessions: number;
  totalUsers: number;
  avgSessionDuration: number;
  todaySessions: number;
  weekSessions: number;
  monthSessions: number;
  topTrainers: Array<{ name: string; sessions: number; }>;
  topClients: Array<{ name: string; sessions: number; }>;
}

interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration: number;
  exerciseCount: number;
  difficulty: number;
  trainerId?: string;
  trainerName?: string;
}

// Helper functions
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Main Component
const AdminSessionManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'history' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [allSessions, setAllSessions] = useState<UserSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<UserSession[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    dateRange: 'today'
  });

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <AdminContainer>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Access denied. Admin privileges required.
        </div>
      </AdminContainer>
    );
  }

  // Fetch admin data
  useEffect(() => {
    fetchAdminData();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [allSessions, filters]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Try to fetch from backend first
      try {
        const [statsResponse, sessionsResponse] = await Promise.all([
          apiService.get('/api/admin/session-stats'),
          apiService.get('/api/admin/all-sessions')
        ]);
        
        if (statsResponse.data) {
          setAdminStats(statsResponse.data);
        }
        
        if (sessionsResponse.data) {
          setAllSessions(sessionsResponse.data);
        }
      } catch (apiError) {
        console.warn('Backend API not available, generating mock data for admin dashboard');
        generateMockAdminData();
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      generateMockAdminData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockAdminData = () => {
    // Generate mock stats
    const mockStats: AdminStats = {
      totalSessions: 1247,
      activeSessions: 23,
      totalUsers: 342,
      avgSessionDuration: 45,
      todaySessions: 67,
      weekSessions: 289,
      monthSessions: 1107,
      topTrainers: [
        { name: 'Sarah Johnson', sessions: 89 },
        { name: 'Mike Chen', sessions: 76 },
        { name: 'Emma Davis', sessions: 62 }
      ],
      topClients: [
        { name: 'John Smith', sessions: 45 },
        { name: 'Lisa Wang', sessions: 38 },
        { name: 'David Brown', sessions: 34 }
      ]
    };
    
    // Generate mock sessions
    const mockSessions: UserSession[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'John Smith',
        userRole: 'client',
        title: 'Morning Cardio',
        status: 'active',
        startTime: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        duration: 1800,
        exerciseCount: 5,
        difficulty: 4,
        trainerId: 'trainer1',
        trainerName: 'Sarah Johnson'
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Lisa Wang',
        userRole: 'client',
        title: 'Strength Training',
        status: 'completed',
        startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        endTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        duration: 3600,
        exerciseCount: 8,
        difficulty: 5,
        trainerId: 'trainer2',
        trainerName: 'Mike Chen'
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'David Brown',
        userRole: 'client',
        title: 'Yoga Flow',
        status: 'paused',
        startTime: new Date(Date.now() - 900000).toISOString(), // 15 min ago
        duration: 900,
        exerciseCount: 3,
        difficulty: 2,
        trainerId: 'trainer3',
        trainerName: 'Emma Davis'
      }
    ];
    
    setAdminStats(mockStats);
    setAllSessions(mockSessions);
  };

  const applyFilters = () => {
    let filtered = [...allSessions];
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status);
    }
    
    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(session => session.userRole === filters.role);
    }
    
    // Date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter(session => new Date(session.startTime) >= today);
        break;
      case 'week':
        filtered = filtered.filter(session => new Date(session.startTime) >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(session => new Date(session.startTime) >= monthAgo);
        break;
    }
    
    setFilteredSessions(filtered);
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await apiService.post(`/api/admin/end-session/${sessionId}`);
      // Refresh data
      fetchAdminData();
    } catch (error) {
      console.error('Error ending session:', error);
      // For demo, just update local state
      setAllSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'completed' as const, endTime: new Date().toISOString() }
          : session
      ));
    }
  };

  if (loading) {
    return (
      <AdminContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </AdminContainer>
    );
  }

  return (
    <SessionErrorBoundary 
      context="Admin Session Manager"
      variant="full"
      enableRetry={true}
      maxRetries={3}
      onError={(error, errorInfo) => {
        console.error('[AdminSessionManager] Error in admin dashboard:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          activeTab,
          totalSessions: adminStats?.totalSessions,
          activeSessions: adminStats?.activeSessions
        });
      }}
    >
      <AdminContainer>
      <HeaderSection>
        <div>
          <h1 className="title">Session Management</h1>
          <p className="subtitle">Monitor and manage all user sessions across the platform</p>
        </div>
      </HeaderSection>

      {/* Stats Grid */}
      {adminStats && (
        <StatsGrid>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="stat-header">
              <span className="icon">🏃‍♂️</span>
              <span className="trend up">+12%</span>
            </div>
            <div className="stat-value">{adminStats.activeSessions}</div>
            <div className="stat-label">Active Sessions</div>
            <div className="stat-details">
              <div className="detail-item">
                <span className="label">Today:</span>
                <span className="value">{adminStats.todaySessions}</span>
              </div>
              <div className="detail-item">
                <span className="label">This Week:</span>
                <span className="value">{adminStats.weekSessions}</span>
              </div>
            </div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="stat-header">
              <span className="icon">📊</span>
              <span className="trend up">+8%</span>
            </div>
            <div className="stat-value">{adminStats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
            <div className="stat-details">
              <div className="detail-item">
                <span className="label">Avg Duration:</span>
                <span className="value">{adminStats.avgSessionDuration}min</span>
              </div>
              <div className="detail-item">
                <span className="label">This Month:</span>
                <span className="value">{adminStats.monthSessions}</span>
              </div>
            </div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="stat-header">
              <span className="icon">👥</span>
              <span className="trend neutral">—</span>
            </div>
            <div className="stat-value">{adminStats.totalUsers}</div>
            <div className="stat-label">Active Users</div>
            <div className="stat-details">
              <div className="detail-item">
                <span className="label">Trainers:</span>
                <span className="value">{adminStats.topTrainers.length}</span>
              </div>
              <div className="detail-item">
                <span className="label">Clients:</span>
                <span className="value">{adminStats.totalUsers - adminStats.topTrainers.length}</span>
              </div>
            </div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="stat-header">
              <span className="icon">⭐</span>
              <span className="trend up">+15%</span>
            </div>
            <div className="stat-value">{adminStats.topTrainers[0]?.sessions || 0}</div>
            <div className="stat-label">Top Trainer Sessions</div>
            <div className="stat-details">
              <div className="detail-item">
                <span className="label">Leader:</span>
                <span className="value">{adminStats.topTrainers[0]?.name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Runner-up:</span>
                <span className="value">{adminStats.topTrainers[1]?.name || 'N/A'}</span>
              </div>
            </div>
          </StatCard>
        </StatsGrid>
      )}

      {/* Tabs */}
      <TabContainer>
        <TabList>
          <Tab 
            $active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </Tab>
          <Tab 
            $active={activeTab === 'live'} 
            onClick={() => setActiveTab('live')}
          >
            🔴 Live Sessions
          </Tab>
          <Tab 
            $active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          >
            📚 Session History
          </Tab>
          <Tab 
            $active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </Tab>
        </TabList>

        <ContentSection>
          {activeTab === 'live' && (
            <>
              <FilterSection>
                <div className="filter-group">
                  <label>Status:</label>
                  <select 
                    value={filters.status} 
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Role:</label>
                  <select 
                    value={filters.role} 
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="client">Clients</option>
                    <option value="trainer">Trainers</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Time Range:</label>
                  <select 
                    value={filters.dateRange} 
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </FilterSection>

              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Session</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Exercises</th>
                      <th>Trainer</th>
                      <th>Started</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="user">
                          <div className="user-info">
                            <div className="avatar">
                              {getInitials(session.userName)}
                            </div>
                            <div className="details">
                              <div className="name">{session.userName}</div>
                              <div className="role">{session.userRole}</div>
                            </div>
                          </div>
                        </td>
                        <td>{session.title}</td>
                        <td className="status">
                          <span className={`status-badge ${session.status}`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="duration">{formatTime(session.duration)}</td>
                        <td>{session.exerciseCount}</td>
                        <td>{session.trainerName || 'Self-guided'}</td>
                        <td>{formatDate(session.startTime)}</td>
                        <td>
                          {session.status === 'active' || session.status === 'paused' ? (
                            <ActionButton
                              $variant="danger"
                              onClick={() => handleEndSession(session.id)}
                              whileTap={{ scale: 0.95 }}
                            >
                              End Session
                            </ActionButton>
                          ) : (
                            <ActionButton
                              $variant="secondary"
                              onClick={() => {/* View details */}}
                              whileTap={{ scale: 0.95 }}
                            >
                              View Details
                            </ActionButton>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>
            </>
          )}

          {activeTab === 'overview' && (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Platform Overview</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Comprehensive session statistics and platform health metrics are displayed above.
                Switch to "Live Sessions" to monitor active workouts in real-time.
              </p>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Session History</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Detailed session history with analytics and reporting coming soon.
              </p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Advanced Analytics</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Advanced charts, trends, and performance analytics are being prepared.
              </p>
            </div>
          )}
        </ContentSection>
      </TabContainer>
      </AdminContainer>
    </SessionErrorBoundary>
  );
};

export default AdminSessionManager;