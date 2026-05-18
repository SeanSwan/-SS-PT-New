/**
 * Charts Module Index
 * ==================
 * 
 * Data processors for Universal Master Schedule analytics.
 * Retired visual chart components live under archive/pending-deletion.
 */

import type { Session, Trainer } from '../types';

type ScheduleSession = Session & {
  price?: number | string | null;
  sessionPrice?: number | string | null;
};

type TrainerAnalyticsSource = Trainer & {
  averageRating?: number | null;
  rating?: number | null;
  clientCount?: number | null;
  revenue?: number | null;
  retention?: number | null;
  socialEngagement?: number | null;
  utilizationRate?: number | null;
  nasmCompliance?: number | null;
};

type SessionDistributionStatus = Session['status'];
type SessionDistributionCountMap = Partial<Record<SessionDistributionStatus, number>>;

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  sessions: number;
  projected?: number;
}

export interface TrainerPerformanceData {
  name: string;
  revenue: number;
  sessions: number;
  rating: number;
  clients: number;
  socialEngagement: number;
  utilizationRate: number;
  retention: number;
  nasmCompliance: number;
}

export interface SessionDistributionData {
  name: string;
  value: number;
  percentage: number;
  status: SessionDistributionStatus;
  color: string;
}

const DEFAULT_SESSION_VALUE = 125;

const SESSION_STATUS_COLORS: Record<SessionDistributionStatus, string> = {
  available: 'var(--success, #22c55e)',
  requested: 'var(--warning, #f59e0b)',
  scheduled: 'var(--accent-primary, #60C0F0)',
  booked: 'var(--accent-primary, #60C0F0)',
  confirmed: 'var(--accent-secondary, #8B5CF6)',
  completed: 'var(--text-muted, #94a3b8)',
  cancelled: 'var(--danger, #ef4444)',
  blocked: 'var(--surface-disabled, #64748b)'
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const sessionValue = (session: ScheduleSession): number =>
  toNumber(session.price ?? session.sessionPrice, DEFAULT_SESSION_VALUE);

const percent = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const processRevenueData = (sessions: Session[]): RevenueDataPoint[] => {
  const dateGroups = sessions.reduce<Record<string, { sessions: number; revenue: number }>>((acc, session) => {
    const date = new Date(session.sessionDate || session.createdAt).toDateString();
    if (!acc[date]) {
      acc[date] = { sessions: 0, revenue: 0 };
    }
    acc[date].sessions += 1;
    if (session.status === 'completed') {
      acc[date].revenue += sessionValue(session as ScheduleSession);
    }
    return acc;
  }, {});

  return Object.entries(dateGroups).map(([date, data]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: data.revenue,
    sessions: data.sessions,
    projected: data.revenue * 1.15
  }));
};

export const processTrainerData = (trainers: Trainer[], sessions: Session[]): TrainerPerformanceData[] => {
  return trainers.map(trainer => {
    const trainerSource = trainer as TrainerAnalyticsSource;
    const trainerSessions = sessions.filter(s => s.trainerId === trainer.id);
    const completedSessions = trainerSessions.filter(s => s.status === 'completed');
    const cancelledSessions = trainerSessions.filter(s => s.status === 'cancelled');
    const activeSessions = trainerSessions.filter(s => ['booked', 'confirmed', 'scheduled', 'completed'].includes(s.status));
    const ratedSessions = trainerSessions
      .map(session => toNumber(session.rating, Number.NaN))
      .filter(Number.isFinite);
    const clientIds = new Set(trainerSessions.map(session => session.userId).filter(Boolean));
    const revenue = trainerSource.revenue ?? completedSessions.reduce(
      (sum, session) => sum + sessionValue(session as ScheduleSession),
      0
    );
    
    return {
      name: `${trainer.firstName} ${trainer.lastName}`,
      revenue,
      sessions: trainerSessions.length,
      rating: toNumber(trainerSource.averageRating ?? trainerSource.rating, average(ratedSessions)),
      clients: toNumber(trainerSource.clientCount, clientIds.size),
      socialEngagement: toNumber(trainerSource.socialEngagement),
      utilizationRate: toNumber(trainerSource.utilizationRate, percent(activeSessions.length, trainerSessions.length)),
      retention: toNumber(
        trainerSource.retention,
        percent(completedSessions.length, completedSessions.length + cancelledSessions.length)
      ),
      nasmCompliance: toNumber(trainerSource.nasmCompliance)
    };
  });
};

export const processSessionDistribution = (sessions: Session[]): SessionDistributionData[] => {
  const statusCounts = sessions.reduce<SessionDistributionCountMap>((acc, session) => {
    const status = session.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = sessions.length;
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count ?? 0,
    percentage: total > 0 ? ((count ?? 0) / total) * 100 : 0,
    status: status as SessionDistributionStatus,
    color: SESSION_STATUS_COLORS[status as SessionDistributionStatus] || 'var(--text-muted, #94a3b8)'
  }));
};
