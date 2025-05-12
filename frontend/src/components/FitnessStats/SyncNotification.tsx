import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

// Toast container positioned fixed on screen
const ToastContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  width: calc(100% - 40px);
`;

// Toast notification with different states
const Toast = styled.div<{ status: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  background-color: ${(props) => {
    switch (props.status) {
      case 'success':
        return 'rgba(0, 200, 83, 0.9)';
      case 'error':
        return 'rgba(255, 107, 107, 0.9)';
      case 'info':
        return 'rgba(0, 149, 255, 0.9)';
    }
  }};
  color: white;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  &.exiting {
    animation: slideOut 0.3s ease-in forwards;
  }
`;

// Toast content area
const ToastContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

// Close button
const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  
  &:hover {
    opacity: 0.8;
  }
`;

// Message container
const Message = styled.div`
  display: flex;
  flex-direction: column;
`;

// Toast title
const Title = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

// Toast description
const Description = styled.div`
  font-size: 0.9rem;
  opacity: 0.9;
`;

// Toast notification type
interface ToastNotification {
  id: number;
  title: string;
  description: string;
  status: 'success' | 'error' | 'info';
  duration: number;
}

/**
 * SyncNotification Component
 * 
 * Displays toast notifications for sync status changes
 */
const SyncNotification: React.FC = () => {
  const { loading, error, lastSyncTime } = useClientDashboardMcp();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [exitingToasts, setExitingToasts] = useState<number[]>([]);
  
  // Tracking previous sync state to detect changes
  const [prevSyncState, setPrevSyncState] = useState({
    loading: false,
    error: null as string | null,
    lastSyncTime: null as Date | null
  });
  
  // Show toast notification
  const showToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto remove after duration
    setTimeout(() => {
      setExitingToasts(prev => [...prev, id]);
      
      // Remove from DOM after animation
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        setExitingToasts(prev => prev.filter(t => t !== id));
      }, 300);
    }, toast.duration);
  };
  
  // Remove toast manually
  const removeToast = (id: number) => {
    setExitingToasts(prev => [...prev, id]);
    
    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExitingToasts(prev => prev.filter(t => t !== id));
    }, 300);
  };
  
  // Show notifications for sync status changes
  useEffect(() => {
    // Initial state, don't show notifications
    if (prevSyncState.lastSyncTime === null && lastSyncTime === null) {
      setPrevSyncState({ loading, error, lastSyncTime });
      return;
    }
    
    // Show notification on sync start
    if (loading && !prevSyncState.loading) {
      showToast({
        title: 'Syncing Data',
        description: 'Synchronizing progress data with servers...',
        status: 'info',
        duration: 3000
      });
    }
    
    // Show notification on sync error
    if (error && (!prevSyncState.error || prevSyncState.error !== error)) {
      showToast({
        title: 'Sync Failed',
        description: error,
        status: 'error',
        duration: 5000
      });
    }
    
    // Show notification on sync success
    if (
      !loading && 
      prevSyncState.loading && 
      !error && 
      lastSyncTime && 
      (!prevSyncState.lastSyncTime || lastSyncTime > prevSyncState.lastSyncTime)
    ) {
      showToast({
        title: 'Sync Complete',
        description: 'Your progress data has been successfully synchronized',
        status: 'success',
        duration: 3000
      });
    }
    
    // Update previous state
    setPrevSyncState({ loading, error, lastSyncTime });
  }, [loading, error, lastSyncTime]);
  
  // Get icon based on status
  const getIcon = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };
  
  return (
    <ToastContainer>
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          status={toast.status}
          className={exitingToasts.includes(toast.id) ? 'exiting' : ''}
        >
          <ToastContent>
            {getIcon(toast.status)}
            <Message>
              <Title>{toast.title}</Title>
              <Description>{toast.description}</Description>
            </Message>
          </ToastContent>
          <CloseButton onClick={() => removeToast(toast.id)}>
            <X size={16} />
          </CloseButton>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default SyncNotification;