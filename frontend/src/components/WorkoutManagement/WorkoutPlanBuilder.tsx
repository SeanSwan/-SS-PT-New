import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  DatePicker,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  AutoAwesome as GenerateIcon,
  Person as ClientIcon,
  FitnessCenter as ExerciseIcon,
  Schedule as ScheduleIcon,
  Flag as GoalIcon
} from '@mui/icons-material';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  useWorkoutMcp, 
  WorkoutPlan, 
  WorkoutPlanDay, 
  WorkoutPlanDayExercise, 
  Exercise 
} from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';

interface WorkoutPlanBuilderProps {
  clientId?: string;
  onPlanCreated?: (plan: WorkoutPlan) => void;
  existingPlan?: WorkoutPlan;
  mode?: 'create' | 'edit';
}

const WorkoutPlanBuilder: React.FC<WorkoutPlanBuilderProps> = ({
  clientId,
  onPlanCreated,
  existingPlan,
  mode = 'create'
}) => {
  const { generateWorkoutPlan, loading, error } = useWorkoutMcp();
  const [activeStep, setActiveStep] = useState(0);
  const [plan, setPlan] = useState<WorkoutPlan>({
    name: '',
    description: '',
    trainerId: '', // Will be set from user context
    clientId: clientId || '',
    goal: 'general',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 weeks from now
    status: 'active',
    days: []
  });
  
  const [workoutDays, setWorkoutDays] = useState<WorkoutPlanDay[]>([]);
  const [currentDay, setCurrentDay] = useState<WorkoutPlanDay | null>(null);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [generationParams, setGenerationParams] = useState({
    daysPerWeek: 3,
    focusAreas: [] as string[],
    difficulty: 'intermediate',
    equipment: [] as string[]
  });

  // Mock clients for demo
  const mockClients = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
  ];

  const steps = [
    'Plan Details',
    'Training Schedule',
    'Exercise Selection',
    'Review & Save'
  ];

  const muscleGroups = [
    'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Calves'
  ];

  const equipmentOptions = [
    'Bodyweight', 'Dumbbells', 'Barbell', 'Machines', 'Resistance Bands', 
    'Kettlebells', 'Medicine Ball', 'Cable Machine'
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const goals = [
    { value: 'general', label: 'General Fitness' },
    { value: 'strength', label: 'Strength Building' },
    { value: 'hypertrophy', label: 'Muscle Building' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'rehabilitation', label: 'Rehabilitation' }
  ];

  // Initialize with existing plan if in edit mode
  useEffect(() => {
    if (existingPlan && mode === 'edit') {
      setPlan(existingPlan);
      setWorkoutDays(existingPlan.days || []);
    }
  }, [existingPlan, mode]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePlanDetailChange = (field: keyof WorkoutPlan, value: any) => {
    setPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateWorkout = async () => {
    try {
      const response = await generateWorkoutPlan({
        trainerId: 'current-trainer', // Should come from auth context
        clientId: plan.clientId,
        name: plan.name,
        description: plan.description,
        goal: plan.goal,
        startDate: plan.startDate,
        endDate: plan.endDate,
        daysPerWeek: generationParams.daysPerWeek,
        focusAreas: generationParams.focusAreas,
        difficulty: generationParams.difficulty,
        equipment: generationParams.equipment
      });

      if (response?.plan) {
        setPlan(response.plan);
        setWorkoutDays(response.plan.days || []);
        setActiveStep(2); // Move to exercise selection step
      }
    } catch (err) {
      console.error('Failed to generate workout plan:', err);
    }
  };

  const addWorkoutDay = () => {
    const newDay: WorkoutPlanDay = {
      dayNumber: workoutDays.length + 1,
      name: `Day ${workoutDays.length + 1}`,
      focus: 'full_body',
      dayType: 'training',
      sortOrder: workoutDays.length + 1,
      exercises: []
    };
    setWorkoutDays([...workoutDays, newDay]);
  };

  const updateWorkoutDay = (dayIndex: number, updatedDay: WorkoutPlanDay) => {
    const newDays = [...workoutDays];
    newDays[dayIndex] = updatedDay;
    setWorkoutDays(newDays);
  };

  const deleteWorkoutDay = (dayIndex: number) => {
    const newDays = workoutDays.filter((_, index) => index !== dayIndex);
    // Renumber the days
    const renumberedDays = newDays.map((day, index) => ({
      ...day,
      dayNumber: index + 1,
      sortOrder: index + 1
    }));
    setWorkoutDays(renumberedDays);
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newDays = [...workoutDays];
    const exerciseToAdd: WorkoutPlanDayExercise = {
      exerciseId: exercise.id,
      orderInWorkout: (newDays[dayIndex].exercises?.length || 0) + 1,
      setScheme: '3x10',
      repGoal: '10',
      restPeriod: 60,
      notes: exercise.description
    };
    
    if (!newDays[dayIndex].exercises) {
      newDays[dayIndex].exercises = [];
    }
    newDays[dayIndex].exercises!.push(exerciseToAdd);
    setWorkoutDays(newDays);
  };

  const removeExerciseFromDay = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...workoutDays];
    newDays[dayIndex].exercises?.splice(exerciseIndex, 1);
    // Renumber exercises
    if (newDays[dayIndex].exercises) {
      newDays[dayIndex].exercises = newDays[dayIndex].exercises!.map((ex, idx) => ({
        ...ex,
        orderInWorkout: idx + 1
      }));
    }
    setWorkoutDays(newDays);
  };

  const savePlan = async () => {
    const finalPlan = {
      ...plan,
      days: workoutDays
    };

    // In a real implementation, this would save to the backend
    console.log('Saving workout plan:', finalPlan);
    
    if (onPlanCreated) {
      onPlanCreated(finalPlan);
    }
    
    // Reset form
    setPlan({
      name: '',
      description: '',
      trainerId: '',
      clientId: clientId || '',
      goal: 'general',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      days: []
    });
    setWorkoutDays([]);
    setActiveStep(0);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Plan Name"
                  value={plan.name}
                  onChange={(e) => handlePlanDetailChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Goal</InputLabel>
                  <Select
                    value={plan.goal}
                    label="Goal"
                    onChange={(e) => handlePlanDetailChange('goal', e.target.value)}
                  >
                    {goals.map((goal) => (
                      <MenuItem key={goal.value} value={goal.value}>
                        {goal.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={plan.description}
                  onChange={(e) => handlePlanDetailChange('description', e.target.value)}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <MuiDatePicker
                    label="Start Date"
                    value={new Date(plan.startDate!)}
                    onChange={(date) => {
                      if (date) {
                        handlePlanDetailChange('startDate', date.toISOString().split('T')[0]);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <MuiDatePicker
                    label="End Date"
                    value={new Date(plan.endDate!)}
                    onChange={(date) => {
                      if (date) {
                        handlePlanDetailChange('endDate', date.toISOString().split('T')[0]);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              {!clientId && (
                <Grid item xs={12}>
                  <Autocomplete
                    options={mockClients}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={mockClients.find(c => c.id === plan.clientId) || null}
                    onChange={(_, value) => handlePlanDetailChange('clientId', value?.id || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Assign to Client" fullWidth />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Training Schedule Setup
            </Typography>
            
            {/* Auto-Generation Options */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Auto-Generate Workout Plan
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Days per Week</InputLabel>
                      <Select
                        value={generationParams.daysPerWeek}
                        label="Days per Week"
                        onChange={(e) => setGenerationParams({
                          ...generationParams,
                          daysPerWeek: Number(e.target.value)
                        })}
                      >
                        <MenuItem value={1}>1 Day</MenuItem>
                        <MenuItem value={2}>2 Days</MenuItem>
                        <MenuItem value={3}>3 Days</MenuItem>
                        <MenuItem value={4}>4 Days</MenuItem>
                        <MenuItem value={5}>5 Days</MenuItem>
                        <MenuItem value={6}>6 Days</MenuItem>
                        <MenuItem value={7}>7 Days</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Difficulty</InputLabel>
                      <Select
                        value={generationParams.difficulty}
                        label="Difficulty"
                        onChange={(e) => setGenerationParams({
                          ...generationParams,
                          difficulty: e.target.value
                        })}
                      >
                        {difficulties.map((diff) => (
                          <MenuItem key={diff.value} value={diff.value}>
                            {diff.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      multiple
                      options={muscleGroups}
                      value={generationParams.focusAreas}
                      onChange={(_, value) => setGenerationParams({
                        ...generationParams,
                        focusAreas: value
                      })}
                      renderInput={(params) => (
                        <TextField {...params} label="Focus Areas" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={option}
                            {...getTagProps({ index })}
                            key={option}
                          />
                        ))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={equipmentOptions}
                      value={generationParams.equipment}
                      onChange={(_, value) => setGenerationParams({
                        ...generationParams,
                        equipment: value
                      })}
                      renderInput={(params) => (
                        <TextField {...params} label="Available Equipment" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={option}
                            {...getTagProps({ index })}
                            key={option}
                          />
                        ))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<GenerateIcon />}
                      onClick={handleGenerateWorkout}
                      disabled={loading}
                      fullWidth
                    >
                      Generate Workout Plan
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Divider sx={{ my: 3 }} />

            {/* Manual Day Creation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Workout Days ({workoutDays.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addWorkoutDay}
              >
                Add Day
              </Button>
            </Box>

            {workoutDays.map((day, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {day.name}
                    </Typography>
                    <Box>
                      <IconButton
                        onClick={() => {
                          setCurrentDay(day);
                          setExerciseLibraryOpen(true);
                        }}
                      >
                        <ExerciseIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteWorkoutDay(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Day Name"
                        value={day.name}
                        onChange={(e) => {
                          const updatedDay = { ...day, name: e.target.value };
                          updateWorkoutDay(index, updatedDay);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Focus</InputLabel>
                        <Select
                          value={day.focus || 'full_body'}
                          label="Focus"
                          onChange={(e) => {
                            const updatedDay = { ...day, focus: e.target.value };
                            updateWorkoutDay(index, updatedDay);
                          }}
                        >
                          <MenuItem value="full_body">Full Body</MenuItem>
                          <MenuItem value="upper_body">Upper Body</MenuItem>
                          <MenuItem value="lower_body">Lower Body</MenuItem>
                          <MenuItem value="push">Push</MenuItem>
                          <MenuItem value="pull">Pull</MenuItem>
                          <MenuItem value="legs">Legs</MenuItem>
                          <MenuItem value="cardio">Cardio</MenuItem>
                          <MenuItem value="core">Core</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Estimated Duration (min)"
                        type="number"
                        value={day.estimatedDuration || ''}
                        onChange={(e) => {
                          const updatedDay = { 
                            ...day, 
                            estimatedDuration: Number(e.target.value) 
                          };
                          updateWorkoutDay(index, updatedDay);
                        }}
                      />
                    </Grid>
                  </Grid>

                  {day.exercises && day.exercises.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Exercises ({day.exercises.length})
                      </Typography>
                      <List dense>
                        {day.exercises.map((exercise, exIndex) => (
                          <ListItem key={exIndex}>
                            <ListItemText
                              primary={`Exercise ${exercise.orderInWorkout}`}
                              secondary={`${exercise.setScheme} - ${exercise.repGoal} reps`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                onClick={() => removeExerciseFromDay(index, exIndex)}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Exercise Selection & Customization
            </Typography>
            
            {workoutDays.map((day, dayIndex) => (
              <Accordion key={dayIndex} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {day.name} - {day.exercises?.length || 0} exercises
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setCurrentDay(day);
                      setExerciseLibraryOpen(true);
                    }}
                    sx={{ mb: 2 }}
                  >
                    Add Exercise
                  </Button>

                  {day.exercises && day.exercises.length > 0 && (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Order</TableCell>
                            <TableCell>Exercise</TableCell>
                            <TableCell>Sets x Reps</TableCell>
                            <TableCell>Rest (sec)</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {day.exercises.map((exercise, exIndex) => (
                            <TableRow key={exIndex}>
                              <TableCell>{exercise.orderInWorkout}</TableCell>
                              <TableCell>{exercise.exerciseId}</TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={exercise.setScheme || ''}
                                  onChange={(e) => {
                                    const newDays = [...workoutDays];
                                    newDays[dayIndex].exercises![exIndex].setScheme = e.target.value;
                                    setWorkoutDays(newDays);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={exercise.restPeriod || ''}
                                  onChange={(e) => {
                                    const newDays = [...workoutDays];
                                    newDays[dayIndex].exercises![exIndex].restPeriod = Number(e.target.value);
                                    setWorkoutDays(newDays);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  value={exercise.notes || ''}
                                  onChange={(e) => {
                                    const newDays = [...workoutDays];
                                    newDays[dayIndex].exercises![exIndex].notes = e.target.value;
                                    setWorkoutDays(newDays);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review & Save Plan
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {plan.description}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <GoalIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">Goal</Typography>
                      <Typography variant="body2">
                        {goals.find(g => g.value === plan.goal)?.label}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">Duration</Typography>
                      <Typography variant="body2">
                        {Math.ceil((new Date(plan.endDate!).getTime() - new Date(plan.startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ExerciseIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">Days per Week</Typography>
                      <Typography variant="body2">
                        {workoutDays.length} days
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ClientIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">Client</Typography>
                      <Typography variant="body2">
                        {mockClients.find(c => c.id === plan.clientId)?.name || 'Not assigned'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {workoutDays.map((day, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {day.name} - {day.exercises?.length || 0} exercises
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {day.exercises?.map((exercise, exIndex) => (
                      <ListItem key={exIndex}>
                        <ListItemText
                          primary={`Exercise ${exercise.orderInWorkout}: ${exercise.exerciseId}`}
                          secondary={`${exercise.setScheme} - Rest: ${exercise.restPeriod}s - ${exercise.notes}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mode === 'edit' ? 'Edit' : 'Create'} Workout Plan
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={savePlan}
                startIcon={<SaveIcon />}
                disabled={loading}
              >
                {mode === 'edit' ? 'Update Plan' : 'Save Plan'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!plan.name || !plan.clientId}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Exercise Library Dialog */}
      <Dialog
        open={exerciseLibraryOpen}
        onClose={() => setExerciseLibraryOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Select Exercise for {currentDay?.name}</DialogTitle>
        <DialogContent>
          <ExerciseLibrary
            onExerciseSelect={(exercise) => {
              if (currentDay) {
                const dayIndex = workoutDays.findIndex(d => d.dayNumber === currentDay.dayNumber);
                if (dayIndex !== -1) {
                  addExerciseToDay(dayIndex, exercise);
                  setExerciseLibraryOpen(false);
                }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseLibraryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkoutPlanBuilder;