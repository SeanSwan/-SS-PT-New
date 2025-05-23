import React, { ReactNode } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Skeleton } from '@mui/material';

interface TrainingProgressLightCardProps {
  isLoading?: boolean;
  total: number;
  label: string;
  icon?: ReactNode;
}

/**
 * Training Progress Light Card Component
 * 
 * Displays a single metric with a circular progress indicator in a light themed card.
 * Can be used for various fitness and training metrics.
 */
const TrainingProgressLightCard: React.FC<TrainingProgressLightCardProps> = ({ 
  isLoading = false,
  total,
  label,
  icon
}) => {
  // Calculate progress percentage - in a real app, this would be based on actual data
  const progress = Math.min(85, Math.max(65, Math.floor(Math.random() * 20) + 65));

  return (
    <Card
      sx={{
        borderRadius: 3,
        height: '100%',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 6px 25px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ height: '100%' }}>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={25} width="60%" />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton variant="circular" width={80} height={80} />
              <Skeleton variant="text" height={60} width="40%" />
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {/* Fixed the issue by setting component="div" to prevent <p> wrapping */}
            <Typography 
              variant="body1" 
              color="text.secondary"
              fontWeight="medium"
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2
              }}
            >
              {icon && (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  {icon}
                </Box>
              )}
              {label}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={progress}
                  size={80}
                  thickness={5}
                  sx={{
                    color: 'success.main',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round'
                    }
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography
                    variant="h6"
                    component="div"
                    color="text.primary"
                    fontWeight="bold"
                  >
                    {progress}%
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ ml: 2 }}>
                <Typography 
                  variant="h3" 
                  component="div" 
                  fontWeight="bold"
                  color="text.primary"
                >
                  {total}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mt: -0.5 }}
                >
                  total
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingProgressLightCard;