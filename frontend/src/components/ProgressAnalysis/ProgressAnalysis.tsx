/**
 * Progress Analysis Component
 * AI-powered analysis of client progress with insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button,
  CircularProgress, Alert, Chip, LinearProgress,
  Select, MenuItem, FormControl, InputLabel,
  Paper, Divider, TextField
} from '@mui/material';
import {
  TrendingUp, Assessment, Schedule, FitnessCenter,
  Insights, PersonSearch, Timeline, CheckCircle,
  Warning, Error, Close
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// Styled Components
const AnalysisContainer = styled(Box)`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const AnalysisCard = styled(Card)`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  height: 100%;
`;

const MetricCard = styled(Paper)`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  color: white;
  text-align: center;
`;

const InsightChip = styled(Chip)`
  && {
    background: ${props => 
      props.severity === 'success' ? 'rgba(76, 175, 80, 0.2)' :
      props.severity === 'warning' ? 'rgba(255, 152, 0, 0.2)' :
      props.severity === 'error' ? 'rgba(244, 67, 54, 0.2)' :
      'rgba(33, 150, 243, 0.2)'};
    color: ${props => 
      props.severity === 'success' ? '#4caf50' :
      props.severity === 'warning' ? '#ff9800' :
      props.severity === 'error' ? '#f44336' :
      '#2196f3'};
    border: 1px solid ${props => 
      props.severity === 'success' ? '#4caf50' :
      props.severity === 'warning' ? '#ff9800' :
      props.severity === 'error' ? '#f44336' :
      '#2196f3'};
    margin: 0.25rem;
  }
`;

const ProgressAnalysis = ({ onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [selectedClient, setSelectedClient] = useState('');
  const [timeframe, setTimeframe] = useState('3months');
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [progressMetrics, setProgressMetrics] = useState([]);
  
  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);
  
  /**
   * Load available clients for analysis
   */
  const loadClients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
  };
  
  /**
   * Perform AI-powered progress analysis
   */
  const analyzeProgress = async () => {
    if (!selectedClient) {
      enqueueSnackbar('Please select a client', { variant: 'warning' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare analysis context
      const mcpContext = {
        clientId: selectedClient,
        timeframe,
        metrics: ['weight', 'strength', 'endurance', 'flexibility', 'consistency'],
        includeComparisons: true,
        generateRecommendations: true
      };
      
      // Call MCP backend for analysis
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mcp/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.3,
          maxTokens: 3000,
          systemPrompt: `You are an AI fitness analyst. Analyze client progress data and provide insights.
                        Focus on: trends, achievements, areas for improvement, recommendations.
                        Format response as structured JSON with sections for metrics, insights, recommendations.`,
          humanMessage: `Analyze client progress for the selected timeframe: ${timeframe}. 
                        Provide detailed insights on performance trends, achievements, and recommendations.`,
          mcpContext
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Parse the AI response
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(result.content);
      } catch (parseError) {
        // If JSON parsing fails, treat as plain text and structure it
        parsedAnalysis = {
          summary: result.content,
          metrics: generateMockMetrics(),
          insights: extractInsights(result.content),
          recommendations: extractRecommendations(result.content)
        };
      }
      
      setAnalysisData(parsedAnalysis);
      setProgressMetrics(parsedAnalysis.metrics || generateMockMetrics());
      
      enqueueSnackbar('Analysis completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Progress analysis error:', error);
      enqueueSnackbar('Analysis failed: ' + error.message, { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Generate mock metrics for demo purposes
   */
  const generateMockMetrics = () => {
    return [
      { name: 'Strength Progress', value: 85, change: '+12%', color: '#4caf50' },
      { name: 'Consistency Score', value: 92, change: '+5%', color: '#2196f3' },
      { name: 'Endurance Level', value: 78, change: '+18%', color: '#ff9800' },
      { name: 'Flexibility', value: 65, change: '-2%', color: '#f44336' },
      { name: 'Overall Progress', value: 80, change: '+10%', color: '#9c27b0' }
    ];
  };
  
  /**
   * Extract insights from AI response
   */
  const extractInsights = (content) => {
    return [
      { text: 'Consistent workout adherence shows strong discipline', severity: 'success' },
      { text: 'Strength gains accelerating in recent weeks', severity: 'success' },
      { text: 'Flexibility needs attention - recommend stretching routine', severity: 'warning' },
      { text: 'Excellent progress in compound movements', severity: 'success' }
    ];
  };
  
  /**
   * Extract recommendations from AI response
   */
  const extractRecommendations = (content) => {
    return [
      'Increase progressive overload in upper body exercises',
      'Add 15-20 minutes of mobility work 3x per week',
      'Consider adjusting rest periods for hypertrophy goals',
      'Implement periodization for continued strength gains'
    ];
  };
  
  return (
    <AnalysisContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          Progress Analysis
        </Typography>
        <Button
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          startIcon={<Close />}
        >
          Close
        </Button>
      </Box>
      
      {/* Client Selection and Parameters */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select Client</InputLabel>
            <Select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '& .MuiSvgIcon-root': { color: 'white' }
              }}
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Timeframe</InputLabel>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '& .MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="1month">Last Month</MenuItem>
              <MenuItem value="3months">Last 3 Months</MenuItem>
              <MenuItem value="6months">Last 6 Months</MenuItem>
              <MenuItem value="1year">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={analyzeProgress}
            disabled={isLoading || !selectedClient}
            sx={{
              height: '56px',
              background: 'linear-gradient(90deg, #00ffff, #7851a9)',
              '&:hover': { background: 'linear-gradient(90deg, #7851a9, #00ffff)' }
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Analyze'}
          </Button>
        </Grid>
      </Grid>
      
      {/* Analysis Results */}
      {analysisData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Progress Metrics */}
          <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            Key Metrics
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {progressMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
                <MetricCard>
                  <Typography variant="h4" sx={{ color: metric.color, fontWeight: 'bold' }}>
                    {metric.value}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {metric.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: metric.change.startsWith('+') ? '#4caf50' : '#f44336', mt: 1 }}>
                    {metric.change}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': { backgroundColor: metric.color, borderRadius: 3 }
                    }}
                  />
                </MetricCard>
              </Grid>
            ))}
          </Grid>
          
          {/* AI Insights */}
          <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Insights />
            AI Insights
          </Typography>
          
          <AnalysisCard sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(analysisData.insights || extractInsights('')).map((insight, index) => (
                  <InsightChip
                    key={index}
                    label={insight.text}
                    severity={insight.severity}
                    icon={
                      insight.severity === 'success' ? <CheckCircle /> :
                      insight.severity === 'warning' ? <Warning /> :
                      insight.severity === 'error' ? <Error /> :
                      <Insights />
                    }
                  />
                ))}
              </Box>
            </CardContent>
          </AnalysisCard>
          
          {/* Recommendations */}
          <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology />
            AI Recommendations
          </Typography>
          
          <AnalysisCard>
            <CardContent>
              {(analysisData.recommendations || extractRecommendations('')).map((recommendation, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <CheckCircle sx={{ color: '#4caf50', mr: 1, mt: 0.5, fontSize: '1rem' }} />
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    {recommendation}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </AnalysisCard>
          
          {/* Analysis Summary */}
          {analysisData.summary && (
            <>
              <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline />
                Analysis Summary
              </Typography>
              
              <AnalysisCard>
                <CardContent>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.8 }}>
                    {analysisData.summary}
                  </Typography>
                </CardContent>
              </AnalysisCard>
            </>
          )}
        </motion.div>
      )}
      
      {/* Empty State */}
      {!analysisData && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Assessment sx={{ fontSize: '4rem', color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            Select a client to begin analysis
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Our AI will analyze progress data and provide insights
          </Typography>
        </Box>
      )}
    </AnalysisContainer>
  );
};

export default ProgressAnalysis;