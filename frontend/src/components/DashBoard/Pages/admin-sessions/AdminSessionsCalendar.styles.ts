/**
 * Admin sessions calendar shell styles.
 * Owns react-big-calendar overrides used by the canonical admin sessions page.
 */
import styled from 'styled-components';
export const CalendarViewWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  background: rgba(30, 58, 138, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;
  min-height: 600px;

  & > div {
    height: 100%;
  }

  .rbc-calendar {
    background: rgba(20, 20, 40, 0.4);
    color: white;
  }
  .rbc-toolbar {
    background: rgba(30, 58, 138, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .rbc-toolbar-label {
    color: #e5e7eb;
    font-size: 1.2rem;
    font-weight: 500;
  }
  .rbc-header {
    background: rgba(30, 58, 138, 0.2);
    color: #e5e7eb;
    font-weight: 500;
    border-color: rgba(59, 130, 246, 0.15);
    padding: 0.75rem;
  }
  .rbc-event {
    background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
    border: none;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    border-radius: 6px;
    padding: 4px 8px;
    font-weight: 500;
  }
  .rbc-event.available {
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  }
  .rbc-event.confirmed {
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
  }
  .rbc-event.cancelled {
    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
    opacity: 0.7;
  }
  .rbc-event.completed {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  }
  .rbc-today {
    background: rgba(59, 130, 246, 0.1);
  }
  .rbc-off-range-bg {
    background: rgba(10, 10, 15, 0.3);
  }
  .rbc-date-cell {
    color: #e5e7eb;
  }
  .rbc-time-slot {
    color: #9ca3af;
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-day-bg, .rbc-month-row, .rbc-time-content {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-btn-group button {
    background: rgba(30, 58, 138, 0.4);
    color: white;
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 0.5rem 1rem;
    font-weight: 500;
    &:hover {
      background: rgba(59, 130, 246, 0.4);
    }
    &.rbc-active {
      background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
      border-color: #3b82f6;
    }
  }
  .rbc-time-view {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-month-view {
    border-color: rgba(59, 130, 246, 0.1);
  }
  .rbc-agenda-view {
    color: #e5e7eb;
  }
  .rbc-agenda-date-cell, .rbc-agenda-time-cell {
    color: #9ca3af;
  }
  .rbc-agenda-event-cell {
    color: #e5e7eb;
  }
`;

export const TestControlsWrapper = styled.div`
  margin-top: 2rem;
`;
