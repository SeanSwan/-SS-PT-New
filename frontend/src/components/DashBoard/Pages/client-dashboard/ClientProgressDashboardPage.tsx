/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientProgressDashboardPage                       ║
 * ║  PURPOSE: Client-facing progress dashboard — stats, charts,   ║
 * ║           gamification, pet, personal records                 ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ My Progress                          [Time Filter ▼]       │
 * ├────────────────────────────────────────────────────────────┤
 * │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
 * │ │Level│ │Tier │ │XP   │ │Wrkt │ │Strk │ │PRs  │        │
 * │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
 * ├────────────────────────────────────────────────────────────┤
 * │ XP Progress Bar → Next Level                               │
 * ├──────────────────────┬─────────────────────────────────────┤
 * │ Companion Pet        │ Weekly Recap                         │
 * │ (compact)            │ workouts / streak / XP earned        │
 * ├──────────────────────┴─────────────────────────────────────┤
 * │ Victory Charts Grid (lazy — 12 togglable charts)           │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
 * │ │Wt Progr  │ │Muscle Rdr│ │Wkt Freq  │                   │
 * │ └──────────┘ └──────────┘ └──────────┘                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ [View Detailed Analytics →]                                │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  (none — uses auth context for userId)
 * State:     useGamificationData → profile (points, level, tier, streak)
 *            useWeeklyRecap → weekly stats
 * API Calls: GET /api/v1/gamification/profile
 *            GET /api/gamification/users/:id/weekly-recap
 *            GET /api/client/analytics/personal-records
 * Children:  ProfileChartsGrid (lazy), CompanionPet (lazy)
 */

import React, { useState, useEffect, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Star, Zap, Flame, Trophy, Target,
  Award, ChevronRight, Dumbbell, Calendar,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useSubscription } from '../../../../hooks/useSubscription';
import CrystallineLockOverlay from '../../../Shared/CrystallineLockOverlay';

