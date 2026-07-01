/**
 * FILE: SwanAuraPanel.tsx
 * PURPOSE: Read-only Unity Weaver / Swan Aura dashboard surface.
 *
 * Slice 1 boundary:
 * - No moderation writes
 * - No AI provider calls
 * - No social post mutation
 * - No gamification mutation
 *
 * This panel converts existing dashboard state into warm, prosocial, health-first
 * nudges so Unity Weaver can enter the product safely before command or
 * moderation workflows are introduced.
 */
import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  HeartHandshake,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLatestPostView,
} from './HomeTabViewModel';

interface SwanAuraPanelProps {
  userName: string;
  streakDays: number;
  level: number;
  points: number;
  progressPercent: number;
  pointsToNext: number;
  streakAtRisk: boolean;
  activeChallenge: HomeChallengeSummary | null;
  badges: HomeBadgeItem[];
  latestPost: HomeLatestPostView | null;
  onLogWorkout: () => void;
  onOpenChallenges: () => void;
  onEncourageFriend: () => void;
}

type AuraTone = 'streak' | 'challenge' | 'community' | 'progress';

interface AuraNudge {
  id: string;
  tone: AuraTone;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  onAction: () => void;
}

const auraPulse = keyframes`
  0%, 100% {
    opacity: 0.72;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.035);
  }
`;

const AuraShell = styled(motion.section)`
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), transparent 34%),
    radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent), transparent 38%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--surface-primary, #07101F) 94%, transparent),
      color-mix(in srgb, var(--surface-secondary, #0B1730) 88%, transparent)
    );
  box-shadow:
    0 20px 52px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);
  padding: clamp(1rem, 1.7vw, 1.25rem);
  color: var(--text-primary, #E0ECF4);
`;

const AuraGlow = styled.div`
  position: absolute;
  inset: auto -18% -42% 34%;
  height: 156px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  filter: blur(34px);
  pointer-events: none;
  animation: ${auraPulse} 5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const AuraHeader = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1rem;
`;

const AuraAvatar = styled.div`
  width: 46px;
  min-width: 46px;
  height: 46px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

const AuraCopy = styled.div`
  min-width: 0;
`;

const AuraEyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.25rem;
  font-size: 0.68rem;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
`;

const AuraTitle = styled.h3`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: clamp(1.04rem, 1.7vw, 1.22rem);
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const AuraSubtext = styled.p`
  margin: 0.35rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
  font-size: 0.86rem;
  line-height: 1.55;
`;

const NudgeCard = styled.div<{ $tone: AuraTone }>`
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: 0.95rem;
  border-radius: 18px;
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--bg-elevated, #102040) 82%, transparent),
      color-mix(in srgb, var(--surface-primary, #07101F) 88%, transparent)
    );
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'challenge') return 'color-mix(in srgb, var(--gold-light, #DAC36E) 24%, transparent)';
    if ($tone === 'community') return 'color-mix(in srgb, #7DD3FC 24%, transparent)';
    if ($tone === 'progress') return 'color-mix(in srgb, #A78BFA 24%, transparent)';
    return 'color-mix(in srgb, #34D399 24%, transparent)';
  }};
`;

const NudgeTop = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const NudgeIcon = styled.div<{ $tone: AuraTone }>`
  width: 36px;
  min-width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => {
    if ($tone === 'challenge') return 'var(--gold-light, #DAC36E)';
    if ($tone === 'community') return '#7DD3FC';
    if ($tone === 'progress') return '#A78BFA';
    return '#34D399';
  }};
  background: color-mix(in srgb, currentColor 12%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
`;

const NudgeBody = styled.div`
  min-width: 0;
`;

const NudgeEyebrow = styled.p`
  margin: 0 0 0.2rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-size: 0.66rem;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
`;

const NudgeTitle = styled.h4`
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.25;
  font-weight: 800;
`;

const NudgeText = styled.p`
  margin: 0.35rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-size: 0.82rem;
  line-height: 1.5;
`;

const AuraButton = styled.button`
  min-height: 44px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 56%, transparent);
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    &:hover { transform: none; }
  }
`;

const AuraMetaGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.8rem;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

const AuraMeta = styled.div`
  padding: 0.65rem 0.55rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-primary, #07101F) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  text-align: center;
`;

const MetaValue = styled.div`
  font-family: var(--font-data, 'Sora', sans-serif);
  font-size: 0.92rem;
  font-weight: 900;
  color: var(--accent-primary, #60C0F0);
`;

const MetaLabel = styled.div`
  margin-top: 0.15rem;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent);
