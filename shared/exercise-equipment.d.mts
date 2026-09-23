export function normalizeEquipmentToken(value: unknown): string | null;
export function equipmentRequirementGroups(exercise: object): string[][] | null;
export function matchesEquipmentRequirements(exercise: object, availableTokens?: string[]): boolean;
