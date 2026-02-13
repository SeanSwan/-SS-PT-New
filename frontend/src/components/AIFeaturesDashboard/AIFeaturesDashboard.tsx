/**
 * AI-Powered Features Dashboard
 * 
 * Central hub for all AI features including:
 * - Workout Generation
 * - Progress Analysis
 * - Nutrition Planning
 * - Exercise Alternatives
 * - Real-time MCP Status
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button,
  Chip, Alert, CircularProgress, IconButton, Dialog, DialogContent,
  Tabs, Tab, Paper, LinearProgress, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import {
  FitnessCenter, Analytics, Restaurant, SwapHoriz, AutoAwesome,
  TrendingUp, Psychology, Speed, CheckCircle, Cancel, Refresh,
  Settings, Notifications, Close, Timeline
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import WorkoutGenerator from '../WorkoutGenerator/WorkoutGenerator';
import ProgressAnalysis from '../ProgressAnalysis/ProgressAnalysis';
import NutritionPlanning from '../NutritionPlanning/NutritionPlanning';
import ExerciseAlternatives from '../ExerciseAlternatives/ExerciseAlternatives';
import AIDashboard from '../AIDashboard/AIDashboard';

// Styled Components
const DashboardContainer = styled(Box)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  position: relative;
  overflow: hidden;
  
  /* Glass morphism effect */
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  
  /* Animated gradient border */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9, #ff6b9d, #00ffff);
    background-size: 400% 400%;
    animation: gradientShift 3s ease infinite;
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    z-index: -1;
  }
  
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

const DashboardTitle = styled(Typography)`
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  background: linear-gradient(to right, #00ffff, #7851a9, #ff6b9d);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeatureCard = styled(Card)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const FeatureIcon = styled(Box)`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${props => props.color || '#00ffff'}, ${props => props.colorSecondary || '#7851a9'});
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  
  svg {
    font-size: 2rem;
    color: white;
  }
