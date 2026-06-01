import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  Eye,
  Server,
  TrendingUp,
  UserPlus,
  Users,
  Wifi,
  Zap
} from 'lucide-react';
import { getTimeAgo } from './RealTimeSignupMonitoring.logic';
import {
  EmptySignupsState,
  LastUpdatedText,
  LoadMoreButton,
  LoadMoreRow,
  RecentSignupsList,
  SignupHeader,
  SignupItem,
  SignupListError,
  StatCard,
  StatsGrid
} from './RealTimeSignupMonitoring.styles';
import type { DashboardStats, DatabaseHealth, RecentSignup } from './RealTimeSignupMonitoring.types';

interface SignupStatsGridProps {
  dashboardStats: DashboardStats | null;
  databaseHealth: DatabaseHealth | null;
}

export const SignupStatsGrid: React.FC<SignupStatsGridProps> = ({
  dashboardStats,
  databaseHealth
}) => (
  <StatsGrid>
    <StatCard whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <div className="stat-header">
        <div className="stat-icon"><Users size={20} /></div>
      </div>
      <div className="stat-value">{dashboardStats?.overview.totalUsers || '0'}</div>
      <div className="stat-label">Total Users</div>
      <div className="stat-change neutral">
        <Wifi size={12} />
        {databaseHealth?.connectivity || 'checking'}
      </div>
    </StatCard>

    <StatCard whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <div className="stat-header">
        <div className="stat-icon"><UserPlus size={20} /></div>
      </div>
      <div className="stat-value">{dashboardStats?.overview.recentSignups || '0'}</div>
      <div className="stat-label">Last 24 Hours</div>
      <div className="stat-change positive">
        <TrendingUp size={12} />
        {dashboardStats?.growth.averageDailySignups || '0'}/day avg
      </div>
    </StatCard>

    <StatCard whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <div className="stat-header">
        <div className="stat-icon"><Activity size={20} /></div>
      </div>
      <div className="stat-value">{dashboardStats?.overview.activeUsers || '0'}</div>
      <div className="stat-label">Active Users</div>
      <div className="stat-change neutral">
        <Eye size={12} />
        {dashboardStats?.distribution.activePercentage || '0'}% of total
      </div>
    </StatCard>

    <StatCard whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <div className="stat-header">
        <div className="stat-icon"><Server size={20} /></div>
      </div>
      <div className="stat-value">{databaseHealth?.status === 'healthy' ? '99.9%' : '0%'}</div>
      <div className="stat-label">Database Uptime</div>
      <div className="stat-change neutral">
        <Zap size={12} />
        {databaseHealth?.version || 'unknown'}
      </div>
    </StatCard>
  </StatsGrid>
);

interface RecentSignupsSectionProps {
  recentSignups: RecentSignup[];
  signupsError: string | null;
  signupsHasMore: boolean;
  isRefreshing: boolean;
  loadingMoreSignups: boolean;
  lastRefresh: Date;
  onLoadMore: () => void;
}

export const RecentSignupsSection: React.FC<RecentSignupsSectionProps> = ({
  recentSignups,
  signupsError,
  signupsHasMore,
  isRefreshing,
  loadingMoreSignups,
  lastRefresh,
  onLoadMore
}) => (
  <RecentSignupsList>
    <SignupHeader>
      <Clock size={16} />
      Recent Signups (Live)
      <LastUpdatedText>Last updated: {lastRefresh.toLocaleTimeString()}</LastUpdatedText>
    </SignupHeader>

    {signupsError && (
      <SignupListError role="alert">
        <AlertTriangle size={16} />
        {signupsError}
      </SignupListError>
    )}

    <AnimatePresence>
      {recentSignups.length > 0 ? (
        recentSignups.map((signup, index) => (
          <SignupItem
            key={signup.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
          >
            <div>
              <div className="user-name">{signup.firstName} {signup.lastName}</div>
              <div className="user-email">{signup.email}</div>
            </div>
            <div className="signup-time">
              <div className="time-ago">{getTimeAgo(signup.createdAt)}</div>
              <div className="timestamp">{new Date(signup.createdAt).toLocaleString()}</div>
            </div>
          </SignupItem>
        ))
      ) : !signupsError ? (
        <EmptySignupsState>No recent signups to display</EmptySignupsState>
      ) : null}
    </AnimatePresence>

    {signupsHasMore && (
      <LoadMoreRow>
        <LoadMoreButton
          aria-label="Load more signups"
          onClick={onLoadMore}
          disabled={isRefreshing || loadingMoreSignups}
        >
          {isRefreshing || loadingMoreSignups ? 'Loading...' : 'Load More Signups'}
        </LoadMoreButton>
      </LoadMoreRow>
    )}
  </RecentSignupsList>
);
