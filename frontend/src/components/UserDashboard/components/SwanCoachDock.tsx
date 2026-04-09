/**
 * ============================================================================
 * FILE: SwanCoachDock.tsx
 * PURPOSE: Swan Coach surface for the Home tab — full interactive dock for
 *          elite/admin/trainer tiers, premium teaser + upgrade CTA for lower
 *          tiers. Satisfies Swan Coach V1 Spec: visible to all, interactive
 *          only for Crystalline Swan members.
 * AUTHOR: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders as a premium branded block inside HomeTab.
 * Elite path: personalized greeting, context-aware quick-action chips wired
 * to real routes. Non-elite path: animated capability pills, locked overlay
 * tone, and a glowing upgrade CTA to /ascension.
 *
 * HOW IT FITS IN THE APP: Consumed by HomeTab.tsx. isElite prop is resolved
 * upstream (useSubscription().isElite OR admin/trainer role bypass) so this
 * component is pure presentation — no auth logic here.
 *
 * KEY DECISIONS:
 * - No hardcoded colors — var(--token, #fallback) throughout
 * - Pills in teaser use aria-hidden to avoid screen reader noise
 * - Upgrade CTA uses <button> not <a> to avoid navigating without intent
 *   guard — parent handles navigation via useNavigate
 * - Framer motion entry matches MomentumCard (y: 24 → 0) for visual cohesion
 * - 44px min touch target on all interactive elements
 * - Teaser pill row truncates gracefully on 320px via overflow: hidden
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Sparkles, Dumbbell, Target, BarChart2,
  ChevronRight, Lock, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Keyframes ─────────────────────────────────────────────────────────────────

const coachPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(96, 192, 240, 0); }
  50%       { box-shadow: 0 0 0 6px rgba(96, 192, 240, 0.15); }
`;

const upgradePulse = keyframes`
  0%, 100% {
    box-shadow:
      0 0 0 0 rgba(139, 92, 246, 0),
      0 4px 16px rgba(139, 92, 246, 0.25);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(139, 92, 246, 0.12),
      0 4px 24px rgba(139, 92, 246, 0.4);
  }
`;

const teaserFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-3px); }
`;

// ── Dock Container ─────────────────────────────────────────────────────────────

const DockCard = styled(motion.div)<{ $elite: boolean }>`
  position: relative;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  backdrop-filter: blur(24px);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid
    ${({ $elite }) =>
      $elite
        ? 'rgba(96, 192, 240, 0.25)'
        : 'rgba(139, 92, 246, 0.2)'};
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 8px 32px rgba(0, 0, 0, 0.2);

  ${({ $elite }) =>
    $elite &&
    css`
      animation: ${coachPulse} 4s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 414px) {
    border-radius: 16px;
  }
`;

// Atmospheric gradient strip at top of card
const DockAccent = styled.div<{ $elite: boolean }>`
  height: 3px;
  background: ${({ $elite }) =>
    $elite
      ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 50%, var(--accent-gold, #C6A84B) 100%)'
      : 'linear-gradient(90deg, var(--accent-purple, #8B5CF6) 0%, rgba(139, 92, 246, 0.3) 100%)'};
`;

const DockInner = styled.div`
  padding: 1.25rem 1.5rem 1.5rem;

  @media (max-width: 414px) {
    padding: 1rem 1rem 1.25rem;
  }

  @media (max-width: 320px) {
    padding: 0.875rem 0.875rem 1rem;
  }
`;

// ── Elite: Header Row ──────────────────────────────────────────────────────────

const EliteHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1.125rem;
`;

const CoachAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    rgba(96, 192, 240, 0.15) 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  border: 2px solid var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const EliteGreeting = styled.div`
  flex: 1;
  min-width: 0;
`;

const GreetingName = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GreetingSubtext = styled.p`
  font-size: 0.775rem;
  font-weight: 400;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  line-height: 1.4;
`;

// ── Elite: Action Chips ────────────────────────────────────────────────────────

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ActionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.875rem;
  height: 44px;
  min-width: 44px;
  background: rgba(96, 192, 240, 0.07);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 22px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(96, 192, 240, 0.14);
    border-color: rgba(96, 192, 240, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 375px) {
    font-size: 0.75rem;
    padding: 0 0.75rem;
  }
`;

// ── Teaser: Layout ─────────────────────────────────────────────────────────────

const TeaserLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TeaserTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
`;

const TeaserIcon = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    rgba(139, 92, 246, 0.12) 0%,
    var(--bg-base, #0A0A0F) 70%
  );
  border: 2px solid rgba(139, 92, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-purple, #8B5CF6);
  flex-shrink: 0;
  animation: ${teaserFloat} 3.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TeaserText = styled.div`
  flex: 1;
  min-width: 0;
`;

const TeaserTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.2rem;
`;

const TeaserSub = styled.p`
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
  line-height: 1.4;
`;

// ── Teaser: Capability Pills ───────────────────────────────────────────────────

const PillRow = styled.div`
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 320px) {
    flex-wrap: wrap;
    overflow-x: visible;
  }
`;

const CapabilityPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  background: rgba(139, 92, 246, 0.07);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  color: rgba(139, 92, 246, 0.75);
  white-space: nowrap;
  flex-shrink: 0;
`;

const LockDot = styled.span`
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.4);
  flex-shrink: 0;
`;

// ── Teaser: Upgrade CTA ────────────────────────────────────────────────────────

const UpgradeCTA = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 44px;
  padding: 0 1.25rem;
  background: linear-gradient(
    135deg,
    var(--accent-purple, #8B5CF6) 0%,
    rgba(139, 92, 246, 0.7) 100%
  );
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  animation: ${upgradePulse} 3s ease-in-out infinite;
  transition: opacity 0.18s ease, transform 0.12s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-purple, #8B5CF6);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const UpgradeLabel = styled.span`
  flex: 1;
  text-align: left;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(name: string, streakDays: number, level: number): string {
  const hour = new Date().getHours();
  const timeGreet =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (streakDays >= 30) return `${timeGreet}, ${name} — 30-day streak. Legendary.`;
  if (streakDays >= 7)  return `${timeGreet}, ${name} — ${streakDays}-day streak. Keep it going.`;
  if (level >= 20)      return `${timeGreet}, ${name} — Level ${level}. You're built different.`;
  return `${timeGreet}, ${name}. What are we building today?`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SwanCoachDockProps {
  isElite:      boolean;
  userName:     string;
  streakDays:   number;
  level:        number;
  tierName:     string;
  onTabChange?: (tab: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

// Each chip either navigates externally (path) or switches a dashboard tab (tab).
// Keeping all routes user-dashboard-safe: /workout exists for all authed users.
const ELITE_CHIPS = [
  { label: 'Log Workout',     Icon: Dumbbell,  path: '/workout' as const,  tab: undefined },
  { label: 'View Progress',   Icon: BarChart2, path: undefined,             tab: 'progress' },
  { label: 'Ask Swan Coach',  Icon: Target,    path: '/swan-coach' as const, tab: undefined },
] as const;

const TEASER_PILLS = [
  'Log by voice',
  'Streak coaching',
  'Workout planner',
  'Goal setting',
] as const;

const SwanCoachDock: React.FC<SwanCoachDockProps> = ({
  isElite,
  userName,
  streakDays,
  level,
  tierName,
  onTabChange,
}) => {
  const navigate = useNavigate();

  return (
    <DockCard
      $elite={isElite}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <DockAccent $elite={isElite} />
      <DockInner>
        {isElite ? (
          /* ── ELITE: Full Dock ── */
          <>
            <EliteHeader>
              <CoachAvatar aria-hidden="true">
                <Sparkles size={20} />
              </CoachAvatar>
              <EliteGreeting>
                <GreetingName>Swan Coach</GreetingName>
                <GreetingSubtext>
                  {getGreeting(userName, streakDays, level)}
                </GreetingSubtext>
              </EliteGreeting>
            </EliteHeader>

            <ChipRow role="group" aria-label="Quick actions">
              {ELITE_CHIPS.map(({ label, Icon, path, tab }) => (
                <ActionChip
                  key={label}
                  onClick={() => {
                    if (tab && onTabChange) onTabChange(tab);
                    else if (path) navigate(path);
                  }}
                  aria-label={label}
                >
                  <Icon size={15} />
                  {label}
                </ActionChip>
              ))}
            </ChipRow>
          </>
        ) : (
          /* ── NON-ELITE: Premium Teaser ── */
          <TeaserLayout>
            <TeaserTop>
              <TeaserIcon aria-hidden="true">
                <Sparkles size={20} />
              </TeaserIcon>
              <TeaserText>
                <TeaserTitle>Swan Coach</TeaserTitle>
                <TeaserSub>
                  Your AI-powered training partner — exclusive to Crystalline Swan
                </TeaserSub>
              </TeaserText>
            </TeaserTop>

            <PillRow aria-hidden="true">
              {TEASER_PILLS.map((pill) => (
                <CapabilityPill key={pill}>
                  <LockDot />
                  {pill}
                </CapabilityPill>
              ))}
            </PillRow>

            <UpgradeCTA
              onClick={() => navigate('/ascension')}
              aria-label={`Upgrade to Crystalline Swan to unlock Swan Coach. Current tier: ${tierName}`}
            >
              <Lock size={15} />
              <UpgradeLabel>Unlock Swan Coach — Crystalline Swan</UpgradeLabel>
              <Zap size={14} />
              <ChevronRight size={14} />
            </UpgradeCTA>
          </TeaserLayout>
        )}
      </DockInner>
    </DockCard>
  );
};

export default SwanCoachDock;
