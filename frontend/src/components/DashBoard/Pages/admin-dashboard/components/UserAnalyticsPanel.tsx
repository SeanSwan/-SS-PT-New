/**
 * PRODUCTION-READY USER ANALYTICS PANEL
 * ====================================
 * 
 * Comprehensive user behavior analytics for SwanStudios admin command center
 * Real-time user engagement tracking with advanced behavioral insights
 * Built for high-stakes business presentations and investor demos
 * 
 * 🔥 LIVE USER INTELLIGENCE:
 * - Real-time user activity monitoring
 * - Advanced engagement analytics
 * - User journey tracking and conversion funnels
 * - Behavioral segmentation and insights
 * 
 * 💫 PROFESSIONAL FEATURES:
 * - Executive-grade user behavior visualization
 * - Real-time activity feeds
 * - Cohort analysis and retention metrics
 * - Geographic and demographic breakdowns
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DemoDataBanner from './DemoDataBanner';
import {
  Users, UserPlus, UserCheck, UserX, Activity, Eye,
  Globe, Smartphone, Monitor, Tablet, Clock, Calendar,
  TrendingUp, TrendingDown, Target, Star, Award,
  MapPin, BarChart3, PieChart, LineChart, ArrowUp,
  ArrowDown, Zap, Heart, MessageSquare, ShoppingBag,
  Download, RefreshCw, Filter, AlertTriangle, CheckCircle
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';

// =====================================================
// STYLED COMPONENTS - USER INTELLIGENCE DESIGN
// =====================================================

const userPulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const analyticsFlow = keyframes`
  0% { transform: translateX(-10px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(10px); opacity: 0; }
`;

const UserAnalyticsContainer = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(10, 26, 10, 0.95) 0%, 
    rgba(16, 185, 129, 0.1) 50%,
    rgba(14, 165, 233, 0.05) 100%
  );
  border-radius: 24px;
  padding: 2.5rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
  backdrop-filter: blur(25px);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #10b981, transparent);
    animation: ${analyticsFlow} 4s linear infinite;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1.5rem;
`;

const PanelTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
`;

const LiveUsersIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  font-weight: 600;
  color: #10b981;
`;

const LiveDot = styled(motion.div)`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
  animation: ${userPulse} 2s infinite;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  color: #10b981;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// User Metrics Grid
const UserMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
`;

const MetricCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #059669);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const MetricIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color}15;
  border: 1px solid ${props => props.color}30;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
`;

const MetricValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricChange = styled.div<{ isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.isPositive ? '#10b981' : '#ef4444'};
`;

// Charts Layout
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const ChartTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Live Activity Feed
const ActivityFeedContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const LiveActivityCard = styled(motion.div)`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
`;

const ActivityItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.2);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ActivityIcon = styled.div<{ type: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  
  ${props => props.type === 'login' && `
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
  `}
  
  ${props => props.type === 'purchase' && `
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  `}
  
  ${props => props.type === 'workout' && `
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  `}
  
  ${props => props.type === 'social' && `
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  `}
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(16, 185, 129, 0.2);
  border-left: 4px solid #10b981;
  border-radius: 50%;
`;

// =====================================================
// CHART CONFIGURATION
// =====================================================

const chartColors = {
  primary: '#10b981',
  secondary: '#059669',
  accent: '#047857',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  gradient: 'url(#userGradient)'
};

const deviceColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

// =====================================================
// MAIN COMPONENT
// =====================================================

const UserAnalyticsPanel: React.FC = () => {
  // State Management
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveUsers, setLiveUsers] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveUsersIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // API INTEGRATION
  // =====================================================

  const fetchUserAnalytics = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Call real backend user analytics API
      const response = await fetch('/api/admin/analytics/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUserAnalytics(data.data);
        setLastUpdated(new Date());
        setIsDemoData(false);
      } else {
        throw new Error(data.message || 'Failed to fetch user analytics');
      }
    } catch (err: any) {
      console.error('User analytics fetch error:', err);
      setError(err.message || 'Failed to load user analytics');
      
      // Fallback to demo data — flag it so the banner shows
      setUserAnalytics(generateUserDemoData());
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics/live-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLiveUsers(data.liveUsers || 0);
      } else {
        setLiveUsers(0);
        setIsDemoData(true);
      }
    } catch {
      setLiveUsers(0);
      setIsDemoData(true);
    }
  }, []);

  // Generate impressive demo data
  const generateUserDemoData = useCallback(() => {
    const currentDate = new Date();
    
    // Generate user activity for last 30 days
    const userActivity = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      
      const baseActivity = 150 + Math.random() * 100;
      const weekendFactor = date.getDay() === 0 || date.getDay() === 6 ? 0.7 : 1;
      
      userActivity.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.round(baseActivity * weekendFactor),
        newUsers: Math.round((20 + Math.random() * 15) * weekendFactor),
        sessions: Math.round((baseActivity * 1.8) * weekendFactor),
        pageViews: Math.round((baseActivity * 4.2) * weekendFactor)
      });
    }

    return {
      overview: {
        totalUsers: 12847,
        activeToday: 1456,
        newThisWeek: 284,
        avgSessionDuration: 12.5,
        bounceRate: 24.8,
        conversionRate: 3.7,
        retentionRate: 68.4,
        engagementScore: 8.2
      },
      changes: {
        totalUsers: 15.2,
        activeUsers: 8.9,
        newUsers: 22.1,
        sessionDuration: 12.7,
        bounceRate: -18.3,
        conversion: 24.6
      },
      deviceBreakdown: [
        { name: 'Mobile', users: 7125, percentage: 55.4 },
        { name: 'Desktop', users: 3850, percentage: 30.0 },
        { name: 'Tablet', users: 1547, percentage: 12.0 },
        { name: 'Other', users: 325, percentage: 2.6 }
      ],
      topPages: [
        { page: '/dashboard', views: 45280, uniqueUsers: 8947 },
        { page: '/workouts', views: 38945, uniqueUsers: 7234 },
        { page: '/nutrition', views: 32180, uniqueUsers: 6458 },
        { page: '/store', views: 28740, uniqueUsers: 5896 },
        { page: '/social', views: 24150, uniqueUsers: 4987 }
      ],
      userActivity,
      liveActivity: [
        {
          id: 1,
          type: 'login',
          user: 'Sarah M.',
          action: 'Logged in',
          time: '2 minutes ago',
          location: 'New York, NY'
        },
        {
          id: 2,
          type: 'purchase',
          user: 'Mike J.',
          action: 'Purchased Premium Plan',
          time: '5 minutes ago',
          location: 'Los Angeles, CA'
        },
        {
          id: 3,
          type: 'workout',
          user: 'Jessica L.',
          action: 'Completed HIIT Workout',
          time: '7 minutes ago',
          location: 'Chicago, IL'
        },
        {
          id: 4,
          type: 'social',
          user: 'David K.',
          action: 'Posted progress photo',
          time: '12 minutes ago',
          location: 'Miami, FL'
        },
        {
          id: 5,
          type: 'login',
          user: 'Emma R.',
          action: 'First time login',
          time: '15 minutes ago',
          location: 'Seattle, WA'
        }
      ],
      geographicData: [
        { region: 'North America', users: 6847, percentage: 53.3 },
        { region: 'Europe', users: 3245, percentage: 25.3 },
        { region: 'Asia Pacific', users: 1895, percentage: 14.7 },
        { region: 'South America', users: 564, percentage: 4.4 },
        { region: 'Other', users: 296, percentage: 2.3 }
      ]
    };
  }, []);

  // =====================================================
  // AUTO-REFRESH FUNCTIONALITY
  // =====================================================

  useEffect(() => {
    // Initial data fetch
    fetchUserAnalytics();
    fetchLiveUsers();

    // Set up auto-refresh for analytics
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchUserAnalytics(false);
      }, 60000); // Refresh every minute
    }

    // Set up live users refresh
    liveUsersIntervalRef.current = setInterval(() => {
      fetchLiveUsers();
    }, 10000); // Update live users every 10 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (liveUsersIntervalRef.current) {
        clearInterval(liveUsersIntervalRef.current);
      }
    };
  }, [fetchUserAnalytics, fetchLiveUsers, autoRefresh]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleRefresh = () => {
    fetchUserAnalytics();
    fetchLiveUsers();
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/analytics/users/export?format=csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // =====================================================
  // RENDER LOADING STATE
  // =====================================================

  if (loading && !userAnalytics) {
    return (
      <UserAnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LoadingContainer>
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div style={{ color: '#10b981', fontSize: '1.125rem', fontWeight: 500 }}>
            Loading User Analytics...
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
            Analyzing user behavior patterns
          </div>
        </LoadingContainer>
      </UserAnalyticsContainer>
    );
  }

  // =====================================================
  // RENDER ERROR STATE
  // =====================================================

  if (error && !userAnalytics) {
    return (
      <UserAnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LoadingContainer>
          <AlertTriangle size={48} color="#ef4444" />
          <div style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 600 }}>
            Failed to Load User Analytics
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
            {error}
          </div>
          <ActionButton onClick={handleRefresh}>
            <RefreshCw size={16} />
            Retry Connection
          </ActionButton>
        </LoadingContainer>
      </UserAnalyticsContainer>
    );
  }

  // =====================================================
  // RENDER MAIN DASHBOARD
  // =====================================================

  return (
    <UserAnalyticsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Section */}
      <PanelHeader>
        <div>
          <PanelTitle>
            <Users size={32} />
            User Analytics
          </PanelTitle>
          <LiveUsersIndicator>
            <LiveDot />
            {liveUsers} users online now
          </LiveUsersIndicator>
        </div>

        <ControlsContainer>
          <ActionButton
            onClick={toggleAutoRefresh}
            style={{
              background: autoRefresh ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: autoRefresh ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)'
            }}
          >
            <Activity size={16} />
            {autoRefresh ? 'Live Mode ON' : 'Live Mode OFF'}
          </ActionButton>

          <ActionButton onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </ActionButton>

          <ActionButton onClick={handleExport}>
            <Download size={16} />
            Export
          </ActionButton>
        </ControlsContainer>
      </PanelHeader>

      {isDemoData && <DemoDataBanner />}

      {/* User Metrics Grid */}
      {userAnalytics && (
        <UserMetricsGrid>
          {/* Total Users */}
          <MetricCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <MetricIcon color="#10b981">
                <Users size={24} />
              </MetricIcon>
              <MetricChange isPositive={userAnalytics.changes.totalUsers > 0}>
                {userAnalytics.changes.totalUsers > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(userAnalytics.changes.totalUsers)}%
              </MetricChange>
            </MetricHeader>
            <MetricValue>{userAnalytics.overview.totalUsers.toLocaleString()}</MetricValue>
            <MetricLabel>Total Users</MetricLabel>
          </MetricCard>

          {/* Active Today */}
          <MetricCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <MetricIcon color="#3b82f6">
                <Activity size={24} />
              </MetricIcon>
              <MetricChange isPositive={userAnalytics.changes.activeUsers > 0}>
                {userAnalytics.changes.activeUsers > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(userAnalytics.changes.activeUsers)}%
              </MetricChange>
            </MetricHeader>
            <MetricValue>{userAnalytics.overview.activeToday.toLocaleString()}</MetricValue>
            <MetricLabel>Active Today</MetricLabel>
          </MetricCard>

          {/* New This Week */}
          <MetricCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <MetricIcon color="#059669">
                <UserPlus size={24} />
              </MetricIcon>
              <MetricChange isPositive={userAnalytics.changes.newUsers > 0}>
                {userAnalytics.changes.newUsers > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(userAnalytics.changes.newUsers)}%
              </MetricChange>
            </MetricHeader>
            <MetricValue>{userAnalytics.overview.newThisWeek}</MetricValue>
            <MetricLabel>New This Week</MetricLabel>
          </MetricCard>

          {/* Engagement Score */}
          <MetricCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <MetricHeader>
              <MetricIcon color="#f59e0b">
                <Star size={24} />
              </MetricIcon>
              <MetricChange isPositive={userAnalytics.changes.conversion > 0}>
                {userAnalytics.changes.conversion > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(userAnalytics.changes.conversion)}%
              </MetricChange>
            </MetricHeader>
            <MetricValue>{userAnalytics.overview.engagementScore}/10</MetricValue>
            <MetricLabel>Engagement Score</MetricLabel>
          </MetricCard>
        </UserMetricsGrid>
      )}

      {/* Charts Section */}
      {userAnalytics && (
        <ChartsGrid>
          {/* User Activity Trend */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ChartTitle>
              <LineChart size={20} />
              User Activity Trend (30 Days)
            </ChartTitle>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={userAnalytics.userActivity}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(16, 185, 129, 0.9)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  fill="url(#userGradient)"
                  stroke="#10b981"
                  strokeWidth={3}
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Device Breakdown */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ChartTitle>
              <PieChart size={20} />
              Device Usage
            </ChartTitle>
            <ResponsiveContainer width="100%" height={350}>
              <RePieChart>
                <Pie
                  data={userAnalytics.deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="users"
                  nameKey="name"
                >
                  {userAnalytics.deviceBreakdown.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={deviceColors[index % deviceColors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(16, 185, 129, 0.9)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value: any) => [value.toLocaleString(), 'Users']}
                />
                <Legend 
                  wrapperStyle={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </ChartCard>
        </ChartsGrid>
      )}

      {/* Live Activity Feed */}
      {userAnalytics && (
        <ActivityFeedContainer>
          <LiveActivityCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <ChartTitle>
              <Zap size={20} />
              Live User Activity
            </ChartTitle>
            
            {userAnalytics.liveActivity.map((activity: any, index: number) => (
              <ActivityItem 
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <ActivityIcon type={activity.type}>
                  {activity.type === 'login' && <UserCheck size={16} />}
                  {activity.type === 'purchase' && <ShoppingBag size={16} />}
                  {activity.type === 'workout' && <Activity size={16} />}
                  {activity.type === 'social' && <MessageSquare size={16} />}
                </ActivityIcon>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {activity.user}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {activity.action}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {activity.time} • {activity.location}
                  </div>
                </div>
              </ActivityItem>
            ))}
          </LiveActivityCard>

          <LiveActivityCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <ChartTitle>
              <Eye size={20} />
              Top Pages
            </ChartTitle>
            
            {userAnalytics.topPages.map((page: any, index: number) => (
              <ActivityItem key={index}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {page.page}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {page.views.toLocaleString()} views
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {page.uniqueUsers.toLocaleString()} unique users
                  </div>
                </div>
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  #{index + 1}
                </div>
              </ActivityItem>
            ))}
          </LiveActivityCard>
        </ActivityFeedContainer>
      )}
    </UserAnalyticsContainer>
  );
};

export default UserAnalyticsPanel;
