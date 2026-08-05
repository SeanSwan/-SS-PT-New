/**
 * EquipmentContextChip helpers — profile derivation + mismatch evaluation
 * =======================================================================
 * Pure logic for the F11 "Planning from" context chip (blueprint §10a #1,
 * Kimi #1 / HY3 #1 locked): derive the active equipment profile so the
 * logger never launches unresolved, and evaluate exercise↔inventory
 * mismatches as a corrective (never blocking) signal.
 */

export interface ChipProfile {
  id: number;
  name: string;
  locationType: 'gym' | 'park' | 'home' | 'client_home' | 'custom';
  equipmentCount: number;
  isDefault: boolean;
}

export type ProfileSource = 'plan' | 'selection' | 'only-profile' | 'default-profile' | 'unset';

export interface DerivedProfile {
  profileId: number | null;
  source: ProfileSource;
}

/**
 * Derivation order (Kimi #1 — "derive, don't ask"):
 *   1. An explicit user selection always wins.
 *   2. A plan-provided profile id wins next ("Set by plan · tap to change").
 *   3. Exactly one profile → silently active.
 *   4. A default-flagged profile → active.
 *   5. Otherwise unset (genuinely ambiguous — the only state that prompts).
 */
export function deriveActiveProfile(params: {
  profiles: ChipProfile[];
  selectedId: number | null;
  planProfileId?: number | null;
  userHasInteracted: boolean;
}): DerivedProfile {
  const { profiles, selectedId, planProfileId, userHasInteracted } = params;
  if (selectedId != null && profiles.some((p) => p.id === selectedId)) {
    return { profileId: selectedId, source: 'selection' };
  }
  if (userHasInteracted) {
    // The user explicitly cleared the profile — respect it, don't re-derive.
    return { profileId: null, source: 'unset' };
  }
  if (planProfileId != null && profiles.some((p) => p.id === planProfileId)) {
    return { profileId: planProfileId, source: 'plan' };
  }
  if (profiles.length === 1) {
    return { profileId: profiles[0].id, source: 'only-profile' };
  }
  const defaultProfile = profiles.find((p) => p.isDefault);
  if (defaultProfile) {
    return { profileId: defaultProfile.id, source: 'default-profile' };
  }
  return { profileId: null, source: 'unset' };
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Corrective mismatch check: does the exercise's equipment appear in the
 * approved inventory? Case-insensitive, token-tolerant in both directions
 * ("Dumbbells" matches "Adjustable Dumbbells 5-50"). Bodyweight/none/empty
 * requirements are always 'ok'.
 */
export function evaluateEquipmentMismatch(
  exerciseEquipmentNames: string[],
  approvedItemNames: string[],
): 'ok' | 'mismatch' {
  const required = exerciseEquipmentNames
    .map(normalizeName)
    .filter((name) => name && !/^(none|bodyweight|body weight|no equipment)$/.test(name));
  if (required.length === 0) return 'ok';
  const inventory = approvedItemNames.map(normalizeName).filter(Boolean);
  const satisfied = required.every((req) =>
    inventory.some((have) => have.includes(req) || req.includes(have)),
  );
  return satisfied ? 'ok' : 'mismatch';
}

export const LOCATION_LABELS: Record<ChipProfile['locationType'], string> = {
  gym: 'Gym',
  park: 'Park / Outdoor',
  home: 'Home Gym',
  client_home: "Client's Home",
  custom: 'Custom Location',
};
