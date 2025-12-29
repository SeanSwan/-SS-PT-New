/**
 * NASM Trainer Dashboard - Client Assessment & Workout Planning Tools
 *
 * Trainer-only NASM features:
 * 1. Movement Assessment Module - Conduct OHS, single-leg squat assessments
 * 2. Corrective Protocol Builder - Create 4-step CEx protocols (NASM-CES required)
 * 3. Workout Builder - Create phase-appropriate workouts with validation
 * 4. Phase Progression Tracker - Monitor client progression through OPT phases
 * 5. Session Logger - Log acute variables, RPE, pain flags
 *
 * Access: Trainer tier only (user_tier = 'trainer')
 * Certification-Gated Features:
 * - NASM-CPT: Phases 1-3 access
 * - NASM-CES: Corrective Exercise Builder unlocked
 * - NASM-PES: Phases 4-5 access (Max Strength & Power)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  IconButton,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  FitnessCenter as FitnessCenterIcon,
  TrendingUp as TrendingUpIcon,
  PlayCircle as PlayCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';

interface ClientSummary {
  id: string;
  full_name: string;
  current_phase: string;
  weeks_in_phase: number;
  ready_for_next_phase: boolean;
  last_assessment_date: string | null;
  active_corrective_protocol: boolean;
  compliance_rate: number | null;
}

interface MovementAssessment {
  id?: string;
  client_id: string;
  assessment_type: string;
  assessment_date: string;
  compensations_identified: {
    knee_valgus?: boolean;
    heels_rise?: boolean;
    forward_head?: boolean;
    rounded_shoulders?: boolean;
    excessive_forward_lean?: boolean;
    low_back_arches?: boolean;
    arms_fall_forward?: boolean;
  };
  suggested_protocol: string | null;
  protocol_confidence: number | null;
  trainer_notes: string;
}

interface CorrectiveProtocol {
  client_id: string;
  protocol_type: string;
  inhibit_exercises: Array<{ exercise: string; duration_sec: number; notes: string }>;
  lengthen_exercises: Array<{ exercise: string; duration_sec: number; reps: number }>;
  activate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  integrate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  homework_assigned: boolean;
  total_days_assigned: number;
}

interface WorkoutBuilder {
  template_name: string;
  opt_phase: string;
  client_id: string;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps: string;
    tempo: string;
    rest_sec: number;
    notes: string;
  }>;
}

interface TrainerCertification {
  certification_type: string;
  status: string;
}

const NASMTrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Client Management
  const [clients, setClients] = useState<ClientSummary[]>([]);

  // Certifications (for gating features)
  const [certifications, setCertifications] = useState<TrainerCertification[]>([]);
  const hasCPT = certifications.some((c) => c.certification_type === 'NASM-CPT' && c.status === 'active');
  const hasCES = certifications.some((c) => c.certification_type === 'NASM-CES' && c.status === 'active');
  const hasPES = certifications.some((c) => c.certification_type === 'NASM-PES' && c.status === 'active');

  // Assessment Module State
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<MovementAssessment>({
    client_id: '',
    assessment_type: 'overhead_squat',
    assessment_date: new Date().toISOString(),
    compensations_identified: {},
    suggested_protocol: null,
    protocol_confidence: null,
    trainer_notes: '',
  });

  // Corrective Protocol Builder State
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [currentProtocol, setCurrentProtocol] = useState<CorrectiveProtocol>({
    client_id: '',
    protocol_type: 'custom',
    inhibit_exercises: [],
    lengthen_exercises: [],
    activate_exercises: [],
    integrate_exercises: [],
    homework_assigned: true,
    total_days_assigned: 14,
  });

  // Workout Builder State
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutBuilder>({
    template_name: '',
    opt_phase: 'phase_1_stabilization',
    client_id: '',
    exercises: [],
  });
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'trainer') {
      window.location.href = '/dashboard/client';
    }
    loadTrainerCertifications();
    loadClients();
  }, [user]);

  const loadTrainerCertifications = async () => {
    const response = await api.get('/api/trainer/my-certifications');
    setCertifications(response.data);
  };

  const loadClients = async () => {
    const response = await api.get('/api/trainer/my-clients');
    setClients(response.data);
  };

  // ========================================
  // MOVEMENT ASSESSMENT MODULE
  // ========================================
  const openAssessmentDialog = (clientId: string) => {
    setCurrentAssessment({
      ...currentAssessment,
      client_id: clientId,
      assessment_date: new Date().toISOString(),
    });
    setAssessmentDialogOpen(true);
  };

  const detectCompensations = async () => {
    // AI-powered compensation detection
    const response = await api.post('/api/ai/detect-compensations', {
      compensations: Object.keys(currentAssessment.compensations_identified).filter(
        (key) => currentAssessment.compensations_identified[key as keyof typeof currentAssessment.compensations_identified]
      ),
    });

    setCurrentAssessment({
      ...currentAssessment,
      suggested_protocol: response.data.protocol,
      protocol_confidence: response.data.confidence,
    });
  };

  const saveAssessment = async () => {
    await api.post('/api/trainer/movement-assessments', currentAssessment);
    setAssessmentDialogOpen(false);
    loadClients();
  };

  // ========================================
  // CORRECTIVE PROTOCOL BUILDER (CES-GATED)
  // ========================================
  const openProtocolDialog = (clientId: string, assessmentId?: string) => {
    if (!hasCES) {
      alert('NASM-CES certification required to create corrective protocols');
      return;
    }

    setCurrentProtocol({
      ...currentProtocol,
      client_id: clientId,
    });
    setProtocolDialogOpen(true);
  };

  const loadProtocolTemplate = (protocolType: string) => {
    // Load pre-built templates for UCS, LCS, PDS
    const templates: { [key: string]: Partial<CorrectiveProtocol> } = {
      UCS: {
        protocol_type: 'UCS',
        inhibit_exercises: [
          { exercise: 'SMR Upper Traps', duration_sec: 90, notes: 'Focus on tender spots' },
          { exercise: 'SMR Levator Scapulae', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Pec Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Upper Trap Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Floor Cobra', reps: 15, sets: 2, tempo: '2/2/2' },
          { exercise: 'Ball Combo I', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
        integrate_exercises: [
          { exercise: 'Ball Wall Squat', reps: 15, sets: 2, tempo: '4/2/1' },
          { exercise: 'Standing Cable Row', reps: 12, sets: 2, tempo: '4/2/1' },
        ],
      },
      LCS: {
        protocol_type: 'LCS',
        inhibit_exercises: [
          { exercise: 'SMR Hip Flexors', duration_sec: 90, notes: '' },
          { exercise: 'SMR TFL/IT Band', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Hip Flexor Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Lat Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Glute Bridge', reps: 15, sets: 2, tempo: '2/2/2' },
          { exercise: 'Quadruped Arm/Leg Raise', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
        integrate_exercises: [
          { exercise: 'Ball Squat', reps: 15, sets: 2, tempo: '4/2/1' },
          { exercise: 'Step-Up to Balance', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
      },
      PDS: {
        protocol_type: 'PDS',
        inhibit_exercises: [
          { exercise: 'SMR Peroneals', duration_sec: 90, notes: '' },
          { exercise: 'SMR Biceps Femoris (Short Head)', duration_sec: 90, notes: '' },
        ],
        lengthen_exercises: [
          { exercise: 'Static Gastrocnemius Stretch', duration_sec: 30, reps: 2 },
          { exercise: 'Static Standing TFL Stretch', duration_sec: 30, reps: 2 },
        ],
        activate_exercises: [
          { exercise: 'Single-Leg Balance Reach', reps: 10, sets: 2, tempo: 'controlled' },
          { exercise: 'Tube Walking (Side Steps)', reps: 15, sets: 2, tempo: '1/1/1' },
        ],
        integrate_exercises: [
          { exercise: 'Single-Leg Squat', reps: 10, sets: 2, tempo: '4/2/1' },
          { exercise: 'Multiplanar Step-Up', reps: 10, sets: 2, tempo: '4/2/1' },
        ],
      },
    };

    const template = templates[protocolType];
    if (template) {
      setCurrentProtocol({ ...currentProtocol, ...template });
    }
  };

  const saveProtocol = async () => {
    await api.post('/api/trainer/corrective-protocols', currentProtocol);
    setProtocolDialogOpen(false);
    loadClients();
  };

  // ========================================
  // WORKOUT BUILDER
  // ========================================
  const openWorkoutDialog = (clientId: string, clientPhase: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    // Phase gating
    if ((clientPhase === 'phase_4_maximal_strength' || clientPhase === 'phase_5_power') && !hasPES) {
      alert('NASM-PES certification required to create Phases 4-5 workouts');
      return;
    }

    setCurrentWorkout({
      ...currentWorkout,
      client_id: clientId,
      opt_phase: clientPhase,
    });
    loadExercisesForPhase(clientPhase);
    setWorkoutDialogOpen(true);
  };

  const loadExercisesForPhase = async (phase: string) => {
    const phaseNum = parseInt(phase.split('_')[1]);
    const response = await api.get(`/api/trainer/exercises?phase=${phaseNum}`);
    setAvailableExercises(response.data);
  };

  const addExerciseToWorkout = (exercise: any) => {
    const phaseDefaults = getPhaseDefaults(currentWorkout.opt_phase);
    setCurrentWorkout({
      ...currentWorkout,
      exercises: [
        ...currentWorkout.exercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.exercise_name,
          ...phaseDefaults,
          notes: '',
        },
      ],
    });
  };

  const getPhaseDefaults = (phase: string) => {
    const defaults: { [key: string]: { sets: number; reps: string; tempo: string; rest_sec: number } } = {
      phase_1_stabilization: { sets: 3, reps: '12-20', tempo: '4/2/1', rest_sec: 30 },
      phase_2_strength_endurance: { sets: 3, reps: '8-12', tempo: '2/0/2', rest_sec: 60 },
      phase_3_hypertrophy: { sets: 4, reps: '6-12', tempo: '2/0/2', rest_sec: 60 },
      phase_4_maximal_strength: { sets: 5, reps: '1-5', tempo: 'X/X/X', rest_sec: 180 },
      phase_5_power: { sets: 3, reps: '1-5 + 8-10', tempo: 'explosive', rest_sec: 120 },
    };
    return defaults[phase] || defaults.phase_1_stabilization;
  };

  const validateWorkout = () => {
    const errors: string[] = [];

    if (currentWorkout.exercises.length === 0) {
      errors.push('At least one exercise required');
    }

    if (currentWorkout.opt_phase === 'phase_2_strength_endurance') {
      // Phase 2 requires supersets
      if (currentWorkout.exercises.length % 2 !== 0) {
        errors.push('Phase 2 requires exercises in superset pairs (even number)');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const saveWorkout = async () => {
    const validation = validateWorkout();
    if (!validation.valid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    await api.post('/api/trainer/workouts', currentWorkout);
    setWorkoutDialogOpen(false);
    loadClients();
  };

  // ========================================
  // PHASE PROGRESSION
  // ========================================
  const advanceClientPhase = async (clientId: string) => {
    if (window.confirm('Are you sure this client is ready to advance to the next phase?')) {
      await api.put(`/api/trainer/clients/${clientId}/opt-phase/advance`, {
        progression_criteria_met: { trainer_confirmed: true },
        trainer_rationale: 'Client meets all progression criteria',
      });
      loadClients();
    }
  };

  // ========================================
  // RENDER HELPERS
  // ========================================
  const getPhaseLabel = (phase: string): string => {
    const labels: { [key: string]: string } = {
      phase_1_stabilization: 'Phase 1: Stabilization',
      phase_2_strength_endurance: 'Phase 2: Strength Endurance',
      phase_3_hypertrophy: 'Phase 3: Hypertrophy',
      phase_4_maximal_strength: 'Phase 4: Max Strength',
      phase_5_power: 'Phase 5: Power',
    };
    return labels[phase] || phase;
  };

  const getPhaseColor = (phase: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    if (phase.includes('1')) return 'primary';
    if (phase.includes('2')) return 'secondary';
    if (phase.includes('3')) return 'success';
    if (phase.includes('4')) return 'warning';
    return 'error';
  };

  // ========================================
  // TAB 0: MY CLIENTS
  // ========================================
  const renderMyClients = () => (
    <Grid container spacing={3}>
      {clients.map((client) => (
        <Grid item xs={12} md={6} lg={4} key={client.id}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {client.full_name}
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Current Phase
                  </Typography>
                  <Chip
                    label={getPhaseLabel(client.current_phase)}
                    color={getPhaseColor(client.current_phase)}
                    size="small"
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Weeks in Phase
                  </Typography>
                  <Typography variant="body2">{client.weeks_in_phase} weeks</Typography>
                </Stack>

                {client.active_corrective_protocol && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Homework Compliance
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {client.compliance_rate?.toFixed(0) || 0}%
                    </Typography>
                  </Stack>
                )}

                {client.ready_for_next_phase && (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Ready for next phase!
                  </Alert>
                )}
              </Stack>
            </CardContent>

            <CardActions>
              <Button
                size="small"
                startIcon={<AssessmentIcon />}
                onClick={() => openAssessmentDialog(client.id)}
              >
                Assess
              </Button>
              <Button
                size="small"
                startIcon={<FitnessCenterIcon />}
                onClick={() => openWorkoutDialog(client.id, client.current_phase)}
              >
                Workout
              </Button>
              {client.ready_for_next_phase && (
                <Button
                  size="small"
                  color="success"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => advanceClientPhase(client.id)}
                >
                  Advance
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}

      {clients.length === 0 && (
        <Grid item xs={12}>
          <Alert severity="info">No clients assigned yet</Alert>
        </Grid>
      )}
    </Grid>
  );

  // ========================================
  // ASSESSMENT DIALOG
  // ========================================
  const renderAssessmentDialog = () => (
    <Dialog open={assessmentDialogOpen} onClose={() => setAssessmentDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Movement Assessment</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Assessment Type</InputLabel>
            <Select
              value={currentAssessment.assessment_type}
              onChange={(e) => setCurrentAssessment({ ...currentAssessment, assessment_type: e.target.value })}
            >
              <MenuItem value="overhead_squat">Overhead Squat (OHS)</MenuItem>
              <MenuItem value="single_leg_squat_left">Single-Leg Squat (Left)</MenuItem>
              <MenuItem value="single_leg_squat_right">Single-Leg Squat (Right)</MenuItem>
              <MenuItem value="pushing_assessment">Pushing Assessment</MenuItem>
              <MenuItem value="pulling_assessment">Pulling Assessment</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle1" fontWeight="bold">
            Compensations Identified
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentAssessment.compensations_identified.knee_valgus || false}
                  onChange={(e) =>
                    setCurrentAssessment({
                      ...currentAssessment,
                      compensations_identified: {
                        ...currentAssessment.compensations_identified,
                        knee_valgus: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Knee Valgus (knees cave in)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentAssessment.compensations_identified.heels_rise || false}
                  onChange={(e) =>
                    setCurrentAssessment({
                      ...currentAssessment,
                      compensations_identified: {
                        ...currentAssessment.compensations_identified,
                        heels_rise: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Heels Rise"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentAssessment.compensations_identified.forward_head || false}
                  onChange={(e) =>
                    setCurrentAssessment({
                      ...currentAssessment,
                      compensations_identified: {
                        ...currentAssessment.compensations_identified,
                        forward_head: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Forward Head"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentAssessment.compensations_identified.rounded_shoulders || false}
                  onChange={(e) =>
                    setCurrentAssessment({
                      ...currentAssessment,
                      compensations_identified: {
                        ...currentAssessment.compensations_identified,
                        rounded_shoulders: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Rounded Shoulders"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={currentAssessment.compensations_identified.low_back_arches || false}
                  onChange={(e) =>
                    setCurrentAssessment({
                      ...currentAssessment,
                      compensations_identified: {
                        ...currentAssessment.compensations_identified,
                        low_back_arches: e.target.checked,
                      },
                    })
                  }
                />
              }
              label="Low Back Arches"
            />
          </FormGroup>

          <Button variant="outlined" onClick={detectCompensations}>
            AI: Suggest Corrective Protocol
          </Button>

          {currentAssessment.suggested_protocol && (
            <Alert severity="info">
              Suggested: {currentAssessment.suggested_protocol} ({currentAssessment.protocol_confidence}% confidence)
            </Alert>
          )}

          <TextField
            label="Trainer Notes"
            multiline
            rows={4}
            value={currentAssessment.trainer_notes}
            onChange={(e) => setCurrentAssessment({ ...currentAssessment, trainer_notes: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAssessmentDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={saveAssessment}>
          Save Assessment
        </Button>
        {currentAssessment.suggested_protocol && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              saveAssessment();
              openProtocolDialog(currentAssessment.client_id);
            }}
          >
            Save & Create Protocol
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            NASM Trainer Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Client assessments, corrective protocols, and workout planning
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {hasCPT && <Chip label="NASM-CPT" color="primary" />}
          {hasCES && <Chip label="NASM-CES" color="success" />}
          {hasPES && <Chip label="NASM-PES" color="warning" />}
          {!hasCPT && !hasCES && !hasPES && <Chip label="No Certifications" color="error" icon={<LockIcon />} />}
        </Stack>
      </Stack>

      {!hasCPT && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          NASM-CPT certification required to access trainer tools. Please upload your certification in Settings.
        </Alert>
      )}

      {hasCPT && (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="My Clients" icon={<FitnessCenterIcon />} />
              <Tab label="Assessments" icon={<AssessmentIcon />} />
              <Tab label="Workouts" icon={<PlayCircleIcon />} />
            </Tabs>
          </Paper>

          <Box>{activeTab === 0 && renderMyClients()}</Box>

          {renderAssessmentDialog()}
        </>
      )}
    </Container>
  );
};

export default NASMTrainerDashboard;
