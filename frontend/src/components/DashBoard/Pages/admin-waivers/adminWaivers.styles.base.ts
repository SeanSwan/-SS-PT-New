/**
 * ============================================================================
 * FILE: adminWaivers.styles.base.ts
 * PURPOSE: Shell / filter / pagination / state styles for the admin waiver
 *          surface. Token-first (`var(--token, #fallback)`) per CLAUDE.md r6.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Owns the non-table, non-modal, non-alert chrome of the
 * waiver manager. Split out of the former 489-line `adminWaivers.styles.ts`
 * so every style module stays under the 300-line cap (rule 4). The barrel at
 * `adminWaivers.styles.ts` re-exports everything, so consumer imports are
 * unchanged.
 *
 * TOKEN CONTRACT: every colour resolves through a Crystalline Swan token with
 * the previous literal as the fallback — the surface follows the active theme
 * when tokens are injected (utils/theme/themeUtils.ts, styles/tokens.css) and
 * renders exactly as before when they are not.
 */

import styled from 'styled-components';

export const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 16px 12px;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

export const Title = styled.h1`
  color: var(--accent-primary, #60C0F0);
  font-size: 1.5rem;
  margin: 0;
`;

export const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

export const FilterSelect = styled.select`
  padding: 10px 14px;
  min-height: var(--min-touch-target, 44px);
  border-radius: 8px;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);
  background: color-mix(in srgb, var(--obsidian-black, #000000) 30%, transparent);
  color: var(--text-primary, #ffffff);
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  option {
    background: var(--bg-elevated, #1a1a2e);
    color: var(--text-primary, #ffffff);
  }
`;

export const SearchInput = styled.input`
  padding: 10px 14px;
  min-height: var(--min-touch-target, 44px);
  border-radius: 8px;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);
  background: color-mix(in srgb, var(--obsidian-black, #000000) 30%, transparent);
  color: var(--text-primary, #ffffff);
  font-size: 0.875rem;
  width: 200px;

  &::placeholder {
    color: var(--text-placeholder, rgba(255, 255, 255, 0.4));
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    width: 100%;
    flex: 1 1 auto;
  }
`;

export const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
`;

export const PageButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  min-height: var(--min-touch-target, 44px);
  min-width: var(--min-touch-target, 44px);
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3)')};
  background: ${({ $active }) => ($active
    ? 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.15)'
    : 'transparent')};
  color: ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-secondary, rgba(255, 255, 255, 0.6))')};
  cursor: pointer;
  font-size: 0.85rem;

  &:hover:not(:disabled) {
    background: rgba(var(--wing-purple-rgb, 139, 92, 246), 0.15);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 0.9rem;
`;

/**
 * ErrorState — replaces the "No waiver records found." lie when the list
 * request itself failed. The WaiverSummaryWidget explicitly warns admins not
 * to assume an empty list means zero waivers; this is the manager honouring
 * that warning instead of contradicting it.
 */
export const ErrorState = styled.div`
  text-align: center;
  padding: 40px 24px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--danger, #ff6b6b) 35%, transparent);
  background: color-mix(in srgb, var(--danger, #ff6b6b) 8%, transparent);
  color: var(--text-primary, rgba(255, 255, 255, 0.9));
  font-size: 0.9rem;
  line-height: 1.6;
`;

export const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.9rem;
`;

// ─── Operational Upgrade Styles ─────────────────────────────

export const QuickFilters = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

export const QuickFilterChip = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  min-height: 36px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.35)')};
  background: ${({ $active }) => ($active
    ? 'rgba(var(--ice-wing-rgb, 96, 192, 240), 0.15)'
    : 'transparent')};
  color: ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-secondary, rgba(255, 255, 255, 0.7))')};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: all var(--duration-fast, 0.15s) ease;
  white-space: nowrap;

  &:hover {
    background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.1);
    border-color: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.5);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  /* Chips are the primary filter control on phones — full touch target. */
  @media (max-width: 768px) {
    min-height: var(--min-touch-target, 44px);
    padding: 10px 18px;
  }
`;

export const StatsRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

export const StatItem = styled.span<{ $urgent?: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  padding: 2px 10px;
  border-radius: 10px;
  background: ${({ $urgent }) => ($urgent
    ? 'color-mix(in srgb, var(--warning, #ffc107) 15%, transparent)'
    : 'rgba(var(--ice-wing-rgb, 96, 192, 240), 0.1)')};
  color: ${({ $urgent }) => ($urgent
    ? 'var(--warning, #ffc107)'
    : 'var(--accent-primary, rgba(96, 192, 240, 0.9))')};
  border: 1px solid ${({ $urgent }) => ($urgent
    ? 'color-mix(in srgb, var(--warning, #ffc107) 30%, transparent)'
    : 'rgba(var(--ice-wing-rgb, 96, 192, 240), 0.2)')};
  white-space: nowrap;
`;

export const RefreshBtn = styled.button`
  padding: 0;
  width: var(--min-touch-target, 44px);
  height: var(--min-touch-target, 44px);
  min-width: var(--min-touch-target, 44px);
  min-height: var(--min-touch-target, 44px);
  border-radius: 8px;
  border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);
  background: transparent;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-fast, 0.15s) ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.1);
    border-color: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.4);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
