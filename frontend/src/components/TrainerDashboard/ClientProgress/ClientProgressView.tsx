import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Calendar, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import { useClientProgress } from '../../UniversalMasterSchedule/hooks/useClientProgress';
import ClientProgressCharts from '../../ClientProgressCharts/ClientProgressCharts';
import ClientAnalyticsPanel from '../../ClientProgressCharts/ClientAnalyticsPanel';
import { parseClientProgressId } from './ClientProgressView.logic';
import ClientProgressSparkline from './ClientProgressSparkline';
import {
  Card,
  CardGrid,
  CardLabel,
  CardValue,
  ClientSelect,
  EmptyState,
  GoalBar,
  GoalFill,
  GoalHeader,
  GoalList,
  GoalRow,
  Header,
  MeasurementDate,
  MeasurementList,
  MeasurementRow,
  MeasurementValue,
  Page,
  Section,
  SectionTitle,
  SelectorRow,
  Subtitle,
  Title,
} from './ClientProgressView.styles';

const formatNumber = (value: number | null, digits = 1) => {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(digits);
};

const formatDate = (value: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const ClientProgressView: React.FC = () => {
  const { user } = useAuth();
  const { activeClient, clientList, loadingClients, setActiveClient } = useGlobalClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(
    () => parseClientProgressId(initialClientId) ?? undefined
  );

  // Auto-load client when global active client changes while avoiding duplicate history entries.
  useEffect(() => {
    const activeClientId = parseClientProgressId(activeClient?.id);
    if (activeClientId && user?.role !== 'client') {
      const currentClientId = searchParams.get('clientId');
      const newClientId = String(activeClientId);
      if (currentClientId !== newClientId) {
        setSelectedClientId(activeClientId);
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('clientId', newClientId);
          return next;
        }, { replace: true });
      }
    }
  }, [activeClient?.id, user?.role, searchParams, setSearchParams]);

  const resolvedClientId = user?.role === 'client'
    ? parseClientProgressId(user?.id) ?? undefined
    : selectedClientId;
  const { data, isLoading, error } = useClientProgress(resolvedClientId, true);

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseClientProgressId(e.target.value);
    if (!id) {
      setSelectedClientId(undefined);
      setSearchParams({});
      return;
    }

    setSelectedClientId(id);
    setSearchParams({ clientId: String(id) });
    const client = clientList.find(c => parseClientProgressId(c.id) === id);
    if (client) setActiveClient(client);
  };

  const showSelector = user?.role !== 'client';

  return (
    <Page>
      <Header>
        <Title>Client Progress</Title>
        <Subtitle>
          Review client progress, NASM scores, and recent measurements. Select a client below
          to view their training analytics.
        </Subtitle>
      </Header>

      {showSelector && (
        <SelectorRow>
          <ClientSelect
            value={selectedClientId || ''}
            onChange={handleClientSelect}
            aria-label="Select a client to view progress"
          >
            <option value="">
              {loadingClients ? 'Loading clients...' : 'Select a Client'}
            </option>
            {clientList.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </ClientSelect>
        </SelectorRow>
      )}

      {!resolvedClientId && (
        <EmptyState>
          Select a client to view progress details.
        </EmptyState>
      )}

      {resolvedClientId && isLoading && (
        <EmptyState>Loading progress data...</EmptyState>
      )}

      {resolvedClientId && error && (
        <EmptyState>
          {error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred loading progress.'}
        </EmptyState>
      )}

      {resolvedClientId && data && (
        <>
          <CardGrid>
            <Card>
              <CardLabel>Current Weight</CardLabel>
              <CardValue>{formatNumber(data.currentWeight)} lbs</CardValue>
            </Card>
            <Card>
              <CardLabel>Weight Change</CardLabel>
              <CardValue>{formatNumber(data.weightChange)} lbs</CardValue>
            </Card>
            <Card>
              <CardLabel>NASM Score</CardLabel>
              <CardValue>{formatNumber(data.nasmScore)}</CardValue>
            </Card>
            <Card>
              <CardLabel>Sessions Completed</CardLabel>
              <CardValue>{data.sessionsCompleted}</CardValue>
            </Card>
            <Card>
              <CardLabel>Last Session</CardLabel>
              <CardValue>{formatDate(data.lastSessionDate)}</CardValue>
            </Card>
          </CardGrid>

          <Section>
            <SectionTitle>
              <TrendingUp size={18} /> Weight Trend
            </SectionTitle>
            <Card>
              <ClientProgressSparkline measurements={data.recentMeasurements} />
            </Card>
          </Section>

          <Section>
            <SectionTitle>
              <Target size={18} /> Goal Tracking
            </SectionTitle>
            {data.goals?.length ? (
              <Card>
                <GoalList>
                  {data.goals.map((goal) => {
                    const progress = goal.target && goal.current
                      ? (goal.current / goal.target) * 100
                      : 0;
                    return (
                      <GoalRow key={goal.name}>
                        <GoalHeader>
                          <span>{goal.name}</span>
                          <span>
                            {goal.current ?? 'N/A'} / {goal.target ?? 'N/A'} {goal.unit || ''}
                          </span>
                        </GoalHeader>
                        <GoalBar>
                          <GoalFill $progress={progress} />
                        </GoalBar>
                      </GoalRow>
                    );
                  })}
                </GoalList>
              </Card>
            ) : (
              <EmptyState>No goals tracked yet.</EmptyState>
            )}
          </Section>

          <Section>
            <SectionTitle>
              <Activity size={18} /> Recent Measurements
            </SectionTitle>
            {data.recentMeasurements?.length ? (
              <Card>
                <MeasurementList>
                  {data.recentMeasurements.map((measurement) => (
                    <MeasurementRow key={measurement.date}>
                      <MeasurementDate>{formatDate(measurement.date)}</MeasurementDate>
                      <MeasurementValue>
                        {measurement.weight ?? 'N/A'} lbs
                        {measurement.bodyFat ? ` | ${measurement.bodyFat}%` : ''}
                      </MeasurementValue>
                    </MeasurementRow>
                  ))}
                </MeasurementList>
              </Card>
            ) : (
              <EmptyState>No measurements logged yet.</EmptyState>
            )}
          </Section>

          <Section>
            <SectionTitle>
              <Calendar size={18} /> Summary
            </SectionTitle>
            <EmptyState>
              Use this view to track progress between sessions and keep clients aligned with
              their NASM assessments.
            </EmptyState>
          </Section>

          {resolvedClientId && (
            <ClientAnalyticsPanel userId={resolvedClientId} />
          )}

          <ClientProgressCharts
            clientId={resolvedClientId}
            isTrainerView={true}
            showControls={true}
            defaultTimeRange="30d"
          />
        </>
      )}
    </Page>
  );
};

export default ClientProgressView;
