import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Trophy,
  Award,
  Users,
  Star,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Gift,
  Medal,
  Calendar,
  BarChart,
  PieChart,
  Activity
} from 'lucide-react';

/* ============================================================
 *  Galaxy-Swan theme tokens
 * ============================================================ */
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgDefault: 'rgba(10,15,30,0.8)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  accentLight: 'rgba(14,165,233,0.15)',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  cardBg: 'rgba(15,23,42,0.85)',
  glassBorder: 'rgba(14,165,233,0.15)',
  hoverBg: 'rgba(14,165,233,0.08)',
};

/* ============================================================
 *  Keyframes
 * ============================================================ */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* ============================================================
 *  Styled primitives
 * ============================================================ */

// Layout
const Container = styled.div`
  color: ${THEME.text};
`;

const CenteredBox = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${THEME.glassBorder};
  border-top-color: ${THEME.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const EmptyState = styled.div`
  padding: 24px;
`;

// Grid
const GridContainer = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const GridFull = styled.div`
  grid-column: 1 / -1;
`;

const Grid4Col = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

// Card / Paper
const GlassCard = styled.div`
  background: ${THEME.cardBg};
  border: 1px solid ${THEME.glassBorder};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CardHeaderStyled = styled.div`
  padding: 16px 20px 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const CardBody = styled.div`
  padding: 16px 20px 20px;
  flex: 1;
`;

const GlassPaper = styled.div`
  background: ${THEME.bgDefault};
  border: 1px solid ${THEME.glassBorder};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

// Typography
const Heading2 = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 8px;
`;

const BodyText = styled.p`
  font-size: 0.95rem;
  color: ${THEME.text};
  margin: 0 0 16px;
  line-height: 1.5;
`;

const SubText = styled.span`
  font-size: 0.85rem;
  color: ${THEME.textSecondary};
`;

const SmallText = styled.span`
  font-size: 0.8rem;
  color: ${THEME.textSecondary};
`;

const BoldText = styled.span`
  font-weight: 700;
  color: ${THEME.text};
`;

const BigValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${THEME.text};
`;

const SubTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
`;

const PlaceholderText = styled.p`
  font-size: 0.95rem;
  color: ${THEME.textSecondary};
  text-align: center;
  padding: 16px;
  line-height: 1.5;
`;

// Buttons
const TabBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? THEME.accent : THEME.border};
  background: ${({ $active }) => $active ? THEME.accent : 'transparent'};
  color: ${({ $active }) => $active ? '#fff' : THEME.text};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => $active ? THEME.accent : THEME.hoverBg};
    border-color: ${THEME.accent};
  }
`;

const TimeRangeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? '#7c3aed' : THEME.border};
  background: ${({ $active }) => $active ? '#7c3aed' : 'transparent'};
  color: ${({ $active }) => $active ? '#fff' : THEME.text};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => $active ? '#7c3aed' : 'rgba(124,58,237,0.12)'};
    border-color: #7c3aed;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: ${THEME.accent};
  color: #fff;
  cursor: pointer;
  margin-top: 16px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

// Chip
const ChipBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  border-radius: 9999px;
  background: ${THEME.accentLight};
  color: ${THEME.accent};
`;

// Divider
const HrDivider = styled.hr`
  border: none;
  border-top: 1px solid ${THEME.glassBorder};
  margin: 16px 0;
`;

// List primitives
const ListContainer = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListRow = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  min-height: 44px;
`;

const ListIcon = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  padding-top: 2px;
  color: ${THEME.accent};
`;

const ListContent = styled.div`
  flex: 1;
`;

const ListPrimary = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 2px;
`;

const ListSecondary = styled.div`
  font-size: 0.85rem;
  color: ${THEME.textSecondary};
  line-height: 1.4;
`;

// Table
const StyledTableContainer = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const StyledThead = styled.thead`
  background: rgba(14,165,233,0.06);
