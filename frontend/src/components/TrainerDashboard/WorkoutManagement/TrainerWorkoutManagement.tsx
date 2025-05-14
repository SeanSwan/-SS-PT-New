import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  LinearProgress,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon,
  Assessment as AnalyticsIcon,
  Person as PersonIcon,
  FitnessCenter as WorkoutIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  TrendingUp as ProgressIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Groups as ClientsIcon
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, WorkoutSession, ClientProgress } from '../../../hooks/useWorkoutMcp';
import WorkoutPlanBuilder from '../../WorkoutManagement/WorkoutPlanBuilder';
import ClientSelection from '../../WorkoutManagement/ClientSelection';

interface ClientWithPlan {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currentPlan?: WorkoutPlan;
  progress?: ClientProgress;
  lastWorkout?: string;
  activeWorkout?: WorkoutSession;
}

/**
 * TrainerWorkoutManagement Component
 * 
 * Provides workout management functionality for trainers
 * - Create and assign workout plans
 * - Monitor client progress
 * - Track active workouts
 * - View workout analytics
 */
const TrainerWorkoutManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    generateWorkoutPlan,
    getClientProgress,
    getWorkoutStatistics,
    checkMcpHealth,
    loading,
    error
  } = useWorkoutMcp();

  const [activeTab, setActiveTab] = useState(0);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [clientsWithPlans, setClientsWithPlans] = useState<ClientWithPlan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [planBuilderOpen, setPlanBuilderOpen] = useState(false);
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithPlan | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalClients: 0,
    activePlans: 0,
    completedToday: 0,
    avgCompletionRate: 0
  });

  // Mock data for demonstration
  const mockClientsWithPlans: ClientWithPlan[] = [
    {
      id: 'client-1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      currentPlan: {
        id: 'plan-1',
        name: 'Strength Building Program',
        description: 'Progressive strength training',
        trainerId: user?.id || '',
        clientId: 'client-1',
        goal: 'strength',
        startDate: '2024-03-01',
        endDate: '2024-05-01',
        status: 'active'
      },
      progress: {
        userId: 'client-1',
        strengthLevel: 7,
        cardioLevel: 5,
        flexibilityLevel: 4,
        balanceLevel: 6,
        coreLevel: 6,
        totalWorkouts: 32,
        totalSets: 420,
        totalReps: 2850,
        totalWeight: 12500,
        totalExercises: 85,
        currentStreak: 5
      },
      lastWorkout: '2024-05-12'
    },
    {
      id: 'client-2',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      currentPlan: {
        id: 'plan-2',
        name: 'Weight Loss Journey',
        description: 'Cardio and strength combination',
        trainerId: user?.id || '',
        clientId: 'client-2',
        goal: 'weight_loss',
        startDate: '2024-04-01',
        endDate: '2024-06-01',
        status: 'active'
      },
      progress: {
        userId: 'client-2',
        strengthLevel: 4,
        cardioLevel: 8,
        flexibilityLevel: 6,
        balanceLevel: 5,
        coreLevel: 7,
        totalWorkouts: 28,
        totalSets: 350,
        totalReps: 2100,
        totalWeight: 8500,
        totalExercises: 65,
        currentStreak: 8
      },
      lastWorkout: '2024-05-13',
      activeWorkout: {
        id: 'active-1',
        userId: 'client-2',
        title: 'Upper Body HIIT',
        status: 'in_progress',
        startedAt: '2024-05-13T14:30:00Z'
      }
    },
    {
      id: 'client-3',
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      progress: {
        userId: 'client-3',
        strengthLevel: 3,
        cardioLevel: 4,
        flexibilityLevel: 3,
        balanceLevel: 3,
        coreLevel: 4,
        totalWorkouts: 8,
        totalSets: 96,
        totalReps: 580,
        totalWeight: 2400,
        totalExercises: 24,
        currentStreak: 2
      },
      lastWorkout: '2024-05-10'
    }
  ];

  useEffect(() => {
    checkMcpConnection();
    loadTrainerData();
  }, []);

  const checkMcpConnection = async () => {
    const isConnected = await checkMcpHealth();
    setMcpConnected(isConnected);
  };

  const loadTrainerData = async () => {
    // Load mock data for demonstration
    setClientsWithPlans(mockClientsWithPlans);
    
    // Calculate dashboard stats
    const stats = mockClientsWithPlans.reduce(
      (acc, client) => {
        if (client.currentPlan) acc.activePlans++;
        if (client.lastWorkout === '2024-05-13') acc.completedToday++;
        return acc;
      },
      { totalClients: mockClientsWithPlans.length, activePlans: 0, completedToday: 0, avgCompletionRate: 85 }
    );
    setDashboardStats(stats);
  };

  const handlePlanCreated = (plan: WorkoutPlan) => {
    setWorkoutPlans([...workoutPlans, plan]);
    setPlanBuilderOpen(false);
    loadTrainerData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
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

  const renderDashboard = () => (
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
        MCP Workout Server: {mcpConnected ? 'Connected' : 'Disconnected'}
      </Alert>

      {/* Dashboard Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ClientsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main">
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
              <AssignIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" color="secondary.main">
                {dashboardStats.activePlans}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Plans
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
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ProgressIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {dashboardStats.avgCompletionRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Completion
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
                Build new workout plan
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setClientSelectionOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">Assign Plan</Typography>
              <Typography variant="body2" color="text.secondary">
                Assign plan to clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setAnalyticsOpen(true)}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">View Analytics</Typography>
              <Typography variant="body2" color="text.secondary">
                Client progress reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Schedule Session</Typography>
              <Typography variant="body2" color="text.secondary">
                Book training session
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Workouts */}
      <Typography variant="h6" gutterBottom>
        Active Workouts
      </Typography>
      <Paper sx={{ p: 2 }}>
        {clientsWithPlans.filter(c => c.activeWorkout).length > 0 ? (
          <List>
            {clientsWithPlans.filter(c => c.activeWorkout).map((client) => (
              <ListItem key={client.id}>
                <ListItemAvatar>
                  <Avatar src={client.avatar}>
                    {client.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${client.name} - ${client.activeWorkout?.title}`}
                  secondary={`Started: ${new Date(client.activeWorkout!.startedAt!).toLocaleTimeString()}`}
                />
                <ListItemSecondaryAction>
                  <Badge color="warning" variant="dot">
                    <Chip
                      icon={<StartIcon />}
                      label="In Progress"
                      color="warning"
                      size="small"
                    />
                  </Badge>
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

  const renderClientManagement = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Client Management ({clientsWithPlans.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setClientSelectionOpen(true)}
        >
          Assign Plan
        </Button>
      </Box>

      <Grid container spacing={2}>
        {clientsWithPlans.map((client) => (
          <Grid item xs={12} md={6} lg={4} key={client.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar src={client.avatar} sx={{ mr: 2 }}>
                    {client.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{client.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {client.email}
                    </Typography>
                  </Box>
                  {client.activeWorkout && (
                    <Badge color="warning" variant="dot">
                      <WorkoutIcon color="warning" />
                    </Badge>
                  )}
                </Box>

                {client.currentPlan ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Current Plan
                    </Typography>
                    <Typography variant="body2" color="primary.main">
                      {client.currentPlan.name}
                    </Typography>
                    <Chip
                      label={client.currentPlan.goal}
                      color={getGoalColor(client.currentPlan.goal)}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No active plan
                    </Typography>
                  </Box>
                )}

                {client.progress && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Progress
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption">Workouts: {client.progress.totalWorkouts}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Streak: {client.progress.currentStreak} days</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Strength: {client.progress.strengthLevel}/10</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Cardio: {client.progress.cardioLevel}/10</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary">
                  Last workout: {client.lastWorkout ? new Date(client.lastWorkout).toLocaleDateString() : 'Never'}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => setSelectedClient(client)}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  startIcon={<AssignIcon />}
                  onClick={() => {
                    setSelectedClient(client);
                    setPlanBuilderOpen(true);
                  }}
                >
                  Assign Plan
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderPlanManagement = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          My Workout Plans ({workoutPlans.length})
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
              <TableCell>Created</TableCell>
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
                <TableCell>
                  {clientsWithPlans.find(c => c.id === plan.clientId)?.name || 'Unassigned'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={plan.status}
                    color={getStatusColor(plan.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(plan.startDate!).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Analytics">
                      <IconButton size="small" onClick={() => setAnalyticsOpen(true)}>
                        <AnalyticsIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {workoutPlans.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
          <AssignIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Workout Plans Created
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first workout plan to get started with client training.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setPlanBuilderOpen(true)}
          >
            Create First Plan
          </Button>
        </Paper>
      )}
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
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Dashboard" />
        <Tab label="Clients" />
        <Tab label="My Plans" />
        <Tab label="Analytics" />
      </Tabs>

      {/* Tab Content */}
      <Box role="tabpanel">
        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderClientManagement()}
        {activeTab === 2 && renderPlanManagement()}
        {activeTab === 3 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Workout Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detailed analytics and reporting tools for trainer insights.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => setAnalyticsOpen(true)}
            >
              View Full Analytics
            </Button>
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      
      {/* Workout Plan Builder Dialog */}
      <Dialog
        open={planBuilderOpen}
        onClose={() => setPlanBuilderOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <WorkoutPlanBuilder
            clientId={selectedClient?.id}
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
        <DialogTitle>Select Client for Plan Assignment</DialogTitle>
        <DialogContent>
          <ClientSelection
            onClientSelect={(client) => {
              setSelectedClient(client as any);
              setClientSelectionOpen(false);
              setPlanBuilderOpen(true);
            }}
            showDetails={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientSelectionOpen(false)}>Cancel</Button>
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
              Advanced Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive analytics including client progress tracking,
              plan effectiveness metrics, exercise performance analysis,
              and more detailed reporting features coming soon.
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

export default TrainerWorkoutManagement;