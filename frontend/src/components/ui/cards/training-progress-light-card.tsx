import React, { ReactNode } from 'react';
import { Box, Grid, Skeleton, Typography, styled } from '@mui/material';
import MainCard from '../MainCard';
import { TrendingUp } from 'lucide-react';

// Types - explicitly define the props interface
interface TrainingProgressLightCardProps {
  isLoading?: boolean;
  total?: number;
  label?: string;
  icon?: ReactNode;
}

// Styled components
const CardStyle = styled(MainCard)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  color: theme.palette.mode === 'dark' ? '#fff' : '#000',
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: 'linear-gradient(140.9deg, #4CAF50 -14.02%, rgba(144, 202, 249, 0) 82.50%)',
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: 'linear-gradient(140.9deg, #4CAF50 -14.02%, rgba(144, 202, 249, 0) 82.50%)',
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));

// Component for displaying fitness achievements in a light theme card
const TrainingProgressLightCard: React.FC<TrainingProgressLightCardProps> = ({
  isLoading = false,
  total = 28,
  label = 'Active Clients',
  icon
}) => {
  return (
    <CardStyle>
      <Box sx={{ p: 2.25 }}>
        <Grid container direction="column">
          <Grid item>
            <Grid container justifyContent="space-between">
              <Grid item>
                {/* Display passed icon or default to nothing */}
                {icon}
              </Grid>
              <Grid item>
                {isLoading ? (
                  <Skeleton variant="rectangular" width={100} height={28} />
                ) : (
                  <Typography variant="h5" color="inherit">
                    {label}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Grid>
          <Grid item sx={{ mb: 0.75 }}>
            <Grid container alignItems="center">
              <Grid item xs={6}>
                <Grid container alignItems="center">
                  <Grid item>
                    {isLoading ? (
                      <Skeleton variant="rectangular" width={80} height={40} sx={{ my: 1.5 }} />
                    ) : (
                      <Typography sx={{ fontSize: '2.125rem', fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>
                        87%
                      </Typography>
                    )}
                  </Grid>
                  <Grid item>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#4CAF50'
                      }}
                    >
                      {isLoading ? (
                        <Skeleton variant="rectangular" width={60} height={24} />
                      ) : (
                        <>
                          <TrendingUp size={16} style={{ marginRight: '4px' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            +9%
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                  }}
                >
                  {isLoading ? (
                    <Skeleton variant="rectangular" width={90} height={28} />
                  ) : (
                    <Typography variant="body2">
                      {label}: {total}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            {isLoading ? (
              <Skeleton variant="rectangular" width={200} height={20} />
            ) : (
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#4CAF50'
                }}
              >
                Weekly Goals Completion Rate
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box>
    </CardStyle>
  );
};

export default TrainingProgressLightCard;