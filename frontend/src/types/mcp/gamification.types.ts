/**
 * Gamification MCP Types
 * 
 * Type definitions for the Gamification MCP service
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
}

/**
 * Achievement data
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  completed?: boolean;
  icon: string;
  color: string;
}

/**
 * Challenge data
 */
export interface Challenge {
  id: string;
  name: string;
  description: string;
  progress: number;
  joined: boolean;
  participants: number;
  endDate: string;
}

/**
 * Kindness quest data
 */
export interface KindnessQuest {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  points: number;
}

/**
 * Board position data
 */
export interface BoardPosition {
  position: number;
  lastRoll: number;
  canRoll: boolean;
  nextRollTime: string | null;
}

/**
 * Dice roll result
 */
export interface DiceRollResult {
  roll: number;
  newPosition: number;
  rewardsEarned: boolean;
  pointsEarned: number;
  nextRollTime: string;
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
  includeCompleted?: boolean;
  includeInProgress?: boolean;
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
  useBoost?: boolean;
}

/**
 * Parameters for getting challenges
 */
export interface GetChallengesParams {
  userId: string;
  limit?: number;
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
  limit?: number;
}

/**
 * Parameters for completing a kindness quest
 */
export interface CompleteKindnessQuestParams {
  userId: string;
  questId: string;
}

/**
 * Response for completing a quest
 */
export interface CompleteQuestResponse extends SuccessResponse {
  pointsEarned?: number;
  kindnessPoints?: number;
}

/**
 * Gamification MCP API interface
 */
export interface GamificationMcpApi {
  checkServerStatus: () => Promise<McpApiResponse<ServerStatus>>;
  getGamificationProfile: (params: GetGamificationProfileParams) => Promise<McpApiResponse<{ profile: GamificationProfile }>>;
  getAchievements: (params: GetAchievementsParams) => Promise<McpApiResponse<{ achievements: Achievement[] }>>;
  getBoardPosition: (params: GetBoardPositionParams) => Promise<McpApiResponse<{ position: BoardPosition }>>;
  rollDice: (params: RollDiceParams) => Promise<McpApiResponse<{ result: DiceRollResult }>>;
  getChallenges: (params: GetChallengesParams) => Promise<McpApiResponse<{ challenges: Challenge[] }>>;
  joinChallenge: (params: JoinChallengeParams) => Promise<McpApiResponse<SuccessResponse>>;
  getKindnessQuests: (params: GetKindnessQuestsParams) => Promise<McpApiResponse<{ quests: KindnessQuest[] }>>;
  completeKindnessQuest: (params: CompleteKindnessQuestParams) => Promise<McpApiResponse<CompleteQuestResponse>>;
}
