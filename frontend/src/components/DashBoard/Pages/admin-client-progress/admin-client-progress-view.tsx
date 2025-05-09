import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { ClientProgressData, LeaderboardEntry } from '../../../../services/client-progress-service';
import { Exercise } from '../../../../services/exercise-service';

// Import MUI components
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Tab,
  Tabs,
  Divider,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Tooltip
} from '@mui/material';

// Import icons
import {
  ChevronUp,
  ChevronDown,
  Award,
  Search,
  User,
  UserCheck,
  UserPlus,
  Filter,
  BarChart2,
  RefreshCcw,
  Edit,
  Save,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  Activity,
  Heart,
  ArrowUpRight,
  Dumbbell,
  Trophy
} from 'lucide-react';

// Import styled component from MainCard
import MainCard from '../../../ui/MainCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

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
        <Box sx={{ p: 3, bgcolor: '#0A0A0A', color: '#E0E0E0' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `client-progress-tab-${index}`,
    'aria-controls': `client-progress-tabpanel-${index}`,
  };
}

/**
 * Admin Client Progress View Component
 * Dashboard for trainers and admins to monitor client progress in the NASM protocol system
 */
const AdminClientProgressView: React.FC = () => {
  const { authAxios, user, services } = useAuth();
  const { toast } = useToast();

  // Client state
  const [clients, setClients] = useState<{ id: string; firstName: string; lastName: string; username: string; photo?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientProgress, setClientProgress] = useState<ClientProgressData | null>(null);
  const [recommendedExercises, setRecommendedExercises] = useState<Exercise[]>([]);
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientProgressData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{ category: string; level: string }>({
    category: 'all',
    level: 'all'
  });

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch client progress when selected client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProgress(selectedClientId);
      fetchRecommendedExercises(selectedClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Fetch clients from API
  const fetchClients = async () => {
    setLoading(true);
    try {
      // This endpoint would be in userManagementRoutes.mjs
      const response = await authAxios.get('/api/auth/clients');
      if (response.data && response.data.success) {
        setClients(response.data.clients);
        
        // Select first client if no client is selected
        if (response.data.clients.length > 0 && !selectedClientId) {
          setSelectedClientId(response.data.clients[0].id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch clients.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast({
        title: "Error",
        description: "Failed to fetch clients. Please try again.",
        variant: "destructive"
      });
      
      // For demo purposes, set mock data
      const mockClients = [
        { id: '1', firstName: 'John', lastName: 'Doe', username: 'johndoe', photo: undefined },
        { id: '2', firstName: 'Jane', lastName: 'Smith', username: 'janesmith', photo: undefined },
        { id: '3', firstName: 'Bob', lastName: 'Johnson', username: 'bjohnson', photo: undefined },
        { id: '4', firstName: 'Alice', lastName: 'Williams', username: 'awilliams', photo: undefined },
      ];
      setClients(mockClients);
      if (!selectedClientId && mockClients.length > 0) {
        setSelectedClientId(mockClients[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch client progress from API
  const fetchClientProgress = async (clientId: string) => {
    setLoading(true);
    try {
      const result = await services.clientProgress.getClientProgressById(clientId);
      if (result && result.success) {
        setClientProgress(result.progress);
        setEditForm(result.progress);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch client progress.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error fetching client progress:', err);
      toast({
        title: "Error",
        description: "Failed to fetch client progress. Please try again.",
        variant: "destructive"
      });
      
      // For demo purposes, set mock data
      const mockProgress: ClientProgressData = {
        id: 'mock-progress-id',
        userId: clientId,
        overallLevel: 27,
        experiencePoints: 65,
        coreLevel: 35,
        balanceLevel: 22,
        stabilityLevel: 28,
        flexibilityLevel: 40,
        calisthenicsLevel: 30,
        isolationLevel: 18,
        stabilizersLevel: 25,
        injuryPreventionLevel: 15,
        injuryRecoveryLevel: 10,
        glutesLevel: 38,
        calfsLevel: 25,
        shouldersLevel: 30,
        hamstringsLevel: 35,
        absLevel: 42,
        chestLevel: 28,
        bicepsLevel: 32,
        tricepsLevel: 29,
        tibialisAnteriorLevel: 15,
        serratusAnteriorLevel: 18,
        latissimusDorsiLevel: 26,
        hipsLevel: 33,
        lowerBackLevel: 27,
        wristsForearmLevel: 20,
        neckLevel: 15,
        squatsLevel: 45,
        lungesLevel: 32,
        planksLevel: 40,
        reversePlanksLevel: 28,
        achievements: ['core-10', 'balance-10', 'flexibility-10', 'calisthenics-10', 'squats-10', 'lunges-10', 'planks-10'],
        achievementDates: {
          'core-10': '2024-02-15T00:00:00.000Z',
          'balance-10': '2024-03-02T00:00:00.000Z',
          'flexibility-10': '2024-02-20T00:00:00.000Z',
          'calisthenics-10': '2024-03-10T00:00:00.000Z',
          'squats-10': '2024-02-10T00:00:00.000Z',
          'lunges-10': '2024-02-25T00:00:00.000Z',
          'planks-10': '2024-03-05T00:00:00.000Z'
        },
        progressNotes: 'Client is making steady progress in all areas. Showing good form in compound movements.',
        unlockedExercises: [],
        workoutsCompleted: 12,
        totalExercisesPerformed: 156,
        streakDays: 3,
        totalMinutes: 420,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-04-15T00:00:00.000Z'
      };
      setClientProgress(mockProgress);
      setEditForm(mockProgress);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommended exercises for client
  const fetchRecommendedExercises = async (clientId: string) => {
    try {
      const result = await services.exercise.getRecommendedExercises(clientId);
      if (result && result.success) {
        setRecommendedExercises(result.recommendedExercises);
      } else {
        console.warn('Failed to fetch recommended exercises');
      }
    } catch (err) {
      console.error('Error fetching recommended exercises:', err);
      
      // For demo purposes, set mock data
      const mockExercises: Exercise[] = [
        {
          id: '1',
          name: 'Bodyweight Squats',
          description: 'A fundamental lower body exercise',
          instructions: '1. Stand with feet shoulder-width apart\n2. Lower body by bending knees\n3. Return to standing',
          exerciseType: 'core',
          primaryMuscles: ['Glutes', 'Quadriceps'],
          difficulty: 10,
          unlockLevel: 0,
          isActive: true,
          isPopular: true,
          experiencePointsEarned: 10,
          canBePerformedAtHome: true,
          recommendedSets: 3,
          recommendedReps: 15
        },
        {
          id: '2',
          name: 'Bird Dog',
          description: 'Core stabilization exercise',
          instructions: '1. Start on hands and knees\n2. Extend opposite arm and leg\n3. Return to start position\n4. Repeat on other side',
          exerciseType: 'core',
          primaryMuscles: ['Core', 'Lower Back'],
          difficulty: 15,
          unlockLevel: 5,
          isActive: true,
          isPopular: false,
          experiencePointsEarned: 15,
          canBePerformedAtHome: true,
          recommendedSets: 3,
          recommendedReps: 10
        },
        {
          id: '3',
          name: 'Standing Hamstring Stretch',
          description: 'Improves hamstring flexibility',
          instructions: '1. Stand tall\n2. Place one foot forward with heel on ground\n3. Bend forward slightly at hips\n4. Hold, then switch sides',
          exerciseType: 'flexibility',
          primaryMuscles: ['Hamstrings'],
          secondaryMuscles: ['Lower Back'],
          difficulty: 5,
          unlockLevel: 0,
          isActive: true,
          isPopular: false,
          experiencePointsEarned: 5,
          canBePerformedAtHome: true,
          recommendedSets: 2,
          recommendedDuration: 30
        }
      ];
      setRecommendedExercises(mockExercises);
    }
  };

  // Fetch leaderboard from API
  const fetchLeaderboard = async () => {
    try {
      const result = await services.clientProgress.getLeaderboard();
      if (result && result.success) {
        setLeaderboard(result.leaderboard);
      } else {
        console.warn('Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      
      // For demo purposes, set mock data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          overallLevel: 52,
          userId: 'user1',
          client: { id: 'user1', firstName: 'Michael', lastName: 'Johnson', username: 'mjohnson' }
        },
        {
          overallLevel: 48,
          userId: 'user2',
          client: { id: 'user2', firstName: 'Sarah', lastName: 'Williams', username: 'swilliams' }
        },
        {
          overallLevel: 45,
          userId: 'user3',
          client: { id: 'user3', firstName: 'David', lastName: 'Brown', username: 'dbrown' }
        },
        {
          overallLevel: 42,
          userId: 'user4',
          client: { id: 'user4', firstName: 'Emma', lastName: 'Davis', username: 'edavis' }
        },
        {
          overallLevel: 38,
          userId: 'user5',
          client: { id: 'user5', firstName: 'James', lastName: 'Wilson', username: 'jwilson' }
        }
      ];
      setLeaderboard(mockLeaderboard);
    }
  };

  // Update client progress
  const updateClientProgress = async () => {
    if (!selectedClientId || !editForm) return;

    try {
      const result = await services.clientProgress.updateClientProgressById(selectedClientId, editForm);
      if (result && result.success) {
        setClientProgress(result.progress);
        setEditForm(result.progress);
        setShowEditDialog(false);
        toast({
          title: "Success",
          description: "Client progress updated successfully.",
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update client progress.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error updating client progress:', err);
      toast({
        title: "Error",
        description: "Failed to update client progress. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle edit form changes
  const handleEditFormChange = (field: keyof ClientProgressData, value: number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle adding achievement
  const handleAddAchievement = (achievementId: string) => {
    if (!editForm || !editForm.achievements) return;
    
    if (!editForm.achievements.includes(achievementId)) {
      const newAchievements = [...editForm.achievements, achievementId];
      const newAchievementDates = {
        ...editForm.achievementDates,
        [achievementId]: new Date().toISOString()
      };
      
      setEditForm(prev => ({
        ...prev,
        achievements: newAchievements,
        achievementDates: newAchievementDates
      }));
    }
  };

  // Handle removing achievement
  const handleRemoveAchievement = (achievementId: string) => {
    if (!editForm || !editForm.achievements) return;
    
    if (editForm.achievements.includes(achievementId)) {
      const newAchievements = editForm.achievements.filter(id => id !== achievementId);
      const newAchievementDates = { ...editForm.achievementDates };
      
      if (newAchievementDates && newAchievementDates[achievementId]) {
        delete newAchievementDates[achievementId];
      }
      
      setEditForm(prev => ({
        ...prev,
        achievements: newAchievements,
        achievementDates: newAchievementDates
      }));
    }
  };

  // Get filtered and searched clients
  const getFilteredClients = () => {
    if (!clients) return [];
    
    return clients.filter(client => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const username = client.username.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return fullName.includes(search) || username.includes(search);
    });
  };

  // Get client by ID
  const getClientById = (clientId: string) => {
    return clients.find(client => client.id === clientId);
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

  // Helper to get NASM category name
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'core': return 'Core';
      case 'balance': return 'Balance';
      case 'stability': return 'Stability';
      case 'flexibility': return 'Flexibility';
      case 'calisthenics': return 'Calisthenics';
      case 'isolation': return 'Isolation';
      case 'stabilizers': return 'Stabilizers';
      case 'injury_prevention': return 'Injury Prevention';
      case 'injury_recovery': return 'Injury Recovery';
      default: return category;
    }
  };

  // Helper to get level name
  const getLevelName = (level: number): string => {
    if (level < 10) return 'Fitness Novice';
    if (level < 25) return 'Fitness Beginner';
    if (level < 50) return 'Fitness Enthusiast';
    if (level < 100) return 'Fitness Adept';
    if (level < 200) return 'Fitness Specialist';
    if (level < 350) return 'Fitness Expert';
    if (level < 500) return 'Fitness Master';
    if (level < 750) return 'Fitness Elite';
    return 'Fitness Champion';
  };

  // Render the selected client's progress
  const renderClientProgress = () => {
    if (!clientProgress) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#A0A0A0' }}>
          <Typography>Select a client to view their progress</Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">
            {getClientById(clientProgress.userId)?.firstName} {getClientById(clientProgress.userId)?.lastName}'s Progress
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Edit />}
            onClick={() => setShowEditDialog(true)}
          >
            Edit Progress
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Overall Level Card */}
          <Grid item xs={12} md={6}>
            <MainCard title="Overall Progress" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #00ffff, #00B4D8)', 
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
                  <Typography variant="h6">{getLevelName(clientProgress.overallLevel)}</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, (clientProgress.experiencePoints / (100 + (clientProgress.overallLevel * 25))) * 100)} 
                    sx={{ mt: 1, mb: 0.5, height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">{clientProgress.experiencePoints} XP</Typography>
                    <Typography variant="caption">Next: {clientProgress.overallLevel + 1}</Typography>
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#1A1C33' }}>
                    <Typography variant="h6">{clientProgress.workoutsCompleted}</Typography>
                    <Typography variant="body2" sx={{ color: '#A0A0A0' }}>Workouts</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#1E1E1E' }}>
                    <Typography variant="h6">{clientProgress.streakDays}</Typography>
                    <Typography variant="body2" sx={{ color: '#A0A0A0' }}>Day Streak</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#1E1E1E' }}>
                    <Typography variant="h6">{clientProgress.totalExercisesPerformed}</Typography>
                    <Typography variant="body2" sx={{ color: '#A0A0A0' }}>Exercises</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#1E1E1E' }}>
                    <Typography variant="h6">{clientProgress.totalMinutes}</Typography>
                    <Typography variant="body2" sx={{ color: '#A0A0A0' }}>Minutes</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          {/* Achievements Card */}
          <Grid item xs={12} md={6}>
            <MainCard 
              title="Achievements" 
              sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}
              secondary={
                <Chip 
                  label={`${clientProgress.achievements?.length || 0}/8`} 
                  color="primary" 
                  size="small" 
                />
              }
            >
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#1d1f2b', borderRadius: 1 }}>
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
                      'squats-10', 'lunges-10', 'planks-10', 'overall-50'
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
            </MainCard>
          </Grid>

          {/* NASM Category Levels */}
          <Grid item xs={12} md={6}>
            <MainCard title="NASM Protocol Progress" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
              <TableContainer sx={{ bgcolor: '#1d1f2b', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Progress</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { type: 'core', field: 'coreLevel' },
                      { type: 'balance', field: 'balanceLevel' },
                      { type: 'stability', field: 'stabilityLevel' },
                      { type: 'flexibility', field: 'flexibilityLevel' },
                      { type: 'calisthenics', field: 'calisthenicsLevel' },
                      { type: 'isolation', field: 'isolationLevel' },
                      { type: 'stabilizers', field: 'stabilizersLevel' },
                      { type: 'injury_prevention', field: 'injuryPreventionLevel' },
                      { type: 'injury_recovery', field: 'injuryRecoveryLevel' }
                    ].map((category) => (
                      <TableRow key={category.type}>
                        <TableCell>{getCategoryName(category.type)}</TableCell>
                        <TableCell>{clientProgress[category.field as keyof ClientProgressData] as number}</TableCell>
                        <TableCell sx={{ width: '40%' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, Math.max(0, Math.random() * 100))} 
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </MainCard>
          </Grid>

          {/* Key Exercise Levels */}
          <Grid item xs={12} md={6}>
            <MainCard title="Key Exercise Progress" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
              <TableContainer sx={{ bgcolor: '#1d1f2b', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Exercise</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Progress</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { name: 'Squats', field: 'squatsLevel' },
                      { name: 'Lunges', field: 'lungesLevel' },
                      { name: 'Planks', field: 'planksLevel' },
                      { name: 'Reverse Planks', field: 'reversePlanksLevel' }
                    ].map((exercise) => (
                      <TableRow key={exercise.field}>
                        <TableCell>{exercise.name}</TableCell>
                        <TableCell>{clientProgress[exercise.field as keyof ClientProgressData] as number}</TableCell>
                        <TableCell sx={{ width: '40%' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, Math.max(0, Math.random() * 100))} 
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </MainCard>
          </Grid>

          {/* Recommended Exercises */}
          <Grid item xs={12}>
            <MainCard 
              title="Recommended Exercises" 
              sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}
              secondary={
                <Button 
                  variant="text" 
                  startIcon={<RefreshCcw size={16} />}
                  onClick={() => fetchRecommendedExercises(clientProgress.userId)}
                >
                  Refresh
                </Button>
              }
            >
              <TableContainer sx={{ bgcolor: '#1A1C33', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Exercise Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Primary Muscles</TableCell>
                      <TableCell>Sets/Reps</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recommendedExercises.slice(0, 5).map((exercise) => (
                      <TableRow key={exercise.id}>
                        <TableCell>{exercise.name}</TableCell>
                        <TableCell>{getCategoryName(exercise.exerciseType)}</TableCell>
                        <TableCell>{exercise.difficulty}</TableCell>
                        <TableCell>{exercise.primaryMuscles.join(', ')}</TableCell>
                        <TableCell>
                          {exercise.recommendedSets || 3} × {exercise.recommendedReps || 10}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </MainCard>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <MainCard title="Trainer Notes" sx={{ bgcolor: '#1d1f2b', boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {clientProgress.progressNotes || 'No notes available.'}
              </Typography>
            </MainCard>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Render the leaderboard tab
  const renderLeaderboard = () => {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2, color: '#E0E0E0' }}>Client Progress Leaderboard</Typography>
        
        <TableContainer component={Paper} sx={{ bgcolor: '#1d1f2b', borderRadius: 1, boxShadow: '0 4px 12px rgba(0, 0, 20, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <TableRow key={entry.userId}>
                  <TableCell>
                    <Typography variant="h6">{index + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1 }}>
                        {entry.client.firstName[0]}{entry.client.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          {entry.client.firstName} {entry.client.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{entry.client.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          backgroundColor: 'primary.main', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white',
                          mr: 1
                        }}
                      >
                        {entry.overallLevel}
                      </Box>
                      <Box>
                        <Typography variant="body2">
                          {getLevelName(entry.overallLevel)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={entry.overallLevel > 40 ? 'Advanced' : entry.overallLevel > 20 ? 'Intermediate' : 'Beginner'} 
                      color={entry.overallLevel > 40 ? 'success' : entry.overallLevel > 20 ? 'primary' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => setSelectedClientId(entry.userId)}
                    >
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
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

  // Render the edit dialog
  const renderEditDialog = () => {
    if (!editForm) return null;

    return (
      <Dialog 
        open={showEditDialog} 
        onClose={() => setShowEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#121212', color: '#E0E0E0' }}>
          Edit Client Progress
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#121212', color: '#E0E0E0', pt: 3 }}>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Overall Level */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Overall Progress</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Overall Level"
                    type="number"
                    value={editForm.overallLevel || 0}
                    onChange={(e) => handleEditFormChange('overallLevel', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0, max: 1000 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Experience Points"
                    type="number"
                    value={editForm.experiencePoints || 0}
                    onChange={(e) => handleEditFormChange('experiencePoints', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Activity Stats */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Activity Statistics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Workouts Completed"
                    type="number"
                    value={editForm.workoutsCompleted || 0}
                    onChange={(e) => handleEditFormChange('workoutsCompleted', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0 },
                      sx: { bgcolor: '#1d1f2b' }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Total Exercises"
                    type="number"
                    value={editForm.totalExercisesPerformed || 0}
                    onChange={(e) => handleEditFormChange('totalExercisesPerformed', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Streak Days"
                    type="number"
                    value={editForm.streakDays || 0}
                    onChange={(e) => handleEditFormChange('streakDays', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Total Minutes"
                    type="number"
                    value={editForm.totalMinutes || 0}
                    onChange={(e) => handleEditFormChange('totalMinutes', parseInt(e.target.value))}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* NASM Categories */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>NASM Protocol Categories</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Core Level', field: 'coreLevel' },
                  { label: 'Balance Level', field: 'balanceLevel' },
                  { label: 'Stability Level', field: 'stabilityLevel' },
                  { label: 'Flexibility Level', field: 'flexibilityLevel' },
                  { label: 'Calisthenics Level', field: 'calisthenicsLevel' },
                  { label: 'Isolation Level', field: 'isolationLevel' },
                  { label: 'Stabilizers Level', field: 'stabilizersLevel' },
                  { label: 'Injury Prevention Level', field: 'injuryPreventionLevel' },
                  { label: 'Injury Recovery Level', field: 'injuryRecoveryLevel' }
                ].map((category) => (
                  <Grid item xs={12} sm={6} md={4} key={category.field}>
                    <TextField
                      sx={{ '& .MuiInputBase-root': { color: 'text.primary' }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
                      fullWidth
                      label={category.label}
                      type="number"
                      value={editForm[category.field as keyof ClientProgressData] || 0}
                      onChange={(e) => handleEditFormChange(category.field as keyof ClientProgressData, parseInt(e.target.value))}
                      InputProps={{
                        inputProps: { min: 0, max: 1000 }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Key Exercises */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Key Exercises</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Squats Level', field: 'squatsLevel' },
                  { label: 'Lunges Level', field: 'lungesLevel' },
                  { label: 'Planks Level', field: 'planksLevel' },
                  { label: 'Reverse Planks Level', field: 'reversePlanksLevel' }
                ].map((exercise) => (
                  <Grid item xs={12} sm={6} md={3} key={exercise.field}>
                    <TextField
                      sx={{ '& .MuiInputBase-root': { color: 'text.primary' }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
                      fullWidth
                      label={exercise.label}
                      type="number"
                      value={editForm[exercise.field as keyof ClientProgressData] || 0}
                      onChange={(e) => handleEditFormChange(exercise.field as keyof ClientProgressData, parseInt(e.target.value))}
                      InputProps={{
                        inputProps: { min: 0, max: 1000 }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Achievements */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Achievements</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: '#1d1f2b', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Achievement</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      'core-10', 'balance-10', 'flexibility-10', 'calisthenics-10',
                      'squats-10', 'lunges-10', 'planks-10', 'overall-50'
                    ].map((achievementId) => {
                      const isUnlocked = editForm.achievements?.includes(achievementId) || false;
                      const unlockDate = editForm.achievementDates?.[achievementId];
                      
                      return (
                        <TableRow key={achievementId}>
                          <TableCell>{getAchievementName(achievementId)}</TableCell>
                          <TableCell>
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
                          <TableCell>
                            {isUnlocked ? (
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveAchievement(achievementId)}
                              >
                                <MinusCircle size={16} />
                              </IconButton>
                            ) : (
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleAddAchievement(achievementId)}
                              >
                                <PlusCircle size={16} />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Trainer Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Trainer Notes"
                multiline
                rows={4}
                value={editForm.progressNotes || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, progressNotes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#121212', borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => setShowEditDialog(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={updateClientProgress}
            startIcon={<Save />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#121420' }}>
      <Box sx={{ mb: 3, bgcolor: '#1d1f2b', p: 2, borderRadius: 1, boxShadow: '0 4px 12px rgba(0, 255, 255, 0.1)' }}>
      <Typography variant="h4" sx={{ color: '#E0E0E0' }}>Client Progress Dashboard</Typography>
      <Typography variant="body1" sx={{ color: '#A0A0A0' }}>
      Monitor and manage client progression through the NASM protocol system
      </Typography>
      </Box>

      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 255, 255, 0.3)' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="client progress tabs">
            <Tab label="Client Progress" icon={<UserCheck size={18} />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Leaderboard" icon={<Trophy size={18} />} iconPosition="start" {...a11yProps(1)} />
          </Tabs>
        </Box>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {renderClientList()}
          </Grid>
          <Grid item xs={12} md={9}>
            {renderClientProgress()}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderLeaderboard()}
      </TabPanel>

      {/* Edit Dialog */}
      {renderEditDialog()}
    </Box>
  );
};

export default AdminClientProgressView;