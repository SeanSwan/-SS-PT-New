/**
 * DayView schedule grid styles.
 *
 * Extracted from the mounted day view so rendering logic stays focused and
 * all visible schedule colors route through Crystalline Swan dashboard tokens.
 */
import styled, { css } from 'styled-components';

export const DAY_VIEW_THEME = {
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, rgba(224, 236, 244, 0.78))',
  textDisabled: 'var(--text-disabled, rgba(224, 236, 244, 0.34))',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  admin: 'var(--warning, #F59E0B)',
  surface: 'var(--bg-elevated, #141419)',
  timeCellBackground: 'var(--schedule-time-bg, rgba(0, 32, 96, 0.40))',
  borderSoft: 'var(--border-soft, rgba(96, 192, 240, 0.18))',
  borderMedium: 'var(--border-medium, rgba(96, 192, 240, 0.28))',
  pastBorder: 'var(--border-muted, rgba(224, 236, 244, 0.10))',
  pastBackground: 'var(--schedule-past-slot-bg, rgba(224, 236, 244, 0.03))',
  adminBackground: 'var(--schedule-admin-slot-bg, rgba(245, 158, 11, 0.10))',
  openBackground: 'var(--schedule-open-slot-bg, rgba(139, 92, 246, 0.07))',
  scheduledBorder: 'var(--schedule-session-border, rgba(16, 185, 129, 0.72))',
  scheduledBackground: 'var(--schedule-session-bg, rgba(16, 185, 129, 0.14))',
  scheduledOverlayStart: 'var(--schedule-session-overlay-start, rgba(16, 185, 129, 0.20))',
  scheduledOverlayEnd: 'var(--schedule-session-overlay-end, rgba(16, 185, 129, 0.10))',
  accentGlow: 'var(--shadow-glow-primary, 0 0 18px rgba(96, 192, 240, 0.26))',
  scrollbar: 'var(--scrollbar-thumb, rgba(96, 192, 240, 0.18))',
  scrollbarHover: 'var(--scrollbar-thumb-hover, rgba(96, 192, 240, 0.34))',
} as const;

export const DayViewWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding-bottom: 0.75rem;
  }

  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${DAY_VIEW_THEME.scrollbar};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${DAY_VIEW_THEME.scrollbarHover};
  }
`;

export const DayViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: max-content;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.4rem;
  }
`;

const scheduleGridColumns = css`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;

  @media (max-width: 1024px) {
    grid-template-columns: 70px repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 60px repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.4rem;
    min-width: max-content;
  }

  @media (max-width: 480px) {
    grid-template-columns: 50px repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.35rem;
  }
`;

export const HeaderRow = styled.div`
  ${scheduleGridColumns}
`;

export const TimeHeader = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${DAY_VIEW_THEME.textSecondary};
  padding: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 0.375rem;
  }

  @media (max-width: 480px) {
    font-size: 0.65rem;
    padding: 0.25rem;
    letter-spacing: 0.08em;
  }
`;

export const TrainerHeader = styled.div`
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: ${DAY_VIEW_THEME.surface};
  border: 1px solid ${DAY_VIEW_THEME.borderMedium};
  color: ${DAY_VIEW_THEME.textPrimary};
  font-weight: 600;
  text-align: center;

  @media (max-width: 768px) {
    padding: 0.5rem;
    font-size: 0.85rem;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 6px;
  }
`;

export const HourRow = styled.div`
  ${scheduleGridColumns}
  align-items: stretch;
`;

export const TimeCell = styled.div`
  padding: 0.75rem 0.5rem;
  font-size: 0.85rem;
  color: ${DAY_VIEW_THEME.textSecondary};
  text-align: center;
  background: ${DAY_VIEW_THEME.timeCellBackground};
  border-radius: 10px;
  border: 1px solid ${DAY_VIEW_THEME.borderSoft};

  @media (max-width: 768px) {
    padding: 0.5rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    padding: 0.375rem 0.25rem;
    font-size: 0.7rem;
    border-radius: 6px;
  }
`;

const slotBorder = ({ $isPast, $isScheduled, $isAdminAccessible }: SlotCellProps) => {
  if ($isScheduled) return DAY_VIEW_THEME.scheduledBorder;
  if ($isAdminAccessible) return DAY_VIEW_THEME.admin;
  if ($isPast) return DAY_VIEW_THEME.pastBorder;
  return DAY_VIEW_THEME.accent;
};

const slotBackground = ({ $hasSession, $isPast, $isScheduled, $isAdminAccessible }: SlotCellProps) => {
  if ($isScheduled) return DAY_VIEW_THEME.scheduledBackground;
  if ($hasSession) return 'transparent';
  if ($isAdminAccessible) return DAY_VIEW_THEME.adminBackground;
  if ($isPast) return DAY_VIEW_THEME.pastBackground;
  return DAY_VIEW_THEME.openBackground;
};

interface SlotCellProps {
  $hasSession?: boolean;
  $isPast?: boolean;
  $isScheduled?: boolean;
  $isAdminAccessible?: boolean;
}

export const SlotCell = styled.div<SlotCellProps>`
  position: relative;
  min-height: 80px;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px dashed ${slotBorder};
  background: ${slotBackground};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: ${({ $hasSession, $isPast, $isAdminAccessible }) => (
    $hasSession || ($isPast && !$isAdminAccessible) ? 'default' : 'pointer'
  )};
  transition: all 150ms ease-out;
  opacity: ${({ $isPast, $isAdminAccessible }) => (
    $isPast && !$isAdminAccessible ? 0.6 : ($isPast ? 0.8 : 1)
  )};
  pointer-events: ${({ $isPast, $hasSession, $isAdminAccessible }) => (
    ($isPast && !$isAdminAccessible) && !$hasSession ? 'none' : 'auto'
  )};

  ${({ $hasSession, $isScheduled }) =>
    $hasSession &&
    css`
      border-style: solid;
      border-color: ${$isScheduled ? DAY_VIEW_THEME.scheduledBorder : DAY_VIEW_THEME.borderSoft};
    `}

  &:hover {
    ${({ $isPast, $hasSession }) =>
      !$isPast &&
      !$hasSession &&
      css`
        border-color: ${DAY_VIEW_THEME.accent};
        box-shadow: ${DAY_VIEW_THEME.accentGlow};
      `}
  }

  &:active {
    transform: scale(0.99);
  }

  @media (max-width: 768px) {
    min-height: 70px;
    padding: 0.4rem;
    border-radius: 10px;
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    padding: 0.3rem;
    border-radius: 8px;
    gap: 0.3rem;
  }
`;

export const ScheduledOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    ${DAY_VIEW_THEME.scheduledOverlayStart} 0%,
    ${DAY_VIEW_THEME.scheduledOverlayEnd} 100%
  );
  pointer-events: none;
  border-radius: 10px;
  z-index: 1;
`;

export const AvailableSlot = styled.div<{ $isPast?: boolean; $isAdminPast?: boolean }>`
  border-radius: 10px;
  border: 1px dashed ${({ $isPast, $isAdminPast }) => {
    if ($isAdminPast) return DAY_VIEW_THEME.admin;
    if ($isPast) return DAY_VIEW_THEME.pastBorder;
    return DAY_VIEW_THEME.accent;
  }};
  padding: 0.5rem;
  text-align: center;
  color: ${({ $isPast, $isAdminPast }) => {
    if ($isAdminPast) return DAY_VIEW_THEME.admin;
    if ($isPast) return DAY_VIEW_THEME.textDisabled;
    return DAY_VIEW_THEME.accent;
  }};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;
