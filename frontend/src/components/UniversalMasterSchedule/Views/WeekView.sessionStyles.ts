import styled, { keyframes } from 'styled-components';
import { WEEK_VIEW_THEME } from './WeekView.logic';

export const WeekSessionCard = styled.div<{
  $status: string;
  $top: number;
  $height: number;
}>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => Math.max($height, 24)}px;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  z-index: 1;
  min-height: 24px;
  transition: transform 0.15s, box-shadow 0.15s;
  background: ${({ $status }) => {
    switch ($status) {
      case 'available':
        return WEEK_VIEW_THEME.todaySurface;
      case 'scheduled':
        return 'color-mix(in srgb, var(--chart-line, #50A0F0) 24%, transparent)';
      case 'confirmed':
        return 'color-mix(in srgb, var(--success, #10b981) 24%, transparent)';
      case 'completed':
        return 'color-mix(in srgb, var(--text-muted, #94A3B8) 20%, transparent)';
      case 'cancelled':
        return 'color-mix(in srgb, var(--danger, #ef4444) 16%, transparent)';
      case 'blocked':
        return 'color-mix(in srgb, var(--warning, #f59e0b) 20%, transparent)';
      default:
        return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
    }
  }};
  border-left: 3px solid
    ${({ $status }) => {
      switch ($status) {
        case 'available':
          return WEEK_VIEW_THEME.primary;
        case 'scheduled':
          return WEEK_VIEW_THEME.primaryData;
        case 'confirmed':
          return WEEK_VIEW_THEME.success;
        case 'completed':
          return 'var(--text-disabled, color-mix(in srgb, var(--text-muted, #94A3B8) 72%, transparent))';
        case 'cancelled':
          return WEEK_VIEW_THEME.danger;
        case 'blocked':
          return WEEK_VIEW_THEME.warning;
        default:
          return WEEK_VIEW_THEME.primary;
      }
    }};
  color: ${WEEK_VIEW_THEME.text};

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px ${WEEK_VIEW_THEME.shadow};
    z-index: 2;
  }

  &:focus-visible {
    outline: 2px solid ${WEEK_VIEW_THEME.primary};
    outline-offset: 1px;
    z-index: 3;
  }

  &:active {
    transform: scale(0.99);
  }
`;

/**
 * Ghost card — a recent booking (up to a month back) echoed into this week's
 * empty slot. Deliberately quiet: dashed edge, no motion. Older ghosts fade so
 * last week reads louder than three weeks ago. Clickable to rebook the same
 * slot, keyboard-operable, never obscures real sessions.
 *
 * The fade floor (0.72) is a WCAG constraint, not a taste call: ghost text is
 * textSoft (#CBD5E1), which holds ~7:1 against the dark surface at 0.72 but
 * drops under 4.5:1 if faded much further. Do not lower it.
 */
export const GHOST_FADE_FLOOR = 0.72;

export const ghostFade = (weeksAgo: number) =>
  Math.max(1 - (weeksAgo - 1) * 0.09, GHOST_FADE_FLOOR);

export const GhostSessionCard = styled.div<{
  $top: number;
  $height: number;
  $weeksAgo: number;
}>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => Math.max($height, 24)}px;
  left: 2px;
  right: 2px;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  z-index: 0;
  min-height: 24px;
  opacity: ${({ $weeksAgo }) => ghostFade($weeksAgo)};
  background: color-mix(in srgb, var(--text-muted, #94A3B8) 7%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  border-left: 3px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  color: ${WEEK_VIEW_THEME.textSoft};

  &:hover,
  &:focus-visible {
    opacity: 1;
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    color: ${WEEK_VIEW_THEME.textSoft};
  }

  &:focus-visible {
    outline: 2px solid ${WEEK_VIEW_THEME.primary};
    outline-offset: 1px;
    z-index: 3;
  }
`;

export const GhostTag = styled.span`
  display: block;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--accent-primary, #60C0F0) 70%, transparent);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SessionTime = styled.span`
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
`;

export const SessionClient = styled.span`
  display: block;
  font-size: 0.65rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
  line-height: 1.2;
`;

export const SessionTrainer = styled.span`
  display: block;
  font-size: 0.6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.65;
  line-height: 1.2;
`;

export const WeekSessionsBadge = styled.span<{ $low: boolean }>`
  position: absolute;
  top: 2px;
  right: 4px;
  background: ${({ $low }) =>
    $low ? 'color-mix(in srgb, var(--danger, #ef4444) 86%, var(--bg-base, #0A0A0F) 14%)' : WEEK_VIEW_THEME.purpleSoft};
  color: ${({ $low }) => ($low ? 'var(--text-on-danger, #FFFFFF)' : WEEK_VIEW_THEME.purple)};
  border-radius: 6px;
  padding: 0 4px;
  font-size: 0.55rem;
  font-weight: 700;
  line-height: 1.4;
  z-index: 1;
`;

export const CurrentTimeIndicator = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const CurrentTimeDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${WEEK_VIEW_THEME.danger};
  flex-shrink: 0;
  margin-left: -5px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

export const CurrentTimeLine = styled.div`
  flex: 1;
  height: 2px;
  background: ${WEEK_VIEW_THEME.danger};
`;
