/**
 * AdminSessionsCalendar.tsx
 * ==========================
 * 
 * Calendar view component for Admin Sessions
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 * 
 * Features:
 * - Integrated calendar view with UnifiedCalendar
 * - Session event rendering with status colors
 * - Responsive calendar design
 * - Performance-optimized calendar rendering
 * - Error boundary integration
 * - WCAG AA accessibility compliance
 * - Mobile-optimized calendar controls
 */

import React, { memo, Suspense } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Box as MuiBox, Alert, Typography } from '@mui/material';
import { Calendar, AlertTriangle } from 'lucide-react';
import { AdminSessionsCalendarProps } from './AdminSessionsTypes';
import { LoadingState, cardVariants } from './AdminSessionsSharedComponents';

// Lazy load calendar components
const ScheduleErrorBoundary = React.lazy(() => 
  import('../../../Schedule/ScheduleErrorBoundary')
);
const ScheduleInitializer = React.lazy(() => 
  import('../../../Schedule/ScheduleInitializer')
);
const UnifiedCalendar = React.lazy(() => 
  import('../../../Schedule/schedule')
);

// ===== STYLED COMPONENTS =====

const CalendarContainer = styled(motion.div)`
  width: 100%;
  min-height: 600px;
  background: rgba(30, 58, 138, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;
  backdrop-filter: blur(10px);
  
  /* Enhanced calendar styling for admin sessions */
  & > div {
    height: 100%;
    
    .rbc-calendar {
      background: rgba(20, 20, 40, 0.4);
      color: white;
      font-family: 'Inter', 'SF Pro Display', 'Roboto', sans-serif;
    }
    
    /* Calendar Toolbar */
    .rbc-toolbar {
      background: rgba(30, 58, 138, 0.3);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      
      .rbc-toolbar-label {
        color: #e5e7eb;
        fontSize: 1.2rem;
        font-weight: 500;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    }
    
    /* Calendar Headers */
    .rbc-header {
      background: rgba(30, 58, 138, 0.2);
      color: #e5e7eb;
      font-weight: 500;
      border-color: rgba(59, 130, 246, 0.15);
      padding: 0.75rem;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }
    
    /* Session Events */
    .rbc-event {
      border: none;
      border-radius: 6px;
      padding: 4px 8px;
      font-weight: 500;
      font-size: 0.75rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
      }
      
      /* Default session event styling */
      background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
      
      /* Status-specific styling */
      &.available {
        background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        border-left: 3px solid #059669;
      }
      
      &.scheduled {
        background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
        border-left: 3px solid #2563eb;
      }
      
      &.confirmed {
        background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        border-left: 3px solid #0284c7;
      }
      
      &.completed {
        background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
        border-left: 3px solid #7c3aed;
      }
      
      &.cancelled {
        background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
        border-left: 3px solid #dc2626;
        opacity: 0.7;
        text-decoration: line-through;
      }
      
      &.requested {
        background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
        border-left: 3px solid #d97706;
      }
    }
    
    /* Today highlighting */
    .rbc-today {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    /* Off-range background */
    .rbc-off-range-bg {
      background: rgba(10, 10, 15, 0.3);
    }
    
    /* Date cells */
    .rbc-date-cell {
      color: #e5e7eb;
      
      &.rbc-off-range {
        color: rgba(229, 231, 235, 0.4);
      }
    }
    
    /* Time slots */
    .rbc-time-slot {
      color: #9ca3af;
      border-color: rgba(59, 130, 246, 0.1);
      font-size: 0.8rem;
    }
    
    /* Grid borders */
    .rbc-day-bg, 
    .rbc-month-row, 
    .rbc-time-content {
      border-color: rgba(59, 130, 246, 0.1);
    }
    
    /* Navigation buttons */
    .rbc-btn-group button {
      background: rgba(30, 58, 138, 0.4);
      color: white;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.5rem 1rem;
      font-weight: 500;
      border-radius: 6px;
      margin: 0 2px;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(59, 130, 246, 0.4);
        transform: translateY(-1px);
      }
      
      &.rbc-active {
        background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
        border-color: #3b82f6;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
      }
    }
    
    /* Time view specific */
    .rbc-time-view {
      border-color: rgba(59, 130, 246, 0.1);
    }
    
    /* Month view specific */
    .rbc-month-view {
      border-color: rgba(59, 130, 246, 0.1);
    }
    
    /* Agenda view */
    .rbc-agenda-view {
      color: #e5e7eb;
      
      .rbc-agenda-date-cell, 
      .rbc-agenda-time-cell {
        color: #9ca3af;
        border-color: rgba(59, 130, 246, 0.1);
      }
      
      .rbc-agenda-event-cell {
        color: #e5e7eb;
      }
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .rbc-toolbar {
        flex-direction: column;
        gap: 1rem;
        
        .rbc-toolbar-label {
          order: -1;
          text-align: center;
        }
      }
      
      .rbc-btn-group {
        justify-content: center;
      }
      
      .rbc-event {
        font-size: 0.7rem;
        padding: 2px 4px;
      }
    }
  }
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  
  .title {
    color: white;
    font-size: 1.1rem;
    font-weight: 500;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
  }
`;

