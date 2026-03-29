/**
 * ============================================================================
 * FILE: trainer-gamification-view.tsx
 * PURPOSE: Trainer interface for awarding points and achievements to clients
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Provides trainers with a client list and tools to award XP points and
 * achievements to their assigned clients. Shows each client's current level,
 * tier, and streak. Includes dialogs for point awarding (with reason selection)
 * and achievement awarding.
 *
 * HOW IT FITS IN THE APP:
 * App -> DashBoard -> TrainerDashboard -> trainer-gamification-view
 * Uses useTrainerGamification hook for client data and award actions.
 * Children: ClientTable, AwardPointsDialog, AwardAchievementDialog, AchievementGrid.
 *
 * KEY DECISIONS:
 * - V1 version (V2 exists as strangler-fig rewrite with ui-kit components)
 * - Search-filterable client list for trainers with many clients
 * - Shared styled-components from admin styled-gamification-system.ts
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainerGamificationView                           ║
 * ║  PURPOSE: Trainer client point/achievement awarding interface ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-23                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Title: "Client Gamification"] [Search: client name]       │
 * ├────────────────────────────────────────────────────────────┤
 * │ Client Table                                               │
 * │ | Name | Level | Tier | Streak | [Award Pts] [Award Badge]│
 * │ | ...  | ...   | ...  | ...    | [btn]       [btn]        │
 * ├────────────────────────────────────────────────────────────┤
 * │ Achievement Grid (all available achievements)              │
 * └────────────────────────────────────────────────────────────┘
 *
 * ARCHITECTURE:
 * graph TD
 *   A[TrainerGamificationView] --> B[ClientTable]
 *   A --> C[AchievementGrid]
 *   A --> D[AwardPointsDialog]
 *   A --> E[AwardAchievementDialog]
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import styled from 'styled-components';

// Import icons
import {
  Trophy,
  Search,
  User,
  Sparkles,
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

// V2 RPG Components (lazy loaded)
const AegisHud = lazy(() =>
  import('../../../AdvancedGamification/components/AegisHud').then(m => ({ default: m.AegisHud }))
);
const StreakFortress = lazy(() =>
  import('../../../AdvancedGamification/components/StreakFortress').then(m => ({ default: m.StreakFortress }))
);
const CompanionPet = lazy(() =>
  import('../../../AdvancedGamification/components/CompanionPet').then(m => ({ default: m.CompanionPet }))
);
const GhostModeBanner = lazy(() =>
  import('../../../AdvancedGamification/components/GhostMode').then(m => ({ default: m.GhostModeBanner }))
);

// Styled components replacing MUI
const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(139, 92, 246, 0.15);
  border-top-color: #60C0F0;
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
  border-bottom: 2px solid ${({ $active }) => $active ? '#60C0F0' : 'transparent'};
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(255, 255, 255, 0.85)'};
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
  &:focus { outline: none; border-color: rgba(139, 92, 246, 0.5); }
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
        <TabButton
          role="tab"
          $active={tabValue === 2}
          onClick={() => setTabValue(2)}
          id="trainer-gamification-tab-2"
          aria-controls="trainer-gamification-tabpanel-2"
          aria-selected={tabValue === 2}
        >
          <Sparkles size={16} />
          RPG Features
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

      {/* RPG Features Tab */}
      <TabPanel value={tabValue} index={2}>
        <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'rgba(224,236,244,0.5)' }}>Loading RPG features...</div>}>
          {selectedClient?.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionTitle>RPG Status: {selectedClient.firstName} {selectedClient.lastName}</SectionTitle>
              <AegisHud userId={selectedClient.id} showMoodlet />
              <StreakFortress streakDays={selectedClient.streakDays || 0} streakFreezes={0} maxFreezes={3} />
              <GhostModeBanner userId={selectedClient.id} />
              <CompanionPet userId={selectedClient.id} size={150} showControls={false} />
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(224,236,244,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Select a client from the Client Management tab to view their RPG status.
            </div>
          )}
        </Suspense>
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