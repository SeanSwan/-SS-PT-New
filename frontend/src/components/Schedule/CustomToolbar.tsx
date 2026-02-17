/**
 * CustomToolbar.tsx
 *
 * An accessible toolbar component for the Big Calendar component
 * Provides enhanced keyboard navigation, high contrast, and screen reader support
 */

import React from 'react';
import styled from 'styled-components';
import moment from 'moment';
import { Navigate } from 'react-big-calendar';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

// Styled components for accessibility
const ToolbarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: rgba(35, 35, 70, 0.7);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: white;
  margin: 0;
`;

const NavigationContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const ViewContainer = styled.div`
  display: flex;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ButtonGroupContainer = styled.div`
  display: flex;
  background: rgba(30, 30, 60, 0.7);
  border-radius: 4px;
  overflow: hidden;
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  color: white;
  font-size: 1rem;
  padding: 0.6rem 1rem;
  min-width: 80px;
  min-height: 44px;
  border: 1px solid rgba(120, 81, 169, 0.4);
  background: ${({ $active }) => $active ? 'rgba(120, 81, 169, 0.6)' : 'transparent'};
  box-shadow: ${({ $active }) => $active ? '0 0 12px rgba(120, 81, 169, 0.4)' : 'none'};
  font-weight: ${({ $active }) => $active ? '600' : '400'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(120, 81, 169, 0.4);
  }

  &:focus-visible {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }

  /* Remove double borders between adjacent buttons */
  & + & {
    border-left: none;
  }
`;

interface CustomToolbarProps {
  date: Date;
  view: string;
  onNavigate: (action: Navigate, date?: Date) => void;
  onView: (view: string) => void;
  views: string[];
  localizer: {
    messages: any;
  };
}

// Custom accessible toolbar component
const CustomToolbar: React.FC<CustomToolbarProps> = ({
  date,
  view,
  onNavigate,
  onView,
  views,
  localizer,
}) => {
  // Format and display date range based on current view
  const getDisplayTitle = () => {
    switch (view) {
      case 'month':
        return moment(date).format('MMMM YYYY');
      case 'week':
        return `${moment(date).startOf('week').format('MMM D')} - ${moment(date).endOf('week').format('MMM D, YYYY')}`;
      case 'day':
        return moment(date).format('dddd, MMMM D, YYYY');
      case 'agenda':
        return `Agenda: ${moment(date).format('MMM D, YYYY')}`;
      default:
        return moment(date).format('MMMM YYYY');
    }
  };

  // Format navigation button labels for screen readers
  const getNavigationAriaLabel = (action: Navigate): string => {
    switch (action) {
      case Navigate.PREVIOUS:
        return `Previous ${view}`;
      case Navigate.NEXT:
        return `Next ${view}`;
      case Navigate.TODAY:
        return 'Go to today';
      default:
        return '';
    }
  };

  // Format view button labels for better accessibility
  const getViewLabel = (viewName: string): string => {
    switch (viewName) {
      case 'month':
        return 'Month View';
      case 'week':
        return 'Week View';
      case 'day':
        return 'Day View';
      case 'agenda':
        return 'List View';
      default:
        return viewName;
    }
  };

  return (
    <ToolbarContainer role="toolbar" aria-label="Calendar navigation">
      <Title id="calendar-current-view">{getDisplayTitle()}</Title>

      <NavigationContainer>
        <ButtonGroupContainer role="group" aria-label="Calendar date navigation">
          <ToolbarButton
            onClick={() => onNavigate(Navigate.PREVIOUS)}
            aria-label={getNavigationAriaLabel(Navigate.PREVIOUS)}
            title={getNavigationAriaLabel(Navigate.PREVIOUS)}
          >
            <ArrowLeft size={18} />
            <span className="visible-sr-only">Previous</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => onNavigate(Navigate.TODAY)}
            aria-label={getNavigationAriaLabel(Navigate.TODAY)}
            title={getNavigationAriaLabel(Navigate.TODAY)}
          >
            <Calendar size={18} />
            Today
          </ToolbarButton>

          <ToolbarButton
            onClick={() => onNavigate(Navigate.NEXT)}
            aria-label={getNavigationAriaLabel(Navigate.NEXT)}
            title={getNavigationAriaLabel(Navigate.NEXT)}
          >
            <span className="visible-sr-only">Next</span>
            <ArrowRight size={18} />
          </ToolbarButton>
        </ButtonGroupContainer>
      </NavigationContainer>

      <ViewContainer>
        <ButtonGroupContainer role="group" aria-label="Calendar view options">
          {views.map(viewName => (
            <ToolbarButton
              key={viewName}
              $active={view === viewName}
              onClick={() => onView(viewName)}
              aria-pressed={view === viewName}
              aria-label={getViewLabel(viewName)}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </ToolbarButton>
          ))}
        </ButtonGroupContainer>
      </ViewContainer>
    </ToolbarContainer>
  );
};

export default CustomToolbar;