const CalendarError = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  
  .icon {
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  .title {
    color: #ef4444;
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .description {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }
`;

// ===== ERROR BOUNDARY FALLBACK =====

const CalendarErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <CalendarError>
    <AlertTriangle size={48} className="icon" />
    <div className="title">Calendar Unavailable</div>
    <div className="description">
      The calendar view is temporarily unavailable. Please try refreshing the page or use the table view.
      {error && (
        <details style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.8 }}>
          <summary>Error Details</summary>
          <pre style={{ marginTop: '0.5rem', textAlign: 'left' }}>
            {error.message}
          </pre>
        </details>
      )}
    </div>
  </CalendarError>
);

// ===== MAIN COMPONENT =====

const AdminSessionsCalendar: React.FC<AdminSessionsCalendarProps> = ({
  sessions,
  loading
}) => {
  // Transform sessions data for calendar if needed
  const calendarSessions = React.useMemo(() => {
    return sessions.map(session => ({
      ...session,
      // Ensure proper calendar event structure
      title: session.client 
        ? `${session.client.firstName} ${session.client.lastName}`
        : 'Available Slot',
      start: new Date(session.sessionDate),
      end: new Date(new Date(session.sessionDate).getTime() + (session.duration * 60000)),
      resource: session
    }));
  }, [sessions]);

  return (
    <CalendarContainer
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <CalendarHeader>
        <Calendar size={20} />
        <div>
          <div className="title">Calendar View</div>
          <div className="subtitle">
            {loading ? 'Loading sessions...' : `${sessions.length} sessions`}
          </div>
        </div>
      </CalendarHeader>

      {loading ? (
        <LoadingState 
          message="Loading calendar..."
          subMessage="Preparing session data for calendar view"
        />
      ) : (
        <Suspense fallback={
          <LoadingState 
            message="Initializing calendar..."
            subMessage="Loading calendar components"
          />
        }>
          <ScheduleInitializer>
            <ScheduleErrorBoundary fallback={CalendarErrorFallback}>
              <UnifiedCalendar />
            </ScheduleErrorBoundary>
          </ScheduleInitializer>
        </Suspense>
      )}
    </CalendarContainer>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsCalendar);

// ===== UTILITY FUNCTIONS =====

export const prepareCalendarEvents = (sessions: any[]) => {
  return sessions.map(session => {
    const startDate = new Date(session.sessionDate);
    const endDate = new Date(startDate.getTime() + (session.duration * 60000));
    
    return {
      id: session.id,
      title: session.client 
        ? `${session.client.firstName} ${session.client.lastName}`
        : session.status === 'available' 
          ? 'Available Slot'
          : 'Session',
      start: startDate,
      end: endDate,
      allDay: false,
      resource: session,
      className: session.status, // For CSS styling
      style: getEventStyle(session.status)
    };
  });
};

export const getEventStyle = (status: string) => {
  const styles = {
    available: {
      backgroundColor: '#10b981',
      borderColor: '#059669'
    },
    scheduled: {
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb'
    },
    confirmed: {
      backgroundColor: '#0ea5e9',
      borderColor: '#0284c7'
    },
    completed: {
      backgroundColor: '#8b5cf6',
      borderColor: '#7c3aed'
    },
    cancelled: {
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      opacity: 0.7
    },
    requested: {
      backgroundColor: '#f59e0b',
      borderColor: '#d97706'
    }
  };
  
  return styles[status as keyof typeof styles] || styles.scheduled;
};

// ===== CALENDAR EVENT HANDLERS =====

export const handleCalendarEventClick = (
  event: any,
  onViewSession: (session: any) => void
) => {
  if (event.resource) {
    onViewSession(event.resource);
  }
};

export const handleCalendarSlotClick = (
  slotInfo: any,
  onCreateSession: (dateTime: Date) => void
) => {
  onCreateSession(slotInfo.start);
};

// ===== ACCESSIBILITY HELPERS =====

export const getCalendarAriaLabel = (sessionCount: number): string => {
  return `Calendar view showing ${sessionCount} training sessions. Use arrow keys to navigate dates, Enter to select.`;
};

// ===== CALENDAR CONFIGURATION =====

export const calendarViewConfig = {
  views: ['month', 'week', 'day', 'agenda'],
  defaultView: 'week',
  step: 15,
  timeslots: 4,
  min: new Date(0, 0, 0, 6, 0, 0), // 6:00 AM
  max: new Date(0, 0, 0, 22, 0, 0), // 10:00 PM
  scrollToTime: new Date(0, 0, 0, 8, 0, 0), // 8:00 AM
  formats: {
    timeGutterFormat: 'h:mm A',
    eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
      `${localizer.format(start, 'h:mm A', culture)} - ${localizer.format(end, 'h:mm A', culture)}`,
    dayFormat: 'ddd M/D',
    dayHeaderFormat: 'dddd, MMMM Do'
  }
};
