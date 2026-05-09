/**
 * SUB-COMPONENT: SystemAnalyticsOverview
 * PARENT: SystemAnalytics
 * PURPOSE: Shows top gamification KPIs, tier distribution, popular items, and recent activity.
 * WIREFRAME: [4 KPI cards] [tier bars | popular items] [recent activity table]
 * Props: { data }
 * CLICK-OUTCOMES: none; read-only analytics section.
 * GAMIFICATION: Reports economy health without awarding points.
 */

import React from 'react';
import { Activity, Gift, Trophy, Users } from 'lucide-react';
import {
  asNumber,
  formatActivityDate,
  formatNumber,
  getTierColor,
  getTierLabel,
  normalizeTierDistribution,
} from './SystemAnalytics.data';
import {
  BoldText,
  CardBody,
  CardHeaderStyled,
  ChipBadge,
  GlassCard,
  GlassPaper,
  Grid4Col,
  GridContainer,
  GridFull,
  SmallText,
  StyledTable,
  StyledTableContainer,
  StyledTd,
  StyledTh,
  StyledTr,
  SubText,
  SubTitle,
} from './SystemAnalyticsCard.styles';
import { Bar, BarChartArea, BarColumn } from './SystemAnalyticsViz.styles';
import { SystemAnalyticsStatCard } from './SystemAnalyticsStatCard';
import type { SystemAnalyticsData } from './SystemAnalytics.types';

interface SystemAnalyticsOverviewProps {
  data: SystemAnalyticsData;
}

export const SystemAnalyticsOverview: React.FC<SystemAnalyticsOverviewProps> = ({ data }) => {
  const users = data.userEngagement ?? {};
  const achievements = data.achievementStats ?? {};
  const rewards = data.rewardStats ?? {};
  const tiers = normalizeTierDistribution(data.tierDistribution);
  const recentRows = Array.isArray(data.timeSeriesData) ? data.timeSeriesData : [];

  return (
    <div>
      <Grid4Col>
        <SystemAnalyticsStatCard title="Total Users" value={formatNumber(users.totalUsers)} icon={<Users size={24} />} trend="up" trendValue="8% from last month" />
        <SystemAnalyticsStatCard title="Achievements Earned" value={formatNumber(achievements.totalAchievementsEarned)} icon={<Trophy size={24} />} trend="up" trendValue="12% from last month" />
        <SystemAnalyticsStatCard title="Rewards Redeemed" value={formatNumber(rewards.totalRewardsRedeemed)} icon={<Gift size={24} />} trend="up" trendValue="5% from last month" />
        <SystemAnalyticsStatCard title="Engagement Rate" value={`${asNumber(users.engagementRate)}%`} icon={<Activity size={24} />} trend="up" trendValue="3% from last month" />
      </Grid4Col>

      <GridContainer style={{ marginTop: 24 }}>
        <GlassCard>
          <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
          <CardBody>
            <BarChartArea>
              {tiers.map(tier => (
                <BarColumn key={tier.tier}>
                  <Bar $height={asNumber(tier.percentage) * 2} $bgColor={getTierColor(tier.tier)} />
                  <SubText>{getTierLabel(tier.tier)}</SubText>
                  <SmallText>{formatNumber(tier.count)} users ({asNumber(tier.percentage)}%)</SmallText>
                </BarColumn>
              ))}
            </BarChartArea>
          </CardBody>
        </GlassCard>

        <GlassCard>
          <CardHeaderStyled>Popular Items</CardHeaderStyled>
          <CardBody>
            <SubTitle><Trophy size={16} /> Most Popular Achievement</SubTitle>
            <GlassPaper>
              <BoldText>{achievements.mostPopularAchievement?.name ?? 'No data yet'}</BoldText>
              <SubText>{achievements.mostPopularAchievement?.description ?? '-'}</SubText>
              <ChipBadge>Earned by {formatNumber(achievements.mostPopularAchievement?.count)} users</ChipBadge>
            </GlassPaper>

            <SubTitle><Gift size={16} /> Most Redeemed Reward</SubTitle>
            <GlassPaper>
              <BoldText>{rewards.mostRedeemedReward?.name ?? 'No data yet'}</BoldText>
              <SubText>{rewards.mostRedeemedReward?.description ?? '-'}</SubText>
              <ChipBadge>Redeemed {formatNumber(rewards.mostRedeemedReward?.count)} times</ChipBadge>
            </GlassPaper>
          </CardBody>
        </GlassCard>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Recent Activity</CardHeaderStyled>
            <CardBody>
              <StyledTableContainer>
                <StyledTable>
                  <thead>
                    <tr>
                      <StyledTh>Date</StyledTh>
                      <StyledTh>New Users</StyledTh>
                      <StyledTh>Achievements Earned</StyledTh>
                      <StyledTh>Points Earned</StyledTh>
                      <StyledTh>Points Spent</StyledTh>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map(item => (
                      <StyledTr key={item.date}>
                        <StyledTd>{formatActivityDate(item.date)}</StyledTd>
                        <StyledTd>{formatNumber(item.newUsers)}</StyledTd>
                        <StyledTd>{formatNumber(item.achievementsEarned)}</StyledTd>
                        <StyledTd>{formatNumber(item.pointsEarned)}</StyledTd>
                        <StyledTd>{formatNumber(item.pointsSpent)}</StyledTd>
                      </StyledTr>
                    ))}
                  </tbody>
                </StyledTable>
              </StyledTableContainer>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );
};
