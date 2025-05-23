/**
 * MCP Monitor Component
 * 
 * A diagnostic component for monitoring MCP server health
 * and connection status. Useful for admin dashboards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Server,
  Trophy,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';
import { MCP_CONFIG } from '../../config/env-config';
import { checkMcpServersStatus, McpServerStatus } from '../../utils/mcp-utils';
import { isMcpAuthenticated } from '../../utils/mcp-auth';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface McpServerHealthData {
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  uptime: string;
  lastCheck: Date;
  apiVersion?: string;
  errors: any[];
  recentRequests: number;
}

interface McpMonitorProps {
  variant?: 'full' | 'compact';
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: McpServerStatus) => void;
}

/**
 * Component for monitoring MCP server health
 */
const McpMonitor: React.FC<McpMonitorProps> = ({
  variant = 'full',
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onStatusChange
}) => {
  // State for MCP server status
  const [mcpStatus, setMcpStatus] = useState<McpServerStatus>({
    workout: false,
    gamification: false
  });
  
  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // State for health data
  const [workoutHealth, setWorkoutHealth] = useState<McpServerHealthData>({
    status: 'offline',
    latency: 0,
    uptime: 'Unknown',
    lastCheck: new Date(),
    errors: [],
    recentRequests: 0
  });
  
  const [gamificationHealth, setGamificationHealth] = useState<McpServerHealthData>({
    status: 'offline',
    latency: 0,
    uptime: 'Unknown',
    lastCheck: new Date(),
    errors: [],
    recentRequests: 0
  });
  
  // State for refreshing
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Check MCP status
  const checkStatus = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Check server status
      const status = await checkMcpServersStatus();
      
      // Update status
      setMcpStatus(status);
      
      // Notify status change
      if (onStatusChange) {
        onStatusChange(status);
      }
      
      // Update health data for workout MCP
      if (status.workout) {
        try {
          // Simulate health check - in a real implementation,
          // you would call an actual health check endpoint
          const startTime = Date.now();
          await fetch(`${MCP_CONFIG.WORKOUT_MCP_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          })
            .then(async (response) => {
              const latency = Date.now() - startTime;
              const data = await response.json();
              
              setWorkoutHealth({
                status: 'healthy',
                latency,
                uptime: data.uptime || 'Unknown',
                lastCheck: new Date(),
                apiVersion: data.version || 'Unknown',
                errors: [],
                recentRequests: data.requestCount || 0
              });
            })
            .catch(error => {
              setWorkoutHealth(prev => ({
                ...prev,
                status: 'degraded',
                latency: Date.now() - startTime,
                lastCheck: new Date(),
                errors: [...prev.errors, error.message]
              }));
            });
        } catch (error) {
          console.error('Error checking workout MCP health:', error);
        }
      } else {
        setWorkoutHealth(prev => ({
          ...prev,
          status: 'offline',
          lastCheck: new Date(),
          errors: []
        }));
      }
      
      // Update health data for gamification MCP
      if (status.gamification) {
        try {
          // Simulate health check - in a real implementation,
          // you would call an actual health check endpoint
          const startTime = Date.now();
          await fetch(`${MCP_CONFIG.GAMIFICATION_MCP_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          })
            .then(async (response) => {
              const latency = Date.now() - startTime;
              const data = await response.json();
              
              setGamificationHealth({
                status: 'healthy',
                latency,
                uptime: data.uptime || 'Unknown',
                lastCheck: new Date(),
                apiVersion: data.version || 'Unknown',
                errors: [],
                recentRequests: data.requestCount || 0
              });
            })
            .catch(error => {
              setGamificationHealth(prev => ({
                ...prev,
                status: 'degraded',
                latency: Date.now() - startTime,
                lastCheck: new Date(),
                errors: [...prev.errors, error.message]
              }));
            });
        } catch (error) {
          console.error('Error checking gamification MCP health:', error);
        }
      } else {
        setGamificationHealth(prev => ({
          ...prev,
          status: 'offline',
          lastCheck: new Date(),
          errors: []
        }));
      }
      
      // Check authentication
      const authStatus = await isMcpAuthenticated();
      setIsAuthenticated(authStatus);
      
      // Update last refresh time
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error checking MCP status:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onStatusChange]);
  
  // Initial check and set up auto-refresh
  useEffect(() => {
    // Initial check
    checkStatus();
    
    // Set up auto-refresh
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(checkStatus, refreshInterval);
    }
    
    // Clean up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkStatus, autoRefresh, refreshInterval]);
  
  // Helper functions
  const getStatusColor = (status: 'healthy' | 'degraded' | 'offline') => {
    switch (status) {
      case 'healthy':
        return '#00c853';
      case 'degraded':
        return '#ff9800';
      case 'offline':
        return '#f44336';
      default:
        return '#f44336';
    }
  };
  
  const getStatusIcon = (status: 'healthy' | 'degraded' | 'offline') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} color={getStatusColor(status)} />;
      case 'degraded':
        return <AlertTriangle size={16} color={getStatusColor(status)} />;
      case 'offline':
        return <XCircle size={16} color={getStatusColor(status)} />;
      default:
        return <XCircle size={16} color={getStatusColor(status)} />;
    }
  };
  
  const formatTimeSinceLastCheck = () => {
    const elapsed = new Date().getTime() - lastRefresh.getTime();
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  };
  
  // Render compact variant
  if (variant === 'compact') {
    return (
      <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">MCP Server Status</Typography>
          <Button
            size="small"
            startIcon={<RefreshCw size={16} />}
            onClick={checkStatus}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {/* Workout MCP */}
          <Grid item xs={6}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 1.5, 
                bgcolor: mcpStatus.workout ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                borderColor: mcpStatus.workout ? 'rgba(0, 200, 83, 0.3)' : 'rgba(244, 67, 54, 0.3)'
              }}
            >
              <Box display="flex" alignItems="center" mb={1}>
                <Server size={20} color={mcpStatus.workout ? '#00c853' : '#f44336'} />
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  Workout MCP
                </Typography>
                <Chip
                  label={mcpStatus.workout ? 'Online' : 'Offline'}
                  size="small"
                  color={mcpStatus.workout ? 'success' : 'error'}
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              {mcpStatus.workout && (
                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Latency: {workoutHealth.latency}ms
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Gamification MCP */}
          <Grid item xs={6}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 1.5, 
                bgcolor: mcpStatus.gamification ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                borderColor: mcpStatus.gamification ? 'rgba(0, 200, 83, 0.3)' : 'rgba(244, 67, 54, 0.3)'
              }}
            >
              <Box display="flex" alignItems="center" mb={1}>
                <Trophy size={20} color={mcpStatus.gamification ? '#00c853' : '#f44336'} />
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  Gamification MCP
                </Typography>
                <Chip
                  label={mcpStatus.gamification ? 'Online' : 'Offline'}
                  size="small"
                  color={mcpStatus.gamification ? 'success' : 'error'}
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              {mcpStatus.gamification && (
                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Latency: {gamificationHealth.latency}ms
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        <Box display="flex" alignItems="center" mt={2} justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Clock size={14} />
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              Last checked: {formatTimeSinceLastCheck()}
            </Typography>
          </Box>
          
          <Chip
            label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            size="small"
            color={isAuthenticated ? 'success' : 'warning'}
          />
        </Box>
      </Paper>
    );
  }
  
  // Render full variant
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">MCP Server Monitoring</Typography>
        <Box>
          <Chip
            label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            size="small"
            color={isAuthenticated ? 'success' : 'warning'}
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={checkStatus}
            disabled={refreshing}
          >
            Refresh Status
          </Button>
        </Box>
      </Box>
      
      {/* Warning if both servers are offline */}
      {!mcpStatus.workout && !mcpStatus.gamification && (
        <Alert severity="error" sx={{ mb: 3 }}>
          All MCP servers are offline. The application is running in fallback mode with limited functionality.
        </Alert>
      )}
      
      {/* Warning if only gamification server is offline */}
      {mcpStatus.workout && !mcpStatus.gamification && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Gamification MCP server is offline. Basic functionality is available, but gamification features are limited.
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Workout MCP Server */}
        <Grid item xs={12} md={6}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              height: '100%',
              bgcolor: mcpStatus.workout ? 
                workoutHealth.status === 'healthy' ? 'rgba(0, 200, 83, 0.05)' : 
                workoutHealth.status === 'degraded' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(244, 67, 54, 0.05)'
                : 'rgba(244, 67, 54, 0.05)',
              borderColor: mcpStatus.workout ? 
                workoutHealth.status === 'healthy' ? 'rgba(0, 200, 83, 0.2)' : 
                workoutHealth.status === 'degraded' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(244, 67, 54, 0.2)'
                : 'rgba(244, 67, 54, 0.2)'
            }}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Server 
                size={24} 
                color={mcpStatus.workout ? 
                  getStatusColor(workoutHealth.status) : '#f44336'
                } 
              />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Workout MCP Server
              </Typography>
              <Chip
                label={mcpStatus.workout ? workoutHealth.status : 'Offline'}
                size="small"
                color={
                  mcpStatus.workout ? 
                    workoutHealth.status === 'healthy' ? 'success' : 
                    workoutHealth.status === 'degraded' ? 'warning' : 'error'
                    : 'error'
                }
                icon={
                  mcpStatus.workout ? 
                    getStatusIcon(workoutHealth.status) : 
                    <XCircle size={16} />
                }
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '40%' }}>
                      Status
                    </TableCell>
                    <TableCell>
                      {mcpStatus.workout ? workoutHealth.status : 'Offline'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      URL
                    </TableCell>
                    <TableCell>
                      {MCP_CONFIG.WORKOUT_MCP_URL}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Last Check
                    </TableCell>
                    <TableCell>
                      {workoutHealth.lastCheck.toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                  {mcpStatus.workout && (
                    <>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Latency
                        </TableCell>
                        <TableCell>
                          {workoutHealth.latency}ms
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          API Version
                        </TableCell>
                        <TableCell>
                          {workoutHealth.apiVersion || 'Unknown'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Recent Requests
                        </TableCell>
                        <TableCell>
                          {workoutHealth.recentRequests}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {workoutHealth.errors.length > 0 && (
              <Accordion 
                sx={{ 
                  mb: 2,
                  bgcolor: 'rgba(244, 67, 54, 0.05)',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography color="error">
                    {workoutHealth.errors.length} Error{workoutHealth.errors.length !== 1 ? 's' : ''}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {workoutHealth.errors.map((error, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      {error}
                    </Typography>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}
            
            {mcpStatus.workout && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Server Load
                </Typography>
                <Box display="flex" alignItems="center">
                  <Box width="100%" mr={1}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        workoutHealth.status === 'healthy' ? 30 :
                        workoutHealth.status === 'degraded' ? 70 : 100
                      }
                      color={
                        workoutHealth.status === 'healthy' ? 'success' :
                        workoutHealth.status === 'degraded' ? 'warning' : 'error'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Tooltip title="Current server load percentage">
                    <Box minWidth={35}>
                      <Typography variant="body2" color="text.secondary">
                        {workoutHealth.status === 'healthy' ? '30%' :
                        workoutHealth.status === 'degraded' ? '70%' : '100%'}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Gamification MCP Server */}
        <Grid item xs={12} md={6}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              height: '100%',
              bgcolor: mcpStatus.gamification ? 
                gamificationHealth.status === 'healthy' ? 'rgba(0, 200, 83, 0.05)' : 
                gamificationHealth.status === 'degraded' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(244, 67, 54, 0.05)'
                : 'rgba(244, 67, 54, 0.05)',
              borderColor: mcpStatus.gamification ? 
                gamificationHealth.status === 'healthy' ? 'rgba(0, 200, 83, 0.2)' : 
                gamificationHealth.status === 'degraded' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(244, 67, 54, 0.2)'
                : 'rgba(244, 67, 54, 0.2)'
            }}
          >
            <Box display="flex" alignItems="center" mb={2}>
              <Trophy 
                size={24} 
                color={mcpStatus.gamification ? 
                  getStatusColor(gamificationHealth.status) : '#f44336'
                } 
              />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Gamification MCP Server
              </Typography>
              <Chip
                label={mcpStatus.gamification ? gamificationHealth.status : 'Offline'}
                size="small"
                color={
                  mcpStatus.gamification ? 
                    gamificationHealth.status === 'healthy' ? 'success' : 
                    gamificationHealth.status === 'degraded' ? 'warning' : 'error'
                    : 'error'
                }
                icon={
                  mcpStatus.gamification ? 
                    getStatusIcon(gamificationHealth.status) : 
                    <XCircle size={16} />
                }
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '40%' }}>
                      Status
                    </TableCell>
                    <TableCell>
                      {mcpStatus.gamification ? gamificationHealth.status : 'Offline'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      URL
                    </TableCell>
                    <TableCell>
                      {MCP_CONFIG.GAMIFICATION_MCP_URL}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Last Check
                    </TableCell>
                    <TableCell>
                      {gamificationHealth.lastCheck.toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                  {mcpStatus.gamification && (
                    <>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Latency
                        </TableCell>
                        <TableCell>
                          {gamificationHealth.latency}ms
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          API Version
                        </TableCell>
                        <TableCell>
                          {gamificationHealth.apiVersion || 'Unknown'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          Recent Requests
                        </TableCell>
                        <TableCell>
                          {gamificationHealth.recentRequests}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {gamificationHealth.errors.length > 0 && (
              <Accordion 
                sx={{ 
                  mb: 2,
                  bgcolor: 'rgba(244, 67, 54, 0.05)',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography color="error">
                    {gamificationHealth.errors.length} Error{gamificationHealth.errors.length !== 1 ? 's' : ''}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {gamificationHealth.errors.map((error, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      {error}
                    </Typography>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}
            
            {mcpStatus.gamification && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Server Load
                </Typography>
                <Box display="flex" alignItems="center">
                  <Box width="100%" mr={1}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        gamificationHealth.status === 'healthy' ? 25 :
                        gamificationHealth.status === 'degraded' ? 65 : 100
                      }
                      color={
                        gamificationHealth.status === 'healthy' ? 'success' :
                        gamificationHealth.status === 'degraded' ? 'warning' : 'error'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Tooltip title="Current server load percentage">
                    <Box minWidth={35}>
                      <Typography variant="body2" color="text.secondary">
                        {gamificationHealth.status === 'healthy' ? '25%' :
                        gamificationHealth.status === 'degraded' ? '65%' : '100%'}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Activity Monitoring */}
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          <Activity size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Recent Activity
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Server</TableCell>
                <TableCell>Endpoint</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Latency</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Mock activity data */}
              <TableRow>
                <TableCell>Workout MCP</TableCell>
                <TableCell>/tools/GetWorkoutRecommendations</TableCell>
                <TableCell>
                  <Chip label="Success" size="small" color="success" />
                </TableCell>
                <TableCell>235ms</TableCell>
                <TableCell>{new Date().toLocaleTimeString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Gamification MCP</TableCell>
                <TableCell>/tools/GetAchievements</TableCell>
                <TableCell>
                  <Chip label="Success" size="small" color="success" />
                </TableCell>
                <TableCell>187ms</TableCell>
                <TableCell>{new Date().toLocaleTimeString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Workout MCP</TableCell>
                <TableCell>/tools/LogWorkoutSession</TableCell>
                <TableCell>
                  <Chip label="Success" size="small" color="success" />
                </TableCell>
                <TableCell>312ms</TableCell>
                <TableCell>{new Date(Date.now() - 120000).toLocaleTimeString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
      <Box display="flex" alignItems="center" justifyContent="space-between" mt={3}>
        <Box display="flex" alignItems="center">
          <Clock size={16} style={{ marginRight: '6px' }} />
          <Typography variant="body2" color="text.secondary">
            Last checked: {formatTimeSinceLastCheck()}
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="body2" color="text.secondary">
            Auto-refresh: {autoRefresh ? `Every ${refreshInterval / 1000} seconds` : 'Disabled'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default McpMonitor;