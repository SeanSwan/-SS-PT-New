/**
 * MyClientsView.sections.tsx
 * --------------------------
 * Top-of-page presentation sections for the canonical trainer /clients route.
 */

import type { Dispatch, SetStateAction } from 'react';
import {
  Calendar,
  CheckCircle,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

import GlowButton from '../../ui/buttons/GlowButton';
import type { StatusFilter } from './MyClientsView.types';
import {
  FilterButton,
  FilterSection,
  HeaderActions,
  HeaderSection,
  HeaderTitle,
  SearchContainer,
  StatCard,
  StatsRow,
} from './MyClientsView.layoutStyles';

export interface TrainerClientsStatsSummary {
  totalClients: number;
  paidSessionInventory: number;
  completedSessions: number;
  loggedClients: number;
}

interface TrainerClientsHeaderProps {
  totalClients: number;
  refreshing: boolean;
  onExportReport: () => void;
  onRefresh: () => void;
}

interface TrainerClientsStatsProps {
  stats: TrainerClientsStatsSummary;
}

interface TrainerClientsFiltersProps {
  searchTerm: string;
  statusFilter: StatusFilter;
  onSearchTermChange: Dispatch<SetStateAction<string>>;
  onStatusFilterChange: Dispatch<SetStateAction<StatusFilter>>;
}

const STAT_ACCENTS = {
  purple: {
    color: 'var(--accent-purple, #8b5cf6)',
    soft: 'var(--accent-purple-shadow, rgba(139, 92, 246, 0.3))',
    strong: 'var(--accent-purple-strong-border, rgba(139, 92, 246, 0.6))',
  },
  green: {
    color: 'var(--status-success, #10b981)',
    soft: 'var(--status-success-shadow, rgba(16, 185, 129, 0.3))',
    strong: 'var(--status-success-border, rgba(16, 185, 129, 0.6))',
  },
  blue: {
    color: 'var(--accent-blue, #3b82f6)',
    soft: 'var(--accent-blue-shadow, rgba(59, 130, 246, 0.3))',
    strong: 'var(--accent-blue-border, rgba(59, 130, 246, 0.6))',
  },
  gold: {
    color: 'var(--status-warning, #f59e0b)',
    soft: 'var(--status-warning-shadow, rgba(245, 158, 11, 0.3))',
    strong: 'var(--status-warning-border, rgba(245, 158, 11, 0.6))',
  },
} as const;

export const TrainerClientsHeader = ({
  totalClients,
  refreshing,
  onExportReport,
  onRefresh,
}: TrainerClientsHeaderProps) => (
  <HeaderSection>
    <HeaderTitle>
      <Users size={32} style={{ color: 'var(--accent-purple, #8b5cf6)' }} />
      <div>
        <h1>My Clients</h1>
        <div className="client-count">{totalClients} Active Clients</div>
      </div>
    </HeaderTitle>

    <HeaderActions>
      <GlowButton
        text="Export Report"
        theme="cosmic"
        size="small"
        leftIcon={<Download size={16} />}
        onClick={onExportReport}
      />
      <GlowButton
        text="Refresh"
        theme="purple"
        size="small"
        leftIcon={<RefreshCw size={16} />}
        onClick={onRefresh}
        disabled={refreshing}
      />
    </HeaderActions>
  </HeaderSection>
);

export const TrainerClientsStats = ({ stats }: TrainerClientsStatsProps) => (
  <StatsRow
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
  >
    <StatCard {...statCardProps(STAT_ACCENTS.purple)}>
      <Users size={24} className="stat-icon" />
      <div className="stat-number">{stats.totalClients}</div>
      <div className="stat-label">Active Clients</div>
    </StatCard>
    <StatCard {...statCardProps(STAT_ACCENTS.green)}>
      <CheckCircle size={24} className="stat-icon" />
      <div className="stat-number">{stats.completedSessions}</div>
      <div className="stat-label">Sessions Completed</div>
    </StatCard>
    <StatCard {...statCardProps(STAT_ACCENTS.blue)}>
      <Calendar size={24} className="stat-icon" />
      <div className="stat-number">{stats.paidSessionInventory}</div>
      <div className="stat-label">Paid Session Inventory</div>
    </StatCard>
    <StatCard {...statCardProps(STAT_ACCENTS.gold)}>
      <TrendingUp size={24} className="stat-icon" />
      <div className="stat-number">{stats.loggedClients}</div>
      <div className="stat-label">With Logs</div>
    </StatCard>
  </StatsRow>
);

export const TrainerClientsFilters = ({
  searchTerm,
  statusFilter,
  onSearchTermChange,
  onStatusFilterChange,
}: TrainerClientsFiltersProps) => (
  <FilterSection
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: 0.2 }}
  >
    <SearchContainer>
      <Search size={18} className="search-icon" />
      <input
        type="text"
        placeholder="Search clients by name or email..."
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        className="search-input"
      />
    </SearchContainer>

    {(['all', 'active', 'inactive', 'pending'] as const).map((filter) => (
      <FilterButton
        key={filter}
        active={statusFilter === filter}
        onClick={() => onStatusFilterChange(filter)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {filter === 'all' ? 'All Clients' : labelForFilter(filter)}
      </FilterButton>
    ))}
  </FilterSection>
);

const statCardProps = (accent: typeof STAT_ACCENTS[keyof typeof STAT_ACCENTS]) => ({
  $color: accent.color,
  $colorSoft: accent.soft,
  $colorStrong: accent.strong,
});

const labelForFilter = (filter: Exclude<StatusFilter, 'all'>): string => {
  return filter.charAt(0).toUpperCase() + filter.slice(1);
};
