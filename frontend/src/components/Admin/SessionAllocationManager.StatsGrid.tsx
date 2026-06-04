import React from 'react';
import { AlertTriangle, Calendar, CheckCircle, Users } from 'lucide-react';
import type { SessionAllocationStats } from './SessionAllocationManager.types';
import { StatCard, StatsGrid } from './SessionAllocationManager.layoutStyles';

interface SessionAllocationStatsGridProps {
  stats: SessionAllocationStats;
}

export const SessionAllocationStatsGrid: React.FC<SessionAllocationStatsGridProps> = ({ stats }) => (
  <StatsGrid>
    <StatCard type="primary">
      <div className="stat-value">{stats.totalClients}</div>
      <div className="stat-label">
        <Users size={16} />
        Total Clients
      </div>
    </StatCard>
    <StatCard type="success">
      <div className="stat-value">{stats.totalAvailableSessions}</div>
      <div className="stat-label">
        <Calendar size={16} />
        Available Sessions
      </div>
    </StatCard>
    <StatCard type="info">
      <div className="stat-value">{stats.totalCompletedSessions}</div>
      <div className="stat-label">
        <CheckCircle size={16} />
        Completed Sessions
      </div>
    </StatCard>
    <StatCard type="warning">
      <div className="stat-value">{stats.clientsNeedingSessions}</div>
      <div className="stat-label">
        <AlertTriangle size={16} />
        Need Sessions
      </div>
    </StatCard>
  </StatsGrid>
);
