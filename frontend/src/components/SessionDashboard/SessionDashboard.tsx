/**
 * SessionDashboard.tsx
 * Interactive session management dashboard component
 * Shows active session, session controls, and recent session history
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../context/SessionContext';
import SessionErrorBoundary from './SessionErrorBoundary';

// Animations
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(0, 255, 255, 0.3); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5); }
`;

// Styled Components
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
  }
`;

const SessionCard = styled(motion.div)<{ $isActive?: boolean }>`
  background: ${props => props.$isActive 
    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 128, 255, 0.1))'
    : 'rgba(30, 30, 60, 0.8)'
  };
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid ${props => props.$isActive ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  position: relative;
  overflow: hidden;
  
  ${props => props.$isActive && `
    animation: ${glow} 3s ease-in-out infinite;
  `}
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$isActive 
      ? 'linear-gradient(90deg, #00ffff, #0080ff, #00ffff)'
      : 'linear-gradient(90deg, #666, #999, #666)'
    };
    background-size: 200% 100%;
    animation: ${props => props.$isActive ? 'shimmer 2s ease-in-out infinite' : 'none'};
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SessionTitle = styled.h2`
  color: #fff;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const SessionStatus = styled.span<{ $status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'linear-gradient(135deg, #00ff88, #00cc6a)';
      case 'paused': return 'linear-gradient(135deg, #ffa726, #ff9800)';
      case 'completed': return 'linear-gradient(135deg, #00ffff, #0080ff)';
      default: return 'linear-gradient(135deg, #666, #999)';
    }
  }};
  color: ${props => props.$status === 'paused' ? '#000' : '#000'};
`;

const TimerDisplay = styled.div<{ $isActive?: boolean }>`
  text-align: center;
  margin: 2rem 0;
  
  .time {
    font-size: 3rem;
    font-weight: bold;
    color: #00ffff;
    font-family: 'Courier New', monospace;
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    
    ${props => props.$isActive && `
      animation: ${pulse} 2s ease-in-out infinite;
    `}
  }
  
  .label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, #00ffff, #0080ff)';
      case 'danger': return 'linear-gradient(135deg, #ff6b9d, #ff4d6d)';
      default: return 'linear-gradient(135deg, #666, #999)';
    }
  }};
  
  color: ${props => props.$variant === 'danger' ? '#fff' : '#000'};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
`;

const StatCard = styled.div`
  text-align: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #00ffff;
    margin-bottom: 0.25rem;
  }
  
  .label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const SessionHistory = styled.div`
  .history-title {
    color: #fff;
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

const HistoryItem = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
  }
  
  .session-info {
    .title {
      color: #fff;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .date {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }
  }
  
  .duration {
    color: #00ffff;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
`;

const QuickStartSection = styled.div`
  margin-top: 2rem;
  text-align: center;
  
  .title {
    color: #fff;
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
`;

// Helper function to format time
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// Main Component
const SessionDashboard: React.FC = () => {
  const {
    currentSession,
    sessions,
    sessionAnalytics,
    loading,
    sessionTimer,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession
  } = useSession();

  const [isStarting, setIsStarting] = useState(false);

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      await startSession();
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseSession = async () => {
    try {
      await pauseSession();
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  const handleResumeSession = async () => {
    try {
      await resumeSession();
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const handleCompleteSession = async () => {
    try {
      await completeSession();
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const handleCancelSession = async () => {
    if (window.confirm('Are you sure you want to cancel this session?')) {
      try {
        await cancelSession();
      } catch (error) {
        console.error('Failed to cancel session:', error);
      }
    }
  };

  return (
    <SessionErrorBoundary 
      context="Client Session Dashboard"
      variant="full"
      enableRetry={true}
      maxRetries={3}
      onError={(error, errorInfo) => {
        console.error('[SessionDashboard] Error in client dashboard:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          currentSession: currentSession?.id,
          sessionStatus: currentSession?.status
        });
      }}
    >
      <DashboardContainer>
      {/* Active Session / Session Controls */}
      <SessionCard 
        $isActive={!!currentSession}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SessionHeader>
          <SessionTitle>
            {currentSession ? 'Active Session' : 'Start Workout'}
          </SessionTitle>
          {currentSession && (
            <SessionStatus $status={currentSession.status}>
              {currentSession.status}
            </SessionStatus>
          )}
        </SessionHeader>

        {currentSession ? (
          <>
            <TimerDisplay $isActive={currentSession.status === 'active'}>
              <div className="time">{formatTime(sessionTimer)}</div>
              <div className="label">Session Time</div>
            </TimerDisplay>

            <ControlsContainer>
              {currentSession.status === 'active' ? (
                <>
                  <ActionButton 
                    $variant="secondary" 
                    onClick={handlePauseSession}
                    disabled={loading}
                    whileTap={{ scale: 0.95 }}
                  >
                    ⏸️ Pause
                  </ActionButton>
                  <ActionButton 
                    $variant="primary" 
                    onClick={handleCompleteSession}
                    disabled={loading}
                    whileTap={{ scale: 0.95 }}
                  >
                    ✅ Complete
                  </ActionButton>
                </>
              ) : currentSession.status === 'paused' ? (
                <>
                  <ActionButton 
                    $variant="primary" 
                    onClick={handleResumeSession}
                    disabled={loading}
                    whileTap={{ scale: 0.95 }}
                  >
                    ▶️ Resume
                  </ActionButton>
                  <ActionButton 
                    $variant="secondary" 
                    onClick={handleCompleteSession}
                    disabled={loading}
                    whileTap={{ scale: 0.95 }}
                  >
                    ✅ Finish
                  </ActionButton>
                </>
              ) : null}
              
              <ActionButton 
                $variant="danger" 
                onClick={handleCancelSession}
                disabled={loading}
                whileTap={{ scale: 0.95 }}
              >
                ❌ Cancel
              </ActionButton>
            </ControlsContainer>

            <StatsGrid>
              <StatCard>
                <div className="value">{currentSession.exercises.length}</div>
                <div className="label">Exercises</div>
              </StatCard>
              <StatCard>
                <div className="value">
                  {currentSession.exercises.filter(ex => ex.completed).length}
                </div>
                <div className="label">Completed</div>
              </StatCard>
              <StatCard>
                <div className="value">{currentSession.difficulty}/5</div>
                <div className="label">Difficulty</div>
              </StatCard>
            </StatsGrid>
          </>
        ) : (
          <QuickStartSection>
            <div className="title">Ready for your workout?</div>
            <div className="subtitle">
              Start a new session to track your exercises, sets, and progress
            </div>
            
            <ActionButton
              $variant="primary"
              onClick={handleStartSession}
              disabled={isStarting || loading}
              whileTap={{ scale: 0.95 }}
              style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
            >
              {isStarting ? '🔄 Starting...' : '🚀 Start Workout'}
            </ActionButton>

            {sessionAnalytics && (
              <StatsGrid>
                <StatCard>
                  <div className="value">{sessionAnalytics.totalSessions}</div>
                  <div className="label">Total Sessions</div>
                </StatCard>
                <StatCard>
                  <div className="value">{Math.floor(sessionAnalytics.averageDuration)}</div>
                  <div className="label">Avg Duration (min)</div>
                </StatCard>
                <StatCard>
                  <div className="value">{sessionAnalytics.currentStreak}</div>
                  <div className="label">Current Streak</div>
                </StatCard>
              </StatsGrid>
            )}
          </QuickStartSection>
        )}
      </SessionCard>

      {/* Session History */}
      <SessionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <SessionHistory>
          <h3 className="history-title">Recent Sessions</h3>
          
          <AnimatePresence>
            {sessions.length > 0 ? (
              sessions.slice(0, 5).map((session, index) => (
                <HistoryItem
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="session-info">
                    <div className="title">{session.title}</div>
                    <div className="date">{formatDate(session.createdAt)}</div>
                  </div>
                  <div className="duration">{formatTime(session.duration)}</div>
                </HistoryItem>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '2rem',
                  fontStyle: 'italic'
                }}
              >
                No sessions yet. Start your first workout! 💪
              </motion.div>
            )}
          </AnimatePresence>
        </SessionHistory>
      </SessionCard>
      </DashboardContainer>
    </SessionErrorBoundary>
  );
};

export default SessionDashboard;