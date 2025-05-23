import React from 'react';
import { format } from 'date-fns';
import { Paper, Typography, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

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

/**
 * CustomEvent Component
 * 
 * A specialized component for rendering calendar events with enhanced visuals,
 * tooltips, and status indicators. This component displays different styles
 * based on the event status and provides contextual information on hover.
 * 
 * Features:
 * - Color-coded based on event status
 * - Tooltips with comprehensive event details
 * - Visual indicators for new requests
 * - Hover animations for improved user experience
 * - Responsive text that adapts to available space
 */
export const CustomEvent: React.FC<CalendarEventProps> = ({ event }) => {
  const theme = useTheme();
  
  // Define status-based colors
  const statusColors = {
    available: theme.palette.success.main,
    requested: theme.palette.warning.main,
    scheduled: theme.palette.primary.main,
    confirmed: theme.palette.secondary.main,
    completed: theme.palette.info.dark,
    cancelled: theme.palette.error.main,
    'no-show': theme.palette.error.light
  };

  // Get background color based on event status
  const bgColor = statusColors[event.status] || theme.palette.primary.main;
  
  return (
    <Tooltip
      title={
        <React.Fragment>
          <Typography color="inherit" variant="subtitle2">
            {event.title}
          </Typography>
          <Typography variant="body2">
            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
          </Typography>
          <Typography variant="caption">
            Status: {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Typography>
          {event.client && (
            <Typography variant="caption" display="block">
              Client: {event.client.firstName} {event.client.lastName}
            </Typography>
          )}
          {event.trainer && (
            <Typography variant="caption" display="block">
              Trainer: {event.trainer.firstName} {event.trainer.lastName}
            </Typography>
          )}
          {event.location && (
            <Typography variant="caption" display="block">
              Location: {event.location}
            </Typography>
          )}
          {event.notes && (
            <Typography variant="caption" display="block">
              Notes: {event.notes}
            </Typography>
          )}
        </React.Fragment>
      }
      arrow
      placement="top"
    >
      <Paper
        elevation={3}
        sx={{
          height: '100%',
          overflow: 'hidden',
          backgroundColor: bgColor,
          color: theme.palette.getContrastText(bgColor),
          padding: '4px 8px',
          borderRadius: '4px',
          position: 'relative',
          border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[6],
          },
          cursor: 'pointer'
        }}
      >
        <Typography variant="subtitle2" noWrap>
          {event.title}
        </Typography>
        <Typography variant="caption" display="block" noWrap>
          {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
        </Typography>
        {event.status === 'requested' && (
          <Chip
            label="NEW"
            size="small"
            color="warning"
            sx={{
              position: 'absolute',
              right: 4,
              top: 4,
              height: '16px',
              fontSize: '0.65rem',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': {
                  opacity: 0.7,
                },
                '50%': {
                  opacity: 1,
                },
                '100%': {
                  opacity: 0.7,
                },
              },
            }}
          />
        )}
      </Paper>
    </Tooltip>
  );
};

export default CustomEvent;