import React from 'react';
import {
  Filter,
  Users,
  X
} from 'lucide-react';
import { Button } from './TrainerPermissionsManager.styles';
import {
  SearchActions,
  SearchBarWrap,
  SearchInput
} from './TrainerPermissionsManager.searchStyles';

interface TrainerPermissionsSearchBarProps {
  clearAllSelection: () => void;
  filteredTrainerCount: number;
  handleFilterButton: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchQuery: string;
  selectedTrainers: Set<number>;
  selectAllTrainers: () => void;
  setSearchQuery: (query: string) => void;
}

export const TrainerPermissionsSearchBar: React.FC<TrainerPermissionsSearchBarProps> = ({
  clearAllSelection,
  filteredTrainerCount,
  handleFilterButton,
  searchInputRef,
  searchQuery,
  selectedTrainers,
  selectAllTrainers,
  setSearchQuery
}) => (
  <SearchBarWrap>
    <SearchInput
      ref={searchInputRef}
      type="text"
      placeholder="Search trainers by name or email..."
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
    />

    <SearchActions>
      {selectedTrainers.size > 0 && (
        <>
          <Button
            variant="secondary"
            onClick={selectAllTrainers}
            disabled={selectedTrainers.size === filteredTrainerCount}
          >
            <Users size={16} />
            Select All ({filteredTrainerCount})
          </Button>

          <Button
            variant="secondary"
            onClick={clearAllSelection}
          >
            <X size={16} />
            Clear ({selectedTrainers.size})
          </Button>
        </>
      )}

      {selectedTrainers.size === 0 && (
        <Button
          variant="secondary"
          onClick={selectAllTrainers}
        >
          <Users size={16} />
          Select All
        </Button>
      )}

      <Button
        variant="secondary"
        onClick={handleFilterButton}
        aria-label={searchQuery ? 'Clear trainer permission filter' : 'Focus trainer permission filter'}
      >
        <Filter size={16} />
        {searchQuery ? 'Clear' : 'Filter'}
      </Button>
    </SearchActions>
  </SearchBarWrap>
);
