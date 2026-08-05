/**
 * RealTimeSignupMonitoring
 * Admin overview widget for signup persistence confidence.
 * Keeps summary, signup pagination, and database health as independent reads.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Database, RefreshCw, WifiOff, Zap } from 'lucide-react';
import {
  SIGNUPS_PAGE_SIZE,
  fallbackDatabaseHealth,
  getDatabaseStatusKind,
  isDegradedError,
  upsertSignups
} from './RealTimeSignupMonitoring.logic';
import { RecentSignupsSection, SignupStatsGrid } from './RealTimeSignupMonitoring.sections';
import {
  AutoRefreshIndicator,
  ErrorBanner,
  HeaderActions,
  HeaderSection,
  LoadingRefreshIcon,
  LoadingState,
  LoadingText,
  MonitoringPanel,
  RefreshButton,
  StatusIndicator
} from './RealTimeSignupMonitoring.styles';
import type {
  DashboardStats,
  DatabaseHealth,
  DatabaseStatusInfo,
  RealTimeSignupMonitoringProps,
  RecentSignup,
  SignupsListData
} from './RealTimeSignupMonitoring.types';

const getDatabaseStatusInfo = (databaseHealth: DatabaseHealth | null): DatabaseStatusInfo => {
  const statusKind = getDatabaseStatusKind(databaseHealth);
  if (statusKind === 'healthy') {
    return { className: 'healthy', icon: <CheckCircle size={16} />, text: 'Database Healthy' };
  }
  if (statusKind === 'error') {
    return { className: 'error', icon: <WifiOff size={16} />, text: 'Database Error' };
  }
  return { className: 'warning', icon: <AlertTriangle size={16} />, text: 'Status Unknown' };
};

const RealTimeSignupMonitoring: React.FC<RealTimeSignupMonitoringProps> = ({
  authAxios,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
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

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await authAxios.get<DashboardStats>('/api/admin/dashboard-stats');
      if (response.data.success) setDashboardStats(response.data.data);
    } catch (err: unknown) {
      console.error('Error fetching dashboard stats:', err);
      if (!isDegradedError(err)) setError('Failed to fetch dashboard statistics');
    }
  }, [authAxios]);

  const fetchSignupsList = useCallback(async (
    offset: number,
    includeTotal: boolean
  ): Promise<boolean> => {
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
  }, [authAxios]);

  const fetchDatabaseHealth = useCallback(async () => {
    try {
      const response = await authAxios.get<DatabaseHealth>('/api/admin/database-health');
      setDatabaseHealth(response.data.data);
    } catch (err: unknown) {
      console.error('Error fetching database health:', err);
      setDatabaseHealth(fallbackDatabaseHealth());
    }
  }, [authAxios]);

  // SWA-138 S7: refreshes re-fetch the newest page (upsert dedupes) but only
  // the INITIAL load resets the Load-More offset — a 30s interval tick must
  // never silently throw away the admin's pagination position.
  const refreshAll = useCallback(async (includeTotal: boolean, resetOffset = false) => {
    const [, signupsLoaded] = await Promise.all([
      fetchDashboardStats(),
      fetchSignupsList(0, includeTotal),
      fetchDatabaseHealth()
    ]);
    if (signupsLoaded && resetOffset) {
      setSignupsOffset(0);
    }
    setLastRefresh(new Date());
  }, [fetchDashboardStats, fetchSignupsList, fetchDatabaseHealth]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshAll(false);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAll]);

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

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshAll(true, true);
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, handleRefresh]);

  if (loading) {
    return (
      <MonitoringPanel initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <LoadingState>
          <LoadingRefreshIcon size={32} className="animate-spin" />
          <LoadingText>Loading database monitoring...</LoadingText>
        </LoadingState>
      </MonitoringPanel>
    );
  }

  const dbStatus = getDatabaseStatusInfo(databaseHealth);

  return (
    <MonitoringPanel initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
            aria-label="Refresh signup monitoring"
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
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

      <SignupStatsGrid dashboardStats={dashboardStats} databaseHealth={databaseHealth} />
      <RecentSignupsSection
        recentSignups={recentSignups}
        signupsError={signupsError}
        signupsHasMore={signupsHasMore}
        isRefreshing={isRefreshing}
        loadingMoreSignups={loadingMoreSignups}
        lastRefresh={lastRefresh}
        onLoadMore={handleLoadMoreSignups}
      />

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
