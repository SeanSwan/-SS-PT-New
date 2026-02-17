/**
 * AccessibleEvent.tsx
 *
 * An accessible custom event component for Big Calendar
 * Provides clear visual indicators, high contrast, and proper ARIA support
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import moment from 'moment';
import { Calendar, User, Clock } from 'lucide-react';

// Types
interface EventProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    status: string;
    client?: {
      firstName: string;
      lastName: string;
    };
    trainer?: {
      firstName: string;
      lastName: string;
    };
  };
}

// Styled components
const EventContainer = styled.div<{ status: string }>`
  display: flex;
  flex-direction: column;
  padding: 6px;
  height: 100%;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

  /* Status-based styling with enhanced contrast */
  background: ${({ status }) =>
    status === 'available' ? 'rgba(0, 200, 150, 0.9)' :
    status === 'booked' ? 'rgba(150, 100, 230, 0.9)' :
    status === 'confirmed' ? 'rgba(0, 180, 230, 0.9)' :
    status === 'completed' ? 'rgba(70, 200, 70, 0.9)' :
    'rgba(230, 80, 80, 0.9)'};

  color: ${({ status }) =>
    ['available', 'confirmed', 'completed'].includes(status) ? '#000' : '#fff'};

  /* Cancelled styling */
  ${({ status }) => status === 'cancelled' && `
    text-decoration: line-through;
    opacity: 0.8;
  `}

  /* Status badge */
  &::before {
    content: '${({ status }) => status.toUpperCase()}';
    position: absolute;
    top: 0;
    right: 0;
    font-size: 0.7rem;
    padding: 2px 5px;
    border-radius: 0 0 0 6px;
    background-color: rgba(0, 0, 0, 0.2);
    color: ${({ status }) =>
      ['available', 'confirmed', 'completed'].includes(status) ? '#000' : '#fff'};
    font-weight: bold;
  }
`;

const EventTitle = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 2px;

  svg {
    width: 14px;
    height: 14px;
    margin-right: 3px;
  }
`;

const PersonInfo = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    width: 14px;
    height: 14px;
    margin-right: 3px;
  }
`;

// Tooltip content for detailed event info
const TooltipContent = styled.div`
  padding: 10px;
  min-width: 200px;

  h4 {
    margin: 0 0 5px 0;
    font-size: 1rem;
  }

  p {
    margin: 4px 0;
    font-size: 0.9rem;
  }

  .status {
    display: inline-block;
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: bold;
    margin-top: 4px;
  }
`;

// Custom tooltip wrapper
const TooltipWrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`;

const TooltipPopup = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 10px;
  min-width: 200px;
  pointer-events: none;
  color: white;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(20, 20, 40, 0.95);
  }
`;

const AccessibleEvent: React.FC<EventProps> = ({ event }) => {
  const { title, start, end, status, client, trainer } = event;
  const [showTooltip, setShowTooltip] = useState(false);

  // Show appropriate person info based on event status
  const renderPersonInfo = () => {
    if (client && (status !== 'available')) {
      return (
        <PersonInfo>
          <User size={14} />
          {client.firstName} {client.lastName}
        </PersonInfo>
      );
    }

    if (trainer) {
      return (
        <PersonInfo>
          <User size={14} />
          Trainer: {trainer.firstName}
        </PersonInfo>
      );
    }

    return null;
  };

  return (
    <TooltipWrapper
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {showTooltip && (
        <TooltipPopup role="tooltip">
          <TooltipContent>
            <h4>{title}</h4>
            <p><strong>Status:</strong> {status.toUpperCase()}</p>
            <p><strong>Time:</strong> {moment(start).format('h:mm A')} - {moment(end).format('h:mm A')}</p>
            {client && <p><strong>Client:</strong> {client.firstName} {client.lastName}</p>}
            {trainer && <p><strong>Trainer:</strong> {trainer.firstName} {trainer.lastName}</p>}
          </TooltipContent>
        </TooltipPopup>
      )}
      <EventContainer
        status={status}
        role="button"
        aria-label={`${title} - ${status} session at ${moment(start).format('h:mm A')}`}
        tabIndex={0}
      >
        <EventTitle>{title}</EventTitle>

        <TimeInfo>
          <Clock size={14} />
          {moment(start).format('h:mm A')}
        </TimeInfo>

        {renderPersonInfo()}
      </EventContainer>
    </TooltipWrapper>
  );
};

export default AccessibleEvent;
