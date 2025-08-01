/**
 * AdminNotificationCenter - Real-time Notification Center for Admin Dashboard
 * ==========================================================================
 * Enterprise-grade notification management interface with real-time updates
 * 
 * FEATURES:
 * - Real-time notification feed with smart grouping
 * - Multi-channel notification preferences
 * - Priority-based filtering and sorting
 * - Quick action buttons for notification responses
 * - Notification analytics and performance metrics
 * - Sound and desktop notification controls
 * - Export and audit capabilities
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Bell,
  Settings,
  Filter,
  Search,
  Volume2,
  VolumeX,
  Monitor,
  Mail,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Download,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';

// Import our new notification hook
import {
  useAdminNotifications,
  AdminNotification,
  NotificationPriority,
  NotificationCategory
} from './hooks/useAdminNotifications';

// Styled Components
const NotificationCenterContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #0891b2 100%);
  border-radius: 16px;
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  color: white;
`;

const NotificationTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NotificationStats = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
`;

const StatBadge = styled.div<{ variant?: 'primary' | 'warning' | 'danger' }>`
  background: ${props => 
    props.variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' :
    props.variant === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
    'rgba(59, 130, 246, 0.2)'};
  color: ${props => 
    props.variant === 'danger' ? '#fca5a5' :
    props.variant === 'warning' ? '#fbbf24' :
    '#93c5fd'};
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const ControlButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
`;

const SearchInput = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  min-width: 200px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }
`;

const NotificationFeed = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
`;

const NotificationCard = styled(motion.div)<{ priority: NotificationPriority; read?: boolean }>`
  background: ${props => 
    props.priority === 'critical' ? 'rgba(239, 68, 68, 0.15)' :
    props.priority === 'high' ? 'rgba(245, 158, 11, 0.15)' :
    'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => 
    props.priority === 'critical' ? 'rgba(239, 68, 68, 0.3)' :
    props.priority === 'high' ? 'rgba(245, 158, 11, 0.3)' :
    'rgba(255, 255, 255, 0.2)'};
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  opacity: ${props => props.read ? 0.7 : 1};
  position: relative;
  overflow: hidden;
`;

const NotificationContent = styled.div`
  color: white;
`;

const NotificationMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
`;

const NotificationTitleText = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
`;

const NotificationMessage = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => 
    props.variant === 'danger' ? 'rgba(239, 68, 68, 0.8)' :
    props.variant === 'primary' ? 'rgba(59, 130, 246, 0.8)' :
    'rgba(255, 255, 255, 0.2)'};
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.connected ? '#10b981' : '#f59e0b'};
`;

const LiveIndicator = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? '#10b981' : '#6b7280'};
  animation: ${props => props.active ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

interface AdminNotificationCenterProps {
  className?: string;
  maxHeight?: string;
  enableSound?: boolean;
  enableDesktop?: boolean;
}

/**
 * AdminNotificationCenter Component
 * 
 * Real-time notification management interface for admin dashboard
 */
