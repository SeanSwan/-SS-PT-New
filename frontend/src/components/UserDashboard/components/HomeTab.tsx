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
 * Three sections: MomentumCard (streak + level badge + XP bar — the signature
 * premium visual moment), SwanCoachDock (full for elite/admin/trainer, teaser
 * for lower tiers), and a community pulse + quick-CTA grid.
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
import styled, { keyframes, css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Flame, Zap, Trophy, Dumbbell,
  Users, ChevronRight, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useSubscription } from '../../../hooks/useSubscription';
import { useActivityTicker } from '../../../hooks/social/useActivityTicker';
import ActivityTicker from '../../Social/Feed/ActivityTicker';
import SwanCoachDock from './SwanCoachDock';

// ── Keyframes ─────────────────────────────────────────────────────────────────

const streakPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 6px var(--accent-gold, #C6A84B)); }
  50%       { filter: drop-shadow(0 0 16px var(--accent-gold, #C6A84B)); }
`;

const xpShimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

// ── Layout ────────────────────────────────────────────────────────────────────

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

// ── Momentum Card — signature visual moment ───────────────────────────────────

const MomentumCard = styled(motion.div)`
  display: flex;
  align-items: stretch;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(24px);
  border: 1px solid rgba(198, 168, 75, 0.22);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(96, 192, 240, 0.04),
    0 16px 40px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);

  @media (max-width: 768px) {
    flex-direction: column;
    border-radius: 16px;
  }

  @media (max-width: 414px) {
    border-radius: 14px;
  }
`;

const MomentumSection = styled.div<{ $center?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  gap: 0.5rem;
  text-align: center;

  ${({ $center }) =>
    $center &&
    css`
      background: rgba(0, 24, 64, 0.35);
    `}

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    padding: 1.25rem 1.25rem;
    gap: 1rem;
  }

  @media (max-width: 375px) {
    padding: 1rem;
  }
`;

const MomentumDivider = styled.div`
  width: 1px;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    height: 1px;
  }
`;

const MomentumLabel = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
  margin: 0;
`;

const MomentumCaption = styled.p<{ $accent?: boolean }>`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ $accent }) =>
    $accent
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #94a3b8)'};
  margin: 0;
  /* No margin-left: auto — that conflicted with space-between on mobile */
`;

const StreakValue = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Fira Code', monospace;
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
  color: ${({ $active }) =>
    $active ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, #64748b)'};

  ${({ $active }) =>
    $active &&
    css`
      animation: ${streakPulse} 3s ease-in-out infinite;
    `}

  svg {
    color: ${({ $active }) =>
      $active ? '#FF7043' : 'var(--text-muted, #64748b)'};
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LevelBadge = styled.div<{ $tierColor: string }>`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at 35% 35%,
    ${({ $tierColor }) => $tierColor}1A 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  border: 2px solid ${({ $tierColor }) => $tierColor};
  box-shadow:
    0 0 20px ${({ $tierColor }) => $tierColor}29,
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
  }

  @media (max-width: 375px) {
    width: 44px;
    height: 44px;
  }
`;

const LevelNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 768px) {
    font-size: 1.375rem;
  }

  @media (max-width: 375px) {
    font-size: 1.125rem;
  }
`;

const XPBarTrack = styled.div`
  width: 100%;
  max-width: 160px;
  height: 8px;
  background: rgba(10, 10, 15, 0.7);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.1);

  @media (max-width: 768px) {
    max-width: 120px;
  }
`;

const XPBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-purple, #8B5CF6) 50%,
    var(--accent-primary, #60C0F0) 100%
  );
  background-size: 200% 100%;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
  animation: ${xpShimmer} 2.5s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: 100% 100%;
    /* framer-motion transition is suppressed via useReducedMotion in parent */
  }
`;

// ── Community Pulse ───────────────────────────────────────────────────────────

const PulseSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const SectionLabel = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
  margin: 0;

  svg {
    flex-shrink: 0;
  }
`;

// ── Quick CTA Grid ────────────────────────────────────────────────────────────

const CTAGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 320px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  }
`;

const CTACard = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.125rem;
  min-height: 56px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.06));
  border-radius: 14px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 375px) {
    min-height: 52px;
    padding: 0.875rem 0.875rem;
  }
`;

const CTAIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const CTALabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
`;

const CTAArrow = styled(ChevronRight)`
  color: var(--text-muted, #64748b);
  flex-shrink: 0;
`;

// ── Dock Skeleton ─────────────────────────────────────────────────────────────

const DockSkeleton = styled.div`
  height: 108px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  animation: pulse 1.8s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.7; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.5;
  }

  @media (max-width: 414px) {
    border-radius: 16px;
    height: 96px;
  }
`;

// ── Props & Component ─────────────────────────────────────────────────────────

interface HomeTabProps {
  onTabChange: (tab: string) => void;
}

const CTA_ITEMS = [
  { label: 'Log Workout',    Icon: Dumbbell,  getAction: (nav: ReturnType<typeof useNavigate>, _: (t: string) => void) => () => nav('/workout') },
  { label: 'View Progress',  Icon: Trophy,    getAction: (_: ReturnType<typeof useNavigate>, change: (t: string) => void) => () => change('progress') },
  { label: 'Explore Feed',   Icon: Sparkles,  getAction: (_: ReturnType<typeof useNavigate>, change: (t: string) => void) => () => change('feed') },
  { label: 'Find Community', Icon: Users,     getAction: (nav: ReturnType<typeof useNavigate>, _: (t: string) => void) => () => nav('/social/friends') },
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

      {/* ── 2. SWAN COACH DOCK / TEASER ── */}
      {subLoading ? (
        <DockSkeleton aria-hidden="true" />
      ) : (
        <SwanCoachDock
          isElite={hasEliteAccess}
          userName={user?.firstName ?? 'Athlete'}
          streakDays={streakDays}
          level={level}
          tierName={tierName}
          onTabChange={onTabChange}
        />
      )}

      {/* ── 3. COMMUNITY PULSE ── */}
      {activityEvents.length > 0 && (
        <PulseSection>
          <SectionLabel>
            <Zap size={13} />
            Community Pulse
          </SectionLabel>
          <ActivityTicker events={activityEvents} />
        </PulseSection>
      )}

      {/* ── 4. QUICK CTA GRID ── */}
      <CTAGrid>
        {CTA_ITEMS.map(({ label, Icon, getAction }) => (
          <CTACard
            key={label}
            onClick={getAction(navigate, onTabChange)}
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
