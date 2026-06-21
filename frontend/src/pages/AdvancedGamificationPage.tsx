import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Award, Crown, Gift, Shield, Star, Trophy, Users, Zap } from 'lucide-react';
import {
  type LeaderboardEntry,
  type PointTransaction,
  type UserAchievement,
  useGamificationData,
} from '../hooks/gamification/useGamificationData';
import {
  ActionLink,
  ContentGrid,
  EmptyText,
  Eyebrow,
  HeroActions,
  HeroBand,
  HeroCopy,
  IconSlot,
  ListRow,
  LoadingGrid,
  MiniBadge,
  PageShell,
  PanelHeading,
  PanelTitle,
  ProgressFill,
  ProgressPanel,
  ProgressTrack,
  ProgressValue,
  RankBadge,
  SectionPanel,
  Shimmer,
  StatCard,
  StatText,
  StatsGrid,
  StatusBanner,
} from './AdvancedGamificationPage.styles';
import {
  getAchievementDescription,
  getAchievementName,
  clampGamificationPercent,
  formatGamificationLevel,
  formatGamificationNumber,
  formatGamificationRank,
  getLeaderboardClientName,
  getLeaderboardLevel,
  getLeaderboardRowKey,
  getRewardPointCost,
  getRewardName,
  getTransactionDescription,
  getTransactionPointLabel,
} from './AdvancedGamificationPage.logic';

interface AdvancedGamificationPageProps {
  className?: string;
}

type RewardDisplay = {
  id: string;
  name?: string;
  pointCost?: number;
  pointsCost?: number;
  reward?: { name?: string };
};

const SAFE_GAMIFICATION_ERROR_COPY = 'Gamification data could not be refreshed.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asDisplayRows = <T,>(value: unknown, keys: string[]): T[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((row) => {
    if (!isRecord(row) || row.success === false) return false;
    return keys.some((key) => row[key] !== undefined && row[key] !== null);
  }) as T[];
};

const getDisplayRowKey = (item: unknown, prefix: string, index: number) => {
  const row = isRecord(item) ? item : {};
  const id = row.id ?? row.rewardId ?? row.achievementId;
  if (typeof id === 'string' || typeof id === 'number') return `${prefix}-${id}`;
  return `${prefix}-${index}`;
};

