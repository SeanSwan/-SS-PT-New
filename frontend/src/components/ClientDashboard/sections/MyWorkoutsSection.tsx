import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';

// Icons
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DoneIcon from '@mui/icons-material/Done';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HistoryIcon from '@mui/icons-material/History';

// Placeholder workout plans
const workoutPlans = [
  {
    id: 1,
    name: "Full Body Workout",
    type: "Strength",
    duration: 45,
    lastCompleted: "2 days ago",
    progress: 80,
    exercises: [
      { name: "Squats", sets: 3, reps: 12 },
      { name: "Push-ups", sets: 3, reps: 15 },
      { name: "Deadlifts", sets: 3, reps: 10 },
      { name: "Lunges", sets: 2, reps: 12 },
      { name: "Plank", sets: 3, reps: "30 seconds" }
    ]
  },
  {
    id: 2,
    name: "HIIT Cardio",
    type: "Cardio",
    duration: 30,
    lastCompleted: "5 days ago",
    progress: 60,
    exercises: [
      { name: "Jumping Jacks", sets: 3, reps: "30 seconds" },
      { name: "Mountain Climbers", sets: 3, reps: "30 seconds" },
      { name: "Burpees", sets: 3, reps: 10 },
      { name: "High Knees", sets: 3, reps: "30 seconds" },
      { name: "Rest", sets: 3, reps: "15 seconds" }
    ]
  },
  {
    id: 3,
    name: "Dance Workout",
    type: "Dance",
    duration: 40,
    lastCompleted: "1 week ago",
    progress: 45,
    exercises: [
      { name: "Warm-up", sets: 1, reps: "5 minutes" },
      { name: "Hip-hop Routine", sets: 1, reps: "10 minutes" },
      { name: "Latin Dance", sets: 1, reps: "10 minutes" },
      { name: "Freestyle", sets: 1, reps: "10 minutes" },
      { name: "Cool Down", sets: 1, reps: "5 minutes" }
    ]
  }
];

// Upcoming sessions data
const upcomingSessions = [
  {
    id: 101,
    type: "Personal Training",
    dateTime: "May 15, 2025 - 10:00 AM",
    trainer: "Alex Johnson",
    focus: "Strength & Conditioning"
  },
  {
    id: 102,
    type: "Group Dance Class",
    dateTime: "May 19, 2025 - 6:00 PM",
    trainer: "Maria Rodriguez",
    focus: "Latin Dance Fundamentals"
  }
];

// Past sessions
const pastSessions = [
  {
    id: 201,
    type: "Personal Training",
    dateTime: "May 8, 2025 - 11:00 AM",
    trainer: "Alex Johnson",
    completed: true
  },
  {
    id: 202,
    type: "Group Yoga",
    dateTime: "May 5, 2025 - 9:00 AM",
    trainer: "Sarah Chen",
    completed: true
  },
  {
    id: 203,
    type: "Personal Training",
    dateTime: "May 1, 2025 - 10:30 AM",
    trainer: "Alex Johnson",
    completed: true
  }
];

/**
 * MyWorkoutsSection Component
 * 
 * Displays client workout plans, upcoming sessions, and workout history.
 */
const MyWorkoutsSection: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleWorkoutExpand = (workoutId: number) => {
    if (expandedWorkout === workoutId) {
      setExpandedWorkout(null);
    } else {
      setExpandedWorkout(workoutId);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FitnessCenterIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">My Workouts</Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="My Plans" icon={<BookmarkIcon />} iconPosition="start" />
          <Tab label="Upcoming" icon={<CalendarTodayIcon />} iconPosition="start" />
          <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* My Plans Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {workoutPlans.map(workout => (
            <Grid item xs={12} md={6} key={workout.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6">{workout.name}</Typography>
                    <Chip 
                      label={workout.type} 
                      color={
                        workout.type === "Strength" ? "primary" : 
                        workout.type === "Cardio" ? "error" : 
                        "secondary"
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                    <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">{workout.duration} minutes</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workout.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={workout.progress} 
                    sx={{ my: 1 }}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Last completed: {workout.lastCompleted}
                    </Typography>
                  </Box>
                  
                  {expandedWorkout === workout.id && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Exercises:
                      </Typography>
                      <List dense disablePadding>
                        {workout.exercises.map((exercise, index) => (
                          <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <DoneIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={exercise.name} 
                              secondary={`${exercise.sets} sets x ${exercise.reps}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button 
                    size="small" 
                    startIcon={<ExpandMoreIcon 
                      sx={{ 
                        transform: expandedWorkout === workout.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s'
                      }} 
                    />}
                    onClick={() => toggleWorkoutExpand(workout.id)}
                  >
                    {expandedWorkout === workout.id ? 'Hide' : 'Details'}
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                  >
                    Start Workout
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upcoming Sessions Tab */}
      {tabValue === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Upcoming Sessions</Typography>
            <Button variant="outlined" startIcon={<CalendarTodayIcon />}>
              Book New Session
            </Button>
          </Box>

          {upcomingSessions.length > 0 ? (
            <Grid container spacing={3}>
              {upcomingSessions.map(session => (
                <Grid item xs={12} md={6} key={session.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{session.type}</Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {session.dateTime}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Trainer:</strong> {session.trainer}
                      </Typography>
                      
                      <Typography variant="body2">
                        <strong>Focus:</strong> {session.focus}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="error">
                        Cancel
                      </Button>
                      <Button size="small" color="primary">
                        Reschedule
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                You don't have any upcoming sessions
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                startIcon={<CalendarTodayIcon />}
              >
                Book a Session
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* History Tab */}
      {tabValue === 2 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Session History</Typography>
          
          {pastSessions.map(session => (
            <Paper 
              key={session.id} 
              sx={{ p: 2, mb: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">{session.type}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {session.dateTime}
                  </Typography>
                  <Typography variant="body2">
                    Trainer: {session.trainer}
                  </Typography>
                </Box>
                <Chip 
                  icon={<DoneIcon />} 
                  label="Completed" 
                  color="success"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Paper>
          ))}
        </>
      )}
    </Box>
  );
};

export default MyWorkoutsSection;