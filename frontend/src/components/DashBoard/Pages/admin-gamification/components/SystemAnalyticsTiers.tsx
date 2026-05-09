/**
 * SUB-COMPONENT: SystemAnalyticsTiers
 * PARENT: SystemAnalytics
 * PURPOSE: Shows tier distribution as table, progress bars, and compact visual summary.
 * WIREFRAME: [tier table] [donut summary] [progression timeline placeholder]
 * Props: { data }
 * CLICK-OUTCOMES: none; read-only analytics section.
 * GAMIFICATION: Reports tier state without awarding points.
 */

import React from 'react';
import { getTierColor, getTierLabel, normalizeTierDistribution } from './SystemAnalytics.data';
import {
  CardBody,
  CardHeaderStyled,
  GlassCard,
  GridContainer,
  GridFull,
  SmallText,
  StyledTable,
  StyledTableContainer,
  StyledTd,
  StyledTh,
  StyledTr,
  PlaceholderText,
} from './SystemAnalyticsCard.styles';
import { FlexCenter, FlexGap } from './SystemAnalyticsFrame.styles';
import { ChartPlaceholder, ColorDot, LegendBar, ProgressFill, ProgressTrack } from './SystemAnalyticsViz.styles';
import type { SystemAnalyticsData } from './SystemAnalytics.types';

interface SystemAnalyticsTiersProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsTiers: React.FC<SystemAnalyticsTiersProps> = ({ data }) => {
  const tiers = normalizeTierDistribution(data.tierDistribution);

  return (
    <GridContainer>
      <GlassCard>
        <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
        <CardBody>
          <StyledTableContainer>
            <StyledTable>
              <thead>
                <tr>
                  <StyledTh>Tier</StyledTh>
                  <StyledTh>Users</StyledTh>
                  <StyledTh>Percentage</StyledTh>
                  <StyledTh>Visualization</StyledTh>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <StyledTr key={tier.tier}>
                    <StyledTd>
                      <FlexGap $gap={8}>
                        <ColorDot $color={getTierColor(tier.tier)} />
                        <span>{getTierLabel(tier.tier)}</span>
                      </FlexGap>
                    </StyledTd>
                    <StyledTd>{tier.count ?? 0}</StyledTd>
                    <StyledTd>{tier.percentage ?? 0}%</StyledTd>
                    <StyledTd>
                      <ProgressTrack>
                        <ProgressFill $width={tier.percentage ?? 0} $color={getTierColor(tier.tier)} />
                      </ProgressTrack>
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </StyledTable>
          </StyledTableContainer>
        </CardBody>
      </GlassCard>

      <GlassCard>
        <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
        <CardBody>
          <ChartPlaceholder aria-label="Tier distribution visual summary">
            <svg width="250" height="250" viewBox="0 0 100 100" role="img" aria-label="Tier distribution donut">
              <circle cx="50" cy="50" r="50" fill="var(--analytics-donut-bg, rgba(255, 255, 255, 0.05))" />
              <path d="M 50 50 L 50 0 A 50 50 0 0 1 64 3 Z" fill="var(--swan-wing-purple, #8B5CF6)" />
              <path d="M 50 50 L 64 3 A 50 50 0 0 1 90 30 Z" fill="var(--swan-gilded-fern, #C6A84B)" />
              <path d="M 50 50 L 90 30 A 50 50 0 0 1 70 90 Z" fill="var(--swan-ice-wing, #60C0F0)" />
              <path d="M 50 50 L 70 90 A 50 50 0 0 1 0 50 A 50 50 0 0 1 50 0 Z" fill="var(--swan-midnight-sapphire, #002060)" />
              <circle cx="50" cy="50" r="30" fill="var(--analytics-card-bg, rgba(15, 23, 42, 0.86))" />
            </svg>
            <LegendBar>
              {tiers.map(tier => (
                <FlexGap key={tier.tier} $gap={4}>
                  <ColorDot $color={getTierColor(tier.tier)} $size={12} />
                  <SmallText>{getTierLabel(tier.tier)}</SmallText>
                </FlexGap>
              ))}
            </LegendBar>
          </ChartPlaceholder>
        </CardBody>
      </GlassCard>

      <GridFull>
        <GlassCard>
          <CardHeaderStyled>Tier Progression Timeline</CardHeaderStyled>
          <CardBody>
            <FlexCenter>
              <PlaceholderText>Tier progression trends will appear here once progression timeline data is available.</PlaceholderText>
            </FlexCenter>
          </CardBody>
        </GlassCard>
      </GridFull>
    </GridContainer>
  );
};
