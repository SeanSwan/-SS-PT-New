/**
 * ============================================================================
 * FILE: SwanCoachDock.tsx
 * PURPOSE: Swan Coach surface for the Home tab - full interactive dock for
 *          elite/admin/trainer tiers, premium teaser + upgrade CTA for lower
 *          tiers. Satisfies Swan Coach V1 Spec: visible to all, interactive
 *          only for Crystalline Swan members.
 * AUTHOR: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders as a premium branded block inside HomeTab.
 * Elite path: personalized greeting plus one Swan Coach entry point. Non-elite
 * path: animated capability pills, locked overlay
 * tone, and a glowing upgrade CTA to /ascension.
 *
 * HOW IT FITS IN THE APP: Consumed by HomeTab.tsx. isElite prop is resolved
 * upstream (useSubscription().isElite OR admin/trainer role bypass) so this
 * component is pure presentation - no auth logic here.
 *
 * KEY DECISIONS:
 * - No hardcoded colors - var(--token, #fallback) throughout
 * - Pills in teaser use aria-hidden to avoid screen reader noise
 * - Upgrade CTA uses <button> not <a> to avoid navigating without intent
 *   guard - parent handles navigation via useNavigate
 * - Framer motion entry matches MomentumCard (y: 24 to 0) for visual cohesion
 * - 44px min touch target on all interactive elements
 * - Teaser pill row truncates gracefully on 320px via overflow: hidden
 */

import React from 'react';
import {
  Sparkles, Target,
  ChevronRight, Lock, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSwanCoachDashboardPath } from './swanCoachDashboardRoute';
import {
  ActionChip,
  ChipRow,
  CoachAvatar,
  DockAccent,
  DockCard,
  DockInner,
  EliteGreeting,
  EliteHeader,
  GreetingName,
  GreetingSubtext,
} from './SwanCoachDock.styles';
import {
  CapabilityPill,
  LockDot,
  PillRow,
  TeaserIcon,
  TeaserLayout,
  TeaserSub,
  TeaserText,
  TeaserTitle,
  TeaserTop,
  UpgradeCTA,
  UpgradeLabel,
} from './SwanCoachDockTeaser.styles';

function getGreeting(name: string, streakDays: number, level: number): string {
  const hour = new Date().getHours();
  const timeGreet =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (streakDays >= 30) return `${timeGreet}, ${name} - 30-day streak. Legendary.`;
  if (streakDays >= 7)  return `${timeGreet}, ${name} - ${streakDays}-day streak. Keep it going.`;
  if (level >= 20)      return `${timeGreet}, ${name} - Level ${level}. You're built different.`;
  return `${timeGreet}, ${name}. What are we building today?`;
}

interface SwanCoachDockProps {
  isElite: boolean;
  userName: string;
  userRole?: string | null;
  streakDays: number;
  level: number;
  tierName: string;
}

const ELITE_CHIPS = [
  { label: 'Open Swan Coach', Icon: Target },
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
  userRole,
  streakDays,
  level,
  tierName,
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
              {ELITE_CHIPS.map(({ label, Icon }) => (
                <ActionChip
                  key={label}
                  onClick={() => navigate(getSwanCoachDashboardPath(userRole))}
                  aria-label={label}
                >
                  <Icon size={15} />
                  {label}
                </ActionChip>
              ))}
            </ChipRow>
          </>
        ) : (
          <TeaserLayout>
            <TeaserTop>
              <TeaserIcon aria-hidden="true">
                <Sparkles size={20} />
              </TeaserIcon>
              <TeaserText>
                <TeaserTitle>Swan Coach</TeaserTitle>
                <TeaserSub>
                  Your AI-powered training partner - exclusive to Crystalline Swan
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
              <UpgradeLabel>Unlock Swan Coach - Crystalline Swan</UpgradeLabel>
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
