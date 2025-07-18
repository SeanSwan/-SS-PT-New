import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Target,
  Trophy,
  Calendar,
  Plus,
  Edit,
  Check,
  Clock,
  TrendingUp,
  Flag,
  Star,
  Award,
  CheckCircle,
  Circle,
  AlertCircle,
  Timeline
} from 'lucide-react';

// Import chart components
import ProgressAreaChart from '../../../FitnessStats/charts/ProgressAreaChart';

// Import proper type definitions
import type { GoalProgressTrackerProps } from './types';

/**
 * GoalProgressTracker Component
 * 
 * Advanced goal tracking and milestone management for trainers including:
 * - SMART goal setting and tracking
 * - Milestone breakdown and progress
 * - Timeline visualization
 * - Achievement predictions
 * - Motivation and accountability tools
 */
const GoalProgressTracker: React.FC<GoalProgressTrackerProps> = ({
  clientId,
  clientData,
  onGoalUpdate
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('active');

  // Generate comprehensive goal tracking data
  const goalTrackingData = useMemo(() => {
    if (!clientData) return null;

    return {
      summary: {
        totalGoals: 8,
        activeGoals: 5,
        completedGoals: 2,
        overdueGoals: 1,
        averageProgress: 67,
        onTrackGoals: 4
      },

      goals: [
        {
          id: 'goal-1',
          title: 'Lose 15 lbs',
          category: 'Weight Loss',
          type: 'measurable',
          status: 'active',
          priority: 'high',
          progress: 78,
          startDate: '2024-01-15',
          targetDate: '2024-08-15',
          completedDate: null,
          
          currentValue: 11.7,
          targetValue: 15,
          unit: 'lbs',
          
          milestones: [
            { id: 'm1', title: 'Lose 5 lbs', target: 5, current: 5, completed: true, date: '2024-03-15' },
            { id: 'm2', title: 'Lose 10 lbs', target: 10, current: 10, completed: true, date: '2024-05-20' },
            { id: 'm3', title: 'Lose 15 lbs', target: 15, current: 11.7, completed: false, estimatedDate: '2024-08-01' }
          ],
          
          progressHistory: [
            { date: '2024-01-15', value: 0 },
            { date: '2024-02-15', value: 2.5 },
            { date: '2024-03-15', value: 5 },
            { date: '2024-04-15', value: 7.2 },
            { date: '2024-05-15', value: 9.8 },
            { date: '2024-06-15', value: 11.7 }
          ],
          
          insights: {
            trend: 'positive',
            predictedCompletion: '2024-07-28',
            likelihood: 92,
            weeklyRate: 0.8,
            recommendation: 'Excellent progress! Current rate puts you ahead of schedule.'
          }
        },
        {
          id: 'goal-2',
          title: 'Bench Press 100kg',
          category: 'Strength',
          type: 'performance',
          status: 'active',
          priority: 'high',
          progress: 85,
          startDate: '2024-02-01',
          targetDate: '2024-07-01',
          completedDate: null,
          
          currentValue: 85,
          targetValue: 100,
          unit: 'kg',
          
          milestones: [
            { id: 'm1', title: '80kg Bench', target: 80, current: 80, completed: true, date: '2024-04-10' },
            { id: 'm2', title: '90kg Bench', target: 90, current: 85, completed: false, estimatedDate: '2024-06-15' },
            { id: 'm3', title: '100kg Bench', target: 100, current: 85, completed: false, estimatedDate: '2024-07-01' }
          ],
          
          progressHistory: [
            { date: '2024-02-01', value: 70 },
            { date: '2024-03-01', value: 75 },
            { date: '2024-04-01', value: 80 },
            { date: '2024-05-01', value: 82.5 },
            { date: '2024-06-01', value: 85 }
          ],
          
          insights: {
            trend: 'positive',
            predictedCompletion: '2024-07-15',
            likelihood: 87,
            weeklyRate: 1.2,
            recommendation: 'Strong progress. Consider periodization for final push.'
          }
        },
        {
          id: 'goal-3',
          title: 'Run 5K under 25 minutes',
          category: 'Cardiovascular',
          type: 'performance',
          status: 'active',
          priority: 'medium',
          progress: 60,
          startDate: '2024-03-01',
          targetDate: '2024-09-01',
          completedDate: null,
          
          currentValue: 27.5,
          targetValue: 25,
          unit: 'minutes',
          
          milestones: [
            { id: 'm1', title: 'Run 5K under 30min', target: 30, current: 27.5, completed: true, date: '2024-04-15' },
            { id: 'm2', title: 'Run 5K under 27min', target: 27, current: 27.5, completed: false, estimatedDate: '2024-07-15' },
            { id: 'm3', title: 'Run 5K under 25min', target: 25, current: 27.5, completed: false, estimatedDate: '2024-09-01' }
          ],
          
          progressHistory: [
            { date: '2024-03-01', value: 32 },
            { date: '2024-04-01', value: 30 },
            { date: '2024-05-01', value: 28.5 },
            { date: '2024-06-01', value: 27.5 }
          ],
          
          insights: {
            trend: 'positive',
            predictedCompletion: '2024-08-20',
            likelihood: 75,
            weeklyRate: 0.3,
            recommendation: 'Good progress. Increase interval training frequency.'
          }
        },
        {
          id: 'goal-4',
          title: 'Complete 10 Pull-ups',
          category: 'Strength',
          type: 'performance',
          status: 'completed',
          priority: 'medium',
          progress: 100,
          startDate: '2024-01-01',
          targetDate: '2024-05-01',
          completedDate: '2024-04-22',
          
          currentValue: 12,
          targetValue: 10,
          unit: 'reps',
          
          milestones: [
            { id: 'm1', title: '5 Pull-ups', target: 5, current: 5, completed: true, date: '2024-02-15' },
            { id: 'm2', title: '8 Pull-ups', target: 8, current: 8, completed: true, date: '2024-03-20' },
            { id: 'm3', title: '10 Pull-ups', target: 10, current: 12, completed: true, date: '2024-04-22' }
          ],
          
          insights: {
            trend: 'achieved',
            completedAhead: 9,
            likelihood: 100,
            recommendation: 'Goal exceeded! Consider weighted pull-ups next.'
          }
        },
        {
          id: 'goal-5',
          title: 'Hold 2-minute Plank',
          category: 'Core Strength',
          type: 'performance',
          status: 'overdue',
          priority: 'low',
          progress: 75,
          startDate: '2024-02-01',
          targetDate: '2024-06-01',
          completedDate: null,
          
          currentValue: 90,
          targetValue: 120,
          unit: 'seconds',
          
          milestones: [
            { id: 'm1', title: '60 second plank', target: 60, current: 60, completed: true, date: '2024-03-10' },
            { id: 'm2', title: '90 second plank', target: 90, current: 90, completed: true, date: '2024-05-15' },
            { id: 'm3', title: '120 second plank', target: 120, current: 90, completed: false, estimatedDate: '2024-07-15' }
          ],
          
          insights: {
            trend: 'stalled',
            predictedCompletion: '2024-07-15',
            likelihood: 65,
            recommendation: 'Progress has stalled. Review technique and add variation.'
          }
        }
      ],

      achievements: [
        {
          id: 'ach-1',
          title: 'First Milestone Master',
          description: 'Complete first milestone in 3 different goals',
          earned: true,
          date: '2024-03-20',
          icon: 'flag'
        },
        {
          id: 'ach-2',
          title: 'Consistency Champion',
          description: 'Make progress on goals for 4 consecutive weeks',
          earned: true,
          date: '2024-04-15',
          icon: 'calendar'
        },
        {
          id: 'ach-3',
          title: 'Overachiever',
          description: 'Complete a goal ahead of schedule',
          earned: true,
          date: '2024-04-22',
          icon: 'star'
        },
        {
          id: 'ach-4',
          title: 'Goal Crusher',
          description: 'Complete 5 goals',
          earned: false,
          progress: 40,
          icon: 'trophy'
        }
      ]
    };
  }, [clientData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'active': return '#00ffff';
      case 'overdue': return '#FF6B6B';
      case 'paused': return '#FFC107';
      default: return '#A0A0A0';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#A0A0A0';
    }
  };

  const filteredGoals = useMemo(() => {
    if (!goalTrackingData) return [];
    
    switch (goalFilter) {
      case 'active':
        return goalTrackingData.goals.filter(goal => goal.status === 'active');
      case 'completed':
        return goalTrackingData.goals.filter(goal => goal.status === 'completed');
      case 'overdue':
        return goalTrackingData.goals.filter(goal => goal.status === 'overdue');
      default:
        return goalTrackingData.goals;
    }
  }, [goalTrackingData, goalFilter]);

  const renderSummaryCards = () => {
    if (!goalTrackingData) return null;

    const { summary } = goalTrackingData;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(0, 255, 255, 0.1)', textAlign: 'center', p: 2 }}>
            <Target color="#00ffff" size={32} style={{ marginBottom: 8 }} />
            <Typography variant="h4">{summary.totalGoals}</Typography>
            <Typography variant="body2" color="text.secondary">Total Goals</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', textAlign: 'center', p: 2 }}>
            <TrendingUp color="#4CAF50" size={32} style={{ marginBottom: 8 }} />
            <Typography variant="h4">{summary.activeGoals}</Typography>
            <Typography variant="body2" color="text.secondary">Active Goals</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', textAlign: 'center', p: 2 }}>
            <Trophy color="#FFC107" size={32} style={{ marginBottom: 8 }} />
            <Typography variant="h4">{summary.completedGoals}</Typography>
            <Typography variant="body2" color="text.secondary">Completed</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(120, 81, 169, 0.1)', textAlign: 'center', p: 2 }}>
            <Star color="#7851a9" size={32} style={{ marginBottom: 8 }} />
            <Typography variant="h4">{summary.averageProgress}%</Typography>
            <Typography variant="body2" color="text.secondary">Avg Progress</Typography>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderGoalsList = () => {
    if (!goalTrackingData) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Goal Tracking</Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value as any)}
                label="Filter"
              >
                <MenuItem value="all">All Goals</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setShowAddGoal(true)}
              sx={{ bgcolor: '#00ffff', color: '#1d1f2b' }}
            >
              Add Goal
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Goal</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Target Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGoals.map((goal) => (
                <TableRow key={goal.id} hover onClick={() => setSelectedGoal(goal.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {goal.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={goal.category} 
                      size="small"
                      sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={goal.priority} 
                      size="small"
                      sx={{ 
                        bgcolor: getPriorityColor(goal.priority),
                        color: '#fff'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ width: 100 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={goal.progress} 
                        sx={{ 
                          mb: 1,
                          '& .MuiLinearProgress-bar': { 
                            bgcolor: getStatusColor(goal.status)
                          } 
                        }} 
                      />
                      <Typography variant="caption">{goal.progress}%</Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={goal.status} 
                      size="small"
                      sx={{ 
                        bgcolor: getStatusColor(goal.status),
                        color: '#fff'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </Typography>
                    {goal.status === 'overdue' && (
                      <Typography variant="caption" color="error">
                        Overdue
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); /* Edit goal */ }}>
                      <Edit size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderGoalDetails = () => {
    if (!selectedGoal || !goalTrackingData) return null;

    const goal = goalTrackingData.goals.find(g => g.id === selectedGoal);
    if (!goal) return null;

    return (
      <Dialog 
        open={!!selectedGoal} 
        onClose={() => setSelectedGoal(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{goal.title}</Typography>
            <Chip 
              label={`${goal.progress}% Complete`}
              sx={{ 
                bgcolor: getStatusColor(goal.status),
                color: '#fff'
              }}
            />
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Progress Timeline
              </Typography>
              
              <Stepper orientation="vertical">
                {goal.milestones.map((milestone, index) => (
                  <Step key={milestone.id} active={true} completed={milestone.completed}>
                    <StepLabel
                      StepIconComponent={() => 
                        milestone.completed ? 
                        <CheckCircle size={20} color="#4CAF50" /> : 
                        <Circle size={20} color="#FFC107" />
                      }
                    >
                      <Typography variant="body2">
                        {milestone.title}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">
                        Target: {milestone.target} {goal.unit} | Current: {milestone.current} {goal.unit}
                      </Typography>
                      {milestone.completed && milestone.date && (
                        <Typography variant="caption" display="block" color="success.main">
                          Completed: {new Date(milestone.date).toLocaleDateString()}
                        </Typography>
                      )}
                      {!milestone.completed && milestone.estimatedDate && (
                        <Typography variant="caption" display="block" color="warning.main">
                          Estimated: {new Date(milestone.estimatedDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Progress Chart
              </Typography>
              
              <ProgressAreaChart 
                data={goal.progressHistory.map(point => ({
                  date: point.date,
                  progress: (point.value / goal.targetValue) * 100
                }))}
                xKey="date"
                yKeys={[{ key: 'progress', name: 'Progress %', color: getStatusColor(goal.status) }]}
                height={200}
              />
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  AI Insights
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {goal.insights.recommendation}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Predicted Completion
                    </Typography>
                    <Typography variant="body2">
                      {new Date(goal.insights.predictedCompletion).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Success Likelihood
                    </Typography>
                    <Typography variant="body2">
                      {goal.insights.likelihood}%
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSelectedGoal(null)}>Close</Button>
          <Button variant="contained" sx={{ bgcolor: '#00ffff', color: '#1d1f2b' }}>
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderAchievements = () => {
    if (!goalTrackingData) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Award color="#FFC107" size={20} style={{ marginRight: 8 }} />
          Achievements & Badges
        </Typography>
        
        <Grid container spacing={2}>
          {goalTrackingData.achievements.map((achievement) => (
            <Grid item xs={12} sm={6} md={3} key={achievement.id}>
              <Card 
                sx={{ 
                  bgcolor: achievement.earned ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                  opacity: achievement.earned ? 1 : 0.6
                }}
              >
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    {achievement.icon === 'trophy' && <Trophy color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                    {achievement.icon === 'star' && <Star color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                    {achievement.icon === 'flag' && <Flag color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                    {achievement.icon === 'calendar' && <Calendar color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    {achievement.title}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    {achievement.description}
                  </Typography>
                  
                  {achievement.earned ? (
                    <Chip 
                      label={`Earned ${new Date(achievement.date!).toLocaleDateString()}`}
                      size="small"
                      sx={{ mt: 1, bgcolor: '#4CAF50', color: '#fff' }}
                    />
                  ) : achievement.progress !== undefined ? (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={achievement.progress} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption">
                        {achievement.progress}% complete
                      </Typography>
                    </Box>
                  ) : (
                    <Chip 
                      label="Locked"
                      size="small"
                      sx={{ mt: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };

  return (
    <Box>
      {renderSummaryCards()}
      {renderGoalsList()}
      {renderAchievements()}
      {renderGoalDetails()}
    </Box>
  );
};

export default GoalProgressTracker;