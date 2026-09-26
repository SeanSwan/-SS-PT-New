/**
 * swanLawPatterns.mjs — WHAT the taste laws are. DATA, not behaviour.
 *
 * Split out of `swanLawFilter.mjs` when the LAW 3 "kill-list CARRIED" condition
 * pushed that file past the 300-line cap. The seam is DATA vs BEHAVIOUR, the
 * same one `swanVocabulary.mjs` takes from `swanPromptCompiler.mjs`: this module
 * holds the matchers and the law registry, the filter holds the runner.
 *
 * RETIRED-LITERAL CONVENTION: the retired Galaxy-Swan hexes are assembled by
 * concatenation, never written whole, so the repo-wide de-galaxy gate
 * (scripts/ci/check-degalaxy.mjs) finds zero occurrences even inside the file
 * that enforces them. `moduleSmoke.test.mjs` asserts this for every shared
 * module. This mirrors designValueGuard.ts — do not "simplify" it.
 *
 * Dependency-free on purpose: importable by the backend service, the CLI, and the
 * MCP server without dragging anything along.
 */

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
export const KILL_LIST = [
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
 * THE CANONICAL NEGATIVE-SLOT PROSE — one definition, and it lives HERE.
 *
 * This text was a string literal inside `resolveSlots` while the matcher
 * families above lived here: two representations of one law, free to drift.
 * They HAD drifted — of the six families above, only four are matched by the
 * prose as written (`diagonal-purple-cyan` and `bokeh-soup` are named in the
 * prose but no family regex matches that wording). That drift is harmless only
 * while nothing checks the prose; the moment LAW 3 began asserting the
 * kill-list is CARRIED, it stopped being harmless. Hence one home.
 *
 * `join(', ')` reproduces the historical literal byte-for-byte, so every landed
 * assertion on `slots.negative` (swanPromptCompiler.test.mjs:76,87-88) is
 * unaffected by the move.
 */
export const KILL_LIST_TEXT = Object.freeze([
  'iridescent gradient',
  'lens flare',
  'causeless particles',
  'glassmorphism',
  'literal creature form',
  'fantasy wallpaper',
  'watermark',
  'text artifacts',
]);

/** The negative slot's value. Derived, never re-typed. */
export const KILL_LIST_PROSE = KILL_LIST_TEXT.join(', ');

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
 * The matcher table, grouped so the runner reads as the laws rather than as a
 * list of identifiers. Exported as ONE object: adding a pattern means adding a
 * property here, which is the point at which a reviewer sees it.
 */
export const PATTERNS = Object.freeze({
  RETIRED_HEX, RETIRED_NAMED, CREATURE_I18N, CREATURE_ACTION,
  CREATURE, OCCLUDER_OK, CREATURE_IDIOM, CREATURE_DETAIL,
  GOLD, GOLD_ALLOWED, GOLD_IDIOM,
  BANNED_FACETS, YOGA, BAD_CREDENTIAL,
});
