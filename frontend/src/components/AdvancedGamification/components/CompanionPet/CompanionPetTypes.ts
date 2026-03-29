/**
 * ============================================================================
 * FILE: CompanionPetTypes.ts
 * PURPOSE: Type definitions for the Tamagotchi companion pet system
 * ============================================================================
 */

export type PetSpeciesId = 'crystal_dragon' | 'iron_wolf' | 'ember_phoenix' | 'frost_swan' | 'shadow_panther';

export type PetMoodId = 'ecstatic' | 'happy' | 'content' | 'tired' | 'sad' | 'critical';

export type InteractionType = 'pet' | 'feed' | 'play';

export interface PetSpeciesInfo {
  name: string;
  element: string;
  affinity: string;
  baseColor: string;
  accentColor: string;
  description: string;
}

export interface EvolutionStage {
  stage: number;
  name: string;
  minLevel: number;
  bodyScale: number;
  features: string[];
}

export interface PetMood {
  id: PetMoodId;
  minAvg: number;
  emoji: string;
  animation: string;
  description: string;
}

export interface AppearanceMod {
  category: string;
  mod: string;
  tier: number;
}

export interface PetData {
  species: PetSpeciesId;
  speciesInfo: PetSpeciesInfo;
  name: string;
  level: number;
  evolution: EvolutionStage;
  health: number;
  mood: PetMood;
  happiness: number;
  birthDate: string;
  lastInteraction: string;
  hoursSinceInteraction: number;
  appearanceMods: AppearanceMod[];
  equippedMods: string[];
  unlockedMods: string[];
  activityCounters: Record<string, number>;
  totalInteractions: number;
}

export interface CompanionPetProps {
  userId: number;
  size?: number;
  showControls?: boolean;
  compact?: boolean;
}
