import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  TableContainer, 
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  BarChart as BarChartIcon, 
  Activity, 
  Trophy, 
  Users, 
  Search,
  ChevronUp,
  ChevronDown,
  Edit,
  Save,
  RefreshCw,
  Dumbbell,
  Heart,
  Zap,
  Check,
  X
} from 'lucide-react';

// Import MCP hooks
import { useAuth } from '../../../context/AuthContext';
import useClientDashboardMcp from '../../../hooks/useClientDashboardMcp';
import useGamificationMcp from '../../../hooks/useGamificationMcp';

// Import chart components
import ProgressAreaChart from '../../FitnessStats/charts/ProgressAreaChart';
import RadarProgressChart from '../../FitnessStats/charts/RadarProgressChart';
import BarProgressChart from '../../FitnessStats/charts/BarProgressChart';

// Tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Component for tab panels
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-progress-tabpanel-${index}`}
      aria-labelledby={`client-progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Accessibility props for tabs
function a11yProps(index: number) {
  return {
    id: `client-progress-tab-${index}`,
    'aria-controls': `client-progress-tabpanel-${index}`,
  };
}

/**
 * ClientProgressView Component
 * 
 * Displays progress information for clients, accessible by trainers.
 * Connects to both workout and gamification MCP servers for comprehensive progress tracking.
 * 
 * This component is designed to synchronize with the admin dashboard view for consistent
 * functionality and appearance across user roles. It uses the same MCP hooks for data retrieval
 * to ensure data consistency and implements the same tab structure (Fitness, Gamification, Recommendations).
 */
