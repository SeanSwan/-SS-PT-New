/**
 * TimeRangeFilter Component
 * ========================
 * Accessible filter control for selecting the time range for progress data
 */

import React, { memo } from 'react';
import { 
  HeaderSection, 
  Title, 
  FilterContainer, 
  FilterSelect 
} from '../../styles/ClientProgress.styles';

interface TimeRangeFilterProps {
  timeRange: string;
  onTimeRangeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * TimeRangeFilter Component - Allows users to filter workout data by time period
 * Enhanced with accessibility features
 */
export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = memo(({
  timeRange,
  onTimeRangeChange
}) => {
  // Unique ID for accessibility
  const selectId = "time-range-filter";
  
  // Time range options
  const timeRangeOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];
  
  return (
    <HeaderSection>
      <Title>Workout Progress</Title>
      
      <FilterContainer>
        <label 
          htmlFor={selectId} 
          className="sr-only" /* Screen reader only */
        >
          Filter by time range
        </label>
        <FilterSelect 
          id={selectId}
          value={timeRange}
          onChange={onTimeRangeChange}
          aria-label="Filter time range"
          data-testid="time-range-filter"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
      </FilterContainer>
    </HeaderSection>
  );
});

// Set display name for debugging
TimeRangeFilter.displayName = 'TimeRangeFilter';

export default TimeRangeFilter;
