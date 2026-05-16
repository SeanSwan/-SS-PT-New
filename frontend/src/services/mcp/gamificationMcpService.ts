/**
 * Retired Gamification MCP compatibility adapter.
 *
 * The app now uses `/api/v1/gamification` and `/api/gamification` routes as
 * the source of truth. This MCP-named adapter remains only so older imports do
 * not break; it never calls `/mcp` routes or returns pretend achievement data.
 */

import productionApiService from '../api.service';
import type {
  Achievement,
  BoardPosition,
  Challenge,
  CompleteQuestResponse,
  CompleteKindnessQuestParams,
  DiceRollResult,
  GamificationMcpApi,
  GamificationProfile,
  GetAchievementsParams,
  GetBoardPositionParams,
  GetChallengesParams,
  GetGamificationProfileParams,
  GetKindnessQuestsParams,
  JoinChallengeParams,
  KindnessQuest,
  RollDiceParams
} from '../../types/mcp/gamification.types';
import type { McpApiResponse, ServerStatus, SuccessResponse } from '../../types/mcp/service.types';

class GamificationMcpError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public fallbackMode = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'GamificationMcpError';
  }
}

const unwrap = (response: any) => response?.data?.data || response?.data || {};

const emptyProfile = (): GamificationProfile => ({
  level: 1,
  points: 0,
  streak: 0,
  kindnessScore: 0,
  challengesCompleted: 0,
  questsCompleted: 0,
  powerups: 0,
  boosts: 0,
  lastUpdated: new Date().toISOString()
});

const emptyBoardPosition = (): BoardPosition => ({
  currentPosition: 0,
  position: 0,
  totalSpaces: 0,
  currentSpace: {
    id: 'not-configured',
    name: 'Board unavailable',
    description: 'The legacy board surface has no active API contract.',
    type: 'normal'
  },
  movesRemaining: 0,
  canRollDice: false,
  canRoll: false,
  lastRoll: null,
  nextRollTime: null,
  lastMoveAt: '',
  lastUpdated: new Date().toISOString()
} as unknown as BoardPosition);

const emptyRoll = (diceType: RollDiceParams['diceType'] = 'standard'): DiceRollResult => ({
  diceValue: 0,
  diceType,
  bonusMultiplier: 1,
  newPosition: 0,
  spaceReached: emptyBoardPosition().currentSpace,
  pointsEarned: 0,
  achievementsUnlocked: [],
  rolledAt: new Date().toISOString()
});

const gamificationMcpApi: GamificationMcpApi = {
  checkServerStatus: async (): Promise<McpApiResponse<ServerStatus>> => ({
    data: {
      status: 'disabled',
      version: 'N/A',
      uptime: 'N/A',
      message: 'Gamification MCP retired. SwanStudios gamification APIs are active.'
    }
  }),

  getGamificationProfile: async ({ userId }: GetGamificationProfileParams): Promise<McpApiResponse<GamificationProfile>> => {
    try {
      const response = await productionApiService.get(`/api/v1/gamification/users/${userId}/profile`);
      const data = unwrap(response);
      return { data: data.profile || data.user || data || emptyProfile() };
    } catch {
      return { data: emptyProfile() };
    }
  },

  getAchievements: async ({ userId, category, includeProgress }: GetAchievementsParams): Promise<McpApiResponse<Achievement[]>> => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (includeProgress !== undefined) params.set('includeProgress', String(includeProgress));
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await productionApiService.get(`/api/v1/gamification/users/${userId}/achievements${query}`);
      const data = unwrap(response);
      return { data: data.achievements || data.items || [] };
    } catch {
      return { data: [] };
    }
  },

  getBoardPosition: async (_params: GetBoardPositionParams): Promise<McpApiResponse<BoardPosition>> => ({
    data: emptyBoardPosition()
  }),

  rollDice: async ({ diceType }: RollDiceParams): Promise<McpApiResponse<DiceRollResult>> => ({
    data: emptyRoll(diceType)
  }),

  getChallenges: async ({ userId, status, category }: GetChallengesParams): Promise<McpApiResponse<Challenge[]>> => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await productionApiService.get(`/api/v1/gamification/users/${userId}/challenges${query}`);
      const data = unwrap(response);
      return { data: data.challenges || data.items || [] };
    } catch {
      return { data: [] };
    }
  },

  joinChallenge: async ({ challengeId }: JoinChallengeParams): Promise<McpApiResponse<SuccessResponse>> => {
    try {
      const response = await productionApiService.post(`/api/v1/gamification/challenges/${challengeId}/join`);
      const data = unwrap(response);
      return { data: { success: data.success !== false, message: data.message } };
    } catch (error: any) {
      return { data: { success: false, message: error?.message || 'Challenge join failed' } };
    }
  },

  getKindnessQuests: async (_params: GetKindnessQuestsParams): Promise<McpApiResponse<KindnessQuest[]>> => ({
    data: []
  }),

  completeKindnessQuest: async (_params: CompleteKindnessQuestParams): Promise<McpApiResponse<CompleteQuestResponse>> => ({
    data: {
      success: false,
      message: 'Kindness quest API is not active on the REST gamification surface.',
      pointsEarned: 0,
      kindnessPointsEarned: 0,
      achievementsUnlocked: [],
      newLevel: null
    }
  })
};

export { gamificationMcpApi, gamificationMcpApi as gamificationMcpService, GamificationMcpError };
export default gamificationMcpApi;
