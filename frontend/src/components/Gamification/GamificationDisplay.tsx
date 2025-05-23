/**
 * GamificationDisplay Component
 * 
 * Displays gamification data from the MCP server, including:
 * - Achievements
 * - Game board position
 * - Challenges and quests
 * - Points and level information
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gamificationMcpApi } from '../../services/mcp/gamificationMcpService';
import styled from 'styled-components';

// UI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Alert,
  Collapse,
  LinearProgress,
  useTheme,
  Avatar
} from '@mui/material';

// Icons
import {
  EmojiEvents as EmojiEventsIcon,
  LocalPolice as LocalPoliceIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Bolt as BoltIcon,
  Casino as CasinoIcon,
  Extension as ExtensionIcon,
  LightbulbOutlined as LightbulbOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Lock as LockIcon,
  Psychology as PsychologyIcon,
  Map as MapIcon,
  BarChart as BarChartIcon,
  Flag as FlagIcon,
  Info as InfoIcon,
  NetworkCheck as NetworkCheckIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Types and interfaces
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
  totalRequired: number;
  dateCompleted?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointValue: number;
}

interface GameBoard {
  currentPosition: number;
  totalSpaces: number;
  boardName: string;
  currentSpace: {
    id: string;
    name: string;
    description: string;
    type: string;
    reward?: any;
  };
  lastRoll?: {
    date: string;
    value: number;
    fromPosition: number;
    toPosition: number;
  };
  nextRollAvailable: boolean;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  status: 'active' | 'completed' | 'available';
  progress: number;
  totalRequired: number;
  reward: {
    points: number;
    badge?: string;
  };
  expiryDate?: string;
}

interface UserProfile {
  id: string;
  level: number;
  points: number;
  streak: number;
  nextLevelPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  attributes: {
    strength: { level: number; progress: number };
    cardio: { level: number; progress: number };
    flexibility: { level: number; progress: number };
    balance: { level: number; progress: number };
  };
}

interface GamificationData {
  achievements: Achievement[];
  gameBoard: GameBoard;
  challenges: Challenge[];
  profile: UserProfile;
}

interface GamificationDisplayProps {
  variant?: 'full' | 'compact';
  onDataLoaded?: (data: GamificationData) => void;
}

/**
 * Component to display gamification data from the MCP server
 */
