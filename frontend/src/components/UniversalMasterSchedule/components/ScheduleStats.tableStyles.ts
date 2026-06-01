import styled from 'styled-components';
import { SCHEDULE_STAT_COLORS } from './ScheduleStats.logic';

export const TableScrollArea = styled.div`
  position: relative;
  max-height: 420px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 18%, transparent);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.elevated} 50%, transparent);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 40%, transparent);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 50%, transparent);
  }

  @media (max-width: 768px) {
    max-height: 50vh;
  }
`;

export const SessionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  thead {
    position: sticky;
    top: 0;
    z-index: 2;
    background: ${SCHEDULE_STAT_COLORS.elevated};
  }

  thead th {
    text-align: left;
    padding: 0.625rem 0.75rem;
    color: ${SCHEDULE_STAT_COLORS.textFaint};
    font-weight: 600;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 24%, transparent);
  }

  .hide-mobile {
    @media (max-width: 768px) {
      display: none;
    }
  }
`;

export const SessionRow = styled.tr`
  td {
    padding: 0.625rem 0.75rem;
    color: ${SCHEDULE_STAT_COLORS.textSoft};
    border-bottom: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.surface} 60%, transparent);
  }

  &:last-child td {
    border-bottom: none;
  }

  &:hover td {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.surface} 50%, transparent);
  }
`;

export const SessionCellFlex = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

export const CellIcon = styled.span`
  display: inline-flex;
  color: ${SCHEDULE_STAT_COLORS.muted};
  flex-shrink: 0;
`;

export const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 25%, transparent)`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 50%, transparent)`};
`;

export const TableFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.textFaint} 18%, transparent);
`;

export const RowCount = styled.span`
  font-size: 0.8rem;
  color: ${SCHEDULE_STAT_COLORS.textFaint};
`;

export const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 6px 14px;
  min-height: 44px;
  background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 8%, transparent);
  border: 1px solid color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 20%, transparent);
  border-radius: 6px;
  color: ${SCHEDULE_STAT_COLORS.primary};
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 15%, transparent);
    border-color: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 35%, transparent);
    color: color-mix(in srgb, ${SCHEDULE_STAT_COLORS.primary} 86%, ${SCHEDULE_STAT_COLORS.text} 14%);
  }

  &:focus-visible {
    outline: 2px solid ${SCHEDULE_STAT_COLORS.secondary};
    outline-offset: 2px;
  }
`;
