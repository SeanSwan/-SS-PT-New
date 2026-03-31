/**
 * ============================================================================
 * FILE: TeachModeContracts.ts
 * PURPOSE: Type contracts for the shared Teach Mode system (AI Village locked)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all TypeScript interfaces for the Teach Mode
 * feature across 5 dashboard contexts. Locked per Architecture Debate consensus.
 *
 * KEY DECISIONS:
 * - isLoading/error intentionally absent from TeachModeState (owned by data hooks)
 * - Discriminated union for type-safe entity data per context
 * - TeachModeTab uses string literal union for extensibility
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Core Teach Mode Types
// ─────────────────────────────────────────────────────────────

export type TeachModeContext =
  | 'exercise'
  | 'coach-assistant'
  | 'gamification'
  | 'client-management'
  | 'scheduling';

export type TeachModeTab = string;

export interface TeachModeConfig {
  context: TeachModeContext;
  entityId?: string;
  entityData: TeachModeEntityData;
  defaultTab?: string;
  tabs: TeachModeTabDefinition[];
}

export interface TeachModeTabDefinition {
  id: string;
  label: string;
  icon?: string;
  lazyLoad?: boolean;
}

/** UI-only state — no loading/error (owned by data hooks per AI Village consensus) */
export interface TeachModeState {
  isOpen: boolean;
  activeTab: TeachModeTab;
  config: TeachModeConfig | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Context-Specific Entity Data
// ─────────────────────────────────────────────────────────────

export type TeachModeEntityData =
  | ExerciseEntityData
  | CoachAssistantEntityData
  | GamificationEntityData
  | ClientEntityData
  | SchedulingEntityData;

export interface ExerciseEntityData {
  context: 'exercise';
  exerciseId: string;
  exerciseName: string;
  phaseNumber: number;
}

export interface CoachAssistantEntityData {
  context: 'coach-assistant';
}

export interface GamificationEntityData {
  context: 'gamification';
}

export interface ClientEntityData {
  context: 'client-management';
  clientId?: string;
}

export interface SchedulingEntityData {
  context: 'scheduling';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Teach Data (API response shape)
// ─────────────────────────────────────────────────────────────

export interface ExerciseTeachData {
  id: string;
  name: string;
  description: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  source: string;
  difficulty: number;
  // Deep instruction data
  instructions: string;
  coachingCues: string[];
  safetyTips: string;
  contraindicationNotes: string;
  // Muscle data
  primaryMuscles: string[];
  secondaryMuscles: string[];
  // Biomechanics
  force: string | null;
  mechanic: string | null;
  nasmMovementPattern: string | null;
  // Equipment
  equipmentNeeded: string[];
  canBePerformedAtHome: boolean;
  // Progression
  progressionPath: string[];
  prerequisites: string[];
  optPhases: number[];
  // Visual & learning
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  scientificReferences: string;
  // Training defaults
  defaultTempo: string | null;
  defaultRestSeconds: number | null;
  recommendedSets: number | null;
  recommendedReps: number | null;
  // Gamification
  experiencePointsEarned: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Tab Definitions (Phase 1)
// ─────────────────────────────────────────────────────────────

export const EXERCISE_TEACH_TABS: TeachModeTabDefinition[] = [
  { id: 'how-to-perform', label: 'How To Perform', icon: 'clipboard-list' },
  { id: 'phase-progression', label: 'Phase & Progression', icon: 'trending-up' },
  { id: 'learn-watch', label: 'Learn & Watch', icon: 'play-circle', lazyLoad: true },
];
