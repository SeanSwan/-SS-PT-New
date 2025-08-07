/**
 * renderCalendar - Calendar Rendering Utility Component (PHASE 2: ROLE-ADAPTIVE)
 * ===============================================================================
 * Isolated conditional rendering logic for calendar components with role-based
 * prop passing to ensure both main calendar and fallback provide consistent
 * role-adaptive experiences.
 * 
 * PHASE 2 ENHANCEMENTS:
 * ✅ Role-based prop passing to CalendarFallback
 * ✅ Consistent role-aware styling
 * ✅ Enhanced fallback integration
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SlotInfo } from 'react-big-calendar';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import CalendarFallback from '../CalendarFallback';
import type { SessionEvent } from '../types';
import { getEventStyle } from './calendarHelpers';

interface RenderCalendarProps {
  // Calendar Configuration
  isCalendarInitialized: boolean;
  localizer: any;
  DragAndDropCalendar: any;
  
  // Calendar Data
  calendarEvents: SessionEvent[];
  view: string;
  selectedDate: Date;
  
  // Event Handlers
  onSelectSlot: (slotInfo: SlotInfo) => void;
  onSelectEvent: (event: SessionEvent) => void;
  onEventDrop?: ({ event, start, end }: { event: any; start: Date; end: Date }) => Promise<void>;
  onEventResize?: ({ event, start, end }: { event: any; start: Date; end: Date }) => Promise<void>;
  onView: (view: string) => void;
  onNavigate: (date: Date) => void;
  
  // UI State
  multiSelectEnabled: boolean;
  selectedEvents: string[];
  compactView: boolean;
  
  // Fallback Props
  onCreateSession?: () => void;
  onBookSession?: (sessionId: string) => void;
  onFilterChange?: (filters: any) => void;
  showQuickActions?: boolean;
  clientsCount?: number;
  utilizationRate?: number;
  completionRate?: number;
  
  // PHASE 2: Role-based props
  calendarMode?: 'full' | 'trainer' | 'client' | 'public';
  userRole?: 'admin' | 'trainer' | 'client' | 'user' | null;
  userId?: string | null;
  
  // Refs
  calendarRef?: React.RefObject<any>;
}

/**
 * Enhanced Calendar Event Component with role-aware styling
 */