`;

const StyledTh = styled.th`
  text-align: left;
  padding: 10px 14px;
  color: ${THEME.textSecondary};
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${THEME.glassBorder};
  white-space: nowrap;
`;

const StyledTr = styled.tr`
  &:not(:last-child) td {
    border-bottom: 1px solid ${THEME.glassBorder};
  }
  &:hover {
    background: ${THEME.hoverBg};
  }
`;

const StyledTd = styled.td`
  padding: 10px 14px;
  color: ${THEME.text};
`;

// Icon badge (the circle around stat card icons)
const IconBadge = styled.span<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $color }) => {
    switch ($color) {
      case 'primary': return THEME.accentLight;
      case 'warning': return 'rgba(255,152,0,0.15)';
      case 'success': return 'rgba(76,175,80,0.15)';
      case 'info': return 'rgba(14,165,233,0.15)';
      default: return THEME.accentLight;
    }
  }};
  color: ${({ $color }) => {
    switch ($color) {
      case 'primary': return THEME.accent;
      case 'warning': return THEME.warning;
      case 'success': return THEME.success;
      case 'info': return THEME.accent;
      default: return THEME.accent;
    }
  }};
`;

// Stat card header row
const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const StatLabel = styled.h6`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${THEME.textSecondary};
  margin: 0;
`;

const TrendRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 6px;
  gap: 4px;
`;

// Bar chart visual helpers
const BarChartArea = styled.div`
  height: 250px;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
`;

const BarColumn = styled.div`
  text-align: center;
  width: 20%;
`;

const Bar = styled.div<{ $height: number; $bgColor: string }>`
  height: ${({ $height }) => $height}px;
  background-color: ${({ $bgColor }) => $bgColor};
  width: 70%;
  margin: 0 auto;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0.8;
    transform: translateY(-5px);
  }
`;

// Progress bar for tier table
const ProgressTrack = styled.div`
  width: 100%;
  background: rgba(255,255,255,0.05);
  height: 10px;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $width: number; $color: string }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${({ $width }) => $width}%;
  background-color: ${({ $color }) => $color};
  border-radius: 4px;
`;

// Color dot
const ColorDot = styled.span<{ $color: string; $size?: number }>`
  display: inline-block;
  width: ${({ $size }) => $size || 16}px;
  height: ${({ $size }) => $size || 16}px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

// Flex helpers
const FlexCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
`;

const FlexGap = styled.div<{ $gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${({ $gap }) => $gap ?? 8}px;
`;

// Chart placeholder wrapper
const ChartPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const LegendBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const InsightBox = styled.div`
  padding: 16px;
  background: ${THEME.bgDefault};
  border-radius: 8px;
  border: 1px solid ${THEME.glassBorder};
`;

/* ============================================================
 *  Component
 * ============================================================ */

/**
 * SystemAnalytics Component
 *
 * Provides comprehensive analytics and insights for the gamification system
 * Displays user engagement metrics, achievement statistics, reward usage, and tier distribution
 */
