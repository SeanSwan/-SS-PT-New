import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Tabs,
  Tab,
  Alert,
  Switch,
  FormControlLabel,
  Chip,
  Paper,
  Button
} from '@mui/material';
import { 
  Activity, 
  Trophy, 
  Target,
  CompareArrows,
  Shield,
  Timeline,
  BarChart,
  TrendingUp
} from 'lucide-react';

// Import the original ClientProgressView
import ClientProgressView from './ClientProgressView';

// Import new analytics components and types
import { 
  ComparisonAnalytics, 
  InjuryRiskAssessment, 
  GoalProgressTracker,
  type ClientData,
  type WorkoutHistoryEntry,
  type GoalUpdate
} from './Analytics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`enhanced-progress-tabpanel-${index}`}
      aria-labelledby={`enhanced-progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `enhanced-progress-tab-${index}`,
    'aria-controls': `enhanced-progress-tabpanel-${index}`,
  };
}

/**
 * EnhancedClientProgressView Component
 * 
 * Advanced trainer progress dashboard with comprehensive analytics including:
 * - Original fitness progress, gamification, and recommendations
 * - Advanced comparison analytics vs other clients/averages/goals
 * - NASM-based injury risk assessment and corrective protocols
 * - SMART goal tracking with milestone management
 * - Predictive analytics and AI-powered insights
 * 
 * This component extends the existing ClientProgressView with professional-grade
 * analytics tools for comprehensive client management and progression tracking.
 */
const EnhancedClientProgressView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  const clientId = searchParams.get('clientId') || '1';
  
  // Mock enhanced client data - in real implementation, this would come from API
  const enhancedClientData = useMemo((): ClientData => ({
    id: clientId,
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    startDate: '2024-01-15',
    totalSessions: 45,
    completedSessions: 38,
    riskLevel: 'medium' as const,
    primaryGoals: ['Weight Loss', 'Strength Building'],
    lastAssessment: new Date().toISOString(),
    progressMetrics: {
      strength: 75,
      cardio: 68,
      flexibility: 60,
      balance: 65,
      stability: 70
    }
  }), [clientId]);

  const mockWorkoutHistory = useMemo((): WorkoutHistoryEntry[] => [
    { date: '2024-07-15', type: 'Strength', duration: 60, intensity: 7 },
    { date: '2024-07-13', type: 'Cardio', duration: 45, intensity: 6 },
    { date: '2024-07-11', type: 'Flexibility', duration: 30, intensity: 5 },
    { date: '2024-07-09', type: 'Strength', duration: 65, intensity: 8 },
    { date: '2024-07-07', type: 'HIIT', duration: 35, intensity: 9 }
  ], []);

  const handleGoalUpdate = (goalId: string, update: GoalUpdate): void => {
    // Handle goal updates - in real implementation, this would call API
    console.log('Goal update:', goalId, update);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderHeader = () => (
    <Paper sx={{ p: 3, bgcolor: '#1d1f2b', mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Enhanced Client Progress Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Advanced analytics and insights for {enhancedClientData.firstName} {enhancedClientData.lastName}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
                color="primary"
              />
            }
            label="Advanced Analytics Mode"
          />
          
          <Chip 
            label={`Risk Level: ${enhancedClientData.riskLevel.toUpperCase()}`}
            color={enhancedClientData.riskLevel === 'low' ? 'success' : 
                   enhancedClientData.riskLevel === 'medium' ? 'warning' : 'error'}
          />
        </Box>
      </Box>
      
      {advancedMode && (
        <Alert severity="info" sx={{ bgcolor: 'rgba(0, 255, 255, 0.1)' }}>
          <Typography variant="body2">
            Advanced Analytics Mode provides comprehensive risk assessment, comparative analysis, and predictive insights 
            for professional-grade client management.
          </Typography>
        </Alert>
      )}
    </Paper>
  );

  const renderTabs = () => (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="enhanced client progress tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label="Overview & Fitness" 
            icon={<Activity size={18} />} 
            iconPosition="start" 
            {...a11yProps(0)} 
          />
          
          {advancedMode && (
            <>
              <Tab 
                label="Comparison Analytics" 
                icon={<CompareArrows size={18} />} 
                iconPosition="start" 
                {...a11yProps(1)} 
              />
              <Tab 
                label="Injury Risk Assessment" 
                icon={<Shield size={18} />} 
                iconPosition="start" 
                {...a11yProps(2)} 
              />
              <Tab 
                label="Goal Tracking" 
                icon={<Target size={18} />} 
                iconPosition="start" 
                {...a11yProps(3)} 
              />
            </>
          )}
          
          <Tab 
            label="Gamification" 
            icon={<Trophy size={18} />} 
            iconPosition="start" 
            {...a11yProps(advancedMode ? 4 : 1)} 
          />
        </Tabs>
      </Box>
      
      {/* Original Overview Tab - Embedded ClientProgressView */}
      <TabPanel value={tabValue} index={0}>
        <ClientProgressView />
      </TabPanel>
      
      {/* Advanced Analytics Tabs (only visible in advanced mode) */}
      {advancedMode && (
        <>
          <TabPanel value={tabValue} index={1}>
            <ComparisonAnalytics 
              clientId={clientId}
              clientData={enhancedClientData}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <InjuryRiskAssessment 
              clientId={clientId}
              clientData={enhancedClientData}
              workoutHistory={mockWorkoutHistory}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <GoalProgressTracker 
              clientId={clientId}
              clientData={enhancedClientData}
              onGoalUpdate={handleGoalUpdate}
            />
          </TabPanel>
        </>
      )}
      
      {/* Gamification Tab */}
      <TabPanel value={tabValue} index={advancedMode ? 4 : 1}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Gamification & Social Progress
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This tab will show the gamification content from the original ClientProgressView.
            Integration with existing gamification functionality will be completed in the next phase.
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2, bgcolor: '#00ffff', color: '#1d1f2b' }}
            onClick={() => setTabValue(0)}
          >
            View in Overview Tab
          </Button>
        </Box>
      </TabPanel>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {renderHeader()}
      {renderTabs()}
      
      {/* Quick Action Bar for Advanced Mode */}
      {advancedMode && (
        <Paper sx={{ p: 2, bgcolor: 'rgba(0, 255, 255, 0.05)', position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Typography variant="caption" display="block" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<BarChart size={14} />} onClick={() => setTabValue(1)}>
              Compare
            </Button>
            <Button size="small" startIcon={<Shield size={14} />} onClick={() => setTabValue(2)}>
              Risk
            </Button>
            <Button size="small" startIcon={<Target size={14} />} onClick={() => setTabValue(3)}>
              Goals
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedClientProgressView;