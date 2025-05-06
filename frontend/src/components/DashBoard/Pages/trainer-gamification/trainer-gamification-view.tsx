import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs,
  Tab,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';

// Import icons
import {
  Trophy,
  Search,
  User,
} from 'lucide-react';

// Import styled components
import {
  PageContainer,
} from '../admin-gamification/styled-gamification-system';

// Import custom hook
import { useTrainerGamification } from './hooks/useTrainerGamification';
import type { Client, Achievement, PointReason } from './hooks/useTrainerGamification';

// Import components
import ClientTable from './components/ClientTable';
import AchievementGrid from './components/AchievementGrid';
import AwardPointsDialog from './components/AwardPointsDialog';
import AwardAchievementDialog from './components/AwardAchievementDialog';

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
      id={`trainer-gamification-tabpanel-${index}`}
      aria-labelledby={`trainer-gamification-tab-${index}`}
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
    id: `trainer-gamification-tab-${index}`,
    'aria-controls': `trainer-gamification-tabpanel-${index}`,
  };
}

/**
 * Trainer Gamification View
 * Interface for trainers to award points and achievements to clients
 */
const TrainerGamificationView: React.FC = () => {
  // Use the custom hook for trainer gamification
  const {
    loading,
    clients,
    achievements,
    filteredClients,
    searchQuery,
    setSearchQuery,
    pointReasons,
    loadInitialData,
    awardPoints,
    awardAchievement
  } = useTrainerGamification();
  
  // Local state
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [awardPointsDialog, setAwardPointsDialog] = useState<boolean>(false);
  const [awardAchievementDialog, setAwardAchievementDialog] = useState<boolean>(false);
  const [pointsToAward, setPointsToAward] = useState<number>(50);
  const [pointReason, setPointReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [selectedAchievement, setSelectedAchievement] = useState<string>('');
  const [awardingPoints, setAwardingPoints] = useState<boolean>(false);
  const [awardingAchievement, setAwardingAchievement] = useState<boolean>(false);
  
  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle awarding points
  const handleAwardPoints = async () => {
    if (!selectedClient) return;
    
    setAwardingPoints(true);
    
    try {
      // Get the reason text and points
      let reasonText = '';
      let pointsAmount = pointsToAward;
      
      if (pointReason === 'custom') {
        reasonText = customReason;
      } else {
        const reason = pointReasons.find(r => r.id === pointReason);
        if (reason) {
          reasonText = reason.description;
          // If using a predefined reason, use its point value unless custom points were entered
          if (pointsToAward === 0) {
            pointsAmount = reason.pointValue;
          }
        }
      }
      
      if (!reasonText) {
        throw new Error('Please provide a reason for awarding points');
      }
      
      if (pointsAmount <= 0) {
        throw new Error('Points must be greater than zero');
      }
      
      // Award points to the client
      await awardPoints(selectedClient.id, pointsAmount, pointReason, reasonText);
      
      // Reset form and close dialog
      setAwardPointsDialog(false);
      setPointsToAward(50);
      setPointReason('');
      setCustomReason('');
      
    } catch (error: any) {
      console.error('Error awarding points:', error);
    } finally {
      setAwardingPoints(false);
    }
  };
  
  // Handle awarding achievement
  const handleAwardAchievement = async () => {
    if (!selectedClient || !selectedAchievement) return;
    
    setAwardingAchievement(true);
    
    try {
      // Award achievement to the client
      await awardAchievement(selectedClient.id, selectedAchievement);
      
      // Reset form and close dialog
      setAwardAchievementDialog(false);
      setSelectedAchievement('');
      
    } catch (error: any) {
      console.error('Error awarding achievement:', error);
    } finally {
      setAwardingAchievement(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '50vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <PageContainer>
      <Typography variant="h4" component="h1" gutterBottom>
        Client Gamification Management
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" gutterBottom>
          Award points and achievements to motivate your clients towards their fitness goals. Track their progress and help them level up.
        </Typography>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="gamification tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Client Management" icon={<User size={16} />} iconPosition="start" {...a11yProps(0)} />
          <Tab label="Achievement Management" icon={<Trophy size={16} />} iconPosition="start" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      {/* Client Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Client Points Management
          </Typography>
          
          <TextField
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            data-testid="client-search"
          />
        </Box>
        
        <ClientTable 
          clients={filteredClients}
          onAwardPoints={(client) => {
            setSelectedClient(client);
            setAwardPointsDialog(true);
          }}
          onAwardAchievement={(client) => {
            setSelectedClient(client);
            setAwardAchievementDialog(true);
          }}
        />
      </TabPanel>
      
      {/* Achievement Management Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Available Achievements
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          These achievements can be awarded to clients. Each achievement includes a point value that will be credited to the client's account when the achievement is awarded.
        </Typography>
        
        <AchievementGrid achievements={achievements} />
      </TabPanel>
      
      {/* Award Points Dialog */}
      <AwardPointsDialog 
        open={awardPointsDialog}
        onClose={() => {
          setAwardPointsDialog(false);
          setPointsToAward(50);
          setPointReason('');
          setCustomReason('');
        }}
        onAward={handleAwardPoints}
        client={selectedClient}
        pointsToAward={pointsToAward}
        setPointsToAward={setPointsToAward}
        pointReason={pointReason}
        setPointReason={setPointReason}
        customReason={customReason}
        setCustomReason={setCustomReason}
        pointReasons={pointReasons}
        awarding={awardingPoints}
      />
      
      {/* Award Achievement Dialog */}
      <AwardAchievementDialog 
        open={awardAchievementDialog}
        onClose={() => {
          setAwardAchievementDialog(false);
          setSelectedAchievement('');
        }}
        onAward={handleAwardAchievement}
        client={selectedClient}
        selectedAchievement={selectedAchievement}
        setSelectedAchievement={setSelectedAchievement}
        achievements={achievements}
        awarding={awardingAchievement}
      />
    </PageContainer>
  );
};

export default TrainerGamificationView;