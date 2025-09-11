import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ChevronDown,
  Bug,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';

// ===================== Styled Components =====================

// Spinner Animation
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  animation: ${spin} 1s linear infinite;
  display: inline-flex;
  align-items: center;
`;

// Layout Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Paper = styled.div`
  padding: 24px;
  margin-bottom: 24px;
  background-color: #1a1a2e;
  color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const FlexBox = styled.div`
  display: flex;
  
  &.items-center {
    align-items: center;
  }
  
  &.justify-center {
    justify-content: center;
  }
  
  &.gap-2 {
    gap: 16px;
  }
  
  &.mb-3 {
    margin-bottom: 24px;
  }
  
  &.mb-4 {
    margin-bottom: 32px;
  }
  
  &.mt-3 {
    margin-top: 24px;
  }
  
  &.py-4 {
    padding-top: 32px;
    padding-bottom: 32px;
  }
`;

const Grid = styled.div`
  display: grid;
  gap: 16px;
  
  &.cols-1 {
    grid-template-columns: 1fr;
  }
  
  &.cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 768px) {
    &.cols-3 {
      grid-template-columns: 1fr;
    }
  }
`;

// Typography
const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #00ffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Subtitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
`;

const Text = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  color: #f5f5f5;
  margin: 0 0 16px 0;
  
  &.body2 {
    font-size: 0.875rem;
  }
`;

// Buttons
const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.primary {
    background-color: #3b82f6;
    color: white;
  }
  
  &.secondary {
    background-color: #7851A9;
    color: white;
  }
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// Alert Components
const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  
  &.success {
    background-color: rgba(40, 167, 69, 0.1);
    border: 1px solid rgba(40, 167, 69, 0.3);
    color: #28a745;
  }
  
  &.warning {
    background-color: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    color: #ffc107;
  }
  
  &.error {
    background-color: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: #f44336;
  }
  
  &.info {
    background-color: rgba(23, 162, 184, 0.1);
    border: 1px solid rgba(23, 162, 184, 0.3);
    color: #17a2b8;
  }
`;

const AlertIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertContent = styled.div`
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
`;

// Chip Components
const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
  
  &.success {
    background-color: rgba(40, 167, 69, 0.2);
    border-color: #28a745;
    color: #28a745;
  }
  
  &.error {
    background-color: rgba(244, 67, 54, 0.2);
    border-color: #f44336;
    color: #f44336;
  }
  
  &.warning {
    background-color: rgba(255, 193, 7, 0.2);
    border-color: #ffc107;
    color: #ffc107;
  }
  
  &.info {
    background-color: rgba(23, 162, 184, 0.2);
    border-color: #17a2b8;
    color: #17a2b8;
  }
  
  &.default {
    background-color: rgba(156, 163, 175, 0.2);
    border-color: #9ca3af;
    color: #9ca3af;
  }
  
  &.small {
    padding: 2px 6px;
    font-size: 0.7rem;
  }
`;

// Card Components
const Card = styled.div`
  background-color: #31304D;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  
  &.error-bg {
    background-color: #4F3A3A;
  }
`;

const CardContent = styled.div`
  padding: 16px;
`;

const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #ffffff;
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
`;

const CardSubtitle = styled.p`
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
`;

// Table Components
const TableContainer = styled.div`
  overflow-x: auto;
  max-height: 500px;
  border-radius: 8px;
  background-color: #31304D;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: #1a1a2e;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: rgba(255, 255, 255, 0.02);
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 0.875rem;
  vertical-align: middle;
  
  &.header {
    font-weight: 600;
    color: #00ffff;
    background-color: #1a1a2e;
  }
`;

// Tabs Components
const TabsContainer = styled.div`
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabsList = styled.div`
  display: flex;
  width: 100%;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  color: #f5f5f5;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  
  &.active {
    color: #00ffff;
    border-bottom-color: #00ffff;
  }
  
  &:hover {
    color: #00ffff;
    background-color: rgba(0, 255, 255, 0.1);
  }
`;

// Accordion Components
const Accordion = styled.div`
  margin-bottom: 16px;
  background-color: #31304D;
  border-radius: 8px;
  overflow: hidden;
`;

