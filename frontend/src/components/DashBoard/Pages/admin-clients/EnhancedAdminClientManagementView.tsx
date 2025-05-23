/**
 * Enhanced Admin Client Management View
 * 7-Star AAA Personal Training & Social Media App
 * 
 * Features:
 * - Advanced client profiles with photos and detailed assessments
 * - Real-time analytics and insights
 * - AI-powered features and recommendations
 * - Gamification integration
 * - Social features
 * - Professional assessment tools
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import CreateClientModal from './CreateClientModal';
import ClientDetailsModal from './components/ClientDetailsModal';
import ClientAnalyticsPanel from './components/ClientAnalyticsPanel';
import ClientAssessmentModal from './components/ClientAssessmentModal';
import BulkActionDialog from './components/BulkActionDialog';
import ClientProgressDashboard from './components/ClientProgressDashboard';
import AIInsightsPanel from './components/AIInsightsPanel';
import GamificationOverview from './components/GamificationOverview';
import CommunicationCenter from './components/CommunicationCenter';

// Import UI components
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
  TablePagination,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  Chip,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  Badge,
  LinearProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Checkbox,
  Menu,
  ListItemIcon,
  Skeleton,
  Switch,
  FormControlLabel,
  Fab,
  Zoom,
  useScrollTrigger,
  Alert,
  AlertTitle,
  Breadcrumbs,
  Link
} from '@mui/material';

// Enhanced icon set
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Refresh,
  Download,
  Upload,
  Visibility,
  PersonAdd,
  Key,
  FilterList,
  ClearAll,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  TrendingUp,
  Timeline,
  Assessment,
  Settings,
  Close,
  Save,
  Phone,
  Email,
  Message,
  VideoCall,
  Insights,
  Psychology,
  EmojiEvents,
  Group,
  Share,
  Notifications,
  Analytics,
  FitnessCenter,
  RestaurantMenu,
  BarChart,
  PieChart,
  ShowChart,
  TrendingDown,
  Speed,
  Stars,
  LocalFireDepartment,
  Timer,
  CalendarToday,
  Schedule,
  Assignment,
  PhotoCamera,
  AttachFile,
  Send,
  NavigateNext,
  Home,
  SupervisorAccount,
  Bolt,
  AutoGraph,
  Psychology as AI,
  SmartToy,
  Recommendations,
  ModelTraining,
  Computer,
  Diversity3,
  ThumbUp,
  ThumbDown,
  Flag,
  Report,
  Block,
  PersonOff,
  PersonalInjury,
  MonitorWeight,
  Height,
  Cake,
  Wc
} from '@mui/icons-material';

// Enhanced styled components
import { styled, alpha } from '@mui/material/styles';

// Define interfaces
interface EnhancedAdminClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal: string;
  trainingExperience: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions: number;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  // Enhanced fields
  totalWorkouts: number;
  workoutStreak: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
  totalOrders: number;
  achievements: Achievement[];
  currentProgram?: string;
  trainerName?: string;
  socialScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  aiInsights: AIInsight[];
  customFields: Record<string, any>;
  // Gamification
  level: number;
  xp: number;
  badges: Badge[];
  rank: string;
  // Assessment scores
  initialAssessment?: AssessmentScore;
  latestAssessment?: AssessmentScore;
  progressScore: number;
  bodyComposition?: BodyComposition;
  // Communication
  lastContactDate?: string;
  preferredContactMethod: 'email' | 'phone' | 'app';
  communicationNotes?: string;
  // Medical/Health
  injuryHistory: Injury[];
  medicationList?: string[];
  allergies?: string[];
  // Video Analysis
  formAnalysisScore?: number;
  lastFormCheck?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  date: string;
  points: number;
}

interface AIInsight {
  type: 'recommendation' | 'warning' | 'achievement';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface AssessmentScore {
  overall: number;
  strength: number;
  endurance: number;
  flexibility: number;
  balance: number;
  date: string;
}

interface BodyComposition {
  bodyFat: number;
  muscleMass: number;
  waterPercentage: number;
  metabolicAge: number;
  lastMeasured: string;
}

interface Injury {
  type: string;
  description: string;
  date: string;
  status: 'active' | 'healing' | 'recovered';
  restrictions?: string[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Enhanced styled components
const DarkPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: '#1d1f2b',
  color: '#e0e0e0',
  borderRadius: 16,
  border: '1px solid rgba(0, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
    transform: 'translateY(-2px)',
  },
  '& .MuiTableCell-head': {
    backgroundColor: '#252742',
    color: '#e0e0e0',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
  },
  '& .MuiTableCell-body': {
    color: '#e0e0e0',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    borderRadius: 12,
    backdrop: 'blur(10px)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 255, 255, 0.4)',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: '#00ffff',
      boxShadow: '0 0 0 2px rgba(0, 255, 255, 0.2)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#a0a0a0',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
}));

const EnhancedButton = styled(Button)(({ theme, variant: buttonVariant, color }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  padding: '10px 24px',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)',
  ...(buttonVariant === 'contained' && color === 'primary' && {
    background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
    color: '#0a0a1a',
    '&:hover': {
      background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0, 255, 255, 0.4)',
    },
  }),
  ...(buttonVariant === 'outlined' && {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: '#00ffff',
      boxShadow: '0 4px 16px rgba(0, 255, 255, 0.2)',
    },
  }),
}));

const StatCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 255, 255, 0.1)',
  },
}));

const GradientChip = styled(Chip)(({ theme, variant }) => ({
  borderRadius: 20,
  fontWeight: 600,
  ...(variant === 'active' && {
    background: 'linear-gradient(135deg, #4caf50, #81c784)',
    color: 'white',
  }),
  ...(variant === 'inactive' && {
    background: 'linear-gradient(135deg, #f44336, #ef5350)',
    color: 'white',
  }),
  ...(variant === 'pending' && {
    background: 'linear-gradient(135deg, #ff9800, #ffb74d)',
    color: 'white',
  }),
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)',
  },
}));

// Main component
const EnhancedAdminClientManagementView: React.FC = () => {
  const { authAxios, services } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [clients, setClients] = useState<EnhancedAdminClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<EnhancedAdminClient | null>(null);
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<EnhancedAdminClient | null>(null);
  
  // Quick stats state
  const [quickStats, setQuickStats] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<any>(null);
  
  // Create mock enhanced client data
  const generateMockClients = (): EnhancedAdminClient[] => [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      phone: '+1 (555) 123-4567',
      profileImageUrl: '/api/placeholder/64/64',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      weight: 82,
      height: 180,
      fitnessGoal: 'Build muscle and strength',
      trainingExperience: 'intermediate',
      healthConcerns: 'Previous lower back issues',
      emergencyContact: 'Jane Doe - +1 (555) 987-6543',
      availableSessions: 5,
      isActive: true,
      role: 'client',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-12-10T14:30:00Z',
      totalWorkouts: 127,
      workoutStreak: 15,
      lastWorkoutDate: '2024-12-10',
      nextSessionDate: '2024-12-15',
      totalOrders: 8,
      achievements: [
        { id: '1', title: 'First Workout', description: 'Completed your first workout', iconUrl: '/icons/first-workout.png', date: '2024-01-16', points: 100 },
        { id: '2', title: 'Consistency King', description: '30-day workout streak', iconUrl: '/icons/streak.png', date: '2024-11-20', points: 500 }
      ],
      currentProgram: 'Strength & Hypertrophy Phase 2',
      trainerName: 'Sarah Wilson',
      socialScore: 85,
      engagementLevel: 'high',
      riskFactors: ['Previous back injury'],
      aiInsights: [
        { type: 'recommendation', title: 'Increase Deadlift Volume', description: 'Based on your progress, you can handle 10% more volume', confidence: 0.92, actionable: true },
        { type: 'achievement', title: 'Personal Record Incoming', description: 'You\'re likely to hit a PR in your next bench press session', confidence: 0.78, actionable: false }
      ],
      customFields: {
        preferredGym: 'Downtown Location',
        workoutTime: 'Morning (6-8 AM)',
        musicPreference: 'Hip-hop/Electronic'
      },
      level: 15,
      xp: 12500,
      badges: [
        { id: '1', name: 'Iron Pumper', description: 'Lifted 1000+ lbs total', iconUrl: '/badges/iron.png', rarity: 'rare' },
        { id: '2', name: 'Consistency Champion', description: '90% attendance rate', iconUrl: '/badges/consistent.png', rarity: 'epic' }
      ],
      rank: 'Gold III',
      initialAssessment: { overall: 6.2, strength: 6.0, endurance: 6.5, flexibility: 5.8, balance: 6.3, date: '2024-01-15' },
      latestAssessment: { overall: 8.7, strength: 9.2, endurance: 8.5, flexibility: 8.0, balance: 8.8, date: '2024-12-01' },
      progressScore: 94,
      bodyComposition: { bodyFat: 12.5, muscleMass: 72.3, waterPercentage: 62.1, metabolicAge: 25, lastMeasured: '2024-12-01' },
      lastContactDate: '2024-12-08',
      preferredContactMethod: 'app',
      injuryHistory: [
        { type: 'Lower back strain', description: 'Lifting incident in 2023', date: '2023-03-15', status: 'recovered', restrictions: ['No heavy deadlifts for 6 weeks'] }
      ],
      allergies: ['Shellfish'],
      formAnalysisScore: 88,
      lastFormCheck: '2024-12-05'
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      username: 'janesmith',
      phone: '+1 (555) 234-5678',
      profileImageUrl: '/api/placeholder/64/64',
      dateOfBirth: '1985-08-22',
      gender: 'female',
      weight: 65,
      height: 165,
      fitnessGoal: 'Weight loss and toning',
      trainingExperience: 'beginner',
      emergencyContact: 'Michael Smith - +1 (555) 876-5432',
      availableSessions: 8,
      isActive: true,
      role: 'client',
      createdAt: '2024-03-20T09:15:00Z',
      updatedAt: '2024-12-09T16:45:00Z',
      totalWorkouts: 45,
      workoutStreak: 7,
      lastWorkoutDate: '2024-12-08',
      nextSessionDate: '2024-12-12',
      totalOrders: 3,
      achievements: [
        { id: '3', title: 'Getting Started', description: 'Completed 10 workouts', iconUrl: '/icons/started.png', date: '2024-04-10', points: 200 }
      ],
      currentProgram: 'Beginner Fat Loss Program',
      trainerName: 'Mike Johnson',
      socialScore: 62,
      engagementLevel: 'medium',
      riskFactors: ['New to exercise'],
      aiInsights: [
        { type: 'recommendation', title: 'Focus on Form', description: 'Prioritize technique over weight for the next 2 weeks', confidence: 0.95, actionable: true },
        { type: 'warning', title: 'Progress Plateau', description: 'Weight loss has stalled, consider diet review', confidence: 0.71, actionable: true }
      ],
      customFields: {
        dietaryRestrictions: 'Vegetarian',
        fitnessGoals: ['Lose 20 lbs', 'Run 5K']
      },
      level: 8,
      xp: 4200,
      badges: [
        { id: '3', name: 'First Steps', description: 'Started your fitness journey', iconUrl: '/badges/first.png', rarity: 'common' }
      ],
      rank: 'Bronze II',
      initialAssessment: { overall: 4.5, strength: 4.0, endurance: 4.8, flexibility: 5.2, balance: 4.5, date: '2024-03-20' },
      latestAssessment: { overall: 6.8, strength: 6.5, endurance: 7.2, flexibility: 6.8, balance: 6.5, date: '2024-11-15' },
      progressScore: 78,
      bodyComposition: { bodyFat: 28.5, muscleMass: 38.2, waterPercentage: 58.5, metabolicAge: 32, lastMeasured: '2024-11-15' },
      lastContactDate: '2024-12-09',
      preferredContactMethod: 'email',
      injuryHistory: [],
      allergies: ['Peanuts'],
      formAnalysisScore: 75,
      lastFormCheck: '2024-12-03'
    }
  ];

  // Initialize with mock data
  useEffect(() => {
    const mockData = generateMockClients();
    setClients(mockData);
    setTotalCount(mockData.length);
    setLoading(false);
    
    // Set mock quick stats
    setQuickStats({
      totalClients: mockData.length,
      activeClients: mockData.filter(c => c.isActive).length,
      newThisMonth: 5,
      avgProgress: 82,
      totalWorkouts: mockData.reduce((sum, c) => sum + c.totalWorkouts, 0),
      totalRevenue: 45680,
      retentionRate: 94.5,
      avgRating: 4.8
    });
    
    // Mock MCP status
    setMcpStatus({
      servers: [
        { name: 'Workout MCP', status: 'online', health: 98, responseTime: 45 },
        { name: 'Gamification MCP', status: 'online', health: 95, responseTime: 52 },
        { name: 'YOLO MCP', status: 'online', health: 92, responseTime: 78 },
        { name: 'Social Media MCP', status: 'warning', health: 85, responseTime: 120 },
        { name: 'Food Scanner MCP', status: 'online', health: 97, responseTime: 38 },
        { name: 'Video Processing MCP', status: 'online', health: 90, responseTime: 95 }
      ],
      summary: { online: 5, offline: 0, error: 0, warning: 1 }
    });
  }, []);

  // Handle search
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(client => 
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  // Render enhanced client table
  const renderEnhancedClientTable = () => (
    <DarkPaper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                  indeterminate={selectedClients.length > 0 && selectedClients.length < filteredClients.length}
                  onChange={handleSelectAll}
                  sx={{ color: '#00ffff' }}
                />
              </TableCell>
              <TableCell>Client Profile</TableCell>
              <TableCell>Performance Metrics</TableCell>
              <TableCell>Engagement & Social</TableCell>
              <TableCell>Progress & Goals</TableCell>
              <TableCell>Health & Safety</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClients.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage).map((client) => (
              <TableRow key={client.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedClients.includes(client.id)}
                    onChange={() => handleClientSelect(client.id)}
                    sx={{ color: '#00ffff' }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: client.isActive ? 'success.main' : 'error.main',
                            border: '2px solid #1d1f2b'
                          }}
                        />
                      }
                    >
                      <Avatar 
                        src={client.profileImageUrl} 
                        sx={{ 
                          width: 56, 
                          height: 56,
                          bgcolor: '#00ffff', 
                          color: '#0a0a1a',
                          border: '2px solid rgba(0, 255, 255, 0.3)'
                        }}
                      >
                        {!client.profileImageUrl && `${client.firstName[0]}${client.lastName[0]}`}
                      </Avatar>
                    </Badge>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {client.firstName} {client.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{client.username}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={`Level ${client.level}`} 
                          size="small" 
                          sx={{ 
                            bgcolor: 'rgba(120, 81, 169, 0.2)',
                            color: '#7851a9',
                            fontSize: '0.75rem'
                          }} 
                        />
                        <Chip 
                          label={client.rank} 
                          size="small" 
                          sx={{ 
                            bgcolor: 'rgba(255, 215, 0, 0.2)',
                            color: '#ffd700',
                            fontSize: '0.75rem'
                          }} 
                        />
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ minWidth: 200 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Progress Score</Typography>
                      <Typography variant="body2" fontWeight={600} color="#00ffff">
                        {client.progressScore}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={client.progressScore} 
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'linear-gradient(90deg, #00ffff, #7851a9)',
                          borderRadius: 4
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="#4caf50">{client.totalWorkouts}</Typography>
                        <Typography variant="caption">Workouts</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="#ff9800">{client.workoutStreak}</Typography>
                        <Typography variant="caption">Streak</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="#f44336">{client.availableSessions}</Typography>
                        <Typography variant="caption">Sessions</Typography>
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2">Social Score:</Typography>
                      <Typography variant="body2" fontWeight={600} color="#00ffff">
                        {client.socialScore}/100
                      </Typography>
                    </Box>
                    <Chip 
                      label={client.engagementLevel} 
                      size="small"
                      variant="outlined"
                      color={
                        client.engagementLevel === 'high' ? 'success' :
                        client.engagementLevel === 'medium' ? 'warning' : 'error'
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      {client.badges.slice(0, 3).map(badge => (
                        <Tooltip key={badge.id} title={badge.description}>
                          <Avatar
                            src={badge.iconUrl}
                            sx={{ 
                              width: 24, 
                              height: 24,
                              border: `1px solid ${
                                badge.rarity === 'legendary' ? '#ffd700' :
                                badge.rarity === 'epic' ? '#9c27b0' :
                                badge.rarity === 'rare' ? '#2196f3' : '#4caf50'
                              }`
                            }}
                          />
                        </Tooltip>
                      ))}
                      {client.badges.length > 3 && (
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          +{client.badges.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Goal:</strong> {client.fitnessGoal.substring(0, 30)}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Program:</strong> {client.currentProgram}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="#00ffff">Overall</Typography>
                        <Typography variant="h6">{client.latestAssessment?.overall || 0}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="#4caf50">Strength</Typography>
                        <Typography variant="h6">{client.latestAssessment?.strength || 0}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="#ff9800">Endurance</Typography>
                        <Typography variant="h6">{client.latestAssessment?.endurance || 0}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {client.riskFactors.length > 0 ? (
                      <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="caption">
                          {client.riskFactors[0]}
                        </Typography>
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ mb: 1, py: 0 }}>
                        <Typography variant="caption">
                          No risk factors
                        </Typography>
                      </Alert>
                    )}
                    {client.formAnalysisScore && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Computer sx={{ fontSize: 16, color: '#00ffff' }} />
                        <Typography variant="caption">
                          Form Score: {client.formAnalysisScore}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewDetails(client)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Send Message">
                      <IconButton size="small" onClick={() => handleSendMessage(client)}>
                        <Message fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Start Video Call">
                      <IconButton size="small" onClick={() => handleVideoCall(client)}>
                        <VideoCall fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, client)}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredClients.length}
        page={currentPage}
        onPageChange={(e, page) => setCurrentPage(page)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setCurrentPage(0);
        }}
        sx={{ 
          color: '#e0e0e0',
          '& .MuiTablePagination-selectIcon': { color: '#e0e0e0' },
          '& .MuiTablePagination-select': { color: '#e0e0e0' },
          '& .MuiIconButton-root': { color: '#e0e0e0' },
        }}
      />
    </DarkPaper>
  );

  // Handle various actions
  const handleViewDetails = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleSendMessage = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setCurrentTab(5); // Switch to Communication tab
  };

  const handleVideoCall = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setCurrentTab(5); // Switch to Communication tab and start video call
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: EnhancedAdminClient) => {
    setAnchorEl(event.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  const handleEdit = (client: EnhancedAdminClient) => {
    // TODO: Implement edit functionality
    toast({
      title: "Feature Coming Soon",
      description: "Edit functionality will be available in the next update.",
      variant: "default"
    });
    handleMenuClose();
  };

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box sx={{ p: 3 }}>
        {/* Enhanced Header with Breadcrumbs */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs 
            aria-label="breadcrumb"
            sx={{ 
              mb: 2,
              '& .MuiBreadcrumbs-separator': { color: '#666' },
              '& .MuiBreadcrumbs-li': { color: '#999' }
            }}
          >
            <Link color="inherit" href="/dashboard" underline="hover">
              <Home sx={{ mr: 0.5 }} fontSize="inherit" />
              Dashboard
            </Link>
            <Typography color="text.primary">Client Management</Typography>
          </Breadcrumbs>
          
          <Typography variant="h3" sx={{ color: '#00ffff', mb: 1, fontWeight: 700 }}>
            Client Management Central
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Comprehensive client oversight, analytics, and engagement tools
          </Typography>
        </Box>

        {/* Enhanced Quick Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#00ffff', fontWeight: 700 }}>
                      {quickStats.totalClients || 0}
                    </Typography>
                    <Typography color="text.secondary">Total Clients</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +12% vs last month
                      </Typography>
                    </Box>
                  </Box>
                  <SupervisorAccount sx={{ fontSize: 48, color: 'rgba(0, 255, 255, 0.3)' }} />
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                      {quickStats.activeClients || 0}
                    </Typography>
                    <Typography color="text.secondary">Active This Week</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <LocalFireDepartment sx={{ color: '#ff5722', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#ff5722">
                        {((quickStats.activeClients / quickStats.totalClients) * 100).toFixed(1)}% engagement
                      </Typography>
                    </Box>
                  </Box>
                  <CheckCircle sx={{ fontSize: 48, color: 'rgba(76, 175, 80, 0.3)' }} />
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#ff9800', fontWeight: 700 }}>
                      ${(quickStats.totalRevenue || 0).toLocaleString()}
                    </Typography>
                    <Typography color="text.secondary">This Month</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +8.5% vs last month
                      </Typography>
                    </Box>
                  </Box>
                  <BarChart sx={{ fontSize: 48, color: 'rgba(255, 152, 0, 0.3)' }} />
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#9c27b0', fontWeight: 700 }}>
                      {quickStats.avgProgress || 0}%
                    </Typography>
                    <Typography color="text.secondary">Avg Progress Score</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Stars sx={{ color: '#ffd700', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#ffd700">
                        {quickStats.avgRating || 0}/5.0 satisfaction
                      </Typography>
                    </Box>
                  </Box>
                  <Assessment sx={{ fontSize: 48, color: 'rgba(156, 39, 176, 0.3)' }} />
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
        </Grid>

        {/* MCP System Health */}
        {mcpStatus && (
          <Card sx={{ mb: 3, bgcolor: '#1d1f2b', border: '1px solid rgba(0, 255, 255, 0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Bolt sx={{ fontSize: 24 }} />
                  AI & MCP System Health
                </Typography>
                <EnhancedButton 
                  variant="outlined" 
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => window.location.reload()}
                >
                  Refresh Status
                </EnhancedButton>
              </Box>
              
              <Grid container spacing={2}>
                {mcpStatus.servers.map((server: any, index: number) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        server.status === 'online' ? 'rgba(76, 175, 80, 0.3)' :
                        server.status === 'warning' ? 'rgba(255, 152, 0, 0.3)' :
                        'rgba(244, 67, 54, 0.3)'
                      }`
                    }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {server.name}
                          </Typography>
                          <Chip 
                            label={server.status}
                            size="small"
                            color={
                              server.status === 'online' ? 'success' :
                              server.status === 'warning' ? 'warning' : 'error'
                            }
                          />
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Health</Typography>
                            <Typography variant="h6" color={server.health > 90 ? '#4caf50' : '#ff9800'}>
                              {server.health}%
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Response</Typography>
                            <Typography variant="h6" color={server.responseTime < 100 ? '#4caf50' : '#ff9800'}>
                              {server.responseTime}ms
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Search and Filter Bar */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <SearchField
                fullWidth
                placeholder="Search clients by name, email, username..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: '#a0a0a0' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#a0a0a0' }}>Filter by Level</InputLabel>
                  <Select
                    value={filters.level || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                    sx={{
                      color: '#e0e0e0',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 255, 255, 0.3)'
                      }
                    }}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    <MenuItem value="beginner">Beginner (1-5)</MenuItem>
                    <MenuItem value="intermediate">Intermediate (6-15)</MenuItem>
                    <MenuItem value="advanced">Advanced (16+)</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#a0a0a0' }}>Engagement</InputLabel>
                  <Select
                    value={filters.engagement || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, engagement: e.target.value }))}
                    sx={{
                      color: '#e0e0e0',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 255, 255, 0.3)'
                      }
                    }}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>

                <EnhancedButton
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => {/* TODO: Advanced filters modal */}}
                >
                  Advanced Filters
                </EnhancedButton>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={viewMode === 'grid'}
                      onChange={(e) => setViewMode(e.target.checked ? 'grid' : 'table')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#00ffff',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#00ffff',
                        },
                      }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ color: '#a0a0a0' }}>Grid View</Typography>}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Bulk Actions Bar */}
        {selectedClients.length > 0 && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)'
            }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <EnhancedButton size="small" variant="outlined">
                  Send Message
                </EnhancedButton>
                <EnhancedButton size="small" variant="outlined">
                  Export Data
                </EnhancedButton>
                <EnhancedButton 
                  size="small" 
                  variant="outlined"
                  onClick={() => setShowBulkActionDialog(true)}
                >
                  More Actions
                </EnhancedButton>
              </Box>
            }
          >
            <AlertTitle>Bulk Actions</AlertTitle>
            {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
          </Alert>
        )}

        {/* Action Buttons Row */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <EnhancedButton
            variant="contained"
            color="primary"
            startIcon={<PersonAdd />}
            onClick={() => setShowCreateModal(true)}
          >
            Add New Client
          </EnhancedButton>
          
          <EnhancedButton
            variant="outlined"
            startIcon={<Assessment />}
            onClick={() => {/* TODO: Open analytics view */}}
          >
            View Analytics
          </EnhancedButton>
          
          <EnhancedButton
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {/* TODO: Export functionality */}}
          >
            Export Client Data
          </EnhancedButton>
          
          <EnhancedButton
            variant="outlined"
            startIcon={<AI />}
            onClick={() => {/* TODO: AI insights modal */}}
          >
            AI Insights
          </EnhancedButton>
        </Box>

        {/* Enhanced Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)', mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{
              '& .MuiTab-root': { 
                color: '#a0a0a0',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                '&.Mui-selected': { color: '#00ffff' }
              },
              '& .MuiTabs-indicator': { 
                backgroundColor: '#00ffff',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              icon={<SupervisorAccount />} 
              iconPosition="start" 
              label={`All Clients (${filteredClients.length})`} 
            />
            <Tab 
              icon={<Analytics />} 
              iconPosition="start" 
              label="Analytics" 
            />
            <Tab 
              icon={<Psychology />} 
              iconPosition="start" 
              label="AI Insights" 
            />
            <Tab 
              icon={<Timeline />} 
              iconPosition="start" 
              label="Progress" 
            />
            <Tab 
              icon={<EmojiEvents />} 
              iconPosition="start" 
              label="Gamification" 
            />
            <Tab 
              icon={<Message />} 
              iconPosition="start" 
              label="Communication" 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box>
          {currentTab === 0 && renderEnhancedClientTable()}
          {currentTab === 1 && selectedClient && <ClientAnalyticsPanel clientId={selectedClient.id} />}
          {currentTab === 2 && selectedClient && <AIInsightsPanel clientId={selectedClient.id} />}
          {currentTab === 3 && selectedClient && <ClientProgressDashboard clientId={selectedClient.id} />}
          {currentTab === 4 && selectedClient && <GamificationOverview clientId={selectedClient.id} />}
          {currentTab === 5 && selectedClient && (
            <CommunicationCenter 
              clientId={selectedClient.id}
              onMessageSend={(message) => {
                console.log('Message sent:', message);
                toast({
                  title: "Message Sent",
                  description: "Your message has been sent successfully",
                  variant: "default"
                });
              }}
              onCallStart={(type, participantId) => {
                console.log(`Starting ${type} call with ${participantId}`);
                toast({
                  title: "Call Starting",
                  description: `Starting ${type} call...`,
                  variant: "default"
                });
              }}
            />
          )}
          {/* Show message if no client is selected for other tabs */}
          {currentTab > 0 && !selectedClient && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h5" color="#00ffff" gutterBottom>Select a Client</Typography>
              <Typography color="text.secondary">Please select a client from the table to view detailed information</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#252742',
            color: '#e0e0e0',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            borderRadius: 2,
            '& .MuiMenuItem-root': {
              '&:hover': {
                bgcolor: 'rgba(0, 255, 255, 0.1)',
              }
            }
          }
        }}
      >
        <MenuItem onClick={() => menuClient && handleViewDetails(menuClient)}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Visibility />
          </ListItemIcon>
          View Full Profile
        </MenuItem>
        <MenuItem onClick={() => menuClient && handleEdit(menuClient)}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Edit />
          </ListItemIcon>
          Edit Client
        </MenuItem>
        <MenuItem onClick={() => {
          setSelectedClient(menuClient);
          setShowAssessmentModal(true);
          handleMenuClose();
        }}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Assessment />
          </ListItemIcon>
          New Assessment
        </MenuItem>
        <MenuItem onClick={() => {/* TODO: Assign workout plan */}}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <FitnessCenter />
          </ListItemIcon>
          Assign Workout Plan
        </MenuItem>
        <MenuItem onClick={() => {/* TODO: Schedule session */}}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Schedule />
          </ListItemIcon>
          Schedule Session
        </MenuItem>
        <MenuItem onClick={() => {/* TODO: Reset password */}}>
          <ListItemIcon sx={{ color: '#e0e0e0' }}>
            <Key />
          </ListItemIcon>
          Reset Password
        </MenuItem>
      </Menu>

      {/* Floating Action Button for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          '& .MuiFab-primary': {
            background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
            },
          }
        }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<PersonAdd />}
          tooltipTitle="Add Client"
          onClick={() => setShowCreateModal(true)}
        />
        <SpeedDialAction
          icon={<Assessment />}
          tooltipTitle="Analytics"
          onClick={() => {/* TODO: Quick analytics */}}
        />
        <SpeedDialAction
          icon={<Message />}
          tooltipTitle="Broadcast Message"
          onClick={() => {/* TODO: Broadcast message modal */}}
        />
        <SpeedDialAction
          icon={<AI />}
          tooltipTitle="AI Insights"
          onClick={() => {/* TODO: AI insights modal */}}
        />
      </SpeedDial>

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          // TODO: Handle client creation
          console.log('Creating client:', data);
          setShowCreateModal(false);
          toast({
            title: "Success",
            description: "Client created successfully",
            variant: "default"
          });
        }}
        trainers={[]} // TODO: Add trainers list
      />

      {showDetailsModal && selectedClient && (
        <ClientDetailsModal
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          client={selectedClient}
        />
      )}

      {showAssessmentModal && selectedClient && (
        <ClientAssessmentModal
          open={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          client={selectedClient}
          onSubmit={(assessment) => {
            // TODO: Handle assessment submission
            console.log('New assessment:', assessment);
            setShowAssessmentModal(false);
            toast({
              title: "Success",
              description: "Assessment completed successfully",
              variant: "default"
            });
          }}
        />
      )}

      {showBulkActionDialog && (
        <BulkActionDialog
          open={showBulkActionDialog}
          onClose={() => setShowBulkActionDialog(false)}
          selectedClients={selectedClients}
          onAction={(action) => {
            // TODO: Handle bulk actions
            console.log('Bulk action:', action);
            setShowBulkActionDialog(false);
            setSelectedClients([]);
            toast({
              title: "Success",
              description: `Bulk action completed for ${selectedClients.length} clients`,
              variant: "default"
            });
          }}
        />
      )}
    </Box>
  );
};

export default EnhancedAdminClientManagementView;