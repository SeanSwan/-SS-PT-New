import React from 'react';
import { Search } from 'lucide-react';

import { FilterContainer, FilterButtonsContainer, FilterButton } from './AdminSessionsFilters.styles';
import { DateFilterRow, DateInput, SearchInputField, SearchInputWrapper } from './AdminSessionsForm.styles';
import { itemVariants } from './AdminSessionsTheme.styles';

const STATUS_FILTERS = ['all', 'available', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const;

const getStatusFilterLabel = (status: string) => status === 'all' ? 'all statuses' : status;

interface AdminSessionsFiltersPanelProps {
  searchTerm: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

const AdminSessionsFiltersPanel: React.FC<AdminSessionsFiltersPanelProps> = ({
  searchTerm,
  statusFilter,
  startDate,
  endDate,
  onSearchTermChange,
  onStatusFilterChange,
  onStartDateChange,
  onEndDateChange,
}) => (
  <FilterContainer variants={itemVariants}>
    <SearchInputWrapper>
      <Search size={20} />
      <SearchInputField
        placeholder="Search client, trainer, status..."
        value={searchTerm}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearchTermChange(event.target.value)}
      />
    </SearchInputWrapper>

    <DateFilterRow>
      <DateInput
        type="date"
        value={startDate}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onStartDateChange(event.target.value)}
        aria-label="From date"
        title="From date"
      />
      <DateInput
        type="date"
        value={endDate}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onEndDateChange(event.target.value)}
        aria-label="To date"
        title="To date"
      />
    </DateFilterRow>

    <FilterButtonsContainer>
      {STATUS_FILTERS.map((status) => (
        <FilterButton
          key={status}
          type="button"
          $isActive={statusFilter === status}
          $buttonColor={
            status === 'completed' || status === 'confirmed'
              ? 'success'
              : status === 'scheduled' || status === 'available'
                ? 'primary'
                : status === 'cancelled'
                  ? 'error'
                  : undefined
          }
          aria-pressed={statusFilter === status}
          aria-label={`Filter sessions by ${getStatusFilterLabel(status)}`}
          onClick={() => onStatusFilterChange(status)}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </FilterButton>
      ))}
    </FilterButtonsContainer>
  </FilterContainer>
);

export default AdminSessionsFiltersPanel;