const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({
  className,
  maxHeight = '400px',
  enableSound = true,
  enableDesktop = false
}) => {
  
  // ==================== HOOKS ====================
  
  const {
    // Data
    notifications,
    filteredNotifications,
    unreadCount,
    criticalCount,
    notificationsToday,
    isConnected,
    lastNotificationTime,
    preferences,
    notificationStats,
    
    // Actions
    acknowledgeNotification,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    setFilter,
    updatePreferences,
    sendTestNotification,
    exportNotifications,
    pauseNotifications,
    resumeNotifications
  } = useAdminNotifications({
    enableRealTime: true,
    defaultPreferences: {
      enableSound,
      enableDesktop
    }
  });
  
  // ==================== LOCAL STATE ====================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<NotificationPriority | 'all'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // ==================== HANDLERS ====================
  
  const handleFilterChange = (category: NotificationCategory | 'all', priority: NotificationPriority | 'all') => {
    setSelectedCategory(category);
    setSelectedPriority(priority);
    
    setFilter({
      category: category === 'all' ? undefined : category,
      priority: priority === 'all' ? undefined : priority
    });
  };
  
  const handleNotificationAction = async (notification: AdminNotification, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;
    
    try {
      await action.handler();
      acknowledgeNotification(notification.id);
    } catch (error) {
      console.error('Failed to execute notification action:', error);
    }
  };
  
  const handleTogglePause = () => {
    if (isPaused) {
      resumeNotifications();
    } else {
      pauseNotifications();
    }
    setIsPaused(!isPaused);
  };
  
  const handleToggleSound = () => {
    updatePreferences({ enableSound: !preferences.enableSound });
  };
  
  const handleToggleDesktop = () => {
    updatePreferences({ enableDesktop: !preferences.enableDesktop });
  };
  
  // ==================== COMPUTED VALUES ====================
  
  const displayNotifications = filteredNotifications.filter(notification => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.source.toLowerCase().includes(query)
      );
    }
    return true;
  });
  
  const categoryOptions: Array<{ value: NotificationCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'system', label: 'System' },
    { value: 'user', label: 'Users' },
    { value: 'financial', label: 'Financial' },
    { value: 'security', label: 'Security' },
    { value: 'content', label: 'Content' },
    { value: 'performance', label: 'Performance' }
  ];
  
  const priorityOptions: Array<{ value: NotificationPriority | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];
  
  // ==================== EFFECTS ====================
  
  useEffect(() => {
    // Auto-scroll to top when new notifications arrive
    if (lastNotificationTime) {
      const feedElement = document.querySelector('[data-notification-feed]');
      feedElement?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lastNotificationTime]);
  
  // ==================== RENDER ====================
  
  return (
    <NotificationCenterContainer
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <NotificationHeader>
        <NotificationTitle>
          <Bell size={24} />
          Notification Center
          <LiveIndicator active={isConnected} />
        </NotificationTitle>
        
        <NotificationStats>
          <StatBadge variant={criticalCount > 0 ? 'danger' : 'primary'}>
            <AlertTriangle size={14} />
            {criticalCount} Critical
          </StatBadge>
          <StatBadge>
            <Clock size={14} />
            {unreadCount} Unread
          </StatBadge>
          <StatBadge>
            <TrendingUp size={14} />
            {notificationsToday} Today
          </StatBadge>
        </NotificationStats>
      </NotificationHeader>
      
      {/* Controls */}
      <ControlsRow>
        <SearchInput
          type="text"
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => handleFilterChange(e.target.value as NotificationCategory | 'all', selectedPriority)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            padding: '0.5rem'
          }}
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value} style={{ background: '#1e3a8a' }}>
              {option.label}
            </option>
          ))}
        </select>
        
        <select
          value={selectedPriority}
          onChange={(e) => handleFilterChange(selectedCategory, e.target.value as NotificationPriority | 'all')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            padding: '0.5rem'
          }}
        >
          {priorityOptions.map(option => (
            <option key={option.value} value={option.value} style={{ background: '#1e3a8a' }}>
              {option.label}
            </option>
          ))}
        </select>
        
        <ControlButton onClick={handleToggleSound} active={preferences.enableSound}>
          {preferences.enableSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          Sound
        </ControlButton>
        
        <ControlButton onClick={handleToggleDesktop} active={preferences.enableDesktop}>
          <Monitor size={16} />
          Desktop
        </ControlButton>
        
        <ControlButton onClick={handleTogglePause} active={isPaused}>
          {isPaused ? <Play size={16} /> : <X size={16} />}
          {isPaused ? 'Resume' : 'Pause'}
        </ControlButton>
        
        <ControlButton onClick={markAllAsRead}>
          <CheckCircle size={16} />
          Mark All Read
        </ControlButton>
        
        <ControlButton onClick={sendTestNotification}>
          <Bell size={16} />
          Test
        </ControlButton>
        
        <ControlButton onClick={exportNotifications}>
          <Download size={16} />
          Export
        </ControlButton>
      </ControlsRow>
      
      {/* Connection Status */}
      <ConnectionStatus connected={isConnected}>
        <LiveIndicator active={isConnected} />
        {isConnected ? 'Connected' : 'Reconnecting...'}
        {lastNotificationTime && (
          <span style={{ marginLeft: '1rem', opacity: 0.7 }}>
            Last update: {lastNotificationTime.toLocaleTimeString()}
          </span>
        )}
      </ConnectionStatus>
      
      {/* Notification Feed */}
      <NotificationFeed data-notification-feed style={{ maxHeight }}>
        <AnimatePresence>
          {displayNotifications.length === 0 ? (
            <EmptyState>
              <Bell size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p>No notifications match your current filters.</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Try adjusting your search or filter criteria.
              </p>
            </EmptyState>
          ) : (
            displayNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                priority={notification.priority}
                read={!!notification.readAt}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <NotificationMeta>
                  <div>
                    <span style={{ 
                      background: notification.priority === 'critical' ? '#ef4444' :
                                 notification.priority === 'high' ? '#f59e0b' :
                                 notification.priority === 'normal' ? '#3b82f6' : '#6b7280',
                      color: 'white',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginRight: '0.5rem'
                    }}>
                      {notification.priority}
                    </span>
                    <span style={{ opacity: 0.8 }}>{notification.category}</span>
                  </div>
                  <div>
                    {notification.source} • {notification.timestamp.toLocaleTimeString()}
                  </div>
                </NotificationMeta>
                
                <NotificationContent>
                  <NotificationTitleText>{notification.title}</NotificationTitleText>
                  <NotificationMessage>{notification.message}</NotificationMessage>
                </NotificationContent>
                
                <NotificationActions>
                  {notification.actions?.map((action) => (
                    <ActionButton
                      key={action.id}
                      variant={action.type === 'danger' ? 'danger' : action.type === 'primary' ? 'primary' : 'secondary'}
                      onClick={() => handleNotificationAction(notification, action.id)}
                    >
                      {action.label}
                    </ActionButton>
                  ))}
                  
                  {!notification.readAt && (
                    <ActionButton
                      variant="secondary"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark Read
                    </ActionButton>
                  )}
                  
                  <ActionButton
                    variant="secondary"
                    onClick={() => dismissNotification(notification.id)}
                  >
                    <X size={14} />
                  </ActionButton>
                </NotificationActions>
              </NotificationCard>
            ))
          )}
        </AnimatePresence>
      </NotificationFeed>
    </NotificationCenterContainer>
  );
};

export default AdminNotificationCenter;
