import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { Activity, Calendar, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useClientProgress, ProgressMeasurement } from '../../UniversalMasterSchedule/hooks/useClientProgress';
import theme from '../../../theme/tokens';

const Page = styled.div`
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${theme.typography.scale['2xl']};
  font-weight: ${theme.typography.weight.bold};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  max-width: 720px;
  line-height: 1.6;
`;

const SelectorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

const Input = styled.input`
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  color: ${theme.colors.text.primary};
  min-width: 220px;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.6);
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border: none;
  color: #0a0a1a;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  font-weight: ${theme.typography.weight.semibold};
  cursor: pointer;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: ${theme.spacing.md};
`;

const Card = styled.div`
  background: rgba(12, 14, 24, 0.75);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 16px;
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CardLabel = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.scale.sm};
`;

const CardValue = styled.div`
  font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.brand.cyan};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.brand.cyan};
  font-weight: ${theme.typography.weight.semibold};
`;

const EmptyState = styled.div`
  padding: ${theme.spacing.lg};
  border-radius: 16px;
  border: 1px dashed rgba(0, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.5);
  color: ${theme.colors.text.secondary};
`;

const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const GoalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.scale.sm};
`;

const GoalBar = styled.div`
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 255, 255, 0.15);
  overflow: hidden;
`;

const GoalFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${(props) => Math.min(100, Math.max(0, props.$progress))}%;
  background: linear-gradient(90deg, #00ffff, #7851a9);
`;

const MeasurementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const MeasurementRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(120, 81, 169, 0.1);
`;

const MeasurementDate = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.scale.sm};
`;

const MeasurementValue = styled.div`
  color: ${theme.colors.brand.cyan};
  font-weight: ${theme.typography.weight.semibold};
`;

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

const buildSparklinePath = (points: number[], width: number, height: number) => {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const Sparkline: React.FC<{ measurements: ProgressMeasurement[] }> = ({ measurements }) => {
  const points = measurements
    .map((measurement) => measurement.weight)
    .filter((value): value is number => typeof value === 'number');

  const path = useMemo(() => buildSparklinePath(points, 240, 80), [points]);

  if (points.length < 2) {
    return <EmptyState>No weight trend data yet.</EmptyState>;
  }

  return (
    <svg width="100%" height="90" viewBox="0 0 240 90" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#00ffff" strokeWidth="3" />
    </svg>
  );
};

const ClientProgressView: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';
  const [clientIdInput, setClientIdInput] = useState(initialClientId);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(() => {
    const parsed = Number(initialClientId);
    return Number.isFinite(parsed) ? parsed : undefined;
  });

  const resolvedClientId = user?.role === 'client' ? user?.id : selectedClientId;
  const { data, isLoading, error } = useClientProgress(resolvedClientId);

  const handleLoadClient = () => {
    const parsed = Number(clientIdInput);
    if (!Number.isFinite(parsed)) return;
    setSelectedClientId(parsed);
    setSearchParams(parsed ? { clientId: String(parsed) } : {});
  };

  const showSelector = user?.role !== 'client';

  return (
    <Page>
      <Header>
        <Title>Client Progress</Title>
        <Subtitle>
          Review client progress, NASM scores, and recent measurements. Trainers and admins can
          load any assigned client by ID.
        </Subtitle>
      </Header>

      {showSelector && (
        <SelectorRow>
          <Input
            type="number"
            placeholder="Enter client ID"
            value={clientIdInput}
            onChange={(event) => setClientIdInput(event.target.value)}
          />
          <Button type="button" onClick={handleLoadClient}>
            Load Client
          </Button>
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
        <EmptyState>{String(error)}</EmptyState>
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
              <Sparkline measurements={data.recentMeasurements} />
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
                    const progress =
                      goal.target && goal.current
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
        </>
      )}
    </Page>
  );
};

export default ClientProgressView;
