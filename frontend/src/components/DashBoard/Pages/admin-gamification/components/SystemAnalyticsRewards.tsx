/**
 * SUB-COMPONENT: SystemAnalyticsRewards
 * PARENT: SystemAnalytics
 * PURPOSE: Shows reward redemptions, points spent, and most/least redeemed rewards.
 * WIREFRAME: [statistics list] [distribution placeholder] [redemption timeline placeholder]
 * Props: { data }
 * CLICK-OUTCOMES: none; read-only analytics section.
 * GAMIFICATION: Reports reward economy activity without awarding points.
 */

import React from 'react';
import { ChevronDown, ChevronUp, Gift, Star } from 'lucide-react';
import { formatNumber } from './SystemAnalytics.data';
import {
  BoldText,
  CardBody,
  CardHeaderStyled,
  GlassCard,
  GridContainer,
  GridFull,
  HrDivider,
  ListContainer,
  ListContent,
  ListIcon,
  ListPrimary,
  ListRow,
  ListSecondary,
  PlaceholderText,
} from './SystemAnalyticsCard.styles';
import { FlexCenter } from './SystemAnalyticsFrame.styles';
import type { SystemAnalyticsData } from './SystemAnalytics.types';

interface SystemAnalyticsRewardsProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsRewards: React.FC<SystemAnalyticsRewardsProps> = ({ data }) => {
  const stats = data.rewardStats ?? {};

  return (
    <GridContainer>
      <GlassCard>
        <CardHeaderStyled>Reward Statistics</CardHeaderStyled>
        <CardBody>
          <ListContainer>
            <ListRow>
              <ListIcon><Gift size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Total Rewards Redeemed</ListPrimary>
                <ListSecondary>{formatNumber(stats.totalRewardsRedeemed)} rewards redeemed by all users</ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><Star size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Points Spent</ListPrimary>
                <ListSecondary>{formatNumber(stats.totalPointsSpent)} total points spent on rewards</ListSecondary>
              </ListContent>
            </ListRow>
          </ListContainer>
          <HrDivider />
          <ListContainer>
            <ListRow>
              <ListIcon><ChevronUp size={20} color="var(--analytics-success, #4caf50)" /></ListIcon>
              <ListContent>
                <ListPrimary>Most Redeemed Reward</ListPrimary>
                <ListSecondary>
                  <BoldText>{stats.mostRedeemedReward?.name ?? 'No data yet'}</BoldText>
                  <br />
                  {stats.mostRedeemedReward?.description ?? '-'}
                  <br />
                  Redeemed {formatNumber(stats.mostRedeemedReward?.count)} times
                </ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><ChevronDown size={20} color="var(--analytics-error, #f44336)" /></ListIcon>
              <ListContent>
                <ListPrimary>Least Redeemed Reward</ListPrimary>
                <ListSecondary>
                  <BoldText>{stats.leastRedeemedReward?.name ?? 'No data yet'}</BoldText>
                  <br />
                  {stats.leastRedeemedReward?.description ?? '-'}
                  <br />
                  Redeemed {formatNumber(stats.leastRedeemedReward?.count)} times
                </ListSecondary>
              </ListContent>
            </ListRow>
          </ListContainer>
        </CardBody>
      </GlassCard>

      <GlassCard>
        <CardHeaderStyled>Reward Redemption Distribution</CardHeaderStyled>
        <CardBody>
          <FlexCenter>
            <PlaceholderText>Reward redemption distribution will appear here once reward-level breakdowns are available.</PlaceholderText>
          </FlexCenter>
        </CardBody>
      </GlassCard>

      <GridFull>
        <GlassCard>
          <CardHeaderStyled>Reward Redemption Timeline</CardHeaderStyled>
          <CardBody>
            <FlexCenter>
              <PlaceholderText>Reward redemption trends will appear here once time-series redemption data is available.</PlaceholderText>
            </FlexCenter>
          </CardBody>
        </GlassCard>
      </GridFull>
    </GridContainer>
  );
};
