import type { DatabaseHealth, RecentSignup } from './RealTimeSignupMonitoring.types';

export const SIGNUPS_PAGE_SIZE = 20;

export const isDegradedError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'isDegraded' in err &&
  Boolean((err as { isDegraded?: boolean }).isDegraded);

export const upsertSignups = (
  existing: RecentSignup[],
  fresh: RecentSignup[]
): RecentSignup[] => {
  const merged = new Map<string, RecentSignup>();
  for (const signup of existing) merged.set(String(signup.id), signup);
  for (const signup of fresh) merged.set(String(signup.id), signup);

  return [...merged.values()].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return Number(b.id) - Number(a.id);
  });
};

export const getTimeAgo = (dateString: string): string => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export const getDatabaseStatusKind = (
  databaseHealth: DatabaseHealth | null
): 'healthy' | 'warning' | 'error' => {
  if (!databaseHealth) return 'warning';
  if (databaseHealth.status === 'healthy') return 'healthy';
  if (databaseHealth.status === 'error' || databaseHealth.status === 'unhealthy') return 'error';
  return 'warning';
};

export const fallbackDatabaseHealth = (): DatabaseHealth => ({
  status: 'error',
  database: 'unknown',
  version: 'unknown',
  connectivity: 'failed',
  userTableAccessible: false,
  totalUsers: 0,
  lastUserCreated: null,
  timestamp: new Date().toISOString()
});
