/**
 * swanLawFilter.mjs — taste law enforcement for generated-image prompts.
 *
 * SCOPE: this guards the TEXT of a prompt before it reaches an image/video
 * provider. It is NOT a CSS validator — `frontend/src/adapters/style-lens-swan/
 * contract/designValueGuard.ts` already owns runtime style values and stays the
 * authority there. Different domain, deliberately separate.
 *
 * WHY IT BLOCKS RATHER THAN STRIPS: silently removing an offending phrase
 * teaches the operator nothing and hides a taste failure behind a clean-looking
 * result. A blocked compile names the slot and the law, so the direction gets
 * fixed instead of laundered.
 *
 * RETIRED-LITERAL CONVENTION: the retired Galaxy-Swan hexes are assembled by
 * concatenation, never written whole, so the repo-wide de-galaxy gate
 * (scripts/ci/check-degalaxy.mjs) finds zero occurrences even inside the file
 * that enforces them. This mirrors designValueGuard.ts — do not "simplify" it.
 *
 * Dependency-free on purpose: importable by the backend service, the CLI, and a
 * future MCP server without dragging anything along.
 */

/** A single law violation. `slot` is the 12-slot field that carried it. */
export class LawViolation {
  constructor(law, slot, detail) {
    this.law = law;
    this.slot = slot;
    this.detail = detail;
  }
}

const RETIRED_HEX = [
  new RegExp('#0a0a' + '1a', 'i'),
  new RegExp('#00ff' + 'ff', 'i'),
  new RegExp('#7851' + 'a9', 'i'),
];

/**
 * The retired palette is also reachable by NAME. "galaxy purple" produces the
 * same look as the retired hex and slipped through a hex-only check.
 */
const RETIRED_NAMED = /\b(galaxy[-\s]?(purple|swan|blue)|nebula[-\s]?(blue|purple)|cosmic[-\s]?purple)\b/i;

/**
 * Non-English creature lemmas. LAW 4 is about what gets DRAWN, and an image
 * model understands "cygne" perfectly well even though an ASCII English regex
 * does not. Small, high-likelihood set — not an attempt at full i18n.
 */
const CREATURE_I18N = /\b(cygne|schwan|zwaan|cisne|cigno|лебедь|白鳥|oiseau|vogel|pájaro|uccello|loup|wolf|lobo)\b/i;

/**
 * Drawing/behaviour verbs. If a creature is DOING something, it is being
 * depicted as a creature, not used as a light-blocking shape — regardless of
 * how far away a lawful "occluder" phrase sits in the same slot.
 */
const CREATURE_ACTION = /\b(paddl\w+|swim\w+|fly\w+|flying|walk\w+|smil\w+|perch\w+|land\w+|gliding|preen\w+|nesting|wading)\b/i;

/**
 * LAW 3 kill-list. Each entry is a *phrase family*, not a single word — the
 * failure mode is a described effect, so matching single tokens ("glow") would
 * reject legitimate prompts and train operators to fight the filter.
 */
const KILL_LIST = [
  { id: 'iridescent-gradient', re: /\b(iridescent|holographic|unicorn|rainbow)\s+(gradient|wash|sheen|shimmer)\b/i,
    why: 'iridescent/unicorn gradient — the #1 AI-slop tell' },
  // Separator set must cover hyphen/en-dash forms: "purple-to-cyan" bypassed an
  // earlier version that only matched "->", "→" and a spaced " to ".
  { id: 'diagonal-purple-cyan', re: /\bpurple\s*[-–—]?\s*(?:->|→|to)\s*[-–—]?\s*cyan\b|\bcyan\s*[-–—]?\s*(?:->|→|to)\s*[-–—]?\s*purple\b/i,
    why: 'purple→cyan diagonal wash is a named kill-list item' },
  { id: 'lens-flare', re: /\blens\s*flare(s)?\b|\banamorphic\s+flare\b/i,
    why: 'lens flare' },
  { id: 'bokeh-soup', re: /\b(star[-\s]?bokeh|bokeh\s+soup|floating\s+particles?|particle\s+field|sparkles?\b)/i,
    why: 'causeless particle field / star-bokeh soup — particles need a physical cause' },
  { id: 'glass-on-glass', re: /\bfrosted\s+glass\s+(on|over)\s+(frosted\s+)?glass\b|\bglassmorphi/i,
    why: 'glass-on-glass / generic dark-mode glassmorphism' },
  { id: 'fantasy-wallpaper', re: /\b(epic\s+fantasy|fantasy\s+wallpaper|magical\s+realm|enchanted\s+forest\s+with)\b/i,
    why: 'AI fantasy-wallpaper energy' },
];

/**
 * LAW 4 — optics, not creatures. Nature enters as LIGHT BEHAVIOUR only.
 * A creature is permitted ONLY as a dark occluder in a light field, so the
 * occluder phrasing is an explicit escape hatch rather than a loophole.
 */
