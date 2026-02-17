import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Info,
  Target,
  Heart,
  Zap
} from 'lucide-react';

// Import chart components
import RadarProgressChart from '../../../FitnessStats/charts/RadarProgressChart';

// Import proper type definitions
import type { InjuryRiskAssessmentProps } from './types';

/* ─── styled-components (Galaxy-Swan theme) ─── */

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
  width: ${({ $width }) => $width}%;
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
  color: #00ffff;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');
  const [showDetails, setShowDetails] = useState(false);

  // Generate comprehensive risk assessment
  const riskAssessment = useMemo(() => {
    if (!clientData) return null;

    return {
      overallRisk: 'medium', // low, medium, high
      riskScore: 65, // 0-100 scale
      lastAssessment: new Date().toISOString(),

      categories: [
        {
          id: 'movement',
          name: 'Movement Patterns',
          risk: 'low',
          score: 25,
          icon: 'activity',
          findings: [
            {
              pattern: 'Squat Pattern',
              status: 'good',
              notes: 'Proper knee tracking, adequate depth',
              recommendation: 'Continue current form'
            },
            {
              pattern: 'Overhead Movement',
              status: 'attention',
              notes: 'Slight shoulder impingement pattern',
              recommendation: 'Focus on thoracic mobility'
            },
            {
              pattern: 'Single Leg Balance',
              status: 'good',
              notes: 'Stable with eyes open and closed',
              recommendation: 'Progress to dynamic challenges'
            }
          ]
        },
        {
          id: 'imbalances',
          name: 'Muscular Imbalances',
          risk: 'medium',
          score: 55,
          icon: 'target',
          findings: [
            {
              pattern: 'Hip Flexor Tightness',
              status: 'caution',
              notes: 'Overactive hip flexors affecting posture',
              recommendation: 'Daily hip flexor stretching protocol'
            },
            {
              pattern: 'Glute Activation',
              status: 'attention',
              notes: 'Weak glute medius, compensation patterns',
              recommendation: 'Glute activation exercises pre-workout'
            },
            {
              pattern: 'Core Stability',
              status: 'good',
              notes: 'Strong anterior and posterior chains',
              recommendation: 'Maintain current core routine'
            }
          ]
        },
        {
          id: 'recovery',
          name: 'Recovery Patterns',
          risk: 'high',
          score: 75,
          icon: 'clock',
          findings: [
            {
              pattern: 'Sleep Quality',
              status: 'caution',
              notes: 'Averaging 5.5 hours, poor recovery',
              recommendation: 'Improve sleep hygiene, reduce evening workouts'
            },
            {
              pattern: 'HRV Trends',
              status: 'attention',
              notes: 'Declining heart rate variability',
              recommendation: 'Consider deload week or stress management'
            },
            {
              pattern: 'Subjective Recovery',
              status: 'caution',
              notes: 'Client reports frequent fatigue',
              recommendation: 'Monitor training load, increase rest days'
            }
          ]
        },
        {
          id: 'progression',
          name: 'Training Progression',
          risk: 'medium',
          score: 45,
          icon: 'trending-up',
          findings: [
            {
              pattern: 'Load Progression',
              status: 'good',
              notes: 'Conservative 2-5% weekly increases',
              recommendation: 'Continue current progression rate'
            },
            {
              pattern: 'Volume Increases',
              status: 'attention',
              notes: '15% increase in volume last 2 weeks',
              recommendation: 'Reduce volume increase to <10% weekly'
            },
            {
              pattern: 'Exercise Complexity',
              status: 'good',
              notes: 'Appropriate skill progression',
              recommendation: 'Ready for next movement level'
            }
          ]
        }
      ],

      criticalAlerts: [
        {
          severity: 'high',
          title: 'Recovery Deficit',
          description: 'Consistently poor sleep and declining HRV indicate overreaching.',
          action: 'Immediate reduction in training intensity and focus on recovery protocols.',
          timeframe: 'This week'
        },
        {
          severity: 'medium',
          title: 'Volume Spike',
          description: 'Training volume increased 15% in 2 weeks - above recommended guidelines.',
          action: 'Reduce volume by 10% and monitor client response.',
          timeframe: 'Next session'
        }
      ],

      recommendations: [
        {
          category: 'Immediate',
          items: [
            'Reduce training intensity by 20% this week',
            'Implement daily hip flexor stretching (2x15 seconds)',
            'Add 5-minute glute activation warm-up',
            'Schedule recovery assessment in 1 week'
          ]
        },
        {
          category: 'Short Term (1-2 weeks)',
          items: [
            'Sleep hygiene education and implementation',
            'Introduce stress management techniques',
            'Progress to unilateral leg exercises',
            'Monitor subjective recovery daily'
          ]
        },
        {
          category: 'Long Term (1+ months)',
          items: [
            'Movement quality reassessment',
            'Advanced balance training integration',
            'Periodization review and adjustment',
            'Goal setting and expectation management'
          ]
        }
      ],

      // NASM-based corrective exercise recommendations
      correctiveProtocol: {
        inhibit: [
          { muscle: 'Hip Flexors', exercise: 'Static Stretching', duration: '30 seconds x 2', frequency: 'Daily' },
          { muscle: 'Upper Trapezius', exercise: 'Static Stretching', duration: '30 seconds x 2', frequency: 'Daily' }
        ],
        lengthen: [
          { muscle: 'Hip Flexors', exercise: 'Couch Stretch', duration: '60 seconds x 2', frequency: 'Daily' },
          { muscle: 'Latissimus Dorsi', exercise: 'Wall Lat Stretch', duration: '30 seconds x 3', frequency: '3x/week' }
        ],
        activate: [
          { muscle: 'Glute Medius', exercise: 'Clamshells', reps: '15 x 2', frequency: 'Pre-workout' },
          { muscle: 'Deep Neck Flexors', exercise: 'Chin Tucks', reps: '10 x 2', frequency: 'Daily' }
        ],
        integrate: [
          { muscle: 'Glutes', exercise: 'Single Leg Deadlifts', reps: '8-12 x 2', frequency: '2x/week' },
          { muscle: 'Core', exercise: 'Dead Bug', reps: '10 each x 2', frequency: '3x/week' }
        ]
      }
    };
  }, [clientData, workoutHistory]);

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

  const renderOverallRisk = () => {
    if (!riskAssessment) return null;

    return (
      <GlassPanel>
        <FlexBetween style={{ marginBottom: 24 }}>
          <FlexRow>
            <Shield color="#00ffff" size={24} style={{ marginRight: 12 }} />
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

        {riskAssessment.criticalAlerts.map((alert, index) => (
          <AlertBox key={index}>
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
    if (!riskAssessment) return null;

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
                  {category.findings.map((finding, index) => (
                    <tr key={index}>
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
              {inhibit.map((item, index) => (
                <StyledListItem key={index}>
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
              {lengthen.map((item, index) => (
                <StyledListItem key={index}>
                  <div>
                    <ListItemPrimary>{item.muscle}</ListItemPrimary>
                    <ListItemSecondary>{item.exercise} - {item.duration} ({item.frequency})</ListItemSecondary>
                  </div>
                </StyledListItem>
              ))}
            </StyledList>
          </ProtocolCard>

          <ProtocolCard $bgColor="rgba(0, 255, 255, 0.1)">
            <ProtocolHeading $color="#00ffff">
              3. Activate (Underactive)
            </ProtocolHeading>
            <StyledList>
              {activate.map((item, index) => (
                <StyledListItem key={index}>
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
              {integrate.map((item, index) => (
                <StyledListItem key={index}>
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
    if (!riskAssessment?.recommendations) return null;

    return (
      <GlassPanel style={{ marginBottom: 0 }}>
        <Heading6>
          Action Plan Recommendations
        </Heading6>

        <GridThreeCol>
          {riskAssessment.recommendations.map((category, index) => (
            <RecommendationCard key={index}>
              <RecommendationHeading>
                {category.category}
              </RecommendationHeading>
              <StyledList>
                {category.items.map((item, itemIndex) => (
                  <StyledListItem key={itemIndex}>
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
      {renderOverallRisk()}
      {renderCriticalAlerts()}
      {renderDetailedAssessment()}
      {renderCorrectiveProtocol()}
      {renderRecommendations()}
    </Container>
  );
};

export default InjuryRiskAssessment;
