/**
 * colorwayFamilies.ts
 * ===================
 * Curated-tray grouping for the Swan Lens color tab (Kimi R2/R3: "curate the tray,
 * archive the rest"). Groups the full 38-colorway catalog into named families so the
 * picker reads as edited collections, not a flat wall.
 *
 * Family source of truth: a colorway's own `family` field when present (premium themes
 * via the extended PremiumThemeSpec). Base themes + any colorway without a declared
 * family are classified by a light heuristic here — NON-destructive: nothing is hidden,
 * every colorway lands in exactly one visible group.
 */
import { themes, type ThemeId } from '../UniversalThemeContext';

export type ColorwayFamilyId = 'apex-darks' | 'jewel-gradients' | 'frost-glass' | 'heritage';

export const FAMILY_ORDER: ColorwayFamilyId[] = [
  'heritage',
  'apex-darks',
  'jewel-gradients',
  'frost-glass',
];

export const FAMILY_LABEL: Record<ColorwayFamilyId, string> = {
  'heritage': 'Heritage',
  'apex-darks': 'Apex Darks',
  'jewel-gradients': 'Jewel Gradients',
  'frost-glass': 'Frost Glass',
};

// Brand-lineage Crystalline themes belong to Heritage regardless of heuristic.
const HERITAGE_IDS = new Set<string>([
  'crystalline-default', 'crystalline-dark', 'crystalline-light', 'crystalline-mono',
  'obsidian-black', 'frozen-aurora',
]);

export function familyOf(id: ThemeId): ColorwayFamilyId {
  // 'archive' is a valid declared family on PremiumThemeSpec (UniversalThemePremiumThemes.ts)
  // but is not a tray family — the guard below routes archived colorways to the heuristics.
  const theme = themes[id] as { family?: ColorwayFamilyId | 'archive'; effects?: { glassmorphism?: boolean } };
  // 1) explicit declared family (premium themes with the extended schema).
  if (theme?.family && theme.family !== 'archive') return theme.family;
  // 2) brand lineage.
  if (HERITAGE_IDS.has(id)) return 'heritage';
  // 3) heuristic by id keywords (deterministic, non-destructive).
  if (/frost|glass|pearl|aurora|frozen|arctic|glacier|vapor/.test(id)) return 'frost-glass';
  if (/ruby|emerald|amethyst|jade|rose|orchid|sakura|solar|gold|ember|forge|reliquary|velvet/.test(id)) return 'jewel-gradients';
  return 'apex-darks';
}

/** Group ids into families, preserving input order within each family. */
export function groupByFamily(ids: ThemeId[]): Array<{ family: ColorwayFamilyId; ids: ThemeId[] }> {
  const buckets = new Map<ColorwayFamilyId, ThemeId[]>();
  for (const id of ids) {
    const fam = familyOf(id);
    if (!buckets.has(fam)) buckets.set(fam, []);
    buckets.get(fam)!.push(id);
  }
  return FAMILY_ORDER
    .filter((fam) => buckets.has(fam))
    .map((fam) => ({ family: fam, ids: buckets.get(fam)! }));
}