const CalendarEventComponent: React.FC<{ event: SessionEvent }> = ({ event }) => (
  <motion.div
    style={{ height: '100%', width: '100%' }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.1 }}
  >
    <div style={{ padding: '2px 4px', height: '100%' }}>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '0.7rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {event.title}
      </div>
      {event.trainer && (
        <div style={{ 
          fontSize: '0.6rem', 
          opacity: 0.9,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {event.trainer.firstName}
        </div>
      )}
      {event.location && (
        <div style={{ 
          fontSize: '0.55rem', 
          opacity: 0.8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          📍 {event.location}
        </div>
      )}
    </div>
  </motion.div>
);

/**
 * Role-aware toolbar component
 */
const RoleAwareToolbar = ({ toolbarProps, userRole }: { toolbarProps: any; userRole?: string | null }) => {
  // Determine available views based on role
  const getAvailableViews = () => {
    switch (userRole) {
      case 'client':
      case 'user':
        return ['month', 'week']; // Simplified views for clients/users
      case 'trainer':
        return ['month', 'week', 'day']; // Most views for trainers
      case 'admin':
      default:
        return ['month', 'week', 'day', 'agenda']; // All views for admin
    }
  };

  const availableViews = getAvailableViews();

  return (
    <div className="rbc-toolbar" style={{ 
      background: 'rgba(0, 0, 0, 0.3)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div className="rbc-btn-group">
        <button 
          onClick={() => toolbarProps.onNavigate('PREV')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ‹ Previous
        </button>
        <button 
          onClick={() => toolbarProps.onNavigate('TODAY')}
          style={{
            background: 'rgba(59, 130, 246, 0.8)',
            border: '1px solid rgba(59, 130, 246, 1)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            margin: '0 0.5rem'
          }}
        >
          Today
        </button>
        <button 
          onClick={() => toolbarProps.onNavigate('NEXT')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Next ›
        </button>
      </div>
      
      <span className="rbc-toolbar-label" style={{ 
        color: 'white',
        fontSize: '1.25rem',
        fontWeight: '500'
      }}>
        {toolbarProps.label}
      </span>
      
      <div className="rbc-btn-group">
        {availableViews.map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbarProps.onView(viewName)}
            style={{
              background: toolbarProps.view === viewName 
                ? 'rgba(59, 130, 246, 0.8)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '0 0.25rem',
              textTransform: 'capitalize'
            }}
          >
            {viewName}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Calendar Rendering Component (PHASE 2: ROLE-ADAPTIVE)
 */
export const renderCalendar = (props: RenderCalendarProps): JSX.Element => {
  const {
    isCalendarInitialized,
    localizer,
    DragAndDropCalendar,
    calendarEvents,
    view,
    selectedDate,
    onSelectSlot,
    onSelectEvent,
    onEventDrop,
    onEventResize,
    onView,
    onNavigate,
    multiSelectEnabled,
    selectedEvents,
    compactView,
    onCreateSession,
    onBookSession,
    onFilterChange,
    showQuickActions,
    clientsCount,
    utilizationRate,
    completionRate,
    calendarMode = 'public',
    userRole = null,
    userId = null,
    calendarRef
  } = props;

  // Determine if drag and drop should be enabled based on role and calendar mode
  const isDragDropEnabled = (calendarMode === 'full' && userRole === 'admin') || 
                           (calendarMode === 'trainer' && userRole === 'trainer');

  // Render full-featured calendar (with role-based features)
  if (isCalendarInitialized && localizer && DragAndDropCalendar) {
    return (
      <ErrorBoundary>
        <DragAndDropCalendar
          ref={calendarRef}
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={onView}
          date={selectedDate}
          onNavigate={onNavigate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={isDragDropEnabled ? onEventDrop : undefined}
          onEventResize={isDragDropEnabled ? onEventResize : undefined}
          selectable
          resizable={isDragDropEnabled}
          popup
          eventPropGetter={(event: SessionEvent) => ({
            style: {
              ...getEventStyle(event),
              opacity: selectedEvents.includes(event.id) ? 0.8 : 1,
              border: selectedEvents.includes(event.id) 
                ? '2px solid #00ffff' 
                : 'none',
              cursor: isDragDropEnabled 
                ? (multiSelectEnabled ? 'pointer' : 'grab')
                : 'pointer',
              transition: 'all 0.2s ease'
            },
            className: multiSelectEnabled && selectedEvents.includes(event.id) 
              ? 'selected-event' 
              : undefined
          })}
          views={
            userRole === 'client' || userRole === 'user' 
              ? ['month', 'week']
              : userRole === 'trainer'
                ? ['month', 'week', 'day']
                : ['month', 'week', 'day', 'agenda']
          }
          step={15}
          timeslots={4}
          min={new Date(2024, 0, 1, 6, 0)}
          max={new Date(2024, 0, 1, 22, 0)}
          formats={{
            timeGutterFormat: 'h:mm A',
            eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
              `${localizer.format(start, 'h:mm A', culture)} - ${localizer.format(end, 'h:mm A', culture)}`,
            dayFormat: 'ddd M/D',
            dayHeaderFormat: 'dddd, MMMM D',
            monthHeaderFormat: 'MMMM YYYY',
            agendaDateFormat: 'ddd M/D',
            agendaTimeFormat: 'h:mm A'
          }}
          components={{
            event: CalendarEventComponent,
            toolbar: (toolbarProps) => (
              <RoleAwareToolbar toolbarProps={toolbarProps} userRole={userRole} />
            ),
            month: {
              header: ({ label }) => (
                <div style={{ 
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.75rem',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {label}
                </div>
              )
            },
            week: {
              header: ({ label }) => (
                <div style={{ 
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.75rem',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}>
                  {label}
                </div>
              )
            }
          }}
          dayPropGetter={(date) => ({
            style: {
              backgroundColor: date.toDateString() === new Date().toDateString() 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'
            }
          })}
          slotPropGetter={(date, resourceId) => ({
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderColor: 'rgba(255, 255, 255, 0.05)'
            }
          })}
        />
      </ErrorBoundary>
    );
  }

  // Render role-adaptive fallback calendar
  return (
    <CalendarFallback
      events={calendarEvents}
      onEventClick={onSelectEvent}
      onSlotClick={(date) => onSelectSlot({ 
        start: date, 
        end: new Date(date.getTime() + 60 * 60 * 1000) 
      } as SlotInfo)}
      onCreateSession={onCreateSession}
      onBookSession={onBookSession}
      onFilterChange={onFilterChange}
      showQuickActions={showQuickActions ?? true}
      compactView={compactView}
      clientsCount={clientsCount ?? 0}
      utilizationRate={utilizationRate ?? 0}
      completionRate={completionRate ?? 0}
      // PHASE 2: Pass role-based props to fallback
      userRole={userRole}
      userId={userId}
      calendarMode={calendarMode}
    />
  );
};

export default renderCalendar;
