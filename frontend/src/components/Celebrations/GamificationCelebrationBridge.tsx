/**
 * ============================================================================
 * FILE: GamificationCelebrationBridge.tsx
 * PURPOSE: Wire the backend's gamification socket events into the global
 *          CelebrationPortal — the reward loop's missing last inch.
 *          Audit 2026-09-12 P0-1: the backend emits level_up / achievement /
 *          streak / workout_completed events and the CelebrationPortal has a
 *          full celebration vocabulary, but nothing connected them, so the
 *          product's emotional payoff beat never fired.
 * DATA TRUTH: every celebration number (XP, level, streak days, achievement
 *          name) is read from the server event payload — never fabricated or
 *          estimated client-side. Renderless component; mounts the realtime
 *          listener once for the signed-in user.
 * MOUNT: App.tsx inside <CelebrationProvider> (needs useCelebration) and
 *          under QueryClient/Auth/Toast providers (needed by the hook).
 * ============================================================================
 */
import React, { useCallback, useRef } from 'react';
import { useCelebration } from '../../context/CelebrationContext';
import {
  normalizeRealtimeXp,
  useGamificationRealtime,
  type GamificationRealtimeEvent,
  type GamificationRealtimePayload,
} from '../../hooks/gamification/useGamificationRealtime';

/** The workout path emits both workout_completed and points_awarded for the
 * same XP; ignore the echo inside this window so a pop never double-counts. */
const POINTS_AWARD_DEDUPE_MS = 5000;

const GamificationCelebrationBridge: React.FC = () => {
  const { triggerXPPop, triggerLevelUp, triggerAchievement, triggerStreak } = useCelebration();
  const lastWorkoutPopAtRef = useRef(0);

  const onEvent = useCallback((event: GamificationRealtimeEvent, data: GamificationRealtimePayload): boolean => {
    switch (event) {
      case 'gamification:workout_completed': {
        const xp = normalizeRealtimeXp(data.xpEarned);
        if (xp > 0) {
          lastWorkoutPopAtRef.current = Date.now();
          triggerXPPop(xp);
          return true;
        }
        break;
      }
      case 'gamification:points_awarded': {
        if (Date.now() - lastWorkoutPopAtRef.current < POINTS_AWARD_DEDUPE_MS) break;
        {
          const xp = normalizeRealtimeXp(data.points ?? data.xpEarned);
          if (xp > 0) {
            triggerXPPop(xp);
            return true;
          }
        }
        break;
      }
      case 'gamification:level_up': {
        const level = Number(data.newLevel);
        if (Number.isFinite(level) && level > 0) {
          triggerLevelUp(level);
          return true;
        }
        break;
      }
      case 'gamification:achievement_unlocked': {
        if (typeof data.achievementName === 'string' && data.achievementName.trim()) {
          triggerAchievement(data.achievementName.trim());
          return true;
        }
        break;
      }
      case 'gamification:streak_milestone': {
        const days = Number(data.streakDays);
        if (Number.isFinite(days) && days > 0) {
          triggerStreak(days);
          return true;
        }
        break;
      }
    }
    return false;
  }, [triggerAchievement, triggerLevelUp, triggerStreak, triggerXPPop]);

  useGamificationRealtime({ onEvent });

  return null;
};

export default GamificationCelebrationBridge;