const GamificationDisplay: React.FC<GamificationDisplayProps> = ({ 
  variant = 'full',
  onDataLoaded
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpAvailable, setMcpAvailable] = useState<boolean>(false);
  const [showConnectionAlert, setShowConnectionAlert] = useState<boolean>(false);
  
  // Gamification data
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [gameBoard, setGameBoard] = useState<GameBoard | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Filter state
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'completed' | 'inProgress'>('all');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'active' | 'completed' | 'available'>('all');
  
  // Check MCP server status
  const checkMcpStatus = useCallback(async () => {
    try {
      const available = await gamificationMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      setMcpAvailable(available);
      setShowConnectionAlert(!available);
      
      return available;
    } catch (error) {
      console.error('[Gamification] Error checking MCP server status:', error);
      setMcpAvailable(false);
      setShowConnectionAlert(true);
      return false;
    }
  }, []);
  
  // Load gamification data
  const loadGamificationData = useCallback(async () => {
    if (!user?.id) {
      setError('User ID not found');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if MCP server is available
      const isAvailable = await checkMcpStatus();
      
      if (!isAvailable) {
        // Fall back to mock data for development
        console.log('[Gamification] Using mock data');
        setMockData();
        setLoading(false);
        return;
      }
      
      // Get profile data
      const profileResponse = await gamificationMcpApi.getGamificationProfile({
        userId: user.id
      });
      
      // Get achievements
      const achievementsResponse = await gamificationMcpApi.getAchievements({
        userId: user.id,
        includeCompleted: true,
        includeInProgress: true
      });
      
      // Get game board position
      const boardResponse = await gamificationMcpApi.getBoardPosition({
        userId: user.id
      });
      
      // Get challenges
      const challengesResponse = await gamificationMcpApi.getChallenges({
        userId: user.id,
        status: 'all'
      });
      
      // Update state with real data
      if (profileResponse.data) {
        setProfile(profileResponse.data);
      }
      
      if (achievementsResponse.data) {
        setAchievements(achievementsResponse.data);
      }
      
      if (boardResponse.data) {
        setGameBoard(boardResponse.data);
      }
      
      if (challengesResponse.data) {
        setChallenges(challengesResponse.data);
      }
      
      // Combine data for callback
      const combinedData: GamificationData = {
        profile: profileResponse.data || generateMockProfile(),
        achievements: achievementsResponse.data || generateMockAchievements(),
        gameBoard: boardResponse.data || generateMockGameBoard(),
        challenges: challengesResponse.data || generateMockChallenges()
      };
      
      if (onDataLoaded) {
        onDataLoaded(combinedData);
      }
    } catch (error: any) {
      console.error('[Gamification] Error loading data:', error);
      setError(error.message || 'Error loading gamification data');
      
      // Fall back to mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkMcpStatus, onDataLoaded]);
  
  // Set mock data for development
  const setMockData = () => {
    setProfile(generateMockProfile());
    setAchievements(generateMockAchievements());
    setGameBoard(generateMockGameBoard());
    setChallenges(generateMockChallenges());
    
    // Combine data for callback
    if (onDataLoaded) {
      onDataLoaded({
        profile: generateMockProfile(),
        achievements: generateMockAchievements(),
        gameBoard: generateMockGameBoard(),
        challenges: generateMockChallenges()
      });
    }
  };
  
  // Roll dice and move on game board
  const handleRollDice = async () => {
    if (!user?.id || !gameBoard?.nextRollAvailable) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (mcpAvailable) {
        // Use real MCP server
        const response = await gamificationMcpApi.rollDice({
          userId: user.id
        });
        
        if (response.data) {
          // Update game board with new position
          setGameBoard(response.data);
          
          // Reload profile to get updated points
          const profileResponse = await gamificationMcpApi.getGamificationProfile({
            userId: user.id
          });
          
          if (profileResponse.data) {
            setProfile(profileResponse.data);
          }
        }
      } else {
        // Mock roll for development
        console.log('[Gamification] Using mock dice roll');
        
        // Random roll between 1-6
        const roll = Math.floor(Math.random() * 6) + 1;
        const oldPosition = gameBoard.currentPosition;
        let newPosition = oldPosition + roll;
        
        // Wrap around if needed
        if (newPosition > gameBoard.totalSpaces) {
          newPosition = newPosition - gameBoard.totalSpaces;
        }
        
        // Generate new game board state
        const updatedGameBoard: GameBoard = {
          ...gameBoard,
          currentPosition: newPosition,
          lastRoll: {
            date: new Date().toISOString(),
            value: roll,
            fromPosition: oldPosition,
            toPosition: newPosition
          },
          nextRollAvailable: false,
          currentSpace: {
            id: `space-${newPosition}`,
            name: `Space ${newPosition}`,
            description: 'You landed on a reward space!',
            type: 'reward',
            reward: {
              points: roll * 10,
              message: `You earned ${roll * 10} points!`
            }
          }
        };
        
        setGameBoard(updatedGameBoard);
        
        // Update profile with reward points
        if (profile) {
          setProfile({
            ...profile,
            points: profile.points + (roll * 10)
          });
        }
        
        // Simulate delay for user experience
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error('[Gamification] Error rolling dice:', error);
      setError(error.message || 'Error rolling dice');
    } finally {
      setLoading(false);
    }
  };
  
  // Join a challenge
  const handleJoinChallenge = async (challengeId: string) => {
    if (!user?.id) {
      return;
    }
    
    try {
      if (mcpAvailable) {
        // Use real MCP server
        await gamificationMcpApi.joinChallenge({
          userId: user.id,
          challengeId: challengeId
        });
        
        // Reload challenges
        const challengesResponse = await gamificationMcpApi.getChallenges({
          userId: user.id,
          status: 'all'
        });
        
        if (challengesResponse.data) {
          setChallenges(challengesResponse.data);
        }
      } else {
        // Mock join for development
        console.log('[Gamification] Mocking challenge join:', challengeId);
        
        // Update challenge status in local state
        setChallenges(challenges.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              status: 'active' as const
            };
          }
          return challenge;
        }));
      }
    } catch (error: any) {
      console.error('[Gamification] Error joining challenge:', error);
      setError(error.message || 'Error joining challenge');
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadGamificationData();
  }, [loadGamificationData]);
  
  // Check MCP status regularly
  useEffect(() => {
    const interval = setInterval(checkMcpStatus, 30000);
    return () => clearInterval(interval);
  }, [checkMcpStatus]);
  
  // Filter achievements
  const filteredAchievements = achievements.filter(achievement => {
    if (achievementFilter === 'all') return true;
    if (achievementFilter === 'completed') return achievement.completed;
    if (achievementFilter === 'inProgress') return !achievement.completed;
    return true;
  });
  
  // Filter challenges
  const filteredChallenges = challenges.filter(challenge => {
    if (challengeFilter === 'all') return true;
    return challenge.status === challengeFilter;
  });
  
  // Get badge color based on tier
  const getBadgeColor = (tier: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#CD7F32';
    }
  };
  
  // Get icon component based on string name
  const getIconComponent = (iconName: string, size: number = 24) => {
    switch (iconName) {
      case 'Star': return <StarIcon sx={{ fontSize: size }} />;
      case 'Trophy': return <EmojiEventsIcon sx={{ fontSize: size }} />;
      case 'Medal': return <LocalPoliceIcon sx={{ fontSize: size }} />;
      case 'Heart': return <FavoriteIcon sx={{ fontSize: size }} />;
      case 'Lightning': return <BoltIcon sx={{ fontSize: size }} />;
      case 'Dice': return <CasinoIcon sx={{ fontSize: size }} />;
      case 'Puzzle': return <ExtensionIcon sx={{ fontSize: size }} />;
      case 'Idea': return <LightbulbOutlinedIcon sx={{ fontSize: size }} />;
      default: return <StarIcon sx={{ fontSize: size }} />;
    }
  };
  
  // Calculate level progress percentage
  const calculateLevelProgress = () => {
    if (!profile) return 0;
    
    const { points, nextLevelPoints } = profile;
    return Math.min(Math.round((points / nextLevelPoints) * 100), 100);
  };
  
  // Render compact version
  if (variant === 'compact') {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Gamification
            </Typography>
            <Box>
              <Tooltip title={mcpAvailable ? "MCP Server Connected" : "MCP Server Offline"}>
                <NetworkCheckIcon color={mcpAvailable ? "success" : "disabled"} />
              </Tooltip>
            </Box>
          </Box>
          
          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Profile Summary */}
          {profile && (
            <Box mb={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={1} border={1} borderColor="divider" borderRadius={1}>
                    <Typography variant="caption" color="text.secondary">Level</Typography>
                    <Typography variant="h6">{profile.level}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={1} border={1} borderColor="divider" borderRadius={1}>
                    <Typography variant="caption" color="text.secondary">Points</Typography>
                    <Typography variant="h6">{profile.points}</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* Level Progress */}
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Progress to Level {profile.level + 1}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {profile.points} / {profile.nextLevelPoints}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateLevelProgress()} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            </Box>
          )}
          
          {/* Recent Achievements */}
          <Typography variant="subtitle2" gutterBottom>
            Recent Achievements
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box>
              {filteredAchievements.slice(0, 3).map((achievement) => (
                <Box 
                  key={achievement.id} 
                  display="flex" 
                  alignItems="center" 
                  p={1} 
                  mb={1} 
                  border={1} 
                  borderColor="divider" 
                  borderRadius={1}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: getBadgeColor(achievement.tier),
                      mr: 1
                    }}
                  >
                    {getIconComponent(achievement.icon, 16)}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="body2" noWrap>
                      {achievement.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {achievement.description}
                    </Typography>
                  </Box>
                  {achievement.completed ? (
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {achievement.progress}/{achievement.totalRequired}
                    </Typography>
                  )}
                </Box>
              ))}
              
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth 
                onClick={() => loadGamificationData()}
              >
                View All
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Render full version
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5">
            <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Wholesome Warrior's Path
          </Typography>
          
          <Box>
            <IconButton 
              onClick={loadGamificationData} 
              disabled={loading}
              color="primary"
            >
              <Tooltip title="Refresh Data">
                <Box sx={{ position: 'relative' }}>
                  {loading && (
                    <CircularProgress
                      size={24}
                      thickness={4}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        color: theme.palette.grey[200]
                      }}
                    />
                  )}
                  <RefreshIcon />
                </Box>
              </Tooltip>
            </IconButton>
            <Tooltip title={mcpAvailable ? "MCP Server Connected" : "MCP Server Offline"}>
              <NetworkCheckIcon color={mcpAvailable ? "success" : "disabled"} />
            </Tooltip>
          </Box>
        </Box>
        
        {/* Connection Alert */}
        <Collapse in={showConnectionAlert}>
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setShowConnectionAlert(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            Unable to connect to the Gamification MCP server. Using cached data.
          </Alert>
        </Collapse>
        
        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Player Stats */}
        {profile && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Your Progress
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Level */}
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: getBadgeColor(profile.tier),
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            margin: '0 auto',
                            mb: 1
                          }}
                        >
                          {profile.level}
                        </Avatar>
                        <Typography variant="body2">Level</Typography>
                      </Box>
                    </Grid>
                    
                    {/* Points */}
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: theme.palette.primary.main,
                            margin: '0 auto',
                            mb: 1
                          }}
                        >
                          <StarIcon />
                        </Avatar>
                        <Typography variant="body2">
                          {profile.points} Points
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Streak */}
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: theme.palette.warning.main,
                            margin: '0 auto',
                            mb: 1
                          }}
                        >
                          <BoltIcon />
                        </Avatar>
                        <Typography variant="body2">
                          {profile.streak} Day Streak
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Tier */}
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: getBadgeColor(profile.tier),
                            margin: '0 auto',
                            mb: 1
                          }}
                        >
                          <EmojiEventsIcon />
                        </Avatar>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {profile.tier} Tier
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Level Progress */}
                  <Box mt={3}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">
                        Progress to Level {profile.level + 1}
                      </Typography>
                      <Typography variant="body2">
                        {profile.points} / {profile.nextLevelPoints} Points
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateLevelProgress()} 
                      sx={{ height: 10, borderRadius: 2 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Attributes */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attributes
                  </Typography>
                  
                  {profile.attributes && (
                    <Box>
                      {/* Strength */}
                      <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                          Strength (Lvl {profile.attributes.strength.level})
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={profile.attributes.strength.progress} 
                          color="error"
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      
                      {/* Cardio */}
                      <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                          Cardio (Lvl {profile.attributes.cardio.level})
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={profile.attributes.cardio.progress} 
                          color="primary"
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      
                      {/* Flexibility */}
                      <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                          Flexibility (Lvl {profile.attributes.flexibility.level})
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={profile.attributes.flexibility.progress} 
                          color="success"
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      
                      {/* Balance */}
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Balance (Lvl {profile.attributes.balance.level})
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={profile.attributes.balance.progress} 
                          color="warning"
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
        {/* Game Board */}
        {gameBoard && (
          <Card variant="outlined" sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  <MapIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                  {gameBoard.boardName}
                </Typography>
                <Chip 
                  label={`Space ${gameBoard.currentPosition} of ${gameBoard.totalSpaces}`} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
              
              <Box mb={3}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(0, 0, 0, 0.05)', 
                  border: '1px dashed rgba(0, 0, 0, 0.2)'
                }}>
                  <Typography variant="subtitle1">
                    {gameBoard.currentSpace.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {gameBoard.currentSpace.description}
                  </Typography>
                  
                  {gameBoard.currentSpace.reward && (
                    <Box mt={1} display="flex" alignItems="center">
                      <StarIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" fontWeight="medium">
                        {gameBoard.currentSpace.reward.message || `Reward: ${gameBoard.currentSpace.reward.points} points`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              
              {/* Last Roll Info */}
              {gameBoard.lastRoll && (
                <Box mb={3} display="flex" alignItems="center">
                  <CasinoIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    Last roll: You rolled a{' '}
                    <Box component="span" fontWeight="bold" color="primary.main">
                      {gameBoard.lastRoll.value}
                    </Box>
                    {' '}and moved from space {gameBoard.lastRoll.fromPosition} to {gameBoard.lastRoll.toPosition}.
                  </Typography>
                </Box>
              )}
              
              {/* Roll Button */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<CasinoIcon />}
                disabled={loading || !gameBoard.nextRollAvailable}
                onClick={handleRollDice}
                fullWidth
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : gameBoard.nextRollAvailable ? (
                  'Roll Dice & Move'
                ) : (
                  'Next Roll Available Tomorrow'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Achievements */}
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Achievements
              </Typography>
              <Box>
                <Button 
                  size="small" 
                  variant={achievementFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setAchievementFilter('all')}
                  sx={{ mr: 1 }}
                >
                  All
                </Button>
                <Button 
                  size="small" 
                  variant={achievementFilter === 'completed' ? 'contained' : 'outlined'}
                  onClick={() => setAchievementFilter('completed')}
                  sx={{ mr: 1 }}
                >
                  Completed
                </Button>
                <Button 
                  size="small" 
                  variant={achievementFilter === 'inProgress' ? 'contained' : 'outlined'}
                  onClick={() => setAchievementFilter('inProgress')}
                >
                  In Progress
                </Button>
              </Box>
            </Box>
            
            {/* Loading State */}
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : (
              // Achievements Grid
              <Grid container spacing={2}>
                {filteredAchievements.map((achievement) => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        position: 'relative',
                        bgcolor: achievement.completed ? 'rgba(76, 175, 80, 0.05)' : 'inherit',
                        border: achievement.completed ? `1px solid ${getBadgeColor(achievement.tier)}` : '1px solid rgba(0,0,0,0.12)'
                      }}
                    >
                      {/* Tier Badge */}
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: getBadgeColor(achievement.tier),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <StarIcon sx={{ fontSize: 16, color: '#fff' }} />
                      </Box>
                      
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Avatar 
                            sx={{ 
                              bgcolor: getBadgeColor(achievement.tier),
                              mr: 1.5
                            }}
                          >
                            {getIconComponent(achievement.icon)}
                          </Avatar>
                          <Typography variant="h6" gutterBottom={false}>
                            {achievement.name}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {achievement.description}
                        </Typography>
                        
                        {achievement.completed ? (
                          <Box display="flex" alignItems="center" mt={2}>
                            <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Completed{achievement.dateCompleted && ` on ${new Date(achievement.dateCompleted).toLocaleDateString()}`}
                            </Typography>
                          </Box>
                        ) : (
                          <Box mt={2}>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                              <Typography variant="body2">
                                Progress
                              </Typography>
                              <Typography variant="body2">
                                {achievement.progress} / {achievement.totalRequired}
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((achievement.progress / achievement.totalRequired) * 100, 100)} 
                              sx={{ height: 8, borderRadius: 1 }}
                            />
                          </Box>
                        )}
                        
                        {/* Point Value */}
                        <Chip 
                          icon={<StarIcon />} 
                          label={`${achievement.pointValue} Points`}
                          size="small"
                          sx={{ mt: 2 }}
                          color={achievement.completed ? "success" : "default"}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                
                {filteredAchievements.length === 0 && (
                  <Grid item xs={12}>
                    <Box p={4} textAlign="center">
                      <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6">No Achievements Found</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievementFilter === 'completed' ? 
                          "You haven't completed any achievements yet. Keep going!" : 
                          achievementFilter === 'inProgress' ? 
                          "All achievements are either completed or not started yet." : 
                          "No achievements available. Check back later."}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Card>
        
        {/* Challenges */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                <FlagIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Challenges & Quests
              </Typography>
              <Box>
                <Button 
                  size="small" 
                  variant={challengeFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setChallengeFilter('all')}
                  sx={{ mr: 1 }}
                >
                  All
                </Button>
                <Button 
                  size="small" 
                  variant={challengeFilter === 'active' ? 'contained' : 'outlined'}
                  onClick={() => setChallengeFilter('active')}
                  sx={{ mr: 1 }}
                >
                  Active
                </Button>
                <Button 
                  size="small" 
                  variant={challengeFilter === 'available' ? 'contained' : 'outlined'}
                  onClick={() => setChallengeFilter('available')}
                  sx={{ mr: 1 }}
                >
                  Available
                </Button>
                <Button 
                  size="small" 
                  variant={challengeFilter === 'completed' ? 'contained' : 'outlined'}
                  onClick={() => setChallengeFilter('completed')}
                >
                  Completed
                </Button>
              </Box>
            </Box>
            
            {/* Loading State */}
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : (
              // Challenges List
              <Box>
                {filteredChallenges.map((challenge) => (
                  <Card 
                    key={challenge.id} 
                    variant="outlined" 
                    sx={{ 
                      mb: 2,
                      bgcolor: 
                        challenge.status === 'completed' ? 'rgba(76, 175, 80, 0.05)' : 
                        challenge.status === 'active' ? 'rgba(33, 150, 243, 0.05)' : 
                        'inherit'
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="flex-start">
                        {/* Status Icon */}
                        <Avatar 
                          sx={{ 
                            bgcolor: 
                              challenge.status === 'completed' ? theme.palette.success.main : 
                              challenge.status === 'active' ? theme.palette.primary.main : 
                              challenge.status === 'available' ? theme.palette.warning.main : 
                              theme.palette.grey[500],
                            mr: 2
                          }}
                        >
                          {challenge.status === 'completed' ? <CheckCircleOutlineIcon /> : 
                           challenge.status === 'active' ? <HourglassEmptyIcon /> : 
                           challenge.status === 'available' ? <LightbulbOutlinedIcon /> : 
                           <PsychologyIcon />}
                        </Avatar>
                        
                        <Box flexGrow={1}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">
                              {challenge.name}
                            </Typography>
                            <Chip 
                              label={challenge.difficulty} 
                              size="small"
                              color={
                                challenge.difficulty === 'easy' ? 'success' :
                                challenge.difficulty === 'medium' ? 'info' :
                                challenge.difficulty === 'hard' ? 'warning' :
                                'error'
                              }
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {challenge.description}
                          </Typography>
                          
                          {/* Progress (for active challenges) */}
                          {challenge.status === 'active' && (
                            <Box mt={2} mb={2}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="body2">
                                  Progress
                                </Typography>
                                <Typography variant="body2">
                                  {challenge.progress} / {challenge.totalRequired}
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min((challenge.progress / challenge.totalRequired) * 100, 100)} 
                                sx={{ height: 8, borderRadius: 1 }}
                              />
                            </Box>
                          )}
                          
                          {/* Expiry Date (for active challenges) */}
                          {challenge.status === 'active' && challenge.expiryDate && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Expires: {new Date(challenge.expiryDate).toLocaleDateString()}
                            </Typography>
                          )}
                          
                          {/* Reward */}
                          <Box display="flex" alignItems="center" mt={1}>
                            <StarIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">
                              Reward: {challenge.reward.points} Points
                              {challenge.reward.badge && ` + "${challenge.reward.badge}" Badge`}
                            </Typography>
                          </Box>
                          
                          {/* Join Button (for available challenges) */}
                          {challenge.status === 'available' && (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleJoinChallenge(challenge.id)}
                              sx={{ mt: 2 }}
                            >
                              Accept Challenge
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredChallenges.length === 0 && (
                  <Box p={4} textAlign="center">
                    <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">No Challenges Found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {challengeFilter === 'completed' ? 
                        "You haven't completed any challenges yet." : 
                        challengeFilter === 'active' ? 
                        "You don't have any active challenges. Try accepting some!" : 
                        challengeFilter === 'available' ? 
                        "There are no available challenges at the moment. Check back later." :
                        "No challenges available in any category. Check back later."}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
};

// Mock data generators for development
const generateMockProfile = (): UserProfile => ({
  id: '1',
  level: 24,
  points: 4850,
  streak: 8,
  nextLevelPoints: 5000,
  tier: 'silver',
  attributes: {
    strength: { level: 28, progress: 65 },
    cardio: { level: 22, progress: 40 },
    flexibility: { level: 20, progress: 75 },
    balance: { level: 18, progress: 30 }
  }
});

const generateMockAchievements = (): Achievement[] => [
  {
    id: '1',
    name: 'Consistency Champion',
    description: 'Maintain a 7-day workout streak',
    icon: 'Lightning',
    completed: true,
    progress: 7,
    totalRequired: 7,
    dateCompleted: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'silver',
    pointValue: 300
  },
  {
    id: '2',
    name: 'Strength Builder',
    description: 'Complete 50 strength workouts',
    icon: 'Trophy',
    completed: false,
    progress: 32,
    totalRequired: 50,
    tier: 'gold',
    pointValue: 500
  },
  {
    id: '3',
    name: 'Nutrition Master',
    description: 'Log 30 high-quality meals',
    icon: 'Star',
    completed: false,
    progress: 22,
    totalRequired: 30,
    tier: 'silver',
    pointValue: 300
  },
  {
    id: '4',
    name: 'First Steps',
    description: 'Complete your first workout',
    icon: 'Medal',
    completed: true,
    progress: 1,
    totalRequired: 1,
    dateCompleted: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'bronze',
    pointValue: 100
  },
  {
    id: '5',
    name: 'Level 10 Milestone',
    description: 'Reach level 10 in your fitness journey',
    icon: 'Trophy',
    completed: true,
    progress: 10,
    totalRequired: 10,
    dateCompleted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'silver',
    pointValue: 250
  },
  {
    id: '6',
    name: 'Cardio King',
    description: 'Complete 30 cardio workouts',
    icon: 'Heart',
    completed: false,
    progress: 18,
    totalRequired: 30,
    tier: 'silver',
    pointValue: 300
  }
];

const generateMockGameBoard = (): GameBoard => ({
  currentPosition: 14,
  totalSpaces: 30,
  boardName: 'Wellness Journey',
  currentSpace: {
    id: 'space-14',
    name: 'Wisdom Spring',
    description: 'You have landed on a space that increases your knowledge of health and fitness.',
    type: 'wisdom',
    reward: {
      points: 20,
      message: 'You gained 20 points for fitness wisdom!'
    }
  },
  lastRoll: {
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    value: 4,
    fromPosition: 10,
    toPosition: 14
  },
  nextRollAvailable: true
});

const generateMockChallenges = (): Challenge[] => [
  {
    id: '1',
    name: '30-Day Plank Challenge',
    description: 'Complete a plank exercise every day for 30 days, increasing duration each day.',
    difficulty: 'medium',
    status: 'active',
    progress: 18,
    totalRequired: 30,
    reward: {
      points: 500,
      badge: 'Core Master'
    },
    expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    name: 'Hydration Hero',
    description: 'Drink at least 8 glasses of water every day for 14 days.',
    difficulty: 'easy',
    status: 'completed',
    progress: 14,
    totalRequired: 14,
    reward: {
      points: 300
    }
  },
  {
    id: '3',
    name: 'Strength Summit',
    description: 'Complete 20 strength workouts within 60 days.',
    difficulty: 'hard',
    status: 'available',
    progress: 0,
    totalRequired: 20,
    reward: {
      points: 600,
      badge: 'Strength Summiteer'
    }
  },
  {
    id: '4',
    name: 'Nutrition Challenge',
    description: 'Log 21 consecutive days of balanced nutrition with proper protein intake.',
    difficulty: 'medium',
    status: 'available',
    progress: 0,
    totalRequired: 21,
    reward: {
      points: 450
    }
  }
];

export default GamificationDisplay;