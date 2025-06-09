/**
 * FloatingSessionWidget.tsx
 * A floating widget that shows active session status and provides quick controls
 * Can be placed anywhere in the app for easy session management
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../context/SessionContext';
import SessionErrorBoundary from './SessionErrorBoundary';

// Animations
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Styled Components
const WidgetContainer = styled(motion.div)<{ $isExpanded: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.95), rgba(0, 128, 255, 0.95));
  border-radius: ${props => props.$isExpanded ? '20px' : '50px'};
  backdrop-filter: blur(10px);
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  
  ${props => !props.$isExpanded && `
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${float} 3s ease-in-out infinite;
  `}
  
  ${props => props.$isExpanded && `
    width: 300px;
    padding: 1rem;
    animation: none;
  `}
  
  &:hover {
    transform: ${props => props.$isExpanded ? 'none' : 'scale(1.1)'};
    box-shadow: 0 12px 40px rgba(0, 255, 255, 0.4);
  }

  @media (max-width: 768px) {
    bottom: 80px; // Account for mobile navigation
    right: 10px;
    
    ${props => props.$isExpanded && `
      width: 280px;
      padding: 0.75rem;
    `}
  }
`;

const CompactView = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  font-size: 1.5rem;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ExpandedView = styled.div`
  color: #000;
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  
  .title {
    font-weight: 600;
    font-size: 0.9rem;
    flex: 1;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #000;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
`;

const TimerDisplay = styled.div`
  text-align: center;
  margin: 0.5rem 0;
  
  .time {
    font-size: 1.5rem;
    font-weight: bold;
    color: #000;
    font-family: 'Courier New', monospace;
  }
  
  .label {
    font-size: 0.7rem;
    color: rgba(0, 0, 0, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const QuickControls = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.75rem;
`;

const QuickButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'rgba(0, 0, 0, 0.8)';
      case 'danger': return 'rgba(255, 77, 109, 0.8)';
      default: return 'rgba(0, 0, 0, 0.6)';
    }
  }};
  
  color: ${props => props.$variant === 'primary' ? '#00ffff' : '#fff'};
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return 'rgba(0, 0, 0, 0.9)';
        case 'danger': return 'rgba(255, 77, 109, 0.9)';
        default: return 'rgba(0, 0, 0, 0.7)';
      }
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusIndicator = styled.div<{ $status: string }>`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(0, 255, 255, 0.8);
  
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'linear-gradient(135deg, #00ff88, #00cc6a)';
      case 'paused': return 'linear-gradient(135deg, #ffa726, #ff9800)';
      default: return 'linear-gradient(135deg, #666, #999)';
    }
  }};
  
  ${props => props.$status === 'active' && `
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

const StartButton = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #000;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem;
  
  .icon {
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
  }
  
  .text {
    font-size: 0.7rem;
    line-height: 1;
  }
`;

// Helper function to format time
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface FloatingSessionWidgetProps {
  onOpenDashboard?: () => void;
}

const FloatingSessionWidget: React.FC<FloatingSessionWidgetProps> = ({ onOpenDashboard }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const {
    currentSession,
    sessionTimer,
    loading,
    startSession,
    pauseSession,
    resumeSession,
    completeSession
  } = useSession();

  const handleStartSession = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarting(true);
    try {
      await startSession();
      setIsExpanded(true); // Expand after starting
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleExpand = () => {
    if (!currentSession) {
      return; // Don't expand if no session
    }
    setIsExpanded(!isExpanded);
  };

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pauseSession();
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resumeSession();
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeSession();
      setIsExpanded(false); // Collapse after completing
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const handleOpenDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDashboard?.();
    setIsExpanded(false);
  };

  // Don't render if there's no session and we can't start one
  if (!currentSession && loading) {
    return null;
  }

  return (
    <SessionErrorBoundary 
      context="Floating Session Widget"
      variant="compact"
      enableRetry={true}
      maxRetries={2}
      onError={(error, errorInfo) => {
        console.error('[FloatingSessionWidget] Error in session widget:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          hasCurrentSession: !!currentSession,
          sessionStatus: currentSession?.status,
          isExpanded
        });
      }}
    >
      <AnimatePresence>
        <WidgetContainer
        $isExpanded={isExpanded}
        onClick={currentSession ? handleToggleExpand : undefined}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, type: 'spring' }}
        whileTap={{ scale: 0.95 }}
      >
        {currentSession && (
          <StatusIndicator $status={currentSession.status} />
        )}
        
        {!isExpanded ? (
          // Compact View
          currentSession ? (
            <CompactView>
              {currentSession.status === 'active' ? '⏱️' : '⏸️'}
            </CompactView>
          ) : (
            <StartButton onClick={handleStartSession}>
              <div>
                <div className="icon">🚀</div>
                <div className="text">Start</div>
              </div>
            </StartButton>
          )
        ) : (
          // Expanded View
          <ExpandedView>
            <SessionHeader>
              <div className="title">
                {currentSession?.status === 'active' ? 'Active Session' : 'Paused Session'}
              </div>
              <button 
                className="close-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                aria-label="Collapse widget"
              >
                ×
              </button>
            </SessionHeader>

            {currentSession && (
              <>
                <TimerDisplay>
                  <div className="time">{formatTime(sessionTimer)}</div>
                  <div className="label">Session Time</div>
                </TimerDisplay>

                <QuickControls>
                  {currentSession.status === 'active' ? (
                    <>
                      <QuickButton
                        $variant="secondary"
                        onClick={handlePause}
                        disabled={loading}
                        whileTap={{ scale: 0.95 }}
                      >
                        ⏸️ Pause
                      </QuickButton>
                      <QuickButton
                        $variant="primary"
                        onClick={handleComplete}
                        disabled={loading}
                        whileTap={{ scale: 0.95 }}
                      >
                        ✅ Done
                      </QuickButton>
                    </>
                  ) : (
                    <>
                      <QuickButton
                        $variant="primary"
                        onClick={handleResume}
                        disabled={loading}
                        whileTap={{ scale: 0.95 }}
                      >
                        ▶️ Resume
                      </QuickButton>
                      <QuickButton
                        $variant="secondary"
                        onClick={handleComplete}
                        disabled={loading}
                        whileTap={{ scale: 0.95 }}
                      >
                        ✅ Finish
                      </QuickButton>
                    </>
                  )}
                </QuickControls>

                {onOpenDashboard && (
                  <QuickControls>
                    <QuickButton
                      onClick={handleOpenDashboard}
                      whileTap={{ scale: 0.95 }}
                    >
                      📊 Full Dashboard
                    </QuickButton>
                  </QuickControls>
                )}
              </>
            )}
          </ExpandedView>
        )}
        </WidgetContainer>
      </AnimatePresence>
    </SessionErrorBoundary>
  );
};

export default FloatingSessionWidget;