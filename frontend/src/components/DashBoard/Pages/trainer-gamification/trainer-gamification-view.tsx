import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Search, Sparkles, Trophy, User } from 'lucide-react';
import { PageContainer } from '../admin-gamification/styled-gamification-system';
import { useTrainerGamification } from './hooks/useTrainerGamification';
import type { Client } from './hooks/useTrainerGamification';
import { isTrainerPointAwardAllowed } from './trainerGamificationData';
import ClientTable from './components/ClientTable';
import AchievementGrid from './components/AchievementGrid';
import AwardPointsDialog from './components/AwardPointsDialog';
import AwardAchievementDialog from './components/AwardAchievementDialog';
import {
  BodyText,
  DescriptionText,
  HeaderRow,
  IntroBlock,
  LoadingWrapper,
  PageTitle,
  RpgLoadingState,
  RpgPanelStack,
  RpgUnavailableState,
  SearchIcon,
  SearchInput,
  SearchWrapper,
  SectionTitle,
  Spinner,
  TabBar,
  TabButton,
  TabContent,
} from './trainer-gamification-view.styles';

const AegisHud = lazy(() =>
  import('../../../AdvancedGamification/components/AegisHud').then(m => ({ default: m.AegisHud }))
);
const CompanionPet = lazy(() =>
  import('../../../AdvancedGamification/components/CompanionPet').then(m => ({ default: m.CompanionPet }))
);
const GhostModeBanner = lazy(() =>
  import('../../../AdvancedGamification/components/GhostMode').then(m => ({ default: m.GhostModeBanner }))
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return (
    <TabContent role="tabpanel" id={`trainer-gamification-tabpanel-${index}`} aria-labelledby={`trainer-gamification-tab-${index}`}>
      {children}
    </TabContent>
  );
}

const TrainerGamificationView: React.FC = () => {
  const {
    loading,
    achievements,
    filteredClients,
    searchQuery,
    setSearchQuery,
    pointReasons,
    loadInitialData,
    awardPoints,
    awardAchievement,
  } = useTrainerGamification();
  const [tabValue, setTabValue] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [awardPointsDialog, setAwardPointsDialog] = useState(false);
  const [awardAchievementDialog, setAwardAchievementDialog] = useState(false);
  const [pointsToAward, setPointsToAward] = useState(50);
  const [pointReason, setPointReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState('');
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [awardingAchievement, setAwardingAchievement] = useState(false);
  const awardingPointsInFlightRef = useRef(false);
  const awardingAchievementInFlightRef = useRef(false);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const closePointsDialog = () => {
    setAwardPointsDialog(false);
    setPointsToAward(50);
    setPointReason('');
    setCustomReason('');
  };

  const handleAwardPoints = async () => {
    if (awardingPointsInFlightRef.current) return;
    if (!selectedClient) return;
    const reason = pointReasons.find(r => r.id === pointReason);
    const award = {
      points: pointReason === 'custom' ? pointsToAward : pointsToAward || reason?.pointValue || 0,
      reason: pointReason,
      description: pointReason === 'custom' ? customReason.trim() : reason?.description || '',
    };
    if (!award.description || !isTrainerPointAwardAllowed(award.points)) return;

    awardingPointsInFlightRef.current = true;
    setAwardingPoints(true);
    try {
      await awardPoints(selectedClient.id, award.points, award.reason, award.description);
      closePointsDialog();
    } catch (error) {
      console.error('Error awarding trainer gamification points:', error);
    } finally {
      awardingPointsInFlightRef.current = false;
      setAwardingPoints(false);
    }
  };

  const handleAwardAchievement = async () => {
    if (awardingAchievementInFlightRef.current) return;
    if (!selectedClient || !selectedAchievement) return;
    awardingAchievementInFlightRef.current = true;
    setAwardingAchievement(true);
    try {
      await awardAchievement(selectedClient.id, selectedAchievement);
      setAwardAchievementDialog(false);
      setSelectedAchievement('');
    } catch (error) {
      console.error('Error awarding trainer gamification achievement:', error);
    } finally {
      awardingAchievementInFlightRef.current = false;
      setAwardingAchievement(false);
    }
  };

  if (loading) {
    return <LoadingWrapper><Spinner /></LoadingWrapper>;
  }

  return (
    <PageContainer>
      <PageTitle>Client Gamification Management</PageTitle>
      <IntroBlock>
        <BodyText>Award points and achievements to motivate assigned clients and keep progression honest.</BodyText>
      </IntroBlock>

      <TabBar role="tablist" aria-label="gamification tabs">
        {[
          { index: 0, label: 'Client Management', Icon: User },
          { index: 1, label: 'Achievement Management', Icon: Trophy },
          { index: 2, label: 'RPG Features', Icon: Sparkles },
        ].map(({ index, label, Icon }) => (
          <TabButton key={label} role="tab" $active={tabValue === index} onClick={() => setTabValue(index)} id={`trainer-gamification-tab-${index}`} aria-controls={`trainer-gamification-tabpanel-${index}`} aria-selected={tabValue === index}>
            <Icon size={16} /> {label}
          </TabButton>
        ))}
      </TabBar>

      <TabPanel value={tabValue} index={0}>
        <HeaderRow>
          <SectionTitle>Client Points Management</SectionTitle>
          <SearchWrapper>
            <SearchIcon><Search size={18} /></SearchIcon>
            <SearchInput placeholder="Search clients..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} data-testid="client-search" />
          </SearchWrapper>
        </HeaderRow>
        <ClientTable
          clients={filteredClients}
          onAwardPoints={(client) => { setSelectedClient(client); setAwardPointsDialog(true); }}
          onAwardAchievement={(client) => { setSelectedClient(client); setAwardAchievementDialog(true); }}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <HeaderRow><SectionTitle>Available Achievements</SectionTitle></HeaderRow>
        <DescriptionText>Achievements credit XP when awarded and should match visible client progress.</DescriptionText>
        <AchievementGrid achievements={achievements} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Suspense fallback={<RpgLoadingState>Loading RPG features...</RpgLoadingState>}>
          {selectedClient?.id ? (
            <RpgPanelStack>
              <SectionTitle>RPG Status: {selectedClient.firstName} {selectedClient.lastName}</SectionTitle>
              <AegisHud userId={selectedClient.id} showMoodlet />
              <RpgUnavailableState>Streak Fortress preview requires live streak-freeze data.</RpgUnavailableState>
              <GhostModeBanner userId={selectedClient.id} />
              <CompanionPet userId={Number(selectedClient.id)} size={150} showControls={false} />
            </RpgPanelStack>
          ) : (
            <RpgUnavailableState>Select a client from Client Management to view their RPG status.</RpgUnavailableState>
          )}
        </Suspense>
      </TabPanel>

      <AwardPointsDialog
        open={awardPointsDialog}
        onClose={closePointsDialog}
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
      <AwardAchievementDialog
        open={awardAchievementDialog}
        onClose={() => { setAwardAchievementDialog(false); setSelectedAchievement(''); }}
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
