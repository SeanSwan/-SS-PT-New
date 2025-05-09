import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent,
  LinearProgress,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  IconButton,
  Badge
} from '@mui/material';

// Icons
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PeopleIcon from '@mui/icons-material/People';
import DiamondIcon from '@mui/icons-material/Diamond';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import LockIcon from '@mui/icons-material/Lock';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

// Placeholder user data
const userData = {
  name: 'John Doe',
  level: 8,
  points: 2450,
  pointsToNextLevel: 3000,
  tier: 'Gold',
  streak: 14
};

// Achievement data
const achievements = [
  {
    id: 1,
    name: 'Consistency Champion',
    description: 'Complete workouts on 5 consecutive days',
    icon: <WhatshotIcon fontSize="large" />,
    progress: 100,
    completed: true,
    date: '3 days ago'
  },
  {
    id: 2,
    name: 'Strength Builder',
    description: 'Complete 10 strength training workouts',
    icon: <FitnessCenterIcon fontSize="large" />,
    progress: 70,
    completed: false
  },
  {
    id: 3,
    name: 'Early Bird',
    description: 'Complete 5 workouts before 8 AM',
    icon: <QueryBuilderIcon fontSize="large" />,
    progress: 60,
    completed: false
  },
  {
    id: 4,
    name: 'Social Butterfly',
    description: 'Connect with 5 other members',
    icon: <PeopleIcon fontSize="large" />,
    progress: 40,
    completed: false
  },
  {
    id: 5,
    name: 'Full Body Master',
    description: 'Complete all full body workout programs',
    icon: <SelfImprovementIcon fontSize="large" />,
    progress: 100,
    completed: true,
    date: '2 weeks ago'
  },
  {
    id: 6,
    name: 'Cardio King',
    description: 'Burn 5000 calories in cardio workouts',
    icon: <DirectionsRunIcon fontSize="large" />,
    progress: 100,
    completed: true,
    date: '1 month ago'
  }
];

// Locked achievements
const lockedAchievements = [
  {
    id: 7,
    name: '30-Day Warrior',
    description: 'Complete a workout every day for 30 days',
    icon: <LockIcon fontSize="large" />,
    progress: 0,
    completed: false
  },
  {
    id: 8,
    name: 'Marathon Finisher',
    description: 'Complete your first marathon',
    icon: <LockIcon fontSize="large" />,
    progress: 0,
    completed: false
  }
];

// Reward data
const rewards = [
  {
    id: 101,
    name: 'Free Personal Training Session',
    pointCost: 2000,
    available: true
  },
  {
    id: 102,
    name: '15% Off Protein Supplements',
    pointCost: 1000,
    available: true
  },
  {
    id: 103,
    name: 'Premium Workout Plan Access',
    pointCost: 3500,
    available: false
  }
];

// Leaderboard data
const leaderboard = [
  { id: 1, name: 'Sarah J.', points: 4120, level: 12 },
  { id: 2, name: 'Michael T.', points: 3845, level: 11 },
  { id: 3, name: 'John D.', points: 2450, level: 8 },
  { id: 4, name: 'Emma W.', points: 2320, level: 7 },
  { id: 5, name: 'Robert K.', points: 1980, level: 6 }
];

/**
 * GamificationSection Component
 * 
 * A comprehensive gamification section that displays user progress,
 * achievements, rewards, and leaderboard to enhance user engagement.
 */
const GamificationSection: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EmojiEventsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">Achievements</Typography>
      </Box>

      {/* User Progress Card */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    mr: 2,
                    fontSize: '2rem'
                  }}
                >
                  {userData.level}
                </Avatar>
                <Box>
                  <Typography variant="h5">{userData.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Chip 
                      icon={<StarIcon />} 
                      label={`Level ${userData.level}`} 
                      color="primary"
                    />
                    <Chip 
                      icon={<WorkspacePremiumIcon />} 
                      label={userData.tier} 
                      color="secondary"
                    />
                    <Chip 
                      icon={<LocalFireDepartmentIcon />} 
                      label={`${userData.streak} Day Streak`} 
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                Points to next level:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ flexGrow: 1, mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(userData.points / userData.pointsToNextLevel) * 100} 
                    color="primary"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {userData.points} / {userData.pointsToNextLevel}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 2
            }}>
              <DiamondIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary" gutterBottom>
                {userData.points}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Points Earned
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<CardGiftcardIcon />}
                sx={{ mt: 2 }}
              >
                Redeem Points
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Achievements */}
      <Typography variant="h6" gutterBottom>Recent Achievements</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {achievements
          .filter(achievement => achievement.completed)
          .slice(0, 3)
          .map(achievement => (
            <Grid item xs={12} sm={6} md={4} key={achievement.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(0, 255, 255, 0.1)', 
                      borderRadius: '50%',
                      p: 2,
                      mb: 2,
                      color: 'primary.main'
                    }}>
                      {achievement.icon}
                    </Box>
                    <Typography variant="h6">{achievement.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {achievement.description}
                    </Typography>
                    
                    <Chip 
                      label={`Completed ${achievement.date}`} 
                      color="success" 
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
        ))}
      </Grid>

      {/* Achievements In Progress */}
      <Typography variant="h6" gutterBottom>Achievements In Progress</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {achievements
          .filter(achievement => !achievement.completed)
          .map(achievement => (
            <Grid item xs={12} sm={6} md={4} key={achievement.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(0, 255, 255, 0.1)', 
                      borderRadius: '50%',
                      p: 2,
                      mb: 2,
                      color: 'primary.main'
                    }}>
                      {achievement.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>{achievement.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {achievement.description}
                    </Typography>
                    
                    <Box sx={{ width: '100%', mb: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={achievement.progress} 
                        color="primary"
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {achievement.progress}% Complete
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
        ))}
      </Grid>

      {/* Rewards */}
      <Typography variant="h6" gutterBottom>Available Rewards</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {rewards.map(reward => (
          <Grid item xs={12} sm={6} md={4} key={reward.id}>
            <Card sx={{ 
              height: '100%',
              opacity: reward.available ? 1 : 0.6
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  <Typography variant="h6" gutterBottom>{reward.name}</Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mt: 'auto', 
                    justifyContent: 'space-between' 
                  }}>
                    <Chip 
                      icon={<DiamondIcon />} 
                      label={`${reward.pointCost} Points`} 
                      color="primary"
                      variant="outlined"
                    />
                    <Button 
                      variant="contained" 
                      size="small"
                      disabled={!reward.available || userData.points < reward.pointCost}
                    >
                      Redeem
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leaderboard */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Leaderboard</Typography>
        <List>
          {leaderboard.map((user, index) => (
            <React.Fragment key={user.id}>
              <ListItem sx={{ 
                py: 1.5,
                bgcolor: user.name === userData.name ? 'rgba(0, 255, 255, 0.05)' : 'transparent',
                borderRadius: 1
              }}>
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: index < 3 ? 
                      index === 0 ? 'gold' : 
                      index === 1 ? 'silver' : 
                      'brown' : 'gray',
                    color: 'text.primary',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user.name}
                  secondary={`Level ${user.level}`}
                />
                <Chip 
                  icon={<StarIcon />} 
                  label={`${user.points} pts`} 
                  color={user.name === userData.name ? "primary" : "default"}
                  variant={user.name === userData.name ? "filled" : "outlined"}
                  size="small"
                />
              </ListItem>
              {index < leaderboard.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default GamificationSection;