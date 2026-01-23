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
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'prev'))}
        >
          &#x2039;
        </NavButton>

        <DateLabel>{formatHeaderDate(currentDate, activeView)}</DateLabel>

        <NavButton
          type="button"
          aria-label="Next"
          onClick={() => onDateChange(shiftDate(currentDate, activeView, 'next'))}
        >
          &#x203A;
        </NavButton>

        <TodayButton type="button" onClick={() => onDateChange(new Date())}>
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
  backdrop-filter: blur(12px);
`;

const Tabs = styled.div`
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    color: ${galaxySwanTheme.text.primary};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
    transform: translateY(-1px);
  }
`;

const DateControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
`;

const NavButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  background: ${galaxySwanTheme.background.surface};
  color: ${galaxySwanTheme.text.primary};
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }
`;

const DateLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  min-width: 170px;
  text-align: center;
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

  &:hover {
    background: ${galaxySwanTheme.interactive.hover};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }
`;
