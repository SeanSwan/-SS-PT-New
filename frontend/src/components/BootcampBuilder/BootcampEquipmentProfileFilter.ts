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

function toToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim().toLowerCase();
  return token.length > 0 ? token : null;
}

function parseEquipmentList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(toToken).filter(Boolean) as string[];
  if (typeof value !== 'string') return [];
  if (value.trim() === '' || value.trim() === '[]') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(toToken).filter(Boolean) as string[];
  } catch {
    return [value].map(toToken).filter(Boolean) as string[];
  }

  return [];
}

function isBodyweightOnly(equipment: string[]): boolean {
  return equipment.length === 0 || equipment.some((item) => (
    item.includes('bodyweight') || item === 'none' || item === 'no equipment'
  ));
}

export function buildEquipmentProfileTokens(items: EquipmentLike[] = []): string[] {
  const tokens = new Set<string>();
  for (const item of items) {
    [item.name, item.trainerLabel, item.category, item.resistanceType, item.equipmentType]
      .map(toToken)
      .filter(Boolean)
      .forEach((token) => tokens.add(token as string));
  }
  return Array.from(tokens);
}

export function exerciseMatchesEquipmentProfile(
  exercise: ExerciseEquipmentLike,
  profileTokens: string[],
): boolean {
  const equipment = [
    ...parseEquipmentList(exercise.equipment),
    ...parseEquipmentList(exercise.equipmentNeeded),
  ];

  if (isBodyweightOnly(equipment)) return true;
  if (profileTokens.length === 0) return false;

  return equipment.some((exerciseToken) => profileTokens.some((profileToken) => (
    exerciseToken.includes(profileToken) || profileToken.includes(exerciseToken)
  )));
}

export function filterExercisesByEquipmentProfile<T extends ExerciseEquipmentLike>(
  exercises: T[],
  profileTokens: string[],
): T[] {
  return exercises.filter((exercise) => exerciseMatchesEquipmentProfile(exercise, profileTokens));
}
