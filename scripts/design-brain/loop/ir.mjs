/**
 * ir.mjs — LayoutIR v2: closed section vocabulary, structural fingerprint,
 * and pairwise distance (S2, SWA-185).
 * ==========================================================================
 * BLUEPRINT §S2. Panel doctrine (GLM F1, Grok 4.1, Kimi F2): structural
 * diversity must be MEASURED on geometry and module cardinality — never on
 * tag names or class strings, which recolored clones share. The fingerprint
 * here is the structure the eye reads: section-type sequence, grid family,
 * hero mechanics family, nav family, and how many things each zone carries.
 *
 * Distance is 0..1 (0 = same structure). The divergence gate (diverge.mjs)
 * requires every pair in a round to clear MIN_PAIR_DISTANCE; the wildcard
 * must clear WILDCARD_MIN against every non-wildcard.
 */

/** Closed vocabulary — a section type outside this list fails the IR contract. */
export const SECTION_TYPES = [
  'hero', 'price-ledger', 'kpi-strip', 'editorial-flow', 'proof-list',
  'data-table', 'cta-band', 'narrative-chapter', 'media-plate', 'faq',
  'icon-bullets', 'logo-cloud', 'card-grid',
];

export const MIN_PAIR_DISTANCE = 0.35;
export const WILDCARD_MIN = 0.5;

/** Family of a mechanics/grid string: first two hyphen segments ("split-asymmetric-…" → "split-asymmetric"). */
const family = (s) => String(s ?? '').toLowerCase().split('-').slice(0, 2).join('-');

/** Structural fingerprint — the comparable shape of an IR. */
export function irFingerprint(ir) {
  return {
    sections: ir.zones.map((z) => z.section_type),
    cardinalities: ir.zones.map((z) => z.cardinality ?? 0),
    grid: family(ir.grid),
    hero: family(ir.hero_mechanics),
    nav: family(ir.nav_model),
    cards: ir.card_budget ?? 0,
  };
}

/** Normalized Levenshtein distance over two symbol sequences (0..1). */
export function seqDistance(a, b) {
  const n = a.length, m = b.length;
  if (!n && !m) return 0;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[n][m] / Math.max(n, m);
}

/** L1 distance between cardinality profiles, normalized to 0..1. */
function cardinalityDistance(a, b) {
  const len = Math.max(a.length, b.length);
  if (!len) return 0;
  let sum = 0, scale = 0;
  for (let i = 0; i < len; i++) {
    sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
    scale += Math.max(a[i] ?? 0, b[i] ?? 0, 1);
  }
  return Math.min(1, sum / scale);
}

/**
 * Pairwise structural distance between two IRs (0..1).
 * Weights: section sequence 0.35, grid 0.20, hero 0.20, nav 0.10, cardinality 0.15.
 */
export function irDistance(irA, irB) {
  const a = irFingerprint(irA), b = irFingerprint(irB);
  return (
    0.35 * seqDistance(a.sections, b.sections) +
    0.20 * (a.grid === b.grid ? 0 : 1) +
    0.20 * (a.hero === b.hero ? 0 : 1) +
    0.10 * (a.nav === b.nav ? 0 : 1) +
    0.15 * cardinalityDistance(a.cardinalities, b.cardinalities)
  );
}

/** Distance matrix + the minimum off-diagonal pair for a fleet of IRs. */
export function distanceMatrix(irs) {
  const matrix = irs.map(() => irs.map(() => 0));
  let min = { value: Infinity, pair: null };
  for (let i = 0; i < irs.length; i++) {
    for (let j = i + 1; j < irs.length; j++) {
      const dist = Math.round(irDistance(irs[i], irs[j]) * 1000) / 1000;
      matrix[i][j] = dist;
      matrix[j][i] = dist;
      if (dist < min.value) min = { value: dist, pair: [irs[i].skeleton_id, irs[j].skeleton_id] };
    }
  }
  return { matrix, min };
}
