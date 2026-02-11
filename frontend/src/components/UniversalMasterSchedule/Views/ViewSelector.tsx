import React from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

export type ViewType = 'month' | 'week' | 'day' | 'agenda';

export interface ViewSelectorProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const VIEW_LABELS: Array<{ value: ViewType; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' }
];

const shiftDate = (date: Date, view: ViewType, direction: 'prev' | 'next') => {
  const next = new Date(date);
  const delta = direction === 'next' ? 1 : -1;

  if (view === 'month') {
    next.setMonth(next.getMonth() + delta);
    return next;
  }

  if (view === 'day') {
    next.setDate(next.getDate() + delta);
    return next;
  }

  const step = view === 'week' ? 7 : 7;
  next.setDate(next.getDate() + step * delta);
  return next;
};

const formatHeaderDate = (date: Date, view: ViewType) => {
  if (view === 'day') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

const ViewSelector: React.FC<ViewSelectorProps> = ({
  activeView,
  onViewChange,
  currentDate,
  onDateChange
}) => {
  return (
    <SelectorContainer>
      <Tabs role="tablist" aria-label="Schedule views">
        {VIEW_LABELS.map((view) => {
          const isActive = view.value === activeView;
          return (
            <ViewTab
              key={view.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              $active={isActive}
              onClick={() => onViewChange(view.value)}
            >
              {view.label}
            </ViewTab>
          );
        })}
      </Tabs>

      <DateControls>
        <NavButton
          type="button"
          aria-label="Previous"
          title="Previous (←)"
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'prev'))}
        >
          &#x2039;
        </NavButton>

        <DateLabel>{formatHeaderDate(currentDate, activeView)}</DateLabel>

        <NavButton
          type="button"
          aria-label="Next"
          title="Next (→)"
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'next'))}
        >
          &#x203A;
        </NavButton>

        <TodayButton
          type="button"
          title="Today (T)"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </TodayButton>
      </DateControls>
    </SelectorContainer>
  );
};

export default ViewSelector;

const SelectorContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: ${galaxySwanTheme.background.surface};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  border-radius: 12px;
  /* Sticky within the scrolling ScheduleContainer — keeps view tabs visible */
  position: sticky;
  top: 0;
  z-index: 5;

  /* Tablet */
  @media (max-width: 1024px) {
    padding: 0.875rem 1.25rem;
    gap: 0.75rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    border-radius: 10px;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    padding: 1.25rem 2rem;
    gap: 1.25rem;
  }

  @media (min-width: 3840px) {
    padding: 1.5rem 2.5rem;
    gap: 1.5rem;
  }
`;

const Tabs = styled.div`
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  /* Mobile: full width tabs */
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
  }
`;

const ViewTab = styled.button<{ $active?: boolean }>`
  border: none;
  cursor: pointer;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ $active }) =>
    $active ? galaxySwanTheme.background.primary : galaxySwanTheme.text.secondary};
  background: ${({ $active }) =>
    $active ? galaxySwanTheme.gradients.primaryCosmic : galaxySwanTheme.background.surface};
  border: 1px solid
    ${({ $active }) =>
      $active ? galaxySwanTheme.primary.main : galaxySwanTheme.borders.elegant};
  box-shadow: ${({ $active }) => ($active ? galaxySwanTheme.shadows.primaryGlow : 'none')};
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px; /* Touch target - WCAG 2.5.8 */

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    color: ${galaxySwanTheme.text.primary};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Tablet */
  @media (max-width: 1024px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.7rem;
    border-radius: 8px;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    padding: 0.65rem 1.3rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 0.75rem 1.5rem;
    font-size: 1.25rem;
    min-height: 52px;
  }
`;

const DateControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;

  /* Mobile: center the controls */
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.375rem;
  }
`;

const NavButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  background: ${galaxySwanTheme.background.surface};
  color: ${galaxySwanTheme.text.primary};
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  flex-shrink: 0;

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    font-size: 1.25rem;
  }

  /* Large-screen scaling */
  @media (min-width: 3840px) {
    width: 52px;
    height: 52px;
    font-size: 1.35rem;
  }
`;

const DateLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  width: 280px;
  text-align: center;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    width: 260px;
  }

  @media (max-width: 480px) {
    font-size: 0.875rem;
    /* Flexible width instead of fixed - prevents overflow on small screens */
    width: auto;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    font-size: 1.15rem;
    width: 320px;
  }

  @media (min-width: 3840px) {
    font-size: 1.35rem;
    width: 380px;
  }
`;

const TodayButton = styled.button`
  border-radius: 999px;
  border: 1px solid ${galaxySwanTheme.primary.main};
  background: transparent;
  color: ${galaxySwanTheme.primary.main};
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 44px;
  flex-shrink: 0;

  &:hover {
    background: ${galaxySwanTheme.interactive.hover};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    min-height: 40px;
  }

  @media (max-width: 480px) {
    min-height: 44px;
    padding: 0.5rem 1rem;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    font-size: 1rem;
    padding: 0.55rem 1.1rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.15rem;
    padding: 0.65rem 1.3rem;
    min-height: 52px;
  }
`;

