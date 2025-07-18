import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CompareArrows,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BarChart,
  ShowChart,
  Timeline
} from 'lucide-react';

// Import chart components
import ProgressAreaChart from '../../../FitnessStats/charts/ProgressAreaChart';
import BarProgressChart from '../../../FitnessStats/charts/BarProgressChart';

// Import proper type definitions
import type { ComparisonAnalyticsProps, ComparisonMetric } from './types';

/**
 * ComparisonAnalytics Component
 * 
 * Advanced comparison analytics for trainers to compare client progress with:
 * - Other clients with similar profiles
 * - Average performance benchmarks
 * - Personal historical performance
 * - Goal targets and milestones
 */
const ComparisonAnalytics: React.FC<ComparisonAnalyticsProps> = ({
  clientId,
  clientData,
  comparisonData
}) => {
  const [comparisonType, setComparisonType] = useState<'clients' | 'average' | 'historical' | 'goals'>('average');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['strength', 'cardio', 'flexibility']);
  const [showPercentiles, setShowPercentiles] = useState(true);
  const [timeframe, setTimeframe] = useState('3months');

  // Generate comparison mock data
  const comparisonAnalytics = useMemo(() => {
    if (!clientData) return null;

    const generateComparisonData = () => {
      switch (comparisonType) {
        case 'average':
          return {
            title: 'vs. Average Performance',
            subtitle: 'Compared to clients with similar profile and goals',
            metrics: [
              {
                name: 'Overall Strength',
                client: 75,
                comparison: 65,
                percentile: 78,
                trend: 'above',
                improvement: '+15%'
              },
              {
                name: 'Cardiovascular Endurance',
                client: 68,
                comparison: 70,
                percentile: 62,
                trend: 'below',
                improvement: '-3%'
              },
              {
                name: 'Flexibility',
                client: 60,
                comparison: 58,
                percentile: 55,
                trend: 'above',
                improvement: '+3%'
              },
              {
                name: 'Core Stability',
                client: 85,
                comparison: 60,
                percentile: 92,
                trend: 'above',
                improvement: '+42%'
              },
              {
                name: 'Balance',
                client: 65,
                comparison: 62,
                percentile: 58,
                trend: 'above',
                improvement: '+5%'
              }
            ],
            insights: [
              {
                type: 'strength',
                title: 'Exceptional Core Development',
                description: 'Client shows significantly above-average core stability, ranking in the 92nd percentile.',
                recommendation: 'Continue current core program and consider advanced progressions.'
              },
              {
                type: 'warning',
                title: 'Cardio Focus Needed',
                description: 'Cardiovascular endurance is slightly below average for similar clients.',
                recommendation: 'Incorporate more aerobic activities and HIIT sessions.'
              },
              {
                type: 'info',
                title: 'Balanced Progress',
                description: 'Overall progress trajectory is positive with room for cardiovascular improvement.',
                recommendation: 'Maintain current strength training, increase cardio frequency.'
              }
            ]
          };

        case 'clients':
          return {
            title: 'vs. Similar Clients',
            subtitle: 'Compared to 12 clients with matching goals and experience level',
            metrics: [
              {
                name: 'Workout Consistency',
                client: 84,
                comparison: 76,
                percentile: 73,
                trend: 'above',
                improvement: '+11%'
              },
              {
                name: 'Progressive Overload',
                client: 78,
                comparison: 72,
                percentile: 68,
                trend: 'above',
                improvement: '+8%'
              },
              {
                name: 'Form Quality',
                client: 82,
                comparison: 79,
                percentile: 65,
                trend: 'above',
                improvement: '+4%'
              },
              {
                name: 'Recovery Rate',
                client: 71,
                comparison: 74,
                percentile: 45,
                trend: 'below',
                improvement: '-4%'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Excellent Consistency',
                description: 'Workout attendance and consistency exceeds 73% of similar clients.',
                recommendation: 'Use this as motivation to continue current scheduling approach.'
              },
              {
                type: 'warning',
                title: 'Recovery Attention Needed',
                description: 'Recovery metrics suggest potential overtraining or insufficient rest.',
                recommendation: 'Consider adding rest days or reducing training intensity.'
              }
            ]
          };

        case 'historical':
          return {
            title: 'vs. Personal History',
            subtitle: 'Progress comparison over the past 6 months',
            metrics: [
              {
                name: '3 Months Ago',
                client: 75,
                comparison: 65,
                percentile: null,
                trend: 'above',
                improvement: '+15%'
              },
              {
                name: '6 Months Ago',
                client: 75,
                comparison: 58,
                percentile: null,
                trend: 'above',
                improvement: '+29%'
              },
              {
                name: 'Starting Point',
                client: 75,
                comparison: 45,
                percentile: null,
                trend: 'above',
                improvement: '+67%'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Consistent Improvement',
                description: 'Steady progress with 67% overall improvement since starting.',
                recommendation: 'Current program is effective - continue with periodic adjustments.'
              },
              {
                type: 'info',
                title: 'Plateauing Trend',
                description: 'Progress rate has slowed in recent months - normal adaptation response.',
                recommendation: 'Consider program variation or periodization adjustments.'
              }
            ]
          };

        case 'goals':
          return {
            title: 'vs. Target Goals',
            subtitle: 'Progress toward established fitness milestones',
            metrics: [
              {
                name: 'Weight Loss Goal',
                client: 78,
                comparison: 100,
                percentile: null,
                trend: 'approaching',
                improvement: '78% Complete',
                target: 'Lose 15 lbs',
                current: '11.7 lbs lost'
              },
              {
                name: 'Strength Goal',
                client: 85,
                comparison: 100,
                percentile: null,
                trend: 'approaching',
                improvement: '85% Complete',
                target: 'Bench 100kg',
                current: '85kg achieved'
              },
              {
                name: 'Endurance Goal',
                client: 60,
                comparison: 100,
                percentile: null,
                trend: 'in-progress',
                improvement: '60% Complete',
                target: 'Run 5K under 25min',
                current: '27:30 current time'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Strength Goal Nearly Achieved',
                description: 'Only 15kg away from bench press goal - excellent progress.',
                recommendation: 'Focus on progressive overload with proper form and recovery.'
              },
              {
                type: 'info',
                title: 'Endurance Requires Focus',
                description: 'Cardiovascular goals need more targeted training approach.',
                recommendation: 'Increase running frequency and incorporate interval training.'
              }
            ]
          };

        default:
          return null;
      }
    };

    return generateComparisonData();
  }, [comparisonType, clientData, timeframe]);

  const renderMetricsComparison = () => {
    if (!comparisonAnalytics) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CompareArrows color="#00ffff" size={24} style={{ marginRight: 12 }} />
          <Typography variant="h6">{comparisonAnalytics.title}</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {comparisonAnalytics.subtitle}
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell align="center">Client Score</TableCell>
                <TableCell align="center">Comparison</TableCell>
                {showPercentiles && comparisonType === 'average' && (
                  <TableCell align="center">Percentile</TableCell>
                )}
                <TableCell align="center">Performance</TableCell>
                <TableCell align="center">Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonAnalytics.metrics.map((metric: ComparisonMetric) => (
                <TableRow key={metric.name}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {metric.name}
                    </Typography>
                    {metric.target && (
                      <Typography variant="caption" color="text.secondary">
                        Target: {metric.target}
                      </Typography>
                    )}
                    {metric.current && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Current: {metric.current}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ minWidth: 80 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {metric.client}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={metric.client} 
                        sx={{ 
                          mt: 1, 
                          '& .MuiLinearProgress-bar': { 
                            bgcolor: '#00ffff' 
                          } 
                        }} 
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ minWidth: 80 }}>
                      <Typography variant="body2" color="text.secondary">
                        {metric.comparison}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={metric.comparison} 
                        sx={{ 
                          mt: 1, 
                          '& .MuiLinearProgress-bar': { 
                            bgcolor: 'rgba(255, 255, 255, 0.3)' 
                          } 
                        }} 
                      />
                    </Box>
                  </TableCell>
                  
                  {showPercentiles && comparisonType === 'average' && (
                    <TableCell align="center">
                      {metric.percentile && (
                        <Chip 
                          label={`${metric.percentile}th`} 
                          size="small"
                          color={metric.percentile >= 70 ? 'success' : metric.percentile >= 50 ? 'warning' : 'error'}
                        />
                      )}
                    </TableCell>
                  )}
                  
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {metric.trend === 'above' || metric.trend === 'approaching' ? (
                        <TrendingUp size={16} color="#4CAF50" />
                      ) : metric.trend === 'below' ? (
                        <TrendingDown size={16} color="#FF6B6B" />
                      ) : (
                        <Target size={16} color="#FFC107" />
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      color={
                        metric.improvement.startsWith('+') ? '#4CAF50' : 
                        metric.improvement.startsWith('-') ? '#FF6B6B' : 
                        'text.primary'
                      }
                      fontWeight="medium"
                    >
                      {metric.improvement}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderInsights = () => {
    if (!comparisonAnalytics?.insights) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
        <Typography variant="h6" gutterBottom>
          Analytics Insights
        </Typography>
        
        <Grid container spacing={2}>
          {comparisonAnalytics.insights.map((insight: any, index: number) => (
            <Grid item xs={12} key={index}>
              <Alert 
                severity={
                  insight.type === 'success' ? 'success' : 
                  insight.type === 'warning' ? 'warning' : 
                  'info'
                }
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {insight.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {insight.description}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  Recommendation: {insight.recommendation}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Comparison Analytics
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Comparison Type</InputLabel>
              <Select
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as any)}
                label="Comparison Type"
              >
                <MenuItem value="average">vs. Average</MenuItem>
                <MenuItem value="clients">vs. Similar Clients</MenuItem>
                <MenuItem value="historical">vs. Personal History</MenuItem>
                <MenuItem value="goals">vs. Target Goals</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                label="Timeframe"
              >
                <MenuItem value="1month">Last Month</MenuItem>
                <MenuItem value="3months">Last 3 Months</MenuItem>
                <MenuItem value="6months">Last 6 Months</MenuItem>
                <MenuItem value="1year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showPercentiles}
                  onChange={(e) => setShowPercentiles(e.target.checked)}
                />
              }
              label="Show Percentiles"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Metrics Comparison */}
      {renderMetricsComparison()}
      
      {/* Insights */}
      {renderInsights()}
    </Box>
  );
};

export default ComparisonAnalytics;