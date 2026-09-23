import { matchesEquipmentRequirements, normalizeEquipmentToken } from '../../../../shared/exercise-equipment.mjs';

type EquipmentLike = {
  name?: unknown;
  trainerLabel?: unknown;
  category?: unknown;
  resistanceType?: unknown;
  equipmentType?: unknown;
};

type ExerciseEquipmentLike = {
  equipment?: unknown;
  equipmentNeeded?: unknown;
};

export function buildEquipmentProfileTokens(items: EquipmentLike[] = []): string[] {
  const tokens = new Set<string>();
  for (const item of items) {
    [item.name, item.trainerLabel, item.category, item.resistanceType, item.equipmentType]
      .forEach(value => {
        const token = normalizeEquipmentToken(value);
        if (token) tokens.add(token);
      });
  }
  return Array.from(tokens);
}

export function exerciseMatchesEquipmentProfile(exercise: ExerciseEquipmentLike, profileTokens: string[]): boolean {
  return matchesEquipmentRequirements(exercise, profileTokens);
}

export function filterExercisesByEquipmentProfile<T extends ExerciseEquipmentLike>(exercises: T[], profileTokens: string[]): T[] {
  return exercises.filter(exercise => exerciseMatchesEquipmentProfile(exercise, profileTokens));
}