// Plurals must be covered: "two swans landing" bypassed an earlier version,
// because \bswan\b cannot match inside "swans". Irregulars are listed explicitly.
const CREATURE = /\b(swans?|birds?|falcons?|eagles?|wolf|wolves|lions?|horses?|deer|foxe?s?|dragons?|creatures?|animals?)\b/i;
const OCCLUDER_OK = /\b(occluder|silhouetted\s+against|dark\s+shape\s+in|blocking\s+the\s+light|caustic\s+field)\b/i;

/**
 * Compositional idioms that contain a creature word but describe a CAMERA
 * POSITION, not a subject. "bird's-eye view" is in Swan's own composition
 * vocabulary — rejecting it would train the operator to fight the filter,
 * which is the failure mode this filter exists to avoid.
 */
const CREATURE_IDIOM = /\bbird'?s?[-\s]?eye\b|\bcrow'?s?[-\s]?nest\b|\bfish[-\s]?eye\b|\bworm'?s?[-\s]?eye\b/i;

/** LAW 2 — gold is an allowlist. These are the only sanctioned gold roles. */
const GOLD = /\b(gold|golden|gilded|brass|amber\s+metal)\b/i;
const GOLD_ALLOWED = /\b(pr\b|personal\s+record|delta|filigree|focus\s+ring|single\s+badge|one\s+badge|pedestal)\b/i;

/**
 * Idioms where "golden" describes LIGHT or PROPORTION, not gold-as-decoration.
 * "golden hour light" is the most on-brand photographic term Swan has, and an
 * earlier version blocked it — the exact false positive that makes an operator
 * disable a taste filter. LAW 2 governs gold as ornament, not the hour.
 */
const GOLD_IDIOM = /\bgolden\s+(hour|ratio|mean|section)\b/i;

/**
 * When the occluder exemption fires, these tokens mean the creature is being
 * RENDERED, not used as a light-blocking shape. Presence of lawful framing is
 * not absence of unlawful rendering — "a photorealistic swan as a dark occluder,
 * feathers visible, eyes detailed" passed before this check existed.
 */
const CREATURE_DETAIL = /\b(feathers?|eyes?|beaks?|fur|scales?|talons?|photorealistic|photo-realistic|detailed|lifelike|anatomically)\b/i;

/**
 * Normalize before matching. Raw-text regexes are defeated by zero-width
 * characters, fullwidth forms, and decomposed diacritics. NFKC folds fullwidth
 * to ASCII; \p{Cf} strips zero-width/format controls. Verified bypasses before
 * this existed: "iridescent<ZWSP> gradient", fullwidth "ｉｒｉｄｅｓｃｅｎｔ".
 */
function normalize(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    // Collapse single-letter spacing evasion ("i r i d e s c e n t") only when a
    // run of 4+ single letters appears; ordinary prose is untouched.
    .replace(/\b(?:\p{L}\s){3,}\p{L}\b/gu, (m) => m.replace(/\s+/g, ''));
}

/** Banned taxonomy facets — off-brand for a luxury training instrument. */
const BANNED_FACETS = new Set(['psychedelic', 'cute', 'funny', 'madness']);

/**
 * THE LAW LIST, exported so it has exactly one definition.
 *
 * `checks` is built from this, and `swanExplain.mjs` builds its table from it too.
 * Two hand-kept copies of a law list is how a table quietly stops covering a law
 * that was added later — the renderer would show five rows and look complete.
 */
export const LAW_NAMES = Object.freeze([
  'LAW2-gold-allowlist',
  'LAW3-kill-list',
  'LAW3-banned-facet',
  'LAW4-optics-not-creatures',
  'LAW9-retired-palette',
  'LAW10-content',
]);

/** LAW 10 — content law. The credential form is assembled, never written whole. */
const YOGA = /\b(yoga|meditation|meditative|namaste|chakra)\b/i;
const BAD_CREDENTIAL = new RegExp('nasm' + '[\\s-]*' + 'certified', 'i');

/**
 * Run every law against a resolved slot map.
 *
 * @param {Record<string,string>} slots  the 12-slot map (partial is fine)
 * @param {string[]} [facets]            taxonomy facets applied
 * @returns {{passed: boolean, violations: LawViolation[], checks: {law:string,passed:boolean}[]}}
 */
