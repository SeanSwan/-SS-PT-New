/**
 * Filter controls for the active UserDashboard V3 activity section.
 */

import React from 'react';
import { ACTIVITY_FILTERS } from './ActivitySection.data';
import { FilterButton, FilterContainer } from './ActivitySection.styles';
import type { ActivityFilterId } from './ActivitySection.types';

interface ActivitySectionFiltersProps {
  activeFilter: ActivityFilterId;
  onFilterChange: (filter: ActivityFilterId) => void;
}

const ActivitySectionFilters: React.FC<ActivitySectionFiltersProps> = ({ activeFilter, onFilterChange }) => (
  <FilterContainer>
    {ACTIVITY_FILTERS.map(({ id, label, Icon }) => (
      <FilterButton
        key={id}
        type="button"
        $active={activeFilter === id}
        aria-pressed={activeFilter === id}
        onClick={() => onFilterChange(id)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Icon size={16} />
        {label}
      </FilterButton>
    ))}
  </FilterContainer>
);

export default ActivitySectionFilters;
