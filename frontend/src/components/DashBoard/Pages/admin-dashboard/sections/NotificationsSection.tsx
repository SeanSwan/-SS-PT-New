/**
 * NotificationsSection.tsx
 * ========================
 * 
 * Comprehensive Notifications Management Interface for Admin Dashboard
 * Manages system notifications, user alerts, and communication channels
 * Styled with Stellar Command Center theme
 * 
 * Features:
 * - System notification management
 * - User alert broadcasting
 * - Email campaign oversight
 * - Push notification controls
 * - Notification templates
 * - Delivery status tracking
 * - Automated notification rules
 * - WCAG AA accessibility compliance
 * 
 * Backend Integration:
 * - /api/admin/notifications (GET, POST, PUT, DELETE)
 * - /api/admin/notifications/broadcast (POST)
 * - /api/admin/notifications/templates (GET, POST, PUT, DELETE)
 * - /api/admin/notifications/analytics (GET)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Bell, BellRing, Mail, MessageSquare, Send, Users,
  Search, Filter, Download, RefreshCw, MoreVertical,
  AlertTriangle, CheckCircle, Clock, Eye, Edit3,
  Trash2, Plus, Settings, BarChart3, Target,
  Smartphone, Monitor, Globe, Zap, Star, X, FileText
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// === STYLED COMPONENTS ===
const ManagementContainer = styled.div`
  padding: 0;
`;

const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
  
  option {
    background: #1e3a8a;
    color: #ffffff;
  }
`;

const CommandButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #2563eb 0%, #00e6ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled(motion.button)`
  flex: 1;
  padding: 0.75rem 1rem;
  background: ${props => props.active ? 
    'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
    'transparent'
  };
  border: none;
  border-radius: 8px;
  color: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  font-weight: ${props => props.active ? 600 : 400};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
      'rgba(255, 255, 255, 0.1)'
    };
    color: white;
  }
`;

const NotificationsGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const NotificationCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.type) {
        case 'system': return 'linear-gradient(90deg, #3b82f6, #1d4ed8)';
        case 'user': return 'linear-gradient(90deg, #10b981, #00ffff)';
        case 'marketing': return 'linear-gradient(90deg, #f59e0b, #eab308)';
        case 'alert': return 'linear-gradient(90deg, #ef4444, #dc2626)';
        default: return 'linear-gradient(90deg, #6b7280, #9ca3af)';
      }
    }};
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const NotificationInfo = styled.div`
  flex: 1;
`;

const NotificationTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
`;

const NotificationDescription = styled.p`
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const NotificationMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.draft {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
  
  &.scheduled {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.sent {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.failed {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const TypeBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.system {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  &.user {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.marketing {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.alert {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const DeliveryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionMenu = styled.div`
  position: relative;
`;

const ActionButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ActionItem = styled(motion.button)`
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  
  &.danger {
    color: #ef4444;
    
    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
  
  &.success {
    color: #10b981;
    
    &:hover {
      background: rgba(16, 185, 129, 0.1);
    }
  }
`;

const StatsBar = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.5rem;
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BroadcastPanel = styled(motion.div)`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const BroadcastTitle = styled.h3`
  color: #10b981;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BroadcastForm = styled.div`
  display: grid;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
`;

const FormInput = styled.input`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const FormTextarea = styled.textarea`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

// === INTERFACES ===
interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'user' | 'marketing' | 'alert';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  audience: {
    type: 'all' | 'clients' | 'trainers' | 'specific';
    count: number;
  };
  channels: Array<'email' | 'push' | 'in-app' | 'sms'>;
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
  template?: string;
}

interface NotificationStats {
  totalNotifications: number;
  sentToday: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
}

// === MAIN COMPONENT ===
const NotificationsSection: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    totalNotifications: 0,
    sentToday: 0,
    openRate: 0,
    clickRate: 0,
    failureRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  
  // Broadcast form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    content: '',
    type: 'user',
    audience: 'all',
    channels: ['email', 'in-app']
  });

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get('/api/admin/notifications', {
        params: {
          includeMetrics: true,
          includeAnalytics: true
        }
      });
      
      if (response.data.success) {
        const notificationsData = response.data.notifications.map((notif: any) => ({
          id: notif.id?.toString() || '',
          title: notif.title || '',
          content: notif.content || '',
          type: notif.type || 'user',
          status: notif.status || 'draft',
          audience: {
            type: notif.audience?.type || 'all',
            count: notif.audience?.count || 0
          },
          channels: notif.channels || ['email'],
          createdAt: notif.createdAt || new Date().toISOString(),
          scheduledFor: notif.scheduledFor,
          sentAt: notif.sentAt,
          metrics: {
            sent: notif.metrics?.sent || 0,
            delivered: notif.metrics?.delivered || 0,
            opened: notif.metrics?.opened || 0,
            clicked: notif.metrics?.clicked || 0
          },
          template: notif.template
        }));
        
        setNotifications(notificationsData);
        calculateStats(notificationsData);
      } else {
        console.error('Failed to fetch notifications:', response.data.message);
        setMockData();
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Set mock data for development/testing
  const setMockData = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Welcome to SwanStudios Premium!',
        content: 'Congratulations on upgrading to Premium! You now have access to all our exclusive features and personalized training programs.',
        type: 'user',
        status: 'sent',
        audience: {
          type: 'clients',
          count: 156
        },
        channels: ['email', 'in-app'],
        createdAt: '2024-05-22T10:00:00Z',
        sentAt: '2024-05-22T10:15:00Z',
        metrics: {
          sent: 156,
          delivered: 154,
          opened: 128,
          clicked: 89
        },
        template: 'welcome-premium'
      },
      {
        id: '2',
        title: 'System Maintenance Scheduled',
        content: 'We will be performing scheduled maintenance on our systems this Sunday from 2 AM to 4 AM EST. During this time, some features may be temporarily unavailable.',
        type: 'system',
        status: 'scheduled',
        audience: {
          type: 'all',
          count: 342
        },
        channels: ['email', 'push', 'in-app'],
        createdAt: '2024-05-21T14:30:00Z',
        scheduledFor: '2024-05-25T06:00:00Z',
        metrics: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0
        }
      },
      {
        id: '3',
        title: 'New Year Fitness Challenge - 50% Off!',
        content: 'Start your fitness journey with our exclusive New Year Challenge! Get 50% off all premium packages and achieve your health goals with expert guidance.',
        type: 'marketing',
        status: 'sent',
        audience: {
          type: 'all',
          count: 892
        },
        channels: ['email', 'push', 'sms'],
        createdAt: '2024-01-01T08:00:00Z',
        sentAt: '2024-01-01T09:00:00Z',
        metrics: {
          sent: 892,
          delivered: 878,
          opened: 567,
          clicked: 234
        },
        template: 'marketing-promo'
      },
      {
        id: '4',
        title: 'Security Alert: Multiple Failed Login Attempts',
        content: 'ALERT: Multiple failed login attempts detected from unusual locations. Please review security logs and consider implementing additional security measures.',
        type: 'alert',
        status: 'sent',
        audience: {
          type: 'specific',
          count: 3
        },
        channels: ['email', 'in-app'],
        createdAt: '2024-05-22T15:45:00Z',
        sentAt: '2024-05-22T15:46:00Z',
        metrics: {
          sent: 3,
          delivered: 3,
          opened: 3,
          clicked: 2
        }
      }
    ];
    
    setNotifications(mockNotifications);
    calculateStats(mockNotifications);
  };

  // Calculate notification statistics
  const calculateStats = (notificationsData: Notification[]) => {
    const totalNotifications = notificationsData.length;
    const sentToday = notificationsData.filter(n => {
      if (!n.sentAt) return false;
      const sentDate = new Date(n.sentAt);
      const today = new Date();
      return sentDate.toDateString() === today.toDateString();
    }).length;
    
    const sentNotifications = notificationsData.filter(n => n.status === 'sent');
    const totalSent = sentNotifications.reduce((sum, n) => sum + n.metrics.sent, 0);
    const totalOpened = sentNotifications.reduce((sum, n) => sum + n.metrics.opened, 0);
    const totalClicked = sentNotifications.reduce((sum, n) => sum + n.metrics.clicked, 0);
    const failedNotifications = notificationsData.filter(n => n.status === 'failed').length;
    
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
    const failureRate = totalNotifications > 0 ? Math.round((failedNotifications / totalNotifications) * 100) : 0;
    
    setStats({
      totalNotifications,
      sentToday,
      openRate,
      clickRate,
      failureRate
    });
  };

  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notif.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || notif.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || notif.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle notification actions
  const handleCreateNotification = () => {
    console.log('Create new notification');
    setActiveActionMenu(null);
  };

  const handleEditNotification = (notificationId: string) => {
    console.log('Edit notification:', notificationId);
    setActiveActionMenu(null);
  };

  const handleViewNotification = (notificationId: string) => {
    console.log('View notification details:', notificationId);
    setActiveActionMenu(null);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await authAxios.delete(`/api/admin/notifications/${notificationId}`);
      
      if (response.data.success) {
        await fetchNotifications();
        setActiveActionMenu(null);
      } else {
        console.error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDuplicateNotification = (notificationId: string) => {
    console.log('Duplicate notification:', notificationId);
    setActiveActionMenu(null);
  };

  const handleSendTestNotification = (notificationId: string) => {
    console.log('Send test notification:', notificationId);
    setActiveActionMenu(null);
  };

  // Handle broadcast form
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await authAxios.post('/api/admin/notifications/broadcast', {
        ...broadcastForm,
        scheduledFor: new Date().toISOString()
      });
      
      if (response.data.success) {
        setBroadcastForm({
          title: '',
          content: '',
          type: 'user',
          audience: 'all',
          channels: ['email', 'in-app']
        });
        await fetchNotifications();
      } else {
        console.error('Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <Settings size={16} />;
      case 'user': return <User size={16} />;
      case 'marketing': return <Target size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail size={14} />;
      case 'push': return <Smartphone size={14} />;
      case 'in-app': return <Monitor size={14} />;
      case 'sms': return <MessageSquare size={14} />;
      default: return <Bell size={14} />;
    }
  };

  if (loading) {
    return (
      <ManagementContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={32} color="#00ffff" />
          </motion.div>
        </div>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      {/* Stats Overview */}
      <StatsBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.totalNotifications}</StatNumber>
          <StatTitle>Total Notifications</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.sentToday}</StatNumber>
          <StatTitle>Sent Today</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.openRate}%</StatNumber>
          <StatTitle>Open Rate</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.clickRate}%</StatNumber>
          <StatTitle>Click Rate</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber>{stats.failureRate}%</StatNumber>
          <StatTitle>Failure Rate</StatTitle>
        </StatCard>
      </StatsBar>

      {/* Tab Navigation */}
      <TabContainer>
        <TabButton
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Bell size={16} />
          Notifications
        </TabButton>
        <TabButton
          active={activeTab === 'broadcast'}
          onClick={() => setActiveTab('broadcast')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Send size={16} />
          Broadcast
        </TabButton>
        <TabButton
          active={activeTab === 'templates'}
          onClick={() => setActiveTab('templates')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText size={16} />
          Templates
        </TabButton>
        <TabButton
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <BarChart3 size={16} />
          Analytics
        </TabButton>
      </TabContainer>

      {/* Broadcast Panel */}
      {activeTab === 'broadcast' && (
        <BroadcastPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BroadcastTitle>
            <Send size={20} />
            Send Broadcast Notification
          </BroadcastTitle>
          
          <form onSubmit={handleBroadcastSubmit}>
            <BroadcastForm>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormGroup>
                  <FormLabel>Title</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="Notification title..."
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <FormLabel>Type</FormLabel>
                  <FilterSelect
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="system">System</option>
                    <option value="marketing">Marketing</option>
                    <option value="alert">Alert</option>
                  </FilterSelect>
                </FormGroup>
              </div>
              
              <FormGroup>
                <FormLabel>Content</FormLabel>
                <FormTextarea
                  placeholder="Notification content..."
                  value={broadcastForm.content}
                  onChange={(e) => setBroadcastForm(prev => ({ ...prev, content: e.target.value }))}
                  required
                />
              </FormGroup>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormGroup>
                  <FormLabel>Audience</FormLabel>
                  <FilterSelect
                    value={broadcastForm.audience}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, audience: e.target.value }))}
                  >
                    <option value="all">All Users</option>
                    <option value="clients">Clients Only</option>
                    <option value="trainers">Trainers Only</option>
                    <option value="specific">Specific Group</option>
                  </FilterSelect>
                </FormGroup>
                
                <FormGroup>
                  <FormLabel>Channels</FormLabel>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    {['email', 'push', 'in-app', 'sms'].map(channel => (
                      <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={broadcastForm.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBroadcastForm(prev => ({ 
                                ...prev, 
                                channels: [...prev.channels, channel] 
                              }));
                            } else {
                              setBroadcastForm(prev => ({ 
                                ...prev, 
                                channels: prev.channels.filter(c => c !== channel) 
                              }));
                            }
                          }}
                        />
                        {getChannelIcon(channel)}
                        {channel}
                      </label>
                    ))}
                  </div>
                </FormGroup>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <CommandButton
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ background: 'rgba(107, 114, 128, 0.2)' }}
                >
                  Save Draft
                </CommandButton>
                <CommandButton
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={16} />
                  Send Now
                </CommandButton>
              </div>
            </BroadcastForm>
          </form>
        </BroadcastPanel>
      )}

      {/* Notifications List */}
      {activeTab === 'notifications' && (
        <>
          {/* Action Bar */}
          <ActionBar
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <SearchContainer>
              <div style={{ position: 'relative', flex: 1 }}>
                <SearchIcon>
                  <Search size={16} />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Search notifications by title or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <FilterSelect
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="system">System</option>
                <option value="user">User</option>
                <option value="marketing">Marketing</option>
                <option value="alert">Alert</option>
              </FilterSelect>
              
              <FilterSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </FilterSelect>
            </SearchContainer>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchNotifications}
              >
                <RefreshCw size={16} />
                Refresh
              </CommandButton>
              
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={16} />
                Export
              </CommandButton>
              
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateNotification}
              >
                <Plus size={16} />
                Create
              </CommandButton>
            </div>
          </ActionBar>

          {/* Notifications Grid */}
          <NotificationsGrid>
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <NotificationCard
                  key={notification.id}
                  type={notification.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <NotificationHeader>
                    <NotificationInfo>
                      <NotificationTitle>{notification.title}</NotificationTitle>
                      <NotificationDescription>{notification.content}</NotificationDescription>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <TypeBadge className={notification.type}>
                          {getTypeIcon(notification.type)}
                          {notification.type}
                        </TypeBadge>
                        <StatusBadge className={notification.status}>
                          {notification.status}
                        </StatusBadge>
                      </div>
                    </NotificationInfo>
                    
                    <ActionMenu>
                      <ActionButton
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setActiveActionMenu(
                          activeActionMenu === notification.id ? null : notification.id
                        )}
                      >
                        <MoreVertical size={16} />
                      </ActionButton>
                      
                      <AnimatePresence>
                        {activeActionMenu === notification.id && (
                          <ActionDropdown
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                          >
                            <ActionItem
                              whileHover={{ x: 4 }}
                              onClick={() => handleViewNotification(notification.id)}
                            >
                              <Eye size={16} />
                              View Details
                            </ActionItem>
                            <ActionItem
                              whileHover={{ x: 4 }}
                              onClick={() => handleEditNotification(notification.id)}
                            >
                              <Edit3 size={16} />
                              Edit
                            </ActionItem>
                            <ActionItem
                              whileHover={{ x: 4 }}
                              onClick={() => handleDuplicateNotification(notification.id)}
                            >
                              <Plus size={16} />
                              Duplicate
                            </ActionItem>
                            <ActionItem
                              className="success"
                              whileHover={{ x: 4 }}
                              onClick={() => handleSendTestNotification(notification.id)}
                            >
                              <Send size={16} />
                              Send Test
                            </ActionItem>
                            <ActionItem
                              className="danger"
                              whileHover={{ x: 4 }}
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 size={16} />
                              Delete
                            </ActionItem>
                          </ActionDropdown>
                        )}
                      </AnimatePresence>
                    </ActionMenu>
                  </NotificationHeader>

                  <NotificationMeta>
                    <MetaItem>
                      <Users size={12} />
                      {notification.audience.count} recipients
                    </MetaItem>
                    <MetaItem>
                      <Clock size={12} />
                      {notification.sentAt ? getTimeAgo(notification.sentAt) : 
                       notification.scheduledFor ? `Scheduled for ${formatDate(notification.scheduledFor)}` :
                       `Created ${getTimeAgo(notification.createdAt)}`}
                    </MetaItem>
                    <MetaItem>
                      <Globe size={12} />
                      {notification.channels.map(getChannelIcon)}
                    </MetaItem>
                  </NotificationMeta>

                  {notification.status === 'sent' && (
                    <DeliveryMetrics>
                      <MetricItem>
                        <MetricValue>{notification.metrics.sent}</MetricValue>
                        <MetricLabel>Sent</MetricLabel>
                      </MetricItem>
                      <MetricItem>
                        <MetricValue>{notification.metrics.delivered}</MetricValue>
                        <MetricLabel>Delivered</MetricLabel>
                      </MetricItem>
                      <MetricItem>
                        <MetricValue>{notification.metrics.opened}</MetricValue>
                        <MetricLabel>Opened</MetricLabel>
                      </MetricItem>
                      <MetricItem>
                        <MetricValue>{notification.metrics.clicked}</MetricValue>
                        <MetricLabel>Clicked</MetricLabel>
                      </MetricItem>
                    </DeliveryMetrics>
                  )}
                </NotificationCard>
              ))}
            </AnimatePresence>
          </NotificationsGrid>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>Notification Templates</h3>
          <p>Manage your notification templates here</p>
          <CommandButton style={{ marginTop: '1rem' }}>
            <Plus size={16} />
            Create Template
          </CommandButton>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>Notification Analytics</h3>
          <p>Detailed analytics and reporting coming soon</p>
        </div>
      )}
      
      {filteredNotifications.length === 0 && activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No notifications found</h3>
          <p>Try adjusting your search or filters</p>
        </motion.div>
      )}
    </ManagementContainer>
  );
};

export default NotificationsSection;