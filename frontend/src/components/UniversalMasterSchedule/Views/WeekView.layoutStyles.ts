import styled from 'styled-components';
import { HOURS, PIXELS_PER_HOUR, WEEK_VIEW_THEME } from './WeekView.logic';

export const WeekViewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const MobileNavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid ${WEEK_VIEW_THEME.borderAccent};
  background: ${WEEK_VIEW_THEME.surface};
  color: ${WEEK_VIEW_THEME.text};
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover:not(:disabled) {
    border-color: ${WEEK_VIEW_THEME.borderAccentStrong};
    background: ${WEEK_VIEW_THEME.todaySurface};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${WEEK_VIEW_THEME.primary};
    outline-offset: 2px;
  }
`;

export const NavLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${WEEK_VIEW_THEME.text};
  min-width: 140px;
  text-align: center;
`;

export const GridWrapper = styled.div`
  background: ${WEEK_VIEW_THEME.surface};
  border: 1px solid ${WEEK_VIEW_THEME.borderAccent};
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 768px) {
    border-radius: 10px;
  }

  @media (max-width: 430px) {
    border-radius: 8px;
  }
`;

export const HeaderRow = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: 60px repeat(${({ $columns }) => $columns}, 1fr);
  border-bottom: 1px solid ${WEEK_VIEW_THEME.border};

  @media (min-width: 1024px) {
    grid-template-columns: 70px repeat(${({ $columns }) => $columns}, 1fr);
  }

  @media (min-width: 2560px) {
    grid-template-columns: 90px repeat(${({ $columns }) => $columns}, 1fr);
  }

  @media (min-width: 3840px) {
    grid-template-columns: 110px repeat(${({ $columns }) => $columns}, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 48px repeat(${({ $columns }) => $columns}, 1fr);
  }
`;

export const TimeHeaderCell = styled.div`
  padding: 0.5rem;
  border-right: 1px solid ${WEEK_VIEW_THEME.borderSoft};
`;

export const DayHeaderCell = styled.div<{ $isToday: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.25rem;
  min-height: 56px;
  cursor: pointer;
  transition: background 150ms ease-out;
  border-right: 1px solid ${WEEK_VIEW_THEME.borderSoft};
  background: ${({ $isToday }) => ($isToday ? WEEK_VIEW_THEME.todaySurface : 'transparent')};

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${WEEK_VIEW_THEME.surfaceFocus};
  }

  &:focus-visible {
    outline: 2px solid ${WEEK_VIEW_THEME.primary};
    outline-offset: -2px;
  }

  @media (max-width: 430px) {
    padding: 0.5rem 0.15rem;
    min-height: 48px;
  }
`;

export const DayName = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${WEEK_VIEW_THEME.textSoft};

  @media (min-width: 2560px) {
    font-size: 0.9rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.05rem;
  }

  @media (max-width: 430px) {
    font-size: 0.7rem;
  }
`;

export const DayDate = styled.span<{ $isToday: boolean }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $isToday }) => ($isToday ? WEEK_VIEW_THEME.primary : WEEK_VIEW_THEME.text)};
  margin-top: 2px;

  @media (max-width: 430px) {
    font-size: 0.8rem;
  }
`;

export const GridBody = styled.div`
  display: flex;
  overflow-y: auto;
  max-height: calc(${HOURS.length} * ${PIXELS_PER_HOUR}px + 16px);
`;

export const TimeColumn = styled.div`
  flex-shrink: 0;
  width: 60px;
  border-right: 1px solid ${WEEK_VIEW_THEME.borderSoft};

  @media (min-width: 1024px) {
    width: 70px;
  }

  @media (min-width: 2560px) {
    width: 90px;
  }

  @media (min-width: 3840px) {
    width: 110px;
  }

  @media (max-width: 430px) {
    width: 48px;
  }
`;

export const TimeLabel = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2px;
  font-size: 0.7rem;
  color: ${WEEK_VIEW_THEME.textMuted};
  border-bottom: 1px solid ${WEEK_VIEW_THEME.borderSoft};
  box-sizing: border-box;

  @media (min-width: 2560px) {
    font-size: 0.85rem;
  }

  @media (min-width: 3840px) {
    font-size: 1rem;
  }

  @media (max-width: 430px) {
    font-size: 0.6rem;
  }
`;

export const DayColumnsContainer = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  flex: 1;
  min-width: 0;
`;

export const DayColumn = styled.div<{ $isToday: boolean }>`
  position: relative;
  border-right: 1px solid ${WEEK_VIEW_THEME.borderSoft};
  background: ${({ $isToday }) => ($isToday ? WEEK_VIEW_THEME.todayColumn : 'transparent')};

  &:last-child {
    border-right: none;
  }
`;

export const HourSlot = styled.div`
  border-bottom: 1px solid ${WEEK_VIEW_THEME.borderSoft};
  box-sizing: border-box;
  cursor: pointer;
  min-height: 44px;
  transition: background 100ms ease-out;

  &:hover {
    background: ${WEEK_VIEW_THEME.surfaceSoft};
  }

  &:focus-visible {
    outline: 2px solid ${WEEK_VIEW_THEME.primary};
    outline-offset: -2px;
  }
`;
