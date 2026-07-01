import { ShieldCheck, Trophy, Users, Zap, type LucideIcon } from 'lucide-react';
import type { AuraNudge, AuraTone, SwanAuraPanelProps } from './SwanAuraPanel.types';

export function compactAuraNumber(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.max(0, value || 0));
}

export function getNudgeIcon(tone: AuraTone): LucideIcon {
  if (tone === 'challenge') return Trophy;
  if (tone === 'community') return Users;
  if (tone === 'progress') return Zap;
  return ShieldCheck;
}

export function buildAuraNudge({
  activeChallenge,
  badges,
  latestPost,
  level,
  pointsToNext,
  progressPercent,
  streakAtRisk,
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
      title: `${activeChallenge.title} is calling.`,
      body: activeChallenge.joined
        ? `You are ${activeChallenge.progress}% through this challenge. One more action helps the whole Swan circle rise.`
        : `${activeChallenge.participants} members are moving together. Join when it fits your training path.`,
      ctaLabel: activeChallenge.joined ? 'View challenge progress' : 'Open challenges',
      onAction: onOpenChallenges,
    };
  }

  if (latestPost && (latestPost.likes + latestPost.comments) > 0) {
    const interactionCount = latestPost.likes + latestPost.comments;
    return {
      id: 'community-ripple',
      tone: 'community',
      eyebrow: 'Community Ripple',
      title: 'Your effort is reaching people.',
      body: `Your latest post has ${interactionCount} interaction${interactionCount === 1 ? '' : 's'}. Keep sharing honest progress — it gives somebody else courage.`,
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
        : `${compactAuraNumber(pointsToNext)} XP to the next level. Tiny repeatable actions still compound.`,
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
