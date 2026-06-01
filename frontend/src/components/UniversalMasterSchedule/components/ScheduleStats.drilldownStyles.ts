import styled from 'styled-components';
import { SCHEDULE_STAT_COLORS } from './ScheduleStats.logic';

export const DrillDownWrapper = styled.div<{ $open: boolean }>`
  overflow: hidden;
  max-height: ${({ $open }) => ($open ? '2000px' : '0')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: max-height 300ms ease, opacity 200ms ease;
`;

export const DrillDownPanel = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.base} 90%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 12%, transparent);
  border-radius: 10px;

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

export const DrillDownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

export const DrillDownTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const DrillDownLabel = styled.strong`
  font-size: 1rem;
  color: ${SCHEDULE_STAT_COLORS.text};
`;

export const DrillDownDefinition = styled.div`
  font-size: 0.8rem;
  color: ${SCHEDULE_STAT_COLORS.textFaint};
  margin-top: 2px;
`;

export const DrillDownActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

export const DrillDownCount = styled.span<{ $color: string }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

export const StatusDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  box-shadow: 0 0 6px ${({ $color }) => `color-mix(in srgb, ${$color} 60%, transparent)`};
`;

export const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 6px 12px;
  min-height: 44px;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.surface} 60%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 30%, transparent);
  border-radius: 6px;
  color: ${SCHEDULE_STAT_COLORS.textSoft};
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.surface} 76%, transparent);
    color: ${SCHEDULE_STAT_COLORS.text};
    border-color: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 40%, transparent);
  }

  &:focus-visible {
    outline: 2px solid ${SCHEDULE_STAT_COLORS.secondary};
    outline-offset: 2px;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  text-align: center;
`;

export const EmptyTitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${SCHEDULE_STAT_COLORS.textSoft};
  font-weight: 500;
`;

export const EmptySubtext = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${SCHEDULE_STAT_COLORS.textFaint};
`;
