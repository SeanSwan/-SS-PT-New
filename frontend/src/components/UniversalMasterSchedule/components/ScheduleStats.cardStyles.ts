import styled, { css } from 'styled-components';
import { PrimaryHeading } from '../ui';
import { SCHEDULE_STAT_COLORS } from './ScheduleStats.logic';

export const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.base} 86%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 15%, transparent);
  border-radius: 12px;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    margin: 0.75rem 1.5rem;
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    margin: 0.5rem 1rem;
    padding: 1rem;
    border-radius: 10px;
    backdrop-filter: none;
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.base} 92%, transparent);
  }

  @media (max-width: 480px) {
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
  }

  @media (max-width: 430px) {
    margin: 0.25rem;
    padding: 0.5rem;
    border-radius: 6px;
  }

  @media (max-width: 375px) {
    margin: 0;
    padding: 0.5rem 0.375rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  @media (max-width: 320px) {
    margin: 0;
    padding: 0.375rem 0.25rem;
    border-radius: 0;
    border: none;
  }

  @media (min-width: 2560px) {
    margin: 1.25rem 2.5rem;
    padding: 2rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    margin: 1.5rem 3rem;
    padding: 2.5rem;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

export const ScheduleOverviewHeading = styled(PrimaryHeading)`
  font-size: 1.5rem;
  margin-bottom: 0;
  color: ${SCHEDULE_STAT_COLORS.text};
`;

export const DateWindow = styled.span`
  font-size: 0.8rem;
  color: ${SCHEDULE_STAT_COLORS.primary};
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 10%, transparent);
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 20%, transparent);
  white-space: nowrap;
`;

export const CreditWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.warning} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.warning} 35%, transparent);
  color: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.warning} 34%, ${SCHEDULE_STAT_COLORS.text} 66%);

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    gap: 0.5rem;
    font-size: 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;

export const Tooltip = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.base} 97%, transparent);
  color: ${SCHEDULE_STAT_COLORS.text};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
  z-index: 10;
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 25%, transparent);

  @media (max-width: 768px) {
    display: none;
  }
`;

export const CardLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${SCHEDULE_STAT_COLORS.textSoft};
  margin-top: 0.25rem;
`;

export const CardSubtitle = styled.div`
  font-size: 0.7rem;
  color: ${SCHEDULE_STAT_COLORS.textFaint};
  margin-top: 2px;
`;

export const InteractiveStatCard = styled.button<{ $active: boolean; $accentColor: string }>`
  position: relative;
  text-align: center;
  padding: 1.5rem 1rem;
  min-height: 44px;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.elevated} 80%, transparent);
  border: 2px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 24%, transparent);
  border-radius: 12px;
  overflow: visible;
  cursor: pointer;
  transition: all 200ms ease;
  color: inherit;
  font-family: inherit;
  outline: none;

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
    line-height: 1;
  }

  &:hover {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.elevated} 95%, transparent);
    border-color: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 40%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px color-mix(in srgb, ${SCHEDULE_STAT_COLORS.base} 30%, transparent);
  }

  &:hover .tooltip {
    opacity: 1;
  }

  &:focus-visible {
    border-color: ${SCHEDULE_STAT_COLORS.secondary};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${SCHEDULE_STAT_COLORS.secondary} 30%, transparent);
  }

  &:active {
    transform: translateY(0);
  }

  ${({ $active, $accentColor }) =>
    $active &&
    css`
      border-color: ${$accentColor};
      background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.elevated} 95%, transparent);
      box-shadow:
        0 0 20px color-mix(in srgb, ${$accentColor} 40%, transparent),
        0 0 40px color-mix(in srgb, ${$accentColor} 15%, transparent);
      transform: scale(1.03);

      &:hover {
        transform: scale(1.03) translateY(-1px);
      }
    `}

  @media (max-width: 768px) {
    padding: 1.25rem 0.75rem;

    .stat-value {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 1rem 0.625rem;

    .stat-value {
      font-size: 1.5rem;
    }
  }

  @media (min-width: 2560px) {
    padding: 2rem;

    .stat-value {
      font-size: 2.5rem;
    }
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;

    .stat-value {
      font-size: 3rem;
    }
  }
`;

export const NotesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

export const StaleNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.78rem;
  color: ${SCHEDULE_STAT_COLORS.warning};
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.warning} 8%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.warning} 15%, transparent);
  border-radius: 6px;
`;

export const OtherStatusNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.78rem;
  color: ${SCHEDULE_STAT_COLORS.textFaint};
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 6%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 10%, transparent);
  border-radius: 6px;
`;
