/**
 * DayViewStacked schedule styles.
 *
 * Bridges the mobile stacked schedule surface to Crystalline Swan theme tokens
 * without changing the underlying trainer/session rendering behavior.
 */
import styled, { css } from 'styled-components';
import { DENSITY_SPECS } from '../types';
import type { DensityMode } from '../types';

export const STACKED_DAY_VIEW_THEME = {
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, rgba(224, 236, 244, 0.78))',
  textFaint: 'var(--text-faint, rgba(224, 236, 244, 0.24))',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  admin: 'var(--warning, #F59E0B)',
  surface: 'var(--bg-elevated, #141419)',
  sectionBackground: 'var(--schedule-section-bg, rgba(0, 32, 96, 0.30))',
  hoverBackground: 'var(--schedule-hover-bg, rgba(139, 92, 246, 0.07))',
  buttonBackground: 'var(--schedule-control-bg, rgba(139, 92, 246, 0.10))',
  buttonHoverBackground: 'var(--schedule-control-bg-hover, rgba(139, 92, 246, 0.16))',
  borderSoft: 'var(--border-soft, rgba(96, 192, 240, 0.18))',
  borderMedium: 'var(--border-medium, rgba(96, 192, 240, 0.28))',
  divider: 'var(--divider-subtle, rgba(224, 236, 244, 0.08))',
  scheduledBackground: 'var(--schedule-session-bg, rgba(16, 185, 129, 0.12))',
  pastBackground: 'var(--schedule-past-slot-bg, rgba(224, 236, 244, 0.03))',
} as const;

export const StackedContainer = styled.div`
  width: 100%;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const TrainerSection = styled.div<{ $density: DensityMode }>`
  border-radius: 12px;
  border: 1px solid ${STACKED_DAY_VIEW_THEME.borderMedium};
  background: ${STACKED_DAY_VIEW_THEME.sectionBackground};
  overflow: hidden;

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      border-radius: 8px;
    `}
`;

export const TrainerHeaderBar = styled.div<{ $density: DensityMode }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${STACKED_DAY_VIEW_THEME.surface};
  border-bottom: 1px solid ${STACKED_DAY_VIEW_THEME.borderSoft};
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  transition: background 150ms ease;

  &:hover {
    background: ${STACKED_DAY_VIEW_THEME.hoverBackground};
  }

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
    `}
`;

export const TrainerAvatar = styled.div<{ $density: DensityMode }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${STACKED_DAY_VIEW_THEME.accent}, ${STACKED_DAY_VIEW_THEME.accentSecondary});
  color: ${STACKED_DAY_VIEW_THEME.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      width: 28px;
      height: 28px;
      font-size: 0.65rem;
    `}
`;

export const TrainerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const TrainerName = styled.div<{ $density: DensityMode }>`
  font-weight: 600;
  color: ${STACKED_DAY_VIEW_THEME.textPrimary};
  font-size: ${({ $density }) => ($density === 'compact' ? '0.85rem' : '0.95rem')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const TrainerStats = styled.div<{ $density: DensityMode }>`
  font-size: ${({ $density }) => ($density === 'compact' ? '0.7rem' : '0.75rem')};
  color: ${STACKED_DAY_VIEW_THEME.textSecondary};
`;

export const CollapseIcon = styled.div<{ $expanded: boolean }>`
  font-size: 1rem;
  color: ${STACKED_DAY_VIEW_THEME.textSecondary};
  transition: transform 200ms ease;
  transform: rotate(${({ $expanded }) => ($expanded ? '0deg' : '-90deg')});
  flex-shrink: 0;
`;

export const TimeGrid = styled.div`
  display: flex;
  flex-direction: column;
`;

export const TimeSlotRow = styled.div<{ $density: DensityMode; $isPast?: boolean }>`
  display: grid;
  grid-template-columns: 60px 1fr;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight}px;
  border-bottom: 1px solid ${STACKED_DAY_VIEW_THEME.divider};
  opacity: ${({ $isPast }) => ($isPast ? 0.6 : 1)};

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      grid-template-columns: 48px 1fr;
    `}
`;

export const TimeLabel = styled.div<{ $density: DensityMode; $dimmed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $density }) => ($density === 'compact' ? '0.7rem' : '0.8rem')};
  color: ${({ $dimmed }) => ($dimmed ? STACKED_DAY_VIEW_THEME.textFaint : STACKED_DAY_VIEW_THEME.textSecondary)};
  border-right: 1px solid ${STACKED_DAY_VIEW_THEME.divider};
  padding: 0.25rem;
`;

export const SlotContent = styled.div<{
  $density: DensityMode;
  $isPast?: boolean;
  $hasSession?: boolean;
  $isScheduled?: boolean;
}>`
  padding: ${({ $density }) => ($density === 'compact' ? '2px 4px' : '4px 8px')};
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight}px;
  background: ${({ $isScheduled, $isPast }) =>
    $isScheduled
      ? STACKED_DAY_VIEW_THEME.scheduledBackground
      : $isPast
      ? STACKED_DAY_VIEW_THEME.pastBackground
      : 'transparent'};
`;

export const AvailableText = styled.span<{
  $isPast?: boolean;
  $isAdmin?: boolean;
  $density: DensityMode;
}>`
  font-size: ${({ $density }) => ($density === 'compact' ? '0.65rem' : '0.75rem')};
  color: ${({ $isPast, $isAdmin }) =>
    $isPast
      ? $isAdmin
        ? STACKED_DAY_VIEW_THEME.admin
        : STACKED_DAY_VIEW_THEME.textFaint
      : STACKED_DAY_VIEW_THEME.accent};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  padding: 0.25rem;
`;

export const ClickableSlot = styled.div<{ $density: DensityMode }>`
  cursor: pointer;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight - 8}px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  transition: background 150ms ease;

  &:hover {
    background: ${STACKED_DAY_VIEW_THEME.hoverBackground};
  }
`;

export const PastSlot = styled.div<{ $density: DensityMode }>`
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight - 8}px;
`;

export const ShowMoreButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: ${STACKED_DAY_VIEW_THEME.buttonBackground};
  border: 1px dashed ${STACKED_DAY_VIEW_THEME.accent};
  border-radius: 10px;
  color: ${STACKED_DAY_VIEW_THEME.accent};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  min-height: 44px;

  &:hover {
    background: ${STACKED_DAY_VIEW_THEME.buttonHoverBackground};
  }
`;

export const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

export const EmptyText = styled.p`
  color: ${STACKED_DAY_VIEW_THEME.textSecondary};
  font-size: 0.9rem;
`;
