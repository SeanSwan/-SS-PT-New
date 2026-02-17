/**
 * Session Log Button Component
 * 
 * A button component to trigger the session logging interface:
 * - Integrates with the scheduling system
 * - Provides quick access to voice/text logging for trainers during sessions
 * - Handles modal display and session data passing
 */

import React, { useState } from 'react';
import { Button, Dialog } from '../ui/primitives/components';
import { Mic, X } from 'lucide-react';
import styled from 'styled-components';
import VoiceSessionLogger from './VoiceSessionLogger';
import { useAuth } from '../../context/AuthContext';

// Styled components
const LogButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: linear-gradient(90deg, #7851a9, #00ffff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LogMobileButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  cursor: pointer;

  &:hover {
    background: linear-gradient(90deg, #7851a9, #00ffff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (min-width: 769px) {
    display: none;
  }
`;

/**
 * Session Log Button component that provides access to the voice logging feature
 */
const SessionLogButton = ({ sessionId, sessionData, variant = 'desktop' }) => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Only trainers and admins can log sessions
  const canLogSessions = user && (user.role === 'trainer' || user.role === 'admin');
  
  // Verify that there's an active session
  const hasActiveSession = sessionId && sessionData && 
    (sessionData.status === 'confirmed' || sessionData.status === 'scheduled');
  
  // Check if the trainer is assigned to this session
  const isAssignedTrainer = user && user.role === 'trainer' && 
    sessionData && sessionData.trainerId === user.id;
  
  // Determine if the button should be enabled
  const isEnabled = canLogSessions && hasActiveSession && (user.role === 'admin' || isAssignedTrainer);
  
  const handleOpen = () => {
    if (isEnabled) {
      setDialogOpen(true);
    }
  };
  
  const handleClose = () => {
    setDialogOpen(false);
  };
  
  // Don't render anything if user can't log sessions
  if (!canLogSessions) {
    return null;
  }
  
  return (
    <>
      {variant === 'desktop' ? (
        <LogButton
          onClick={handleOpen}
          disabled={!isEnabled}
        >
          <Mic size={18} />
          Log Session
        </LogButton>
      ) : (
        <LogMobileButton onClick={handleOpen} disabled={!isEnabled}>
          <Mic size={24} />
        </LogMobileButton>
      )}
      
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        fullScreen
        PaperProps={{
          style: {
            background: 'rgba(20, 20, 40, 0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <VoiceSessionLogger
          sessionId={sessionId}
          sessionData={sessionData}
          onClose={handleClose}
        />
      </Dialog>
    </>
  );
};

export default SessionLogButton;
