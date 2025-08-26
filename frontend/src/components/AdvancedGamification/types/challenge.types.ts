/**
 * 🎯 CHALLENGE SYSTEM TYPES - ADMIN CRUD READY
 * ================================================
 * Comprehensive TypeScript definitions for the SwanStudios
 * gamification challenge system with full admin management capabilities
 */

// ================================================================
// CORE CHALLENGE INTERFACES
// ================================================================

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special' | 'community';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ChallengeCategory = 'cardio' | 'strength' | 'flexibility' | 'nutrition' | 'mindfulness' | 'social' | 'hybrid';
export type ChallengeStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type ParticipationStatus = 'joined' | 'in_progress' | 'completed' | 'failed' | 'abandoned';

// ================================================================
// CHALLENGE METRICS & TARGETS
// ================================================================

export interface ChallengeTarget {
  metric: string; // e.g., 'workout_count', 'calories_burned', 'steps', 'duration_minutes'
  value: number;
  unit: string; // e.g., 'workouts', 'calories', 'steps', 'minutes'
  operator: 'greater_than' | 'less_than' | 'equal_to' | 'between';
  description: string;
}

export interface ChallengeDuration {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  durationDays: number;
  timezone: string;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

// ================================================================
// CHALLENGE REWARDS SYSTEM
// ================================================================

export interface ChallengeReward {
  xpPoints: number;
  badgeId?: string;
  badgeName?: string;
  badgeIcon?: string;
  specialReward?: {
    type: 'discount' | 'premium_access' | 'merchandise' | 'session_credit';
    value: string;
    description: string;
  };
  celebrationMessage: string;
  isExclusive: boolean;
}

// ================================================================
// PARTICIPATION & PROGRESS TRACKING
// ================================================================

export interface ParticipationRecord {
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  status: ParticipationStatus;
  progress: {
    currentValue: number;
    targetValue: number;
    percentage: number;
    lastUpdated: string;
  };
  completedAt?: string;
  abandonedAt?: string;
  ranking?: number;
}

export interface ChallengeProgress {
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  averageProgress: number;
  completionRate: number;
  participationTrend: {
    date: string;
    participants: number;
  }[];
}

// ================================================================
// MAIN CHALLENGE INTERFACE
// ================================================================

export interface Challenge {
  // Basic Information
  id: string;
  title: string;
  description: string;
  shortDescription: string; // For cards and previews
  imageUrl?: string;
  iconName?: string; // Lucide icon name
  
  // Challenge Configuration
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  status: ChallengeStatus;
  
  // Goals & Requirements
  targets: ChallengeTarget[];
  duration: ChallengeDuration;
  prerequisites?: string[]; // Required achievements or challenges
  
  // Participation Rules
  maxParticipants?: number;
  minParticipants?: number;
  isPublic: boolean;
  requiresApproval: boolean;
  allowLateJoin: boolean;
  
  // Rewards Configuration
  rewards: ChallengeReward;
  milestoneRewards?: {
    percentage: number;
    reward: Partial<ChallengeReward>;
  }[];
  
  // Social Features
  allowTeams: boolean;
  maxTeamSize?: number;
  enableLeaderboard: boolean;
  enableComments: boolean;
  
  // Admin Management
  createdBy: string; // Admin user ID
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  
  // Analytics & Tracking
  participationData: ParticipationRecord[];
  progressData: ChallengeProgress;
  engagementMetrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  
  // System Fields
  version: number;
  isTemplate: boolean;
  tags: string[];
  searchKeywords: string[];
}

// ================================================================
// ADMIN MANAGEMENT INTERFACES
// ================================================================

export interface CreateChallengeRequest {
  title: string;
  description: string;
  shortDescription: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  targets: Omit<ChallengeTarget, 'description'>[];
  duration: Omit<ChallengeDuration, 'timezone'>;
  rewards: Omit<ChallengeReward, 'celebrationMessage'>;
  maxParticipants?: number;
  isPublic: boolean;
  imageUrl?: string;
  iconName?: string;
  tags: string[];
}

export interface UpdateChallengeRequest extends Partial<CreateChallengeRequest> {
  id: string;
  status?: ChallengeStatus;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  templateData: Partial<CreateChallengeRequest>;
  usageCount: number;
  createdAt: string;
}

export interface BulkChallengeAction {
  challengeIds: string[];
  action: 'activate' | 'pause' | 'archive' | 'delete' | 'duplicate';
  options?: {
    newStatus?: ChallengeStatus;
    modifications?: Partial<UpdateChallengeRequest>;
  };
}

// ================================================================
// CHALLENGE ANALYTICS INTERFACES
// ================================================================

export interface ChallengeAnalytics {
  challengeId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Participation Metrics
  participation: {
    totalViews: number;
    totalJoins: number;
    totalCompletions: number;
    conversionRate: number; // views to joins
    completionRate: number; // joins to completions
    averageCompletionTime: number; // in hours
  };
  
