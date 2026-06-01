import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  Shield,
  ChevronDown,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

import { useAuth } from '../../../../context/AuthContext';
import { logger } from '@/utils/logger';

// Import proper type definitions
import type { InjuryRiskAssessmentProps } from './types';
import type {
  CorrectiveExercise,
  CriticalAlert,
  InjuryRiskData,
  RecommendationCategory,
  RiskFinding,
} from '../../../../services/enhanced-progress-analytics-service';

/* ─── styled-components (Crystalline Swan theme) ─── */

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const GlassPanel = styled.div`
  padding: 24px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const FlexBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Heading6 = styled.h6`
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Heading3 = styled.h3<{ $color?: string }>`
  margin: 0 0 8px 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#e2e8f0'};
`;

const Subtitle = styled.p`
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #e2e8f0;
`;

const SecondaryText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #94a3b8;
`;

const CaptionText = styled.span`
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
  display: block;
`;

const MediumText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const RiskChip = styled.span<{ $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: ${({ $bgColor }) => $bgColor};
  white-space: nowrap;
`;

const SmallRiskChip = styled.span<{ $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  background: ${({ $bgColor }) => $bgColor};
  white-space: nowrap;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const GridThreeCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => Math.max(0, Math.min(Number.isFinite($width) ? $width : 0, 100))}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

const AlertBox = styled.div`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
`;

const AccordionWrapper = styled.details`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;

  &[open] > summary svg.chevron-icon {
    transform: rotate(180deg);
  }
`;

const AccordionSummaryStyled = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 44px;
  list-style: none;
  user-select: none;
  color: #e2e8f0;

  &::-webkit-details-marker {
    display: none;
  }

  &::marker {
    display: none;
    content: '';
  }
`;

const AccordionContent = styled.div`
  padding: 0 16px 16px;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const TableHead = styled.thead`
  th {
    padding: 8px 12px;
    text-align: left;
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.8rem;
    border-bottom: 1px solid rgba(14, 165, 233, 0.2);
    white-space: nowrap;
  }
`;

const TableBody = styled.tbody`
  td {
    padding: 8px 12px;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const ProtocolCard = styled.div<{ $bgColor: string }>`
  background: ${({ $bgColor }) => $bgColor};
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 10px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ProtocolHeading = styled.h6<{ $color: string }>`
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledListItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  min-height: 36px;
  color: #e2e8f0;
  font-size: 0.875rem;
`;

const ListItemPrimary = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  display: block;
`;

const ListItemSecondary = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
  display: block;
  margin-top: 2px;
`;

const RecommendationCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 10px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const RecommendationHeading = styled.h6`
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #60C0F0;
`;

const CenterBox = styled.div`
  text-align: center;
`;

const CategoryBlock = styled.div`
  margin-bottom: 16px;
`;

const ChevronIcon = styled(ChevronDown)`
  transition: transform 0.2s ease;
  flex-shrink: 0;
`;

const SummaryLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
`;

const EmptyState = styled.div`
  min-height: 132px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px dashed rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
