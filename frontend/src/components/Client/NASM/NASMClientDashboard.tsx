/**
 * NASM Client Dashboard - Personalized Training Experience
 *
 * Client-only NASM features:
 * 1. Current Phase Widget - Display current OPT phase & progress
 * 2. Today's Workout - View trainer-assigned NASM workout
 * 3. Corrective Homework Tracker - Complete daily CEx with gamification
 * 4. Session Logger - Log sets, reps, RPE, pain flags
 * 5. Progress Timeline - Visual progression through phases
 * 6. NASM Education Hub - Learn about current phase
 *
 * Access: Client tier only (user_tier = 'client')
 * Gamification:
 * - +10 XP per homework completion
 * - Streak bonuses (7d, 15d, 30d)
 * - "NASM-Trained Client" badge
 * - Compliance badges (70%, 85%, 95%)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  FitnessCenter as FitnessCenterIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  EmojiEvents as EmojiEventsIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';
import WorkoutLogger from '../../Workout/WorkoutLogger';

interface ClientPhaseData {
  current_phase: string;
  phase_start_date: string;
  phase_target_weeks: number;
  weeks_completed: number;
  ready_for_next_phase: boolean;
  trainer_notes: string;
  progression_criteria_met: {
    load_increased?: boolean;
    form_improved?: boolean;
    no_pain?: boolean;
  };
}

interface TodaysWorkout {
  id: string;
  template_name: string;
  opt_phase: string;
  target_duration_minutes: number;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps: string;
    tempo: string;
    rest_sec: number;
    notes: string;
    demo_video_url: string | null;
    sets_logged: number;
  }>;
  corrective_warmup_required: boolean;
}

interface CorrectiveHomework {
  id: string;
  protocol_type: string;
  inhibit_exercises: Array<{ exercise: string; duration_sec: number; notes: string }>;
  lengthen_exercises: Array<{ exercise: string; duration_sec: number; reps: number }>;
  activate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  integrate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  total_days_assigned: number;
  days_completed: number;
  compliance_rate: number;
  xp_earned: number;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
}

interface SetLog {
  set_num: number;
  reps: number;
  weight_lbs: number;
  tempo: string;
  rpe: number;
  completed: boolean;
}

const NASMClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Phase Data
  const [phaseData, setPhaseData] = useState<ClientPhaseData | null>(null);

  // Today's Workout
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkout | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setLogs, setSetLogs] = useState<{ [exerciseId: string]: SetLog[] }>({});

  // Corrective Homework
  const [homework, setHomework] = useState<CorrectiveHomework | null>(null);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);

  // Progress Timeline
  const [phaseHistory, setPhaseHistory] = useState<any[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'client') {
      window.location.href = '/dashboard/user';
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [phaseRes, workoutRes, homeworkRes, historyRes] = await Promise.all([
        api.get('/api/client/my-opt-phase'),
        api.get('/api/client/my-workout-today'),
        api.get('/api/client/corrective-homework'),
        api.get('/api/client/phase-history'),
      ]);

      setPhaseData(phaseRes.data);
      setTodaysWorkout(workoutRes.data);
      setHomework(homeworkRes.data);
      setPhaseHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleMessageTrainer = async () => {
    // @ts-ignore - Assuming assignedTrainerId exists on the user object from auth context
    const trainerId = user?.assignedTrainerId;
    if (!trainerId || isCreatingConversation) {
      alert('No trainer assigned or an action is already in progress.');
      return;
    }

    setIsCreatingConversation(true);
    try {
      const response = await api.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [trainerId],
      });
      const conversationId = response.data.id;
      if (conversationId) {
        navigate(`/messaging?conversation=${conversationId}`);
      } else {
        throw new Error("Conversation ID not returned from API.");
      }
    } catch (error) {
      console.error("Failed to start conversation with trainer", error);
      alert("Could not start a new conversation. Please try again later.");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // ========================================
  // PHASE WIDGET
  // ========================================
  const getPhaseInfo = (phase: string) => {
    const info: { [key: string]: { title: string; description: string; color: string; focusAreas: string[] } } = {
      phase_1_stabilization: {
        title: 'Phase 1: Stabilization Endurance',
        description: 'Building foundational strength, balance, and movement quality',
        color: '#1976d2',
        focusAreas: ['12-20 reps', '4/2/1 tempo', '50-70% intensity', 'Core stability', 'Balance training'],
      },
      phase_2_strength_endurance: {
        title: 'Phase 2: Strength Endurance',
        description: 'Combining strength and stabilization with supersets',
        color: '#9c27b0',
        focusAreas: ['8-12 reps', 'Supersets', '70-80% intensity', 'Muscular endurance', 'Multi-joint exercises'],
      },
      phase_3_hypertrophy: {
        title: 'Phase 3: Muscular Development',
        description: 'Building lean muscle mass and size',
        color: '#2e7d32',
        focusAreas: ['6-12 reps', '3-6 sets', '75-85% intensity', 'Muscle growth', 'Progressive overload'],
      },
      phase_4_maximal_strength: {
        title: 'Phase 4: Maximal Strength',
        description: 'Developing peak strength and power output',
        color: '#f57c00',
        focusAreas: ['1-5 reps', 'Heavy loads', '85-100% intensity', 'Long rest periods', 'Cluster sets'],
      },
      phase_5_power: {
        title: 'Phase 5: Power',
        description: 'Explosive training with contrast methods',
        color: '#d32f2f',
        focusAreas: ['Explosive movements', 'Contrast training', 'Plyometrics', 'Olympic lifts', 'Speed work'],
      },
    };
    return info[phase] || info.phase_1_stabilization;
  };

  const renderPhaseWidget = () => {
    if (!phaseData) return null;

    const phaseInfo = getPhaseInfo(phaseData.current_phase);
    const progressPercent = (phaseData.weeks_completed / phaseData.phase_target_weeks) * 100;

    return (
      <Card sx={{ background: `linear-gradient(135deg, ${phaseInfo.color} 0%, ${phaseInfo.color}DD 100%)`, color: 'white' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Your Current Phase
              </Typography>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {phaseInfo.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {phaseInfo.description}
              </Typography>
            </Box>
            {phaseData.ready_for_next_phase && (
              <Chip
                label="Ready to Advance!"
                icon={<CheckCircleIcon />}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
            )}
          </Stack>

          <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Week {phaseData.weeks_completed} of {phaseData.phase_target_weeks}</Typography>
              <Typography variant="body2" fontWeight="bold">
                {progressPercent.toFixed(0)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': { bgcolor: 'white' },
              }}
            />
          </Stack>

          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Phase Focus Areas
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {phaseInfo.focusAreas.map((area, idx) => (
                <Chip key={idx} label={area} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              ))}
            </Stack>
          </Box>

          {phaseData.trainer_notes && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Trainer Note:</strong> {phaseData.trainer_notes}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // ========================================
  // TODAY'S WORKOUT
  // ========================================
  const startWorkout = () => {
    if (!todaysWorkout) return;

    // Initialize set logs
    const initialLogs: { [exerciseId: string]: SetLog[] } = {};
    todaysWorkout.exercises.forEach((exercise) => {
      initialLogs[exercise.exercise_id] = Array.from({ length: exercise.sets }, (_, i) => ({
        set_num: i + 1,
        reps: 0,
        weight_lbs: 0,
        tempo: exercise.tempo,
        rpe: 5,
        completed: false,
      }));
    });
    setSetLogs(initialLogs);
    setCurrentExerciseIndex(0);
    setWorkoutDialogOpen(true);
  };

  const logSet = async (exerciseId: string, setNum: number, data: Partial<SetLog>) => {
    const updatedLogs = { ...setLogs };
    updatedLogs[exerciseId][setNum - 1] = {
      ...updatedLogs[exerciseId][setNum - 1],
      ...data,
      completed: true,
    };
    setSetLogs(updatedLogs);

    // Auto-save to backend
    await api.post('/api/client/log-set', {
      exercise_id: exerciseId,
      set_num: setNum,
      ...data,
    });
  };

  const renderTodaysWorkout = () => {
    if (!todaysWorkout) {
      return (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <FitnessCenterIcon color="disabled" sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="h6" color="text.secondary">
                  No Workout Assigned
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your trainer hasn't assigned a workout yet. Check back later!
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      );
    }

    const completedExercises = todaysWorkout.exercises.filter((ex) => ex.sets_logged === ex.sets).length;
    const totalExercises = todaysWorkout.exercises.length;
    const workoutProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    return (
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Today's Workout
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {todaysWorkout.template_name} • {todaysWorkout.target_duration_minutes} min
              </Typography>
            </Box>
            <Chip label={getPhaseInfo(todaysWorkout.opt_phase).title} color="primary" />
          </Stack>

          {todaysWorkout.corrective_warmup_required && homework && !homework.completed_today && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              Complete your corrective warmup first!
            </Alert>
          )}

          <LinearProgress variant="determinate" value={workoutProgress} sx={{ height: 8, borderRadius: 4, mb: 2 }} />

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {completedExercises} of {totalExercises} exercises completed
          </Typography>

          <List dense>
            {todaysWorkout.exercises.slice(0, 3).map((exercise, idx) => (
              <ListItem key={exercise.exercise_id}>
                <ListItemIcon>
                  {exercise.sets_logged === exercise.sets ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={exercise.exercise_name}
                  secondary={`${exercise.sets} × ${exercise.reps} • ${exercise.tempo} tempo`}
                />
              </ListItem>
            ))}
            {todaysWorkout.exercises.length > 3 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                +{todaysWorkout.exercises.length - 3} more exercises
              </Typography>
            )}
          </List>

          <Button variant="contained" fullWidth startIcon={<PlayArrowIcon />} onClick={startWorkout} sx={{ mt: 2 }}>
            {workoutProgress > 0 ? 'Continue Workout' : 'Start Workout'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // ========================================
  // CORRECTIVE HOMEWORK TRACKER
  // ========================================
  const completeHomework = async () => {
    if (!homework) return;

    await api.post('/api/client/corrective-homework/complete', {
      protocol_id: homework.id,
      completion_date: new Date().toISOString(),
    });

    setHomeworkDialogOpen(false);
    loadDashboardData();
  };

  const renderHomeworkTracker = () => {
    if (!homework) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Corrective Homework
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No active corrective protocol. Your trainer will assign one if needed.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card sx={{ border: homework.completed_today ? '2px solid green' : '2px solid orange' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Daily Homework
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {homework.protocol_type} Protocol
              </Typography>
            </Box>
            {homework.completed_today ? (
              <Chip label="Completed Today!" color="success" icon={<CheckCircleIcon />} />
            ) : (
              <Chip label="Due Today" color="warning" icon={<AssignmentIcon />} />
            )}
          </Stack>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={4}>
              <Stack alignItems="center">
                <Badge badgeContent={homework.current_streak} color="error" max={99}>
                  <LocalFireDepartmentIcon sx={{ fontSize: 32, color: 'error.main' }} />
                </Badge>
                <Typography variant="caption" color="text.secondary">
                  Day Streak
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={4}>
              <Stack alignItems="center">
                <Stack direction="row" alignItems="center">
                  <StarIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    {homework.xp_earned}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  XP Earned
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={4}>
              <Stack alignItems="center">
                <Typography variant="h6" fontWeight="bold">
                  {homework.compliance_rate.toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compliance
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <LinearProgress
            variant="determinate"
            value={homework.compliance_rate}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: homework.compliance_rate >= 85 ? 'success.main' : homework.compliance_rate >= 70 ? 'warning.main' : 'error.main',
              },
            }}
          />

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {homework.days_completed} of {homework.total_days_assigned} days completed
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">View Exercises ({homework.inhibit_exercises.length + homework.lengthen_exercises.length + homework.activate_exercises.length + homework.integrate_exercises.length} total)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    1. Inhibit (SMR/Foam Rolling)
                  </Typography>
                  {homework.inhibit_exercises.map((ex, idx) => (
                    <Typography key={idx} variant="body2">
                      • {ex.exercise} - {ex.duration_sec}s
                    </Typography>
                  ))}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    2. Lengthen (Static Stretching)
                  </Typography>
                  {homework.lengthen_exercises.map((ex, idx) => (
                    <Typography key={idx} variant="body2">
                      • {ex.exercise} - {ex.reps} × {ex.duration_sec}s
                    </Typography>
                  ))}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    3. Activate (Isolated Strength)
                  </Typography>
                  {homework.activate_exercises.map((ex, idx) => (
                    <Typography key={idx} variant="body2">
                      • {ex.exercise} - {ex.sets} × {ex.reps} @ {ex.tempo}
                    </Typography>
                  ))}
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>
                    4. Integrate (Functional Movement)
                  </Typography>
                  {homework.integrate_exercises.map((ex, idx) => (
                    <Typography key={idx} variant="body2">
                      • {ex.exercise} - {ex.sets} × {ex.reps} @ {ex.tempo}
                    </Typography>
                  ))}
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Button
            variant="contained"
            fullWidth
            color={homework.completed_today ? 'success' : 'primary'}
            startIcon={homework.completed_today ? <CheckCircleIcon /> : <PlayArrowIcon />}
            onClick={() => setHomeworkDialogOpen(true)}
            sx={{ mt: 2 }}
            disabled={homework.completed_today}
          >
            {homework.completed_today ? 'Completed Today!' : 'Start Homework'}
          </Button>

          {homework.current_streak >= 7 && (
            <Alert severity="success" icon={<EmojiEventsIcon />} sx={{ mt: 2 }}>
              <strong>{homework.current_streak}-day streak!</strong> You're crushing it! 🔥
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // ========================================
  // PROGRESS TIMELINE
  // ========================================
  const renderProgressTimeline = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Phase Progression History
        </Typography>

        {phaseHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No phase history yet. You're just getting started!
          </Typography>
        ) : (
          <List>
            {phaseHistory.map((entry, idx) => (
              <ListItem key={entry.id}>
                <ListItemIcon>
                  <TrendingUpIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${entry.from_phase ? getPhaseInfo(entry.from_phase).title : 'Start'} → ${getPhaseInfo(entry.to_phase).title}`}
                  secondary={`${new Date(entry.progression_date).toLocaleDateString()} • ${entry.weeks_in_previous_phase || 0} weeks`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  // ========================================
  // HOMEWORK COMPLETION DIALOG
  // ========================================
  const renderHomeworkDialog = () => (
    <Dialog open={homeworkDialogOpen} onClose={() => setHomeworkDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Complete Corrective Homework</DialogTitle>
      <DialogContent>
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          Follow the 4-step CEx Continuum in order. Take your time and focus on quality movement!
        </Alert>

        <Typography variant="body2" color="text.secondary" mb={2}>
          Completing today's homework will earn you:
        </Typography>

        <Stack spacing={1} mb={3}>
          <Chip label="+10 XP" color="primary" icon={<StarIcon />} />
          {homework && homework.current_streak === 6 && (
            <Chip label="+50 XP Bonus (7-day streak!)" color="error" icon={<LocalFireDepartmentIcon />} />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Once you complete all exercises, click "Mark Complete" below.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setHomeworkDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" color="success" onClick={completeHomework}>
          Mark Complete
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My NASM Training
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your personalized training journey powered by NASM OPT™ methodology
          </Typography>
        </Box>
        {/* @ts-ignore */}
        {user?.assignedTrainerId && (
          <Button
            variant="contained"
            startIcon={<MessageIcon />}
            onClick={handleMessageTrainer}
            disabled={isCreatingConversation}
          >
            Message My Trainer
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Phase Widget */}
        <Grid item xs={12}>
          {renderPhaseWidget()}
        </Grid>

        {/* Today's Workout */}
        <Grid item xs={12} md={6}>
          {renderTodaysWorkout()}
        </Grid>

        {/* Corrective Homework */}
        <Grid item xs={12} md={6}>
          {renderHomeworkTracker()}
        </Grid>

        {/* Progress Timeline */}
        <Grid item xs={12}>
          {renderProgressTimeline()}
        </Grid>

        {/* Workout Logger */}
        <Grid item xs={12}>
          <WorkoutLogger />
        </Grid>

      </Grid>

      {renderHomeworkDialog()}
    </Container>
  );
};

export default NASMClientDashboard;
