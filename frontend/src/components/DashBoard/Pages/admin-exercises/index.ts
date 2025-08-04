/**
 * Admin Exercise Command Center - Index Exports
 * =============================================
 * 
 * Central export file for all admin exercise management components
 * Provides clean imports for the complete exercise command center system
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Main AdminExerciseCommandCenter component
 * - All sub-components and modals
 * - Custom hooks for gamification and functionality
 * - Theme and animation utilities
 * - TypeScript type definitions
 */

// === MAIN COMPONENT ===
import AdminExerciseCommandCenter from './AdminExerciseCommandCenter';
export { AdminExerciseCommandCenter };
export default AdminExerciseCommandCenter;

// === CORE COMPONENTS ===
export { default as VideoUploadProcessor } from './components/VideoUploadProcessor';
export { default as ExerciseCreationWizard } from './components/ExerciseCreationWizard';
export { default as ExercisePreviewModal } from './components/ExercisePreviewModal';
export { default as ExerciseStatsPanel } from './components/ExerciseStatsPanel';
export { default as AdminAchievementCelebration } from './components/AdminAchievementCelebration';
export { default as ExerciseLibraryManager } from './components/ExerciseLibraryManager';

// === CUSTOM HOOKS ===
export { useExerciseGamification } from './hooks/useExerciseGamification';
export { useVideoUpload } from './hooks/useVideoUpload';
export { useExerciseStats } from './hooks/useExerciseStats';
export { useNASMValidation } from './hooks/useNASMValidation';

// === THEME & STYLES ===
export { default as exerciseCommandTheme } from './styles/exerciseCommandTheme';
export { mediaQueries } from './styles/exerciseCommandTheme';
export { 
  motionVariants,
  achievementUnlock,
  confettiParticle,
  levelUpSequence,
  streakFlame,
  progressBarFill,
  cardHover,
  uploadPulse,
  validationSuccess,
  validationError,
  accessibleAnimation,
  animationPerformance
} from './styles/gamificationAnimations';

// === TYPE DEFINITIONS ===
export interface AdminExerciseStats {
  totalExercises: number;
  videosUploaded: number;
  activeUsers: number;
  avgQualityScore: number;
  adminLevel: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  totalPoints: number;
  achievements: string[];
  recentActivity: any[];
}

export interface AdminAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointValue: number;
  condition: {
    type: 'exercise_created' | 'video_uploaded' | 'user_engagement' | 'quality_score' | 'streak';
    threshold: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  unlockedAt?: string;
  progress?: number;
  isUnlocked: boolean;
  isNew?: boolean;
}

export interface ExerciseFormData {
  name: string;
  description: string;
  instructions: string[];
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentNeeded: string[];
  difficulty: number;
  contraindicationNotes: string;
  safetyTips: string;
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedDuration?: number;
  prerequisites: string[];
  progressionPath: string[];
  videoFile?: File;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentNeeded: string[];
  difficulty: number;
  contraindicationNotes: string;
  safetyTips: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  nasmScore?: number;
  stats?: {
    views: number;
    completions: number;
    avgRating: number;
    lastUsed: string;
  };
}

export interface ComplianceReport {
  overallScore: number;
  maxScore: number;
  percentage: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  passesCompliance: boolean;
  validationResults: {
    category: string;
    results: any[];
    categoryScore: number;
    categoryWeight: number;
  }[];
  recommendations: string[];
  criticalIssues: any[];
}

// === UTILITY FUNCTIONS ===
export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getDifficultyLabel = (difficulty: number): { 
  label: string; 
  variant: 'primary' | 'success' | 'warning' 
} => {
  if (difficulty <= 200) return { label: 'Beginner', variant: 'success' };
  if (difficulty <= 600) return { label: 'Intermediate', variant: 'primary' };
  return { label: 'Advanced', variant: 'warning' };
};

export const calculateLevel = (xp: number): { 
  level: number; 
  currentLevelXP: number; 
  nextLevelXP: number 
} => {
  const LEVEL_XP_REQUIREMENTS = [
    0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000,
    20000, 26000, 33000, 41000, 50000, 60000, 71000, 83000, 96000, 110000
  ];
  
  let level = 1;
  let currentLevelXP = 0;
  let nextLevelXP = LEVEL_XP_REQUIREMENTS[1];
  
  for (let i = 1; i < LEVEL_XP_REQUIREMENTS.length; i++) {
    if (xp >= LEVEL_XP_REQUIREMENTS[i]) {
      level = i + 1;
      currentLevelXP = LEVEL_XP_REQUIREMENTS[i];
      nextLevelXP = LEVEL_XP_REQUIREMENTS[i + 1] || LEVEL_XP_REQUIREMENTS[i] + 10000;
    } else {
      break;
    }
  }
  
  return { level, currentLevelXP, nextLevelXP };
};

// === CONSTANTS ===
export const EXERCISE_TYPES = [
  'Strength Training', 'Cardio', 'Flexibility', 'Balance', 'Core',
  'Calisthenics', 'Olympic Lifting', 'Powerlifting', 'Functional',
  'Rehabilitation', 'Mobility', 'Stability', 'Plyometric'
];

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps',
  'Core', 'Abs', 'Obliques', 'Legs', 'Quadriceps', 'Hamstrings',
  'Glutes', 'Calves', 'Forearms', 'Neck', 'Full Body'
];

export const EQUIPMENT_OPTIONS = [
  'None/Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
  'TRX/Suspension Trainer', 'Pull-up Bar', 'Bench', 'Medicine Ball',
  'Stability Ball', 'Foam Roller', 'Cable Machine', 'Smith Machine'
];

export const XP_REWARDS = {
  exercise_created: 50,
  video_uploaded: 25,
  quality_score_improvement: 10,
  user_engagement: 5,
  daily_streak: 20,
  weekly_streak: 100,
  monthly_streak: 500,
};

export const POINT_MULTIPLIERS = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
};

// === DEFAULT EXPORT ===
// Already exported at the top of the file
