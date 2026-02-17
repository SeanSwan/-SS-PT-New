import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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

// Styled components replacing MUI
const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.15);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
`;

const PageTitle = styled.h1`
  font-size: 2.125rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const BodyText = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 8px;
  line-height: 1.6;
`;

const DescriptionText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 24px;
  line-height: 1.5;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 16px;
  overflow-x: auto;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? '#00ffff' : 'transparent'};
  color: ${({ $active }) => $active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active }) => $active ? '#00ffff' : 'rgba(255, 255, 255, 0.85)'};
  }
`;

const TabContent = styled.div`
  padding: 24px 0;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 300px;

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 40px;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return (
    <TabContent
      role="tabpanel"
      id={`trainer-gamification-tabpanel-${index}`}
      aria-labelledby={`trainer-gamification-tab-${index}`}
    >
      {children}
    </TabContent>
  );
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
      <LoadingWrapper>
        <Spinner />
      </LoadingWrapper>
    );
  }

  return (
    <PageContainer>
      <PageTitle>Client Gamification Management</PageTitle>

      <div style={{ marginBottom: '32px' }}>
        <BodyText>
          Award points and achievements to motivate your clients towards their fitness goals. Track their progress and help them level up.
        </BodyText>
      </div>

      {/* Tabs */}
      <TabBar role="tablist" aria-label="gamification tabs">
        <TabButton
          role="tab"
          $active={tabValue === 0}
          onClick={() => setTabValue(0)}
          id="trainer-gamification-tab-0"
          aria-controls="trainer-gamification-tabpanel-0"
          aria-selected={tabValue === 0}
        >
          <User size={16} />
          Client Management
        </TabButton>
        <TabButton
          role="tab"
          $active={tabValue === 1}
          onClick={() => setTabValue(1)}
          id="trainer-gamification-tab-1"
          aria-controls="trainer-gamification-tabpanel-1"
          aria-selected={tabValue === 1}
        >
          <Trophy size={16} />
          Achievement Management
        </TabButton>
      </TabBar>

      {/* Client Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <HeaderRow>
          <SectionTitle>Client Points Management</SectionTitle>

          <SearchWrapper>
            <SearchIcon><Search size={18} /></SearchIcon>
            <SearchInput
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="client-search"
            />
          </SearchWrapper>
        </HeaderRow>

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
        <HeaderRow>
          <SectionTitle>Available Achievements</SectionTitle>
        </HeaderRow>

        <DescriptionText>
          These achievements can be awarded to clients. Each achievement includes a point value that will be credited to the client's account when the achievement is awarded.
        </DescriptionText>

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