/**
 * ============================================================================
 * FILE: admin-client-progress-view.V2.tsx
 * PURPOSE: Admin page for monitoring client progress with Victory charts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows a client list sidebar + stats cards + 8 Victory
 * progress charts (volume, 1RM, form quality, NASM radar, body comp, strength,
 * consistency heatmap, muscle group radar) for the selected client.
 * HOW IT FITS IN THE APP: Admin Dashboard → Clients → Client Progress Tracking
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AdminClientProgressView                          ║
 * ║  PURPOSE: Admin progress monitoring with Victory analytics   ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Client Progress Dashboard              [Assignments] [Refresh]│
 * ├──────────┬─────────────────────────────────────────────────┤
 * │ Clients  │  [Client Progress] [Leaderboard]               │
 * │ [Search] │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
 * │ ● Sean   │  │ Wkts│ │Strk │ │Exer │ │Level│             │
 * │ ○ Jackie │  └─────┘ └─────┘ └─────┘ └─────┘             │
 * │ ○ Anand  │  [XP Progress Bar]                              │
 * │          │  ┌──────────────────────────────────┐           │
 * │          │  │ Victory Charts (8 panels)         │           │
 * │          │  └──────────────────────────────────┘           │
 * └──────────┴─────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';
import { useAuth } from '../../../../context/AuthContext';
import { useTable } from '../../../../hooks/useTable';
import { ClientProgressData, LeaderboardEntry } from '../../../../services/client-progress-service';

import {
  Search, Users, Trophy, UserCheck, RefreshCw,
  ChevronRight
} from 'lucide-react';

import { PageTitle, SectionTitle, BodyText, SmallText, Caption } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox } from '../../../ui-kit/Card';
import { StyledInput } from '../../../ui-kit/Input';
import Table from '../../../ui-kit/Table';
import Pagination from '../../../ui-kit/Pagination';
import Badge from '../../../ui-kit/Badge';
import EmptyState, { LoadingState } from '../../../ui-kit/EmptyState';
import { PageContainer as UIPageContainer, ContentContainer } from '../../../ui-kit/Container';
import ClientProgressCharts from '../../../ClientProgressCharts/ClientProgressCharts';
import { getTier, getTierDisplay } from '../../../../types/gamification';
import { parseAdminProgressClientId } from './admin-client-progress-view.V2.logic';

// ─────────────────────────────────────────────────────────────
// SECTION: Frost Shimmer Skeleton
// ─────────────────────────────────────────────────────────────
const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const ChartSkeleton = styled.div`
  height: 400px;
  border-radius: 16px;
  background: linear-gradient(90deg,
    var(--bg-elevated, #141419) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent) 50%,
    var(--bg-elevated, #141419) 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2.5s infinite linear;
  border: 1px solid var(--border-accent-subtle, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (Crystalline Swan tokens)
// ─────────────────────────────────────────────────────────────
const PageContainer = styled(UIPageContainer)`
  background: var(--bg-base, #030712);
`;

const HeaderCard = styled(Card)`
  background: var(
    --surface-hero-gradient,
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary-dark, #002060) 40%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)
    )
  );
  border-color: var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent));
  margin-bottom: 2rem;
`;

const HeaderTitle = styled(PageTitle)`
  margin-bottom: 0.5rem;
`;

const MutedBodyText = styled(BodyText)`
  color: var(--text-secondary, #8BA8C8);
`;

const SidebarColumn = styled.div`
  grid-column: span 3;
`;

const MainColumn = styled.div`
  grid-column: span 9;
`;

const SectionTitleSpaced = styled(SectionTitle)`
  margin-bottom: 1rem;
`;

const ClientMeta = styled.div`
  flex: 1;
`;

const StrongSmallText = styled(SmallText)<{ $large?: boolean }>`
  font-weight: ${({ $large }) => ($large ? 700 : 600)};
  font-size: ${({ $large }) => ($large ? '1.25rem' : 'inherit')};
  margin-bottom: ${({ $large }) => ($large ? 0 : '0.25rem')};
`;

const MutedCaption = styled(Caption)`
  color: var(--text-secondary, #8BA8C8);
`;

const EmptyClientList = styled.div`
  padding: 2rem;
  text-align: center;
`;

const StatsGrid = styled(GridContainer)`
  margin-bottom: 2rem;
`;

const ProgressSummaryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const StrongBodyText = styled(BodyText)`
  font-weight: 600;
`;

const ProgressSummaryFooter = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
`;

const LeaderboardFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid var(--border-accent-subtle, color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent));
`;

const RefreshIcon = styled(RefreshCw)`
  margin-right: 0.5rem;
`;

const Avatar = styled.div<{ src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ src }) => {
    const safe = src ? sanitizeImageUrl(src) : null;
    return safe
      ? `url(${cssUrlValue(safe)})`
      : 'var(--accent-gradient-primary, linear-gradient(135deg, var(--primary-dark, #002060), var(--accent-secondary, #8B5CF6)))';
  }};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--accent-primary-track, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ value: number; color?: string }>`
  width: ${props => Math.min(props.value, 100)}%;
  height: 100%;
  background: ${props => props.color || 'var(--accent-gradient-primary, linear-gradient(90deg, var(--primary-dark, #002060), var(--accent-secondary, #8B5CF6)))'};
  border-radius: 4px;
  transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
`;

const TabContainer = styled.div`
  border-bottom: 2px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
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
  border-bottom: 3px solid ${props => props.isActive ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  color: ${props => props.isActive ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #8BA8C8)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  top: 2px;
  min-height: 44px;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: var(--accent-primary-hover-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  svg { flex-shrink: 0; }
`;

const TabPanel = styled.div<{ isActive: boolean }>`
  display: ${props => props.isActive ? 'block' : 'none'};
`;

const StatsCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: var(--text-secondary, #8BA8C8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;

  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted, #8BA8C8);
    pointer-events: none;
  }

  input { padding-left: 2.75rem; }
`;

const LeaderboardSearch = styled(SearchContainer)`
  max-width: 300px;
`;

const ClientListContainer = styled(Card)`
  height: 600px;
  display: flex;
  flex-direction: column;
`;

const ClientListHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
`;

const ClientListScroll = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 3%, transparent);
  }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-radius: 3px;
  }
`;

const ClientItem = styled.button<{ $isActive: boolean }>`
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  border-bottom: 1px solid var(--border-accent-subtle, color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent));
  background: ${props => props.$isActive ? 'var(--accent-primary-active-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent))' : 'transparent'};
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
  color: inherit;
  font: inherit;
  min-height: 44px;
  display: block;

  &:hover {
    background: var(--accent-primary-hover-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent));
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

const ChartsSection = styled.div`
  margin-top: 2rem;
  border-radius: 16px;
  overflow: hidden;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  availableSessions: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const AdminClientProgressView: React.FC = () => {
  const { authAxios, services } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientProgress, setClientProgress] = useState<ClientProgressData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  const {
    paginatedData: paginatedLeaderboard,
    currentPage, totalPages, rowsPerPage,
    hasNextPage, hasPrevPage, totalItems,
    searchTerm: leaderboardSearch,
    handleRowsPerPageChange,
    handleSearch: handleLeaderboardSearch,
    goToNextPage, goToPrevPage
  } = useTable<LeaderboardEntry>({
    data: leaderboard,
    initialRowsPerPage: 10,
    searchFields: ['client.firstName', 'client.lastName', 'client.username'],
    initialSortBy: 'overallLevel',
    initialSortOrder: 'desc'
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authAxios.get('/api/auth/clients');
      if (response.data?.success) {
        setClients(response.data.clients);
        if (response.data.clients.length > 0) {
          setSelectedClientId((currentClientId) => currentClientId ?? response.data.clients[0].id);
        }
      } else {
        setClients([]);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const fetchClientProgress = useCallback(async (clientId: string) => {
    try {
      const result = await services.clientProgress.getClientProgressById(clientId);
      if (result?.success) {
        setClientProgress(result.progress);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, [services.clientProgress]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const result = await services.clientProgress.getLeaderboard();
      if (result?.success) {
        setLeaderboard(result.leaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, [services.clientProgress]);

  useEffect(() => {
    fetchClients();
    fetchLeaderboard();
  }, [fetchClients, fetchLeaderboard]);

  const filteredClients = clients.filter(client => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const username = client.username.toLowerCase();
    const search = clientSearchTerm.toLowerCase();
    return fullName.includes(search) || username.includes(search);
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientChartId = parseAdminProgressClientId(selectedClientId);

  useEffect(() => {
    if (selectedClientChartId) {
      fetchClientProgress(String(selectedClientChartId));
    } else {
      setClientProgress(null);
    }
  }, [selectedClientChartId, fetchClientProgress]);

  if (loading) {
    return (
      <PageContainer>
        <ContentContainer>
          <LoadingState message="Loading client progress data..." />
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer>
        {/* Header */}
        <HeaderCard>
          <CardBody padding="1.5rem">
            <FlexBox justify="space-between" align="center">
              <div>
                <HeaderTitle>Client Progress Dashboard</HeaderTitle>
                <MutedBodyText>
                  Monitor and manage client progression through the NASM protocol system
                </MutedBodyText>
              </div>
              <FlexBox gap="0.75rem">
                <OutlinedButton onClick={() => window.location.href = '/dashboard/client-trainer-assignments'}>
                  <Users size={18} />
                  Manage Assignments
                </OutlinedButton>
                <PrimaryButton onClick={() => { fetchClients(); fetchLeaderboard(); }}>
                  <RefreshCw size={18} />
                  Refresh Data
                </PrimaryButton>
              </FlexBox>
            </FlexBox>
          </CardBody>
        </HeaderCard>

        {/* Tabs */}
        <TabContainer>
          <TabList role="tablist">
            <TabButton
              isActive={tabValue === 0}
              onClick={() => setTabValue(0)}
              role="tab"
              aria-selected={tabValue === 0}
            >
              <UserCheck size={18} />
              Client Progress
            </TabButton>
            <TabButton
              isActive={tabValue === 1}
              onClick={() => setTabValue(1)}
              role="tab"
              aria-selected={tabValue === 1}
            >
              <Trophy size={18} />
              Leaderboard
            </TabButton>
          </TabList>
        </TabContainer>

        {/* Client Progress Tab */}
        <TabPanel isActive={tabValue === 0} role="tabpanel">
          <GridContainer columns={12} gap="1.5rem">
            {/* Client List Sidebar */}
            <SidebarColumn>
              <ClientListContainer>
                <ClientListHeader>
                  <SectionTitleSpaced>Clients</SectionTitleSpaced>
                  <SearchContainer>
                    <Search size={18} />
                    <StyledInput
                      placeholder="Search clients..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                    />
                  </SearchContainer>
                </ClientListHeader>
                <ClientListScroll>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <ClientItem
                        key={client.id}
                        $isActive={selectedClientId === client.id}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <FlexBox align="center" gap="0.75rem">
                          <Avatar>
                            {client.firstName[0]}{client.lastName[0]}
                          </Avatar>
                          <ClientMeta>
                            <StrongSmallText>
                              {client.firstName} {client.lastName}
                            </StrongSmallText>
                            <MutedCaption>
                              @{client.username}
                            </MutedCaption>
                          </ClientMeta>
                        </FlexBox>
                      </ClientItem>
                    ))
                  ) : (
                    <EmptyClientList>
                      <MutedBodyText>
                        No clients found
                      </MutedBodyText>
                    </EmptyClientList>
                  )}
                </ClientListScroll>
              </ClientListContainer>
            </SidebarColumn>

            {/* Progress Details + Victory Charts */}
            <MainColumn>
              {clientProgress && selectedClient && selectedClientChartId ? (
                <div>
                  {/* Stats Cards */}
                  <Card>
                    <CardHeader>
                      <SectionTitle>
                        {selectedClient.firstName} {selectedClient.lastName}&apos;s Progress
                      </SectionTitle>
                    </CardHeader>
                    <CardBody>
                      <StatsGrid columns={4} gap="1.5rem">
                        <StatsCard>
                          <CardBody>
                            <StatValue>{clientProgress.workoutsCompleted}</StatValue>
                            <StatLabel>Workouts</StatLabel>
                          </CardBody>
                        </StatsCard>
                        <StatsCard>
                          <CardBody>
                            <StatValue>{clientProgress.streakDays}</StatValue>
                            <StatLabel>Day Streak</StatLabel>
                          </CardBody>
                        </StatsCard>
                        <StatsCard>
                          <CardBody>
                            <StatValue>{clientProgress.totalExercisesPerformed}</StatValue>
                            <StatLabel>Exercises</StatLabel>
                          </CardBody>
                        </StatsCard>
                        <StatsCard>
                          <CardBody>
                            <StatValue>{clientProgress.overallLevel}</StatValue>
                            <StatLabel>Level</StatLabel>
                          </CardBody>
                        </StatsCard>
                      </StatsGrid>

                      <div>
                        <ProgressSummaryHeader>
                          <StrongBodyText>Overall Progress</StrongBodyText>
                          <Badge variant="primary">{getLevelName(clientProgress.overallLevel)}</Badge>
                        </ProgressSummaryHeader>
                        <ProgressBarContainer>
                          <ProgressBar>
                            <ProgressFill value={clientProgress.experiencePoints} />
                          </ProgressBar>
                          <ProgressSummaryFooter>
                            <MutedCaption>
                              {clientProgress.experiencePoints} XP
                            </MutedCaption>
                            <MutedCaption>
                              Next Level: {clientProgress.overallLevel + 1}
                            </MutedCaption>
                          </ProgressSummaryFooter>
                        </ProgressBarContainer>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Victory Charts Section */}
                  <ChartsSection>
                    <Suspense fallback={<ChartSkeleton role="status" aria-live="polite" aria-label="Loading charts" />}>
                      <ClientProgressCharts
                        clientId={selectedClientChartId}
                        isTrainerView={true}
                        showControls={true}
                        defaultTimeRange="30d"
                      />
                    </Suspense>
                  </ChartsSection>
                </div>
              ) : (
                <Card>
                  <CardBody>
                    <EmptyState
                      icon={<UserCheck size={48} />}
                      title="Select a client"
                      message="Choose a client from the list to view their detailed progress"
                      variant="minimal"
                    />
                  </CardBody>
                </Card>
              )}
            </MainColumn>
          </GridContainer>
        </TabPanel>

        {/* Leaderboard Tab */}
        <TabPanel isActive={tabValue === 1} role="tabpanel">
          <Card>
            <CardHeader>
              <FlexBox justify="space-between" align="center">
                <SectionTitle>Client Progress Leaderboard</SectionTitle>
                <LeaderboardSearch>
                  <Search size={18} />
                  <StyledInput
                    placeholder="Search leaderboard..."
                    value={leaderboardSearch}
                    onChange={(e) => handleLeaderboardSearch(e.target.value)}
                  />
                </LeaderboardSearch>
              </FlexBox>
            </CardHeader>
            <CardBody padding="0">
              {paginatedLeaderboard.length > 0 ? (
                <>
                  <Table variant="default">
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Rank</Table.Head>
                        <Table.Head>Client</Table.Head>
                        <Table.Head>Level</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head align="right">Actions</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {paginatedLeaderboard.map((entry, index) => (
                        <Table.Row key={entry.userId}>
                          <Table.Cell>
                            <StrongSmallText as="span" $large>
                              #{((currentPage - 1) * rowsPerPage) + index + 1}
                            </StrongSmallText>
                          </Table.Cell>
                          <Table.Cell>
                            <FlexBox align="center" gap="0.75rem">
                              <Avatar>
                                {entry.client?.firstName?.[0]}{entry.client?.lastName?.[0]}
                              </Avatar>
                              <div>
                                <StrongSmallText>
                                  {entry.client?.firstName} {entry.client?.lastName}
                                </StrongSmallText>
                                <MutedCaption>
                                  @{entry.client?.username}
                                </MutedCaption>
                              </div>
                            </FlexBox>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="primary">Level {entry.overallLevel}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={getProgressStatus(entry.overallLevel)}>
                              {entry.overallLevel > 40 ? 'Advanced' :
                               entry.overallLevel > 20 ? 'Intermediate' : 'Beginner'}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell align="right">
                            <OutlinedButton
                              onClick={() => {
                                setSelectedClientId(entry.userId);
                                setTabValue(0);
                              }}
                            >
                              View Profile
                              <ChevronRight size={16} />
                            </OutlinedButton>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>

                  <LeaderboardFooter>
                    <FlexBox justify="space-between" align="center">
                      <MutedCaption as="span">
                        Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems} clients
                      </MutedCaption>

                      <Pagination>
                        <Pagination.PrevButton
                          onClick={goToPrevPage}
                          disabled={!hasPrevPage}
                        />
                        <Pagination.PageNumber>
                          Page {currentPage} of {totalPages}
                        </Pagination.PageNumber>
                        <Pagination.NextButton
                          onClick={goToNextPage}
                          disabled={!hasNextPage}
                        />
                        <Pagination.PageSizeSelector
                          value={rowsPerPage}
                          onChange={handleRowsPerPageChange}
                          options={[5, 10, 25, 50]}
                        />
                      </Pagination>
                    </FlexBox>
                  </LeaderboardFooter>
                </>
              ) : (
                <EmptyState
                  icon={<Trophy size={48} />}
                  title="No leaderboard data"
                  message="Client progress data will appear here once workouts are completed"
                  action={
                    <PrimaryButton onClick={fetchLeaderboard}>
                      <RefreshIcon size={16} />
                      Refresh Leaderboard
                    </PrimaryButton>
                  }
                />
              )}
            </CardBody>
          </Card>
        </TabPanel>
      </ContentContainer>
    </PageContainer>
  );
};

export default AdminClientProgressView;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────
const getLevelName = (level: number): string => getTierDisplay(getTier(level)).name;

const getProgressStatus = (level: number): 'success' | 'info' | 'default' => {
  if (level > 40) return 'success';
  if (level > 20) return 'info';
  return 'default';
};
