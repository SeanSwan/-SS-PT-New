/**
 * ClientRewardsPage
 * Mounted client rewards route for tier, XP, achievements, point history, and badges.
 * Data source: useGamificationData -> GET /api/v1/gamification/profile.
 */
import React from 'react';
import { Award, Crown, Flame, Gem, Shield, Star, Target, TrendingUp, Trophy, Zap } from 'lucide-react';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import {
  SAFE_REWARDS_ERROR_COPY,
  buildRewardsViewModel,
  describeTransaction,
  formatTransactionPoints,
  getAchievementRowKey,
  getAchievementDescription,
  getAchievementName,
  getAchievementRarity,
  getSourceLabel,
  getTransactionRowKey,
} from './ClientRewardsPage.logic';
import {
  ActivityRow,
  BadgeGrid,
  BadgeTile,
  ConsoleCard,
  ConsoleLabel,
  ConsoleValue,
  EmptyState,
  ErrorBox,
  Eyebrow,
  HeroCopy,
  HeroGrid,
  HeroPanel,
  IconSlot,
  LoadingShell,
  PageWrap,
  PanelGrid,
  PointsPill,
  ProgressFill,
  ProgressTrack,
  RankChip,
  RankConsole,
  RankLine,
  RowCopy,
  SectionCard,
  ShimmerBlock,
  XpLabel,
} from './ClientRewardsPage.styles';

const ClientRewardsPage: React.FC = () => {
  const gamification = useGamificationData();
  const profile = gamification.profile.data;
  const hasError = Boolean(gamification.profile.error || gamification.error);
  const hasProfileOutage = Boolean(hasError && !profile);

  if (gamification.isLoading || gamification.profile.isLoading) {
    return (
      <PageWrap>
        <LoadingShell aria-label="Loading rewards command center">
          <ShimmerBlock $height="240px" />
          <ShimmerBlock $height="180px" />
        </LoadingShell>
      </PageWrap>
    );
  }

  if (hasProfileOutage) {
    return (
      <PageWrap>
        <ErrorBox role="status">{SAFE_REWARDS_ERROR_COPY}</ErrorBox>
      </PageWrap>
    );
  }

  const view = buildRewardsViewModel(profile);

  return (
    <PageWrap>
      {hasError && <ErrorBox role="status">{SAFE_REWARDS_ERROR_COPY}</ErrorBox>}

      <HeroPanel>
        <HeroGrid>
          <HeroCopy>
            <Eyebrow><Trophy aria-hidden="true" size={16} /> Rewards Command</Eyebrow>
            <h1>{view.tier.name}</h1>
            <p>
              Your SwanStudios rank board turns real workout proof into XP,
              badges, streak pressure, and the next training objective.
            </p>
            <RankLine>
              <RankChip><Crown aria-hidden="true" size={16} /> Level {view.level}</RankChip>
              <RankChip><Zap aria-hidden="true" size={16} /> {view.pointsLabel}</RankChip>
              <RankChip><Flame aria-hidden="true" size={16} /> {view.streakLabel}</RankChip>
            </RankLine>
          </HeroCopy>

          <RankConsole aria-label="Rank progression console">
            <ConsoleCard>
              <ConsoleLabel>Rank progression</ConsoleLabel>
              <ConsoleValue>{view.progress}%</ConsoleValue>
              <ProgressTrack
                aria-label="Rank progression"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={view.progress}
                role="progressbar"
              >
                <ProgressFill $color={view.tier.color} $pct={view.progress} />
              </ProgressTrack>
              <XpLabel>
                <span>{view.pointsLabel}</span>
                <span>{view.nextLevelLabel}</span>
              </XpLabel>
            </ConsoleCard>
            <ConsoleCard>
              <ConsoleLabel>Next objective</ConsoleLabel>
              <p>{view.nextObjective}</p>
            </ConsoleCard>
          </RankConsole>
        </HeroGrid>
      </HeroPanel>

      <PanelGrid>
        <SectionCard aria-label="Reward signals">
          <h2><Target aria-hidden="true" size={18} /> Signals</h2>
          <ActivityRow>
            <IconSlot><Flame aria-hidden="true" size={18} /></IconSlot>
            <RowCopy><strong>{view.streakLabel}</strong><span>Current adherence chain</span></RowCopy>
            <PointsPill>{view.leaderboardLabel}</PointsPill>
          </ActivityRow>
          <ActivityRow>
            <IconSlot><TrendingUp aria-hidden="true" size={18} /></IconSlot>
            <RowCopy><strong>{view.workoutLabel}</strong><span>Logged training sessions</span></RowCopy>
            <PointsPill>{view.tier.shortName}</PointsPill>
          </ActivityRow>
        </SectionCard>

        <SectionCard aria-label="Recent achievements">
          <h2><Award aria-hidden="true" size={18} /> Recent Achievements</h2>
          {view.achievements.length === 0 ? (
            <EmptyState>Complete workouts and challenges to earn achievements.</EmptyState>
          ) : (
            view.achievements.slice(0, 5).map((achievement) => (
              <ActivityRow key={getAchievementRowKey(achievement)}>
                <IconSlot $rarity={getAchievementRarity(achievement)}>
                  <Star aria-hidden="true" size={17} />
                </IconSlot>
                <RowCopy>
                  <strong>{getAchievementName(achievement)}</strong>
                  <span>{getAchievementDescription(achievement)}</span>
                </RowCopy>
                <PointsPill>{getAchievementRarity(achievement)}</PointsPill>
              </ActivityRow>
            ))
          )}
        </SectionCard>

        <SectionCard aria-label="Badge showcase">
          <h2><Gem aria-hidden="true" size={18} /> Badge Loadout</h2>
          {view.achievements.length === 0 ? (
            <EmptyState>Earned badges appear here after achievements are completed.</EmptyState>
          ) : (
            <BadgeGrid>
              {view.achievements.slice(0, 4).map((achievement) => (
                <BadgeTile key={`badge-${getAchievementRowKey(achievement)}`} title={getAchievementName(achievement)}>
                  <Shield aria-hidden="true" size={24} />
                  <span>{getAchievementName(achievement)}</span>
                </BadgeTile>
              ))}
            </BadgeGrid>
          )}
        </SectionCard>

        <SectionCard aria-label="Point history">
          <h2><TrendingUp aria-hidden="true" size={18} /> Point History</h2>
          {view.transactions.length === 0 ? (
            <EmptyState>XP activity appears after workouts, social posts, streaks, and reward actions.</EmptyState>
          ) : (
            view.transactions.slice(0, 5).map((tx) => (
              <ActivityRow key={getTransactionRowKey(tx)}>
                <IconSlot><Zap aria-hidden="true" size={17} /></IconSlot>
                <RowCopy>
                  <strong>{describeTransaction(tx)}</strong>
                  <span>{getSourceLabel(tx.source)}</span>
                </RowCopy>
                <PointsPill>{formatTransactionPoints(tx)}</PointsPill>
              </ActivityRow>
            ))
          )}
        </SectionCard>
      </PanelGrid>
    </PageWrap>
  );
};

export default ClientRewardsPage;
