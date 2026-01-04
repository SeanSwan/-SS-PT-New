import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Stack,
  IconButton,
  Grid,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';

// Mock interfaces based on blueprint
interface Client { id: string; name: string; }
interface Exercise { id: string; name: string; }
interface SetEntry { setNumber: number; reps: number; weight: number; rpe: number; formQualityScore: number; }
interface RecentWorkout {
  id: string;
  sessionDate: string;
  duration: number;
  exerciseCount: number;
  totalVolume?: number;
}
interface WorkoutExerciseEntry { exerciseId: string; exerciseName: string; sets: SetEntry[]; notes: string; }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const WorkoutDataEntry: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [exercisesLibrary, setExercisesLibrary] = useState<Exercise[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    // Fetch clients and exercises library
    const fetchData = async () => {
      try {
        // These endpoints are assumed based on the blueprint
        const clientsRes = await apiService.get('/api/admin/clients');
        // The /api/admin/clients endpoint returns {id, name, credits}, which is perfect.
        setClients(clientsRes.data);
        
        // Assuming an /api/exercises endpoint exists as per blueprint
        const exercisesRes = await apiService.get('/api/exercises'); 
        setExercisesLibrary(exercisesRes.data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load initial data.', variant: 'destructive' });
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (selectedClient) {
      const fetchRecentWorkouts = async () => {
        setLoadingRecent(true);
        try {
          // Endpoint from blueprint: GET /api/workout-sessions/:userId
          const response = await apiService.get(`/api/workout-sessions/${selectedClient.id}?limit=3`);
          if (response.data?.workouts) {
            setRecentWorkouts(response.data.workouts);
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to load recent workouts.', variant: 'destructive' });
        } finally {
          setLoadingRecent(false);
        }
      };
      fetchRecentWorkouts();
    } else {
      setRecentWorkouts([]); // Clear when no client is selected
    }
  }, [selectedClient, toast]);

  const addExercise = (exercise: Exercise | null) => {
    if (!exercise) return;
    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [{ setNumber: 1, reps: 8, weight: 135, rpe: 7, formQualityScore: 8 }],
        notes: '',
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...workoutExercises];
    const lastSet = newExercises[exerciseIndex].sets.slice(-1)[0];
    newExercises[exerciseIndex].sets.push({
      setNumber: newExercises[exerciseIndex].sets.length + 1,
      reps: lastSet?.reps || 8,
      weight: lastSet?.weight || 135,
      rpe: lastSet?.rpe || 7,
      formQualityScore: lastSet?.formQualityScore || 8,
    });
    setWorkoutExercises(newExercises);
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number) => {
    const newExercises = [...workoutExercises];
    (newExercises[exerciseIndex].sets[setIndex] as any)[field] = value;
    setWorkoutExercises(newExercises);
  };

  const handleSaveWorkout = async () => {
    if (!selectedClient || workoutExercises.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select a client and add at least one exercise.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        userId: selectedClient.id,
        sessionDate: workoutDate,
        exercises: workoutExercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          orderInWorkout: index + 1,
          notes: ex.notes,
          sets: ex.sets,
        })),
        // ... other fields like duration, intensity
      };
      await apiService.post('/api/workout/sessions', payload);
      toast({ title: 'Success', description: 'Workout saved successfully!' });
      // Reset form
      setSelectedClient(null);
      setWorkoutExercises([]);
    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save workout.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible" p={{ xs: 2, md: 4 }}>
      <Paper component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          🏋️ Workout Data Entry
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Client</InputLabel>
              <Select
                value={selectedClient?.id || ''}
                label="Select Client"
                onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
              >
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Workout Date"
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <AnimatePresence>
        {selectedClient && (
          <Paper component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.light' }}>
              Recent Workouts for {selectedClient.name}
            </Typography>
            {loadingRecent ? (
              <Typography>Loading recent workouts...</Typography>
            ) : recentWorkouts.length > 0 ? (
              <List dense>
                {recentWorkouts.map((workout) => (
                  <ListItem key={workout.id} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                    <ListItemText
                      primary={`${new Date(workout.sessionDate).toLocaleDateString()} - ${workout.duration} min`}
                      secondary={`${workout.exerciseCount || 0} exercises, ${workout.totalVolume || 0} lbs total volume`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No recent workouts found for this client.</Typography>
            )}
          </Paper>
        )}
      </AnimatePresence>

      <Paper component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}>
        <Autocomplete
          options={exercisesLibrary}
          getOptionLabel={(option) => option.name}
          onChange={(_, value) => addExercise(value)}
          renderInput={(params) => <TextField {...params} label="Add Exercise" />}
        />
      </Paper>

      <Stack spacing={3} component={motion.div} variants={containerVariants}>
        {workoutExercises.map((ex, exIndex) => (
          <Paper key={exIndex} component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, background: 'rgba(30, 41, 59, 0.4)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">{ex.exerciseName}</Typography>
              <IconButton onClick={() => removeExercise(exIndex)} color="error"><Trash2 /></IconButton>
            </Stack>
            <Stack spacing={2}>
              {ex.sets.map((set, setIndex) => (
                <Grid container spacing={{ xs: 1, md: 2 }} key={setIndex} alignItems="center">
                  <Grid item xs={12} sm="auto"><Typography>Set {set.setNumber}</Typography></Grid>
                  <Grid item xs={6} sm><TextField label="Weight" type="number" size="small" value={set.weight} onChange={e => handleSetChange(exIndex, setIndex, 'weight', +e.target.value)} /></Grid>
                  <Grid item xs={6} sm><TextField label="Reps" type="number" size="small" value={set.reps} onChange={e => handleSetChange(exIndex, setIndex, 'reps', +e.target.value)} /></Grid>
                  <Grid item xs={6} sm><TextField label="RPE" type="number" size="small" value={set.rpe} onChange={e => handleSetChange(exIndex, setIndex, 'rpe', +e.target.value)} /></Grid>
                  <Grid item xs={6} sm><TextField label="Form" type="number" size="small" value={set.formQualityScore} onChange={e => handleSetChange(exIndex, setIndex, 'formQualityScore', +e.target.value)} /></Grid>
                </Grid>
              ))}
            </Stack>
            <Button startIcon={<Plus />} onClick={() => addSet(exIndex)} sx={{ mt: 2 }}>Add Set</Button>
          </Paper>
        ))}
      </Stack>

      {workoutExercises.length > 0 && (
        <Box mt={4} textAlign="right" component={motion.div} variants={itemVariants}>
          <GlowButton
            text="Save Workout"
            theme="emerald"
            leftIcon={<Save />}
            onClick={handleSaveWorkout}
            isLoading={isSaving}
          />
        </Box>
      )}
    </Box>
  );
};

export default WorkoutDataEntry;