import React from 'react';
import {
  Avatar,
  Button,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import MainCard from './../ui/MainCard';
import { Activity, Dumbbell, Flame, Heart, Zap } from 'lucide-react';

// Types - explicitly define the props interface
interface PopularWorkoutsCardProps {
  isLoading: boolean;
}

/**
 * Popular Workouts Card (formerly PopularCard)
 * 
 * Displays the most popular and effective workout routines based on client results
 * and satisfaction ratings. This helps trainers identify which workouts are resonating
 * with clients and producing the best outcomes.
 */
const PopularWorkoutsCard: React.FC<PopularWorkoutsCardProps> = ({ isLoading }) => {
  const theme = useTheme();

  // Workout effectiveness rating component
  const EffectivenessRating = ({ rating }: { rating: number }) => {
    const icons = [];
    const color = theme.palette.warning.main;
    
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        icons.push(<Flame key={i} size={16} color={color} fill={color} />);
      } else {
        icons.push(<Flame key={i} size={16} color={color} opacity={0.4} />);
      }
    }
    
    return <Stack direction="row" spacing={0.5}>{icons}</Stack>;
  };

  return (
    <MainCard>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Grid container alignContent="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h5">Popular Workout Routines</Typography>
              </Grid>
              <Grid item>
                <Chip
                  label="This Month"
                  size="small"
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'dark.main' : 'primary.light',
                    color: 'primary.main'
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : (
              <List
                component="nav"
                sx={{
                  px: 0,
                  py: 0,
                  '& .MuiListItemButton-root': {
                    py: 1.5,
                    '& .MuiAvatar-root': {
                      color: theme.palette.success.dark,
                      bgcolor: theme.palette.success.light,
                      borderRadius: '10px'
                    },
                    '&:hover': {
                      bgcolor: 'transparent'
                    },
                    '& .MuiListItemSecondaryAction-root': {
                      alignSelf: 'center',
                      ml: 1
                    }
                  }
                }}
              >
                <ListItemButton>
                  <ListItemAvatar>
                    <Avatar variant="rounded">
                      <Dumbbell size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle1">HIIT Circuit Challenge</Typography>}
                    secondary={
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Full body, 30-min interval training
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <EffectivenessRating rating={5} />
                  </ListItemSecondaryAction>
                </ListItemButton>
                <Divider />
                <ListItemButton>
                  <ListItemAvatar>
                    <Avatar variant="rounded">
                      <Activity size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle1">Core Power Flow</Typography>}
                    secondary={
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Core & stability, 25-min workout
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <EffectivenessRating rating={4} />
                  </ListItemSecondaryAction>
                </ListItemButton>
                <Divider />
                <ListItemButton>
                  <ListItemAvatar>
                    <Avatar variant="rounded">
                      <Heart size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle1">Cardio Blast Series</Typography>}
                    secondary={
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Endurance, 40-min progressive training
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <EffectivenessRating rating={4} />
                  </ListItemSecondaryAction>
                </ListItemButton>
                <Divider />
                <ListItemButton>
                  <ListItemAvatar>
                    <Avatar variant="rounded">
                      <Zap size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle1">Strength Foundation</Typography>}
                    secondary={
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Progressive resistance, 45-min workout
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <EffectivenessRating rating={3} />
                  </ListItemSecondaryAction>
                </ListItemButton>
              </List>
            )}
          </Grid>
        </Grid>
      </CardContent>
      <CardActions sx={{ p: 1.25, pt: 0, justifyContent: 'center' }}>
        <Button size="small" disableElevation>
          View All Routines
        </Button>
      </CardActions>
    </MainCard>
  );
};

export default PopularWorkoutsCard;