/**
 * Gamification Overview Component
 * 7-Star AAA Personal Training & Social Media App
 * 
 * Comprehensive gamification system featuring:
 * - Achievement tracking and celebration
 * - Progressive level system with rewards
 * - Badge collection and rarity system
 * - Leaderboards and competitive elements
 * - Challenge creation and participation
 * - Social aspects and community engagement
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress as MUICircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Fade,
  Grow,
  Zoom,
  Slide
} from '@mui/material';
import {
  EmojiEvents,
  Star,
  StarBorder,
  LocalFireDepartment,
  Timeline as TimelineIcon,
  TrendingUp,
  Group,
  BattleCamp,
  Assignment,
  Celebration,
  ExpandMore,
  LockOutlined,
  CheckCircle,
  Timer,
  Speed,
  FitnessCenter,
  DirectionsBike,
  Pool,
  SelfImprovement,
  MonitorWeight,
  RestaurantMenu,
  Psychology,
  Social,
  Share,
  Leaderboard,
  Crown,
  Shield,
  Gavel,
  MilitaryTech,
  Verified,
  Diamond,
  PersonPin,
  Groups,
  Competition,
  Rocket,
  AutoAwesome,
  Bolt,
  Flash,
  Grade,
  WorkspacePremium,
  Collections,
  Inventory,
  Category,
  FilterList,
  Sort,
  Refresh,
  Looks,
  ViewInAr
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Define interfaces
interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'strength' | 'endurance' | 'consistency' | 'social' | 'nutrition' | 'recovery';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  points: number;
  icon: string;
  unlockCondition: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
  unlockedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  secretAchievement?: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  earnedDate: string;
  count?: number;
  criteria: string;
}

interface Level {
  level: number;
  name: string;
  description: string;
  minXP: number;
  maxXP: number;
  rewards: {
    type: 'badge' | 'unlock' | 'bonus';
    value: string;
    description: string;
  }[];
  features: string[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'community' | 'competitive';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  duration: string;
  startDate: string;
  endDate: string;
  participants: number;
  rewards: {
    position: number;
    points: number;
    badges?: string[];
    extras?: string;
  }[];
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  status: 'upcoming' | 'active' | 'completed';
  joined?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  points: number;
  level: number;
  badges: number;
  streak: number;
  change: 'up' | 'down' | 'same';
  position_change: number;
}

// Styled components
const GamificationCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05))',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(255, 215, 0, 0.15)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
  },
}));

const AchievementCard = styled(Card)<{ unlocked?: boolean; rarity?: string }>(({ theme, unlocked, rarity }) => ({
  background: unlocked 
    ? `linear-gradient(135deg, ${
        rarity === 'legendary' ? 'rgba(255, 215, 0, 0.1)' :
        rarity === 'epic' ? 'rgba(156, 39, 176, 0.1)' :
        rarity === 'rare' ? 'rgba(33, 150, 243, 0.1)' :
        'rgba(76, 175, 80, 0.1)'
      }, rgba(255, 255, 255, 0.05))`
    : 'rgba(255, 255, 255, 0.02)',
  borderRadius: 12,
  border: unlocked 
    ? `1px solid ${
        rarity === 'legendary' ? 'rgba(255, 215, 0, 0.5)' :
        rarity === 'epic' ? 'rgba(156, 39, 176, 0.5)' :
        rarity === 'rare' ? 'rgba(33, 150, 243, 0.5)' :
        'rgba(76, 175, 80, 0.5)'
      }`
    : '1px solid rgba(255, 255, 255, 0.1)',
  opacity: unlocked ? 1 : 0.6,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: unlocked ? 'translateY(-2px)' : 'none',
    boxShadow: unlocked ? '0 8px 24px rgba(255, 215, 0, 0.1)' : 'none',
  },
}));

const RarityChip = styled(Chip)<{ rarity: string }>(({ theme, rarity }) => ({
  background: 
    rarity === 'legendary' ? 'linear-gradient(45deg, #ffd700, #ffed4e)' :
    rarity === 'epic' ? 'linear-gradient(45deg, #9c27b0, #e91e63)' :
    rarity === 'rare' ? 'linear-gradient(45deg, #2196f3, #03dac6)' :
    'linear-gradient(45deg, #4caf50, #8bc34a)',
  color: 'white',
  fontWeight: 'bold',
  '& .MuiChip-icon': {
    color: 'white'
  }
}));

const LevelDisplay = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
  border: '3px solid #fff',
  boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
}));

const GameButton = styled(Button)(({ theme, variant: buttonVariant }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  ...(buttonVariant === 'contained' && {
    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
    color: '#0a0a1a',
    '&:hover': {
      background: 'linear-gradient(135deg, #ffed4e, #ffd700)',
      transform: 'scale(1.05)',
    },
  }),
  ...(buttonVariant === 'outlined' && {
    borderColor: 'rgba(255, 215, 0, 0.5)',
    color: '#ffd700',
    '&:hover': {
      borderColor: '#ffd700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      transform: 'scale(1.05)',
    },
  }),
}));

interface GamificationOverviewProps {
  clientId: string;
  onAchievementCelebrate?: (achievementId: string) => void;
  onChallengeJoin?: (challengeId: string) => void;
  onChallengeCreate?: () => void;
}

const GamificationOverview: React.FC<GamificationOverviewProps> = ({
  clientId,
  onAchievementCelebrate,
  onChallengeJoin,
  onChallengeCreate
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string>('all');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('stats');

  // Mock data
  const clientLevel: Level = {
    level: 15,
    name: "Fitness Warrior",
    description: "Master of strength and dedication",
    minXP: 12000,
    maxXP: 15000,
    rewards: [
      { type: 'badge', value: 'Golden Warrior', description: 'Exclusive level 15 badge' },
      { type: 'unlock', value: 'Advanced Programs', description: 'Access to elite workout plans' },
      { type: 'bonus', value: '500 XP', description: 'XP boost for next level' }
    ],
    features: ['Premium analytics', 'Personal trainer access', 'Custom meal plans']
  };

  const currentXP = 14250;
  const nextLevelXP = 3000;
  const streakDays = 35;
  const totalPoints = 15680;

  const mockAchievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first workout',
      category: 'strength',
      difficulty: 'bronze',
      points: 100,
      icon: '/icons/first-workout.png',
      unlockCondition: 'Complete 1 workout',
      progress: 1,
      maxProgress: 1,
      isUnlocked: true,
      unlockedDate: '2024-01-15',
      rarity: 'common'
    },
    {
      id: '2',
      title: 'Consistency King',
      description: 'Maintain a 30-day workout streak',
      category: 'consistency',
      difficulty: 'gold',
      points: 500,
      icon: '/icons/streak.png',
      unlockCondition: 'Workout for 30 consecutive days',
      progress: 35,
      maxProgress: 30,
      isUnlocked: true,
      unlockedDate: '2024-11-15',
      rarity: 'rare'
    },
    {
      id: '3',
      title: 'Iron Will',
      description: 'Lift 10,000 kg total in deadlifts',
      category: 'strength',
      difficulty: 'platinum',
      points: 1000,
      icon: '/icons/iron-will.png',
      unlockCondition: 'Reach 10,000 kg total deadlift volume',
      progress: 8500,
      maxProgress: 10000,
      isUnlocked: false,
      rarity: 'epic'
    },
    {
      id: '4',
      title: 'Social Butterfly',
      description: 'Get 100 likes on workout posts',
      category: 'social',
      difficulty: 'silver',
      points: 300,
      icon: '/icons/social.png',
      unlockCondition: 'Receive 100 total likes',
      progress: 127,
      maxProgress: 100,
      isUnlocked: true,
      unlockedDate: '2024-10-20',
      rarity: 'rare'
    },
    {
      id: '5',
      title: 'The Chosen One',
      description: 'A legendary achievement for the elite',
      category: 'strength',
      difficulty: 'diamond',
      points: 5000,
      icon: '/icons/legendary.png',
      unlockCondition: '???',
      progress: 0,
      maxProgress: 1,
      isUnlocked: false,
      rarity: 'legendary',
      secretAchievement: true
    }
  ];

  const mockBadges: Badge[] = [
    {
      id: 'b1',
      name: 'Workout Warrior',
      description: 'Completed 100 workouts',
      iconUrl: '/badges/warrior.png',
      rarity: 'rare',
      category: 'Achievements',
      earnedDate: '2024-11-01',
      count: 127,
      criteria: 'Complete 100 workouts'
    },
    {
      id: 'b2',
      name: 'Consistency Champion',
      description: '30-day streak achiever',
      iconUrl: '/badges/consistency.png',
      rarity: 'epic',
      category: 'Streaks',
      earnedDate: '2024-11-15',
      criteria: 'Maintain 30-day workout streak'
    },
    {
      id: 'b3',
      name: 'Social Star',
      description: 'Most liked posts this month',
      iconUrl: '/badges/social.png',
      rarity: 'rare',
      category: 'Social',
      earnedDate: '2024-12-01',
      criteria: 'Highest engagement rate'
    }
  ];

  const mockChallenges: Challenge[] = [
    {
      id: 'c1',
      title: 'December Deadlift Challenge',
      description: 'Complete 1000 total deadlifts this month',
      type: 'community',
      category: 'Strength',
      difficulty: 'hard',
      duration: '30 days',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      participants: 243,
      rewards: [
        { position: 1, points: 2000, badges: ['Deadlift King'], extras: 'Free protein powder' },
        { position: 3, points: 1000, badges: ['Top Lifter'] },
        { position: 10, points: 500 }
      ],
      progress: {
        current: 450,
        target: 1000,
        unit: 'deadlifts'
      },
      status: 'active',
      joined: true
    },
    {
      id: 'c2',
      title: 'New Year Transformation',
      description: '12-week body transformation challenge',
      type: 'competitive',
      category: 'Overall',
      difficulty: 'extreme',
      duration: '84 days',
      startDate: '2025-01-01',
      endDate: '2025-03-25',
      participants: 0,
      rewards: [
        { position: 1, points: 10000, badges: ['Transformation Champion'], extras: 'Free personal training package' },
        { position: 5, points: 5000, badges: ['Transform Pro'] },
        { position: 20, points: 2000 }
      ],
      status: 'upcoming',
      joined: false
    }
  ];

  const mockLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: 'u1',
      username: 'FitnessKing01',
      avatar: '/avatars/user1.jpg',
      points: 25680,
      level: 22,
      badges: 45,
      streak: 85,
      change: 'same',
      position_change: 0
    },
    {
      rank: 2,
      userId: 'u2',
      username: 'IronMaven',
      avatar: '/avatars/user2.jpg',
      points: 24120,
      level: 21,
      badges: 38,
      streak: 67,
      change: 'up',
      position_change: 2
    },
    {
      rank: 3,
      userId: 'u3',
      username: 'GymQueen',
      avatar: '/avatars/user3.jpg',
      points: 22890,
      level: 20,
      badges: 41,
      streak: 45,
      change: 'down',
      position_change: -1
    },
    {
      rank: 15,
      userId: clientId,
      username: 'YourUsername',
      avatar: '/avatars/current.jpg',
      points: 15680,
      level: 15,
      badges: 18,
      streak: 35,
      change: 'up',
      position_change: 3
    }
  ];

  // Filter achievements based on category and status
  const filteredAchievements = useMemo(() => {
    return mockAchievements.filter(achievement => {
      if (filteredCategory !== 'all' && achievement.category !== filteredCategory) {
        return false;
      }
      if (achievementFilter === 'unlocked' && !achievement.isUnlocked) {
        return false;
      }
      if (achievementFilter === 'locked' && achievement.isUnlocked) {
        return false;
      }
      return true;
    });
  }, [mockAchievements, filteredCategory, achievementFilter]);

  // Render overview dashboard
  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* User Level and Progress */}
      <Grid item xs={12} md={6} lg={4}>
        <GamificationCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <LevelDisplay>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#0a0a1a' }}>
                {clientLevel.level}
              </Typography>
            </LevelDisplay>
            <Typography variant="h6" sx={{ color: '#ffd700', mt: 2 }}>
              {clientLevel.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {clientLevel.description}
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Level Progress
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {currentXP - clientLevel.minXP}/{nextLevelXP} XP
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={((currentXP - clientLevel.minXP) / nextLevelXP) * 100}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#ffd700',
                    borderRadius: 6
                  }
                }}
              />
            </Box>
          </CardContent>
        </GamificationCard>
      </Grid>

      {/* Quick Stats */}
      <Grid item xs={12} md={6} lg={8}>
        <GamificationCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#ffd700', mb: 3 }}>
              Your Gaming Stats
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2 }}>
                  <LocalFireDepartment sx={{ fontSize: 40, color: '#ff5722', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#ff5722', fontWeight: 700 }}>
                    {streakDays}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Day Streak
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2 }}>
                  <Star sx={{ fontSize: 40, color: '#ffd700', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#ffd700', fontWeight: 700 }}>
                    {totalPoints.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Points
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2 }}>
                  <EmojiEvents sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                    {mockAchievements.filter(a => a.isUnlocked).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Achievements
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2 }}>
                  <Crown sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 700 }}>
                    {mockBadges.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Badges Earned
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </GamificationCard>
      </Grid>

      {/* Recent Achievements */}
      <Grid item xs={12}>
        <GamificationCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#ffd700', mb: 3 }}>
              Recent Achievements
            </Typography>
            <Timeline sx={{ px: 0 }}>
              {mockAchievements
                .filter(a => a.isUnlocked)
                .slice(0, 3)
                .map((achievement, index) => (
                  <TimelineItem key={achievement.id}>
                    <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                      {achievement.unlockedDate && new Date(achievement.unlockedDate).toLocaleDateString()}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: '#ffd700' }}>
                        <EmojiEvents />
                      </TimelineDot>
                      {index < 2 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Typography variant="h6" component="span">
                        {achievement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <RarityChip rarity={achievement.rarity} label={achievement.rarity} size="small" />
                        <Chip label={`+${achievement.points} points`} size="small" sx={{ ml: 1 }} />
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                ))}
            </Timeline>
          </CardContent>
        </GamificationCard>
      </Grid>
    </Grid>
  );

  // Render achievements section
  const renderAchievements = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffd700' }}>
          Achievements ({filteredAchievements.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: '#a0a0a0' }}>Category</InputLabel>
            <Select
              value={filteredCategory}
              label="Category"
              onChange={(e) => setFilteredCategory(e.target.value)}
              sx={{ color: '#e0e0e0' }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="strength">Strength</MenuItem>
              <MenuItem value="endurance">Endurance</MenuItem>
              <MenuItem value="consistency">Consistency</MenuItem>
              <MenuItem value="social">Social</MenuItem>
              <MenuItem value="nutrition">Nutrition</MenuItem>
            </Select>
          </FormControl>
          <ButtonGroup variant="outlined" size="small">
            <GameButton 
              variant={achievementFilter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setAchievementFilter('all')}
            >
              All
            </GameButton>
            <GameButton 
              variant={achievementFilter === 'unlocked' ? 'contained' : 'outlined'}
              onClick={() => setAchievementFilter('unlocked')}
            >
              Unlocked
            </GameButton>
            <GameButton 
              variant={achievementFilter === 'locked' ? 'contained' : 'outlined'}
              onClick={() => setAchievementFilter('locked')}
            >
              Locked
            </GameButton>
          </ButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {filteredAchievements.map((achievement) => (
          <Grid item xs={12} sm={6} md={4} key={achievement.id}>
            <AchievementCard unlocked={achievement.isUnlocked} rarity={achievement.rarity}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={achievement.icon}
                      sx={{ 
                        width: 48, 
                        height: 48,
                        border: `2px solid ${achievement.isUnlocked ? '#ffd700' : '#666'}`,
                        opacity: achievement.isUnlocked ? 1 : 0.5
                      }}
                    >
                      {achievement.isUnlocked ? <EmojiEvents /> : <LockOutlined />}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {achievement.secretAchievement && !achievement.isUnlocked 
                          ? '???' 
                          : achievement.title
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.secretAchievement && !achievement.isUnlocked 
                          ? 'Secret Achievement' 
                          : achievement.description
                        }
                      </Typography>
                    </Box>
                  </Box>
                  {achievement.isUnlocked && (
                    <Tooltip title="Celebrate Achievement">
                      <IconButton size="small" onClick={() => setShowCelebration(achievement.id)}>
                        <Celebration />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <RarityChip rarity={achievement.rarity} label={achievement.rarity} size="small" />
                  <Chip label={achievement.category} size="small" variant="outlined" />
                  <Chip label={`${achievement.points} pts`} size="small" sx={{ color: '#ffd700' }} />
                </Box>

                {!achievement.isUnlocked && !achievement.secretAchievement && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption">
                        {achievement.progress}/{achievement.maxProgress}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(achievement.progress / achievement.maxProgress) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#ffd700',
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                )}

                {achievement.isUnlocked && achievement.unlockedDate && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 2, display: 'block' }}>
                    Unlocked on {new Date(achievement.unlockedDate).toLocaleDateString()}
                  </Typography>
                )}
              </CardContent>
            </AchievementCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render badges section
  const renderBadges = () => (
    <Box>
      <Typography variant="h6" sx={{ color: '#ffd700', mb: 3 }}>
        Badge Collection ({mockBadges.length})
      </Typography>
      <Grid container spacing={2}>
        {mockBadges.map((badge) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={badge.id}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <Avatar
                src={badge.iconUrl}
                sx={{ 
                  width: 64, 
                  height: 64, 
                  mx: 'auto', 
                  mb: 1,
                  border: `2px solid ${
                    badge.rarity === 'legendary' ? '#ffd700' :
                    badge.rarity === 'epic' ? '#9c27b0' :
                    badge.rarity === 'rare' ? '#2196f3' : '#4caf50'
                  }`
                }}
              >
                <Verified />
              </Avatar>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                {badge.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {badge.description}
              </Typography>
              <RarityChip rarity={badge.rarity} label={badge.rarity} size="small" />
              {badge.count && (
                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#ffd700' }}>
                  Count: {badge.count}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render challenges section
  const renderChallenges = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffd700' }}>
          Active Challenges
        </Typography>
        <GameButton variant="contained" startIcon={<Add />} onClick={onChallengeCreate}>
          Create Challenge
        </GameButton>
      </Box>

      <Grid container spacing={3}>
        {mockChallenges.map((challenge) => (
          <Grid item xs={12} md={6} key={challenge.id}>
            <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {challenge.title}
                  </Typography>
                  <Chip 
                    label={challenge.status} 
                    size="small"
                    color={
                      challenge.status === 'active' ? 'success' :
                      challenge.status === 'upcoming' ? 'warning' : 'default'
                    }
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {challenge.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={challenge.type} size="small" />
                  <Chip label={challenge.difficulty} size="small" color={
                    challenge.difficulty === 'extreme' ? 'error' :
                    challenge.difficulty === 'hard' ? 'warning' :
                    challenge.difficulty === 'medium' ? 'info' : 'success'
                  } />
                  <Chip label={`${challenge.participants} participants`} size="small" />
                </Box>

                {challenge.progress && challenge.status === 'active' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Your Progress
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {challenge.progress.current}/{challenge.progress.target} {challenge.progress.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(challenge.progress.current / challenge.progress.target) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#4caf50',
                          borderRadius: 4
                        }
                      }}
                    />
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Top Rewards:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#ffd700' }}>
                    1st: {challenge.rewards[0].points} points
                    {challenge.rewards[0].extras && ` + ${challenge.rewards[0].extras}`}
                  </Typography>
                </Box>

                <GameButton 
                  variant={challenge.joined ? 'outlined' : 'contained'}
                  fullWidth
                  disabled={challenge.status === 'completed'}
                  onClick={() => onChallengeJoin?.(challenge.id)}
                >
                  {challenge.joined ? 'Joined' : 
                   challenge.status === 'upcoming' ? 'Join Challenge' : 
                   challenge.status === 'active' ? 'Join Now' : 'Completed'}
                </GameButton>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render leaderboard section
  const renderLeaderboard = () => (
    <Box>
      <Typography variant="h6" sx={{ color: '#ffd700', mb: 3 }}>
        Monthly Leaderboard
      </Typography>
      <List sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
        {mockLeaderboard.map((entry, index) => (
          <React.Fragment key={entry.userId}>
            <ListItem sx={{ py: 2, bgcolor: entry.userId === clientId ? 'rgba(255, 215, 0, 0.1)' : 'transparent' }}>
              <ListItemIcon>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 60 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mr: 2 }}>
                    #{entry.rank}
                  </Typography>
                  {entry.rank === 1 && <Crown sx={{ color: '#ffd700' }} />}
                  {entry.rank === 2 && <MilitaryTech sx={{ color: '#c0c0c0' }} />}
                  {entry.rank === 3 && <MilitaryTech sx={{ color: '#cd7f32' }} />}
                </Box>
              </ListItemIcon>
              <ListItemIcon>
                <Avatar src={entry.avatar} sx={{ mr: 2 }} />
              </ListItemIcon>
              <ListItemText
                primary={entry.username}
                secondary={`Level ${entry.level} • ${entry.badges} badges • ${entry.streak} day streak`}
                primaryTypographyProps={{ fontWeight: entry.userId === clientId ? 700 : 400 }}
              />
              <ListItemSecondaryAction>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#ffd700' }}>
                    {entry.points.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {entry.change === 'up' && <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />}
                    {entry.change === 'down' && <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />}
                    <Typography variant="caption" color="text.secondary">
                      {entry.change === 'same' ? 'No change' : 
                       entry.change === 'up' ? `+${entry.position_change}` : 
                       entry.position_change}
                    </Typography>
                  </Box>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < mockLeaderboard.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#ffd700', mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <EmojiEvents sx={{ fontSize: 40 }} />
          Gamification Hub
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track achievements, compete with friends, and unlock rewards
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ mb: 3 }}>
        <ButtonGroup variant="outlined" size="large">
          <GameButton 
            variant={selectedTab === 'overview' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('overview')}
            startIcon={<Timeline />}
          >
            Overview
          </GameButton>
          <GameButton 
            variant={selectedTab === 'achievements' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('achievements')}
            startIcon={<EmojiEvents />}
          >
            Achievements
          </GameButton>
          <GameButton 
            variant={selectedTab === 'badges' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('badges')}
            startIcon={<Verified />}
          >
            Badges
          </GameButton>
          <GameButton 
            variant={selectedTab === 'challenges' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('challenges')}
            startIcon={<BattleCamp />}
          >
            Challenges
          </GameButton>
          <GameButton 
            variant={selectedTab === 'leaderboard' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('leaderboard')}
            startIcon={<Leaderboard />}
          >
            Leaderboard
          </GameButton>
        </ButtonGroup>
      </Box>

      {/* Content */}
      <Box>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'badges' && renderBadges()}
        {selectedTab === 'challenges' && renderChallenges()}
        {selectedTab === 'leaderboard' && renderLeaderboard()}
      </Box>

      {/* Celebration Modal */}
      <Dialog
        open={!!showCelebration}
        onClose={() => setShowCelebration(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            borderRadius: 3,
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Zoom in={!!showCelebration}>
            <Celebration sx={{ fontSize: 80, color: '#ffd700', mb: 2 }} />
          </Zoom>
          <Typography variant="h4" sx={{ color: '#ffd700', mb: 2 }}>
            Achievement Unlocked!
          </Typography>
          {showCelebration && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {mockAchievements.find(a => a.id === showCelebration)?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {mockAchievements.find(a => a.id === showCelebration)?.description}
              </Typography>
              <Chip 
                label={`+${mockAchievements.find(a => a.id === showCelebration)?.points} Points`}
                sx={{ bgcolor: '#ffd700', color: '#0a0a1a', fontWeight: 'bold' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <GameButton variant="contained" onClick={() => setShowCelebration(null)}>
            Awesome!
          </GameButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GamificationOverview;