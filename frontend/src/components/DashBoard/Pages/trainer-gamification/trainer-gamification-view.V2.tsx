/**
 * Trainer Gamification View V2
 * =============================
 * Clean rewrite using ui-kit components (MUI-free)
 * 
 * Strangler Fig Pattern - V2 Version
 * Interface for trainers to award points and achievements to clients
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Trophy, Search, User } from 'lucide-react';

// Import UI Kit components
import { PageTitle, BodyText, SectionTitle } from '../../../ui-kit/Typography';
import { Card, CardBody, CardHeader, FlexBox } from '../../../ui-kit/Card';
import { StyledInput } from '../../../ui-kit/Input';
import { LoadingState } from '../../../ui-kit/EmptyState';

// Import custom hook (should be MUI-free already)
import { useTrainerGamification } from './hooks/useTrainerGamification';
import type { Client, Achievement, PointReason } from './hooks/useTrainerGamification';

// Import components (should be MUI-free already)
import ClientTable from './components/ClientTable';
import AchievementGrid from './components/AchievementGrid';
import AwardPointsDialog from './components/AwardPointsDialog';
import AwardAchievementDialog from './components/AwardAchievementDialog';

// Styled components
const PageContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
`;

const HeaderSection = styled.div`
  margin-bottom: 2rem;
`;

const SearchContainer = styled.div`
  position: relative;
  width: 300px;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }
  
  input {
    padding-left: 2.75rem;
  }
`;

// Custom Tab System
const TabContainer = styled.div`
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 0;
`;

const TabButton = styled.button<{ isActive: boolean }>`
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${props => props.isActive ? '#3b82f6' : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : '#94a3b8'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  top: 2px;
  
  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  svg {
    flex-shrink: 0;
  }
`;

const TabPanel = styled.div<{ isActive: boolean }>`
  display: ${props => props.isActive ? 'block' : 'none'};
`;

/**
 * Trainer Gamification View Component V2
 * 
 * Features:
 * - Client points management
 * - Achievement awarding
 * - Client search/filter
 * - MUI-free implementation
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
  const [activeTab, setActiveTab] = useState<number>(0);
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
    return <LoadingState message="Loading gamification data..." />;
  }
  
  const tabs = [
    { id: 0, label: 'Client Management', icon: User },
    { id: 1, label: 'Achievement Management', icon: Trophy }
  ];
  
  return (
    <PageContainer>
      {/* Header */}
      <HeaderSection>
        <PageTitle>Client Gamification Management</PageTitle>
        <BodyText secondary style={{ marginTop: '0.5rem' }}>
          Award points and achievements to motivate your clients towards their fitness goals. Track their progress and help them level up.
        </BodyText>
      </HeaderSection>
      
      {/* Tabs */}
      <TabContainer>
        <TabList role="tablist" aria-label="gamification tabs">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </TabButton>
          ))}
        </TabList>
      </TabContainer>
      
      {/* Client Management Tab */}
      <TabPanel
        isActive={activeTab === 0}
        role="tabpanel"
        id="tabpanel-0"
        aria-labelledby="tab-0"
      >
        <Card>
          <CardHeader>
            <FlexBox justify="space-between" align="center" style={{ width: '100%' }}>
              <SectionTitle>Client Points Management</SectionTitle>
              
              <SearchContainer>
                <Search size={18} />
                <StyledInput
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="client-search"
                />
              </SearchContainer>
            </FlexBox>
          </CardHeader>
          
          <CardBody>
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
          </CardBody>
        </Card>
      </TabPanel>
      
      {/* Achievement Management Tab */}
      <TabPanel
        isActive={activeTab === 1}
        role="tabpanel"
        id="tabpanel-1"
        aria-labelledby="tab-1"
      >
        <Card>
          <CardHeader>
            <SectionTitle>Available Achievements</SectionTitle>
          </CardHeader>
          
          <CardBody>
            <BodyText secondary style={{ marginBottom: '1.5rem' }}>
              These achievements can be awarded to clients. Each achievement includes a point value that will be credited to the client's account when the achievement is awarded.
            </BodyText>
            
            <AchievementGrid achievements={achievements} />
          </CardBody>
        </Card>
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
