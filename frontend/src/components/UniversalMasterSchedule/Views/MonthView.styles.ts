import styled from 'styled-components';
import { MONTH_VIEW_THEME } from './MonthView.logic';

export const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: ${MONTH_VIEW_THEME.surface};
  border: 1px solid ${MONTH_VIEW_THEME.border};
  border-radius: 16px;
  backdrop-filter: blur(10px);

  @media (max-width: 1024px) {
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 14px;
  }

  @media (max-width: 768px) {
    gap: 0.375rem;
    padding: 0.5rem;
    border-radius: 12px;
    backdrop-filter: none;
  }

  @media (max-width: 480px) {
    gap: 0.25rem;
    padding: 0.375rem;
    border-radius: 10px;
  }
`;

export const DayHeader = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${MONTH_VIEW_THEME.textSoft};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.5rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.375rem;
    letter-spacing: 0.05em;
  }

  @media (max-width: 480px) {
    font-size: 0.65rem;
    padding: 0.25rem;
    letter-spacing: 0;
  }
`;

export const DayCell = styled.button<{ $inMonth: boolean; $isToday: boolean; $isPast?: boolean }>`
  min-height: 110px;
  border-radius: 12px;
  padding: 0.65rem;
  background: ${({ $inMonth, $isPast }) => {
    if (!$inMonth) return MONTH_VIEW_THEME.surfaceDim;
    if ($isPast) return MONTH_VIEW_THEME.surfacePast;
    return MONTH_VIEW_THEME.surface;
  }};
  border: 1px solid ${({ $isToday, $isPast }) => {
    if ($isToday) return MONTH_VIEW_THEME.primary;
    if ($isPast) return MONTH_VIEW_THEME.borderSoft;
    return MONTH_VIEW_THEME.border;
  }};
  box-shadow: ${({ $isToday }) => ($isToday ? MONTH_VIEW_THEME.activeGlow : 'none')};
  color: ${({ $isPast }) => ($isPast ? MONTH_VIEW_THEME.textFaint : MONTH_VIEW_THEME.text)};
  opacity: ${({ $isPast }) => ($isPast ? 0.7 : 1)};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.4rem;
  transition: all 150ms ease-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    border-color: ${MONTH_VIEW_THEME.primary};
    box-shadow: ${MONTH_VIEW_THEME.activeGlow};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${MONTH_VIEW_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    min-height: 95px;
    padding: 0.5rem;
    border-radius: 10px;
  }

  @media (max-width: 768px) {
    min-height: 75px;
    padding: 0.375rem;
    border-radius: 8px;
    gap: 0.25rem;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    padding: 0.25rem;
    border-radius: 6px;
    gap: 0.15rem;
  }
`;

export const DayNumber = styled.div`
  font-size: 1.1rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

export const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 0.2rem;
  }
`;

export const CountBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${MONTH_VIEW_THEME.base};
  background: ${MONTH_VIEW_THEME.primary};

  @media (max-width: 768px) {
    padding: 0.1rem 0.35rem;
    font-size: 0.65rem;
  }

  @media (max-width: 480px) {
    padding: 0.1rem 0.25rem;
    font-size: 0.6rem;
  }
`;

export const BlockedBadge = styled.span`
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${MONTH_VIEW_THEME.text};
  background: ${MONTH_VIEW_THEME.blockedSurface};
  border: 1px solid ${MONTH_VIEW_THEME.blockedBorder};

  @media (max-width: 768px) {
    padding: 0.1rem 0.3rem;
    font-size: 0.6rem;
  }

  @media (max-width: 480px) {
    display: none;
  }
`;

export const OrbRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;

  @media (max-width: 768px) {
    gap: 0.2rem;
  }

  @media (max-width: 480px) {
    gap: 0.15rem;
  }
`;

export const SessionOrb = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 10px ${({ $color }) => $color};

  @media (max-width: 768px) {
    width: 6px;
    height: 6px;
    box-shadow: 0 0 6px ${({ $color }) => $color};
  }

  @media (max-width: 480px) {
    width: 5px;
    height: 5px;
    box-shadow: 0 0 4px ${({ $color }) => $color};
  }
`;

export const OverflowText = styled.span`
  font-size: 0.7rem;
  color: ${MONTH_VIEW_THEME.textSoft};
`;
