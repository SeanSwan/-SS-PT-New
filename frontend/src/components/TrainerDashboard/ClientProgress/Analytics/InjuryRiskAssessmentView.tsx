import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
} from 'lucide-react';

import type { CorrectiveExercise, InjuryRiskData } from '../../../../services/enhanced-progress-analytics-service';
import {
  AlertBox,
  AccordionContent,
  AccordionSummaryStyled,
  AccordionWrapper,
  BodyText,
  CaptionText,
  CategoryBlock,
  CenterBox,
  ChevronIcon,
  Container,
  EmptyState,
  FlexBetween,
  FlexRow,
  GlassPanel,
  GridContainer,
  GridThreeCol,
  Heading3,
  Heading6,
  ListItemPrimary,
  ListItemSecondary,
  MediumText,
  ProgressBarFill,
  ProgressBarTrack,
  ProtocolCard,
  ProtocolHeading,
  RecommendationCard,
  RecommendationHeading,
  RiskChip,
  SecondaryText,
  SmallRiskChip,
  StyledList,
  StyledListItem,
  StyledTable,
  Subtitle,
  SummaryLeft,
  SummaryTitle,
  TableBody,
  TableHead,
} from './InjuryRiskAssessment.styles';
import {
  correctiveProtocolItemKey,
  criticalAlertKey,
  findingRowKey,
  getRiskColor,
  protocolTone,
  recommendationCategoryKey,
  recommendationItemKey,
} from './InjuryRiskAssessment.logic';
import StatusIcon from './InjuryRiskAssessmentIcons';

interface InjuryRiskAssessmentViewProps {
  riskAssessment: InjuryRiskData | null;
  isLoadingRisk: boolean;
  riskError: string | null;
}

const renderRiskState = (
  riskAssessment: InjuryRiskData | null,
  isLoadingRisk: boolean,
  riskError: string | null,
) => {
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

const renderOverallRisk = (riskAssessment: InjuryRiskData | null) => {
  if (!riskAssessment || riskAssessment.categories.length === 0) return null;

  return (
    <GlassPanel>
      <FlexBetween style={{ marginBottom: 24 }}>
        <FlexRow>
          <Shield color="var(--accent-primary, #60C0F0)" size={24} style={{ marginRight: 12 }} />
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
          <BodyText>Overall Risk Score</BodyText>
          <CaptionText>
            Last assessed: {new Date(riskAssessment.lastAssessment).toLocaleDateString()}
          </CaptionText>
        </CenterBox>

        <div>
          <Subtitle>Risk Categories</Subtitle>
          {riskAssessment.categories.map((category) => (
            <CategoryBlock key={category.id}>
              <FlexBetween style={{ marginBottom: 6 }}>
                <BodyText>{category.name}</BodyText>
                <SmallRiskChip $bgColor={getRiskColor(category.risk)}>{category.risk}</SmallRiskChip>
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

const renderCriticalAlerts = (riskAssessment: InjuryRiskData | null) => {
  if (!riskAssessment?.criticalAlerts?.length) return null;

  return (
    <GlassPanel>
      <Heading6>
        <AlertTriangle color="var(--status-error, #FF6B6B)" size={20} />
        Critical Alerts
      </Heading6>
      {riskAssessment.criticalAlerts.map((alert) => (
        <AlertBox key={criticalAlertKey(alert)}>
          <Subtitle style={{ marginBottom: 4 }}>
            {alert.title} - Action needed: {alert.timeframe}
          </Subtitle>
          <SecondaryText style={{ marginBottom: 8 }}>{alert.description}</SecondaryText>
          <MediumText>Action: {alert.action}</MediumText>
        </AlertBox>
      ))}
    </GlassPanel>
  );
};

const renderDetailedAssessment = (riskAssessment: InjuryRiskData | null) => {
  if (!riskAssessment || riskAssessment.categories.length === 0) return null;

  return (
    <GlassPanel>
      <Heading6>Detailed Assessment</Heading6>
      {riskAssessment.categories.map((category) => (
        <AccordionWrapper key={category.id}>
          <AccordionSummaryStyled>
            <SummaryLeft>
              <SummaryTitle>{category.name}</SummaryTitle>
              <SmallRiskChip $bgColor={getRiskColor(category.risk)}>{category.score}/100</SmallRiskChip>
            </SummaryLeft>
            <ChevronIcon className="chevron-icon" size={20} />
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
                    <td><MediumText>{finding.pattern}</MediumText></td>
                    <td style={{ textAlign: 'center' }}><StatusIcon status={finding.status} /></td>
                    <td><SecondaryText>{finding.notes}</SecondaryText></td>
                    <td><BodyText>{finding.recommendation}</BodyText></td>
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

const renderProtocolItems = (phase: string, items: CorrectiveExercise[]) => items.map((item) => {
  const measure = item.duration || item.reps || 'as prescribed';
  return (
    <StyledListItem key={correctiveProtocolItemKey(phase, item)}>
      <div>
        <ListItemPrimary>{item.muscle}</ListItemPrimary>
        <ListItemSecondary>{item.exercise} - {measure} ({item.frequency})</ListItemSecondary>
      </div>
    </StyledListItem>
  );
});

const renderCorrectiveProtocol = (riskAssessment: InjuryRiskData | null) => {
  if (!riskAssessment?.correctiveProtocol) return null;
  const { correctiveProtocol } = riskAssessment;
  const sections = (Object.keys(protocolTone) as Array<keyof typeof protocolTone>).map((phase) => ({
    phase,
    items: correctiveProtocol[phase],
    ...protocolTone[phase],
  }));

  if (!sections.some(({ items }) => items.length > 0)) return null;

  return (
    <GlassPanel>
      <Heading6>NASM Corrective Exercise Protocol</Heading6>
      <SecondaryText style={{ marginBottom: 24 }}>
        Based on assessment findings, follow this 4-phase corrective approach:
      </SecondaryText>
      <GridContainer>
        {sections.map(({ phase, items, background, color, label }) => (
          <ProtocolCard key={phase} $bgColor={background}>
            <ProtocolHeading $color={color}>{label}</ProtocolHeading>
            <StyledList>{renderProtocolItems(phase, items)}</StyledList>
          </ProtocolCard>
        ))}
      </GridContainer>
    </GlassPanel>
  );
};

const renderRecommendations = (riskAssessment: InjuryRiskData | null) => {
  if (!riskAssessment?.recommendations?.length) return null;

  return (
    <GlassPanel style={{ marginBottom: 0 }}>
      <Heading6>Action Plan Recommendations</Heading6>
      <GridThreeCol>
        {riskAssessment.recommendations.map((category) => (
          <RecommendationCard key={recommendationCategoryKey(category)}>
            <RecommendationHeading>{category.category}</RecommendationHeading>
            <StyledList>
              {category.items.map((item) => (
                <StyledListItem key={recommendationItemKey(category, item)}>
                  <CheckCircle size={16} color="var(--status-success, #4CAF50)" style={{ flexShrink: 0, marginTop: 2 }} />
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

const InjuryRiskAssessmentView: React.FC<InjuryRiskAssessmentViewProps> = ({
  riskAssessment,
  isLoadingRisk,
  riskError,
}) => (
  <Container>
    {renderRiskState(riskAssessment, isLoadingRisk, riskError)}
    {renderOverallRisk(riskAssessment)}
    {renderCriticalAlerts(riskAssessment)}
    {renderDetailedAssessment(riskAssessment)}
    {renderCorrectiveProtocol(riskAssessment)}
    {renderRecommendations(riskAssessment)}
  </Container>
);

export default InjuryRiskAssessmentView;