`;

const StatusChip = styled(Chip)`
  && {
    background: ${props => props.status === 'online' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
    color: ${props => props.status === 'online' ? '#4caf50' : '#f44336'};
    border: 1px solid ${props => props.status === 'online' ? '#4caf50' : '#f44336'};
    font-weight: 500;
  }
`;

const ActionButton = styled(Button)`
  && {
    background: linear-gradient(90deg, #00ffff, #7851a9);
    color: white;
    border-radius: 8px;
    text-transform: none;
    font-weight: 500;
    
    &:hover {
      background: linear-gradient(90deg, #7851a9, #00ffff);
      transform: scale(1.02);
    }
    
    &:disabled {
      background: rgba(128, 128, 128, 0.3);
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

const StatusPanel = styled(Paper)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const StatsCard = styled(Card)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  color: white;
  text-align: center;
`;

// AI Feature Definitions
const AI_FEATURES = [
  {
    id: 'workout-generator',
    title: 'AI Workout Generator',
    description: 'Generate personalized workouts using advanced AI based on client data, goals, and equipment.',
    icon: FitnessCenter,
    color: '#00ffff',
    colorSecondary: '#46cdcf',
    capabilities: ['Personalized Plans', 'Equipment Adaptation', 'Progress Integration'],
    component: 'WorkoutGenerator'
  },
  {
    id: 'progress-analysis',
    title: 'Progress Analytics',
    description: 'AI-powered analysis of client progress with insights and recommendations.',
    icon: Analytics,
    color: '#7851a9',
    colorSecondary: '#9c27b0',
    capabilities: ['Pattern Recognition', 'Predictive Insights', 'Goal Tracking'],
    component: 'ProgressAnalysis'
  },
  {
    id: 'nutrition-planning',
    title: 'Nutrition AI',
    description: 'Smart nutrition plans tailored to workout programs and dietary preferences.',
    icon: Restaurant,
    color: '#ff6b9d',
    colorSecondary: '#e91e63',
    capabilities: ['Macro Optimization', 'Meal Planning', 'Dietary Restrictions'],
    component: 'NutritionPlanning'
  },
  {
    id: 'exercise-alternatives',
    title: 'Exercise Alternatives',
    description: 'Find optimal exercise substitutions based on equipment and limitations.',
    icon: SwapHoriz,
    color: '#4caf50',
    colorSecondary: '#66bb6a',
    capabilities: ['Equipment Substitution', 'Injury Modifications', 'Skill Level Adaptations'],
    component: 'ExerciseAlternatives'
  }
];

// Mock stats - replace with real API calls
const MOCK_STATS = {
  workoutsGenerated: 156,
  clientAnalyses: 89,
  nutritionPlans: 67,
  alternativesProvided: 234,
  averageResponseTime: '2.3s',
  successRate: '98.5%'
};

const AIFeaturesDashboard = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [mcpStatus, setMcpStatus] = useState({
    workout: { status: 'checking', details: {} },
    gamification: { status: 'checking', details: {} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState(MOCK_STATS);
  
  // Check MCP status on mount and setup auto-refresh
  useEffect(() => {
    checkMcpStatus();
    
    if (autoRefresh) {
      const interval = setInterval(checkMcpStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);
  
  /**
   * Check MCP server status
   */
  const checkMcpStatus = async () => {
    // Short-circuit when MCP is disabled — no network calls
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      setMcpStatus({
        workout: { status: 'disabled', details: { error: 'MCP disabled' } },
        gamification: { status: 'disabled', details: { error: 'MCP disabled' } }
      });
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/mcp/status`);
      const data = await response.json();
      
      setMcpStatus(data.servers || {
        workout: { status: 'offline', details: { error: 'No response' } },
        gamification: { status: 'offline', details: { error: 'No response' } }
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking MCP status:', error);
      setMcpStatus({
        workout: { status: 'offline', details: { error: error.message } },
        gamification: { status: 'offline', details: { error: error.message } }
      });
      setIsLoading(false);
      
      if (autoRefresh) {
        enqueueSnackbar('MCP connection check failed', { variant: 'warning' });
      }
    }
  };
  
  /**
   * Handle feature selection
   */
  const handleFeatureClick = (feature) => {
    if (mcpStatus.workout.status === 'offline' && mcpStatus.gamification.status === 'offline') {
      enqueueSnackbar('AI services are currently offline', { variant: 'error' });
      return;
    }
    
    setSelectedFeature(feature);
  };
  
  /**
   * Close feature dialog
   */
  const handleCloseFeature = () => {
    setSelectedFeature(null);
  };
  
  /**
   * Render feature component based on selection
   */
  const renderFeatureComponent = () => {
    if (!selectedFeature) return null;
    
    switch (selectedFeature.component) {
      case 'WorkoutGenerator':
        return <WorkoutGenerator onClose={handleCloseFeature} />;
      case 'ProgressAnalysis':
        return <ProgressAnalysis onClose={handleCloseFeature} />;
      case 'NutritionPlanning':
        return <NutritionPlanning onClose={handleCloseFeature} />;
      case 'ExerciseAlternatives':
        return <ExerciseAlternatives onClose={handleCloseFeature} />;
      case 'AIDashboard':
        return <AIDashboard />;
      default:
        return (
          <Box p={3} textAlign="center">
            <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
              {selectedFeature.title}
            </Typography>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
              Coming Soon! This feature is under development.
            </Typography>
            <ActionButton onClick={handleCloseFeature}>
              Close
            </ActionButton>
          </Box>
        );
    }
  };
  
  // Calculate overall system health
  const systemHealth = {
    status: mcpStatus.workout.status === 'online' || mcpStatus.gamification.status === 'online' ? 'healthy' : 'degraded',
    percentage: mcpStatus.workout.status === 'online' && mcpStatus.gamification.status === 'online' ? 100 : 
                mcpStatus.workout.status === 'online' || mcpStatus.gamification.status === 'online' ? 50 : 0
  };
  
  return (
    <DashboardContainer>
      <DashboardTitle variant="h4">
        <AutoAwesome sx={{ fontSize: '2rem' }} />
        AI Features Dashboard
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ffff' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { 
                    backgroundColor: '#00ffff' 
                  }
                }}
              />
            }
            label={
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                Auto-refresh
              </Typography>
            }
          />
          <Tooltip title="Refresh Status">
            <IconButton onClick={checkMcpStatus} disabled={isLoading}>
              <Refresh sx={{ color: isLoading ? 'rgba(255, 255, 255, 0.3)' : '#00ffff' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </DashboardTitle>
      
      {/* System Status Panel */}
      <StatusPanel elevation={3}>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed /> System Status
          {isLoading && <CircularProgress size={20} sx={{ color: '#00ffff' }} />}
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Workout MCP:
              </Typography>
              <StatusChip
                status={mcpStatus.workout.status}
                label={mcpStatus.workout.status === 'online' ? 'Online' : 'Offline'}
                icon={mcpStatus.workout.status === 'online' ? <CheckCircle /> : <Cancel />}
              />
              
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Gamification MCP:
              </Typography>
              <StatusChip
                status={mcpStatus.gamification.status}
                label={mcpStatus.gamification.status === 'online' ? 'Online' : 'Offline'}
                icon={mcpStatus.gamification.status === 'online' ? <CheckCircle /> : <Cancel />}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                System Health: {systemHealth.percentage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={systemHealth.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: systemHealth.percentage >= 75 ? '#4caf50' : 
                                   systemHealth.percentage >= 50 ? '#ff9800' : '#f44336',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
          </Grid>
        </Grid>
        
        {systemHealth.status === 'degraded' && (
          <Alert 
            severity="warning" 
            sx={{ 
              mt: 2, 
              backgroundColor: 'rgba(255, 152, 0, 0.1)', 
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}
          >
            Some AI services are currently unavailable. Features may be limited.
          </Alert>
        )}
      </StatusPanel>
      
      {/* Feature Cards */}
      <Grid container spacing={3}>
        {AI_FEATURES.map((feature) => (
          <Grid item xs={12} sm={6} lg={3} key={feature.id}>
            <FeatureCard
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: AI_FEATURES.indexOf(feature) * 0.1 }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <FeatureIcon color={feature.color} colorSecondary={feature.colorSecondary}>
                  <feature.icon />
                </FeatureIcon>
                
                <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, fontWeight: 500 }}>
                  {feature.title}
                </Typography>
                
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                  {feature.description}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {feature.capabilities.map((capability) => (
                    <Chip
                      key={capability}
                      label={capability}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.7rem'
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                <ActionButton
                  fullWidth
                  onClick={() => handleFeatureClick(feature)}
                  disabled={mcpStatus.workout.status === 'offline' && mcpStatus.gamification.status === 'offline'}
                >
                  Launch {feature.title}
                </ActionButton>
              </CardActions>
            </FeatureCard>
          </Grid>
        ))}
      </Grid>
      
      {/* Usage Statistics */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp /> Usage Statistics
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setSelectedFeature({ title: 'AI Monitoring Dashboard', component: 'AIDashboard' })}
            sx={{ 
              borderColor: '#00ffff', 
              color: '#00ffff',
              '&:hover': { backgroundColor: 'rgba(0, 255, 255, 0.1)' }
            }}
            startIcon={<Analytics />}
          >
            View Detailed Analytics
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {Object.entries(stats).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={key}>
              <StatsCard>
                <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 'bold' }}>
                  {value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </StatsCard>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Feature Dialog */}
      <Dialog
        open={!!selectedFeature}
        onClose={handleCloseFeature}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(20, 20, 40, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <IconButton
          onClick={handleCloseFeature}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000
          }}
        >
          <Close />
        </IconButton>
        
        <DialogContent sx={{ p: 0 }}>
          {renderFeatureComponent()}
        </DialogContent>
      </Dialog>
    </DashboardContainer>
  );
};

export default AIFeaturesDashboard;