  // Engagement Metrics
  engagement: {
    averageSessionsPerUser: number;
    averageProgressUpdates: number;
    socialInteractions: number;
    returnRate: number;
  };
  
  // Performance Comparison
  benchmarks: {
    categoryAverage: number;
    difficultyAverage: number;
    typeAverage: number;
  };
  
  // Trend Data
  trends: {
    date: string;
    joins: number;
    completions: number;
    engagement: number;
  }[];
}

// ================================================================
// USER EXPERIENCE INTERFACES
// ================================================================

export interface UserChallengeView {
  challenge: Challenge;
  userProgress?: ParticipationRecord;
  isEligible: boolean;
  canJoin: boolean;
  joinRestrictions?: string[];
  estimatedDifficulty: number; // 1-10 based on user level
  personalizedMessage?: string;
}

export interface ChallengeListFilter {
  type?: ChallengeType[];
  difficulty?: ChallengeDifficulty[];
  category?: ChallengeCategory[];
  status?: ChallengeStatus[];
  participationStatus?: ParticipationStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  sortBy: 'newest' | 'oldest' | 'popularity' | 'difficulty' | 'ending_soon' | 'rewards';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}

// ================================================================
// API RESPONSE INTERFACES
// ================================================================

export interface ChallengeListResponse {
  challenges: Challenge[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  filters: ChallengeListFilter;
}

export interface ChallengeDetailsResponse {
  challenge: Challenge;
  userParticipation?: ParticipationRecord;
  leaderboard: ParticipationRecord[];
  relatedChallenges: Challenge[];
  canParticipate: boolean;
  restrictions?: string[];
}

export interface ChallengeActionResponse {
  success: boolean;
  message: string;
  data?: {
    challengeId: string;
    userId: string;
    action: string;
    timestamp: string;
  };
  errors?: string[];
}

// ================================================================
// FORM VALIDATION INTERFACES
// ================================================================

export interface ChallengeFormErrors {
  title?: string;
  description?: string;
  targets?: string;
  duration?: string;
  rewards?: string;
  participants?: string;
  general?: string[];
}

export interface ChallengeFormValidation {
  isValid: boolean;
  errors: ChallengeFormErrors;
  warnings?: string[];
}

// ================================================================
// CHALLENGE BUILDER INTERFACES (FOR ADMIN UI)
// ================================================================

export interface ChallengeBuilderStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  validationRules: string[];
}

export interface ChallengeBuilderState {
  currentStep: number;
  steps: ChallengeBuilderStep[];
  formData: Partial<CreateChallengeRequest>;
  validation: ChallengeFormValidation;
  isDraft: boolean;
  lastSaved: string;
}

// ================================================================
// EXPORT ALL TYPES
// ================================================================

export type {
  Challenge,
  ChallengeTarget,
  ChallengeDuration,
  ChallengeReward,
  ParticipationRecord,
  ChallengeProgress,
  CreateChallengeRequest,
  UpdateChallengeRequest,
  ChallengeTemplate,
  BulkChallengeAction,
  ChallengeAnalytics,
  UserChallengeView,
  ChallengeListFilter,
  ChallengeListResponse,
  ChallengeDetailsResponse,
  ChallengeActionResponse,
  ChallengeFormErrors,
  ChallengeFormValidation,
  ChallengeBuilderStep,
  ChallengeBuilderState
};
