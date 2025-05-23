import React from 'react';
import { Box, Card, CardContent, Typography, Stack, Divider, Skeleton } from '@mui/material';
import { Calendar, Users, TrendingUp, Clock, Activity } from 'lucide-react';
import styled from 'styled-components';

// Custom styled components
const StyledCard = styled(Card)`
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  }
`;

const IconWrapper = styled(Box)`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  margin-right: 16px;
`;

const StatItem = styled(Box)`
  display: flex;
  align-items: center;
  padding: 12px 0;
`;

// Fixed the StatLabel styling to avoid accessing undefined theme properties
const StatLabel = styled(Typography)`
  color: rgba(0, 0, 0, 0.6);
`;

interface TrainingSessionsCardProps {
  isLoading?: boolean;
}

/**
 * Training Sessions Card Component
 * 
 * Displays key metrics about training sessions for trainers and admin users.
 * Shows total sessions, active clients, completion rate, and average session duration.
 */
const TrainingSessionsCard: React.FC<TrainingSessionsCardProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const sessionData = {
    totalSessions: 248,
    activeClients: 28,
    completionRate: 92,
    avgDuration: 55,
    sessionsGrowth: 12
  };

  return (
    <StyledCard>
      <CardContent>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={40} width="80%" />
            <Skeleton variant="text" height={25} width="60%" sx={{ mt: 1 }} />
            <Skeleton variant="rectangular" height={130} sx={{ mt: 3, borderRadius: 1 }} />
          </Box>
        ) : (
          <>
            <Box mb={2}>
              <Typography variant="h5" fontWeight="600">
                Training Sessions
              </Typography>
              <Stack direction="row" alignItems="center" mt={0.5}>
                <Typography variant="body2" color="textSecondary">
                  Last 30 days
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    ml: 1, 
                    px: 1, 
                    py: 0.25, 
                    borderRadius: 1, 
                    bgcolor: 'success.light',
                    color: 'success.dark',
                    fontWeight: 'medium'
                  }}
                >
                  +{sessionData.sessionsGrowth}%
                </Typography>
              </Stack>
            </Box>
            
            <Box>
              <Stack divider={<Divider flexItem />} spacing={0}>
                <StatItem>
                  <IconWrapper sx={{ bgcolor: 'primary.light' }}>
                    <Calendar size={24} color="#1976d2" />
                  </IconWrapper>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {sessionData.totalSessions}
                    </Typography>
                    <StatLabel variant="body2">
                      Total Sessions
                    </StatLabel>
                  </Box>
                </StatItem>
                
                <StatItem>
                  <IconWrapper sx={{ bgcolor: 'success.light' }}>
                    <Users size={24} color="#2e7d32" />
                  </IconWrapper>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {sessionData.activeClients}
                    </Typography>
                    <StatLabel variant="body2">
                      Active Clients
                    </StatLabel>
                  </Box>
                </StatItem>
                
                <StatItem>
                  <IconWrapper sx={{ bgcolor: 'warning.light' }}>
                    <Activity size={24} color="#ed6c02" />
                  </IconWrapper>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {sessionData.completionRate}%
                    </Typography>
                    <StatLabel variant="body2">
                      Completion Rate
                    </StatLabel>
                  </Box>
                </StatItem>
                
                <StatItem>
                  <IconWrapper sx={{ bgcolor: 'info.light' }}>
                    <Clock size={24} color="#0288d1" />
                  </IconWrapper>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {sessionData.avgDuration} min
                    </Typography>
                    <StatLabel variant="body2">
                      Avg. Session Duration
                    </StatLabel>
                  </Box>
                </StatItem>
              </Stack>
            </Box>
          </>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default TrainingSessionsCard;