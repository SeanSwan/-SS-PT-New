import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Alert,
  Tabs,
  Tab,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  FitnessCenter as WorkoutIcon,
  TrendingUp as ProgressIcon,
  Assignment as PlanIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  currentPlan?: {
    id: string;
    name: string;
    progress: number;
    startDate: string;
    endDate: string;
  };
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    lastWorkout: string;
  };
  goals: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
}

interface ClientSelectionProps {
  onClientSelect: (client: Client) => void;
  selectedClients?: string[];
  multiSelect?: boolean;
  showDetails?: boolean;
  filterOptions?: {
    status?: string[];
    level?: string[];
    hasActivePlan?: boolean;
  };
}

const ClientSelection: React.FC<ClientSelectionProps> = ({
  onClientSelect,
  selectedClients = [],
  multiSelect = false,
  showDetails = true,
  filterOptions = {}
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    level: '',
    hasActivePlan: ''
  });

  // Mock clients data for demo
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1 (555) 123-4567',
      joinDate: '2024-01-15',
      status: 'active',
      currentPlan: {
        id: 'plan-1',
        name: 'Strength Building Program',
        progress: 75,
        startDate: '2024-03-01',
        endDate: '2024-05-01'
      },
      stats: {
        totalWorkouts: 48,
        currentStreak: 12,
        lastWorkout: '2024-05-10'
      },
      goals: ['Strength', 'Muscle Building'],
      level: 'intermediate'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '+1 (555) 234-5678',
      joinDate: '2024-02-20',
      status: 'active',
      currentPlan: {
        id: 'plan-2',
        name: 'Weight Loss Journey',
        progress: 40,
        startDate: '2024-04-01',
        endDate: '2024-06-01'
      },
      stats: {
        totalWorkouts: 32,
        currentStreak: 8,
        lastWorkout: '2024-05-11'
      },
      goals: ['Weight Loss', 'Endurance'],
      level: 'beginner'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@email.com',
      phone: '+1 (555) 345-6789',
      joinDate: '2024-03-10',
      status: 'active',
      stats: {
        totalWorkouts: 15,
        currentStreak: 5,
        lastWorkout: '2024-05-09'
      },
      goals: ['General Fitness'],
      level: 'beginner'
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@email.com',
      joinDate: '2023-12-01',
      status: 'active',
      currentPlan: {
        id: 'plan-3',
        name: 'Advanced Athlete Training',
        progress: 90,
        startDate: '2024-02-15',
        endDate: '2024-04-15'
      },
      stats: {
        totalWorkouts: 85,
        currentStreak: 25,
        lastWorkout: '2024-05-12'
      },
      goals: ['Performance', 'Strength', 'Agility'],
      level: 'advanced'
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david.brown@email.com',
      joinDate: '2024-04-05',
      status: 'pending',
      stats: {
        totalWorkouts: 2,
        currentStreak: 0,
        lastWorkout: '2024-04-07'
      },
      goals: ['Rehabilitation'],
      level: 'beginner'
    }
  ];

  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients based on search and filters
  useEffect(() => {
    let filtered = clients;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(client => client.status === filters.status);
    }

    // Level filter
    if (filters.level) {
      filtered = filtered.filter(client => client.level === filters.level);
    }

    // Has active plan filter
    if (filters.hasActivePlan === 'yes') {
      filtered = filtered.filter(client => !!client.currentPlan);
    } else if (filters.hasActivePlan === 'no') {
      filtered = filtered.filter(client => !client.currentPlan);
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, filters]);

  const loadClients = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the backend API
      // For now, we'll use mock data
      setClients(mockClients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (client: Client) => {
    if (multiSelect) {
      onClientSelect(client);
    } else {
      setSelectedClient(client);
      if (showDetails) {
        setDetailsOpen(true);
      } else {
        onClientSelect(client);
      }
    }
  };

  const isClientSelected = (clientId: string) => {
    return selectedClients.includes(clientId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'info';
      case 'intermediate': return 'primary';
      case 'advanced': return 'secondary';
      default: return 'default';
    }
  };

  const categorizedClients = {
    active: filteredClients.filter(c => c.status === 'active'),
    withPlans: filteredClients.filter(c => c.currentPlan),
    withoutPlans: filteredClients.filter(c => !c.currentPlan),
    pending: filteredClients.filter(c => c.status === 'pending')
  };

  const renderClientCard = (client: Client) => (
    <Card
      key={client.id}
      sx={{
        cursor: 'pointer',
        border: isClientSelected(client.id) ? '2px solid' : '1px solid',
        borderColor: isClientSelected(client.id) ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-2px)',
          transition: 'all 0.3s ease'
        }
      }}
      onClick={() => handleClientClick(client)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            src={client.avatar}
            sx={{ width: 56, height: 56, mr: 2 }}
          >
            {client.name.charAt(0)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h3">
              {client.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {client.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={client.status}
                color={getStatusColor(client.status)}
                size="small"
              />
              <Chip
                label={client.level}
                color={getLevelColor(client.level)}
                size="small"
              />
            </Box>
          </Box>
          {multiSelect && (
            <Checkbox
              checked={isClientSelected(client.id)}
              onChange={(e) => {
                e.stopPropagation();
                onClientSelect(client);
              }}
            />
          )}
        </Box>

        {client.currentPlan && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Plan: {client.currentPlan.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption">Progress:</Typography>
              <Badge
                badgeContent={`${client.currentPlan.progress}%`}
                color="primary"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <ProgressIcon color="action" />
              </Badge>
            </Box>
          </Box>
        )}

        <Grid container spacing={1}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                {client.stats.totalWorkouts}
              </Typography>
              <Typography variant="caption">Workouts</Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="secondary.main">
                {client.stats.currentStreak}
              </Typography>
              <Typography variant="caption">Day Streak</Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Last Workout
              </Typography>
              <Typography variant="body2">
                {new Date(client.stats.lastWorkout).toLocaleDateString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Goals:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {client.goals.map((goal, index) => (
              <Chip
                key={index}
                label={goal}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button
          size="small"
          startIcon={<PersonIcon />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClient(client);
            setDetailsOpen(true);
          }}
        >
          Details
        </Button>
        {!multiSelect && (
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              onClientSelect(client);
            }}
          >
            Select
          </Button>
        )}
      </CardActions>
    </Card>
  );

  const renderClientList = (clientList: Client[], title: string) => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        {title} ({clientList.length})
      </Typography>
      <Grid container spacing={2}>
        {clientList.map((client) => (
          <Grid item xs={12} md={6} lg={4} key={client.id}>
            {renderClientCard(client)}
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Select Client{multiSelect ? 's' : ''}
        </Typography>
        {selectedClients.length > 0 && multiSelect && (
          <Chip
            label={`${selectedClients.length} selected`}
            color="primary"
            icon={<CheckCircle />}
          />
        )}
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={filters.level}
                label="Level"
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Has Plan</InputLabel>
              <Select
                value={filters.hasActivePlan}
                label="Has Plan"
                onChange={(e) => setFilters({ ...filters, hasActivePlan: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="yes">With Plan</MenuItem>
                <MenuItem value="no">No Plan</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`All Clients (${filteredClients.length})`} />
        <Tab label={`Active (${categorizedClients.active.length})`} />
        <Tab label={`With Plans (${categorizedClients.withPlans.length})`} />
        <Tab label={`No Plans (${categorizedClients.withoutPlans.length})`} />
      </Tabs>

      {/* Client Grid */}
      {activeTab === 0 && renderClientList(filteredClients, 'All Clients')}
      {activeTab === 1 && renderClientList(categorizedClients.active, 'Active Clients')}
      {activeTab === 2 && renderClientList(categorizedClients.withPlans, 'Clients with Active Plans')}
      {activeTab === 3 && renderClientList(categorizedClients.withoutPlans, 'Clients without Plans')}

      {/* Client Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedClient && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedClient.avatar}
                  sx={{ width: 56, height: 56 }}
                >
                  {selectedClient.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {selectedClient.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member since {new Date(selectedClient.joinDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Contact Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <EmailIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Email"
                        secondary={selectedClient.email}
                      />
                    </ListItem>
                    {selectedClient.phone && (
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <PhoneIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Phone"
                          secondary={selectedClient.phone}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Fitness Profile
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Level: {selectedClient.level}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {selectedClient.status}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Goals:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedClient.goals.map((goal, index) => (
                      <Chip key={index} label={goal} variant="outlined" />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Workout Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <WorkoutIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                          <Typography variant="h4" color="primary.main">
                            {selectedClient.stats.totalWorkouts}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Workouts
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <ScheduleIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                          <Typography variant="h4" color="secondary.main">
                            {selectedClient.stats.currentStreak}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Current Streak
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <CompleteIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                          <Typography variant="h6" color="success.main">
                            {new Date(selectedClient.stats.lastWorkout).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Last Workout
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                {selectedClient.currentPlan && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Current Workout Plan
                    </Typography>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">
                          {selectedClient.currentPlan.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {new Date(selectedClient.currentPlan.startDate).toLocaleDateString()} - {new Date(selectedClient.currentPlan.endDate).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2">
                            Progress: {selectedClient.currentPlan.progress}%
                          </Typography>
                          <Chip
                            icon={<PlanIcon />}
                            label={`${selectedClient.currentPlan.progress}% Complete`}
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  onClientSelect(selectedClient);
                  setDetailsOpen(false);
                }}
              >
                Select Client
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ClientSelection;