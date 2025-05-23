import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Badge,
  Fab,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  FitnessCenter as ExerciseIcon,
  Assignment as PlanIcon,
  People as ClientsIcon,
  BarChart as AnalyticsIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PlayArrow as StartIcon,
  Settings as ConfigIcon,
  TrendingUp as ProgressIcon,
  Warning as WarningIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, Exercise, ClientProgress, WorkoutStatistics } from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';
import WorkoutPlanBuilder from './WorkoutPlanBuilder';
import ClientSelection from './ClientSelection';

// Mock data for demonstration
const mockWorkoutPlans: WorkoutPlan[] = [
  {
    id: '1',
    name: 'Strength Building Program',
    description: 'Comprehensive strength training for intermediate clients',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    goal: 'strength',
    startDate: '2024-03-01',
    endDate: '2024-05-01',
    status: 'active',
    days: []
  },
  {
    id: '2',
    name: 'Weight Loss Journey',
    description: 'Cardio and strength combination for weight loss',
    trainerId: 'trainer-1',
    clientId: 'client-2',
    goal: 'weight_loss',
    startDate: '2024-04-01',
    endDate: '2024-06-01',
    status: 'active',
    days: []
  },
  {
    id: '3',
    name: 'Beginner Full Body',
    description: 'Introduction to fitness for new clients',
    trainerId: 'trainer-2',
    clientId: 'client-3',
    goal: 'general',
    startDate: '2024-04-15',
    endDate: '2024-06-15',
    status: 'active',
    days: []
  }
];

const mockActiveWorkouts = [
  {
    id: 'w1',
    clientName: 'John Doe',
    planName: 'Strength Building Program',
    progress: 75,
    currentDay: 'Day 3: Upper Body',
    startedAt: '2024-05-13T10:00:00Z',
    status: 'in_progress'
  },
  {
    id: 'w2',
    clientName: 'Jane Smith',
    planName: 'Weight Loss Journey',
    progress: 40,
    currentDay: 'Day 2: Cardio',
    startedAt: '2024-05-13T14:30:00Z',
    status: 'in_progress'
  }
];

/**
 * AdminWorkoutManagement Component
 * 
 * Main workout management interface for administrators
 * Integrates with the Workout MCP server for full functionality
 */
const AdminWorkoutManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    generateWorkoutPlan,
    checkMcpHealth,
    loading,
    error
  } = useWorkoutMcp();

  const [activeTab, setActiveTab] = useState(0);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalPlans: 0,
    activeWorkouts: 0,
    totalClients: 0,
    completedToday: 0
  });

  // Dialog states
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Data states
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>(mockWorkoutPlans);
  const [activeWorkouts, setActiveWorkouts] = useState(mockActiveWorkouts);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  // Check MCP connection on component mount
  useEffect(() => {
    checkMcpConnection();
    loadDashboardData();
  }, []);

  const checkMcpConnection = async () => {
    const isConnected = await checkMcpHealth();
    setMcpConnected(isConnected);
  };

  const loadDashboardData = async () => {
    try {
      // Load dashboard statistics
      setDashboardStats({
        totalPlans: workoutPlans.length,
        activeWorkouts: activeWorkouts.length,
        totalClients: 15, // Mock data
        completedToday: 8 // Mock data
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePlanCreated = (plan: WorkoutPlan) => {
    setWorkoutPlans([...workoutPlans, plan]);
    setPlanBuilderOpen(false);
    loadDashboardData();
  };

  const handleDeletePlan = (planId: string) => {
    setWorkoutPlans(workoutPlans.filter(plan => plan.id !== planId));
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'archived': return 'default';
      case 'in_progress': return 'warning';
      default: return 'default';
    }
  };

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'strength': return 'primary';
      case 'weight_loss': return 'error';
      case 'endurance': return 'warning';
      case 'general': return 'info';
      default: return 'default';
    }
  };

  // Dashboard Overview Tab
  const renderDashboardOverview = () => (
    <Box>
      {/* MCP Connection Status */}
      <Alert
        severity={mcpConnected ? 'success' : 'warning'}
        action={
          <Button size="small" onClick={checkMcpConnection} startIcon={<RefreshIcon />}>
            Check
          </Button>
        }
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="subtitle1">
            MCP Workout Server: {mcpConnected ? 'Connected' : 'Disconnected'}
          </Typography>
          {!mcpConnected && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Server should be running on http://localhost:8000
              <br />
              Use the 'start-mcp-simple.bat' script to start the server
            </Typography>
          )}
        </Box>
      </Alert>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PlanIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main">
                {dashboardStats.totalPlans}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Workout Plans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StartIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {dashboardStats.activeWorkouts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Workouts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ClientsIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" color="secondary.main">
                {dashboardStats.totalClients}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CompleteIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {dashboardStats.completedToday}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setPlanBuilderOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Create Plan</Typography>
              <Typography variant="body2" color="text.secondary">
                Build a new workout plan
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setExerciseLibraryOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ExerciseIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">Exercise Library</Typography>
              <Typography variant="body2" color="text.secondary">
                Browse exercises
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setClientSelectionOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ClientsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">Select Clients</Typography>
              <Typography variant="body2" color="text.secondary">
                Assign workout plans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setAnalyticsOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Analytics</Typography>
              <Typography variant="body2" color="text.secondary">
                View progress reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Workouts */}
      <Typography variant="h6" gutterBottom>
        Active Workouts
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {activeWorkouts.length > 0 ? (
          <List>
            {activeWorkouts.map((workout) => (
              <ListItem key={workout.id}>
                <ListItemAvatar>
                  <Avatar>
                    <StartIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${workout.clientName} - ${workout.planName}`}
                  secondary={
                    <Box component="div">
                      <Typography variant="body2" component="span" display="block">
                        {workout.currentDay}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={workout.progress}
                        sx={{ mt: 1, mb: 1 }}
                      />
                      <Typography variant="caption" component="span" display="block">
                        {workout.progress}% complete
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={workout.status}
                    color={getStatusColor(workout.status)}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No active workouts
          </Typography>
        )}
      </Paper>
    </Box>
  );

  // Workout Plans Tab
  const renderWorkoutPlans = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Workout Plans ({workoutPlans.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setPlanBuilderOpen(true)}
        >
          Create New Plan
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Plan Name</TableCell>
              <TableCell>Goal</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date Range</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workoutPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Typography variant="subtitle2">{plan.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plan.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={plan.goal}
                    color={getGoalColor(plan.goal)}
                    size="small"
                  />
                </TableCell>
                <TableCell>Client {plan.clientId}</TableCell>
                <TableCell>
                  <Chip
                    label={plan.status}
                    color={getStatusColor(plan.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(plan.startDate!).toLocaleDateString()} -<br />
                    {new Date(plan.endDate!).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => setSelectedPlan(plan)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Plan">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setPlanBuilderOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Plan">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePlan(plan.id!)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workout Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton
            onClick={checkMcpConnection}
            color={mcpConnected ? 'success' : 'error'}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<ConfigIcon />}
            onClick={() => {}} // TODO: Open MCP settings
          >
            MCP Settings
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Dashboard" />
        <Tab label="Workout Plans" />
        <Tab label="Exercise Library" />
        <Tab label="Client Management" />
        <Tab label="Analytics" />
      </Tabs>

      {/* Tab Content */}
      <Box role="tabpanel">
        {activeTab === 0 && renderDashboardOverview()}
        {activeTab === 1 && renderWorkoutPlans()}
        {activeTab === 2 && (
          <ExerciseLibrary
            onExerciseSelect={(exercise) => console.log('Selected exercise:', exercise)}
          />
        )}
        {activeTab === 3 && (
          <ClientSelection
            onClientSelect={(client) => console.log('Selected client:', client)}
            multiSelect={true}
            showDetails={true}
          />
        )}
        {activeTab === 4 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive workout analytics and reporting tools.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => setAnalyticsOpen(true)}
            >
              View Analytics
            </Button>
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      
      {/* Exercise Library Dialog */}
      <Dialog
        open={exerciseLibraryOpen}
        onClose={() => setExerciseLibraryOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Exercise Library</DialogTitle>
        <DialogContent>
          <ExerciseLibrary
            onExerciseSelect={(exercise) => {
              console.log('Selected exercise:', exercise);
              setExerciseLibraryOpen(false);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseLibraryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Workout Plan Builder Dialog */}
      <Dialog
        open={planBuilderOpen}
        onClose={() => setPlanBuilderOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <WorkoutPlanBuilder
            onPlanCreated={handlePlanCreated}
            existingPlan={selectedPlan || undefined}
            mode={selectedPlan ? 'edit' : 'create'}
          />
        </DialogContent>
      </Dialog>

      {/* Client Selection Dialog */}
      <Dialog
        open={clientSelectionOpen}
        onClose={() => setClientSelectionOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Select Clients for Workout Assignment</DialogTitle>
        <DialogContent>
          <ClientSelection
            onClientSelect={(client) => {
              console.log('Selected client for assignment:', client);
              setClientSelectionOpen(false);
            }}
            multiSelect={true}
            showDetails={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientSelectionOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Workout Analytics</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <AnalyticsIcon sx={{ fontSize: 96, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Advanced analytics and reporting features will be implemented here.
              This will include client progress tracking, workout completion rates,
              exercise performance metrics, and more.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminWorkoutManagement;