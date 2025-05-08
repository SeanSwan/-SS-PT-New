import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Button, Avatar } from '@mui/material';
import { Calendar, Clock, MapPin } from 'lucide-react';

import { 
  StyledCard, 
  CardHeader, 
  CardTitle, 
  CardContent,
  ScheduleTimeline,
  ScheduleTimelineItem,
  itemVariants
} from '../styled-components';

import { ScheduledSession } from '../../types';

interface ScheduledSessionsCardProps {
  sessions: ScheduledSession[];
  onScheduleMore?: () => void;
}

/**
 * Component displaying upcoming scheduled training sessions
 */
const ScheduledSessionsCard: React.FC<ScheduledSessionsCardProps> = ({ 
  sessions,
  onScheduleMore
}) => {
  // Format date for user-friendly display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  };
  
  // Get session type color
  const getSessionTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'strength':
        return 'rgba(0, 255, 255, 0.9)';
      case 'cardio':
        return 'rgba(255, 83, 83, 0.9)';
      case 'flexibility':
        return 'rgba(120, 81, 169, 0.9)';
      case 'balance':
        return 'rgba(255, 183, 0, 0.9)';
      default:
        return 'rgba(255, 255, 255, 0.7)';
    }
  };

  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Calendar size={22} />
          Upcoming Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={3}>
          Your scheduled training sessions
        </Typography>
        
        {sessions.length > 0 ? (
          <ScheduleTimeline>
            {sessions.map((session) => (
              <ScheduleTimelineItem key={session.id} active={session.isActive}>
                <Box sx={{ 
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(30, 30, 60, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1">
                      {session.title}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        px: 1.5, 
                        py: 0.5, 
                        borderRadius: '10px', 
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: getSessionTypeColor(session.type)
                      }}
                    >
                      {session.type}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar size={14} opacity={0.7} />
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        {formatDate(session.date)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Clock size={14} opacity={0.7} />
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        {session.time} ({session.duration} min)
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MapPin size={14} opacity={0.7} />
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        {session.location}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        Trainer:
                      </Typography>
                      {session.trainerAvatar ? (
                        <Avatar 
                          src={session.trainerAvatar} 
                          alt={session.trainerName} 
                          sx={{ width: 24, height: 24 }}
                        />
                      ) : (
                        <Avatar 
                          sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}
                        >
                          {session.trainerName.charAt(0)}
                        </Avatar>
                      )}
                      <Typography variant="body2">
                        {session.trainerName}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </ScheduleTimelineItem>
            ))}
          </ScheduleTimeline>
        ) : (
          <Box 
            sx={{ 
              p: 3, 
              textAlign: 'center', 
              background: 'rgba(30, 30, 60, 0.3)', 
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}
          >
            <Typography variant="body1" mb={1}>
              No upcoming sessions scheduled
            </Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
              Schedule a session to continue your fitness journey
            </Typography>
          </Box>
        )}
        
        <Box mt={3}>
          <Button 
            variant="outlined" 
            color="primary" 
            fullWidth
            onClick={onScheduleMore}
            sx={{ 
              borderRadius: '10px', 
              py: 1.2, 
              textTransform: 'none',
              background: 'rgba(0, 255, 255, 0.05)'
            }}
          >
            Schedule New Session
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default ScheduledSessionsCard;
