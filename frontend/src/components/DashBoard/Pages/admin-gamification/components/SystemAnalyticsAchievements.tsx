/**
 * SUB-COMPONENT: SystemAnalyticsAchievements
 * PARENT: SystemAnalytics
 * PURPOSE: Shows achievement totals, completion rate, and most/least popular achievements.
 * WIREFRAME: [statistics list] [completion placeholder] [earning timeline placeholder]
 * Props: { data }
 * CLICK-OUTCOMES: none; read-only analytics section.
 * GAMIFICATION: Reports achievement activity without awarding points.
 */

import React from 'react';
import { ChevronDown, ChevronUp, Medal, Trophy } from 'lucide-react';
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

interface SystemAnalyticsAchievementsProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsAchievements: React.FC<SystemAnalyticsAchievementsProps> = ({ data }) => {
  const stats = data.achievementStats ?? {};

  return (
    <GridContainer>
      <GlassCard>
        <CardHeaderStyled>Achievement Statistics</CardHeaderStyled>
        <CardBody>
          <ListContainer>
            <ListRow>
              <ListIcon><Trophy size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Total Achievements Earned</ListPrimary>
                <ListSecondary>{formatNumber(stats.totalAchievementsEarned)} achievements earned by all users</ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><Medal size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Completion Rate</ListPrimary>
                <ListSecondary>{formatNumber(stats.achievementCompletionRate)}% overall achievement completion rate</ListSecondary>
              </ListContent>
            </ListRow>
          </ListContainer>
          <HrDivider />
          <ListContainer>
            <ListRow>
              <ListIcon><ChevronUp size={20} color="var(--analytics-success, #4caf50)" /></ListIcon>
              <ListContent>
                <ListPrimary>Most Popular Achievement</ListPrimary>
                <ListSecondary>
                  <BoldText>{stats.mostPopularAchievement?.name ?? 'No data yet'}</BoldText>
                  <br />
                  {stats.mostPopularAchievement?.description ?? '-'}
                  <br />
                  Earned by {formatNumber(stats.mostPopularAchievement?.count)} users
                </ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><ChevronDown size={20} color="var(--analytics-error, #f44336)" /></ListIcon>
              <ListContent>
                <ListPrimary>Least Popular Achievement</ListPrimary>
                <ListSecondary>
                  <BoldText>{stats.leastPopularAchievement?.name ?? 'No data yet'}</BoldText>
                  <br />
                  {stats.leastPopularAchievement?.description ?? '-'}
                  <br />
                  Earned by {formatNumber(stats.leastPopularAchievement?.count)} users
                </ListSecondary>
              </ListContent>
            </ListRow>
          </ListContainer>
        </CardBody>
      </GlassCard>

      <GlassCard>
        <CardHeaderStyled>Achievement Completion Rates</CardHeaderStyled>
        <CardBody>
          <FlexCenter>
            <PlaceholderText>Achievement completion rates will appear here once the endpoint returns per-achievement percentages.</PlaceholderText>
          </FlexCenter>
        </CardBody>
      </GlassCard>

      <GridFull>
        <GlassCard>
          <CardHeaderStyled>Achievement Earning Timeline</CardHeaderStyled>
          <CardBody>
            <FlexCenter>
              <PlaceholderText>Achievement earning trends will appear here once time-series completion data is available.</PlaceholderText>
            </FlexCenter>
          </CardBody>
        </GlassCard>
      </GridFull>
    </GridContainer>
  );
};
