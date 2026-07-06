/**
 * SwanExercisePicker — styled surfaces (Phase 2.3a)
 * =================================================
 * Crystalline Swan tokens with fallbacks (Rule 6), 44px touch minimums
 * (Rule 2), dark-first (Rule 3). Row cards follow the client/data-card
 * discipline: chrome edge on a dark sapphire surface, low motion, no
 * hover-only actions — the Add button is always visible.
 */
import styled from 'styled-components';

export const PickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  padding: 1rem;
`;

export const PickerHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #e0ecf4);
  }
`;

export const ResultCount = styled.span`
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
`;

export const SearchRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const SearchInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 0 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  background: var(--bg-base, #0a0a0f);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.9rem;

  &::placeholder { color: var(--text-secondary, rgba(224, 236, 244, 0.45)); }
  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 1px;
  }
`;

export const FilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const FilterSelect = styled.select`
  min-height: 44px;
  flex: 1 1 140px;
  padding: 0 0.65rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  background: var(--bg-base, #0a0a0f);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.85rem;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 1px;
  }
`;

export const ListViewport = styled.div`
  border-radius: 10px;
  overflow: hidden;
`;

export const RowCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
  background: var(--card-dark, #141419);
`;

export const RowBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

export const RowName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const RowMeta = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
`;

export const MetaTag = styled.span`
  font-size: 0.68rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: var(--surface, rgba(0, 48, 128, 0.45));
  color: var(--accent-primary, #60c0f0);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  white-space: nowrap;
`;

export const AddButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--accent-glow, #8b5cf6);
  background: var(--primary, #002060);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  /* Dual-Button Glow: blue bg -> purple glow. */
  &:hover { box-shadow: 0 0 10px rgba(139, 92, 246, 0.45); }
  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

  @media (prefers-reduced-motion: reduce) {
    &:hover { box-shadow: none; }
  }
`;

export const StateMessage = styled.p`
  margin: 0;
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
`;
