/**
 * useCelebrationTriggers — Bridge between gamification events and celebrations
 * ==============================================================================
 * Wraps social feed actions to automatically fire celebration effects
 * when points are awarded. Import this alongside useSocialFeed to get
 * celebration-enhanced versions of reactToPost, createPost, etc.
 */

import { useCallback } from 'react';
import { useCelebration } from '../context/CelebrationContext';

interface PointResult {
  pointsAwarded?: number;
  newBalance?: number;
  success: boolean;
  pointMessage?: string;
}

/**
 * Returns celebration-aware action wrappers.
 * Call triggerFromResult(result, event?) after any action that might return points.
 */
export function useCelebrationTriggers() {
  const { triggerXPPop, triggerLevelUp, triggerAchievement, triggerStreak } = useCelebration();

  /**
   * Fire XP pop celebration from a point result.
   * Optionally pass a MouseEvent to position the pop at the click location.
   */
  const triggerFromResult = useCallback(
    (result: PointResult | boolean | null | undefined, event?: React.MouseEvent) => {
      if (!result || typeof result === 'boolean') return;
      if (result.pointsAwarded && result.pointsAwarded > 0) {
        const x = event?.clientX;
        const y = event?.clientY;
        triggerXPPop(result.pointsAwarded, x, y);
      }
    },
    [triggerXPPop],
  );

  return {
    triggerFromResult,
    triggerXPPop,
    triggerLevelUp,
    triggerAchievement,
    triggerStreak,
  };
}

export default useCelebrationTriggers;
