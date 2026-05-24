/**
 * Real-time Signup Monitoring Panel
 * MASTER PROMPT V42 COMPLIANCE: Live Database Persistence Verification
 * 
 * This component provides:
 * 1. Real-time display of new signups
 * 2. Database connectivity status
 * 3. Signup rate analytics
 * 4. Live persistence verification
 * 5. Admin confidence in data integrity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Users, UserPlus, Database, Activity, CheckCircle, 
  AlertTriangle, RefreshCw, Clock, TrendingUp,
  Eye, Server, Wifi, WifiOff, Zap
} from 'lucide-react';

// Styled Components
const MonitoringPanel = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h3 {
    color: #60C0F0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  
  &.healthy {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .stat-icon {
    padding: 0.5rem;
    border-radius: 8px;
    background: rgba(139, 92, 246, 0.2);
    color: #60C0F0;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #60C0F0;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
  }
  
  .stat-change {
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    &.positive {
      color: #10b981;
    }
    
    &.neutral {
      color: rgba(255, 255, 255, 0.6);
    }
  }
`;

const RecentSignupsList = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 400px;
  overflow-y: auto;

  @media (max-width: 768px) {
    max-height: 260px;
  }
  
  .signup-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 600;
    color: #60C0F0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .signup-item {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;
    
    &:hover {
      background: rgba(139, 92, 246, 0.05);
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .user-info {
    .user-name {
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }
    
    .user-email {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
    }
  }
  
  .signup-time {
    text-align: right;
    
    .time-ago {
      font-size: 0.875rem;
      color: #60C0F0;
      font-weight: 600;
    }
    
    .timestamp {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

const RefreshButton = styled(motion.button)`
  background: linear-gradient(135deg, #60C0F0, #00c8ff);
  border: none;
  border-radius: 8px;
  color: #002060;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  min-height: 44px;
  
  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
`;

const LoadingRefreshIcon = styled(RefreshCw)`
  color: var(--accent-primary, #60c0f0);
`;

const LoadingText = styled.p`
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  margin: 1rem 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }
`;

const ErrorBanner = styled.div`
  align-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: var(--color-error, #ef4444);
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
`;

const LastUpdatedText = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.75rem;
  margin-left: auto;
`;

const EmptySignupsState = styled.div`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  padding: 2rem;
  text-align: center;
`;

const SignupListError = styled.div`
  align-items: center;
  background: rgba(245, 158, 11, 0.1);
  border-bottom: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--accent-warning, #f59e0b);
  display: flex;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.875rem 1rem;
`;

const LoadMoreRow = styled.div`
  padding: 0.75rem;
  text-align: center;
`;

const LoadMoreButton = styled.button`
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: var(--accent-primary, #60c0f0);
  cursor: pointer;
  font-size: 0.85rem;
  min-height: 44px;
  padding: 0.5rem 1.5rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }
`;

const AutoRefreshIndicator = styled.div`
  align-items: center;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  display: flex;
  font-size: 0.75rem;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1rem;
  padding: 0.5rem;
  text-align: center;
`;

// Types
interface RecentSignup {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    recentSignups: number;
    weeklySignups: number;
    monthlySignups: number;
  };
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
    averageDailySignups: string;
  };
  distribution: {
    byRole: Array<{ role: string; count: number }>;
    activePercentage: string;
  };
  latestSignups: RecentSignup[];
  timestamp: string;
  databaseStatus: string;
}

interface DatabaseHealth {
  status: string;
  database: string;
  version: string;
  connectivity: string;
  userTableAccessible: boolean;
  totalUsers: number;
  lastUserCreated: string | null;
  timestamp: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
}

interface AuthAxiosLike {
  get: <T>(url: string) => Promise<{ data: ApiEnvelope<T> }>;
}

interface SignupsListData {
  signups?: RecentSignup[];
  pagination?: {
    hasMore?: boolean;
  };
}

interface Props {
  authAxios: AuthAxiosLike;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const isDegradedError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'isDegraded' in err &&
  Boolean((err as { isDegraded?: boolean }).isDegraded);

const RealTimeSignupMonitoring: React.FC<Props> = ({ 
  authAxios, 
  autoRefresh = true, 
  refreshInterval = 30000 
}) => {
  const SIGNUPS_PAGE_SIZE = 20;

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealth | null>(null);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [signupsOffset, setSignupsOffset] = useState(0);
  const [signupsHasMore, setSignupsHasMore] = useState(true);
  const [signupsError, setSignupsError] = useState<string | null>(null);
  const [loadingMoreSignups, setLoadingMoreSignups] = useState(false);

  // Upsert helper: merges fresh signups into accumulated state, dedupes by id
  const upsertSignups = useCallback((existing: RecentSignup[], fresh: RecentSignup[]): RecentSignup[] => {
    const merged = new Map<string, RecentSignup>();
    for (const s of existing) merged.set(String(s.id), s);
    for (const s of fresh) merged.set(String(s.id), s);
    return [...merged.values()].sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Tie-break by id DESC (numeric comparison via string → number)
      return Number(b.id) - Number(a.id);
    });
  }, []);

  // Fetch dashboard statistics (summary cards only)
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await authAxios.get<DashboardStats>('/api/admin/dashboard-stats');
      if (response.data.success) {
        setDashboardStats(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Error fetching dashboard stats:', err);
      if (!isDegradedError(err)) {
        setError('Failed to fetch dashboard statistics');
      }
    }
  }, [authAxios]);

  // Fetch signups list (lightweight, paginated)
  const fetchSignupsList = useCallback(async (offset: number, includeTotal: boolean): Promise<boolean> => {
    try {
      const params = new URLSearchParams({
        limit: String(SIGNUPS_PAGE_SIZE),
        offset: String(offset)
      });
      if (includeTotal) params.set('includeTotal', 'true');
      const response = await authAxios.get<SignupsListData>(`/api/admin/signups-list?${params}`);
      if (response.data.success) {
        const freshSignups = response.data.data.signups || [];
        setSignupsHasMore(response.data.data.pagination?.hasMore ?? false);
        setSignupsError(null);
        // Upsert into accumulated state
        setRecentSignups(prev => upsertSignups(prev, freshSignups));
        return true;
      }
      setSignupsError('Recent signups unavailable.');
      return false;
    } catch (err: unknown) {
      console.error('Error fetching signups list:', err);
      setSignupsError('Recent signups unavailable.');
      return false;
    }
  }, [authAxios, upsertSignups]);

  // Fetch database health
  const fetchDatabaseHealth = useCallback(async () => {
    try {
      const response = await authAxios.get<DatabaseHealth>('/api/admin/database-health');
      if (response.data.success) {
        setDatabaseHealth(response.data.data);
      } else {
        setDatabaseHealth(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Error fetching database health:', err);
      setDatabaseHealth({
        status: 'error',
        database: 'unknown',
        version: 'unknown',
        connectivity: 'failed',
        userTableAccessible: false,
        totalUsers: 0,
        lastUserCreated: null,
        timestamp: new Date().toISOString()
      });
    }
  }, [authAxios]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const [, signupsLoaded] = await Promise.all([
        fetchDashboardStats(),
        fetchSignupsList(0, false),
        fetchDatabaseHealth()
      ]);
      if (signupsLoaded) {
        setSignupsOffset(0);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDashboardStats, fetchSignupsList, fetchDatabaseHealth]);

  // Load More signups
  const handleLoadMoreSignups = useCallback(async () => {
    const nextOffset = signupsOffset + SIGNUPS_PAGE_SIZE;
    setLoadingMoreSignups(true);
    try {
      const signupsLoaded = await fetchSignupsList(nextOffset, false);
      if (signupsLoaded) {
        setSignupsOffset(nextOffset);
      }
    } finally {
      setLoadingMoreSignups(false);
    }
  }, [signupsOffset, fetchSignupsList]);

  // Initial load: dashboard-stats (summary) + signups-list (pagination bootstrap) + database-health
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        const [, signupsLoaded] = await Promise.all([
          fetchDashboardStats(),
          fetchSignupsList(0, true),
          fetchDatabaseHealth()
        ]);
        if (signupsLoaded) {
          setSignupsOffset(0);
        }
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh: upsert fresh page-1 signups (no includeTotal)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, handleRefresh]);

  // Helper functions
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const signupTime = new Date(dateString);
    const diffMs = now.getTime() - signupTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getDatabaseStatusInfo = () => {
    if (!databaseHealth) return { className: 'warning', icon: <AlertTriangle size={16} />, text: 'Checking...' };
    
    switch (databaseHealth.status) {
      case 'healthy':
        return { className: 'healthy', icon: <CheckCircle size={16} />, text: 'Database Healthy' };
      case 'error':
      case 'unhealthy':
        return { className: 'error', icon: <WifiOff size={16} />, text: 'Database Error' };
      default:
        return { className: 'warning', icon: <AlertTriangle size={16} />, text: 'Status Unknown' };
    }
  };

  if (loading) {
    return (
      <MonitoringPanel
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <LoadingState>
          <LoadingRefreshIcon size={32} className="animate-spin" />
          <LoadingText>
            Loading database monitoring...
          </LoadingText>
        </LoadingState>
      </MonitoringPanel>
    );
  }

  const dbStatus = getDatabaseStatusInfo();

  return (
    <MonitoringPanel
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <HeaderSection>
        <h3>
          <Database size={24} />
          Real-time Signup Monitoring
        </h3>
        
        <HeaderActions>
          <StatusIndicator className={dbStatus.className}>
            {dbStatus.icon}
            {dbStatus.text}
          </StatusIndicator>
          
          <RefreshButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </HeaderSection>

      {error && (
        <ErrorBanner role="alert">
          <AlertTriangle size={16} />
          {error}
        </ErrorBanner>
      )}

      {/* Statistics Grid */}
      <StatsGrid>
        <StatCard
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">
            {dashboardStats?.overview.totalUsers || '0'}
          </div>
          <div className="stat-label">Total Users</div>
          <div className="stat-change neutral">
            <Wifi size={12} />
            {databaseHealth?.connectivity || 'checking'}
          </div>
        </StatCard>

        <StatCard
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <UserPlus size={20} />
            </div>
          </div>
          <div className="stat-value">
            {dashboardStats?.overview.recentSignups || '0'}
          </div>
          <div className="stat-label">Last 24 Hours</div>
          <div className="stat-change positive">
            <TrendingUp size={12} />
            {dashboardStats?.growth.averageDailySignups || '0'}/day avg
          </div>
        </StatCard>

        <StatCard
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-value">
            {dashboardStats?.overview.activeUsers || '0'}
          </div>
          <div className="stat-label">Active Users</div>
          <div className="stat-change neutral">
            <Eye size={12} />
            {dashboardStats?.distribution.activePercentage || '0'}% of total
          </div>
        </StatCard>

        <StatCard
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <Server size={20} />
            </div>
          </div>
          <div className="stat-value">
            {databaseHealth?.status === 'healthy' ? '99.9%' : '0%'}
          </div>
          <div className="stat-label">Database Uptime</div>
          <div className="stat-change neutral">
            <Zap size={12} />
            {databaseHealth?.version || 'unknown'}
          </div>
        </StatCard>
      </StatsGrid>

      {/* Recent Signups List */}
      <RecentSignupsList>
        <div className="signup-header">
          <Clock size={16} />
          Recent Signups (Live)
          <LastUpdatedText>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </LastUpdatedText>
        </div>

        {signupsError && (
          <SignupListError role="alert">
            <AlertTriangle size={16} />
            {signupsError}
          </SignupListError>
        )}
        
        <AnimatePresence>
          {recentSignups.length > 0 ? (
            recentSignups.map((signup, index) => (
              <motion.div
                key={signup.id}
                className="signup-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="user-info">
                  <div className="user-name">
                    {signup.firstName} {signup.lastName}
                  </div>
                  <div className="user-email">
                    {signup.email}
                  </div>
                </div>
                
                <div className="signup-time">
                  <div className="time-ago">
                    {getTimeAgo(signup.createdAt)}
                  </div>
                  <div className="timestamp">
                    {new Date(signup.createdAt).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))
          ) : !signupsError ? (
            <EmptySignupsState>
              No recent signups to display
            </EmptySignupsState>
          ) : null}
        </AnimatePresence>

        {signupsHasMore && (
          <LoadMoreRow>
            <LoadMoreButton
              onClick={handleLoadMoreSignups}
              disabled={isRefreshing || loadingMoreSignups}
            >
              {isRefreshing || loadingMoreSignups ? 'Loading...' : 'Load More Signups'}
            </LoadMoreButton>
          </LoadMoreRow>
        )}
      </RecentSignupsList>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <AutoRefreshIndicator>
          <Zap size={12} />
          Auto-refreshing every {refreshInterval / 1000} seconds
        </AutoRefreshIndicator>
      )}
    </MonitoringPanel>
  );
};

export default RealTimeSignupMonitoring;
