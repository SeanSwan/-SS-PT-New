/**
 * NASM Admin Dashboard - Master Control Panel
 *
 * Admin-only NASM features:
 * 1. Template Builder - Create/approve workout templates
 * 2. Exercise Library Manager - Add/approve exercises
 * 3. Compliance Dashboard - Monitor trainer certifications & client metrics
 * 4. Certification Verification - Verify trainer NASM certs
 *
 * Access: Admin tier only (user_tier = 'admin')
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  FitnessCenter as FitnessCenterIcon,
  VerifiedUser as VerifiedUserIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';

interface ComplianceMetrics {
  total_clients: number;
  total_active_protocols: number;
  avg_compliance_rate: number;
  active_cpt_trainers: number;
  active_ces_trainers: number;
  active_pes_trainers: number;
  approved_exercises: number;
  approved_templates: number;
  total_assessments_30d: number;
  total_sessions_30d: number;
}

interface WorkoutTemplate {
  id: string;
  template_name: string;
  opt_phase: string;
  difficulty_level: string;
  target_duration_minutes: number;
  equipment_required: string[];
  approved: boolean;
  usage_count: number;
  average_rating: number | null;
  created_at: string;
}

interface Exercise {
  id: string;
  exercise_name: string;
  opt_phases: number[];
  exercise_type: string;
  primary_body_part: string;
  primary_equipment: string;
  approved: boolean;
  demo_video_url: string | null;
}

interface TrainerCertification {
  id: string;
  trainer_id: string;
  trainer_name: string;
  certification_type: string;
  certification_number: string;
  issue_date: string;
  expiration_date: string;
  status: 'active' | 'expired' | 'pending_renewal';
  certificate_url: string | null;
  verified_at: string | null;
}

const NASMAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Compliance Dashboard State
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);

  // Template Builder State
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Exercise Library State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);

  // Certification Verification State
  const [certifications, setCertifications] = useState<TrainerCertification[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'admin') {
      window.location.href = '/dashboard/client';
    }
  }, [user]);

  // Load initial data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 0: // Compliance Dashboard
          await loadComplianceMetrics();
          break;
        case 1: // Template Builder
          await loadWorkoutTemplates();
          break;
        case 2: // Exercise Library
          await loadExercises();
          break;
        case 3: // Certifications
          await loadCertifications();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // COMPLIANCE DASHBOARD
  // ========================================
  const loadComplianceMetrics = async () => {
    const response = await api.get('/api/admin/nasm/compliance-metrics');
    setMetrics(response.data);
  };

  const refreshMetrics = async () => {
    setLoading(true);
    await api.post('/api/admin/nasm/refresh-compliance-view');
    await loadComplianceMetrics();
    setLoading(false);
  };

  // ========================================
  // TEMPLATE BUILDER
  // ========================================
  const loadWorkoutTemplates = async () => {
    const response = await api.get('/api/admin/workout-templates');
    setTemplates(response.data);
  };

  const approveTemplate = async (templateId: string) => {
    await api.put(`/api/admin/workout-templates/${templateId}/approve`);
    await loadWorkoutTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await api.delete(`/api/admin/workout-templates/${templateId}`);
      await loadWorkoutTemplates();
    }
  };

  // ========================================
  // EXERCISE LIBRARY
  // ========================================
  const loadExercises = async () => {
    const response = await api.get('/api/admin/exercise-library');
    setExercises(response.data);
  };

  const approveExercise = async (exerciseId: string) => {
    await api.put(`/api/admin/exercise-library/${exerciseId}`, { approved: true });
    await loadExercises();
  };

  const deleteExercise = async (exerciseId: string) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      await api.delete(`/api/admin/exercise-library/${exerciseId}`);
      await loadExercises();
    }
  };

  // ========================================
  // CERTIFICATION VERIFICATION
  // ========================================
  const loadCertifications = async () => {
    const response = await api.get('/api/admin/trainer-certifications');
    setCertifications(response.data);
  };

  const verifyCertification = async (certId: string) => {
    await api.put(`/api/admin/trainer-certifications/${certId}/verify`);
    await loadCertifications();
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

  const getCertColor = (status: string): 'success' | 'error' | 'warning' => {
    if (status === 'active') return 'success';
    if (status === 'expired') return 'error';
    return 'warning';
  };

  // ========================================
  // TAB 0: COMPLIANCE DASHBOARD
  // ========================================
  const renderComplianceDashboard = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          NASM Compliance Metrics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshMetrics}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {metrics && (
        <Grid container spacing={3}>
          {/* Client Metrics */}
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {metrics.total_clients}
                    </Typography>
                    <Typography variant="body2">Total Clients</Typography>
                  </Box>
                  <FitnessCenterIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Protocols */}
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {metrics.total_active_protocols}
                    </Typography>
                    <Typography variant="body2">Active Corrective Protocols</Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Avg Compliance Rate */}
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {metrics.avg_compliance_rate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2">Avg Homework Compliance</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Certified Trainers */}
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h3" fontWeight="bold">
                      {metrics.active_cpt_trainers}
                    </Typography>
                    <Typography variant="body2">Active CPT Trainers</Typography>
                  </Box>
                  <VerifiedUserIcon sx={{ fontSize: 48, opacity: 0.7 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Trainer Breakdown */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trainer Certifications
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>NASM-CPT (Personal Trainer)</Typography>
                    <Chip label={metrics.active_cpt_trainers} color="primary" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>NASM-CES (Corrective Exercise)</Typography>
                    <Chip label={metrics.active_ces_trainers} color="success" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>NASM-PES (Performance)</Typography>
                    <Chip label={metrics.active_pes_trainers} color="warning" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Content Library */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Content Library Status
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Approved Exercises</Typography>
                    <Chip label={metrics.approved_exercises} color="primary" />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>Approved Templates</Typography>
                    <Chip label={metrics.approved_templates} color="success" />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Metrics (Last 30 Days) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activity Metrics (Last 30 Days)
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Movement Assessments</Typography>
                      <Chip label={metrics.total_assessments_30d} color="info" />
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Training Sessions Logged</Typography>
                      <Chip label={metrics.total_sessions_30d} color="info" />
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );

  // ========================================
  // TAB 1: TEMPLATE BUILDER
  // ========================================
  const renderTemplateBuilder = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Workout Template Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setTemplateDialogOpen(true)}
        >
          Create Template
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Template Name</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.template_name}</TableCell>
                <TableCell>{getPhaseLabel(template.opt_phase)}</TableCell>
                <TableCell>
                  <Chip
                    label={template.difficulty_level}
                    size="small"
                    color={
                      template.difficulty_level === 'beginner'
                        ? 'success'
                        : template.difficulty_level === 'intermediate'
                        ? 'warning'
                        : 'error'
                    }
                  />
                </TableCell>
                <TableCell>{template.target_duration_minutes} min</TableCell>
                <TableCell>{template.usage_count}×</TableCell>
                <TableCell>
                  {template.average_rating ? `${template.average_rating.toFixed(1)}⭐` : 'N/A'}
                </TableCell>
                <TableCell>
                  {template.approved ? (
                    <Chip label="Approved" color="success" size="small" />
                  ) : (
                    <Chip label="Pending" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {!template.approved && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => approveTemplate(template.id)}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {templates.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No workout templates yet. Create your first template to get started!
        </Alert>
      )}
    </Box>
  );

  // ========================================
  // TAB 2: EXERCISE LIBRARY
  // ========================================
  const renderExerciseLibrary = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Exercise Library Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setExerciseDialogOpen(true)}
        >
          Add Exercise
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Exercise Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Body Part</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Phases</TableCell>
              <TableCell>Video</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell>{exercise.exercise_name}</TableCell>
                <TableCell>
                  <Chip label={exercise.exercise_type} size="small" />
                </TableCell>
                <TableCell>{exercise.primary_body_part}</TableCell>
                <TableCell>{exercise.primary_equipment}</TableCell>
                <TableCell>
                  {exercise.opt_phases.map((phase) => (
                    <Chip key={phase} label={`P${phase}`} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {exercise.demo_video_url ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <CancelIcon color="error" fontSize="small" />
                  )}
                </TableCell>
                <TableCell>
                  {exercise.approved ? (
                    <Chip label="Approved" color="success" size="small" />
                  ) : (
                    <Chip label="Pending" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {!exercise.approved && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => approveExercise(exercise.id)}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteExercise(exercise.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ========================================
  // TAB 3: CERTIFICATION VERIFICATION
  // ========================================
  const renderCertificationVerification = () => (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Trainer Certification Verification
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Trainer Name</TableCell>
              <TableCell>Certification</TableCell>
              <TableCell>Cert Number</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Certificate</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certifications.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell>{cert.trainer_name}</TableCell>
                <TableCell>
                  <Chip label={cert.certification_type} color="primary" />
                </TableCell>
                <TableCell>{cert.certification_number}</TableCell>
                <TableCell>{new Date(cert.issue_date).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(cert.expiration_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip label={cert.status} color={getCertColor(cert.status)} size="small" />
                </TableCell>
                <TableCell>
                  {cert.certificate_url ? (
                    <Button size="small" href={cert.certificate_url} target="_blank">
                      View PDF
                    </Button>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  {!cert.verified_at && cert.status === 'active' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => verifyCertification(cert.id)}
                    >
                      Verify
                    </Button>
                  )}
                  {cert.verified_at && (
                    <Typography variant="caption" color="success.main">
                      ✓ Verified
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        NASM Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Manage NASM templates, exercises, and trainer certifications
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Compliance Dashboard" icon={<AssessmentIcon />} />
          <Tab label="Template Builder" icon={<FitnessCenterIcon />} />
          <Tab label="Exercise Library" icon={<FitnessCenterIcon />} />
          <Tab label="Certifications" icon={<VerifiedUserIcon />} />
        </Tabs>
      </Paper>

      <Box>
        {activeTab === 0 && renderComplianceDashboard()}
        {activeTab === 1 && renderTemplateBuilder()}
        {activeTab === 2 && renderExerciseLibrary()}
        {activeTab === 3 && renderCertificationVerification()}
      </Box>
    </Container>
  );
};

export default NASMAdminDashboard;
