/**
 * 🎮 GAMIFICATION SLICE - REDUX STATE MANAGEMENT
 * =============================================
 * Comprehensive Redux Toolkit slice for managing all gamification data,
 * including achievements, challenges, leaderboards, progress, and user stats
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  xpReward: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: string[];
  shareCount?: number;
  isNew?: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challengeType: 'daily' | 'weekly' | 'monthly' | 'community' | 'custom';
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'fitness' | 'nutrition' | 'mindfulness' | 'social' | 'streak';
  xpReward: number;
  participants: number;
  maxParticipants?: number;
  progress: number;
  maxProgress: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  tags: string[];
  requirements: string[];
  isParticipating: boolean;
  isCompleted: boolean;
  completionRate: number;
  leaderboard?: { userId: string; username: string; progress: number; }[];
}

export interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  totalXP: number;
  weeklyXP: number;
  monthlyXP: number;
  rank: number;
  previousRank?: number;
  streak: number;
  totalWorkouts: number;
  completedChallenges: number;
  achievementCount: number;
  isOnline: boolean;
  isFriend: boolean;
  isCurrentUser: boolean;
  badges: string[];
  joinedDate: string;
}

export interface UserStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  streakDays: number;
  completedChallenges: number;
  totalAchievements: number;
  rank: number;
  totalUsers: number;
  weeklyXP: number;
  monthlyXP: number;
  totalWorkouts: number;
}

export interface ProgressData {
  date: string;
  xp: number;
  workouts: number;
  achievements: number;
  challenges: number;
  streak: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: 'xp' | 'workouts' | 'achievements' | 'streak' | 'challenges';
  isCompleted: boolean;
  completedAt?: string;
  reward: {
    xp: number;
    badge?: string;
    title?: string;
  };
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  deadline: string;
  isActive: boolean;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface GamificationState {
  // User stats and progress
  userStats: UserStats | null;
  progressData: ProgressData[];
  milestones: Milestone[];
  goals: Goal[];
  
  // Achievements
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  
  // Challenges
  challenges: Challenge[];
  activeChallenges: Challenge[];
  availableChallenges: Challenge[];
  completedChallenges: Challenge[];
  
  // Leaderboards
  leaderboard: LeaderboardUser[];
  currentUserRank: LeaderboardUser | null;
  
  // UI state
  loading: {
    stats: boolean;
    achievements: boolean;
    challenges: boolean;
    leaderboard: boolean;
    progress: boolean;
  };
  
  error: {
    stats: string | null;
    achievements: string | null;
    challenges: string | null;
    leaderboard: string | null;
    progress: string | null;
  };
  
  // Filters and preferences
  filters: {
    achievementCategory: string;
    achievementRarity: string;
    challengeStatus: string;
    challengeCategory: string;
    leaderboardTimeframe: string;
    leaderboardCategory: string;
    progressTimeframe: string;
  };
  
  // Real-time updates
  lastUpdated: {
    stats: string | null;
    achievements: string | null;
    challenges: string | null;
    leaderboard: string | null;
  };
}

// ================================================================
// ASYNC THUNKS (API CALLS)
// ================================================================

// User Stats
export const fetchUserStats = createAsyncThunk(
  'gamification/fetchUserStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateUserProgress = createAsyncThunk(
  'gamification/updateUserProgress',
  async ({ userId, activity, value }: { userId: string; activity: string; value: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity, value })
      });
      if (!response.ok) throw new Error('Failed to update progress');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Achievements
export const fetchAchievements = createAsyncThunk(
  'gamification/fetchAchievements',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/achievements`);
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const shareAchievement = createAsyncThunk(
  'gamification/shareAchievement',
  async ({ achievementId, platform }: { achievementId: string; platform: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/achievements/${achievementId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
      if (!response.ok) throw new Error('Failed to share achievement');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Challenges
export const fetchChallenges = createAsyncThunk(
  'gamification/fetchChallenges',
  async ({ status, category }: { status?: string; category?: string } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/v1/gamification/challenges?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch challenges');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const joinChallenge = createAsyncThunk(
  'gamification/joinChallenge',
  async ({ challengeId, userId }: { challengeId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to join challenge');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const leaveChallenge = createAsyncThunk(
  'gamification/leaveChallenge',
  async ({ challengeId, userId }: { challengeId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/challenges/${challengeId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to leave challenge');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const createChallenge = createAsyncThunk(
  'gamification/createChallenge',
  async (challengeData: Partial<Challenge>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/gamification/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challengeData)
      });
      if (!response.ok) throw new Error('Failed to create challenge');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateChallengeProgress = createAsyncThunk(
  'gamification/updateChallengeProgress',
  async ({ challengeId, userId, progress }: { challengeId: string; userId: string; progress: number }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/challenges/${challengeId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, progress })
      });
      if (!response.ok) throw new Error('Failed to update challenge progress');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Leaderboard
export const fetchLeaderboard = createAsyncThunk(
  'gamification/fetchLeaderboard',
  async ({ timeframe, category, limit }: { timeframe: string; category: string; limit?: number }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      params.append('category', category);
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(`/api/v1/gamification/leaderboard?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const followUser = createAsyncThunk(
  'gamification/followUser',
  async ({ userId, targetUserId }: { userId: string; targetUserId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      if (!response.ok) throw new Error('Failed to follow user');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const challengeUser = createAsyncThunk(
  'gamification/challengeUser',
  async ({ userId, targetUserId, challengeType }: { userId: string; targetUserId: string; challengeType: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, challengeType })
      });
      if (!response.ok) throw new Error('Failed to challenge user');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Progress Data
export const fetchProgressData = createAsyncThunk(
  'gamification/fetchProgressData',
  async ({ userId, timeframe }: { userId: string; timeframe: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/progress?timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchMilestones = createAsyncThunk(
  'gamification/fetchMilestones',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/milestones`);
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchGoals = createAsyncThunk(
  'gamification/fetchGoals',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/goals`);
      if (!response.ok) throw new Error('Failed to fetch goals');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const createGoal = createAsyncThunk(
  'gamification/createGoal',
  async ({ userId, goalData }: { userId: string; goalData: Partial<Goal> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/gamification/users/${userId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// ================================================================
// INITIAL STATE
// ================================================================

const initialState: GamificationState = {
  userStats: null,
  progressData: [],
  milestones: [],
  goals: [],
  
  achievements: [],
  unlockedAchievements: [],
  
  challenges: [],
  activeChallenges: [],
  availableChallenges: [],
  completedChallenges: [],
  
  leaderboard: [],
  currentUserRank: null,
  
  loading: {
    stats: false,
    achievements: false,
    challenges: false,
    leaderboard: false,
    progress: false,
  },
  
  error: {
    stats: null,
    achievements: null,
    challenges: null,
    leaderboard: null,
    progress: null,
  },
  
  filters: {
    achievementCategory: 'all',
    achievementRarity: 'all',
    challengeStatus: 'active',
    challengeCategory: 'all',
    leaderboardTimeframe: 'weekly',
    leaderboardCategory: 'all',
    progressTimeframe: 'monthly',
  },
  
  lastUpdated: {
    stats: null,
    achievements: null,
    challenges: null,
    leaderboard: null,
  },
};

// ================================================================
// SLICE DEFINITION
// ================================================================

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    // Filter actions
    setAchievementFilter: (state, action: PayloadAction<{ category?: string; rarity?: string }>) => {
      if (action.payload.category !== undefined) {
        state.filters.achievementCategory = action.payload.category;
      }
      if (action.payload.rarity !== undefined) {
        state.filters.achievementRarity = action.payload.rarity;
      }
    },
    
    setChallengeFilter: (state, action: PayloadAction<{ status?: string; category?: string }>) => {
      if (action.payload.status !== undefined) {
        state.filters.challengeStatus = action.payload.status;
      }
      if (action.payload.category !== undefined) {
        state.filters.challengeCategory = action.payload.category;
      }
    },
    
    setLeaderboardFilter: (state, action: PayloadAction<{ timeframe?: string; category?: string }>) => {
      if (action.payload.timeframe !== undefined) {
        state.filters.leaderboardTimeframe = action.payload.timeframe;
      }
      if (action.payload.category !== undefined) {
        state.filters.leaderboardCategory = action.payload.category;
      }
    },
    
    setProgressTimeframe: (state, action: PayloadAction<string>) => {
      state.filters.progressTimeframe = action.payload;
    },
    
    // Real-time updates
    updateUserStatsRealtime: (state, action: PayloadAction<Partial<UserStats>>) => {
      if (state.userStats) {
        state.userStats = { ...state.userStats, ...action.payload };
      }
      state.lastUpdated.stats = new Date().toISOString();
    },
    
    updateChallengeProgressRealtime: (state, action: PayloadAction<{ challengeId: string; progress: number }>) => {
      const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
      if (challenge) {
        challenge.progress = action.payload.progress;
      }
    },
    
    updateLeaderboardRealtime: (state, action: PayloadAction<LeaderboardUser[]>) => {
      state.leaderboard = action.payload;
      state.lastUpdated.leaderboard = new Date().toISOString();
    },
    
    // Achievement actions
    markAchievementAsViewed: (state, action: PayloadAction<string>) => {
      const achievement = state.achievements.find(a => a.id === action.payload);
      if (achievement && achievement.isNew) {
        achievement.isNew = false;
      }
    },
    
    // Clear error states
    clearError: (state, action: PayloadAction<keyof GamificationState['error']>) => {
      state.error[action.payload] = null;
    },
    
    // Reset state
    resetGamificationState: () => initialState,
  },
  
  extraReducers: (builder) => {
    // User Stats
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.userStats = action.payload;
        state.lastUpdated.stats = new Date().toISOString();
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload as string;
      });

    // Update User Progress
    builder
      .addCase(updateUserProgress.fulfilled, (state, action) => {
        if (state.userStats) {
          state.userStats = { ...state.userStats, ...action.payload.stats };
        }
      });

    // Achievements
    builder
      .addCase(fetchAchievements.pending, (state) => {
        state.loading.achievements = true;
        state.error.achievements = null;
      })
      .addCase(fetchAchievements.fulfilled, (state, action) => {
        state.loading.achievements = false;
        state.achievements = action.payload;
        state.unlockedAchievements = action.payload.filter((a: Achievement) => a.progress >= a.maxProgress);
        state.lastUpdated.achievements = new Date().toISOString();
      })
      .addCase(fetchAchievements.rejected, (state, action) => {
        state.loading.achievements = false;
        state.error.achievements = action.payload as string;
      });

    // Share Achievement
    builder
      .addCase(shareAchievement.fulfilled, (state, action) => {
        const achievement = state.achievements.find(a => a.id === action.payload.achievementId);
        if (achievement) {
          achievement.shareCount = (achievement.shareCount || 0) + 1;
        }
      });

    // Challenges
    builder
      .addCase(fetchChallenges.pending, (state) => {
        state.loading.challenges = true;
        state.error.challenges = null;
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.loading.challenges = false;
        state.challenges = action.payload;
        state.activeChallenges = action.payload.filter((c: Challenge) => c.isParticipating && !c.isCompleted);
        state.availableChallenges = action.payload.filter((c: Challenge) => !c.isParticipating);
        state.completedChallenges = action.payload.filter((c: Challenge) => c.isCompleted);
        state.lastUpdated.challenges = new Date().toISOString();
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.loading.challenges = false;
        state.error.challenges = action.payload as string;
      });

    // Join Challenge
    builder
      .addCase(joinChallenge.fulfilled, (state, action) => {
        const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
        if (challenge) {
          challenge.isParticipating = true;
          challenge.participants += 1;
          // Move to active challenges
          state.availableChallenges = state.availableChallenges.filter(c => c.id !== challenge.id);
          state.activeChallenges.push(challenge);
        }
      });

    // Leave Challenge
    builder
      .addCase(leaveChallenge.fulfilled, (state, action) => {
        const challenge = state.challenges.find(c => c.id === action.payload.challengeId);
        if (challenge) {
          challenge.isParticipating = false;
          challenge.participants -= 1;
          // Move to available challenges
          state.activeChallenges = state.activeChallenges.filter(c => c.id !== challenge.id);
          state.availableChallenges.push(challenge);
        }
      });

    // Create Challenge
    builder
      .addCase(createChallenge.fulfilled, (state, action) => {
        const newChallenge = action.payload;
        state.challenges.push(newChallenge);
        if (newChallenge.isParticipating) {
          state.activeChallenges.push(newChallenge);
        } else {
          state.availableChallenges.push(newChallenge);
        }
      });

    // Leaderboard
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loading.leaderboard = true;
        state.error.leaderboard = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.loading.leaderboard = false;
        state.leaderboard = action.payload;
        state.currentUserRank = action.payload.find((u: LeaderboardUser) => u.isCurrentUser) || null;
        state.lastUpdated.leaderboard = new Date().toISOString();
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.loading.leaderboard = false;
        state.error.leaderboard = action.payload as string;
      });

    // Progress Data
    builder
      .addCase(fetchProgressData.pending, (state) => {
        state.loading.progress = true;
        state.error.progress = null;
      })
      .addCase(fetchProgressData.fulfilled, (state, action) => {
        state.loading.progress = false;
        state.progressData = action.payload;
      })
      .addCase(fetchProgressData.rejected, (state, action) => {
        state.loading.progress = false;
        state.error.progress = action.payload as string;
      });

    // Milestones
    builder
      .addCase(fetchMilestones.fulfilled, (state, action) => {
        state.milestones = action.payload;
      });

    // Goals
    builder
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.goals = action.payload;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.push(action.payload);
      });
  },
});

// ================================================================
// EXPORTS
// ================================================================

export const {
  setAchievementFilter,
  setChallengeFilter,
  setLeaderboardFilter,
  setProgressTimeframe,
  updateUserStatsRealtime,
  updateChallengeProgressRealtime,
  updateLeaderboardRealtime,
  markAchievementAsViewed,
  clearError,
  resetGamificationState,
} = gamificationSlice.actions;

export default gamificationSlice.reducer;

// ================================================================
// SELECTORS
// ================================================================

export const selectUserStats = (state: { gamification: GamificationState }) => state.gamification.userStats;
export const selectAchievements = (state: { gamification: GamificationState }) => state.gamification.achievements;
export const selectUnlockedAchievements = (state: { gamification: GamificationState }) => state.gamification.unlockedAchievements;
export const selectActiveChallenges = (state: { gamification: GamificationState }) => state.gamification.activeChallenges;
export const selectAvailableChallenges = (state: { gamification: GamificationState }) => state.gamification.availableChallenges;
export const selectCompletedChallenges = (state: { gamification: GamificationState }) => state.gamification.completedChallenges;
export const selectLeaderboard = (state: { gamification: GamificationState }) => state.gamification.leaderboard;
export const selectCurrentUserRank = (state: { gamification: GamificationState }) => state.gamification.currentUserRank;
export const selectProgressData = (state: { gamification: GamificationState }) => state.gamification.progressData;
export const selectMilestones = (state: { gamification: GamificationState }) => state.gamification.milestones;
export const selectGoals = (state: { gamification: GamificationState }) => state.gamification.goals;
export const selectGamificationLoading = (state: { gamification: GamificationState }) => state.gamification.loading;
export const selectGamificationError = (state: { gamification: GamificationState }) => state.gamification.error;
export const selectGamificationFilters = (state: { gamification: GamificationState }) => state.gamification.filters;

// Filtered selectors
export const selectFilteredAchievements = (state: { gamification: GamificationState }) => {
  const { achievements, filters } = state.gamification;
  return achievements.filter(achievement => {
    const categoryMatch = filters.achievementCategory === 'all' || achievement.category === filters.achievementCategory;
    const rarityMatch = filters.achievementRarity === 'all' || achievement.rarity === filters.achievementRarity;
    return categoryMatch && rarityMatch;
  });
};

export const selectFilteredChallenges = (state: { gamification: GamificationState }) => {
  const { challenges, filters } = state.gamification;
  return challenges.filter(challenge => {
    let statusMatch = true;
    
    switch (filters.challengeStatus) {
      case 'active':
        statusMatch = challenge.isParticipating && !challenge.isCompleted;
        break;
      case 'available':
        statusMatch = !challenge.isParticipating;
        break;
      case 'completed':
        statusMatch = challenge.isCompleted;
        break;
    }

    const categoryMatch = filters.challengeCategory === 'all' || challenge.category === filters.challengeCategory;
    return statusMatch && categoryMatch;
  });
};
