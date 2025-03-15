import React from 'react';
import { Box, Grid, Skeleton, Typography, styled } from '@mui/material';
import MainCard from '../MainCard';
import { Activity, ArrowUpRight, Medal, Trophy } from 'lucide-react';

// Types - explicitly define the props interface
interface TrainingProgressDarkCardProps {
  isLoading?: boolean;
}

// Styled dark theme card for fitness metrics
const CardStyle = styled(MainCard)(({ theme }) => ({
  backgroundColor: '#1a2038', // Darker background for contrast
  color: '#fff',
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: 'linear-gradient(140.9deg, #ff5722 -14.02%, rgba(0, 0, 0, 0) 77.79%)',
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: 'linear-gradient(210.04deg, #ff5722 -50.94%, rgba(0, 0, 0, 0) 83.49%)',
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));

// Component for displaying personal training achievements with dark theme
const TrainingProgressDarkCard: React.FC<TrainingProgressDarkCardProps> = ({ isLoading = false }) => {
  return (
    <CardStyle>
      <Box sx={{ p: 2.25 }}>
        <Grid container direction="column">
          <Grid item>
            <Grid container justifyContent="space-between">
              <Grid item>
                {isLoading ? (
                  <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <Trophy size={36} color="#ff5722" />
                )}
              </Grid>
              <Grid item>
                {isLoading ? (
                  <Skeleton variant="rectangular" width={120} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <Typography variant="h5" color="inherit">
                    Client Achievements
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
                      <Skeleton variant="rectangular" width={80} height={50} sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 1.5 }} />
                    ) : (
                      <Typography sx={{ fontSize: '2.125rem', fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>
                        189
                      </Typography>
                    )}
                  </Grid>
                  <Grid item>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#ff5722'
                      }}
                    >
                      {isLoading ? (
                        <Skeleton variant="rectangular" width={50} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                      ) : (
                        <>
                          <ArrowUpRight size={16} style={{ marginRight: '4px' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            +12%
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={6}>
                <Grid container justifyContent="flex-end">
                  <Grid item>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {isLoading ? (
                        <Skeleton variant="rectangular" width={120} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                      ) : (
                        <>
                          <Medal size={20} style={{ marginRight: '8px', color: '#ffc107' }} />
                          <Typography variant="body2">
                            23 PRs This Month
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 2
              }}
            >
              {isLoading ? (
                <Skeleton variant="rectangular" width={220} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
              ) : (
                <>
                  <Activity size={18} style={{ marginRight: '8px', color: '#ff5722' }} />
                  <Typography
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 500,
                      color: '#ff5722'
                    }}
                  >
                    Total Client Milestones Achieved
                  </Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </CardStyle>
  );
};

export default TrainingProgressDarkCard;