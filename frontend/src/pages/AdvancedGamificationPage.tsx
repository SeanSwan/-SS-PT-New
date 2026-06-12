import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Award, Crown, Gift, Shield, Star, Trophy, Users, Zap } from 'lucide-react';
import { useGamificationData } from '../hooks/gamification/useGamificationData';
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

const formatNumber = (value?: number | null) => Number(value || 0).toLocaleString();

const formatRank = (rank?: number | null) => {
  if (!rank || rank < 1) return 'Not ranked';
  const mod10 = rank % 10;
  const mod100 = rank % 100;
  const suffix = mod10 === 1 && mod100 !== 11 ? 'st' : mod10 === 2 && mod100 !== 12 ? 'nd' : mod10 === 3 && mod100 !== 13 ? 'rd' : 'th';
  return `${rank}${suffix}`;
};

const AdvancedGamificationPage: React.FC<AdvancedGamificationPageProps> = ({ className }) => {
  const gamification = useGamificationData();
  const profile = gamification.profile.data;
  const achievements = profile?.achievements || [];
  const rewards = (
    gamification.rewards.data?.length ? gamification.rewards.data : profile?.rewards || []
  ) as RewardDisplay[];
  const leaderboard = gamification.leaderboard.data || [];
  const transactions = profile?.recentTransactions || [];
  const error = gamification.profile.error || gamification.error;

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
            <Eyebrow><Trophy size={16} /> Gamification Hub</Eyebrow>
            <h1>XP, rewards, and milestones</h1>
            <p>Live progress from your SwanStudios gamification profile.</p>
          </HeroCopy>
          <HeroActions>
            <ActionLink to="/dashboard/client/rewards">Rewards</ActionLink>
            <ActionLink to="/user-dashboard/challenges">Challenges</ActionLink>
          </HeroActions>
        </HeroBand>

        {error && (
          <StatusBanner role="status">
            {(error as Error).message || 'Gamification data could not be refreshed.'}
          </StatusBanner>
        )}

        {gamification.isLoading || gamification.profile.isLoading ? (
          <LoadingGrid aria-label="Loading gamification data">
            <Shimmer />
            <Shimmer />
            <Shimmer />
            <Shimmer />
          </LoadingGrid>
        ) : (
          <>
            <StatsGrid>
              <StatCard>
                <IconSlot><Zap size={22} /></IconSlot>
                <StatText>
                  <span>XP</span>
                  <strong>{formatNumber(profile?.points)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Crown size={22} /></IconSlot>
                <StatText>
                  <span>Level</span>
                  <strong>{formatNumber(profile?.level || 1)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Award size={22} /></IconSlot>
                <StatText>
                  <span>Achievements</span>
                  <strong>{formatNumber(achievements.length)}</strong>
                </StatText>
              </StatCard>
              <StatCard>
                <IconSlot><Users size={22} /></IconSlot>
                <StatText>
                  <span>Leaderboard</span>
                  <strong>{formatRank(profile?.leaderboardPosition)}</strong>
                </StatText>
              </StatCard>
            </StatsGrid>

            <ProgressPanel>
              <PanelHeading>
                <div>
                  <span>Next level</span>
                  <h2>{formatNumber(profile?.nextLevelPoints)} XP target</h2>
                </div>
                <ProgressValue>{Math.round(profile?.nextLevelProgress || 0)}%</ProgressValue>
              </PanelHeading>
              <ProgressTrack aria-label="Next level progress">
                <ProgressFill $pct={profile?.nextLevelProgress || 0} />
              </ProgressTrack>
            </ProgressPanel>

            <ContentGrid>
              <SectionPanel>
                <PanelTitle><Star size={18} /> Recent Achievements</PanelTitle>
                {achievements.length === 0 ? (
                  <EmptyText>Earned achievements will appear after logged workouts and challenges.</EmptyText>
                ) : (
                  achievements.slice(0, 4).map((item) => (
                    <ListRow key={item.id}>
                      <MiniBadge><Shield size={15} /></MiniBadge>
                      <div>
                        <strong>{item.achievement?.name || 'Achievement'}</strong>
                        <span>{item.achievement?.description || `${item.pointsAwarded || 0} XP awarded`}</span>
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
                  rewards.slice(0, 4).map((item) => (
                    <ListRow key={item.id}>
                      <MiniBadge><Gift size={15} /></MiniBadge>
                      <div>
                        <strong>{item.reward?.name || item.name || 'Reward'}</strong>
                        <span>{formatNumber(item.pointsCost || item.pointCost)} XP</span>
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
                  transactions.slice(0, 4).map((item) => (
                    <ListRow key={item.id}>
                      <MiniBadge><Zap size={15} /></MiniBadge>
                      <div>
                        <strong>{item.description || item.source || 'XP activity'}</strong>
                        <span>{item.transactionType === 'spend' ? '-' : '+'}{formatNumber(item.points)} XP</span>
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
                  leaderboard.slice(0, 4).map((entry, index) => (
                    <ListRow key={entry.userId || index}>
                      <RankBadge>{index + 1}</RankBadge>
                      <div>
                        <strong>{entry.client?.firstName || 'Client'} {entry.client?.lastName || ''}</strong>
                        <span>Level {entry.overallLevel || 1}</span>
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