const SystemAnalytics: React.FC<{ data: any }> = ({ data }) => {
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<string>('month');

  useEffect(() => {
    // Simulate loading state if data not provided
    if (!data) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [data]);

  if (isLoading) {
    return (
      <CenteredBox>
        <Spinner />
      </CenteredBox>
    );
  }

  if (!data) {
    return (
      <EmptyState>
        <SubText>
          No analytics data available. Please try again later.
        </SubText>
      </EmptyState>
    );
  }

  // Analytics navigation tabs
  const renderAnalyticsTabs = () => (
    <TabBar>
      <TabButton
        $active={activeTab === 'overview'}
        onClick={() => setActiveTab('overview')}
      >
        <Activity size={18} />
        Overview
      </TabButton>
      <TabButton
        $active={activeTab === 'users'}
        onClick={() => setActiveTab('users')}
      >
        <Users size={18} />
        User Engagement
      </TabButton>
      <TabButton
        $active={activeTab === 'achievements'}
        onClick={() => setActiveTab('achievements')}
      >
        <Trophy size={18} />
        Achievements
      </TabButton>
      <TabButton
        $active={activeTab === 'rewards'}
        onClick={() => setActiveTab('rewards')}
      >
        <Gift size={18} />
        Rewards
      </TabButton>
      <TabButton
        $active={activeTab === 'tiers'}
        onClick={() => setActiveTab('tiers')}
      >
        <Award size={18} />
        Tiers
      </TabButton>
      <TabButton
        $active={activeTab === 'trends'}
        onClick={() => setActiveTab('trends')}
      >
        <TrendingUp size={18} />
        Trends
      </TabButton>
    </TabBar>
  );

  // Time range selector
  const renderTimeRange = () => (
    <TabBar>
      <TimeRangeButton
        $active={timeRange === 'week'}
        onClick={() => setTimeRange('week')}
      >
        Last Week
      </TimeRangeButton>
      <TimeRangeButton
        $active={timeRange === 'month'}
        onClick={() => setTimeRange('month')}
      >
        Last Month
      </TimeRangeButton>
      <TimeRangeButton
        $active={timeRange === 'quarter'}
        onClick={() => setTimeRange('quarter')}
      >
        Last Quarter
      </TimeRangeButton>
      <TimeRangeButton
        $active={timeRange === 'year'}
        onClick={() => setTimeRange('year')}
      >
        Last Year
      </TimeRangeButton>
    </TabBar>
  );

  // Stat card component
  const StatCard = ({ title, value, icon, trend, trendValue, color }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string | number;
    color?: string;
  }) => (
    <GlassCard>
      <CardBody>
        <StatRow>
          <StatLabel>{title}</StatLabel>
          <IconBadge $color={color}>
            {icon}
          </IconBadge>
        </StatRow>

        <BigValue>{value}</BigValue>

        {trend && (
          <TrendRow>
            {trend === 'up' ? (
              <ChevronUp size={16} color={THEME.success} />
            ) : trend === 'down' ? (
              <ChevronDown size={16} color={THEME.error} />
            ) : (
              <span style={{ marginRight: 4, color: THEME.textSecondary }}>&#8226;</span>
            )}
            <SmallText style={{
              color: trend === 'up' ? THEME.success : trend === 'down' ? THEME.error : THEME.textSecondary
            }}>
              {trendValue}
            </SmallText>
          </TrendRow>
        )}
      </CardBody>
    </GlassCard>
  );

  // Overview tab content
  const renderOverviewTab = () => (
    <div>
      <Grid4Col>
        {/* User Stats */}
        <div>
          <StatCard
            title="Total Users"
            value={data.userEngagement.totalUsers}
            icon={<Users size={24} />}
            trend="up"
            trendValue="8% from last month"
            color="primary"
          />
        </div>

        {/* Achievements Stats */}
        <div>
          <StatCard
            title="Achievements Earned"
            value={data.achievementStats.totalAchievementsEarned}
            icon={<Trophy size={24} />}
            trend="up"
            trendValue="12% from last month"
            color="warning"
          />
        </div>

        {/* Rewards Stats */}
        <div>
          <StatCard
            title="Rewards Redeemed"
            value={data.rewardStats.totalRewardsRedeemed}
            icon={<Gift size={24} />}
            trend="up"
            trendValue="5% from last month"
            color="success"
          />
        </div>

        {/* Engagement Rate */}
        <div>
          <StatCard
            title="Engagement Rate"
            value={`${data.userEngagement.engagementRate}%`}
            icon={<Activity size={24} />}
            trend="up"
            trendValue="3% from last month"
            color="info"
          />
        </div>
      </Grid4Col>

      <GridContainer style={{ marginTop: 24 }}>
        {/* Tier Distribution */}
        <div>
          <GlassCard>
            <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
            <CardBody>
              <BarChartArea>
                {data.tierDistribution.map((tier: any, index: number) => {
                  const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];
                  return (
                    <BarColumn key={tier.tier}>
                      <Bar $height={tier.percentage * 2} $bgColor={colors[index]} />
                      <SubText style={{ display: 'block', marginTop: 8 }}>
                        {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                      </SubText>
                      <SmallText>
                        {tier.count} users ({tier.percentage}%)
                      </SmallText>
                    </BarColumn>
                  );
                })}
              </BarChartArea>
            </CardBody>
          </GlassCard>
        </div>

        {/* Most Popular Items */}
        <div>
          <GlassCard>
            <CardHeaderStyled>Popular Items</CardHeaderStyled>
            <CardBody>
              <SubTitle>
                <Trophy size={16} style={{ marginRight: 8 }} />
                Most Popular Achievement
              </SubTitle>
              <GlassPaper>
                <BoldText style={{ display: 'block', marginBottom: 4 }}>
                  {data.achievementStats.mostPopularAchievement.name}
                </BoldText>
                <SubText style={{ display: 'block', marginBottom: 8 }}>
                  {data.achievementStats.mostPopularAchievement.description}
                </SubText>
                <ChipBadge>
                  Earned by {data.achievementStats.mostPopularAchievement.count} users
                </ChipBadge>
              </GlassPaper>

              <SubTitle>
                <Gift size={16} style={{ marginRight: 8 }} />
                Most Redeemed Reward
              </SubTitle>
              <GlassPaper style={{ marginBottom: 0 }}>
                <BoldText style={{ display: 'block', marginBottom: 4 }}>
                  {data.rewardStats.mostRedeemedReward.name}
                </BoldText>
                <SubText style={{ display: 'block', marginBottom: 8 }}>
                  {data.rewardStats.mostRedeemedReward.description}
                </SubText>
                <ChipBadge>
                  Redeemed {data.rewardStats.mostRedeemedReward.count} times
                </ChipBadge>
              </GlassPaper>
            </CardBody>
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Recent Activity</CardHeaderStyled>
            <CardBody>
              <StyledTableContainer>
                <StyledTable>
                  <StyledThead>
                    <tr>
                      <StyledTh>Date</StyledTh>
                      <StyledTh>New Users</StyledTh>
                      <StyledTh>Achievements Earned</StyledTh>
                      <StyledTh>Points Earned</StyledTh>
                      <StyledTh>Points Spent</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {data.timeSeriesData.map((item: any) => (
                      <StyledTr key={item.date}>
                        <StyledTd>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</StyledTd>
                        <StyledTd>{item.newUsers}</StyledTd>
                        <StyledTd>{item.achievementsEarned}</StyledTd>
                        <StyledTd>{item.pointsEarned.toLocaleString()}</StyledTd>
                        <StyledTd>{item.pointsSpent.toLocaleString()}</StyledTd>
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

  // User Engagement tab content
  const renderUsersTab = () => (
    <div>
      <GridContainer>
        <div>
          <GlassCard>
            <CardHeaderStyled>User Engagement Metrics</CardHeaderStyled>
            <CardBody>
              <ListContainer>
                <ListRow>
                  <ListIcon><Users size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Total Users</ListPrimary>
                    <ListSecondary>{data.userEngagement.totalUsers} registered users in the system</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Activity size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Active Users</ListPrimary>
                    <ListSecondary>{data.userEngagement.activeUsers} active users ({data.userEngagement.engagementRate}% engagement rate)</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Star size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Average Points</ListPrimary>
                    <ListSecondary>{data.userEngagement.averagePointsPerUser.toLocaleString()} points per user</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><TrendingUp size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Average Level</ListPrimary>
                    <ListSecondary>Level {data.userEngagement.averageLevelPerUser} average across all users</ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
            </CardBody>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <CardHeaderStyled>User Level Distribution</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  User level distribution chart would be displayed here in a real implementation.
                  The chart would show the number of users at each level.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </div>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>User Activity Timeline</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  User activity timeline chart would be displayed here in a real implementation.
                  The chart would show daily active users over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );

  // Achievement Stats tab content
  const renderAchievementsTab = () => (
    <div>
      <GridContainer>
        <div>
          <GlassCard>
            <CardHeaderStyled>Achievement Statistics</CardHeaderStyled>
            <CardBody>
              <ListContainer>
                <ListRow>
                  <ListIcon><Trophy size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Total Achievements Earned</ListPrimary>
                    <ListSecondary>{data.achievementStats.totalAchievementsEarned} achievements earned by all users</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Medal size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Completion Rate</ListPrimary>
                    <ListSecondary>{data.achievementStats.achievementCompletionRate}% overall achievement completion rate</ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
              <HrDivider />
              <ListContainer>
                <ListRow>
                  <ListIcon><ChevronUp size={20} color={THEME.success} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Most Popular Achievement</ListPrimary>
                    <ListSecondary as="div">
                      <BoldText style={{ display: 'block', fontSize: '0.85rem' }}>
                        {data.achievementStats.mostPopularAchievement.name}
                      </BoldText>
                      <span>{data.achievementStats.mostPopularAchievement.description}</span>
                      <br />
                      <span style={{ color: THEME.success }}>
                        Earned by {data.achievementStats.mostPopularAchievement.count} users
                      </span>
                    </ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><ChevronDown size={20} color={THEME.error} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Least Popular Achievement</ListPrimary>
                    <ListSecondary as="div">
                      <BoldText style={{ display: 'block', fontSize: '0.85rem' }}>
                        {data.achievementStats.leastPopularAchievement.name}
                      </BoldText>
                      <span>{data.achievementStats.leastPopularAchievement.description}</span>
                      <br />
                      <span style={{ color: THEME.error }}>
                        Earned by only {data.achievementStats.leastPopularAchievement.count} users
                      </span>
                    </ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
            </CardBody>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <CardHeaderStyled>Achievement Completion Rates</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Achievement completion rates chart would be displayed here in a real implementation.
                  The chart would show the percentage of users who have earned each achievement.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </div>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Achievement Earning Timeline</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Achievement earning timeline chart would be displayed here in a real implementation.
                  The chart would show achievement earning trends over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );

  // Rewards Stats tab content
  const renderRewardsTab = () => (
    <div>
      <GridContainer>
        <div>
          <GlassCard>
            <CardHeaderStyled>Reward Statistics</CardHeaderStyled>
            <CardBody>
              <ListContainer>
                <ListRow>
                  <ListIcon><Gift size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Total Rewards Redeemed</ListPrimary>
                    <ListSecondary>{data.rewardStats.totalRewardsRedeemed} rewards redeemed by all users</ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><Star size={20} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Points Spent</ListPrimary>
                    <ListSecondary>{data.rewardStats.totalPointsSpent.toLocaleString()} total points spent on rewards</ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
              <HrDivider />
              <ListContainer>
                <ListRow>
                  <ListIcon><ChevronUp size={20} color={THEME.success} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Most Redeemed Reward</ListPrimary>
                    <ListSecondary as="div">
                      <BoldText style={{ display: 'block', fontSize: '0.85rem' }}>
                        {data.rewardStats.mostRedeemedReward.name}
                      </BoldText>
                      <span>{data.rewardStats.mostRedeemedReward.description}</span>
                      <br />
                      <span style={{ color: THEME.success }}>
                        Redeemed {data.rewardStats.mostRedeemedReward.count} times
                      </span>
                    </ListSecondary>
                  </ListContent>
                </ListRow>
                <ListRow>
                  <ListIcon><ChevronDown size={20} color={THEME.error} /></ListIcon>
                  <ListContent>
                    <ListPrimary>Least Redeemed Reward</ListPrimary>
                    <ListSecondary as="div">
                      <BoldText style={{ display: 'block', fontSize: '0.85rem' }}>
                        {data.rewardStats.leastRedeemedReward.name}
                      </BoldText>
                      <span>{data.rewardStats.leastRedeemedReward.description}</span>
                      <br />
                      <span style={{ color: THEME.error }}>
                        Redeemed only {data.rewardStats.leastRedeemedReward.count} times
                      </span>
                    </ListSecondary>
                  </ListContent>
                </ListRow>
              </ListContainer>
            </CardBody>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <CardHeaderStyled>Reward Redemption Distribution</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Reward redemption distribution chart would be displayed here in a real implementation.
                  The chart would show the percentage of total redemptions for each reward.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </div>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Reward Redemption Timeline</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Reward redemption timeline chart would be displayed here in a real implementation.
                  The chart would show reward redemption trends over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );

  // Tiers tab content
  const renderTiersTab = () => (
    <div>
      <GridContainer>
        <div>
          <GlassCard>
            <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
            <CardBody>
              <StyledTableContainer>
                <StyledTable>
                  <StyledThead>
                    <tr>
                      <StyledTh>Tier</StyledTh>
                      <StyledTh>Users</StyledTh>
                      <StyledTh>Percentage</StyledTh>
                      <StyledTh>Visualization</StyledTh>
                    </tr>
                  </StyledThead>
                  <tbody>
                    {data.tierDistribution.map((tier: any) => {
                      let color: string;
                      switch (tier.tier) {
                        case 'bronze': color = '#CD7F32'; break;
                        case 'silver': color = '#C0C0C0'; break;
                        case 'gold': color = '#FFD700'; break;
                        case 'platinum': color = '#E5E4E2'; break;
                        default: color = '#1976D2';
                      }

                      return (
                        <StyledTr key={tier.tier}>
                          <StyledTd>
                            <FlexGap $gap={8}>
                              <ColorDot $color={color} />
                              <span>
                                {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                              </span>
                            </FlexGap>
                          </StyledTd>
                          <StyledTd>{tier.count}</StyledTd>
                          <StyledTd>{tier.percentage}%</StyledTd>
                          <StyledTd>
                            <ProgressTrack>
                              <ProgressFill $width={tier.percentage} $color={color} />
                            </ProgressTrack>
                          </StyledTd>
                        </StyledTr>
                      );
                    })}
                  </tbody>
                </StyledTable>
              </StyledTableContainer>
            </CardBody>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <CardHeaderStyled>Tier Distribution</CardHeaderStyled>
            <CardBody>
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <ChartPlaceholder>
                  <svg width="250" height="250" viewBox="0 0 100 100">
                    {/* Manually create a simple pie chart */}
                    <circle cx="50" cy="50" r="50" fill="rgba(255,255,255,0.05)" />

                    {/* Platinum - smallest slice */}
                    <path
                      d="M 50 50 L 50 0 A 50 50 0 0 1 64 3 Z"
                      fill="#E5E4E2"
                    />

                    {/* Gold slice */}
                    <path
                      d="M 50 50 L 64 3 A 50 50 0 0 1 90 30 Z"
                      fill="#FFD700"
                    />

                    {/* Silver slice */}
                    <path
                      d="M 50 50 L 90 30 A 50 50 0 0 1 70 90 Z"
                      fill="#C0C0C0"
                    />

                    {/* Bronze - largest slice */}
                    <path
                      d="M 50 50 L 70 90 A 50 50 0 0 1 0 50 A 50 50 0 0 1 50 0 Z"
                      fill="#CD7F32"
                    />

                    {/* Inner circle for donut effect */}
                    <circle cx="50" cy="50" r="30" fill={THEME.cardBg} />
                  </svg>

                  {/* Legend */}
                  <LegendBar>
                    {data.tierDistribution.map((tier: any) => {
                      let color: string;
                      switch (tier.tier) {
                        case 'bronze': color = '#CD7F32'; break;
                        case 'silver': color = '#C0C0C0'; break;
                        case 'gold': color = '#FFD700'; break;
                        case 'platinum': color = '#E5E4E2'; break;
                        default: color = '#1976D2';
                      }

                      return (
                        <FlexGap key={tier.tier} $gap={4}>
                          <ColorDot $color={color} $size={12} />
                          <SmallText>
                            {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                          </SmallText>
                        </FlexGap>
                      );
                    })}
                  </LegendBar>
                </ChartPlaceholder>
              </div>
            </CardBody>
          </GlassCard>
        </div>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Tier Progression Timeline</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Tier progression timeline chart would be displayed here in a real implementation.
                  The chart would show how users progress through tiers over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );

  // Trends tab content
  const renderTrendsTab = () => (
    <div>
      <GridContainer>
        <GridFull>
          <GlassCard>
            <CardHeaderStyled>System Growth</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  System growth chart would be displayed here in a real implementation.
                  The chart would show user growth, achievement completions, and reward redemptions over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </GridFull>

        <div>
          <GlassCard>
            <CardHeaderStyled>Points Economy</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  Points economy chart would be displayed here in a real implementation.
                  The chart would show points earned vs. points spent over time.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </div>

        <div>
          <GlassCard>
            <CardHeaderStyled>User Retention</CardHeaderStyled>
            <CardBody>
              <FlexCenter>
                <PlaceholderText>
                  User retention chart would be displayed here in a real implementation.
                  The chart would show user retention rates in relation to achievements and rewards.
                </PlaceholderText>
              </FlexCenter>
            </CardBody>
          </GlassCard>
        </div>

        <GridFull>
          <GlassCard>
            <CardHeaderStyled>Analytics Summary</CardHeaderStyled>
            <CardBody>
              <InsightBox>
                <BoldText style={{ display: 'block', fontSize: '0.95rem', marginBottom: 12 }}>
                  Key Insights:
                </BoldText>
                <ListContainer>
                  <ListRow>
                    <ListIcon><TrendingUp size={18} color={THEME.success} /></ListIcon>
                    <ListContent>
                      <ListSecondary style={{ color: THEME.text }}>
                        User engagement shows a positive trend, with an 8% increase in active users over the last month.
                      </ListSecondary>
                    </ListContent>
                  </ListRow>
                  <ListRow>
                    <ListIcon><Trophy size={18} color={THEME.warning} /></ListIcon>
                    <ListContent>
                      <ListSecondary style={{ color: THEME.text }}>
                        "{data.achievementStats.mostPopularAchievement.name}" is the most popular achievement, with a 90% completion rate among active users.
                      </ListSecondary>
                    </ListContent>
                  </ListRow>
                  <ListRow>
                    <ListIcon><Gift size={18} color={THEME.accent} /></ListIcon>
                    <ListContent>
                      <ListSecondary style={{ color: THEME.text }}>
                        "{data.rewardStats.mostRedeemedReward.name}" is the most redeemed reward, accounting for 36% of all reward redemptions.
                      </ListSecondary>
                    </ListContent>
                  </ListRow>
                  <ListRow>
                    <ListIcon><Award size={18} color="#FFD700" /></ListIcon>
                    <ListContent>
                      <ListSecondary style={{ color: THEME.text }}>
                        The Gold tier is seeing increased progression, with a 17% growth in users reaching this tier.
                      </ListSecondary>
                    </ListContent>
                  </ListRow>
                </ListContainer>
              </InsightBox>

              <PrimaryButton>
                <BarChart size={18} />
                Generate Full Reports
              </PrimaryButton>
            </CardBody>
          </GlassCard>
        </GridFull>
      </GridContainer>
    </div>
  );

  return (
    <Container>
      <Heading2>
        Gamification System Analytics
      </Heading2>

      <BodyText>
        View comprehensive analytics for your gamification system. Use these insights to optimize engagement and user experience.
      </BodyText>

      {/* Tabs navigation */}
      {renderAnalyticsTabs()}

      {/* Time range selector - only on relevant tabs */}
      {(activeTab === 'trends' || activeTab === 'users') && renderTimeRange()}

      {/* Tab content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'achievements' && renderAchievementsTab()}
      {activeTab === 'rewards' && renderRewardsTab()}
      {activeTab === 'tiers' && renderTiersTab()}
      {activeTab === 'trends' && renderTrendsTab()}
    </Container>
  );
};

export default React.memo(SystemAnalytics);
