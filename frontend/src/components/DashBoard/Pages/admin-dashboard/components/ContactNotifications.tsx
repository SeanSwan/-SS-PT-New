/**
 * ContactNotifications.tsx - SwanStudios Business Intelligence Alert System
 * =========================================================================
 * Real-time financial and business notifications for admin dashboard
 * Displays high-priority alerts, new purchases, and system updates
 * 
 * Features:
 * - Real-time financial transaction alerts
 * - New customer registration notifications
 * - High-value purchase alerts
 * - System health notifications
 * - Contact form submissions (priority alerts)
 * - Action-required notifications
 * 
 * Master Prompt v28 Alignment:
 * - Revolutionary real-time business intelligence
 * - Galaxy-themed professional aesthetics
 * - Production-ready notification system
 * - Performance optimized with auto-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Bell, BellRing, DollarSign, UserPlus, AlertTriangle, 
  CheckCircle, Clock, Mail, ShoppingBag, CreditCard,
  TrendingUp, Star, Shield, Eye, EyeOff, RefreshCw,
  X, ExternalLink, MessageCircle, Users
} from 'lucide-react';

// Animations
const notificationPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
`;

const urgentBlink = keyframes`
  0%, 50% { opacity: 1; }
  25%, 75% { opacity: 0.3; }
`;

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

// Styled Components
const NotificationsContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(0, 255, 255, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(20px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #3b82f6, #00ffff);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const HeaderTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ControlButton = styled(motion.button)`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
    color: white;
  }
  
  &.active {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.5);
    color: #00ffff;
  }
`;

const NotificationBadge = styled.div`
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
  animation: ${notificationPulse} 2s infinite;
`;

const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 3px;
    
    &:hover {
      background: rgba(59, 130, 246, 0.7);
    }
  }
`;

const NotificationItem = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid ${props => props.priorityColor || '#3b82f6'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${props => props.priorityColor || '#3b82f6'};
    transform: translateX(4px);
  }
  
  &.unread {
    border-left-width: 6px;
    background: rgba(59, 130, 246, 0.1);
  }
  
  &.urgent {
    animation: ${urgentBlink} 3s infinite;
    border-left-color: #ef4444;
  }
`;

const NotificationContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const NotificationIcon = styled.div`
  background: ${props => props.color || 'rgba(59, 130, 246, 0.2)'};
  color: ${props => props.color || '#3b82f6'};
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const NotificationDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitle = styled.div`
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const NotificationMessage = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
`;

const NotificationMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const NotificationTime = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const NotificationAmount = styled.span`
  color: #10b981;
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Interface definitions
interface Notification {
  id: string;
  type: 'purchase' | 'new_user' | 'contact' | 'system_alert' | 'high_value_purchase' | 'payment_failed';
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  actionRequired?: boolean;
  userId?: number;
  userName?: string;
}

interface ContactNotificationsProps {
  autoRefresh?: boolean;
  maxContacts?: number;
  showActions?: boolean;
}

// Priority color mapping
const getPriorityColor = (priority: string) => {
  const colorMap = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };
  return colorMap[priority] || colorMap.medium;
};

// Type icon mapping
const getTypeIcon = (type: string) => {
  const iconMap = {
    purchase: <ShoppingBag size={18} />,
    high_value_purchase: <Star size={18} />,
    new_user: <UserPlus size={18} />,
    contact: <MessageCircle size={18} />,
    system_alert: <AlertTriangle size={18} />,
    payment_failed: <CreditCard size={18} />
  };
  return iconMap[type] || <Bell size={18} />;
};

// Time formatting
const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const ContactNotifications: React.FC<ContactNotificationsProps> = ({
  autoRefresh = true,
  maxContacts = 10,
  showActions = true
}) => {
  const { authAxios } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch admin notifications
      const adminResponse = await authAxios.get('/api/admin/finance/notifications');
      
      // Fetch contact form submissions
      const contactResponse = await authAxios.get('/api/contact?limit=5');

      const adminNotifications = adminResponse.data.success 
        ? adminResponse.data.data.notifications.map((notif: any) => ({
            id: notif.id || Math.random().toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            amount: notif.amount,
            timestamp: notif.timestamp || notif.createdAt,
            priority: notif.priority,
            isRead: false,
            actionRequired: notif.type === 'payment_failed',
            userId: notif.userId,
            userName: notif.userName
          }))
        : [];

      // Convert contact submissions to notifications
      const contactNotifications = contactResponse.data.contacts
        ? contactResponse.data.contacts.slice(0, 3).map((contact: any) => ({
            id: `contact_${contact.id}`,
            type: 'contact' as const,
            title: 'New Contact Form Submission',
            message: `${contact.name} (${contact.email}) sent: "${contact.message.substring(0, 50)}${contact.message.length > 50 ? '...' : ''}"`,
            timestamp: contact.createdAt,
            priority: 'medium' as const,
            isRead: false,
            actionRequired: true,
            userName: contact.name
          }))
        : [];

      // Combine and sort notifications
      const allNotifications = [...adminNotifications, ...contactNotifications]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxContacts);

      setNotifications(allNotifications);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authAxios, maxContacts]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'contact') {
      // Navigate to contact management
      window.open('/dashboard/contact-management', '_blank');
    } else if (notification.type === 'purchase' || notification.type === 'high_value_purchase') {
      // Navigate to revenue analytics
      window.open('/dashboard/revenue', '_blank');
    } else if (notification.type === 'new_user') {
      // Navigate to user management
      window.open('/dashboard/user-management', '_blank');
    }
  };

  // Filter notifications
  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading && notifications.length === 0) {
    return (
      <NotificationsContainer>
        <LoadingSpinner />
      </NotificationsContainer>
    );
  }

  return (
    <NotificationsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <NotificationHeader>
        <HeaderTitle>
          <Bell size={20} />
          Business Intelligence Alerts
          {unreadCount > 0 && <NotificationBadge>{unreadCount}</NotificationBadge>}
        </HeaderTitle>
        
        {showActions && (
          <HeaderControls>
            <ControlButton
              className={showUnreadOnly ? 'active' : ''}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={showUnreadOnly ? 'Show all notifications' : 'Show unread only'}
            >
              {showUnreadOnly ? <Eye size={16} /> : <EyeOff size={16} />}
            </ControlButton>
            
            <ControlButton
              onClick={fetchNotifications}
              disabled={refreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh notifications"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </ControlButton>
          </HeaderControls>
        )}
      </NotificationHeader>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          color: '#ef4444',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <NotificationsList>
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                priorityColor={getPriorityColor(notification.priority)}
                className={`${!notification.isRead ? 'unread' : ''} ${notification.priority === 'critical' ? 'urgent' : ''}`}
                onClick={() => handleNotificationClick(notification)}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <NotificationContent>
                  <NotificationIcon color={getPriorityColor(notification.priority)}>
                    {getTypeIcon(notification.type)}
                  </NotificationIcon>
                  
                  <NotificationDetails>
                    <NotificationTitle>{notification.title}</NotificationTitle>
                    <NotificationMessage>{notification.message}</NotificationMessage>
                    
                    <NotificationMeta>
                      <NotificationTime>
                        <Clock size={12} />
                        {formatTimeAgo(notification.timestamp)}
                      </NotificationTime>
                      
                      {notification.amount && (
                        <NotificationAmount>
                          ${notification.amount.toLocaleString()}
                        </NotificationAmount>
                      )}
                    </NotificationMeta>
                  </NotificationDetails>
                  
                  {notification.actionRequired && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      color: '#f59e0b',
                      fontWeight: 500,
                      flexShrink: 0
                    }}>
                      Action Required
                    </div>
                  )}
                </NotificationContent>
              </NotificationItem>
            ))
          ) : (
            <EmptyState>
              <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <div>All caught up! No new notifications.</div>
            </EmptyState>
          )}
        </AnimatePresence>
      </NotificationsList>
    </NotificationsContainer>
  );
};

export default ContactNotifications;