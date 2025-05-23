import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Divider, 
  Rating, 
  Skeleton 
} from '@mui/material';
import { Dumbbell, Heart, Flame } from 'lucide-react';
import { FaWalking, FaHeartbeat } from 'react-icons/fa';

interface PopularWorkoutsCardProps {
  isLoading?: boolean;
}

/**
 * Popular Workouts Card Component
 * 
 * Displays a list of trending workout programs with effectiveness ratings and
 * quick access for trainers to assign to clients.
 */
const PopularWorkoutsCard: React.FC<PopularWorkoutsCardProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const workoutData = [
    { 
      id: 1,
      name: 'HIIT Circuit Training', 
      category: 'Cardio & Strength',
      rating: 4.9,
      clients: 18,
      icon: <Flame size={22} />
    },
    { 
      id: 2,
      name: 'Progressive Strength', 
      category: 'Strength Training',
      rating: 4.7,
      clients: 15,
      icon: <Dumbbell size={22} />
    },
    { 
      id: 3,
      name: 'Endurance Builder', 
      category: 'Cardio',
      rating: 4.5,
      clients: 12,
      icon: <FaWalking size={22} />
    },
    { 
      id: 4,
      name: 'Functional Mobility', 
      category: 'Flexibility & Recovery',
      rating: 4.6,
      clients: 10,
      icon: <FaWalking size={22} />
    },
    { 
      id: 5,
      name: 'Heart Rate Training', 
      category: 'Cardio & Endurance',
      rating: 4.8,
      clients: 14,
      icon: <FaHeartbeat size={22} />
    }
  ];

  // Colors for workout category icons
  const categoryColors = {
    'Cardio & Strength': '#e91e63',
    'Strength Training': '#673ab7',
    'Cardio': '#2196f3',
    'Flexibility & Recovery': '#009688',
    'Cardio & Endurance': '#f44336'
  };

  return (
    <Card sx={{ 
      borderRadius: 3, 
      height: '100%',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 6px 25px rgba(0, 0, 0, 0.12)'
      }
    }}>
      <CardContent>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={40} width="80%" />
            <Skeleton variant="text" height={25} width="60%" sx={{ mt: 1 }} />
            <Box sx={{ mt: 3 }}>
              {[1, 2, 3, 4, 5].map(item => (
                <React.Fragment key={item}>
                  <Box sx={{ display: 'flex', py: 1.5 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ ml: 2, width: '100%' }}>
                      <Skeleton variant="text" width="80%" height={24} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                  </Box>
                  {item < 5 && <Skeleton variant="text" height={1} />}
                </React.Fragment>
              ))}
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight="600" mb={0.5}>
              Popular Workouts
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Most assigned training programs
            </Typography>
            
            <List disablePadding sx={{ mt: 2 }}>
              {workoutData.map((workout, index) => (
                <React.Fragment key={workout.id}>
                  <ListItem sx={{ px: 0, py: 1.5 }} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: (categoryColors as any)[workout.category] + '20',
                          color: (categoryColors as any)[workout.category]
                        }}
                      >
                        {workout.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={500}>
                          {workout.name}
                        </Typography>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          component="div" // Changed to div to avoid nesting issues
                          sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}
                        >
                          <Rating 
                            value={workout.rating} 
                            precision={0.1} 
                            size="small" 
                            readOnly 
                          />
                          <Box component="span" sx={{ ml: 1 }}>
                            ({workout.rating}) • {workout.clients} clients
                          </Box>
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < workoutData.length - 1 && (
                    <Divider variant="fullWidth" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PopularWorkoutsCard;