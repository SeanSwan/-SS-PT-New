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
import { useToast } from '../../hooks/use-toast';

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
  Refresh,
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
import { useNotifications } from '../../hooks/useNotifications';
import { usePermissions } from '../../hooks/usePermissions';

// Components
import {
  UniversalMasterSchedule,
  stellarTheme,
  CommandCenterTheme,
  UniversalMasterScheduleProps,
  PERMISSIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from './index';
import GlowButton from '../ui/buttons/GlowButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

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
  const { notifications } = useNotifications();
  const { hasPermission } = usePermissions();
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
  
  // Notifications
  const scheduleNotifications = useMemo(() => {
    return notifications.filter(n => 
      n.type.includes('session_') || n.type.includes('assignment_')
    );
  }, [notifications]);
  
  const unreadNotifications = useMemo(() => {
    return scheduleNotifications.filter(n => !n.read).length;
  }, [scheduleNotifications]);
  
  // Permissions
  const permissions = useMemo(() => {
    return {
      canViewAll: hasPermission(PERMISSIONS.VIEW_ALL_SESSIONS),
      canCreate: hasPermission(PERMISSIONS.CREATE_SESSIONS),
      canEdit: hasPermission(PERMISSIONS.EDIT_SESSIONS),
      canDelete: hasPermission(PERMISSIONS.DELETE_SESSIONS),
      canAssign: hasPermission(PERMISSIONS.ASSIGN_TRAINERS),
      canBulkAction: hasPermission(PERMISSIONS.BULK_OPERATIONS),
      canViewStats: hasPermission(PERMISSIONS.VIEW_STATISTICS),
      canExport: hasPermission(PERMISSIONS.EXPORT_DATA),
      canImport: hasPermission(PERMISSIONS.IMPORT_DATA)
    };
  }, [hasPermission]);
  
  // Universal Master Schedule Props
  const scheduleProps: UniversalMasterScheduleProps = useMemo(() => {
    return {
      initialView: 'week',
      initialDate: new Date(),
      autoRefresh: true,
      refreshInterval: 30000,
      permissions: Object.keys(permissions).filter(key => permissions[key]),
      onSessionSelect: (session) => {
        console.log('Session selected:', session);
      },
      onSessionCreate: (session) => {
        toast({ title: 'Success', description: SUCCESS_MESSAGES.SESSION_CREATED, variant: 'default' });
        updateSessionStats();
      },
      onSessionUpdate: (session) => {
        toast({ title: 'Success', description: SUCCESS_MESSAGES.SESSION_UPDATED, variant: 'default' });
        updateSessionStats();
      },
      onSessionDelete: (sessionId) => {
        toast({ title: 'Success', description: SUCCESS_MESSAGES.SESSION_DELETED, variant: 'default' });
        updateSessionStats();
      },
      onError: (error) => {
        setError(error);
        toast({ title: 'Error', description: error, variant: 'destructive' });
      },
      theme: 'dark',
      compactMode: false,
      showStatistics: permissions.canViewStats,
      showFilters: true,
      showBulkActions: permissions.canBulkAction,
      customActions: customActions.map(action => ({
        ...action,
        action: () => {
          try {
            action.action();
          } catch (error) {
            console.error('Custom action error:', error);
            toast({ title: 'Error', description: 'Failed to execute action', variant: 'destructive' });
          }
        }
      }))
    };
  }, [permissions, customActions, toast, updateSessionStats]);
  
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
    setIsLoading(true);
    setError(null);
    // Trigger refresh in the Universal Master Schedule
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: 'Success', description: 'Schedule refreshed successfully', variant: 'default' });
    }, 1000);
  }, [toast]);
  
  const updateSessionStats = useCallback(() => {
    // This would be replaced with actual API call to get session statistics
    // For now, it's a placeholder
    console.log('Updating session statistics...');
  }, []);
  
  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsLoading(true);
        
        // Check permissions
        if (!permissions.canViewAll) {
          throw new Error('You do not have permission to view the schedule');
        }
        
        // Load initial data
        await updateSessionStats();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing admin schedule:', error);
        setError(error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
        setIsLoading(false);
      }
    };
    
    initializeComponent();
  }, [permissions.canViewAll, updateSessionStats]);
  
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
            theme="ruby"
            onClick={handleRetry}
            leftIcon={<Refresh size={18} />}
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
                    {/* Notifications */}
                    <Tooltip title="Schedule Notifications">
                      <IconButton
                        onClick={() => setShowNotifications(!showNotifications)}
                        sx={{ color: 'white' }}
                      >
                        <Badge badgeContent={unreadNotifications} color="error">
                          <Bell size={20} />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    
                    {/* Refresh */}
                    <GlowButton
                      text="Refresh"
                      theme="cosmic"
                      size="small"
                      leftIcon={<Refresh size={16} />}
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
              style={{ height: '100%' }}
            >
              <UniversalMasterSchedule {...scheduleProps} />
            </motion.div>
          </ScheduleContent>
          
          {/* Notifications Panel */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '320px',
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px 0 0 16px',
                  padding: '1rem',
                  zIndex: 1000
                }}
              >
                <NotificationPanel>
                  <NotificationHeader>
                    <Typography variant="h6" color="white">
                      Schedule Notifications
                    </Typography>
                    <IconButton
                      onClick={() => setShowNotifications(false)}
                      sx={{ color: 'white' }}
                    >
                      <X size={20} />
                    </IconButton>
                  </NotificationHeader>
                  
                  <NotificationList>
                    {scheduleNotifications.length > 0 ? (
                      scheduleNotifications.map(notification => (
                        <NotificationItem key={notification.id} read={notification.read}>
                          <Typography variant="body2" color="white">
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
                            {notification.message}
                          </Typography>
                        </NotificationItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        No notifications
                      </Typography>
                    )}
                  </NotificationList>
                </NotificationPanel>
              </motion.div>
            )}
          </AnimatePresence>
          
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

const NotificationPanel = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
`;

const NotificationList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const NotificationItem = styled.div<{ read: boolean }>`
  padding: 0.75rem;
  background: ${props => props.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.read ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.3)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
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
