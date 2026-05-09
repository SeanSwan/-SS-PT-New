/**
 * SUB-COMPONENT: SystemAnalyticsTrends
 * PARENT: SystemAnalytics
 * PURPOSE: Shows growth, points economy, retention placeholders, and summary insights.
 * WIREFRAME: [growth placeholder] [points economy | retention] [insight list + report button]
 * Props: { data }
 * CLICK-OUTCOMES: Generate Full Reports button is presentational until report export is wired.
 * GAMIFICATION: Reports trend insights without awarding points.
 */

import React from 'react';
import { Award, BarChart, Gift, TrendingUp, Trophy } from 'lucide-react';
import {
  BoldText,
  CardBody,
  CardHeaderStyled,
  GlassCard,
  GridContainer,
  GridFull,
  ListContainer,
  ListContent,
  ListIcon,
  ListRow,
  ListSecondary,
  PlaceholderText,
} from './SystemAnalyticsCard.styles';
import { FlexCenter, PrimaryButton } from './SystemAnalyticsFrame.styles';
import { InsightBox } from './SystemAnalyticsViz.styles';
import type { SystemAnalyticsData } from './SystemAnalytics.types';

interface SystemAnalyticsTrendsProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsTrends: React.FC<SystemAnalyticsTrendsProps> = ({ data }) => {
  const achievements = data.achievementStats ?? {};
  const rewards = data.rewardStats ?? {};

  return (
    <GridContainer>
      <GridFull>
        <GlassCard>
          <CardHeaderStyled>System Growth</CardHeaderStyled>
          <CardBody>
            <FlexCenter>
              <PlaceholderText>System growth will appear here once user growth, achievement, and reward trend buckets are available.</PlaceholderText>
            </FlexCenter>
          </CardBody>
        </GlassCard>
      </GridFull>

      <GlassCard>
        <CardHeaderStyled>Points Economy</CardHeaderStyled>
        <CardBody>
          <FlexCenter>
            <PlaceholderText>Points earned versus points spent will appear here once economy time-series data is available.</PlaceholderText>
          </FlexCenter>
        </CardBody>
      </GlassCard>

      <GlassCard>
        <CardHeaderStyled>User Retention</CardHeaderStyled>
        <CardBody>
          <FlexCenter>
            <PlaceholderText>User retention rates will appear here once retention cohorts are connected to rewards and achievements.</PlaceholderText>
          </FlexCenter>
        </CardBody>
      </GlassCard>

      <GridFull>
        <GlassCard>
          <CardHeaderStyled>Analytics Summary</CardHeaderStyled>
          <CardBody>
            <InsightBox>
              <BoldText>Key Insights:</BoldText>
              <ListContainer>
                <ListRow>
                  <ListIcon><TrendingUp size={18} /></ListIcon>
                  <ListContent>
                    <ListSecondary>User engagement is trending upward when active users and engagement rate rise together.</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Trophy size={18} /></ListIcon>
                  <ListContent>
                    <ListSecondary>"{achievements.mostPopularAchievement?.name ?? 'N/A'}" is the most popular achievement in the current data set.</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Gift size={18} /></ListIcon>
                  <ListContent>
                    <ListSecondary>"{rewards.mostRedeemedReward?.name ?? 'N/A'}" is the most redeemed reward in the current data set.</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Award size={18} /></ListIcon>
                  <ListContent>
                    <ListSecondary>Tier movement should be reviewed with real progression buckets before changing reward costs.</ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
            </InsightBox>

            <PrimaryButton type="button">
              <BarChart size={18} />
              Generate Full Reports
            </PrimaryButton>
          </CardBody>
        </GlassCard>
      </GridFull>
    </GridContainer>
  );
};
