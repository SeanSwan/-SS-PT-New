/**
 * FILE: CoachCommandLogEntry.sections.ts
 * PURPOSE: Detect workout section headings inside Swan Coach answers.
 *
 * Scope is intentionally narrow: only recognized training blocks become visual
 * sections, so generic intro copy such as "Workout for today:" stays readable
 * prose instead of becoming a false workout block.
 */

const WORKOUT_SECTION_LABELS = new Set([
  'activation',
  'accessories',
  'accessory',
  'conditioning',
  'core',
  'cool down',
  'cool-down',
  'finisher',
  'flexibility',
  'main lift',
  'mobility',
  'prep',
  'strength',
  'warm up',
  'warm-up',
  'warmup',
]);

function normalizeSectionTitle(value: string): string {
  return value
    .replace(/[*_#:`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function parseWorkoutSectionHeading(
  line: string,
  workoutDetailPattern: RegExp,
): string | null {
  const clean = line
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*\*(.+?)\*\*$/, '$1')
    .replace(/\*\*/g, '')
    .trim();
  const match = clean.match(/^(.{2,44}?):$/);
  const title = match?.[1]?.trim();
  const normalizedTitle = title ? normalizeSectionTitle(title) : '';
  const isKnownSection = Boolean(
    normalizedTitle
    && (
      WORKOUT_SECTION_LABELS.has(normalizedTitle)
      || /^block\s+[a-z0-9]+$/.test(normalizedTitle)
      || /^phase\s+\d+$/.test(normalizedTitle)
    ),
  );

  if (!title || /[.!?]/.test(title)) return null;
  if (workoutDetailPattern.test(title) && !isKnownSection) return null;
  return isKnownSection ? title.replace(/:$/, '') : null;
}