`;

function compactNumber(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.max(0, value || 0));
}

function getNudgeIcon(tone: AuraTone) {
  if (tone === 'challenge') return Trophy;
  if (tone === 'community') return Users;
  if (tone === 'progress') return Zap;
  return ShieldCheck;
}

function buildAuraNudge({
  activeChallenge,
  badges,
  latestPost,
  level,
  pointsToNext,
  progressPercent,
  streakAtRisk,
  streakDays,
  onEncourageFriend,
  onLogWorkout,
  onOpenChallenges,
}: Omit<SwanAuraPanelProps, 'userName' | 'points'>): AuraNudge {
  if (streakAtRisk) {
    return {
      id: 'streak-rescue',
      tone: 'streak',
      eyebrow: 'Streak Rescue',
      title: 'Your rhythm is still recoverable today.',
      body: 'A short walk, mobility session, or logged recovery workout can keep the chain alive without overtraining.',
      ctaLabel: 'Log a quick session',
      onAction: onLogWorkout,
    };
  }

  if (activeChallenge) {
    return {
      id: 'challenge-pulse',
      tone: 'challenge',
      eyebrow: activeChallenge.joined ? 'Team Momentum' : 'Open Challenge',
      title: `${activeChallenge.title} is calling.` ,
      body: activeChallenge.joined
        ? `You are ${activeChallenge.progress}% through this challenge. One more action helps the whole Swan circle rise.`
        : `${activeChallenge.participants} members are moving together. Join when it fits your training path.`,
      ctaLabel: activeChallenge.joined ? 'View challenge progress' : 'Open challenges',
      onAction: onOpenChallenges,
    };
  }

  if (latestPost && (latestPost.likes + latestPost.comments) > 0) {
    return {
      id: 'community-ripple',
      tone: 'community',
      eyebrow: 'Community Ripple',
      title: 'Your effort is reaching people.',
      body: `Your latest post has ${latestPost.likes + latestPost.comments} interaction${latestPost.likes + latestPost.comments === 1 ? '' : 's'}. Keep sharing honest progress — it gives somebody else courage.`,
      ctaLabel: 'Encourage a friend',
      onAction: onEncourageFriend,
    };
  }

  if (progressPercent >= 70 || pointsToNext > 0) {
    return {
      id: 'level-gradient',
      tone: 'progress',
      eyebrow: 'Mastery Signal',
      title: progressPercent >= 70 ? `Level ${level + 1} is within reach.` : `Level ${level} is building clean momentum.`,
      body: progressPercent >= 70
        ? `You are ${progressPercent}% through this level. The last stretch is where identity locks in.`
        : `${compactNumber(pointsToNext)} XP to the next level. Tiny repeatable actions still compound.`,
      ctaLabel: 'Review progress',
      onAction: onLogWorkout,
    };
  }

  if (badges.length) {
    return {
      id: 'badge-glow',
      tone: 'progress',
      eyebrow: 'Badge Glow',
      title: `${badges[0]?.name || 'Your latest badge'} is proof you are showing up.`,
      body: 'Badges are not decoration here — they are receipts of discipline, courage, and community energy.',
      ctaLabel: 'Build the next win',
      onAction: onOpenChallenges,
    };
  }

  return {
    id: 'first-good-energy',
    tone: 'community',
    eyebrow: 'Good Energy Quest',
    title: 'Start with one positive ripple.',
    body: 'Welcome someone, encourage a post, or log one honest action. Swan Aura will help turn small good moves into momentum.',
    ctaLabel: 'Find someone to encourage',
    onAction: onEncourageFriend,
  };
}

const SwanAuraPanel: React.FC<SwanAuraPanelProps> = (props) => {
  const prefersReducedMotion = useReducedMotion();
  const nudge = useMemo(() => buildAuraNudge(props), [props]);
  const Icon = getNudgeIcon(nudge.tone);

  return (
    <AuraShell
      aria-label="Swan Aura positive community guide"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 }}
    >
      <AuraGlow />
      <AuraHeader>
        <AuraAvatar aria-hidden="true">
          <Sparkles size={22} />
        </AuraAvatar>
        <AuraCopy>
          <AuraEyebrow>
            <HeartHandshake size={13} aria-hidden="true" />
            Swan Aura
          </AuraEyebrow>
          <AuraTitle>{props.userName}, good energy is part of the training.</AuraTitle>
          <AuraSubtext>
            Unity Weaver’s dashboard presence is read-only in this slice: motivation, kindness prompts, and honest momentum — no posts or records change from this card.
          </AuraSubtext>
        </AuraCopy>
      </AuraHeader>

      <NudgeCard $tone={nudge.tone}>
        <NudgeTop>
          <NudgeIcon $tone={nudge.tone} aria-hidden="true">
            <Icon size={18} />
          </NudgeIcon>
          <NudgeBody>
            <NudgeEyebrow>{nudge.eyebrow}</NudgeEyebrow>
            <NudgeTitle>{nudge.title}</NudgeTitle>
            <NudgeText>{nudge.body}</NudgeText>
          </NudgeBody>
        </NudgeTop>
        <AuraButton type="button" onClick={nudge.onAction}>
          {nudge.ctaLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </AuraButton>
      </NudgeCard>

      <AuraMetaGrid aria-label="Swan Aura context summary">
        <AuraMeta>
          <MetaValue>{compactNumber(props.points)}</MetaValue>
          <MetaLabel>XP</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{props.streakDays}</MetaValue>
          <MetaLabel>Streak</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{props.badges.length}</MetaValue>
          <MetaLabel>Top badges</MetaLabel>
        </AuraMeta>
      </AuraMetaGrid>
    </AuraShell>
  );
};

export default React.memo(SwanAuraPanel);
