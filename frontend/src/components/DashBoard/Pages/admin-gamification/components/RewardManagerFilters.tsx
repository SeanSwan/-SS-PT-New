/**
 * Search, tier, status, and create controls for rewards.
 */
import React from 'react';
import { Plus, Search } from 'lucide-react';
import { rewardTiers } from './RewardManager.data';
import {
  ControlsBar,
  HiddenCheckbox,
  PrimaryButton,
  SearchIcon,
  SearchWrapper,
  SelectLabel,
  SelectWrapper,
  StyledInput,
  StyledSelect,
  SwitchContainer,
  SwitchThumb,
  SwitchTrack,
} from './RewardManagerControls.styles';
import type { RewardTier } from './RewardManager.types';

interface RewardManagerFiltersProps {
  searchQuery: string;
  filterTier: RewardTier | 'all';
  showInactiveOnly: boolean;
  onSearchChange: (value: string) => void;
  onTierChange: (value: RewardTier | 'all') => void;
  onInactiveOnlyChange: (value: boolean) => void;
  onCreateReward: () => void;
}

export const RewardManagerFilters: React.FC<RewardManagerFiltersProps> = ({
  searchQuery,
  filterTier,
  showInactiveOnly,
  onSearchChange,
  onTierChange,
  onInactiveOnlyChange,
  onCreateReward,
}) => (
  <ControlsBar>
    <SearchWrapper>
      <SearchIcon>
        <Search size={18} />
      </SearchIcon>
      <StyledInput
        aria-label="Search rewards"
        placeholder="Search rewards..."
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
      />
    </SearchWrapper>

    <SelectWrapper>
      <SelectLabel htmlFor="reward-tier-filter">Tier</SelectLabel>
      <StyledSelect
        id="reward-tier-filter"
        value={filterTier}
        onChange={event => onTierChange(event.target.value as RewardTier | 'all')}
      >
        <option value="all">All Tiers</option>
        {rewardTiers.map(tier => (
          <option key={tier.value} value={tier.value}>
            {tier.label}
          </option>
        ))}
      </StyledSelect>
    </SelectWrapper>

    <SwitchContainer>
      <HiddenCheckbox
        checked={showInactiveOnly}
        onChange={event => onInactiveOnlyChange(event.target.checked)}
      />
      <SwitchTrack $checked={showInactiveOnly}>
        <SwitchThumb $checked={showInactiveOnly} />
      </SwitchTrack>
      Inactive Only
    </SwitchContainer>

    <PrimaryButton onClick={onCreateReward} data-testid="create-reward-button">
      <Plus size={18} />
      New Reward
    </PrimaryButton>
  </ControlsBar>
);
