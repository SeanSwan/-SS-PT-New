/**
 * Legacy gamification hook name backed by SwanStudios REST APIs.
 *
 * Older components still import `useGamificationMcp`; the implementation is
 * now API-first and does not use MCP servers or generated sample data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import gamificationApi from '../services/mcp/gamificationMcpService';
import {
  Achievement,
  BoardPosition,
  Challenge,
  DiceRollResult,
  GamificationProfile,
  KindnessQuest
} from '../types/mcp/gamification.types';

const useGamificationMcp = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [kindnessQuests, setKindnessQuests] = useState<KindnessQuest[]>([]);
  const [boardPosition, setBoardPosition] = useState<BoardPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [profileResponse, achievementsResponse, boardResponse, challengesResponse, questsResponse] =
        await Promise.all([
          gamificationApi.getGamificationProfile({ userId: user.id }),
          gamificationApi.getAchievements({
            userId: user.id,
            includeProgress: true
          }),
          gamificationApi.getBoardPosition({ userId: user.id }),
          gamificationApi.getChallenges({ userId: user.id }),
          gamificationApi.getKindnessQuests({ userId: user.id })
        ]);

      setProfile(profileResponse.data);
      setAchievements(achievementsResponse.data || []);
      setBoardPosition(boardResponse.data);
      setChallenges(challengesResponse.data || []);
      setKindnessQuests(questsResponse.data || []);
    } catch (err) {
      console.error('Error loading gamification data:', err);
      setError('Failed to load gamification data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const rollDice = useCallback(async (useBoost = false): Promise<DiceRollResult | null> => {
    if (!user?.id) return null;

    const response = await gamificationApi.rollDice({
      userId: user.id,
      diceType: useBoost ? 'bonus' : 'standard'
    });

    await refreshAll();
    return response.data;
  }, [refreshAll, user?.id]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    if (!user?.id) return false;

    const response = await gamificationApi.joinChallenge({
      userId: user.id,
      challengeId
    });

    if (response.data.success) {
      await refreshAll();
    }

    return response.data.success;
  }, [refreshAll, user?.id]);

  const completeQuest = useCallback(async (questId: string) => {
    if (!user?.id) return false;

    const response = await gamificationApi.completeKindnessQuest({
      userId: user.id,
      questId
    });

    if (response.data.success) {
      await refreshAll();
    }

    return response.data.success;
  }, [refreshAll, user?.id]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    profile,
    achievements,
    challenges,
    kindnessQuests,
    boardPosition,
    loading,
    error,
    refreshAll,
    rollDice,
    joinChallenge,
    completeQuest
  };
};

export default useGamificationMcp;
