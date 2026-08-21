/**
 * content-lint.mjs — the deterministic specificity linter (S4, SWA-185).
 * ======================================================================
 * BLUEPRINT §S4. Panel doctrine (GLM F4, Kimi F6.1, Grok mechanism table,
 * Fable F3): the human slop detector fires on WORDS before pixels — modal
 * marketing register, unquantified vagueness, lorem-grade filler. This linter
 * is the content gate's teeth, and it is entirely deterministic: an LLM
 * opinion about copy quality has no place here.
 *
 * Hard violations (halt the CONTENT state): banned register phrases,
 * lorem/placeholder text, superlative density over cap, a section with no
 * quantified claim and no explicit exemption.
 * Soft findings (ride the artifact, never hidden): unsourced facts — the
 * no-fabrication rule. A stat that cannot name its source is marked, and the
 * report travels to the receipt so "replace before ship" is visible.
 */

/** Marketing-register phrases that mark modal AI copy. Substring match, lowercase. */
export const BANNED_REGISTER = [
  'empower', 'unleash', 'unlock your potential', 'transform your journey',
  'elevate your fitness', 'take your fitness to the next level', 'revolutionize',
  'lorem ipsum', 'game-changer', 'next level results', 'crush your goals',
  'journey starts here', 'dream body', 'no excuses',
];

/** Placeholder tells — content that was never written. */
export const PLACEHOLDER_PATTERNS = [/lorem\s+ipsum/i, /\bTODO\b/, /\bTBD\b/, /\[placeholder\]/i, /\bxxx+\b/i];

/** Abstract superlatives — capped by density, not banned outright. */
export const SUPERLATIVES = [
  'world-class', 'best-in-class', 'cutting-edge', 'state-of-the-art', 'seamless',
  'effortless', 'revolutionary', 'ultimate', 'incredible', 'amazing', 'unmatched',
  'unparalleled', 'exceptional', 'extraordinary', 'premium-grade',
];
export const SUPERLATIVE_DENSITY_CAP = 0.05; // superlatives per word, per section

const wordsOf = (s) => s.split(/\s+/).filter(Boolean);

/**
 * Lint a normalized content model (facts as {text, source} objects).
 * Returns {violations: [{section, rule, detail}], unproven: [{section, text}]}.
 */
export function lintContent(model) {
  const violations = [];
  const unproven = [];
  const scan = (sectionId, text) => {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_REGISTER) {
      if (lower.includes(phrase)) violations.push({ section: sectionId, rule: 'banned-register', detail: `"${phrase}"` });
    }
    for (const re of PLACEHOLDER_PATTERNS) {
      if (re.test(text)) violations.push({ section: sectionId, rule: 'placeholder-text', detail: String(re) });
    }
  };

  scan('primary_claim', model.primary_claim ?? '');
  scan('cta_label', model.cta_label ?? '');

  for (const s of model.sections ?? []) {
    const blob = [s.heading, ...s.facts.map((f) => f.text)].join(' ');
    scan(s.slot, blob);

    const words = wordsOf(blob.toLowerCase());
    const supers = SUPERLATIVES.filter((w) => blob.toLowerCase().includes(w)).length;
    if (words.length && supers / words.length > SUPERLATIVE_DENSITY_CAP) {
      violations.push({ section: s.slot, rule: 'superlative-density', detail: `${supers} superlative(s) in ${words.length} words (cap ${SUPERLATIVE_DENSITY_CAP}/word)` });
    }

    if (!s.quantified_exempt && !s.facts.some((f) => /\d/.test(f.text))) {
      violations.push({ section: s.slot, rule: 'unquantified-section', detail: 'no fact carries a number and the section is not marked quantified_exempt — vagueness is the slop register' });
    }

    for (const f of s.facts) {
      if (!f.source || f.source === 'unsourced') unproven.push({ section: s.slot, text: f.text });
    }
  }
  return { violations, unproven };
}

/** Classify a section's content shape from its facts: 'data' | 'narrative' | 'mixed'. */
export function classifyShape(facts) {
  if (!facts.length) return 'narrative';
  const numeric = facts.filter((f) => /\d/.test(f.text)).length / facts.length;
  if (numeric >= 0.6) return 'data';
  if (numeric <= 0.34) return 'narrative';
  return 'mixed';
}

/** Section types that only make sense on one content shape (content-driven IA). */
export const NARRATIVE_ONLY = new Set(['narrative-chapter', 'media-plate', 'faq']);
export const DATA_ONLY = new Set(['price-ledger', 'data-table', 'kpi-strip']);

/** Can this section TYPE legitimately present content of this SHAPE? */
export function typeCompatible(type, shape) {
  if (NARRATIVE_ONLY.has(type)) return shape !== 'data';
  if (DATA_ONLY.has(type)) return shape !== 'narrative';
  return true;
}