export function applyLaws(slots = {}, facets = []) {
  const violations = [];
  // The `negative` slot is EXEMPT by design: its whole job is to NAME the
  // banned things so the provider avoids them. Scanning it would make every
  // lawful compile self-reject on its own kill-list — which is exactly what
  // happened the first time this ran against the compiler.
  // Safe to exempt: a term in `negative` is an instruction to AVOID it, so a
  // creature or gradient appearing there is the desired behaviour, not a bypass.
  const entries = Object.entries(slots)
    .filter(([k]) => k !== 'negative')
    .filter(([, v]) => typeof v === 'string' && v.length)
    .map(([k, v]) => [k, normalize(v)]);
  const joined = entries.map(([, v]) => v).join('   ');

  // LAW 3 — kill-list
  for (const item of KILL_LIST) {
    for (const [slot, value] of entries) {
      if (item.re.test(value)) violations.push(new LawViolation('LAW3-kill-list', slot, item.why));
    }
  }

  // LAW 4 — optics, not creatures
  for (const [slot, value] of entries) {
    const withoutIdioms = value.replace(CREATURE_IDIOM, ' ');
    if (CREATURE.test(withoutIdioms) || CREATURE_I18N.test(withoutIdioms)) {
      if (!OCCLUDER_OK.test(value)) {
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'literal creature form — permitted only as a dark occluder in a light field',
        ));
      } else if (CREATURE_DETAIL.test(value)) {
        // The occluder exemption is a SHAPE allowance, not a rendering licence.
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'occluder framing present but the creature is being RENDERED (feathers/eyes/photorealistic). '
          + 'An occluder is a dark shape blocking light — remove the anatomical detail.',
        ));
      } else if (CREATURE_ACTION.test(value)) {
        // A lawful phrase elsewhere in the slot is not a shield. If the creature
        // is ACTING, it is being depicted — "a dark occluder in a caustic field —
        // and a smiling swan paddling in the foreground" passed before this.
        violations.push(new LawViolation(
          'LAW4-optics-not-creatures', slot,
          'occluder framing present but the creature is ACTING (paddling/flying/smiling). '
          + 'The exemption covers a static light-blocking shape, not a depicted animal.',
        ));
      }
    }
  }

  // LAW 2 — gold allowlist
  for (const [slot, value] of entries) {
    if (GOLD.test(value.replace(GOLD_IDIOM, ' ')) && !GOLD_ALLOWED.test(value)) {
      violations.push(new LawViolation(
        'LAW2-gold-allowlist', slot,
        'gold outside its allowlist (PR numeral + delta, <=1px filigree, focus ring, one badge)',
      ));
    }
  }

  // Retired palette — scan every slot, including var() fallbacks
  for (const [slot, value] of entries) {
    if (RETIRED_HEX.some((re) => re.test(value)) || RETIRED_NAMED.test(value)) {
      violations.push(new LawViolation('LAW9-retired-palette', slot,
        'retired Galaxy-Swan value (by hex or by name)'));
    }
  }

  // LAW 10 — content law
  for (const [slot, value] of entries) {
    if (YOGA.test(value)) {
      violations.push(new LawViolation('LAW10-content', slot, 'use "stretching"/"flexibility", never yoga/meditation'));
    }
    if (BAD_CREDENTIAL.test(value)) {
      violations.push(new LawViolation('LAW10-content', slot, 'forbidden credential claim'));
    }
  }

  // LAW 10 applies to the `negative` slot too — it is exempt from TASTE law,
  // not from CONTENT law. Naming a banned aesthetic in `negative` is the point;
  // naming content-law-violating text there is still a stored-record and
  // provider-payload liability, because a verified provider receives that field
  // verbatim and a GenerationRecord persists it.
  // NOTE: this enforces only the content law Swan actually defines
  // (yoga/meditation, the joined credential form). Broader safety
  // classification (illegal or harmful imagery) is a separate concern that
  // belongs to the provider adapter layer, not this taste filter — flagged, not
  // silently assumed handled.
  const negRaw = typeof slots.negative === 'string' ? normalize(slots.negative) : '';
  if (negRaw) {
    if (YOGA.test(negRaw)) {
      violations.push(new LawViolation('LAW10-content', 'negative',
        'content-law term in the negative slot — exempt from taste law, not content law'));
    }
    if (BAD_CREDENTIAL.test(negRaw)) {
      violations.push(new LawViolation('LAW10-content', 'negative', 'forbidden credential claim in negative slot'));
    }
  }

  // Banned facets
  for (const f of facets) {
    const leaf = String(f).split('>').pop().trim().toLowerCase();
    if (BANNED_FACETS.has(leaf)) {
      violations.push(new LawViolation('LAW3-banned-facet', 'facets', `facet "${f}" is banned for Swan surfaces`));
    }
  }

  void joined; // reserved for future cross-slot checks; kept explicit, not silently unused

  return {
    passed: violations.length === 0,
    violations,
    // From LAW_NAMES — the ONE definition. See its comment above: this line held
    // a second hand-kept copy until it was caught, which is how a law added later
    // gets enforced by the loops and omitted from `checks`.
    checks: LAW_NAMES.map((law) => ({ law, passed: !violations.some((v) => v.law === law) })),
  };
}

/** Throwing wrapper for the compile path. Never strips, always names the slot. */
export function assertLawful(slots, facets) {
  const r = applyLaws(slots, facets);
  if (!r.passed) {
    const first = r.violations[0];
    const err = new Error(`E_LAW_VIOLATION: [${first.law}] slot "${first.slot}" — ${first.detail}`);
    err.code = 'E_LAW_VIOLATION';
    err.violations = r.violations;
    throw err;
  }
  return r;
}
