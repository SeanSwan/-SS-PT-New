import React, { useState } from 'react';
import { format } from 'date-fns';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

/**
 * Interface for calendar event props
 */
export interface CalendarEventProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
    confirmed?: boolean;
    client?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    trainer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    location?: string;
    notes?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  available: '#4caf50',
  requested: '#ff9800',
  scheduled: '#2196f3',
  confirmed: '#7851a9',
  completed: '#1565c0',
  cancelled: '#f44336',
  'no-show': '#ef5350'
};

const EventContainer = styled.div<{ $bgColor: string }>`
  height: 100%;
  overflow: hidden;
  background-color: ${props => props.$bgColor};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
`;

const EventTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EventTime = styled.span`
  font-size: 0.6875rem;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
`;

const NewBadge = styled.span`
  position: absolute;
  right: 4px;
  top: 4px;
  height: 16px;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0 6px;
  border-radius: 8px;
  background: #ff9800;
  color: white;
  display: inline-flex;
  align-items: center;
  animation: ${pulse} 1.5s infinite;
`;

const TooltipWrapper = styled.div`
  position: relative;
  height: 100%;
`;

const TooltipPopup = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 15, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 180px;
  z-index: 1000;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(15, 15, 30, 0.95);
  }
`;

const TipTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  display: block;
`;

const TipLine = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-top: 2px;
`;

const TipCaption = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-top: 2px;
`;

/**
 * CustomEvent Component
 *
 * A specialized component for rendering calendar events with enhanced visuals,
 * tooltips, and status indicators.
 */
export const CustomEvent: React.FC<CalendarEventProps> = ({ event }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const bgColor = STATUS_COLORS[event.status] || '#2196f3';

  return (
    <TooltipWrapper
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <EventContainer $bgColor={bgColor}>
        <EventTitle>{event.title}</EventTitle>
        <EventTime>
          {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
        </EventTime>
        {event.status === 'requested' && <NewBadge>NEW</NewBadge>}
      </EventContainer>
      {showTooltip && (
        <TooltipPopup>
          <TipTitle>{event.title}</TipTitle>
          <TipLine>
            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
          </TipLine>
          <TipCaption>
            Status: {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </TipCaption>
          {event.client && (
            <TipCaption>Client: {event.client.firstName} {event.client.lastName}</TipCaption>
          )}
          {event.trainer && (
            <TipCaption>Trainer: {event.trainer.firstName} {event.trainer.lastName}</TipCaption>
          )}
          {event.location && (
            <TipCaption>Location: {event.location}</TipCaption>
          )}
          {event.notes && (
            <TipCaption>Notes: {event.notes}</TipCaption>
          )}
        </TooltipPopup>
      )}
    </TooltipWrapper>
  );
};

export default CustomEvent;