const AccordionHeader = styled.button`
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const AccordionContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${({ $isOpen }) => $isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const AccordionBody = styled.div`
  padding: 0 16px 16px 16px;
  color: #e0e0e0;
  font-size: 0.875rem;
  line-height: 1.5;
  
  ol {
    margin: 8px 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 4px;
  }
`;

// Debug Log
const DebugLog = styled.div`
  padding: 16px;
  max-height: 500px;
  overflow: auto;
  background-color: #000;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  border-radius: 8px;
  
  .log-entry {
    margin-bottom: 4px;
  }
`;

// Import services
import sessionService from '../../services/session-service';
import api from '../../services/api';
import { axiosInstance, authAxiosInstance } from '../../utils/axiosConfig';
import workoutMcpApi from '../../services/mcp/workoutMcpService';
import gamificationMcpApi from '../../services/mcp/gamificationMcpService';
import { ServerStatus as McpServerStatus } from '../../types/mcp/workout.types';

/**
 * CrossDashboardDebugger
 * 
 * A comprehensive debugging tool that analyzes data flow between client, admin, and trainer 
 * dashboards with a special focus on sessions, notifications, and gamification.
 */
const CrossDashboardDebugger: React.FC = () => {
  // State for various data sources
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<{workout: boolean; gamification: boolean}>({
    workout: false,
    gamification: false
  });
  const [dataFlowIssues, setDataFlowIssues] = useState<string[]>([]);
  const [fixAttempts, setFixAttempts] = useState<Record<string, string>>({});
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Add to debug log
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    setDebugLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Fetch all data for debugging
  const fetchAllData = async () => {
    setLoading(true);
    log('Starting comprehensive data fetch');
    
    try {
      // Check API endpoints
      const endpoints = [
        '/api/sessions',
        '/api/notifications',
        '/api/users',
        '/api/workouts',
        '/api/gamification/profile'
      ];
      
      const apiResults: Record<string, any> = {};
      
      for (const endpoint of endpoints) {
        try {
          log(`Testing endpoint: ${endpoint}`);
          const response = await authAxiosInstance.get(endpoint);
          
          apiResults[endpoint] = {
            status: response.status,
            ok: true,
            statusText: response.statusText
          };
          
          // Store data based on endpoint
          if (endpoint === '/api/sessions') {
            setSessions(response.data);
            log(`Found ${response.data.length} sessions`);
          } else if (endpoint === '/api/notifications') {
            setNotifications(response.data.notifications || []);
            log(`Found ${response.data.notifications?.length || 0} notifications`);
          } else if (endpoint === '/api/users') {
            setUsers(response.data);
            log(`Found ${response.data.length} users`);
          }
          
        } catch (error: any) {
          apiResults[endpoint] = {
            status: error.response?.status || 'error',
            ok: false,
            statusText: error.response?.statusText || error.message
          };
          log(`Error connecting to ${endpoint}: ${error.message}`);
        }
      }
      
      setApiStatus(apiResults);
      
      // Check MCP server status
      try {
        log('Testing Workout MCP server connection');
        const workoutStatus = await workoutMcpApi.checkServerStatus();
        setMcpStatus(prev => ({ ...prev, workout: true }));
        log('Workout MCP server is connected');
      } catch (error) {
        setMcpStatus(prev => ({ ...prev, workout: false }));
        log('Workout MCP server connection failed');
      }
      
      try {
        log('Testing Gamification MCP server connection');
        const gamificationStatus = await gamificationMcpApi.checkServerStatus();
        setMcpStatus(prev => ({ ...prev, gamification: true }));
        log('Gamification MCP server is connected');
      } catch (error) {
        setMcpStatus(prev => ({ ...prev, gamification: false }));
        log('Gamification MCP server connection failed');
      }
      
      // Analyze data flow issues
      analyzeDataFlow();
      
    } catch (error: any) {
      log(`Error in data fetch: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze potential data flow issues between dashboards
  const analyzeDataFlow = () => {
    const issues: string[] = [];
    
    // Check if session API is working
    if (!apiStatus['/api/sessions']?.ok) {
      issues.push('Session API is not accessible - this will prevent sessions from appearing in all dashboards');
    }
    
    // Check if notification API is working
    if (!apiStatus['/api/notifications']?.ok) {
      issues.push('Notification API is not accessible - this will prevent notifications from appearing');
    }
    
    // Check sessions data
    if (sessions.length === 0) {
      issues.push('No sessions found - clients will see empty session lists');
    } else {
      // Check for scheduled sessions with no trainer assigned
      const unassignedSessions = sessions.filter(session => 
        (session.status === 'scheduled' || session.status === 'confirmed') && 
        !session.trainerId
      );
      
      if (unassignedSessions.length > 0) {
        issues.push(`${unassignedSessions.length} scheduled sessions have no assigned trainer`);
      }
      
      // Check for orphaned sessions (client no longer exists)
      const clientIds = users.filter(user => user.role === 'client').map(user => user.id);
      const orphanedSessions = sessions.filter(session => 
        session.userId && !clientIds.includes(session.userId)
      );
      
      if (orphanedSessions.length > 0) {
        issues.push(`${orphanedSessions.length} sessions are associated with clients that don't exist`);
      }
    }
    
    // Check MCP issues
    if (!mcpStatus.workout) {
      issues.push('Workout MCP server is not accessible - workout data will not be synchronized');
    }
    if (!mcpStatus.gamification) {
      issues.push('Gamification MCP server is not accessible - achievements and rewards will not update');
    }
    
    // Check progress data synchronization - new checks for consistency between client and admin dashboards
    try {
      // Check for client progress API endpoint
      if (!apiStatus['/api/workouts']?.ok || !apiStatus['/api/gamification/profile']?.ok) {
        issues.push('Client progress APIs are not accessible - progress data will not be synchronized between dashboards');
      }
      
      // Verify the workout and gamification MCP servers are communicating correctly
      if (mcpStatus.workout && mcpStatus.gamification) {
        log('Verifying MCP server synchronization...');
        // This is where we'd add more detailed checks between the two MCP services
        // For now, just log that both servers are available
        log('Both MCP servers are accessible - data can be synchronized');
      } else if (mcpStatus.workout && !mcpStatus.gamification) {
        issues.push('Workout data is available but gamification data is not - progress and achievements will be out of sync');
      } else if (!mcpStatus.workout && mcpStatus.gamification) {
        issues.push('Gamification data is available but workout data is not - achievements will not update based on workouts');
      }
    } catch (error) {
      issues.push('Error checking progress data synchronization - dashboards may show inconsistent information');
      log(`Error in synchronization check: ${error}`);
    }
    
    setDataFlowIssues(issues);
    log(`Analysis complete: Found ${issues.length} potential data flow issues`);
  };
  
  // Fix common issues
  const attemptFixCommonIssues = async () => {
    log('Attempting to fix common issues');
    const fixResults: Record<string, string> = {};
    
    // Try to fix session-trainer assignments
    if (sessions.length > 0) {
      try {
        const unassignedSessions = sessions.filter(session => 
          (session.status === 'scheduled' || session.status === 'confirmed') && 
          !session.trainerId
        );
        
        if (unassignedSessions.length > 0) {
          log(`Fixing ${unassignedSessions.length} unassigned sessions`);
          
          // Find trainers
          const trainers = users.filter(user => user.role === 'trainer');
          
          if (trainers.length > 0) {
            // Attempt to assign trainers to sessions
            let fixedCount = 0;
            
            for (const session of unassignedSessions) {
              // Pick a trainer in round-robin fashion
              const trainer = trainers[fixedCount % trainers.length];
              
              try {
                // Call admin API to assign a trainer
                await authAxiosInstance.post(`/api/sessions/${session.id}/assign-trainer`, {
                  trainerId: trainer.id
                });
                
                fixedCount++;
              } catch (error) {
                log(`Failed to assign trainer to session ${session.id}`);
              }
            }
            
            fixResults['unassignedSessions'] = `Fixed ${fixedCount} of ${unassignedSessions.length} unassigned sessions`;
          } else {
            fixResults['unassignedSessions'] = 'No trainers available to assign to sessions';
          }
        } else {
          fixResults['unassignedSessions'] = 'No unassigned sessions found';
        }
      } catch (error: any) {
        fixResults['unassignedSessions'] = `Error fixing unassigned sessions: ${error.message}`;
      }
    }
    
    // Try to repair data connections
    try {
      log('Synchronizing data across dashboards');
      await authAxiosInstance.post('/api/admin/sync-data');
      fixResults['dataSynchronization'] = 'Data synchronization successful';
    } catch (error: any) {
      fixResults['dataSynchronization'] = `Data synchronization failed: ${error.message}`;
    }
    
    // Try to restart MCP connections if needed
    if (!mcpStatus.workout || !mcpStatus.gamification) {
      try {
        log('Attempting to reconnect to MCP servers');
        await authAxiosInstance.post('/api/admin/restart-mcp-connections');
        fixResults['mcpConnections'] = 'MCP reconnection attempt successful';
      } catch (error: any) {
        fixResults['mcpConnections'] = `MCP reconnection failed: ${error.message}`;
      }
    }
    
    // NEW: Attempt to fix client progress data synchronization
    try {
      log('Synchronizing client progress data between dashboards');
      
      // First check if both MCP servers are accessible
      if (mcpStatus.workout && mcpStatus.gamification) {
        // Try to synchronize client progress data through the admin API
        await authAxiosInstance.post('/api/admin/sync-client-progress');
        fixResults['progressDataSync'] = 'Client progress data synchronization successful';
        
        // Now verify that the workout and gamification data are properly linked
        log('Verifying workout and gamification data integration');
        await authAxiosInstance.post('/api/admin/verify-progress-integration');
        
        // Update achievements based on workout progress
        log('Updating achievements based on workout progress');
        await authAxiosInstance.post('/api/admin/update-achievements');
        
        fixResults['achievementSync'] = 'Achievement data updated successfully';
      } else {
        fixResults['progressDataSync'] = 'Cannot synchronize progress data - one or both MCP servers are offline';
      }
    } catch (error: any) {
      fixResults['progressDataSync'] = `Client progress synchronization failed: ${error.message}`;
    }
    
    setFixAttempts(fixResults);
    // Refresh data after fix attempts
    fetchAllData();
  };
  
  // Handle tab change
  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

  // Accordion state management
  const [expandedAccordions, setExpandedAccordions] = useState<Record<number, boolean>>({});
  
  const toggleAccordion = (index: number) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <Container>
      <Paper>
        <FlexBox className="items-center mb-3">
          <Bug size={36} color="#00ffff" />
          <Title>
            Cross-Dashboard Debugger
          </Title>
        </FlexBox>
        
        <Text>
          This tool diagnoses issues with data sharing between client, admin, and trainer dashboards.
          It focuses on sessions, notifications, workouts and gamification.
        </Text>

        <FlexBox className="gap-2 mt-3 mb-4">
          <Button 
            className="primary"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh All Data
          </Button>
          
          <Button 
            className="secondary"
            onClick={attemptFixCommonIssues}
            disabled={loading || dataFlowIssues.length === 0}
          >
            Attempt Auto-Fix
          </Button>
        </FlexBox>
        
        {loading ? (
          <FlexBox className="justify-center py-4">
            <SpinnerContainer>
              <Loader2 size={60} />
            </SpinnerContainer>
          </FlexBox>
        ) : (
          <>
            <div style={{ marginBottom: '32px' }}>
              <Alert className={dataFlowIssues.length > 0 ? "warning" : "success"}>
                <AlertIcon>
                  {dataFlowIssues.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                </AlertIcon>
                <AlertContent>
                  {dataFlowIssues.length > 0 
                    ? `${dataFlowIssues.length} data flow issues detected` 
                    : "All systems appear to be functioning correctly"}
                </AlertContent>
              </Alert>
              
              <Grid className="cols-3">
                <Card className={apiStatus['/api/sessions']?.ok ? '' : 'error-bg'}>
                  <CardContent>
                    <CardTitle>
                      Sessions
                    </CardTitle>
                    <CardValue>
                      {sessions.length}
                    </CardValue>
                    <CardSubtitle>
                      {apiStatus['/api/sessions']?.ok ? 'API Connected' : 'API Disconnected'}
                    </CardSubtitle>
                  </CardContent>
                </Card>
                
                <Card className={apiStatus['/api/notifications']?.ok ? '' : 'error-bg'}>
                  <CardContent>
                    <CardTitle>
                      Notifications
                    </CardTitle>
                    <CardValue>
                      {notifications.length}
                    </CardValue>
                    <CardSubtitle>
                      {apiStatus['/api/notifications']?.ok ? 'API Connected' : 'API Disconnected'}
                    </CardSubtitle>
                  </CardContent>
                </Card>
                
                <Card className={(mcpStatus.workout && mcpStatus.gamification) ? '' : 'error-bg'}>
                  <CardContent>
                    <CardTitle>
                      MCP Servers
                    </CardTitle>
                    <FlexBox className="gap-2" style={{ marginBottom: '8px' }}>
                      <Chip 
                        className={mcpStatus.workout ? "success small" : "error small"}
                      >
                        Workout
                      </Chip>
                      <Chip 
                        className={mcpStatus.gamification ? "success small" : "error small"}
                      >
                        Gamification
                      </Chip>
                    </FlexBox>
                  </CardContent>
                </Card>
              </Grid>
            </div>
            
            <TabsContainer>
              <TabsList>
                <TabButton 
                  className={activeTab === 0 ? 'active' : ''}
                  onClick={() => handleTabChange(0)}
                >
                  Issues & Fixes
                </TabButton>
                <TabButton 
                  className={activeTab === 1 ? 'active' : ''}
                  onClick={() => handleTabChange(1)}
                >
                  Sessions Data
                </TabButton>
                <TabButton 
                  className={activeTab === 2 ? 'active' : ''}
                  onClick={() => handleTabChange(2)}
                >
                  API Status
                </TabButton>
                <TabButton 
                  className={activeTab === 3 ? 'active' : ''}
                  onClick={() => handleTabChange(3)}
                >
                  Debug Log
                </TabButton>
              </TabsList>
            </TabsContainer>
            
            {/* Issues & Fixes Tab */}
            {activeTab === 0 && (
              <div>
                <Subtitle>
                  Detected Issues
                </Subtitle>
                
                {dataFlowIssues.length > 0 ? (
                  <div style={{ marginBottom: '32px' }}>
                    {dataFlowIssues.map((issue, index) => (
                      <Alert 
                        key={index}
                        className="warning"
                      >
                        <AlertIcon>
                          <AlertTriangle size={16} />
                        </AlertIcon>
                        <AlertContent>
                          {issue}
                        </AlertContent>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert className="success" style={{ marginBottom: '32px' }}>
                    <AlertIcon>
                      <CheckCircle size={16} />
                    </AlertIcon>
                    <AlertContent>
                      No data flow issues detected
                    </AlertContent>
                  </Alert>
                )}
                
                {Object.keys(fixAttempts).length > 0 && (
                  <>
                    <Subtitle>
                      Fix Attempts
                    </Subtitle>
                    
                    <div style={{ marginBottom: '32px' }}>
                      {Object.entries(fixAttempts).map(([key, result], index) => (
                        <Alert 
                          key={index}
                          className={result.includes('successful') ? "success" : "info"}
                        >
                          <AlertIcon>
                            {result.includes('successful') ? <CheckCircle size={16} /> : <Info size={16} />}
                          </AlertIcon>
                          <AlertContent>
                            {result}
                          </AlertContent>
                        </Alert>
                      ))}
                    </div>
                  </>
                )}
                
                <Subtitle>
                  Common Solutions
                </Subtitle>
                
                <Accordion>
                  <AccordionHeader onClick={() => toggleAccordion(0)}>
                    <span>Sessions Not Appearing</span>
                    <ChevronDown 
                      size={20} 
                      style={{ 
                        transform: expandedAccordions[0] ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </AccordionHeader>
                  <AccordionContent $isOpen={!!expandedAccordions[0]}>
                    <AccordionBody>
                      <Text>
                        If sessions are not appearing in dashboards, try these solutions:
                      </Text>
                      <ol>
                        <li>Check that the session API endpoint is accessible</li>
                        <li>Verify that sessions have the correct status and are associated with valid users</li>
                        <li>Ensure sessions are associated with the correct client ID</li>
                        <li>Check that role-based filtering is working correctly in the session controller</li>
                      </ol>
                      <Text style={{ marginTop: '16px' }}>
                        Direct fix: You can run a database repair script from the admin panel to ensure session data consistency.
                      </Text>
                    </AccordionBody>
                  </AccordionContent>
                </Accordion>
                
                <Accordion>
                  <AccordionHeader onClick={() => toggleAccordion(1)}>
                    <span>Notifications Not Appearing</span>
                    <ChevronDown 
                      size={20} 
                      style={{ 
                        transform: expandedAccordions[1] ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </AccordionHeader>
                  <AccordionContent $isOpen={!!expandedAccordions[1]}>
                    <AccordionBody>
                      <Text>
                        If notifications are not appearing correctly, try these solutions:
                      </Text>
                      <ol>
                        <li>Check that the notification API endpoint is accessible</li>
                        <li>Verify WebSocket connections are established for real-time updates</li>
                        <li>Ensure notification events are being properly triggered by actions</li>
                        <li>Check that notification types are being correctly filtered</li>
                      </ol>
                      <Text style={{ marginTop: '16px' }}>
                        Direct fix: You can manually trigger test notifications for all users to verify the notification system.
                      </Text>
                    </AccordionBody>
                  </AccordionContent>
                </Accordion>
                
                <Accordion>
                  <AccordionHeader onClick={() => toggleAccordion(2)}>
                    <span>Session Purchase Not Showing in Client Dashboard</span>
                    <ChevronDown 
                      size={20} 
                      style={{ 
                        transform: expandedAccordions[2] ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </AccordionHeader>
                  <AccordionContent $isOpen={!!expandedAccordions[2]}>
                    <AccordionBody>
                      <Text>
                        If sessions purchased through the cart system are not showing up in client accounts, try these solutions:
                      </Text>
                      <ol>
                        <li>Check that order processing is correctly adding session credits to client accounts</li>
                        <li>Verify the client's availableSessions field is being updated</li>
                        <li>Ensure session packages are correctly defined with session counts</li>
                        <li>Check that the cart checkout process is completing successfully</li>
                      </ol>
                      <Text style={{ marginTop: '16px' }}>
                        Direct fix: You can manually add session credits to client accounts from the admin dashboard.
                      </Text>
                    </AccordionBody>
                  </AccordionContent>
                </Accordion>
                
                <Accordion>
                  <AccordionHeader onClick={() => toggleAccordion(3)}>
                    <span>MCP Server Connection Issues</span>
                    <ChevronDown 
                      size={20} 
                      style={{ 
                        transform: expandedAccordions[3] ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </AccordionHeader>
                  <AccordionContent $isOpen={!!expandedAccordions[3]}>
                    <AccordionBody>
                      <Text>
                        If MCP servers are not connecting properly, try these solutions:
                      </Text>
                      <ol>
                        <li>Check that MCP servers are running on the correct ports</li>
                        <li>Verify API keys and authentication tokens are valid</li>
                        <li>Ensure CORS is properly configured for cross-origin requests</li>
                        <li>Check network connectivity between frontend and MCP servers</li>
                      </ol>
                      <Text style={{ marginTop: '16px' }}>
                        Direct fix: You can restart the MCP servers using the scripts in the /scripts directory.
                      </Text>
                    </AccordionBody>
                  </AccordionContent>
                </Accordion>
              </div>
            )}
            
            {/* Sessions Data Tab */}
            {activeTab === 1 && (
              <div>
                <Subtitle>
                  Session Data Analysis
                </Subtitle>
                
                {sessions.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell className="header">ID</TableCell>
                          <TableCell className="header">Date</TableCell>
                          <TableCell className="header">Client</TableCell>
                          <TableCell className="header">Trainer</TableCell>
                          <TableCell className="header">Status</TableCell>
                          <TableCell className="header">Visibility</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessions.map((session) => {
                          // Find client and trainer objects
                          const client = users.find(user => user.id === session.userId);
                          const trainer = users.find(user => user.id === session.trainerId);
                          
                          // Determine dashboard visibility
                          const adminVisible = true;
                          const clientVisible = !!session.userId;
                          const trainerVisible = !!session.trainerId;
                          
                          return (
                            <TableRow key={session.id}>
                              <TableCell>{session.id}</TableCell>
                              <TableCell>{new Date(session.sessionDate).toLocaleString()}</TableCell>
                              <TableCell>
                                {client 
                                  ? `${client.firstName} ${client.lastName}`
                                  : session.userId 
                                    ? <Chip className="error small">MISSING CLIENT</Chip>
                                    : "Not booked"
                                }
                              </TableCell>
                              <TableCell>
                                {trainer 
                                  ? `${trainer.firstName} ${trainer.lastName}`
                                  : session.trainerId
                                    ? <Chip className="error small">MISSING TRAINER</Chip>
                                    : <Chip className="warning small">UNASSIGNED</Chip>
                                }
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  className={
                                    session.status === 'available' ? 'info small' :
                                    session.status === 'completed' ? 'success small' :
                                    session.status === 'cancelled' ? 'error small' :
                                    'default small'
                                  }
                                >
                                  {session.status}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                <FlexBox className="gap-2">
                                  <Chip 
                                    className={adminVisible ? "success small" : "error small"}
                                    title="Admin dashboard visibility"
                                  >
                                    A
                                  </Chip>
                                  <Chip 
                                    className={clientVisible ? "success small" : "error small"}
                                    title="Client dashboard visibility"
                                  >
                                    C
                                  </Chip>
                                  <Chip 
                                    className={trainerVisible ? "success small" : "error small"}
                                    title="Trainer dashboard visibility"
                                  >
                                    T
                                  </Chip>
                                </FlexBox>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert className="warning">
                    <AlertIcon>
                      <AlertTriangle size={16} />
                    </AlertIcon>
                    <AlertContent>
                      No session data available
                    </AlertContent>
                  </Alert>
                )}
              </div>
            )}
            
            {/* API Status Tab */}
            {activeTab === 2 && (
              <div>
                <Subtitle>
                  API Connection Status
                </Subtitle>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="header">Endpoint</TableCell>
                        <TableCell className="header">Status</TableCell>
                        <TableCell className="header">Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(apiStatus).map(([endpoint, status]) => (
                        <TableRow key={endpoint}>
                          <TableCell>{endpoint}</TableCell>
                          <TableCell>
                            <Chip 
                              className={status.ok ? "success" : "error"}
                            >
                              {status.ok ? "Connected" : "Error"}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            {status.ok 
                              ? `Status: ${status.status} ${status.statusText}`
                              : `Error: ${status.statusText || status.error || status.status}`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Subtitle style={{ marginTop: '32px', marginBottom: '16px' }}>
                  MCP Server Status
                </Subtitle>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="header">Server</TableCell>
                        <TableCell className="header">Status</TableCell>
                        <TableCell className="header">Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Workout MCP</TableCell>
                        <TableCell>
                          <Chip 
                            className={mcpStatus.workout ? "success" : "error"}
                          >
                            {mcpStatus.workout ? "Connected" : "Disconnected"}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {mcpStatus.workout 
                            ? "Workout data synchronized properly"
                            : "Workout recommendations and tracking will be unavailable"
                          }
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gamification MCP</TableCell>
                        <TableCell>
                          <Chip 
                            className={mcpStatus.gamification ? "success" : "error"}
                          >
                            {mcpStatus.gamification ? "Connected" : "Disconnected"}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {mcpStatus.gamification 
                            ? "Gamification features working properly"
                            : "Achievements, rewards and points will not update"
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
            
            {/* Debug Log Tab */}
            {activeTab === 3 && (
              <div>
                <Subtitle>
                  Debug Log
                </Subtitle>
                
                <DebugLog>
                  {debugLog.map((log, index) => (
                    <div key={index} className="log-entry">
                      {log}
                    </div>
                  ))}
                </DebugLog>
              </div>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default CrossDashboardDebugger;
