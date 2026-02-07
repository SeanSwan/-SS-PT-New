/**
 * Universal Master Schedule Integration - MUI-FREE VERSION
 * ========================================================
 * Simplified integration wrapper using custom styled-components
 * All MUI dependencies removed
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

// Custom UI Components
import {
  PageTitle,
  BodyText,
  SmallText,
  PrimaryButton,
  Spinner
} from './ui';

// Lucide React icons
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

// Import our MUI-free Universal Master Schedule
import UniversalMasterSchedule from './UniversalMasterSchedule';

interface AdminScheduleIntegrationProps {
  fullscreen?: boolean;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  showHeader?: boolean;
  showBreadcrumbs?: boolean;
}

const AdminScheduleIntegration: React.FC<AdminScheduleIntegrationProps> = ({
  fullscreen = false,
  onFullscreenToggle,
  showHeader = true,
  showBreadcrumbs = true
}) => {
  // Component State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  
  // Check if user has admin permissions (simplified)
  const hasAdminPermissions = (() => {
    const token = localStorage.getItem('token');
    return !!token; // Return true if token exists
  })();
  
  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsLoading(true);
        
        // Check permissions
        if (!hasAdminPermissions) {
          throw new Error('You do not have permission to access the Universal Master Schedule');
        }
        
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsLoading(false);
      } catch (error: any) {
        console.error('Error initializing admin schedule:', error);
        setError(error.message || 'Failed to initialize Universal Master Schedule');
        setIsLoading(false);
      }
    };
    
    initializeComponent();
  }, [hasAdminPermissions]);
  
  // Error Recovery
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };
  
  // Render error state
  if (error && !isLoading) {
    return (
      <ErrorContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <AlertTriangle size={48} color="#ef4444" />
          <PageTitle style={{ marginTop: '1rem', color: '#ef4444' }}>
            {error}
          </PageTitle>
          <PrimaryButton
            onClick={handleRetry}
            style={{ marginTop: '1.5rem' }}
          >
            <RefreshCw size={18} />
            Retry
          </PrimaryButton>
        </motion.div>
      </ErrorContainer>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <Spinner 
        size={48}
        text="Loading Universal Master Schedule..."
        fullscreen
      />
    );
  }
  
  return (
    <ScheduleContainer isFullscreen={isFullscreen}>
      {/* Header Section */}
      {showHeader && (
        <ScheduleHeader>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header Content */}
            <HeaderContent role="banner">
              <HeaderTitle role="heading" aria-level={1}>
                <CalendarIcon size={28} />
                <div>
                  <PageTitle style={{ margin: 0 }}>
                    Universal Master Schedule
                  </PageTitle>
                  <SmallText secondary style={{ marginTop: '0.25rem' }}>
                    Professional Session Management
                  </SmallText>
                </div>
              </HeaderTitle>
            </HeaderContent>
          </motion.div>
        </ScheduleHeader>
      )}
      
      {/* Main Schedule Content */}
      <ScheduleContent
        role="region"
        aria-label="Schedule management interface"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          role="application"
          aria-label="Universal Master Schedule Calendar"
        >
          <UniversalMasterSchedule />
        </motion.div>
      </ScheduleContent>
    </ScheduleContainer>
  );
};

export default AdminScheduleIntegration;

// ==================== STYLED COMPONENTS ====================

const ScheduleContainer = styled(motion.div)<{ isFullscreen: boolean }>`
  width: 100%;
  height: ${props => props.isFullscreen ? '100vh' : '100%'};
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, 
    rgba(10, 10, 15, 0.95) 0%, 
    rgba(30, 58, 138, 0.1) 50%, 
    rgba(14, 165, 233, 0.05) 100%
  );
  position: ${props => props.isFullscreen ? 'fixed' : 'relative'};
  top: ${props => props.isFullscreen ? '0' : 'auto'};
  left: ${props => props.isFullscreen ? '0' : 'auto'};
  z-index: ${props => props.isFullscreen ? '9999' : 'auto'};
`;

const ScheduleHeader = styled.div`
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  svg {
    color: #3b82f6;
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }
  }
`;

const ScheduleContent = styled.div`
  flex: 1;
  min-height: 0; /* Allow flex child to shrink and scroll */
  display: flex;
  flex-direction: column;
  /* Let child handle its own scrolling */
  overflow: visible;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
`;
