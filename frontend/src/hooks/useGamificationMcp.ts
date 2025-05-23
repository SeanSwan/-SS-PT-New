import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import gamificationMcpApi from '../services/mcp/gamificationMcpService';
import { 
  GamificationProfile, 
  Achievement, 
  Challenge, 
  KindnessQuest, 
  BoardPosition, 
  DiceRollResult 
} from '../types/mcp/gamification.types';

/**
 * Custom hook for interacting with the Gamification MCP server
 * 
 * Provides data and functions for gamification features including:
 * - Profile data (level, points, etc.)
 * - Achievements
 * - Challenges
 * - Kindness quests
 * - Game board interaction
 */
const useGamificationMcp = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [kindnessQuests, setKindnessQuests] = useState<KindnessQuest[]>([]);
  const [boardPosition, setBoardPosition] = useState<BoardPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to refresh all gamification data
  const refreshAll = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parallel fetch for all gamification data
      const [
        profileResponse,
        achievementsResponse,
        boardResponse,
        challengesResponse,
        questsResponse
      ] = await Promise.all([
        gamificationMcpApi.getGamificationProfile({ userId: user.id }),
        gamificationMcpApi.getAchievements({ 
          userId: user.id, 
          includeCompleted: true,
          includeInProgress: true
        }),
        gamificationMcpApi.getBoardPosition({ userId: user.id }),
        gamificationMcpApi.getChallenges({ userId: user.id, limit: 5 }),
        gamificationMcpApi.getKindnessQuests({ userId: user.id, limit: 5 })
      ]);
      
      // Update state with fetched data
      if (profileResponse?.data?.profile) {
        setProfile(profileResponse.data.profile);
      }
      
      if (achievementsResponse?.data?.achievements) {
        setAchievements(achievementsResponse.data.achievements);
      }
      
      if (boardResponse?.data?.position) {
        setBoardPosition(boardResponse.data.position);
      }
      
      if (challengesResponse?.data?.challenges) {
        setChallenges(challengesResponse.data.challenges);
      }
      
      if (questsResponse?.data?.quests) {
        setKindnessQuests(questsResponse.data.quests);
      }
    } catch (err) {
      console.error('Error loading gamification data:', err);
      setError('Failed to load gamification data. Please try again later.');
      
      // Set mock data for demonstration if in development mode
      if (process.env.NODE_ENV === 'development') {
        setMockData();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to roll dice on the game board
  const rollDice = async (useBoost: boolean = false): Promise<DiceRollResult | null> => {
    if (!user?.id) return null;
    
    try {
      const response = await gamificationMcpApi.rollDice({
        userId: user.id,
        useBoost
      });
      
      if (response?.data?.result) {
        // Update board position
        const newPosition = response.data.result.newPosition;
        setBoardPosition(prev => prev ? ({
          ...prev,
          position: newPosition,
          lastRoll: response.data.result.roll,
          canRoll: false,
          nextRollTime: response.data.result.nextRollTime
        }) : null);
        
        // Update profile if rewards were earned
        if (response.data.result.rewardsEarned && profile) {
          setProfile({
            ...profile,
            points: profile.points + response.data.result.pointsEarned,
            boosts: useBoost ? profile.boosts - 1 : profile.boosts
          });
        }
        
        return response.data.result;
      }
      
      return null;
    } catch (err) {
      console.error('Error rolling dice:', err);
      return null;
    }
  };
  
  // Function to join a challenge
  const joinChallenge = async (challengeId: string) => {
    if (!user?.id) return false;
    
    try {
      await gamificationMcpApi.joinChallenge({
        userId: user.id,
        challengeId
      });
      
      // Update challenges list
      setChallenges(prev => 
        prev.map(challenge => 
          challenge.id === challengeId 
            ? { ...challenge, joined: true } 
            : challenge
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error joining challenge:', err);
      return false;
    }
  };
  
  // Function to complete a kindness quest
  const completeQuest = async (questId: string) => {
    if (!user?.id) return false;
    
    try {
      const response = await gamificationMcpApi.completeKindnessQuest({
        userId: user.id,
        questId
      });
      
      if (response?.data?.success) {
        // Update quests list
        setKindnessQuests(prev => 
          prev.map(quest => 
            quest.id === questId 
              ? { ...quest, completed: true } 
              : quest
          )
        );
        
        // Update profile with earned points
        if (response.data.pointsEarned) {
          setProfile(prev => ({
            ...prev,
            points: prev.points + response.data.pointsEarned,
            kindnessScore: prev.kindnessScore + response.data.kindnessPoints
          }));
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error completing quest:', err);
      return false;
    }
  };
  
  // Set mock data for demonstration purposes (used in development)
  const setMockData = () => {
    // Mock profile data
    setProfile({
      level: 12,
      points: 2500,
      streak: 5,
      kindnessScore: 78,
      challengesCompleted: 8,
      questsCompleted: 15,
      powerups: 3,
      boosts: 2
    });
    
    // Mock achievements
    setAchievements([
      {
        id: 'achievement1',
        name: 'Workout Warrior',
        description: 'Complete 10 workouts',
        progress: 80,
        icon: 'dumbbell',
        color: '#00ffff'
      },
      {
        id: 'achievement2',
        name: 'Kindness Champion',
        description: 'Complete 5 kindness quests',
        progress: 100,
        completed: true,
        icon: 'heart',
        color: '#FF6B6B'
      },
      {
        id: 'achievement3',
        name: 'Social Butterfly',
        description: 'Connect with 3 other users',
        progress: 67,
        icon: 'users',
        color: '#7851a9'
      }
    ]);
    
    // Mock board position
    setBoardPosition({
      position: 23,
      lastRoll: 5,
      canRoll: true,
      nextRollTime: null
    });
    
    // Mock challenges
    setChallenges([
      {
        id: 'challenge1',
        name: '30-Day Plank Challenge',
        description: 'Increase your plank time every day for 30 days',
        progress: 60,
        joined: true,
        participants: 128,
        endDate: '2025-05-30T00:00:00Z'
      },
      {
        id: 'challenge2',
        name: 'Nutrition Master',
        description: 'Log your meals for 14 consecutive days',
        progress: 0,
        joined: false,
        participants: 56,
        endDate: '2025-06-15T00:00:00Z'
      },
      {
        id: 'challenge3',
        name: 'Dance Marathon',
        description: 'Complete 10 dance workouts in one month',
        progress: 30,
        joined: true,
        participants: 72,
        endDate: '2025-05-25T00:00:00Z'
      }
    ]);
    
    // Mock kindness quests
    setKindnessQuests([
      {
        id: 'quest1',
        name: 'Motivate a Friend',
        description: 'Send a motivational message to a friend',
        completed: false,
        points: 50
      },
      {
        id: 'quest2',
        name: 'Share Your Knowledge',
        description: 'Help a beginner with a workout technique',
        completed: true,
        points: 100
      },
      {
        id: 'quest3',
        name: 'Community Support',
        description: 'Participate in a community challenge',
        completed: false,
        points: 150
      }
    ]);
  };
  
  // Load data on initial mount
  useEffect(() => {
    refreshAll();
  }, [user?.id]);
  
  return {
    // State
    profile,
    achievements,
    challenges,
    kindnessQuests,
    boardPosition,
    loading,
    error,
    
    // Actions
    refreshAll,
    rollDice,
    joinChallenge,
    completeQuest
  };
};

export default useGamificationMcp;