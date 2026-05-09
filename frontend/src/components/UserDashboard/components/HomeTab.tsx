/**
 * ============================================================================
 * FILE: HomeTab.tsx
 * PURPOSE: Home-first daily landing for /user-dashboard — MomentumCard
 *          (signature visual), Swan Coach dock/teaser, community pulse,
 *          and quick-action CTAs
 * AUTHOR: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the default Home tab of UserDashboard.V3.
 * Six sections: MomentumCard, DailyHealthLoop, SwanCoachDock,
 * SwanCoachActionLauncher, community pulse, and quick-action CTAs.
 *
 * HOW IT FITS IN THE APP: Lazy-loaded by UserDashboard.V3.tsx as the default
 * tab (activeTab = 'home'). onTabChange prop enables same-page tab switching
 * from CTA buttons without a full navigation event.
 *
 * KEY DECISIONS:
 * - Tier gate: useSubscription().isElite OR role === admin/trainer (always elite)
 * - XP bar animates via framer-motion width from 0% on mount (GPU-safe for
 *   such a small element; scaleX would break rounded corners without clip)
 * - streakPulse animation respects prefers-reduced-motion via @media query
 * - ActivityTicker reuses the hook already used in SocialFeed — each tab
 *   instance manages its own lifecycle; no double-connection risk
 * - No hardcoded colors — all var(--token, #fallback) pattern
 */

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Flame, Zap, Trophy, Dumbbell,
  Users, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useSubscription } from '../../../hooks/useSubscription';
import { useActivityTicker } from '../../../hooks/social/useActivityTicker';
import ActivityTicker from '../../Social/Feed/ActivityTicker';
import DailyHealthLoop from './DailyHealthLoop';
import SwanCoachActionLauncher from './SwanCoachActionLauncher';
import SwanCoachDock from './SwanCoachDock';
import { getLogWorkoutDashboardPath } from './swanCoachDashboardRoute';
import {
  HomeContainer,
  LevelBadge,
  LevelNumber,
  MomentumCaption,
  MomentumCard,
  MomentumDivider,
  MomentumLabel,
  MomentumSection,
  StreakValue,
  XPBarFill,
  XPBarTrack,
} from './HomeTabMomentum.styles';
import {
  CTAArrow,
  CTACard,
  CTAGrid,
  CTAIcon,
  CTALabel,
  DockSkeleton,
  PulseSection,
  SectionLabel,
} from './HomeTabActions.styles';

interface HomeTabProps {
  onTabChange: (tab: string) => void;
}

const CTA_ITEMS = [
  { label: 'Log Workout',    Icon: Dumbbell, action: 'log-workout' },
  { label: 'View Progress',  Icon: Trophy,   action: 'progress' },
  { label: 'Explore Feed',   Icon: Sparkles, action: 'feed' },
  { label: 'Find Community', Icon: Users,    action: 'community' },
] as const;

const HomeTab: React.FC<HomeTabProps> = ({ onTabChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: gamProfile, levelProgress } = useGamificationData();
  const { isElite, loading: subLoading } = useSubscription();
  const { events: activityEvents } = useActivityTicker();
  const prefersReducedMotion = useReducedMotion();

  // Admins and trainers always receive elite-equivalent Swan Coach access
  const hasEliteAccess =
    isElite ||
    user?.role === 'admin' ||
    user?.role === 'trainer';

  const streakDays      = gamProfile?.data?.streakDays ?? 0;
  const level           = levelProgress?.level ?? 1;
  const progressPercent = levelProgress?.progressPercent ?? 0;
  const tierName        = levelProgress?.tierDisplay?.name ?? 'Bronze Forge';
  const tierColor       = levelProgress?.tierDisplay?.color ?? '#C6A84B';
  const logWorkoutPath  = getLogWorkoutDashboardPath(user?.role);

  return (
    <HomeContainer>
      {/* ── 1. MOMENTUM CARD — signature visual ── */}
      <MomentumCard
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Streak */}
        <MomentumSection>
          <MomentumLabel>Today's Streak</MomentumLabel>
          <StreakValue $active={streakDays > 0}>
            <Flame size={24} />
            <span>{streakDays}</span>
          </StreakValue>
          <MomentumCaption>
            {streakDays === 0
              ? 'Start your streak today'
              : `${streakDays} day${streakDays !== 1 ? 's' : ''} strong`}
          </MomentumCaption>
        </MomentumSection>

        <MomentumDivider />

        {/* Level */}
        <MomentumSection $center>
          <MomentumLabel>Your Level</MomentumLabel>
          <LevelBadge $tierColor={tierColor}>
            <LevelNumber>{level}</LevelNumber>
          </LevelBadge>
          <MomentumCaption $accent>{tierName}</MomentumCaption>
        </MomentumSection>

        <MomentumDivider />

        {/* XP */}
        <MomentumSection>
          <MomentumLabel>Next Level</MomentumLabel>
          <XPBarTrack>
            <XPBarFill
              initial={{ width: prefersReducedMotion ? `${progressPercent}%` : '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: 'easeOut', delay: 0.35 }}
            />
          </XPBarTrack>
          <MomentumCaption>{Math.round(progressPercent)}% there</MomentumCaption>
        </MomentumSection>
      </MomentumCard>

      {/* ── 2. DAILY HEALTH LOOP ── */}
      <DailyHealthLoop
        streakDays={streakDays}
        level={level}
        progressPercent={progressPercent}
        tierName={tierName}
        logWorkoutPath={logWorkoutPath}
        onTabChange={onTabChange}
      />

      {/* ── 3. SWAN COACH DOCK / TEASER ── */}
      {subLoading ? (
        <DockSkeleton aria-hidden="true" />
      ) : (
        <SwanCoachDock
          isElite={hasEliteAccess}
          userName={user?.firstName ?? 'Athlete'}
          userRole={user?.role}
          streakDays={streakDays}
          level={level}
          tierName={tierName}
          onTabChange={onTabChange}
        />
      )}

      {/* ── 4. SWAN COACH ACTION LAUNCHER ── */}
      {!subLoading && hasEliteAccess && (
        <SwanCoachActionLauncher
          userName={user?.firstName ?? 'Athlete'}
          userRole={user?.role}
          streakDays={streakDays}
          level={level}
          onTabChange={onTabChange}
        />
      )}

      {/* ── 5. COMMUNITY PULSE ── */}
      {activityEvents.length > 0 && (
        <PulseSection>
          <SectionLabel>
            <Zap size={13} />
            Community Pulse
          </SectionLabel>
          <ActivityTicker events={activityEvents} />
        </PulseSection>
      )}

      {/* ── 6. QUICK CTA GRID ── */}
      <CTAGrid>
        {CTA_ITEMS.map(({ label, Icon, action }) => (
          <CTACard
            key={label}
            onClick={() => {
              if (action === 'log-workout') navigate(logWorkoutPath);
              else onTabChange(action);
            }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <CTAIcon><Icon size={19} /></CTAIcon>
            <CTALabel>{label}</CTALabel>
            <CTAArrow size={14} />
          </CTACard>
        ))}
      </CTAGrid>
    </HomeContainer>
  );
};

export default HomeTab;
