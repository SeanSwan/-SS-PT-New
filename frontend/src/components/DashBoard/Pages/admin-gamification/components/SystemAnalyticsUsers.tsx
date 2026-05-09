/**
 * User engagement section for SystemAnalytics.
 */

import React from 'react';
import { Activity, Star, TrendingUp, Users } from 'lucide-react';
import { formatNumber } from './SystemAnalytics.data';
import {
  CardBody,
  CardHeaderStyled,
  GlassCard,
  GridContainer,
  GridFull,
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

interface SystemAnalyticsUsersProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsUsers: React.FC<SystemAnalyticsUsersProps> = ({ data }) => {
  const users = data.userEngagement ?? {};

  return (
    <GridContainer>
      <GlassCard>
        <CardHeaderStyled>User Engagement Metrics</CardHeaderStyled>
        <CardBody>
          <ListContainer>
            <ListRow>
              <ListIcon><Users size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Total Users</ListPrimary>
                <ListSecondary>{formatNumber(users.totalUsers)} registered users in the system</ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><Activity size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Active Users</ListPrimary>
                <ListSecondary>{formatNumber(users.activeUsers)} active users ({formatNumber(users.engagementRate)}% engagement rate)</ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><Star size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Average Points</ListPrimary>
                <ListSecondary>{formatNumber(users.averagePointsPerUser)} points per user</ListSecondary>
              </ListContent>
            </ListRow>
            <ListRow>
              <ListIcon><TrendingUp size={20} /></ListIcon>
              <ListContent>
                <ListPrimary>Average Level</ListPrimary>
                <ListSecondary>Level {formatNumber(users.averageLevelPerUser)} average across all users</ListSecondary>
              </ListContent>
            </ListRow>
          </ListContainer>
        </CardBody>
      </GlassCard>

      <GlassCard>
        <CardHeaderStyled>User Level Distribution</CardHeaderStyled>
        <CardBody>
          <FlexCenter>
            <PlaceholderText>User level distribution will appear here once level histogram data is available.</PlaceholderText>
          </FlexCenter>
        </CardBody>
      </GlassCard>

      <GridFull>
        <GlassCard>
          <CardHeaderStyled>User Activity Timeline</CardHeaderStyled>
          <CardBody>
            <FlexCenter>
              <PlaceholderText>Daily active user trend data will appear here once the analytics endpoint returns timeline buckets.</PlaceholderText>
            </FlexCenter>
          </CardBody>
        </GlassCard>
      </GridFull>
    </GridContainer>
  );
};
