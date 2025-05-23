// Type definitions for Client Dashboard components

// Level progress
export interface ProgressLevel {
  level: number;
  name: string;
  description: string;
  progress: number;
  totalNeeded: number;
}

// Achievement
export interface Achievement {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  unlocked: boolean;
  dateUnlocked?: string;
  points: number;
}

// Exercise
export interface Exercise {
  id: string;
  name: string;
  type: string;
  level: number;
  sets: number;
  reps: number;
  muscleGroups: string[];
  icon: React.ReactNode;
}

// Challenge
export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  progress: number;
  goal: number;
  endDate: string;
  active: boolean;
}

// Scheduled Session
export interface ScheduledSession {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  trainerName: string;
  trainerAvatar?: string;
  location: string;
  type: string;
  isActive: boolean;
}

// Reward
export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredPoints: number;
  unlocked: boolean;
}

// NASM Category
export interface NasmCategory {
  type: string;
  name: string;
  level: number;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

// Body Part Progress
export interface BodyPartProgress {
  name: string;
  level: number;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

// Activity Summary
export interface ActivitySummary {
  date: string;
  workouts: number;
  exercises: number;
  duration: number;
  intensity: number; // 0-4 scale
}

// User Stats
export interface UserStats {
  workoutsCompleted: number;
  totalExercisesPerformed: number;
  streakDays: number;
  totalMinutes: number;
  calories: number;
  personalBests: number;
}

// Key Exercises
export interface KeyExercises {
  [key: string]: {
    level: number;
    progress: number;
  };
}
