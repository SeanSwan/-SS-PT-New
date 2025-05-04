import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Stack, Skeleton } from '@mui/material';
import { Award, TrendingUp } from 'lucide-react';

interface TrainingProgressDarkCardProps {
  isLoading?: boolean;
}

/**
 * Training Progress Dark Card Component
 * 
 * Displays client achievements and progress metrics in a dark themed card.
 * Highlights important training milestones and improvements.
 */
const TrainingProgressDarkCard: React.FC<TrainingProgressDarkCardProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const progressData = {
    achievementsCompleted: 78,
    averageImprovement: 24,
    milestonesReached: 35
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        height: '100%',
        bgcolor: 'primary.dark',
        color: 'primary.contrastText',
        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)'
        }
      }}
    >
      <CardContent>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={40} width="80%" sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
            <Skeleton variant="text" height={25} width="60%" sx={{ mt: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 3, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
          </Box>
        ) : (
          <>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Award size={24} />
                <Typography variant="h6" fontWeight="600">
                  Achievements
                </Typography>
              </Stack>
              
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Completed Goals
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {progressData.achievementsCompleted}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progressData.achievementsCompleted}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'info.light'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Avg. Improvement
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="h6" mr={0.5}>
                      {progressData.averageImprovement}%
                    </Typography>
                    <TrendingUp size={16} />
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Milestones
                  </Typography>
                  <Typography variant="h6" mt={0.5}>
                    {progressData.milestonesReached}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Decorative elements */}
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                zIndex: 0
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -50,
                left: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
                zIndex: 0
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingProgressDarkCard;