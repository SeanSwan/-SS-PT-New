/**
 * Search, tier, status, and create controls for achievements.
 */
import React from 'react';
import { Plus, Search } from 'lucide-react';
import { achievementTiers } from './AchievementManager.data';
import {
  ControlsRow,
  HiddenCheckbox,
  PrimaryButton,
  SearchIconBox,
  SearchInputWrapper,
  StyledInput,
  StyledSelect,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack,
} from './AchievementManagerControls.styles';
import type { AchievementTier } from './AchievementManager.types';

interface AchievementManagerFiltersProps {
  searchQuery: string;
  filterTier: AchievementTier | 'all';
  showInactiveOnly: boolean;
  onSearchChange: (value: string) => void;
  onTierChange: (value: AchievementTier | 'all') => void;
  onInactiveOnlyChange: (value: boolean) => void;
  onCreateAchievement: () => void;
}

export const AchievementManagerFilters: React.FC<AchievementManagerFiltersProps> = ({
  searchQuery,
  filterTier,
  showInactiveOnly,
  onSearchChange,
  onTierChange,
  onInactiveOnlyChange,
  onCreateAchievement,
}) => (
  <ControlsRow>
    <SearchInputWrapper>
      <SearchIconBox>
        <Search size={18} />
      </SearchIconBox>
      <StyledInput
        aria-label="Search achievements"
        placeholder="Search achievements..."
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
      />
    </SearchInputWrapper>

    <StyledSelect
      aria-label="Filter achievements by tier"
      value={filterTier}
      onChange={event => onTierChange(event.target.value as AchievementTier | 'all')}
    >
      <option value="all">All Tiers</option>
      {achievementTiers.map(tier => (
        <option key={tier.value} value={tier.value}>
          {tier.label}
        </option>
      ))}
    </StyledSelect>

    <SwitchLabel>
      <HiddenCheckbox
        checked={showInactiveOnly}
        onChange={event => onInactiveOnlyChange(event.target.checked)}
      />
      <SwitchTrack $checked={showInactiveOnly}>
        <SwitchThumb $checked={showInactiveOnly} />
      </SwitchTrack>
      Inactive Only
    </SwitchLabel>

    <PrimaryButton onClick={onCreateAchievement} data-testid="create-achievement-button">
      <Plus size={18} />
      New Achievement
    </PrimaryButton>
  </ControlsRow>
);
