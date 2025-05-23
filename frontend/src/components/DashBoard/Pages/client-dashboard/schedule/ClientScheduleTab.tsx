/**
 * ClientScheduleTab.tsx
 * 
 * Client Schedule Tab for managing training sessions
 * - Displays calendar view of available and booked sessions
 * - Allows booking new sessions and canceling existing ones
 * - Shows client-specific stats
 */

import React, { useEffect } from 'react';
import { Grid, Typography, Box, Paper, Card, CardHeader, CardContent, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch } from 'react-redux';

// Import the enhanced TypeScript ScheduleContainer component
import ScheduleContainer from '../../../../Schedule/ScheduleContainer';

// Style components
const PageTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 500,
  fontSize: '1.5rem',
  marginBottom: theme.spacing(2)
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  '&:before': {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '4px',
    top: 0,
    left: 0,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
  }
}));

const ClientScheduleTab: React.FC = () => {
  // Initialize with redux if needed
  const dispatch = useDispatch();

  // Any component-specific initialization
  useEffect(() => {
    // Initialize component
    document.title = "My Schedule | Client Dashboard";
  }, []);

  return (
    <Grid container spacing={3}>
      {/* Page Header */}
      <Grid item xs={12}>
        <PageTitle variant="h4">
          My Training Schedule
        </PageTitle>
        <Typography variant="body1" color="textSecondary">
          View available training slots, book new sessions, and manage your upcoming appointments.
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Grid>
      
      {/* Calendar View */}
      <Grid item xs={12}>
        <StyledCard>
          <CardHeader 
            title="Session Calendar" 
            subheader="View and book training sessions"
          />
          <Divider />
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
              <ScheduleContainer />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );
};

export default ClientScheduleTab;