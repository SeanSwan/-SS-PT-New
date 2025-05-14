import React, { useState, useEffect } from 'react';
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
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

// Icons
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import TimerIcon from '@mui/icons-material/Timer';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';

import { useAuth } from '../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, WorkoutSession, Exercise, WorkoutStatistics } from '../../hooks/useWorkoutMcp';

interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed: boolean;
}

interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  notes?: string;
  completed: boolean;
}

/**
 * Enhanced MyWorkoutsSection Component with MCP Integration
 * 
 * Provides comprehensive workout tracking and management for clients
 * Integrates with the Workout MCP server for real-time data synchronization
 */
const EnhancedMyWorkoutsSection: React.FC = () => {
  const { user } = useAuth();
  const { 
    getClientProgress, 
    getWorkoutStatistics, 
    logWorkoutSession,
    getWorkoutRecommendations,
    loading, 
    error 
  } = useWorkoutMcp();

  const [tabValue, setTabValue] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStatistics | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [restTimerRunning, setRestTimerRunning] = useState(false);

  // Mock data for demo
  const mockWorkoutPlan: WorkoutPlan = {
    id: 'plan-1',
    name: 'Full Body Strength Training',
    description: 'Comprehensive strength training program',
    trainerId: 'trainer-1',
    clientId: user?.id || '',
    goal: 'strength',
    startDate: '2024-03-01',
    endDate: '2024-05-01',
    status: 'active',
    days: [
      {
        dayNumber: 1,
        name: 'Upper Body Focus',
        focus: 'upper_body',
        dayType: 'training',
        estimatedDuration: 45,
        sortOrder: 1,
        exercises: [
          {
            exerciseId: 'ex-1',
            orderInWorkout: 1,
            setScheme: '3x8-10',
            repGoal: '8-10',
            restPeriod: 90,
            notes: 'Focus on controlled movement'
          },
          {
            exerciseId: 'ex-2',
            orderInWorkout: 2,
            setScheme: '3x12',
            repGoal: '12',
            restPeriod: 60,
            notes: 'Keep core engaged'
          }
        ]
      }
    ]
  };

  const mockExercises: Exercise[] = [
    {
      id: 'ex-1',
      name: 'Push-ups',
      description: 'Classic chest and tricep exercise',
      category: 'strength',
      difficulty: 'beginner'
    },
    {
      id: 'ex-2',
      name: 'Squats',
      description: 'Fundamental leg exercise',
      category: 'strength',
      difficulty: 'beginner'
    }
  ];

  // Initialize data on component mount
  useEffect(() => {
    if (user?.id) {
      loadWorkoutData();
    }
  }, [user?.id]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive]);

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimerRunning && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setRestTimerRunning(false);
            // Play notification sound or show alert
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimerRunning, restTimer]);

  const loadWorkoutData = async () => {
    try {
      // Set mock data for demonstration
      setCurrentPlan(mockWorkoutPlan);
      
      // Try to load real data from MCP if available
      if (user?.id) {
        const statsResponse = await getWorkoutStatistics({
          userId: user.id,
          includeExerciseBreakdown: true,
          includeMuscleGroupBreakdown: true
        });
        
        if (statsResponse?.statistics) {
          setWorkoutStats(statsResponse.statistics);
        }
      }
    } catch (err) {
      console.error('Failed to load workout data:', err);
    }
  };

  const startWorkout = async (day: any) => {
    const newWorkout: WorkoutSession = {
      id: `workout-${Date.now()}`,
      userId: user?.id || '',
      workoutPlanId: currentPlan?.id,
      title: day.name,
      description: `${currentPlan?.name} - ${day.name}`,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      exercises: day.exercises.map((ex: any, index: number) => ({
        id: `we-${index}`,
        exerciseId: ex.exerciseId,
        orderInWorkout: ex.orderInWorkout,
        sets: [],
        exercise: mockExercises.find(e => e.id === ex.exerciseId)
      }))
    };

    // Initialize exercise logs
    const logs: ExerciseLog[] = day.exercises.map((ex: any) => {
      const exercise = mockExercises.find(e => e.id === ex.exerciseId);
      const setCount = parseInt(ex.setScheme.split('x')[0]) || 3;
      
      return {
        exerciseId: ex.exerciseId,
        exerciseName: exercise?.name || 'Unknown Exercise',
        sets: Array(setCount).fill(null).map((_, i) => ({
          setNumber: i + 1,
          reps: 0,
          weight: 0,
          completed: false
        })),
        completed: false
      };
    });

    setActiveWorkout(newWorkout);
    setExerciseLogs(logs);
    setIsWorkoutActive(true);
    setWorkoutTimer(0);
    setWorkoutDialogOpen(true);
  };

  const completeSet = (exerciseIndex: number, setIndex: number, reps: number, weight: number, rpe?: number) => {
    const newLogs = [...exerciseLogs];
    newLogs[exerciseIndex].sets[setIndex] = {
      ...newLogs[exerciseIndex].sets[setIndex],
      reps,
      weight,
      rpe,
      completed: true
    };

    // Check if all sets for this exercise are completed
    const allSetsCompleted = newLogs[exerciseIndex].sets.every(set => set.completed);
    if (allSetsCompleted) {
      newLogs[exerciseIndex].completed = true;
    }

    setExerciseLogs(newLogs);
  };

  const startRestTimer = (duration: number) => {
    setRestTimer(duration);
    setRestTimerRunning(true);
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;

    try {
      const completedWorkout: WorkoutSession = {
        ...activeWorkout,
        completedAt: new Date().toISOString(),
        status: 'completed',
        duration: workoutTimer,
        exercises: activeWorkout.exercises?.map((ex, index) => ({
          ...ex,
          sets: exerciseLogs[index]?.sets.map(set => ({
            setNumber: set.setNumber,
            setType: 'working',
            repsCompleted: set.reps,
            weightUsed: set.weight,
            rpe: set.rpe
          })) || [],
          completedAt: new Date().toISOString()
        }))
      };

      // Log workout session via MCP
      const response = await logWorkoutSession(completedWorkout);
      
      if (response) {
        setWorkoutHistory(prev => [completedWorkout, ...prev]);
        setActiveWorkout(null);
        setExerciseLogs([]);
        setIsWorkoutActive(false);
        setWorkoutDialogOpen(false);
        setWorkoutTimer(0);
        
        // Reload workout data to update statistics
        loadWorkoutData();
      }
    } catch (err) {
      console.error('Failed to save workout:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderWorkoutPlans = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Current Workout Plan</Typography>
        <IconButton onClick={loadWorkoutData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {currentPlan ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {currentPlan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {currentPlan.description}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <AssignmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                  <Typography variant="caption" display="block">
                    Goal
                  </Typography>
                  <Typography variant="body2">
                    {currentPlan.goal?.replace('_', ' ').toLowerCase()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <CalendarTodayIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                  <Typography variant="caption" display="block">
                    Duration
                  </Typography>
                  <Typography variant="body2">
                    {Math.ceil((new Date(currentPlan.endDate!).getTime() - new Date(currentPlan.startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <FitnessCenterIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                  <Typography variant="caption" display="block">
                    Days
                  </Typography>
                  <Typography variant="body2">
                    {currentPlan.days?.length || 0} per week
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={currentPlan.status}
                    color="success"
                    icon={<CheckCircleIcon />}
                  />
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Workout Days */}
            <Typography variant="h6" gutterBottom>
              Workout Days
            </Typography>
            {currentPlan.days?.map((day, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography variant="subtitle1">{day.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                      <Chip size="small" label={day.focus?.replace('_', ' ') || 'General'} />
                      <Chip size="small" label={`${day.estimatedDuration}min`} icon={<AccessTimeIcon />} />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {day.exercises?.map((ex, exIndex) => {
                      const exercise = mockExercises.find(e => e.id === ex.exerciseId);
                      return (
                        <ListItem key={exIndex}>
                          <ListItemIcon>
                            <FitnessCenterIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={exercise?.name || 'Unknown Exercise'}
                            secondary={`${ex.setScheme} - Rest: ${ex.restPeriod}s`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => startWorkout(day)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Start Workout
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Active Workout Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact your trainer to get a personalized workout plan assigned.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderWorkoutHistory = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Workout History
      </Typography>
      
      {workoutStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main">
                  {workoutStats.totalWorkouts}
                </Typography>
                <Typography variant="caption">
                  Total Workouts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="secondary.main">
                  {Math.round(workoutStats.totalDuration / 60)}h
                </Typography>
                <Typography variant="caption">
                  Total Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="success.main">
                  {workoutStats.totalSets}
                </Typography>
                <Typography variant="caption">
                  Total Sets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="info.main">
                  {workoutStats.totalReps}
                </Typography>
                <Typography variant="caption">
                  Total Reps
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {workoutHistory.length > 0 ? (
        workoutHistory.map((workout) => (
          <Card key={workout.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6">{workout.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(workout.completedAt!).toLocaleDateString()}
                  </Typography>
                </Box>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Completed"
                  color="success"
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`${Math.round((workout.duration || 0) / 60)}min`}
                  size="small"
                />
                <Chip
                  icon={<FitnessCenterIcon />}
                  label={`${workout.exercises?.length || 0} exercises`}
                  size="small"
                />
                {workout.intensityRating && (
                  <Chip
                    icon={<TrendingUpIcon />}
                    label={`Intensity: ${workout.intensityRating}/10`}
                    size="small"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        ))
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Workout History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete your first workout to see your history here.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FitnessCenterIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">My Workouts</Typography>
        {isWorkoutActive && (
          <Badge
            color="warning"
            variant="dot"
            sx={{ ml: 2 }}
          >
            <Chip
              icon={<PlayArrowIcon />}
              label={`Active: ${formatTime(workoutTimer)}`}
              color="warning"
              onClick={() => setWorkoutDialogOpen(true)}
            />
          </Badge>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(event, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Current Plan" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Progress" icon={<TrendingUpIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tabValue === 0 && renderWorkoutPlans()}
      {tabValue === 1 && renderWorkoutHistory()}
      {tabValue === 2 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Progress Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Detailed progress analytics coming soon.
          </Typography>
        </Box>
      )}

      {/* Active Workout Dialog */}
      <Dialog
        open={workoutDialogOpen}
        onClose={() => {}}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {activeWorkout?.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                icon={<TimerIcon />}
                label={formatTime(workoutTimer)}
                color="primary"
              />
              {restTimerRunning && (
                <Chip
                  icon={<PauseIcon />}
                  label={`Rest: ${formatTime(restTimer)}`}
                  color="warning"
                />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Stepper orientation="vertical">
            {exerciseLogs.map((exerciseLog, exerciseIndex) => (
              <Step key={exerciseIndex} active={!exerciseLog.completed}>
                <StepLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      {exerciseLog.exerciseName}
                    </Typography>
                    {exerciseLog.completed && (
                      <CheckCircleIcon color="success" />
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    {exerciseLog.sets.map((set, setIndex) => (
                      <Grid item xs={12} key={setIndex}>
                        <Paper sx={{ p: 2, bgcolor: set.completed ? 'success.light' : 'background.paper' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Set {set.setNumber}
                          </Typography>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={3}>
                              <TextField
                                label="Reps"
                                type="number"
                                value={set.reps}
                                onChange={(e) => {
                                  const newLogs = [...exerciseLogs];
                                  newLogs[exerciseIndex].sets[setIndex].reps = Number(e.target.value);
                                  setExerciseLogs(newLogs);
                                }}
                                size="small"
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={3}>
                              <TextField
                                label="Weight"
                                type="number"
                                value={set.weight}
                                onChange={(e) => {
                                  const newLogs = [...exerciseLogs];
                                  newLogs[exerciseIndex].sets[setIndex].weight = Number(e.target.value);
                                  setExerciseLogs(newLogs);
                                }}
                                size="small"
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={3}>
                              <Box>
                                <Typography variant="caption">RPE: {set.rpe || 0}</Typography>
                                <Slider
                                  value={set.rpe || 0}
                                  min={0}
                                  max={10}
                                  step={1}
                                  onChange={(_, value) => {
                                    const newLogs = [...exerciseLogs];
                                    newLogs[exerciseIndex].sets[setIndex].rpe = value as number;
                                    setExerciseLogs(newLogs);
                                  }}
                                  size="small"
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={3}>
                              <Button
                                variant={set.completed ? "outlined" : "contained"}
                                color={set.completed ? "success" : "primary"}
                                onClick={() => {
                                  if (!set.completed) {
                                    completeSet(exerciseIndex, setIndex, set.reps, set.weight, set.rpe);
                                    if (setIndex < exerciseLog.sets.length - 1) {
                                      startRestTimer(90); // Default 90s rest
                                    }
                                  }
                                }}
                                fullWidth
                              >
                                {set.completed ? 'Completed' : 'Complete'}
                              </Button>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <TextField
                    label="Exercise Notes"
                    multiline
                    rows={2}
                    value={exerciseLog.notes || ''}
                    onChange={(e) => {
                      const newLogs = [...exerciseLogs];
                      newLogs[exerciseIndex].notes = e.target.value;
                      setExerciseLogs(newLogs);
                    }}
                    fullWidth
                    sx={{ mt: 2 }}
                  />
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setIsWorkoutActive(false);
              setWorkoutDialogOpen(false);
              setActiveWorkout(null);
              setExerciseLogs([]);
            }}
            color="error"
          >
            Cancel Workout
          </Button>
          <Button
            onClick={finishWorkout}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={!exerciseLogs.every(ex => ex.completed)}
          >
            Finish Workout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedMyWorkoutsSection;