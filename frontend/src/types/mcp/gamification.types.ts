/**
 * Gamification MCP Types
 * 
 * UPDATED - Type definitions for the Gamification MCP service
 * Fixed interface mismatches and added missing properties
 * 
 * @module types/mcp/gamification.types
 */

import { McpApiResponse, SuccessResponse, ServerStatus } from './service.types';

/**
 * Gamification profile data
 */
export interface GamificationProfile {
  level: number;
  points: number;
  streak: number;
  kindnessScore: number;
  challengesCompleted: number;
  questsCompleted: number;
  powerups: number;
  boosts: number;
  lastUpdated?: string;
  mcpEnhanced?: boolean;
  errorMessage?: string;
}

/**
 * Achievement data - ENHANCED
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  pointsAwarded: number;
  unlockedAt: string | null;
  isUnlocked: boolean;
  progress?: number;
  target?: number;
  mcpEnhanced?: boolean;
  lastChecked?: string;
}

/**
 * Challenge data - ENHANCED
 */
export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  progress: number;
  target: number;
  participants: number;
  rewards: {
    points: number;
    badge?: {
      name: string;
      icon: string;
    };
  };
  category: 'daily' | 'weekly' | 'monthly' | 'special';
  mcpEnhanced?: boolean;
  lastUpdated?: string;
}

/**
 * Kindness quest data - ENHANCED
 */
export interface KindnessQuest {
  id: string;
  name: string;
  description: string;
  type: 'community_support' | 'mentorship' | 'encouragement' | 'sharing';
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: string;
  progress: number;
  target: number;
  rewards: {
    kindnessPoints: number;
    experiencePoints: number;
    badge?: {
      name: string;
      icon: string;
    };
  };
  isActive: boolean;
  completedAt: string | null;
  mcpEnhanced?: boolean;
  lastUpdated?: string;
}

/**
 * Board position data - ENHANCED
 */
export interface BoardPosition {
  currentPosition: number;
  totalSpaces: number;
  currentSpace: {
    id: string;
    name: string;
    description: string;
    type: 'normal' | 'checkpoint' | 'special' | 'bonus';
    bonus?: {
      type: 'points' | 'energy' | 'powerup';
      amount: number;
    };
  };
  movesRemaining: number;
  canRollDice: boolean;
  lastMoveAt: string;
  mcpEnhanced?: boolean;
  lastUpdated?: string;
  errorMessage?: string;
}

/**
 * Dice roll result - ENHANCED
 */
export interface DiceRollResult {
  diceValue: number;
  diceType: 'standard' | 'bonus' | 'power';
  bonusMultiplier: number;
  newPosition: number;
  spaceReached: {
    id: string;
    name: string;
    description: string;
    type: 'normal' | 'checkpoint' | 'special' | 'bonus';
    bonus?: {
      type: 'points' | 'energy' | 'powerup';
      amount: number;
    };
  };
  pointsEarned: number;
  achievementsUnlocked: string[];
  rolledAt: string;
  mcpEnhanced?: boolean;
  mcpResponse?: string;
}

/**
 * Parameters for getting gamification profile
 */
export interface GetGamificationProfileParams {
  userId: string;
}

/**
 * Parameters for getting achievements
 */
export interface GetAchievementsParams {
  userId: string;
  category?: string;
  includeProgress?: boolean;
}

/**
 * Parameters for getting board position
 */
export interface GetBoardPositionParams {
  userId: string;
}

/**
 * Parameters for rolling dice
 */
export interface RollDiceParams {
  userId: string;
  diceType?: 'standard' | 'bonus' | 'power';
}

/**
 * Parameters for getting challenges
 */
export interface GetChallengesParams {
  userId: string;
  status?: 'active' | 'completed' | 'expired';
  category?: 'daily' | 'weekly' | 'monthly' | 'special';
}

/**
 * Parameters for joining a challenge
 */
export interface JoinChallengeParams {
  userId: string;
  challengeId: string;
}

/**
 * Parameters for getting kindness quests
 */
export interface GetKindnessQuestsParams {
  userId: string;
  status?: 'active' | 'completed';
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Parameters for completing a kindness quest
 */
export interface CompleteKindnessQuestParams {
  userId: string;
  questId: string;
  completionData?: any;
}

/**
 * Response for completing a quest - ENHANCED
 */
export interface CompleteQuestResponse extends SuccessResponse {
  pointsEarned?: number;
  kindnessPointsEarned?: number;
  achievementsUnlocked?: string[];
  newLevel?: number | null;
  mcpEnhanced?: boolean;
}

/**
 * Gamification MCP API interface - CORRECTED
 */
export interface GamificationMcpApi {
  checkServerStatus: () => Promise<McpApiResponse<ServerStatus>>;
  getGamificationProfile: (params: GetGamificationProfileParams) => Promise<McpApiResponse<GamificationProfile>>;
  getAchievements: (params: GetAchievementsParams) => Promise<McpApiResponse<Achievement[]>>;
  getBoardPosition: (params: GetBoardPositionParams) => Promise<McpApiResponse<BoardPosition>>;
  rollDice: (params: RollDiceParams) => Promise<McpApiResponse<DiceRollResult>>;
  getChallenges: (params: GetChallengesParams) => Promise<McpApiResponse<Challenge[]>>;
  joinChallenge: (params: JoinChallengeParams) => Promise<McpApiResponse<SuccessResponse>>;
  getKindnessQuests: (params: GetKindnessQuestsParams) => Promise<McpApiResponse<KindnessQuest[]>>;
  completeKindnessQuest: (params: CompleteKindnessQuestParams) => Promise<McpApiResponse<CompleteQuestResponse>>;
}