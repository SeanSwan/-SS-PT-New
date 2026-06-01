import type { ReactNode } from 'react';

export interface RecentSignup {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface DashboardStats {
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

export interface DatabaseHealth {
  status: string;
  database: string;
  version: string;
  connectivity: string;
  userTableAccessible: boolean;
  totalUsers: number;
  lastUserCreated: string | null;
  timestamp: string;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
}

export interface AuthAxiosLike {
  get: <T>(url: string) => Promise<{ data: ApiEnvelope<T> }>;
}

export interface SignupsListData {
  signups?: RecentSignup[];
  pagination?: {
    hasMore?: boolean;
  };
}

export interface RealTimeSignupMonitoringProps {
  authAxios: AuthAxiosLike;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface DatabaseStatusInfo {
  className: 'healthy' | 'warning' | 'error';
  icon: ReactNode;
  text: string;
}