const AdvancedGamificationPage: React.FC<AdvancedGamificationPageProps> = ({ className }) => {
  const gamification = useGamificationData();
  const profile = gamification.profile.data;
  const achievements = asDisplayRows<UserAchievement>(
    profile?.achievements,
    ['id', 'achievementId', 'achievement', 'name', 'title', 'description', 'pointsAwarded']
  );
  const queryRewards = asDisplayRows<RewardDisplay>(
    gamification.rewards.data,
    ['id', 'rewardId', 'reward', 'name', 'pointCost', 'pointsCost']
  );
  const profileRewards = asDisplayRows<RewardDisplay>(
    profile?.rewards,
    ['id', 'rewardId', 'reward', 'name', 'pointCost', 'pointsCost']
  );
  const rewards = (
    queryRewards.length ? queryRewards : profileRewards
  ) as RewardDisplay[];
  const leaderboard = asDisplayRows<LeaderboardEntry>(
    gamification.leaderboard.data,
    ['userId', 'id', 'client', 'firstName', 'lastName', 'name', 'fullName', 'username', 'overallLevel', 'level', 'points']
  );
  const transactions = asDisplayRows<PointTransaction>(
    profile?.recentTransactions,
    ['id', 'description', 'source', 'points', 'transactionType']
  );
  const error = gamification.profile.error || gamification.error;
  const hasProfileOutage = Boolean(error && !profile);
  const nextLevelProgress = clampGamificationPercent(profile?.nextLevelProgress);

  return (
    <>
      <Helmet>
        <title>Gamification Hub - SwanStudios</title>
        <meta
          name="description"
          content="SwanStudios rewards, achievements, XP, and leaderboard progress."
        />
      </Helmet>

      <PageShell className={className}>
        <HeroBand>
          <HeroCopy>
            <Eyebrow><Trophy size={16} /> Rewards Command</Eyebrow>
            <h1>Train, level, rally</h1>
            <p>Mission-control for workout proof, streak pressure, unlocks, and the squad board.</p>
          </HeroCopy>
          <HeroActions>
            <ActionLink to="/dashboard/client/rewards">Rewards</ActionLink>
            <ActionLink to="/user-dashboard/challenges">Challenges</ActionLink>
          </HeroActions>
        </HeroBand>

        {error && !hasProfileOutage && (
          <StatusBanner role="status">
            {SAFE_GAMIFICATION_ERROR_COPY}
          </StatusBanner>
        )}

        {gamification.isLoading || gamification.profile.isLoading ? (
          <LoadingGrid aria-label="Loading gamification data">
            <Shimmer />
            <Shimmer />
            <Shimmer />
            <Shimmer />
          </LoadingGrid>
        ) : hasProfileOutage ? (
          <StatusBanner role="status">
            {SAFE_GAMIFICATION_ERROR_COPY}
          </StatusBanner>
        ) : (
          <>
            <StatsGrid>
              <StatCard>
                <IconSlot><Zap size={22} /></IconSlot>
                <StatText>
                  <span>XP</span>
                  <strong>{formatGamificationNumber(profile?.points)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Crown size={22} /></IconSlot>
                <StatText>
                  <span>Level</span>
                  <strong>{formatGamificationLevel(profile?.level)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Award size={22} /></IconSlot>
                <StatText>
                  <span>Achievements</span>
                  <strong>{formatGamificationNumber(achievements.length)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Users size={22} /></IconSlot>
                <StatText>
                  <span>Leaderboard</span>
                  <strong>{formatGamificationRank(profile?.leaderboardPosition)}</strong>
                </StatText>
              </StatCard>
            </StatsGrid>

            <ProgressPanel>
              <PanelHeading>
                <div>
                  <span>Next level</span>
                  <h2>{formatGamificationNumber(profile?.nextLevelPoints)} XP target</h2>
                </div>
                <ProgressValue>{nextLevelProgress}%</ProgressValue>
              </PanelHeading>
              <ProgressTrack
                aria-label="Next level progress"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={nextLevelProgress}
                role="progressbar"
              >
                <ProgressFill $pct={nextLevelProgress} />
              </ProgressTrack>
            </ProgressPanel>

            <ContentGrid>
              <SectionPanel>
                <PanelTitle><Star size={18} /> Recent Achievements</PanelTitle>
                {achievements.length === 0 ? (
                  <EmptyText>Earned achievements will appear after logged workouts and challenges.</EmptyText>
                ) : (
                  achievements.slice(0, 4).map((item, index) => (
                    <ListRow key={getDisplayRowKey(item, 'achievement', index)}>
                      <MiniBadge><Shield size={15} /></MiniBadge>
                      <div>
                        <strong>{getAchievementName(item)}</strong>
                        <span>{getAchievementDescription(item)}</span>
                      </div>
                    </ListRow>
                  ))
                )}
              </SectionPanel>

              <SectionPanel>
                <PanelTitle><Gift size={18} /> Rewards</PanelTitle>
                {rewards.length === 0 ? (
                  <EmptyText>Available rewards will show here when the catalog is active.</EmptyText>
                ) : (
                  rewards.slice(0, 4).map((item, index) => (
                    <ListRow key={getDisplayRowKey(item, 'reward', index)}>
                      <MiniBadge><Gift size={15} /></MiniBadge>
                      <div>
                        <strong>{getRewardName(item)}</strong>
                        <span>{formatGamificationNumber(getRewardPointCost(item))} XP</span>
                      </div>
                    </ListRow>
                  ))
                )}
              </SectionPanel>

              <SectionPanel>
                <PanelTitle><Zap size={18} /> Point History</PanelTitle>
                {transactions.length === 0 ? (
                  <EmptyText>XP activity will appear after workouts, streaks, and reward actions.</EmptyText>
                ) : (
                  transactions.slice(0, 4).map((item, index) => (
                    <ListRow key={getDisplayRowKey(item, 'transaction', index)}>
                      <MiniBadge><Zap size={15} /></MiniBadge>
                      <div>
                        <strong>{getTransactionDescription(item)}</strong>
                        <span>{getTransactionPointLabel(item)}</span>
                      </div>
                    </ListRow>
                  ))
                )}
              </SectionPanel>

              <SectionPanel>
                <PanelTitle><Trophy size={18} /> Leaderboard</PanelTitle>
                {leaderboard.length === 0 ? (
                  <EmptyText>Leaderboard entries appear as clients build XP history.</EmptyText>
                ) : (
                  leaderboard.slice(0, 4).map((entry, rankIndex) => (
                    <ListRow key={getLeaderboardRowKey(entry, rankIndex)}>
                      <RankBadge>{rankIndex + 1}</RankBadge>
                      <div>
                        <strong>{getLeaderboardClientName(entry)}</strong>
                        <span>Level {formatGamificationLevel(getLeaderboardLevel(entry))}</span>
                      </div>
                    </ListRow>
                  ))
                )}
              </SectionPanel>
            </ContentGrid>
          </>
        )}
      </PageShell>
    </>
  );
};

export default AdvancedGamificationPage;
