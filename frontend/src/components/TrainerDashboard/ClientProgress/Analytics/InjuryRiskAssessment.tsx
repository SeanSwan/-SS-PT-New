import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  ExpandMore,
  CheckCircle,
  XCircle,
  Info,
  Target,
  Heart,
  Zap
} from 'lucide-react';

// Import chart components
import RadarProgressChart from '../../../FitnessStats/charts/RadarProgressChart';

// Import proper type definitions
import type { InjuryRiskAssessmentProps } from './types';

/**
 * InjuryRiskAssessment Component
 * 
 * Advanced injury risk analysis for trainers including:
 * - Movement pattern analysis
 * - Muscular imbalance detection
 * - Recovery adequacy assessment
 * - Progression rate evaluation
 * - NASM-based corrective recommendations
 */
const InjuryRiskAssessment: React.FC<InjuryRiskAssessmentProps> = ({
  clientId,
  clientData,
  workoutHistory
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');
  const [showDetails, setShowDetails] = useState(false);

  // Generate comprehensive risk assessment
  const riskAssessment = useMemo(() => {
    if (!clientData) return null;

    return {
      overallRisk: 'medium', // low, medium, high
      riskScore: 65, // 0-100 scale
      lastAssessment: new Date().toISOString(),
      
      categories: [
        {
          id: 'movement',
          name: 'Movement Patterns',
          risk: 'low',
          score: 25,
          icon: 'activity',
          findings: [
            {
              pattern: 'Squat Pattern',
              status: 'good',
              notes: 'Proper knee tracking, adequate depth',
              recommendation: 'Continue current form'
            },
            {
              pattern: 'Overhead Movement',
              status: 'attention',
              notes: 'Slight shoulder impingement pattern',
              recommendation: 'Focus on thoracic mobility'
            },
            {
              pattern: 'Single Leg Balance',
              status: 'good',
              notes: 'Stable with eyes open and closed',
              recommendation: 'Progress to dynamic challenges'
            }
          ]
        },
        {
          id: 'imbalances',
          name: 'Muscular Imbalances',
          risk: 'medium',
          score: 55,
          icon: 'target',
          findings: [
            {
              pattern: 'Hip Flexor Tightness',
              status: 'caution',
              notes: 'Overactive hip flexors affecting posture',
              recommendation: 'Daily hip flexor stretching protocol'
            },
            {
              pattern: 'Glute Activation',
              status: 'attention',
              notes: 'Weak glute medius, compensation patterns',
              recommendation: 'Glute activation exercises pre-workout'
            },
            {
              pattern: 'Core Stability',
              status: 'good',
              notes: 'Strong anterior and posterior chains',
              recommendation: 'Maintain current core routine'
            }
          ]
        },
        {
          id: 'recovery',
          name: 'Recovery Patterns',
          risk: 'high',
          score: 75,
          icon: 'clock',
          findings: [
            {
              pattern: 'Sleep Quality',
              status: 'caution',
              notes: 'Averaging 5.5 hours, poor recovery',
              recommendation: 'Improve sleep hygiene, reduce evening workouts'
            },
            {
              pattern: 'HRV Trends',
              status: 'attention',
              notes: 'Declining heart rate variability',
              recommendation: 'Consider deload week or stress management'
            },
            {
              pattern: 'Subjective Recovery',
              status: 'caution',
              notes: 'Client reports frequent fatigue',
              recommendation: 'Monitor training load, increase rest days'
            }
          ]
        },
        {
          id: 'progression',
          name: 'Training Progression',
          risk: 'medium',
          score: 45,
          icon: 'trending-up',
          findings: [
            {
              pattern: 'Load Progression',
              status: 'good',
              notes: 'Conservative 2-5% weekly increases',
              recommendation: 'Continue current progression rate'
            },
            {
              pattern: 'Volume Increases',
              status: 'attention',
              notes: '15% increase in volume last 2 weeks',
              recommendation: 'Reduce volume increase to <10% weekly'
            },
            {
              pattern: 'Exercise Complexity',
              status: 'good',
              notes: 'Appropriate skill progression',
              recommendation: 'Ready for next movement level'
            }
          ]
        }
      ],

      criticalAlerts: [
        {
          severity: 'high',
          title: 'Recovery Deficit',
          description: 'Consistently poor sleep and declining HRV indicate overreaching.',
          action: 'Immediate reduction in training intensity and focus on recovery protocols.',
          timeframe: 'This week'
        },
        {
          severity: 'medium',
          title: 'Volume Spike',
          description: 'Training volume increased 15% in 2 weeks - above recommended guidelines.',
          action: 'Reduce volume by 10% and monitor client response.',
          timeframe: 'Next session'
        }
      ],

      recommendations: [
        {
          category: 'Immediate',
          items: [
            'Reduce training intensity by 20% this week',
            'Implement daily hip flexor stretching (2x15 seconds)',
            'Add 5-minute glute activation warm-up',
            'Schedule recovery assessment in 1 week'
          ]
        },
        {
          category: 'Short Term (1-2 weeks)',
          items: [
            'Sleep hygiene education and implementation',
            'Introduce stress management techniques',
            'Progress to unilateral leg exercises',
            'Monitor subjective recovery daily'
          ]
        },
        {
          category: 'Long Term (1+ months)',
          items: [
            'Movement quality reassessment',
            'Advanced balance training integration',
            'Periodization review and adjustment',
            'Goal setting and expectation management'
          ]
        }
      ],

      // NASM-based corrective exercise recommendations
      correctiveProtocol: {
        inhibit: [
          { muscle: 'Hip Flexors', exercise: 'Static Stretching', duration: '30 seconds x 2', frequency: 'Daily' },
          { muscle: 'Upper Trapezius', exercise: 'Static Stretching', duration: '30 seconds x 2', frequency: 'Daily' }
        ],
        lengthen: [
          { muscle: 'Hip Flexors', exercise: 'Couch Stretch', duration: '60 seconds x 2', frequency: 'Daily' },
          { muscle: 'Latissimus Dorsi', exercise: 'Wall Lat Stretch', duration: '30 seconds x 3', frequency: '3x/week' }
        ],
        activate: [
          { muscle: 'Glute Medius', exercise: 'Clamshells', reps: '15 x 2', frequency: 'Pre-workout' },
          { muscle: 'Deep Neck Flexors', exercise: 'Chin Tucks', reps: '10 x 2', frequency: 'Daily' }
        ],
        integrate: [
          { muscle: 'Glutes', exercise: 'Single Leg Deadlifts', reps: '8-12 x 2', frequency: '2x/week' },
          { muscle: 'Core', exercise: 'Dead Bug', reps: '10 each x 2', frequency: '3x/week' }
        ]
      }
    };
  }, [clientData, workoutHistory]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#FF6B6B';
      default: return '#A0A0A0';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle size={16} color="#4CAF50" />;
      case 'attention': return <Info size={16} color="#FFC107" />;
      case 'caution': return <AlertTriangle size={16} color="#FF6B6B" />;
      default: return <XCircle size={16} color="#A0A0A0" />;
    }
  };

  const renderOverallRisk = () => {
    if (!riskAssessment) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Shield color="#00ffff" size={24} style={{ marginRight: 12 }} />
            <Typography variant="h6">Injury Risk Assessment</Typography>
          </Box>
          
          <Chip 
            label={`${riskAssessment.overallRisk.toUpperCase()} RISK`}
            sx={{ 
              bgcolor: getRiskColor(riskAssessment.overallRisk),
              color: '#fff',
              fontWeight: 'bold'
            }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: getRiskColor(riskAssessment.overallRisk), mb: 1 }}>
                {riskAssessment.riskScore}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Overall Risk Score
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Last assessed: {new Date(riskAssessment.lastAssessment).toLocaleDateString()}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Risk Categories
            </Typography>
            
            {riskAssessment.categories.map((category) => (
              <Box key={category.id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">{category.name}</Typography>
                  <Chip 
                    size="small"
                    label={category.risk}
                    sx={{ 
                      bgcolor: getRiskColor(category.risk),
                      color: '#fff',
                      fontSize: '0.7rem'
                    }}
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={category.score} 
                  sx={{ 
                    '& .MuiLinearProgress-bar': { 
                      bgcolor: getRiskColor(category.risk)
                    } 
                  }} 
                />
              </Box>
            ))}
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderCriticalAlerts = () => {
    if (!riskAssessment?.criticalAlerts?.length) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle color="#FF6B6B" size={20} style={{ marginRight: 8 }} />
          Critical Alerts
        </Typography>
        
        <Grid container spacing={2}>
          {riskAssessment.criticalAlerts.map((alert, index) => (
            <Grid item xs={12} key={index}>
              <Alert 
                severity={alert.severity as any}
                sx={{ bgcolor: 'rgba(255, 107, 107, 0.1)' }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {alert.title} - Action needed: {alert.timeframe}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {alert.description}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  Action: {alert.action}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };

  const renderDetailedAssessment = () => {
    if (!riskAssessment) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detailed Assessment
        </Typography>
        
        {riskAssessment.categories.map((category) => (
          <Accordion key={category.id} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography variant="subtitle1" sx={{ flex: 1 }}>
                  {category.name}
                </Typography>
                <Chip 
                  size="small"
                  label={`${category.score}/100`}
                  sx={{ 
                    bgcolor: getRiskColor(category.risk),
                    color: '#fff',
                    mr: 1
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Assessment Area</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Recommendation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {category.findings.map((finding, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {finding.pattern}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusIcon(finding.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {finding.notes}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {finding.recommendation}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    );
  };

  const renderCorrectiveProtocol = () => {
    if (!riskAssessment?.correctiveProtocol) return null;

    const { inhibit, lengthen, activate, integrate } = riskAssessment.correctiveProtocol;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          NASM Corrective Exercise Protocol
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Based on assessment findings, follow this 4-phase corrective approach:
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'rgba(255, 107, 107, 0.1)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#FF6B6B' }}>
                  1. Inhibit (Overactive)
                </Typography>
                <List dense>
                  {inhibit.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.muscle}
                        secondary={`${item.exercise} - ${item.duration} (${item.frequency})`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#FFC107' }}>
                  2. Lengthen (Tight)
                </Typography>
                <List dense>
                  {lengthen.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.muscle}
                        secondary={`${item.exercise} - ${item.duration} (${item.frequency})`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'rgba(0, 255, 255, 0.1)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                  3. Activate (Underactive)
                </Typography>
                <List dense>
                  {activate.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.muscle}
                        secondary={`${item.exercise} - ${item.reps} (${item.frequency})`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#4CAF50' }}>
                  4. Integrate (Functional)
                </Typography>
                <List dense>
                  {integrate.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.muscle}
                        secondary={`${item.exercise} - ${item.reps} (${item.frequency})`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderRecommendations = () => {
    if (!riskAssessment?.recommendations) return null;

    return (
      <Paper sx={{ p: 3, bgcolor: '#1d1f2b' }}>
        <Typography variant="h6" gutterBottom>
          Action Plan Recommendations
        </Typography>
        
        <Grid container spacing={3}>
          {riskAssessment.recommendations.map((category, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                    {category.category}
                  </Typography>
                  <List dense>
                    {category.items.map((item, itemIndex) => (
                      <ListItem key={itemIndex}>
                        <ListItemIcon>
                          <CheckCircle size={16} color="#4CAF50" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
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
      {renderOverallRisk()}
      {renderCriticalAlerts()}
      {renderDetailedAssessment()}
      {renderCorrectiveProtocol()}
      {renderRecommendations()}
    </Box>
  );
};

export default InjuryRiskAssessment;