const ClientProgressView: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get progress data for the selected client
  const [clientProgress, setClientProgress] = useState<any>(null);
  const [clientGamification, setClientGamification] = useState<any>(null);
  
  // Load all clients
  useEffect(() => {
    // In a real implementation, this would fetch clients from an API
    // For now, we'll use mock data
    const mockClients = [
      { id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', photo: undefined },
      { id: '2', firstName: 'Jane', lastName: 'Smith', username: 'janesmith', photo: undefined },
      { id: '3', firstName: 'Bob', lastName: 'Johnson', username: 'bjohnson', photo: undefined },
      { id: '4', firstName: 'Alice', lastName: 'Williams', username: 'awilliams', photo: undefined },
    ];
    
    setClients(mockClients);
    
    // Select first client by default
    if (mockClients.length > 0 && !selectedClientId) {
      setSelectedClientId(mockClients[0].id);
    }
    
    setLoading(false);
  }, []);
  
  // Load client progress data when a client is selected
  useEffect(() => {
    if (!selectedClientId) return;
    
    setLoading(true);
    
    // In a real implementation, this would use the MCP hooks to fetch data
    // For now, we'll set mock data after a delay
    setTimeout(() => {
      // Clone the mock data from the workoutMcpService.ts file
      const mockProgressData = {
        lastUpdated: new Date().toISOString(),
        bodyStats: {
          weight: {
            current: 75.5,
            previous: 76.2,
            unit: 'kg'
          },
          bodyFat: {
            current: 18.2,
            previous: 19.5,
            unit: '%'
          },
          muscle: {
            current: 32.5,
            previous: 31.8,
            unit: 'kg'
          },
          bmi: {
            current: 24.2,
            previous: 24.5
          }
        },
        nasmProtocol: {
          overall: 72,
          categories: [
            { name: 'Core', level: 3, progress: 80 },
            { name: 'Balance', level: 2, progress: 65 },
            { name: 'Stabilization', level: 3, progress: 75 },
            { name: 'Flexibility', level: 2, progress: 60 },
            { name: 'Strength', level: 3, progress: 85 }
          ]
        },
        bodyParts: [
          { name: 'Chest', progress: 75 },
          { name: 'Back', progress: 80 },
          { name: 'Arms', progress: 65 },
          { name: 'Shoulders', progress: 60 },
          { name: 'Core', progress: 85 },
          { name: 'Legs', progress: 70 }
        ],
        keyExercises: [
          { name: 'Bench Press', current: 85, previous: 80, unit: 'kg', trend: 'up' },
          { name: 'Squat', current: 110, previous: 105, unit: 'kg', trend: 'up' },
          { name: 'Deadlift', current: 130, previous: 125, unit: 'kg', trend: 'up' },
          { name: 'Pull-ups', current: 12, previous: 10, unit: 'reps', trend: 'up' },
          { name: 'Overhead Press', current: 55, previous: 52.5, unit: 'kg', trend: 'up' },
          { name: 'Plank', current: 120, previous: 90, unit: 'sec', trend: 'up' }
        ],
        achievements: [
          'core-10', 
          'balance-10', 
          'flexibility-10', 
          'calisthenics-10', 
          'overall-50'
        ],
        achievementDates: {
          'core-10': '2024-04-15T10:00:00Z',
          'balance-10': '2024-04-20T15:30:00Z',
          'flexibility-10': '2024-04-25T09:15:00Z',
          'calisthenics-10': '2024-05-01T14:45:00Z',
          'overall-50': '2024-05-05T11:20:00Z'
        },
        workoutsCompleted: 45,
        totalExercisesPerformed: 548,
        streakDays: 5,
        totalMinutes: 2780,
        overallLevel: 8,
        experiencePoints: 2450,
        // NASM data formatted for chart visualization
        nasmProtocolData: [
          { name: 'Core', progress: 80 },
          { name: 'Balance', progress: 65 },
          { name: 'Stability', progress: 75 },
          { name: 'Flexibility', progress: 60 },
          { name: 'Calisthenics', progress: 85 },
          { name: 'Isolation', progress: 70 },
          { name: 'Stabilizers', progress: 68 }
        ],
        // Monthly progress data for charts
        monthlyProgress: [
          { month: 'Jan', weight: 78.5, strength: 60, cardio: 55, flexibility: 50 },
          { month: 'Feb', weight: 77.2, strength: 65, cardio: 58, flexibility: 53 },
          { month: 'Mar', weight: 76.8, strength: 67, cardio: 63, flexibility: 55 },
          { month: 'Apr', weight: 75.5, strength: 70, cardio: 67, flexibility: 60 },
          { month: 'May', weight: 75.0, strength: 73, cardio: 70, flexibility: 65 },
          { month: 'Jun', weight: 74.5, strength: 75, cardio: 72, flexibility: 68 }
        ]
      };
      
      // Mock gamification data
      const mockGamificationData = {
        profile: {
          level: 12,
          points: 2500,
          streak: 5,
          kindnessScore: 78,
          challengesCompleted: 8,
          questsCompleted: 15,
          powerups: 3,
          boosts: 2
        },
        achievements: [
          {
            id: 'achievement1',
            name: 'Workout Warrior',
            description: 'Complete 10 workouts',
            progress: 80,
            icon: 'dumbbell',
            color: '#00ffff'
          },
          {
            id: 'achievement2',
            name: 'Kindness Champion',
            description: 'Complete 5 kindness quests',
            progress: 100,
            completed: true,
            icon: 'heart',
            color: '#FF6B6B'
          },
          {
            id: 'achievement3',
            name: 'Social Butterfly',
            description: 'Connect with 3 other users',
            progress: 67,
            icon: 'users',
            color: '#7851a9'
          }
        ],
        challenges: [
          {
            id: 'challenge1',
            name: '30-Day Plank Challenge',
            description: 'Increase your plank time every day for 30 days',
            progress: 60,
            joined: true,
            participants: 128,
            endDate: '2025-05-30T00:00:00Z'
          },
          {
            id: 'challenge2',
            name: 'Nutrition Master',
            description: 'Log your meals for 14 consecutive days',
            progress: 0,
            joined: false,
            participants: 56,
            endDate: '2025-06-15T00:00:00Z'
          }
        ]
      };
      
      setClientProgress(mockProgressData);
      setClientGamification(mockGamificationData);
      setLoading(false);
    }, 1000);
  }, [selectedClientId]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Get the selected client
  const getSelectedClient = () => {
    return clients.find(client => client.id === selectedClientId);
  };
  
  // Filter clients by search term
  const getFilteredClients = () => {
    return clients.filter(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const username = client.username.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || username.includes(search);
    });
  };
  
  // Helper to get achievement name
  const getAchievementName = (achievementId: string) => {
    switch (achievementId) {
      case 'core-10': return 'Core Beginner';
      case 'balance-10': return 'Balanced Start';
      case 'flexibility-10': return 'First Stretch';
      case 'calisthenics-10': return 'Bodyweight Basics';
      case 'squats-10': return 'Squat Novice';
      case 'lunges-10': return 'Lunge Beginner';
      case 'planks-10': return 'Plank Starter';
      case 'overall-50': return 'Fitness Journey';
      default: return achievementId;
    }
  };
  
  // Render client list sidebar
  const renderClientList = () => {
    return (
      <Paper sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#E0E0E0' }}>Clients</Typography>
          
          <TextField
            fullWidth
            size="small"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8, color: '#A0A0A0' }} />,
              sx: { bgcolor: '#1d1f2b', color: '#E0E0E0' }
            }}
            sx={{ mb: 2, '& .MuiInputBase-root': { color: '#E0E0E0' }, '& .MuiInputLabel-root': { color: '#A0A0A0' } }}
          />
        </Box>
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {getFilteredClients().map((client) => (
            <Box 
              key={client.id}
              sx={{ 
                p: 2, 
                borderBottom: '1px solid', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: selectedClientId === client.id ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0, 255, 255, 0.1)',
                }
              }}
              onClick={() => setSelectedClientId(client.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 1 }}>
                  {client.firstName[0]}{client.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    {client.firstName} {client.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{client.username}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };
  
  // Render stats overview
  const renderStatsOverview = () => {
    if (!clientProgress) return null;
    
    const selectedClient = getSelectedClient();
    
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {selectedClient?.firstName} {selectedClient?.lastName}'s Progress
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Overall Progress
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #00ffff, #7851a9)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#1d1f2b',
                    mr: 2
                  }}
                >
                  <Typography variant="h4">{clientProgress.overallLevel}</Typography>
                  <Typography variant="caption">LEVEL</Typography>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Experience Level
                  </Typography>
                  
                  <Box sx={{ position: 'relative', height: 10, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 5, mb: 1 }}>
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        bottom: 0, 
                        width: `${Math.min(100, (clientProgress.experiencePoints / ((clientProgress.overallLevel + 1) * 1000)) * 100)}%`,
                        background: 'linear-gradient(90deg, #00ffff, #7851a9)',
                        borderRadius: 5
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {clientProgress.experiencePoints} / {(clientProgress.overallLevel + 1) * 1000} XP
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0, 255, 255, 0.1)' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Dumbbell color="#00ffff" size={24} style={{ marginBottom: 8 }} />
                      <Typography variant="h6">{clientProgress.workoutsCompleted}</Typography>
                      <Typography variant="body2" color="text.secondary">Workouts</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(120, 81, 169, 0.1)' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Zap color="#7851a9" size={24} style={{ marginBottom: 8 }} />
                      <Typography variant="h6">{clientProgress.streakDays}</Typography>
                      <Typography variant="body2" color="text.secondary">Streak</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 107, 107, 0.1)' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Activity color="#FF6B6B" size={24} style={{ marginBottom: 8 }} />
                      <Typography variant="h6">{clientProgress.totalExercisesPerformed}</Typography>
                      <Typography variant="body2" color="text.secondary">Exercises</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Heart color="#4CAF50" size={24} style={{ marginBottom: 8 }} />
                      <Typography variant="h6">{clientProgress.totalMinutes}</Typography>
                      <Typography variant="body2" color="text.secondary">Minutes</Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Achievements
                </Typography>
                
                <Chip 
                  label={`${clientProgress.achievements?.length || 0} Unlocked`} 
                  color="primary" 
                  size="small" 
                />
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Achievement</TableCell>
                      <TableCell>Date Unlocked</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      'core-10', 'balance-10', 'flexibility-10', 'calisthenics-10',
                      'squats-10', 'overall-50'
                    ].map((achievementId) => {
                      const isUnlocked = clientProgress.achievements?.includes(achievementId) || false;
                      const unlockDate = clientProgress.achievementDates?.[achievementId];
                      
                      return (
                        <TableRow key={achievementId}>
                          <TableCell>{getAchievementName(achievementId)}</TableCell>
                          <TableCell>
                            {unlockDate ? new Date(unlockDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell align="center">
                            {isUnlocked ? (
                              <Chip 
                                label="Unlocked" 
                                color="success" 
                                size="small" 
                                icon={<Check size={14} />} 
                              />
                            ) : (
                              <Chip 
                                label="Locked" 
                                color="default" 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Render fitness progress tab
  const renderFitnessProgress = () => {
    if (!clientProgress) return null;
    
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Progress Over Time
              </Typography>
              
              <ProgressAreaChart 
                data={clientProgress.monthlyProgress}
                xKey="month"
                yKeys={[
                  { key: 'strength', name: 'Strength', color: '#00ffff' },
                  { key: 'cardio', name: 'Cardio', color: '#FF6B6B' },
                  { key: 'flexibility', name: 'Flexibility', color: '#4CAF50' }
                ]}
                height={300}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                NASM Protocol Progress
              </Typography>
              
              <RadarProgressChart 
                data={clientProgress.nasmProtocolData}
                name="Progress"
                nameKey="name"
                dataKey="progress"
                height={300}
                color="#00ffff"
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Body Part Progress
              </Typography>
              
              <BarProgressChart 
                data={clientProgress.bodyParts}
                xKey="name"
                yKey="progress"
                height={300}
                horizontal={false}
                title=""
                colors={['#00ffff', '#7851a9', '#FF6B6B', '#4CAF50', '#FFC107', '#00bcd4']}
                labelKey="Body Part"
                valueFormatter={(value) => `${value}%`}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Key Exercise Progress
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Exercise</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Previous</TableCell>
                      <TableCell>Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientProgress.keyExercises.map((exercise: any) => (
                      <TableRow key={exercise.name}>
                        <TableCell>{exercise.name}</TableCell>
                        <TableCell>{exercise.current} {exercise.unit}</TableCell>
                        <TableCell>{exercise.previous} {exercise.unit}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {exercise.current > exercise.previous ? (
                              <>
                                <ChevronUp color="#4CAF50" size={16} />
                                <Typography color="#4CAF50">
                                  {(exercise.current - exercise.previous).toFixed(1)} {exercise.unit}
                                </Typography>
                              </>
                            ) : exercise.current < exercise.previous ? (
                              <>
                                <ChevronDown color="#FF6B6B" size={16} />
                                <Typography color="#FF6B6B">
                                  {(exercise.previous - exercise.current).toFixed(1)} {exercise.unit}
                                </Typography>
                              </>
                            ) : (
                              <Typography color="text.secondary">No change</Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Render gamification progress tab
  const renderGamificationProgress = () => {
    if (!clientGamification) return null;
    
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Gamification Profile
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #7851a9, #FF6B6B)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#1d1f2b',
                    mr: 2
                  }}
                >
                  <Typography variant="h4">{clientGamification.profile.level}</Typography>
                  <Typography variant="caption">LEVEL</Typography>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Gamification Stats
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Points:
                      </Typography>
                      <Typography variant="body1">
                        {clientGamification.profile.points}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Streak:
                      </Typography>
                      <Typography variant="body1">
                        {clientGamification.profile.streak} days
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Kindness Score:
                      </Typography>
                      <Typography variant="body1">
                        {clientGamification.profile.kindnessScore}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Quests Completed:
                      </Typography>
                      <Typography variant="body1">
                        {clientGamification.profile.questsCompleted}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Active Challenges
              </Typography>
              
              {clientGamification.challenges.length > 0 ? (
                <Box>
                  {clientGamification.challenges.map((challenge: any) => (
                    <Box key={challenge.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1">
                          {challenge.name}
                        </Typography>
                        
                        <Chip 
                          label={challenge.joined ? 'Joined' : 'Not Joined'} 
                          color={challenge.joined ? 'primary' : 'default'} 
                          size="small" 
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {challenge.description}
                      </Typography>
                      
                      <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, mb: 1 }}>
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            left: 0, 
                            top: 0, 
                            bottom: 0, 
                            width: `${challenge.progress}%`,
                            bgcolor: challenge.joined ? 'primary.main' : 'text.disabled',
                            borderRadius: 4
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          {challenge.progress}% complete
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          {challenge.participants} participants
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body1" sx={{ py: 2 }}>
                  No active challenges
                </Typography>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Achievements
              </Typography>
              
              <Grid container spacing={2}>
                {clientGamification.achievements.map((achievement: any) => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                      }}
                    >
                      <Box 
                        sx={{ 
                          mb: 2,
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: `${achievement.color}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {achievement.icon === 'heart' ? (
                          <Heart size={30} color={achievement.color} />
                        ) : achievement.icon === 'users' ? (
                          <Users size={30} color={achievement.color} />
                        ) : (
                          <Trophy size={30} color={achievement.color} />
                        )}
                      </Box>
                      
                      <Typography variant="subtitle1" gutterBottom>
                        {achievement.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {achievement.description}
                      </Typography>
                      
                      {achievement.completed ? (
                        <Chip 
                          label="Completed" 
                          color="success" 
                          size="small" 
                          icon={<Check size={14} />}
                          sx={{ mt: 'auto' }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', mt: 'auto' }}>
                          <Box sx={{ position: 'relative', height: 6, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, mb: 1 }}>
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                width: `${achievement.progress}%`,
                                bgcolor: achievement.color,
                                borderRadius: 3
                              }}
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary">
                            {achievement.progress}% complete
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Render recommendations tab
  const renderRecommendations = () => {
    if (!clientProgress || !clientGamification) return null;
    
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
              <Typography variant="h6" gutterBottom>
                Trainer Recommendations
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Focus Areas
                </Typography>
                
                <Grid container spacing={2}>
                  {clientProgress.bodyParts
                    .sort((a: any, b: any) => a.progress - b.progress)
                    .slice(0, 3)
                    .map((part: any) => (
                      <Grid item xs={12} sm={4} key={part.name}>
                        <Box 
                          sx={{ 
                            p: 2, 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: 1,
                            textAlign: 'center'
                          }}
                        >
                          <Typography variant="body1" gutterBottom>
                            {part.name}
                          </Typography>
                          
                          <Box sx={{ position: 'relative', height: 6, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, mb: 1 }}>
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                width: `${part.progress}%`,
                                bgcolor: part.progress < 50 ? '#FF6B6B' : part.progress < 70 ? '#FFC107' : '#4CAF50',
                                borderRadius: 3
                              }}
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary">
                            {part.progress}% progress
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                </Grid>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Personalized Program Suggestions
                </Typography>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    border: '1px solid rgba(0, 255, 255, 0.2)', 
                    borderRadius: 1,
                    mb: 2,
                    bgcolor: 'rgba(0, 255, 255, 0.05)'
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Based on NASM Protocol Progress
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Client should focus on improving flexibility and balance training to create a more balanced fitness profile.
                    Their strength metrics are good, but mobility work would help prevent potential injuries.
                  </Typography>
                  
                  <Button variant="outlined" size="small" color="primary">
                    Create Flexibility Program
                  </Button>
                </Box>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    border: '1px solid rgba(120, 81, 169, 0.2)', 
                    borderRadius: 1,
                    mb: 2,
                    bgcolor: 'rgba(120, 81, 169, 0.05)'
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Based on Exercise Performance
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Client shows great progress in compound movements but could benefit from more focused
                    work on shoulders and arms to address imbalances in these areas.
                  </Typography>
                  
                  <Button variant="outlined" size="small" color="secondary">
                    Create Upper Body Program
                  </Button>
                </Box>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    border: '1px solid rgba(255, 107, 107, 0.2)', 
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 107, 107, 0.05)'
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Based on Gamification Engagement
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Client responds well to achievement-based motivation. Consider creating more 
                    milestone-based goals to increase engagement with their program.
                  </Typography>
                  
                  <Button variant="outlined" size="small" color="error">
                    Create Achievement Plan
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Client Progress Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage client progression through the fitness program
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {renderClientList()}
          </Grid>
          
          <Grid item xs={12} md={9}>
            {selectedClientId ? (
              <>
                <Box sx={{ mb: 3 }}>
                  {renderStatsOverview()}
                </Box>
                
                <Box sx={{ width: '100%', mb: 3 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                      value={tabValue} 
                      onChange={handleTabChange}
                      aria-label="client progress tabs"
                    >
                      <Tab 
                        label="Fitness Progress" 
                        icon={<Activity size={18} />} 
                        iconPosition="start" 
                        {...a11yProps(0)} 
                      />
                      <Tab 
                        label="Gamification" 
                        icon={<Trophy size={18} />} 
                        iconPosition="start" 
                        {...a11yProps(1)} 
                      />
                      <Tab 
                        label="Recommendations" 
                        icon={<Dumbbell size={18} />} 
                        iconPosition="start" 
                        {...a11yProps(2)} 
                      />
                    </Tabs>
                  </Box>
                  
                  <TabPanel value={tabValue} index={0}>
                    {renderFitnessProgress()}
                  </TabPanel>
                  
                  <TabPanel value={tabValue} index={1}>
                    {renderGamificationProgress()}
                  </TabPanel>
                  
                  <TabPanel value={tabValue} index={2}>
                    {renderRecommendations()}
                  </TabPanel>
                </Box>
              </>
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '300px',
                  bgcolor: '#1d1f2b',
                  borderRadius: 1,
                  p: 3
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Select a client to view their progress
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ClientProgressView;