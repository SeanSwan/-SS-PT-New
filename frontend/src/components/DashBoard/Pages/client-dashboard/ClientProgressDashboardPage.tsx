/**
 * COMPONENT: ClientProgressDashboardPage
 * PURPOSE: Canonical client progress route for weekly proof, PRs, and charts.
 * DATA: authenticated user -> weekly recap + personal records + 12 chart grid.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Dumbbell, TrendingUp, Trophy, Zap } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useSubscription } from '../../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../../Shared/CrystallineLockOverlay';
import {
  Card,
  CardTitle,
  ChartsLoading,
  ChartsSection,
  ChartsSectionHeader,
  DetailedLink,
  LabelStar,
  PageHeader,
  PageTitle,
  PageWrap,
  RecapGrid,
  RecapItem,
  RecapLabel,
  RecapValue,
  Skeleton,
  SplitRow,
  StatCard,
  StatLabel,
  StatsStrip,
  StatSub,
  StatValue,
  TrailingChevron,
  XpBarFill,
  XpBarLabel,
  XpBarPct,
  XpBarTrack,
  XpBarWrap,
} from './ClientProgressDashboardPage.styles';

// Do not re-introduce ProfileChartsGrid on /dashboard/client/progress.
// The canonical chart registry is owned by CanonicalProgressChartsGrid + useClientProgressCharts.
const CanonicalProgressChartsGrid = React.lazy(
  () => import('./CanonicalProgressChartsGrid')
);
const CompanionPet = React.lazy(
  () => import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')
);

const TIER_COLORS: Record<string, string> = {
  bronze: 'var(--tier-bronze, #CD7F32)',
  silver: 'var(--tier-silver, #C0C0C0)',
  gold: 'var(--tier-gold, #C6A84B)',
  platinum: 'var(--accent-secondary, #8B5CF6)',
  bronze_forge: 'var(--tier-bronze, #CD7F32)',
  silver_edge: 'var(--tier-silver, #C0C0C0)',
  titanium_core: 'var(--tier-gold, #C6A84B)',
  obsidian_warrior: 'var(--bg-base, #0A0A0F)',
  crystalline_swan: 'var(--accent-primary, #60C0F0)',
};

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze Forge',
  silver: 'Silver Edge',
  gold: 'Titanium Core',
  platinum: 'Obsidian+',
  bronze_forge: 'Bronze Forge',
  silver_edge: 'Silver Edge',
  titanium_core: 'Titanium Core',
  obsidian_warrior: 'Obsidian Warrior',
  crystalline_swan: 'Crystalline Swan',
};

interface WeeklyRecap {
  thisWeek?: {
    workouts?: number;
    surpriseMultipliers?: number;
    totalXP?: number;
  };
  current?: {
    streak?: number;
  };
}

interface PersonalRecord {
  exerciseName?: string;
  exercise?: string;
  weight?: string | number;
  estimated1RM?: string | number;
  value?: string | number;
  unit?: string;
  reps?: string | number;
  date?: string;
}

const ClientProgressDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const { profile } = useGamificationData();
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAdvancedAccess = isPro || isElite || isTrial;
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    if (!authAxios || !user?.id) return;
    authAxios.get(`/api/gamification/users/${user.id}/weekly-recap`)
      .then(res => {
        const payload = res.data as unknown;
        const recap = (
          typeof payload === 'object' &&
          payload !== null &&
          'data' in payload
        )
          ? (payload as { data?: WeeklyRecap }).data ?? null
          : payload as WeeklyRecap;
        setWeeklyRecap(recap ?? null);
      })
      .catch(() => { /* weekly recap is non-blocking */ });
  }, [authAxios, user?.id]);

  useEffect(() => {
    if (!authAxios || !user?.id) return;
    // Client-safe namespace: userId is derived from JWT, never from URL.
    authAxios.get(`/api/client/analytics/personal-records`)
      .then(res => {
        const payload = res.data as { data?: unknown; records?: unknown };
        const records = payload.data ?? payload.records ?? [];
        setPersonalRecords(Array.isArray(records) ? records as PersonalRecord[] : []);
      })
      .catch(() => setPersonalRecords([]));
  }, [authAxios, user?.id]);

  const p = profile.data;
  const tierColor = TIER_COLORS[p?.tier || 'bronze'] || 'var(--tier-bronze, #CD7F32)';
  const tierLabel = TIER_LABELS[p?.tier || 'bronze'] || 'Bronze Forge';
  const streakDays = (weeklyRecap?.current?.streak ?? p?.streakDays) || 0;

  return (
    <PageWrap>
      <PageHeader>
        <PageTitle><TrendingUp size={22} /> My Progress</PageTitle>
      </PageHeader>

      <StatsStrip>
        <StatCard $delay={0} $accent={tierColor}>
          <StatLabel>Level</StatLabel>
          <StatValue $color="var(--accent-primary, #60C0F0)">{p?.level || 1}</StatValue>
        </StatCard>
        <StatCard $delay={1} $accent={tierColor}>
          <StatLabel>Tier</StatLabel>
          <StatValue $color={tierColor}>{tierLabel}</StatValue>
        </StatCard>
        <StatCard $delay={2}>
          <StatLabel>Total XP</StatLabel>
          <StatValue>{(p?.points || 0).toLocaleString()}</StatValue>
        </StatCard>
        <StatCard $delay={3}>
          <StatLabel>Wk Workouts</StatLabel>
          <StatValue $color="var(--accent-secondary, #8B5CF6)">
            {weeklyRecap?.thisWeek?.workouts ?? 0}
          </StatValue>
        </StatCard>
        <StatCard $delay={4}>
          <StatLabel>Streak</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">{streakDays}d</StatValue>
        </StatCard>
        <StatCard $delay={5}>
          <StatLabel>PRs</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">
            {personalRecords.length}
          </StatValue>
        </StatCard>
      </StatsStrip>

      <XpBarWrap>
        <XpBarLabel>
          <LabelStar size={14} />
          Level {p?.level || 1}{' -> '}{(p?.level || 1) + 1}
        </XpBarLabel>
        <XpBarTrack>
          <XpBarFill $pct={p?.nextLevelProgress || 0} />
        </XpBarTrack>
        <XpBarPct>{p?.nextLevelProgress || 0}%</XpBarPct>
      </XpBarWrap>

      <SplitRow>
        <Card>
          <CardTitle>Your Companion</CardTitle>
          {user?.id ? (
            <Suspense fallback={<Skeleton $h="140px" />}>
              <CompanionPet userId={user.id as unknown as number} size={120} compact showControls={false} />
            </Suspense>
          ) : (
            <Skeleton $h="120px" />
          )}
        </Card>

        <Card>
          <CardTitle><Calendar size={16} /> This Week</CardTitle>
          {weeklyRecap ? (
            <RecapGrid>
              <RecapItem>
                <RecapValue>{weeklyRecap?.thisWeek?.workouts ?? 0}</RecapValue>
                <RecapLabel>Workouts</RecapLabel>
              </RecapItem>
              <RecapItem>
                <RecapValue>{weeklyRecap?.thisWeek?.surpriseMultipliers ?? 0}</RecapValue>
                <RecapLabel>Bonuses</RecapLabel>
              </RecapItem>
              <RecapItem>
                <RecapValue>{weeklyRecap?.thisWeek?.totalXP ?? 0}</RecapValue>
                <RecapLabel>XP Earned</RecapLabel>
              </RecapItem>
              <RecapItem>
                <RecapValue>{streakDays}</RecapValue>
                <RecapLabel>Streak Days</RecapLabel>
              </RecapItem>
            </RecapGrid>
          ) : (
            <RecapGrid>
              {[1, 2, 3, 4].map(i => (
                <RecapItem key={i}>
                  <Skeleton $h="28px" $w="60px" />
                  <Skeleton $h="10px" $w="50px" />
                </RecapItem>
              ))}
            </RecapGrid>
          )}
        </Card>
      </SplitRow>

      {personalRecords.length > 0 && (
        <Card $bottom="1.25rem">
          <CardTitle><Trophy size={16} /> Personal Records</CardTitle>
          <StatsStrip $bottom="0">
            {personalRecords.slice(0, 4).map((pr: PersonalRecord, i: number) => (
              <StatCard key={`${pr.exerciseName || pr.exercise || 'pr'}-${i}`} $delay={i} $accent="var(--accent-gold, #C6A84B)">
                <StatLabel>{pr.exerciseName || pr.exercise || 'Exercise'}</StatLabel>
                <StatValue $color="var(--accent-gold, #C6A84B)">
                  {pr.weight || pr.estimated1RM || pr.value || '-'}
                  {pr.unit || 'lbs'}
                </StatValue>
                <StatSub>{pr.reps ? `${pr.reps} reps` : pr.date || ''}</StatSub>
              </StatCard>
            ))}
          </StatsStrip>
        </Card>
      )}

      <ChartsSection>
        <ChartsSectionHeader>
          <CardTitle $bottom="0">
            <Zap size={16} /> Progress Charts
          </CardTitle>
        </ChartsSectionHeader>
        {user?.id ? (
          <Suspense fallback={<ChartsLoading>Loading charts...</ChartsLoading>}>
            <CanonicalProgressChartsGrid userId={user.id} />
          </Suspense>
        ) : (
          <Skeleton $h="300px" />
        )}
      </ChartsSection>

      <CrystallineLockOverlay
        isLocked={!hasAdvancedAccess}
        featureName="Detailed NASM Analytics"
        description="14 advanced charts with body composition, strength curves, and periodization insights"
        ctaLabel="Upgrade to Swan Guardian"
        onConfigure={() => navigate('/ascension')}
      >
        <DetailedLink onClick={() => navigate('/dashboard/client/progress/detailed')}>
          <Dumbbell size={18} />
          View Detailed NASM Analytics (14 Charts)
          <TrailingChevron size={16} />
        </DetailedLink>
      </CrystallineLockOverlay>
    </PageWrap>
  );
};

export default ClientProgressDashboardPage;
