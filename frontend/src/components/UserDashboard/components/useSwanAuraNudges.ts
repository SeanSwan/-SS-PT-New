import { useMemo } from 'react';
import { buildAuraNudge } from './SwanAuraPanel.logic';
import type { AuraNudge, SwanAuraPanelProps } from './SwanAuraPanel.types';

type SwanAuraNudgeInput = Omit<SwanAuraPanelProps, 'userName' | 'points'>;

/**
 * Deterministic Swan Aura nudge selector.
 *
 * Slice 2 keeps this local and read-only: it chooses the best benevolent dashboard
 * prompt from already-loaded dashboard state. It does not call APIs or mutate data.
 */
export function useSwanAuraNudges({
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
}: SwanAuraNudgeInput): AuraNudge {
  return useMemo(() => buildAuraNudge({
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
  }), [
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
  ]);
}
