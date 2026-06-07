/**
 * Rolodex search and filter chip styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';

// SECTION: Search Input
// ─────────────────────────────────────────────────────────────
export const SearchWrapper = styled.div`
  position: relative;
  margin-bottom: 12px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted, rgba(224, 236, 244, 0.5));
    pointer-events: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  padding: 0.6rem 1rem 0.6rem 36px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.5)); }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Chips
// ─────────────────────────────────────────────────────────────
export const RolodexStatusRail = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-elevated, #003080) 18%, transparent);

  @media (max-width: 430px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const RolodexStatusText = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  line-height: 1.4;
`;

export const ClearFiltersButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;

  @media (max-width: 430px) {
    gap: 4px;
    margin-bottom: 8px;
  }
`;

export const Chip = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent) 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) 100%)'
    : 'rgba(255, 255, 255, 0.03)'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  ${({ $active }) => $active ? 'box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);' : ''}

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    padding: 5px 10px;
    font-size: 0.65rem;
    min-height: 44px;
  }
`;

// ─────────────────────────────────────────────────────────────
