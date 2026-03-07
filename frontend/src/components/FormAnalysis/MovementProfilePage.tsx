/**
 * MovementProfilePage — Movement Quality Dashboard
 * ==================================================
 * Phase 5: Long-term tracking of movement quality.
 *
 * Sections:
 * 1. Mobility Radar Chart (per-joint scores on canvas)
 * 2. Left/Right Balance Bars
 * 3. Common Compensations Summary
 * 4. Improvement Timeline (sparkline)
 * 5. Exercise Scores Grid
 * 6. NASM Phase Recommendation
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI';
import { getScoreColor, getScoreGrade } from './constants';
import MobilityRadar from './MobilityRadar';

interface MovementProfile {
  mobilityScores: Record<string, number>;
  strengthBalance: Record<string, { left: number; right: number }>;
  commonCompensations: Array<{
    type: string;
    frequency: number;
    avgSeverity: number;
    trend: string;
    lastDetected?: string;
  }>;
  improvementTrend: Array<{
    date: string;
    avgScore: number;
    exerciseName?: string;
    compensationCount?: number;
  }>;
  exerciseScores: Record<string, { avg: number; count: number; trend: string }>;
  nasmPhaseRecommendation: number | null;
  totalAnalyses: number;
}

// --- Styled Components ---

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #E0ECF4;
  padding: 20px;
  padding-bottom: 40px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
`;

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 600px;
  margin: 0 auto;
`;

const Card = styled(motion.div)`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 20px;
  padding: 20px;
`;

const CardTitle = styled.h2`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(224, 236, 244, 0.5);
  margin: 0 0 16px;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 12px;
  margin-bottom: 8px;
`;

const StatBlock = styled.div`
  text-align: center;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 28px;
  font-weight: 800;
  color: ${({ $color }) => $color || '#E0ECF4'};
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 2px;
`;

const BalanceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const BalanceLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.6);
  width: 80px;
  text-align: right;
  text-transform: capitalize;
`;

const BarContainer = styled.div`
  flex: 1;
  display: flex;
  gap: 2px;
  height: 20px;
  align-items: center;
`;

const BarHalf = styled.div<{ $width: number; $side: 'left' | 'right'; $imbalanced: boolean }>`
  height: 100%;
  border-radius: ${({ $side }) => $side === 'left' ? '8px 0 0 8px' : '0 8px 8px 0'};
  background: ${({ $imbalanced }) => $imbalanced
    ? 'rgba(255, 184, 0, 0.3)'
    : 'rgba(96, 192, 240, 0.2)'};
  width: ${({ $width }) => $width}%;
  min-width: 2px;
  transition: width 0.5s ease;
`;

const BarDivider = styled.div`
  width: 2px;
  height: 100%;
  background: rgba(224, 236, 244, 0.2);
`;

const BalanceValue = styled.span<{ $imbalanced: boolean }>`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $imbalanced }) => $imbalanced ? '#FFB800' : 'rgba(224, 236, 244, 0.5)'};
  width: 30px;
`;

const CompensationItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.3);
`;

const CompName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #E0ECF4;
  text-transform: capitalize;
`;

const CompMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TrendBadge = styled.span<{ $trend: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ $trend }) =>
    $trend === 'improving' ? '#00FF88' :
    $trend === 'declining' ? '#FF4757' :
    'rgba(224, 236, 244, 0.5)'};
  background: ${({ $trend }) =>
    $trend === 'improving' ? 'rgba(0, 255, 136, 0.1)' :
    $trend === 'declining' ? 'rgba(255, 71, 87, 0.1)' :
    'rgba(224, 236, 244, 0.05)'};
`;

const FreqBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: rgba(224, 236, 244, 0.4);
  font-variant-numeric: tabular-nums;
`;

const ExerciseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;

const ExerciseCard = styled.div`
  background: rgba(0, 32, 96, 0.3);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
`;

const ExName = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  margin: 0 0 4px;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExScore = styled.p<{ $color: string }>`
  font-size: 24px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  margin: 0;
  font-variant-numeric: tabular-nums;
`;

const ExMeta = styled.p`
  font-size: 10px;
  color: rgba(224, 236, 244, 0.3);
  margin: 2px 0 0;
`;

const PhaseCard = styled(Card)`
  text-align: center;
`;

const PhaseNumber = styled.div`
  font-size: 56px;
  font-weight: 800;
  color: #60C0F0;
  line-height: 1;
`;

const PhaseName = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  margin: 4px 0 0;
`;

const TimelineContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
  padding: 0 4px;
`;

const TimelineBar = styled.div<{ $height: number; $color: string }>`
  flex: 1;
  min-width: 4px;
  max-width: 12px;
  height: ${({ $height }) => $height}%;
  background: ${({ $color }) => $color};
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: rgba(224, 236, 244, 0.5);
`;

const LoadingText = styled.p`
  text-align: center;
  color: rgba(224, 236, 244, 0.4);
  font-size: 14px;
  padding: 48px;
`;

const NASM_PHASES: Record<number, string> = {
  1: 'Stabilization Endurance',
  2: 'Strength Endurance',
  3: 'Muscular Development',
  4: 'Maximal Strength',
  5: 'Power',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const MovementProfilePage: React.FC<{ userId?: number }> = ({ userId }) => {
  const { fetchProfile } = useFormAnalysisAPI();
  const [profile, setProfile] = useState<MovementProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await fetchProfile(userId);
      setProfile(data as MovementProfile | null);
      setIsLoading(false);
    })();
  }, [fetchProfile, userId]);

  if (isLoading) return <Page><LoadingText>Loading movement profile...</LoadingText></Page>;

  if (!profile) {
    return (
      <Page>
        <EmptyState>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#E0ECF4', marginBottom: 8 }}>
            No Movement Profile Yet
          </p>
          <p style={{ fontSize: 13 }}>
            Complete a form analysis to start building your movement profile.
          </p>
        </EmptyState>
      </Page>
    );
  }

  const mobilityEntries = Object.entries(profile.mobilityScores || {});
  const balanceEntries = Object.entries(profile.strengthBalance || {});
  const compensations = profile.commonCompensations || [];
  const timeline = profile.improvementTrend || [];
  const exercises = Object.entries(profile.exerciseScores || {});
  const phase = profile.nasmPhaseRecommendation;

  return (
    <Page>
      <Header>
        <Title>Movement Profile</Title>
        <Subtitle>{profile.totalAnalyses} analyses completed</Subtitle>
      </Header>

      <Grid>
        {/* NASM Phase */}
        {phase && (
          <PhaseCard variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0 }}>
            <CardTitle>NASM OPT Phase</CardTitle>
            <PhaseNumber>{phase}</PhaseNumber>
            <PhaseName>{NASM_PHASES[phase] || `Phase ${phase}`}</PhaseName>
          </PhaseCard>
        )}

        {/* Mobility Radar */}
        {mobilityEntries.length > 0 && (
          <Card variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
            <CardTitle>Mobility Scores</CardTitle>
            <MobilityRadar scores={profile.mobilityScores} />
          </Card>
        )}

        {/* Left/Right Balance */}
        {balanceEntries.length > 0 && (
          <Card variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <CardTitle>Left / Right Balance</CardTitle>
            {balanceEntries.map(([key, val]) => {
              const total = val.left + val.right || 1;
              const leftPct = (val.left / total) * 100;
              const rightPct = (val.right / total) * 100;
              const imbalanced = Math.abs(leftPct - rightPct) > 15;
              return (
                <BalanceRow key={key}>
                  <BalanceValue $imbalanced={imbalanced}>{val.left.toFixed(0)}</BalanceValue>
                  <BarContainer>
                    <BarHalf $width={leftPct} $side="left" $imbalanced={imbalanced} />
                    <BarDivider />
                    <BarHalf $width={rightPct} $side="right" $imbalanced={imbalanced} />
                  </BarContainer>
                  <BalanceValue $imbalanced={imbalanced}>{val.right.toFixed(0)}</BalanceValue>
                  <BalanceLabel>{key.replace(/([A-Z])/g, ' $1').trim()}</BalanceLabel>
                </BalanceRow>
              );
            })}
          </Card>
        )}

        {/* Common Compensations */}
        {compensations.length > 0 && (
          <Card variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
            <CardTitle>Common Compensations</CardTitle>
            {compensations.map((comp, i) => (
              <CompensationItem key={i}>
                <CompName>{comp.type.replace(/_/g, ' ')}</CompName>
                <CompMeta>
                  <FreqBadge>{comp.frequency}x</FreqBadge>
                  <TrendBadge $trend={comp.trend}>{comp.trend}</TrendBadge>
                </CompMeta>
              </CompensationItem>
            ))}
          </Card>
        )}

        {/* Improvement Timeline */}
        {timeline.length > 0 && (
          <Card variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <CardTitle>Score Trend</CardTitle>
            <StatRow>
              <StatBlock>
                <StatValue $color={getScoreColor(timeline[timeline.length - 1]?.avgScore || 0)}>
                  {timeline[timeline.length - 1]?.avgScore?.toFixed(0) || '--'}
                </StatValue>
                <StatLabel>Latest</StatLabel>
              </StatBlock>
              <StatBlock>
                <StatValue>
                  {(timeline.reduce((sum, t) => sum + (t.avgScore || 0), 0) / timeline.length).toFixed(0)}
                </StatValue>
                <StatLabel>Average</StatLabel>
              </StatBlock>
              <StatBlock>
                <StatValue $color="#00FF88">
                  {Math.max(...timeline.map(t => t.avgScore || 0)).toFixed(0)}
                </StatValue>
                <StatLabel>Best</StatLabel>
              </StatBlock>
            </StatRow>
            <TimelineContainer>
              {timeline.slice(-30).map((point, i) => (
                <TimelineBar
                  key={i}
                  $height={point.avgScore || 0}
                  $color={getScoreColor(point.avgScore || 0)}
                />
              ))}
            </TimelineContainer>
          </Card>
        )}

        {/* Exercise Scores */}
        {exercises.length > 0 && (
          <Card variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
            <CardTitle>Exercise Scores</CardTitle>
            <ExerciseGrid>
              {exercises.map(([name, data]) => {
                const color = getScoreColor(data.avg);
                return (
                  <ExerciseCard key={name}>
                    <ExName>{name.replace(/_/g, ' ')}</ExName>
                    <ExScore $color={color}>{data.avg.toFixed(0)}</ExScore>
                    <ExMeta>
                      {data.count} analyses
                      {data.trend && (
                        <TrendBadge $trend={data.trend} style={{ marginLeft: 4 }}>
                          {data.trend}
                        </TrendBadge>
                      )}
                    </ExMeta>
                  </ExerciseCard>
                );
              })}
            </ExerciseGrid>
          </Card>
        )}
      </Grid>
    </Page>
  );
};

export default MovementProfilePage;