// Lazy-load heavy components
const ProfileChartsGrid = React.lazy(
  () => import('../../../UserDashboard/components/ProfileChartsGrid')
);
const CompanionPet = React.lazy(
  () => import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
  max-width: 1100px;

  @media (max-width: 480px) { padding: 1rem; }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
`;

const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const StatCard = styled.div<{ $accent?: string }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms);

  &:hover {
    border-color: ${({ $accent }) => $accent || 'var(--accent-primary, rgba(96, 192, 240, 0.2))'};
  }
`;

const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

const StatValue = styled.span<{ $color?: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
  line-height: 1.2;
`;

const StatSub = styled.span`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

// XP Progress Bar
const XpBarWrap = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const XpBarLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

const XpBarTrack = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
`;

const XpBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 5px;
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  background: linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.3);
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const XpBarPct = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  white-space: nowrap;
`;

// Two-column row for pet + recap
const SplitRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1.25rem;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RecapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
`;

const RecapItem = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: var(--bg-surface, #1A1A24);
  border-radius: 8px;
`;

const RecapValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const RecapLabel = styled.div`
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

// Charts section
const ChartsSection = styled.div`
  margin-bottom: 1.25rem;
`;

const ChartsSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

// Detailed link
const DetailedLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: var(--accent-primary, rgba(96, 192, 240, 0.25));
    transform: translateX(4px);
  }
`;

const Skeleton = styled.div<{ $w?: string; $h?: string }>`
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '16px'};
  border-radius: 6px;
  background: linear-gradient(90deg,
    rgba(96, 192, 240, 0.04) 0%,
    rgba(96, 192, 240, 0.08) 50%,
    rgba(96, 192, 240, 0.04) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.8s ease-in-out infinite;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Color Map
// ─────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#878681',
  platinum: '#8B5CF6',
  bronze_forge: '#CD7F32',
  silver_edge: '#C0C0C0',
  titanium_core: '#878681',
  obsidian_warrior: '#0A0A0F',
  crystalline_swan: '#60C0F0',
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

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientProgressDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const { profile } = useGamificationData();
  const { isPro, isElite, isTrial } = useSubscription();
  const hasAdvancedAccess = isPro || isElite || isTrial;
  const [weeklyRecap, setWeeklyRecap] = useState<any>(null);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);

  // Fetch weekly recap
  useEffect(() => {
    if (!authAxios || !user?.id) return;
    authAxios.get(`/api/gamification/users/${user.id}/weekly-recap`)
      .then(res => setWeeklyRecap(res.data?.data || res.data))
      .catch(() => { /* silent */ });
  }, [authAxios, user?.id]);

  // Fetch personal records
  useEffect(() => {
    if (!authAxios || !user?.id) return;
    // Client-safe namespace: userId derived from JWT, never from URL.
    authAxios.get(`/api/client/analytics/personal-records`)
      .then(res => {
        const records = res.data?.data ?? res.data?.records ?? [];
        setPersonalRecords(Array.isArray(records) ? records : []);
      })
      .catch(() => setPersonalRecords([]));
  }, [authAxios, user?.id]);

  const p = profile.data;
  const tierColor = TIER_COLORS[p?.tier || 'bronze'] || '#CD7F32';
  const tierLabel = TIER_LABELS[p?.tier || 'bronze'] || 'Bronze Forge';

  return (
    <PageWrap>
      <PageHeader>
        <PageTitle><TrendingUp size={22} /> My Progress</PageTitle>
      </PageHeader>

      {/* Stats Strip */}
      <StatsStrip>
        <StatCard style={{ '--i': 0 } as React.CSSProperties} $accent={tierColor}>
          <StatLabel>Level</StatLabel>
          <StatValue $color="var(--accent-primary, #60C0F0)">{p?.level || 1}</StatValue>
        </StatCard>
        <StatCard style={{ '--i': 1 } as React.CSSProperties} $accent={tierColor}>
          <StatLabel>Tier</StatLabel>
          <StatValue $color={tierColor}>{tierLabel}</StatValue>
        </StatCard>
        <StatCard style={{ '--i': 2 } as React.CSSProperties}>
          <StatLabel>Total XP</StatLabel>
          <StatValue>{(p?.points || 0).toLocaleString()}</StatValue>
        </StatCard>
        <StatCard style={{ '--i': 3 } as React.CSSProperties}>
          {/* Canonical-surface-audit 2026-04-13: real field is
              data.thisWeek.workouts from gamificationController.getWeeklyRecap.
              Removed misleading p?.achievements?.length fallback that was
              silently rendering achievement count as "workouts" on empty
              recap responses. Label explicitly scoped to "Wk" (week). */}
          <StatLabel>Wk Workouts</StatLabel>
          <StatValue $color="var(--accent-secondary, #8B5CF6)">
            {weeklyRecap?.thisWeek?.workouts ?? 0}
          </StatValue>
        </StatCard>
        <StatCard style={{ '--i': 4 } as React.CSSProperties}>
          <StatLabel>Streak</StatLabel>
          <StatValue $color="#F59E0B">{(weeklyRecap?.current?.streak ?? p?.streakDays) || 0}d</StatValue>
        </StatCard>
        <StatCard style={{ '--i': 5 } as React.CSSProperties}>
          <StatLabel>PRs</StatLabel>
          <StatValue $color="var(--accent-gold, #C6A84B)">
            {personalRecords.length}
          </StatValue>
        </StatCard>
      </StatsStrip>

      {/* XP Progress Bar */}
      <XpBarWrap>
        <XpBarLabel>
          <Star size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Level {p?.level || 1} → {(p?.level || 1) + 1}
        </XpBarLabel>
        <XpBarTrack>
          <XpBarFill $pct={p?.nextLevelProgress || 0} />
        </XpBarTrack>
        <XpBarPct>{p?.nextLevelProgress || 0}%</XpBarPct>
      </XpBarWrap>

      {/* Pet + Weekly Recap */}
      <SplitRow>
        <Card>
          <CardTitle>Your Companion</CardTitle>
          {user?.id ? (
            <Suspense fallback={<Skeleton $h="140px" />}>
              <CompanionPet userId={user.id as number} size={120} compact showControls={false} />
            </Suspense>
          ) : (
            <Skeleton $h="120px" />
          )}
        </Card>

        <Card>
          <CardTitle><Calendar size={16} /> This Week</CardTitle>
          {weeklyRecap ? (
            // Canonical-surface-audit 2026-04-13: real backend shape is
            // { thisWeek: { workouts, totalXP, surpriseMultipliers },
            //   current: { streak, longestStreak, ... } }.
            // The prior flat reads (workoutsThisWeek, exercisesCompleted,
            // pointsEarned, streakDays at top level) all silently resolved
            // to 0 against real data. Exercises count is NOT returned by
            // the backend — replaced with surpriseMultipliers (Bonuses)
            // which IS a real field.
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
                <RecapValue>{(weeklyRecap?.current?.streak ?? p?.streakDays) || 0}</RecapValue>
                <RecapLabel>Streak Days</RecapLabel>
              </RecapItem>
            </RecapGrid>
          ) : (
            <RecapGrid>
              {[1, 2, 3, 4].map(i => (
                <RecapItem key={i}><Skeleton $h="28px" $w="60px" /><Skeleton $h="10px" $w="50px" /></RecapItem>
              ))}
            </RecapGrid>
          )}
        </Card>
      </SplitRow>

      {/* Personal Records Highlights */}
      {personalRecords.length > 0 && (
        <Card style={{ marginBottom: '1.25rem' }}>
          <CardTitle><Trophy size={16} /> Personal Records</CardTitle>
          <StatsStrip style={{ marginBottom: 0 }}>
            {personalRecords.slice(0, 4).map((pr: any, i: number) => (
              <StatCard key={i} style={{ '--i': i } as React.CSSProperties} $accent="var(--accent-gold, #C6A84B)">
                <StatLabel>{pr.exerciseName || pr.exercise || 'Exercise'}</StatLabel>
                <StatValue $color="var(--accent-gold, #C6A84B)">
                  {pr.weight || pr.estimated1RM || pr.value || '—'}
                  {pr.unit || 'lbs'}
                </StatValue>
                <StatSub>{pr.reps ? `${pr.reps} reps` : pr.date || ''}</StatSub>
              </StatCard>
            ))}
          </StatsStrip>
        </Card>
      )}

      {/* Victory Charts Grid */}
      <ChartsSection>
        <ChartsSectionHeader>
          <CardTitle style={{ marginBottom: 0 }}>
            <Zap size={16} /> Progress Charts
          </CardTitle>
        </ChartsSectionHeader>
        {user?.id ? (
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading charts...
            </div>
          }>
            <ProfileChartsGrid
              userId={user.id}
              isOwnProfile={true}
            />
          </Suspense>
        ) : (
          <Skeleton $h="300px" />
        )}
      </ChartsSection>

      {/* Link to detailed NASM analytics — Guardian+ feature */}
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
          <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
        </DetailedLink>
      </CrystallineLockOverlay>
    </PageWrap>
  );
};

export default ClientProgressDashboardPage;
