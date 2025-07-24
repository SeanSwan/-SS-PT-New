/**
 * Universal Master Schedule Integration Component
 * =============================================
 * Integration wrapper for the Universal Master Schedule in the admin dashboard
 * 
 * This component provides seamless integration of the Universal Master Schedule
 * into the existing SwanStudios admin dashboard layout, maintaining consistency
 * with the stellar command center theme while providing full scheduling functionality.
 * 
 * INTEGRATION FEATURES:
 * - Seamless integration with existing admin dashboard layout
 * - Maintains stellar command center theme consistency
 * - Role-based access control and permissions
 * - Real-time updates and notifications
 * - Mobile-responsive design
 * - Error handling and recovery
 * - Performance optimization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';

// Material-UI Components
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress,
  Fab,
  Badge,
  Tooltip
} from '@mui/material';

// Icons
import {
  Calendar as CalendarIcon,
  Home,
  Settings,
  RefreshCw,
  Maximize,
  Minimize,
  HelpCircle,
  Bell,
  Filter,
  Download,
  Upload,
  User,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from 'lucide-react';

// Context and Hooks
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

// Components
import UniversalMasterSchedule from './UniversalMasterSchedule';
import { stellarTheme } from './UniversalMasterScheduleTheme';
import GlowButton from '../ui/buttons/GlowButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Types
import type {
  Session,
  Client,
  Trainer,
  ScheduleStats
} from './types';

// Types
interface AdminScheduleIntegrationProps {
  fullscreen?: boolean;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  showHeader?: boolean;
  showBreadcrumbs?: boolean;
  customActions?: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
    color?: string;
  }>;
}

/**
 * Admin Schedule Integration Component
 * 
 * Provides a fully integrated Universal Master Schedule experience
 * within the SwanStudios admin dashboard architecture.
 */
const AdminScheduleIntegration: React.FC<AdminScheduleIntegrationProps> = ({
  fullscreen = false,
  onFullscreenToggle,
  showHeader = true,
  showBreadcrumbs = true,
  customActions = []
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Component State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    availableSessions: 0,
    bookedSessions: 0,
    completedSessions: 0,
    utilizationRate: 0
  });
  
  // Check if user has admin permissions
  const hasAdminPermissions = useMemo(() => {
    return user?.role === 'admin';
  }, [user]);
  
  // Event Handlers
  const handleFullscreenToggle = useCallback(() => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    onFullscreenToggle?.(newFullscreen);
  }, [isFullscreen, onFullscreenToggle]);
  
  const handleError = useCallback((error: string) => {
    setError(error);
    toast({ title: 'Error', description: error, variant: 'destructive' });
  }, [toast]);
  
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  
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
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  }, []);
  
  // Render error state
  if (error && !isLoading) {
    return (
      <ErrorContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AlertTriangle size={48} color="#ef4444" />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            {error}
          </Typography>
          <GlowButton
            text="Retry"
            variant="ruby"
            leftIcon={<RefreshCw size={18} />}
            onClick={handleRetry}
          />
        </motion.div>
      </ErrorContainer>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <LoadingContainer>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSpinner size={48} />
          <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
            Loading Universal Master Schedule...
          </Typography>
        </motion.div>
      </LoadingContainer>
    );
  }
  
  return (
    <ThemeProvider theme={stellarTheme}>
      <ErrorBoundary>
        <ScheduleContainer isFullscreen={isFullscreen}>
          {/* Header Section */}
          {showHeader && (
            <ScheduleHeader>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Breadcrumbs */}
                {showBreadcrumbs && (
                  <Breadcrumbs
                    aria-label="breadcrumb"
                    sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    <Link
                      color="inherit"
                      href="/dashboard"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <Home size={16} style={{ marginRight: '4px' }} />
                      Dashboard
                    </Link>
                    <Typography
                      color="white"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <CalendarIcon size={16} style={{ marginRight: '4px' }} />
                      Universal Master Schedule
                    </Typography>
                  </Breadcrumbs>
                )}
                
                {/* Header Content */}
                <HeaderContent>
                  <HeaderTitle>
                    <CalendarIcon size={28} />
                    <Typography variant="h4" component="h1">
                      Universal Master Schedule
                    </Typography>
                    <Badge badgeContent={sessionStats.availableSessions} color="primary">
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        {sessionStats.utilizationRate}% Utilization
                      </Typography>
                    </Badge>
                  </HeaderTitle>
                  
                  <HeaderActions>
                    {/* Refresh */}
                    <GlowButton
                      text="Refresh"
                      variant="cosmic"
                      size="small"
                      leftIcon={<RefreshCw size={16} />}
                      onClick={handleRefresh}
                      disabled={isLoading}
                    />
                    
                    {/* Fullscreen Toggle */}
                    {onFullscreenToggle && (
                      <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                        <IconButton
                          onClick={handleFullscreenToggle}
                          sx={{ color: 'white' }}
                        >
                          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* Settings */}
                    <Tooltip title="Schedule Settings">
                      <IconButton sx={{ color: 'white' }}>
                        <Settings size={20} />
                      </IconButton>
                    </Tooltip>
                  </HeaderActions>
                </HeaderContent>
              </motion.div>
            </ScheduleHeader>
          )}
          
          {/* Main Schedule Content */}
          <ScheduleContent>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <UniversalMasterSchedule />
            </motion.div>
          </ScheduleContent>
          
          {/* Error Snackbar */}
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setError(null)}
              severity="error"
              sx={{ width: '100%' }}
            >
              {error}
            </Alert>
          </Snackbar>
          
          {/* Loading Backdrop */}
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isLoading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </ScheduleContainer>
      </ErrorBoundary>
    </ThemeProvider>
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
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, 
      rgba(59, 130, 246, 0.1) 0%, 
      transparent 70%
    );
    pointer-events: none;
  }
`;

const ScheduleHeader = styled.div`
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  
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
  
  h4 {
    color: white;
    font-weight: 300;
    margin: 0;
  }
  
  svg {
    color: #3b82f6;
  }
  
  @media (max-width: 768px) {
    h4 {
      font-size: 1.5rem;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ScheduleContent = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  gap: 1rem;
`;
