/**
 * COMPONENT: ClientProgressDashboardPage
 * PURPOSE: Canonical client progress route for weekly proof, PRs, and charts.
 * DATA: authenticated user -> weekly recap + personal records + 12 chart grid.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  getSafeGamificationIdSegment,
  useGamificationData,
} from '../../../../hooks/gamification/useGamificationData';
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
  Skeleton,
  SplitRow,
  StatCard,
  StatLabel,
  StatsStrip,
  StatValue,
  TrailingChevron,
  XpBarFill,
  XpBarLabel,
  XpBarPct,
  XpBarTrack,
  XpBarWrap,
} from './ClientProgressDashboardPage.styles';
import { getClientProgressDashboardMetrics, type WeeklyRecap } from './ClientProgressDashboardPage.metrics';
import {
  normalizeClientPersonalRecords,
  type PersonalRecordView,
} from './ClientProgressDashboardPage.records';
import { loadClientWeeklyRecap } from './ClientProgressDashboardPage.recap';
import { FirstWorkoutCta, PersonalRecordsCard, WeeklyRecapCard } from './ClientProgressDashboardPage.cards';
import ClientProgressLensFrame from './ClientProgressLensFrame';
import ProgressPulsePanel from './ProgressPulsePanel';
import WeeklyRingsCard from './WeeklyRingsCard';
// Do not re-introduce ProfileChartsGrid on /dashboard/client/progress.
// The canonical chart registry is owned by CanonicalProgressChartsGrid + useClientProgressCharts.
const CanonicalProgressChartsGrid = React.lazy(
  () => import('./CanonicalProgressChartsGrid')
);
const CompanionPet = React.lazy(
  () => import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')
);

const ClientProgressDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const { profile } = useGamificationData();
  const { hasGuardianAccess } = useSubscription();
  const hasAdvancedAccess = hasGuardianAccess;
  const companionPetUserIdSegment = getSafeGamificationIdSegment(user?.id);
  const companionPetUserId = companionPetUserIdSegment ? Number(companionPetUserIdSegment) : null;
  const canRenderCompanionPet = companionPetUserId !== null;
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [weeklyRecapSettled, setWeeklyRecapSettled] = useState(false);
  // Distinguishes a recap network error from a legitimately empty recap so the
  // stats strip does not render "0 workouts / 0d streak" during an outage — an
  // outage must not look identical to a client who genuinely did nothing.
  const [weeklyRecapError, setWeeklyRecapError] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecordView[]>([]);
  // Same honesty rule as weeklyRecapError: a PR-fetch failure must not render
  // as "0 PRs" — zero is a real number that means "no records yet".
  const [personalRecordsError, setPersonalRecordsError] = useState(false);

  useEffect(() => {
    let isMounted = true; const cleanup = () => { isMounted = false; };
    setWeeklyRecapSettled(false);
    setWeeklyRecapError(false);

    if (!authAxios || !user?.id) {
      setWeeklyRecap(null);
      setWeeklyRecapSettled(true);
      return cleanup;
    }

    const weeklyRecapUserIdSegment = getSafeGamificationIdSegment(user.id);
    if (!weeklyRecapUserIdSegment) {
      setWeeklyRecap(null);
      setWeeklyRecapSettled(true);
      return cleanup;
    }

    loadClientWeeklyRecap(authAxios, weeklyRecapUserIdSegment)
      .then(recap => {
        if (!isMounted) return;
        setWeeklyRecap(recap ?? null);
      })
      .catch(() => {
        if (isMounted) { setWeeklyRecap(null); setWeeklyRecapError(true); }
      })
      .finally(() => {
        if (isMounted) setWeeklyRecapSettled(true);
      });

    return cleanup;
  }, [authAxios, user?.id]);

  useEffect(() => {
    if (!authAxios || !user?.id) return;
    setPersonalRecordsError(false);
    // Client-safe namespace: userId is derived from JWT, never from URL.
    authAxios.get(`/api/client/analytics/personal-records`)
      .then(res => {
        const payload = res.data as { data?: unknown; records?: unknown };
        const records = payload.data ?? payload.records ?? [];
        setPersonalRecords(normalizeClientPersonalRecords(records));
      })
      .catch(() => { setPersonalRecords([]); setPersonalRecordsError(true); });
  }, [authAxios, user?.id]);

  const p = profile.data;
  const {
    level,
    totalXp,
    nextLevelProgress,
    weekWorkouts,
    weekBonuses,
    weekXp,
    streakDays,
    tierColor,
    tierLabel,
  } = getClientProgressDashboardMetrics(p, weeklyRecap);

  return (
    <ClientProgressLensFrame>
    <PageWrap>
      <PageHeader>
        <PageTitle className="lens2-display"><TrendingUp size={22} /> My Progress</PageTitle>
      </PageHeader>

      <StatsStrip>
        <StatCard $delay={0} $accent={tierColor}>
          <StatLabel>Level</StatLabel>
          <StatValue $color="var(--accent-primary, #60C0F0)">{level}</StatValue>
        </StatCard>
        <StatCard $delay={1} $accent={tierColor}>
          <StatLabel>Tier</StatLabel>
          <StatValue $color={tierColor}>{tierLabel}</StatValue>
        </StatCard>
        <StatCard $delay={2}>
          <StatLabel>Total XP</StatLabel>
          <StatValue>{totalXp.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard
          $delay={3}
          data-testid="client-progress-week-workouts"
          aria-label={`Weekly workouts ${weekWorkouts}`}
        >
          <StatLabel>Wk Workouts</StatLabel>
          <StatValue $color="var(--accent-secondary, #8B5CF6)">
            {weeklyRecapError ? '—' : weekWorkouts}
          </StatValue>
        </StatCard>
        <StatCard $delay={4}>
          <StatLabel>Streak</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">
            {weeklyRecapError ? '—' : `${streakDays}d`}
          </StatValue>
        </StatCard>
        <StatCard $delay={5}>
          <StatLabel>PRs</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">
            {personalRecordsError ? '—' : personalRecords.length}
          </StatValue>
        </StatCard>
      </StatsStrip>

      <XpBarWrap>
        <XpBarLabel>
          <LabelStar size={14} />
          Level {level}{' -> '}{level + 1}
        </XpBarLabel>
        <XpBarTrack
          role="progressbar"
          aria-label="Level progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={nextLevelProgress}
        >
          <XpBarFill $pct={nextLevelProgress} />
        </XpBarTrack>
        <XpBarPct>{nextLevelProgress}%</XpBarPct>
      </XpBarWrap>

      {/* Coach compass — Guardian-gated like the charts it summarizes;
          self-hides on fetch failure so it never blocks the page. */}
      {hasAdvancedAccess && user?.id ? <ProgressPulsePanel /> : null}

      {/* Slice 13: zero-history clients without the compass still get a
          first-workout path (settled recap + no PRs + no workouts this week). */}
      {!hasAdvancedAccess && weeklyRecapSettled && weekWorkouts === 0 && personalRecords.length === 0 && (
        <FirstWorkoutCta onLog={() => navigate('/dashboard/client/log-workout?loadPlan=today')} />
      )}

      <SplitRow>
        <Card>
          <CardTitle>Your Companion</CardTitle>
          {canRenderCompanionPet ? (
            <Suspense fallback={<Skeleton $h="140px" />}>
              <CompanionPet userId={companionPetUserId} size={120} compact showControls={false} />
            </Suspense>
          ) : (
            <Skeleton $h="120px" />
          )}
        </Card>

        <WeeklyRecapCard
          hasRecap={Boolean(weeklyRecap)}
          settled={weeklyRecapSettled}
          weekWorkouts={weekWorkouts}
          weekBonuses={weekBonuses}
          weekXp={weekXp}
          streakDays={streakDays}
        />
      </SplitRow>

      {personalRecords.length > 0 && (
        <PersonalRecordsCard records={personalRecords} />
      )}

      <WeeklyRingsCard />

      <ChartsSection>
        <ChartsSectionHeader>
          <CardTitle $bottom="0">
            <Zap size={16} /> Progress Charts
          </CardTitle>
        </ChartsSectionHeader>
        {user?.id ? (
          /* D2 (Sean lock 2026-07-06): the grid is always mounted — Starter
             sees the two live teaser charts and per-chart Guardian upsell
             cards (server 402 truth); the teaser IS the upsell. */
          <Suspense fallback={<ChartsLoading>Loading charts...</ChartsLoading>}>
            <CanonicalProgressChartsGrid />
          </Suspense>
        ) : (
          <Skeleton $h="300px" />
        )}
      </ChartsSection>

      <CrystallineLockOverlay
        isLocked={!hasAdvancedAccess}
        featureName="Detailed NASM Analytics"
        description="Swan Guardian unlocks the advanced progress cockpit and the detailed NASM analytics view. Active premium trials unlock this too."
        ctaLabel="Upgrade to Swan Guardian"
        badgeLabel="Swan Guardian Required"
        ariaLabel="Detailed NASM Analytics requires Swan Guardian or an active premium trial"
        onConfigure={() => navigate('/ascension')}
      >
        <DetailedLink onClick={() => navigate('/dashboard/client/progress/detailed')}>
          <Dumbbell size={18} />
          View Detailed NASM Analytics
          <TrailingChevron size={16} />
        </DetailedLink>
      </CrystallineLockOverlay>
    </PageWrap>
    </ClientProgressLensFrame>
  );
};

export default ClientProgressDashboardPage;
