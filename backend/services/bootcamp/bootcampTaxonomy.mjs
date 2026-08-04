/**
 * Canonical Bootcamp taxonomy boundary.
 *
 * Rolodex TEXT columns contain a mix of JSON arrays, double-encoded JSON, and
 * legacy display names. Generation code consumes only the canonical ids below.
 */
const ALIAS_GROUPS = Object.freeze({
  adductors: ['adductor', 'adductors', 'inner thigh'],
  abductors: ['abductor', 'abductors'],
  calves: ['calf', 'calves', 'gastrocnemius', 'soleus'],
  hip_rotators: ['hip rotator', 'hip rotators'],
  neck_flexors: ['deep cervical flexors', 'deep neck flexors'],
  peroneals: ['peroneal', 'peroneals', 'peroneal group'],
  piriformis: ['piriformis'],
  posterior_tibialis: ['posterior tibialis'],
  sternocleidomastoid: ['sternocleidomastoid'],
  tibialis_anterior: ['tibialis anterior'],
  glute_medius: ['glute medius'],
  glutes: ['glute', 'glutes', 'gluteals', 'gluteus maximus', 'gluteus medius'],
  hamstrings: ['hamstring', 'hamstrings', 'biceps femoris'],
  hip_abductors: ['hip abductor', 'hip abductors'],
  hip_flexors: ['hip flexor', 'hip flexors', 'iliopsoas'],
  it_band: ['it band', 'iliotibial band'],
  quadriceps: ['quad', 'quads', 'quadricep', 'quadriceps', 'rectus femoris', 'vastus lateralis', 'vastus medialis'],
  tfl: ['tfl', 'tensor fasciae latae'],
  anterior_deltoid: ['anterior deltoid', 'anterior deltoids', 'front deltoid', 'front deltoids'],
  biceps: ['bicep', 'biceps'],
  brachialis: ['brachialis'],
  brachioradialis: ['brachioradialis'],
  forearms: ['forearm', 'forearms'],
  pectorals: ['chest', 'pectoral', 'pectorals', 'pectoralis major', 'pectoralis minor'],
  lateral_deltoid: ['lateral deltoid', 'lateral deltoids', 'medial deltoid', 'medial deltoids'],
  latissimus_dorsi: ['lat', 'lats', 'latissimus', 'latissimus dorsi'],
  lower_chest: ['lower chest', 'lower pectorals'],
  rear_deltoid: ['rear delt', 'rear delts', 'rear deltoid', 'rear deltoids', 'posterior deltoid', 'posterior deltoids'],
  rhomboids: ['rhomboid', 'rhomboids'],
  rotator_cuff: ['rotator cuff'],
  traps: ['trap', 'traps', 'trapezius', 'lower trapezius', 'middle traps', 'upper trapezius'],
  triceps: ['tricep', 'triceps', 'triceps long head'],
  upper_back: ['back', 'upper back'],
  upper_chest: ['upper chest', 'upper pectorals'],
  serratus_anterior: ['serratus anterior'],
  shoulders: ['shoulder', 'shoulders', 'deltoid', 'deltoids'],
  core: ['core', 'abdominal', 'abdominals', 'abs', 'rectus abdominis'],
  erector_spinae: ['erector spinae', 'spinal erectors'],
  obliques: ['oblique', 'obliques'],
  tva: ['tva', 'transverse abdominis', 'transversus abdominis'],
  thoracic_spine: ['thoracic spine'],
  full_body: ['full body', 'full_body', 'total body'],
});

const clean = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[\u2019']/g, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(ALIAS_GROUPS)) {
  ALIAS_TO_CANONICAL.set(clean(canonical), canonical);
  for (const alias of aliases) ALIAS_TO_CANONICAL.set(clean(alias), canonical);
}

export function canonicalizeMuscle(value) {
  return ALIAS_TO_CANONICAL.get(clean(value)) ?? null;
}

export function decodeRolodexList(value) {
  let current = value;
  for (let depth = 0; depth < 5 && typeof current === 'string'; depth += 1) {
    const trimmed = current.trim();
    if (!trimmed) return [];
    try {
      current = JSON.parse(trimmed);
    } catch {
      current = trimmed.includes(',') ? trimmed.split(',').map((part) => part.trim()) : [trimmed];
      break;
    }
  }
  return Array.isArray(current) ? current : current == null ? [] : [current];
}

export function normalizeMuscleList(value) {
  const normalized = decodeRolodexList(value).map((muscle) => {
    const canonical = canonicalizeMuscle(muscle);
    if (canonical) return canonical;
    return clean(muscle).replace(/\s+/g, '_');
  });
  return [...new Set(normalized.filter(Boolean))];
}

export function muscleSearchTerms(value) {
  const canonical = canonicalizeMuscle(value);
  if (!canonical) return [clean(value)].filter(Boolean);
  const canonicalTerm = clean(canonical.replace(/_/g, ' '));
  const safeAliases = (ALIAS_GROUPS[canonical] ?? [])
    .map(clean)
    .filter((term) => term.length >= 4);
  return [...new Set([canonicalTerm, ...safeAliases])];
}

export function normalizeMovementCategory(value) {
  const token = clean(value);
  if (['squat', 'hinge', 'lunge', 'push', 'pull', 'core', 'gait'].includes(token)) return token;
  if (token.includes('squat')) return 'squat';
  if (token.includes('hinge') || token.includes('deadlift')) return 'hinge';
  if (token.includes('lunge')) return 'lunge';
  if (token.includes('push') || token.includes('press')) return 'push';
  if (token.includes('pull') || token.includes('row')) return 'pull';
  if (token.includes('rotation')) return 'core';
  return null;
}

export const __testing__ = { ALIAS_GROUPS };