`;

const criticalAlertKey = (alert: CriticalAlert): string => [
  alert.severity,
  alert.title,
  alert.timeframe,
  alert.action,
].join('|');

const findingRowKey = (finding: RiskFinding): string => [
  finding.pattern,
  finding.status,
  finding.notes,
  finding.recommendation,
].join('|');

const correctiveProtocolItemKey = (phase: string, item: CorrectiveExercise): string => [
  phase,
  item.muscle,
  item.exercise,
  item.duration || item.reps || '',
  item.frequency,
].join('|');

const recommendationCategoryKey = (category: RecommendationCategory): string => category.category;

const recommendationItemKey = (category: RecommendationCategory, item: string): string => [
  category.category,
  item,
].join('|');

/* ─── Component ─── */

/**
 * InjuryRiskAssessment Component
 *
 * Advanced injury risk analysis for trainers including:
 * - Movement pattern analysis
 * - Muscular imbalance detection
 * - Recovery adequacy assessment
 * - Progression rate evaluation
 * - NASM-based corrective recommendations
 */
const InjuryRiskAssessment: React.FC<InjuryRiskAssessmentProps> = ({
  clientId,
  clientData,
  workoutHistory
}) => {
  const [riskAssessment, setRiskAssessment] = useState<InjuryRiskData | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const { authAxios } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!clientData || !clientId || !authAxios) {
      setRiskAssessment(null);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingRisk(true);
    setRiskError(null);

    authAxios.get(`/api/client-progress/${clientId}/risk-assessment`)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data ?? response.data;
        setRiskAssessment(payload && Array.isArray(payload.categories) ? payload : null);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn('[InjuryRiskAssessment] Failed to load injury risk assessment:', error);
        setRiskAssessment(null);
        setRiskError('Injury risk assessment is unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRisk(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientData, clientId, workoutHistory.length]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#FF6B6B';
      default: return '#A0A0A0';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle size={16} color="#4CAF50" />;
      case 'attention': return <Info size={16} color="#FFC107" />;
      case 'caution': return <AlertTriangle size={16} color="#FF6B6B" />;
      default: return <XCircle size={16} color="#A0A0A0" />;
    }
  };

  const renderRiskState = () => {
    if (isLoadingRisk) {
      return (
        <GlassPanel>
          <EmptyState>
            <Heading6>Loading Injury Risk Assessment</Heading6>
            <SecondaryText>Reading saved pain entries, progress levels, and workout sessions.</SecondaryText>
          </EmptyState>
        </GlassPanel>
      );
    }

    if (riskError) {
      return (
        <GlassPanel>
          <EmptyState>
            <Heading6>Risk Assessment Unavailable</Heading6>
            <SecondaryText>{riskError}</SecondaryText>
          </EmptyState>
        </GlassPanel>
      );
    }

    if (!riskAssessment || riskAssessment.categories.length === 0) {
      return (
        <GlassPanel>
          <EmptyState>
            <Heading6>No Injury Risk Evidence Yet</Heading6>
            <SecondaryText>Log pain entries, client progress levels, or completed workouts to build this assessment.</SecondaryText>
          </EmptyState>
        </GlassPanel>
      );
    }

    return null;
  };

  const renderOverallRisk = () => {
    if (!riskAssessment || riskAssessment.categories.length === 0) return null;

    return (
      <GlassPanel>
        <FlexBetween style={{ marginBottom: 24 }}>
          <FlexRow>
            <Shield color="#60C0F0" size={24} style={{ marginRight: 12 }} />
            <Heading6 style={{ marginBottom: 0 }}>Injury Risk Assessment</Heading6>
          </FlexRow>

          <RiskChip $bgColor={getRiskColor(riskAssessment.overallRisk)}>
            {riskAssessment.overallRisk.toUpperCase()} RISK
          </RiskChip>
        </FlexBetween>

        <GridContainer>
          <CenterBox>
            <Heading3 $color={getRiskColor(riskAssessment.overallRisk)}>
              {riskAssessment.riskScore}
            </Heading3>
            <BodyText>
              Overall Risk Score
            </BodyText>
            <CaptionText>
              Last assessed: {new Date(riskAssessment.lastAssessment).toLocaleDateString()}
            </CaptionText>
          </CenterBox>

          <div>
            <Subtitle>
              Risk Categories
            </Subtitle>

            {riskAssessment.categories.map((category) => (
              <CategoryBlock key={category.id}>
                <FlexBetween style={{ marginBottom: 6 }}>
                  <BodyText>{category.name}</BodyText>
                  <SmallRiskChip $bgColor={getRiskColor(category.risk)}>
                    {category.risk}
                  </SmallRiskChip>
                </FlexBetween>
                <ProgressBarTrack>
                  <ProgressBarFill $width={category.score} $color={getRiskColor(category.risk)} />
                </ProgressBarTrack>
              </CategoryBlock>
            ))}
          </div>
        </GridContainer>
      </GlassPanel>
    );
  };

  const renderCriticalAlerts = () => {
    if (!riskAssessment?.criticalAlerts?.length) return null;

    return (
      <GlassPanel>
        <Heading6>
          <AlertTriangle color="#FF6B6B" size={20} />
          Critical Alerts
        </Heading6>

        {riskAssessment.criticalAlerts.map((alert) => (
          <AlertBox key={criticalAlertKey(alert)}>
            <Subtitle style={{ marginBottom: 4 }}>
              {alert.title} - Action needed: {alert.timeframe}
            </Subtitle>
            <SecondaryText style={{ marginBottom: 8 }}>
              {alert.description}
            </SecondaryText>
            <MediumText>
              Action: {alert.action}
            </MediumText>
          </AlertBox>
        ))}
      </GlassPanel>
    );
  };

  const renderDetailedAssessment = () => {
    if (!riskAssessment || riskAssessment.categories.length === 0) return null;

    return (
      <GlassPanel>
        <Heading6>
          Detailed Assessment
        </Heading6>

        {riskAssessment.categories.map((category) => (
          <AccordionWrapper key={category.id}>
            <AccordionSummaryStyled>
              <SummaryLeft>
                <span style={{ flex: 1, fontSize: '1rem', fontWeight: 500 }}>
                  {category.name}
                </span>
                <SmallRiskChip $bgColor={getRiskColor(category.risk)}>
                  {category.score}/100
                </SmallRiskChip>
              </SummaryLeft>
              <ChevronIcon className="chevron-icon" size={20} color="#94a3b8" />
            </AccordionSummaryStyled>
            <AccordionContent>
              <StyledTable>
                <TableHead>
                  <tr>
                    <th>Assessment Area</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Notes</th>
                    <th>Recommendation</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {category.findings.map((finding) => (
                    <tr key={findingRowKey(finding)}>
                      <td>
                        <MediumText>{finding.pattern}</MediumText>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getStatusIcon(finding.status)}
                      </td>
                      <td>
                        <SecondaryText>{finding.notes}</SecondaryText>
                      </td>
                      <td>
                        <BodyText>{finding.recommendation}</BodyText>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </StyledTable>
            </AccordionContent>
          </AccordionWrapper>
        ))}
      </GlassPanel>
    );
  };

  const renderCorrectiveProtocol = () => {
    if (!riskAssessment?.correctiveProtocol) return null;

    const { inhibit, lengthen, activate, integrate } = riskAssessment.correctiveProtocol;
    if (![inhibit, lengthen, activate, integrate].some((items) => items.length > 0)) return null;

    return (
      <GlassPanel>
        <Heading6>
          NASM Corrective Exercise Protocol
        </Heading6>

        <SecondaryText style={{ marginBottom: 24 }}>
          Based on assessment findings, follow this 4-phase corrective approach:
        </SecondaryText>

        <GridContainer>
          <ProtocolCard $bgColor="rgba(255, 107, 107, 0.1)">
            <ProtocolHeading $color="#FF6B6B">
              1. Inhibit (Overactive)
            </ProtocolHeading>
            <StyledList>
              {inhibit.map((item) => (
                <StyledListItem key={correctiveProtocolItemKey('inhibit', item)}>
                  <div>
                    <ListItemPrimary>{item.muscle}</ListItemPrimary>
                    <ListItemSecondary>{item.exercise} - {item.duration} ({item.frequency})</ListItemSecondary>
                  </div>
                </StyledListItem>
              ))}
            </StyledList>
          </ProtocolCard>

          <ProtocolCard $bgColor="rgba(255, 193, 7, 0.1)">
            <ProtocolHeading $color="#FFC107">
              2. Lengthen (Tight)
            </ProtocolHeading>
            <StyledList>
              {lengthen.map((item) => (
                <StyledListItem key={correctiveProtocolItemKey('lengthen', item)}>
                  <div>
                    <ListItemPrimary>{item.muscle}</ListItemPrimary>
                    <ListItemSecondary>{item.exercise} - {item.duration} ({item.frequency})</ListItemSecondary>
                  </div>
                </StyledListItem>
              ))}
            </StyledList>
          </ProtocolCard>

          <ProtocolCard $bgColor="rgba(139, 92, 246, 0.1)">
            <ProtocolHeading $color="#60C0F0">
              3. Activate (Underactive)
            </ProtocolHeading>
            <StyledList>
              {activate.map((item) => (
                <StyledListItem key={correctiveProtocolItemKey('activate', item)}>
                  <div>
                    <ListItemPrimary>{item.muscle}</ListItemPrimary>
                    <ListItemSecondary>{item.exercise} - {item.reps} ({item.frequency})</ListItemSecondary>
                  </div>
                </StyledListItem>
              ))}
            </StyledList>
          </ProtocolCard>

          <ProtocolCard $bgColor="rgba(76, 175, 80, 0.1)">
            <ProtocolHeading $color="#4CAF50">
              4. Integrate (Functional)
            </ProtocolHeading>
            <StyledList>
              {integrate.map((item) => (
                <StyledListItem key={correctiveProtocolItemKey('integrate', item)}>
                  <div>
                    <ListItemPrimary>{item.muscle}</ListItemPrimary>
                    <ListItemSecondary>{item.exercise} - {item.reps} ({item.frequency})</ListItemSecondary>
                  </div>
                </StyledListItem>
              ))}
            </StyledList>
          </ProtocolCard>
        </GridContainer>
      </GlassPanel>
    );
  };

  const renderRecommendations = () => {
    if (!riskAssessment?.recommendations?.length) return null;

    return (
      <GlassPanel style={{ marginBottom: 0 }}>
        <Heading6>
          Action Plan Recommendations
        </Heading6>

        <GridThreeCol>
          {riskAssessment.recommendations.map((category) => (
            <RecommendationCard key={recommendationCategoryKey(category)}>
              <RecommendationHeading>
                {category.category}
              </RecommendationHeading>
              <StyledList>
                {category.items.map((item) => (
                  <StyledListItem key={recommendationItemKey(category, item)}>
                    <CheckCircle size={16} color="#4CAF50" style={{ flexShrink: 0, marginTop: 2 }} />
                    <BodyText>{item}</BodyText>
                  </StyledListItem>
                ))}
              </StyledList>
            </RecommendationCard>
          ))}
        </GridThreeCol>
      </GlassPanel>
    );
  };

  return (
    <Container>
      {renderRiskState()}
      {renderOverallRisk()}
      {renderCriticalAlerts()}
      {renderDetailedAssessment()}
      {renderCorrectiveProtocol()}
      {renderRecommendations()}
    </Container>
  );
};

export default InjuryRiskAssessment;
