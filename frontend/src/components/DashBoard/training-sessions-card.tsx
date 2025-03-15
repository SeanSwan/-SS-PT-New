import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Grid,
  Skeleton,
  Typography,
  useTheme
} from '@mui/material';
import MainCard from '../ui/MainCard';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { Calendar, Clock, Users } from 'lucide-react';

// Types
interface TrainingSessionsCardProps {
  isLoading: boolean;
}

/**
 * TrainingSessionsCard (formerly EarningCard)
 * 
 * Displays key training session metrics including total sessions completed,
 * percentage increase, and monthly client engagement.
 * 
 * This card provides trainers with a quick overview of their session productivity
 * and client activity, highlighting growth compared to previous periods.
 */
const TrainingSessionsCard: React.FC<TrainingSessionsCardProps> = ({ isLoading }) => {
  const theme = useTheme();

  return (
    <MainCard contentSX={{ p: 2.25 }}>
      <Grid container direction="column">
        <Grid item>
          <Grid container justifyContent="space-between">
            <Grid item>
              <Avatar
                variant="rounded"
                sx={{
                  backgroundColor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                  mt: 1
                }}
              >
                <Clock color={theme.palette.primary.main} size={24} />
              </Avatar>
            </Grid>
            <Grid item>
              <Button
                disableElevation
                variant="contained"
                size="small"
                sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
              >
                <Calendar size={15} style={{ marginRight: '4px' }} /> Monthly
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Grid container alignItems="center">
            <Grid item>
              {isLoading ? (
                <Skeleton variant="rounded" width={100} height={44} />
              ) : (
                <Typography sx={{ fontSize: '2.125rem', fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>
                  128
                </Typography>
              )}
            </Grid>
            <Grid item>
              {isLoading ? (
                <Skeleton variant="rounded" width={20} height={20} />
              ) : (
                <Avatar
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: theme.palette.success.light,
                    color: theme.palette.success.dark,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ArrowUpwardIcon fontSize="inherit" sx={{ transform: 'rotate3d(1, 1, 1, 45deg)' }} />
                </Avatar>
              )}
            </Grid>
          </Grid>
        </Grid>
        <Grid item sx={{ mb: 1.25 }}>
          {isLoading ? (
            <Skeleton variant="rounded" width={90} height={20} />
          ) : (
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 500,
                color: theme.palette.success.dark
              }}
            >
              +16% from last month
            </Typography>
          )}
        </Grid>
        <Grid item>
          {isLoading ? (
            <Skeleton variant="rounded" width={150} height={20} />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: theme.palette.text.secondary
              }}
            >
              <Users size={16} style={{ marginRight: '6px' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 400 }}>
                42 Active Clients This Month
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default TrainingSessionsCard;