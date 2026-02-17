/**
 * AdminSessionsFiltering.tsx
 * ===========================
 *
 * Advanced filtering and search component for Admin Sessions
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 *
 * Features:
 * - Real-time search with performance optimization
 * - Advanced status filtering with visual feedback
 * - Responsive filter controls
 * - Accessibility compliance (WCAG AA)
 * - Debounced search for performance
 * - Clear filter states and counters
 */

import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Search, Filter, X } from 'lucide-react';
import {
  AdminSessionsFilteringProps,
  SESSION_STATUSES,
  SessionStatus
} from './AdminSessionsTypes';
import { StellarSearchContainer, cardVariants } from './AdminSessionsSharedComponents';

// ===== STYLED COMPONENTS =====

const FilteringContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const SearchFieldContainer = styled.div`
  flex: 1;
  min-width: 280px;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(14, 165, 233, 0.4);
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);
  }

  &:focus-within {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
  }
`;

const SearchAdornment = styled.span`
  display: flex;
  align-items: center;
  padding-left: 12px;
  color: rgba(226, 232, 240, 0.7);
  pointer-events: none;
`;

const StyledSearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  background: transparent;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 0.875rem;
  padding: 8px 12px;

  &::placeholder {
    color: rgba(226, 232, 240, 0.5);
  }
`;

const FilterButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

const FilterChip = styled.span<{
  $active: boolean;
  $filterStatus?: SessionStatus | 'all';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 0.8125rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  background: ${props => {
    if (!props.$active) return 'rgba(107, 114, 128, 0.3)';

    switch (props.$filterStatus) {
      case 'available': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'scheduled': return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
      case 'confirmed': return 'linear-gradient(135deg, #0ea5e9, #0891b2)';
      case 'completed': return 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
      case 'cancelled': return 'linear-gradient(135deg, #ef4444, #f87171)';
      case 'requested': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'linear-gradient(135deg, #3b82f6, #0ea5e9)';
    }
  }};
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${props => {
    if (!props.$active) return 'rgba(107, 114, 128, 0.3)';

    switch (props.$filterStatus) {
      case 'available': return '#10b981';
      case 'scheduled': return '#3b82f6';
      case 'confirmed': return '#0ea5e9';
      case 'completed': return '#8b5cf6';
      case 'cancelled': return '#ef4444';
      case 'requested': return '#f59e0b';
      default: return '#3b82f6';
    }
  }};
  font-weight: ${props => props.$active ? 600 : 400};
  box-shadow: ${props => props.$active ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`;

const FilterButton = styled(motion.div)`
  cursor: pointer;
  transition: all 0.3s ease;
`;

const ClearFiltersButton = styled(motion.button)`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  color: #ef4444;
  padding: 0.5rem 1rem;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FilterSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;

  @media (min-width: 768px) {
    margin-top: 0;
  }
`;

const ResultCount = styled.span`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  font-weight: 500;

  .highlight {
    color: #0ea5e9;
    font-weight: 600;
  }
`;

const FilterControlsRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilteredIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
`;

// ===== FILTER STATUS CONFIGURATION =====

const filterStatusConfig = {
  all: { label: 'All', color: '#3b82f6' },
  available: { label: 'Available', color: '#10b981' },
  requested: { label: 'Requested', color: '#f59e0b' },
  scheduled: { label: 'Scheduled', color: '#3b82f6' },
  confirmed: { label: 'Confirmed', color: '#0ea5e9' },
  completed: { label: 'Completed', color: '#8b5cf6' },
  cancelled: { label: 'Cancelled', color: '#ef4444' }
};

// ===== MAIN COMPONENT =====

const AdminSessionsFiltering: React.FC<AdminSessionsFilteringProps> = ({
  filterState,
  onFilterChange,
  sessionCount
}) => {
  // Memoized filter status list
  const filterStatuses = useMemo(() => SESSION_STATUSES, []);

  // Memoized active filters check
  const hasActiveFilters = useMemo(() => {
    return filterState.searchTerm.length > 0 || filterState.statusFilter !== 'all';
  }, [filterState.searchTerm, filterState.statusFilter]);

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange('searchTerm', event.target.value);
  }, [onFilterChange]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: string) => {
    onFilterChange('statusFilter', status);
  }, [onFilterChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    onFilterChange('searchTerm', '');
    onFilterChange('statusFilter', 'all');
  }, [onFilterChange]);

  return (
    <FilteringContainer
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Search Field */}
      <SearchFieldContainer>
        <SearchInputWrapper>
          <SearchAdornment>
            <Search size={20} />
          </SearchAdornment>
          <StyledSearchInput
            placeholder="Search client, trainer, location, status..."
            value={filterState.searchTerm}
            onChange={handleSearchChange}
            aria-label="Search sessions"
          />
        </SearchInputWrapper>
      </SearchFieldContainer>

      {/* Filter Controls */}
      <FilterControlsRow>
        {/* Status Filter Buttons */}
        <FilterButtonsContainer>
          {filterStatuses.map((status) => {
            const config = filterStatusConfig[status];
            const isActive = filterState.statusFilter === status;

            return (
              <FilterButton
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FilterChip
                  $active={isActive}
                  $filterStatus={status as SessionStatus | 'all'}
                >
                  {config.label}
                </FilterChip>
              </FilterButton>
            );
          })}
        </FilterButtonsContainer>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <ClearFiltersButton
            onClick={handleClearFilters}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={16} />
            Clear
          </ClearFiltersButton>
        )}
      </FilterControlsRow>

      {/* Filter Summary */}
      {(hasActiveFilters || sessionCount > 0) && (
        <FilterSummary>
          <ResultCount>
            <span className="highlight">{sessionCount}</span> session{sessionCount !== 1 ? 's' : ''} found
          </ResultCount>

          {hasActiveFilters && (
            <FilteredIndicator>
              <Filter size={16} color="rgba(255, 255, 255, 0.6)" />
              Filtered
            </FilteredIndicator>
          )}
        </FilterSummary>
      )}
    </FilteringContainer>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsFiltering);

// ===== UTILITY FUNCTIONS =====

export const filterSessions = (
  sessions: any[],
  searchTerm: string,
  statusFilter: string
) => {
  return sessions.filter(session => {
    // Filter out sessions without real clients unless they are 'available' slots
    const hasRealClient = session.client && session.client.id;
    if (!hasRealClient && session.status !== 'available') {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const clientName = session.client
        ? `${session.client.firstName} ${session.client.lastName}`.toLowerCase()
        : '';
      const trainerName = session.trainer
        ? `${session.trainer.firstName} ${session.trainer.lastName}`.toLowerCase()
        : '';
      const searchTermLower = searchTerm.toLowerCase();

      const matchesSearch =
        clientName.includes(searchTermLower) ||
        trainerName.includes(searchTermLower) ||
        (session.location || '').toLowerCase().includes(searchTermLower) ||
        (session.id || '').toString().toLowerCase().includes(searchTermLower) ||
        (session.status || '').toLowerCase().includes(searchTermLower);

      if (!matchesSearch) return false;
    }

    // Status filter
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;

    return matchesStatus;
  });
};

// ===== SEARCH OPTIMIZATION =====

export const createDebounceSearchHandler = (
  onFilterChange: (field: string, value: string) => void,
  delay: number = 300
) => {
  let timeout: NodeJS.Timeout;

  return (searchTerm: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      onFilterChange('searchTerm', searchTerm);
    }, delay);
  };
};

// ===== ACCESSIBILITY HELPERS =====

export const getFilterAriaLabel = (
  statusFilter: string,
  searchTerm: string,
  resultCount: number
): string => {
  let label = `Filter sessions. Currently showing ${resultCount} sessions.`;

  if (statusFilter !== 'all') {
    label += ` Filtered by status: ${statusFilter}.`;
  }

  if (searchTerm) {
    label += ` Search term: ${searchTerm}.`;
  }

  return label;
};

// ===== STATUS CONFIGURATION EXPORT =====

export { filterStatusConfig };
