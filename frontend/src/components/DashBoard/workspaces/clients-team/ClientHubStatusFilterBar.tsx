/**
 * COMPONENT: ClientHubStatusFilterBar
 * PURPOSE: Status filter chips + live counts for the Client Hub roster grid.
 * Doubles as the roster stats strip: each chip carries its real count so the
 * admin sees Active/Deactivated/Unclaimed/Invited totals at a glance.
 *
 * Chips for empty lifecycle states (deactivated/unclaimed/invited with a
 * count of 0) are hidden to keep the strip quiet; All and Active always show.
 */

import React from 'react';
import styled from 'styled-components';
import {
  CLIENT_HUB_STATUS_FILTERS,
  type ClientHubStatusCounts,
  type ClientHubStatusFilter,
} from './clientStatusFilter';

const FilterBarWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px clamp(16px, 1.4vw, 32px) 0;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, var(--bg-card, #141419))'
      : 'color-mix(in srgb, var(--bg-card, #141419) 88%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ChipCount = styled.span`
  min-width: 20px;
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`;

interface ClientHubStatusFilterBarProps {
  counts: ClientHubStatusCounts;
  value: ClientHubStatusFilter;
  onChange: (filter: ClientHubStatusFilter) => void;
}

const ALWAYS_VISIBLE: readonly ClientHubStatusFilter[] = ['all', 'active'];

const ClientHubStatusFilterBar: React.FC<ClientHubStatusFilterBarProps> = ({
  counts,
  value,
  onChange,
}) => (
  <FilterBarWrap role="group" aria-label="Filter clients by status">
    {CLIENT_HUB_STATUS_FILTERS
      .filter((filter) => ALWAYS_VISIBLE.includes(filter.id) || counts[filter.id] > 0 || value === filter.id)
      .map((filter) => (
        <FilterChip
          key={filter.id}
          type="button"
          $active={value === filter.id}
          aria-pressed={value === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
          <ChipCount aria-label={`${counts[filter.id]} ${filter.label.toLowerCase()} clients`}>
            {counts[filter.id]}
          </ChipCount>
        </FilterChip>
      ))}
  </FilterBarWrap>
);

export default ClientHubStatusFilterBar;
