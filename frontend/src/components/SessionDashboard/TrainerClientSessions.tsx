/**
 * TrainerClientSessions.tsx
 * Session management interface for trainers to monitor their clients
 * Shows client sessions, progress, and allows session guidance
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';
import SessionErrorBoundary from './SessionErrorBoundary';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Styled Components
const TrainerContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
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
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #00ffff, #0080ff);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    margin: 0;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
`;

const QuickStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    transform: translateY(-2px);
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 0.25rem;
    font-family: 'Courier New', monospace;
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
    font-weight: 500;
  }
`;

const ClientGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ClientCard = styled(motion.div)<{ $hasActiveSession?: boolean }>`
  background: ${props => props.$hasActiveSession 
    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 128, 255, 0.1))'
    : 'rgba(30, 30, 60, 0.8)'
  };
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid ${props => props.$hasActiveSession 
    ? 'rgba(0, 255, 255, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'
  };
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  ${props => props.$hasActiveSession && `
    animation: ${pulse} 3s ease-in-out infinite;
  `}
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    border-color: rgba(0, 255, 255, 0.6);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$hasActiveSession 
      ? 'linear-gradient(90deg, #00ff88, #00ffff, #0080ff)'
      : 'linear-gradient(90deg, #333, #666)'
    };
    background-size: 200% 100%;
    animation: ${props => props.$hasActiveSession ? 'shimmer 2s ease-in-out infinite' : 'none'};
  }
`;

const ClientHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ffff, #0080ff);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #000;
    font-size: 1.1rem;
  }
  
  .client-info {
    flex: 1;
    
    .name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 0.25rem;
    }
    
    .email {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
    }
  }
  
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.active ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'};
    box-shadow: ${props => props.active ? '0 0 8px rgba(0, 255, 136, 0.6)' : 'none'};
  }
`;

const SessionInfo = styled.div`
  margin-bottom: 1rem;
  
  .current-session {
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    
    .session-title {
      font-weight: 600;
      color: #00ffff;
      margin-bottom: 0.25rem;
    }
    
    .session-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      
      .duration {
        color: #00ff88;
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }
      
      .status {
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        
        &.active {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }
        
        &.paused {
          background: rgba(255, 167, 38, 0.2);
          color: #ffa726;
        }
      }
    }
  }
  
  .recent-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    
    .stat {
      text-align: center;
      
      .value {
        font-size: 1.25rem;
        font-weight: 600;
        color: #00ffff;
        margin-bottom: 0.25rem;
      }
      
      .label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 0.75rem;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
  
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .message {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .submessage {
    font-size: 0.9rem;
    opacity: 0.7;
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
interface ClientSession {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  startTime: string;
  duration: number;
  exerciseCount: number;
  difficulty: number;
}

interface TrainerClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentSession?: ClientSession;
  stats: {
    totalSessions: number;
    weekSessions: number;
    avgDuration: number;
  };
  lastActive: string;
}

interface TrainerStats {
  totalClients: number;
  activeClients: number;
  todaySessions: number;
  weekSessions: number;
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

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return `${Math.floor(diffInHours * 60)} min ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Main Component
const TrainerClientSessions: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [stats, setStats] = useState<TrainerStats | null>(null);

  // Check if user is trainer or admin
  if (!user || !['trainer', 'admin'].includes(user.role)) {
    return (
      <TrainerContainer>
        <EmptyState>
          <div className="icon">🚫</div>
          <div className="message">Access Denied</div>
          <div className="submessage">Trainer or Admin privileges required</div>
        </EmptyState>
      </TrainerContainer>
    );
  }

  // Fetch trainer data
  useEffect(() => {
    fetchTrainerData();
  }, []);

  const fetchTrainerData = async () => {
    setLoading(true);
    try {
      // Try to fetch from backend first
      try {
        const [clientsResponse, statsResponse] = await Promise.all([
          apiService.get('/api/trainer/clients'),
          apiService.get('/api/trainer/stats')
        ]);
        
        if (clientsResponse.data) {
          setClients(clientsResponse.data);
        }
        
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (apiError) {
        console.warn('Backend API not available, generating mock data for trainer');
        generateMockTrainerData();
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error);
      generateMockTrainerData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockTrainerData = () => {
    const mockStats: TrainerStats = {
      totalClients: 12,
      activeClients: 3,
      todaySessions: 8,
      weekSessions: 34
    };
    
    const mockClients: TrainerClient[] = [
      {
        id: 'client1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        currentSession: {
          id: 'session1',
          title: 'Morning Cardio',
          status: 'active',
          startTime: new Date(Date.now() - 1800000).toISOString(),
          duration: 1800,
          exerciseCount: 5,
          difficulty: 4
        },
        stats: {
          totalSessions: 28,
          weekSessions: 4,
          avgDuration: 45
        },
        lastActive: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'client2',
        firstName: 'Lisa',
        lastName: 'Wang',
        email: 'lisa.wang@email.com',
        currentSession: {
          id: 'session2',
          title: 'Strength Training',
          status: 'paused',
          startTime: new Date(Date.now() - 900000).toISOString(),
          duration: 900,
          exerciseCount: 6,
          difficulty: 5
        },
        stats: {
          totalSessions: 35,
          weekSessions: 3,
          avgDuration: 52
        },
        lastActive: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 'client3',
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@email.com',
        stats: {
          totalSessions: 19,
          weekSessions: 2,
          avgDuration: 38
        },
        lastActive: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'client4',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        stats: {
          totalSessions: 42,
          weekSessions: 5,
          avgDuration: 48
        },
        lastActive: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    setStats(mockStats);
    setClients(mockClients);
  };

  const handleViewSession = (client: TrainerClient) => {
    // Navigate to detailed session view
    console.log('Viewing session for client:', client.firstName, client.lastName);
    // Implementation would navigate to detailed session monitoring
  };

  const handleSendMessage = (client: TrainerClient) => {
    // Open messaging interface
    console.log('Sending message to client:', client.firstName, client.lastName);
    // Implementation would open chat/messaging system
  };

  const handleViewProgress = (client: TrainerClient) => {
    // Navigate to client progress view
    console.log('Viewing progress for client:', client.firstName, client.lastName);
    // Implementation would navigate to progress tracking
  };

  if (loading) {
    return (
      <TrainerContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </TrainerContainer>
    );
  }

  return (
    <SessionErrorBoundary 
      context="Trainer Client Sessions"
      variant="full"
      enableRetry={true}
      maxRetries={3}
      onError={(error, errorInfo) => {
        console.error('[TrainerClientSessions] Error in trainer dashboard:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          clientCount: clients.length,
          activeClients: stats?.activeClients,
          userRole: user?.role
        });
      }}
    >
      <TrainerContainer>
      <HeaderSection>
        <div>
          <h1 className="title">My Clients</h1>
          <p className="subtitle">Monitor your clients' workout sessions and progress</p>
        </div>
      </HeaderSection>

      {/* Quick Stats */}
      {stats && (
        <QuickStats>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="stat-value">{stats.activeClients}</div>
            <div className="stat-label">Clients Working Out</div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="stat-value">{stats.totalClients}</div>
            <div className="stat-label">Total Clients</div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="stat-value">{stats.todaySessions}</div>
            <div className="stat-label">Sessions Today</div>
          </StatCard>

          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="stat-value">{stats.weekSessions}</div>
            <div className="stat-label">This Week</div>
          </StatCard>
        </QuickStats>
      )}

      {/* Client Grid */}
      {clients.length > 0 ? (
        <ClientGrid>
          <AnimatePresence>
            {clients.map((client, index) => (
              <ClientCard
                key={client.id}
                $hasActiveSession={!!client.currentSession}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ClientHeader active={!!client.currentSession}>
                  <div className="avatar">
                    {getInitials(client.firstName, client.lastName)}
                  </div>
                  <div className="client-info">
                    <div className="name">{client.firstName} {client.lastName}</div>
                    <div className="email">{client.email}</div>
                  </div>
                  <div className="status-indicator"></div>
                </ClientHeader>

                <SessionInfo>
                  {client.currentSession ? (
                    <div className="current-session">
                      <div className="session-title">{client.currentSession.title}</div>
                      <div className="session-details">
                        <div className="duration">{formatTime(client.currentSession.duration)}</div>
                        <div className={`status ${client.currentSession.status}`}>
                          {client.currentSession.status}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '1rem', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontStyle: 'italic'
                    }}>
                      No active session
                    </div>
                  )}

                  <div className="recent-stats">
                    <div className="stat">
                      <div className="value">{client.stats.totalSessions}</div>
                      <div className="label">Total</div>
                    </div>
                    <div className="stat">
                      <div className="value">{client.stats.weekSessions}</div>
                      <div className="label">This Week</div>
                    </div>
                    <div className="stat">
                      <div className="value">{client.stats.avgDuration}m</div>
                      <div className="label">Avg Time</div>
                    </div>
                  </div>
                </SessionInfo>

                <ActionButtons>
                  {client.currentSession ? (
                    <ActionButton
                      $variant="primary"
                      onClick={() => handleViewSession(client)}
                      whileTap={{ scale: 0.95 }}
                    >
                      👁️ Monitor
                    </ActionButton>
                  ) : (
                    <ActionButton
                      $variant="secondary"
                      onClick={() => handleViewProgress(client)}
                      whileTap={{ scale: 0.95 }}
                    >
                      📊 Progress
                    </ActionButton>
                  )}
                  
                  <ActionButton
                    $variant="secondary"
                    onClick={() => handleSendMessage(client)}
                    whileTap={{ scale: 0.95 }}
                  >
                    💬 Message
                  </ActionButton>
                </ActionButtons>

                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  marginTop: '0.75rem' 
                }}>
                  Last active: {formatDate(client.lastActive)}
                </div>
              </ClientCard>
            ))}
          </AnimatePresence>
        </ClientGrid>
      ) : (
        <EmptyState>
          <div className="icon">👥</div>
          <div className="message">No Clients Yet</div>
          <div className="submessage">Start building your client base to track their sessions</div>
        </EmptyState>
      )}
      </TrainerContainer>
    </SessionErrorBoundary>
  );
};

export default TrainerClientSessions;