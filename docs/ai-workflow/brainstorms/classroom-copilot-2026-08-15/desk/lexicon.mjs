/**
 * The Desk — term lists.
 * ======================
 * Split out of `desk.mjs` so the lists stay readable and auditable on their own.
 * A reviewer should be able to argue with this file without reading the gate.
 *
 * Two properties are load-bearing:
 *
 *  1. UNCONDITIONAL terms are sensitive on their own. CONDITIONAL terms are only
 *     sensitive when bound to a carer — because "was sick on the carpet" is a
 *     Tuesday in a toddler room, and "his mum is sick" is a family circumstance.
 *     Collapsing the two lists would either block half her ordinary notes or miss
 *     the sentence the whole design exists for.
 *
 *  2. Ordinary developmental vocabulary is deliberately ABSENT. Biting, hitting,
 *     crying, separation anxiety, not napping, refusing food — these are the middle
 *     lane. Putting them here would refuse most of what she writes, and a tool that
 *     refuses everything is a tool she stops opening, which is the one failure this
 *     design cannot survive.
 */

/** Sensitive with no further evidence needed. Presence alone, given a specific child, refuses. */
export const UNCONDITIONAL = [
  // safeguarding
  ['safeguarding', /\b(?:safeguard\w*|child protection|social services|social worker|LADO|welfare concern|disclosure|neglect|at risk)\b/i],
  // legal / family structure. "going on at home" is the euphemism she reaches for
  // when she is being discreet — which is exactly when the content is most sensitive.
  ['family circumstance', /\b(?:custody|court|solicitor|restraining|contact order|care order|foster|adopt\w+|divorc\w+|split up|moved out|prison|jail|arrest\w*|remand|deport\w*|asylum|refugee|immigration|evict\w*|homeless|refuge|food bank|benefits|(?:going on|things|stuff|a lot on) at home)\b/i],
  // bereavement
  ['bereavement', /\b(?:died|dying|death|passed away|funeral|bereave\w*|grieving|hospice|terminal|stillborn|miscarriage)\b/i],
  // clinical
  ['health', /\b(?:diagnos\w+|autis\w+|\bASD\b|\bADHD\b|epilep\w+|seizure|asthma|diabet\w+|allerg\w+|epipen|insulin|medicat\w+|paediatric|pediatric|referr\w+|speech therap\w+|portage|\bEHCP\b|\bIEP\b|\bSEN\b|\bSENCO\b|developmental delay|non-?verbal)\b/i],
  // intimate care
  ['intimate care', /\b(?:soiled|encopres\w+|constipat\w+|nappy rash|wet (?:him|her|them)self|toilet training|potty training)\b/i],
  // protected characteristics
  ['protected characteristic', /\b(?:disab\w+|wheelchair|hearing aid|cochlear|feeding tube|prosthe\w+|interpreter|sign language|ethnicit\w+|religio\w+|faith|mosque|synagogue|church|halal|kosher)\b/i],
];

/**
 * Sensitive only when a carer is named in the same clause.
 *
 * `left`, `gone` and `away` were here and are deliberately removed. They are
 * ordinary English — "Priya's mum has gone back to work" is a pick-up logistics
 * note, and refusing it spent false-block budget on the most benign sentence in
 * the corpus. A false block is not a safe failure: it is what sends her to the
 * browser, where no control of any kind applies.
 */
export const CONDITIONAL = [
  ['health of a carer', /\b(?:hospital\w*|\bward\b|admitted|surgery|operation|chemo\w*|cancer|\bICU\b|ill|unwell|illness|sick|poorly|breakdown|rehab|addiction|drinking|overdose)\b/i],
  ['family circumstance', /\b(?:not around|struggling|lost (?:her|his|their) job|unemployed|redundan\w+)\b/i],
];

/**
 * Carer nouns, as one alternation string so every regex that needs them is built
 * from the same source. An earlier revision derived the possessive form by string
 * surgery on a compiled regex's `.source`; it worked, which is worse than failing,
 * because the next person to add a term would not have known it had to survive that.
 */
const CARER_WORDS = 'mum|mums|mummy|mom|moms|mommy|mother|dad|dads|daddy|father|'
  + 'parent|parents|carer|guardian|gran|granny|grandma|grandad|grandpa|grandmother|'
  + 'grandfather|nan|nana|stepmum|stepmom|stepdad|foster (?:mum|dad|carer)|aunt|auntie|uncle';

/** Presence of one of these near a CONDITIONAL term is what arms it. */
export const CARER = new RegExp(`\\b(?:${CARER_WORDS})\\b`, 'i');

/**
 * Stage 1 — record markers. A hit means she is pasting a RECORD, not asking a
 * question, and that is the signal — not the field itself. The refusal card names
 * exactly what to delete so re-checking is one edit away.
 */
export const RECORD_MARKERS = [
  ['an email address', /[\w.+-]+@[\w-]+\.[\w.]{2,}/],
  ['a phone number', /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s.-]?){2,}\d{3,4}\b/],
  ['a date of birth', /\b(?:d\.?o\.?b\.?|date of birth|born (?:on|in)\b)/i],
  ['a full date', /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/],
  ['a record or reference number', /\b(?:[A-Z]{2,4}[-/]?\d{5,}|\d{9,})\b/],
  ['a home address', /\b\d+[a-z]?\s+[A-Z][a-z]+\s+(?:road|rd|street|st|lane|ln|avenue|ave|close|drive|way|crescent|court|terrace|gardens)\b/i],
  ['a postcode', /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/],
];

/**
 * Stage 3 — does this predicate something about ONE child?
 * Definiteness is the discriminator. "a child who won't nap" is a class of children
 * and belongs in the generic lane; "the little boy who won't nap" is one child.
 */
// Singular referents only, plus twins/triplets — those are plural but identify ONE
// family, which is the same problem. "the boys", "the kids", "the children" stay out:
// they refer to the whole group, and treating the group as a specific child would
// refuse ordinary room-level questions.
// The adjective group carries its own separator so every entry spaces identically.
// Written as literal "new ", "little " … it silently excluded "youngest" and
// "oldest", which had no trailing space and so could never precede a noun —
// "the youngest child needs more support" was read as no referent at all.
export const DEFINITE_REFERENT = new RegExp(
  '\\b(?:the|this|that)\\s+'
  + '(?:(?:new|little|older|younger|youngest|oldest|quiet|quietest|shy|shyest|tall|tallest'
  + '|small|smallest|littlest|biggest|newest|only|other)\\s+)*'
  + '(?:boy|girl|child|kid|one|lad|lass|twins?|triplets?)\\b', 'i',
);
// "one of them" belongs here: it refers to a child in her room exactly as much as
// "one of my children" does, and it was the phrasing that walked a family
// circumstance straight through the generic lane.
export const FIRST_PERSON_COHORT = /\b(?:one of (?:my|mine|the|them)|in my (?:class|room|group)|my (?:class|room|group|key ?child|keychild))\b/i;
export const POSSESSIVE_CARER = new RegExp(
  `\\b(?:his|her|their|the child's|the boy's|the girl's)\\s+(?:${CARER_WORDS})\\b`, 'i',
);

/**
 * An INDEFINITE referent ("a child whose...") is generic UNLESS a narrative marker
 * shows she is describing a real event that happened. This is the evasion Kimi K3
 * predicted: after a few refusals she learns to write "a child whose parent is ill"
 * and the tool waves it through. The narrative marker is what stops that.
 */
export const INDEFINITE_REFERENT = /\b(?:a|another|one)\s+(?:little |young )?(?:boy|girl|child|kid|toddler|two[- ]year[- ]old|2[- ]year[- ]old)\b/i;

/**
 * Episodic markers only — evidence that something actually happened, to someone real.
 * "at drop-off" and "at pick-up" were here and are removed: they name a moment in the
 * routine, not an event, and they appear in ordinary class-level questions. Their
 * presence made the tool flag the very rewrite its own refusal card offers.
 */
export const NARRATIVE = /\b(?:again|today|yesterday|this morning|this afternoon|this week|last week|keeps|has been|have been|had a|was a|went|came in|started)\b/i;

/**
 * An explicit request for class-level guidance overrides the narrative test. She is
 * asking about a category of child, not reporting a day. Without this the tool
 * refuses the escape hatch it just told her to use, which teaches her the refusals
 * are noise — the single most expensive thing it could teach.
 */
export const GENERIC_CUE = /\b(?:in general|generally|general strateg\w+|typically|as a rule|what should a|is it normal|best practice|policy)\b/i;

/**
 * Any singular human who could be a child in her room. Used only by the fail-closed
 * rule for sensitive content that stage 3 could not attribute.
 *
 * Without it, the fail-closed rule refused on sensitive vocabulary alone, which
 * blocked "help me write the allergy notice for the noticeboard" and "how do I store
 * medication safely" — four of seven ordinary admin tasks in a probe. Those are
 * exactly the errands she would take to the browser instead.
 *
 * "they/them/their" are excluded on purpose: they read as plural far more often than
 * as one child, and including them refused a newsletter to families about their
 * children. The singular pronouns and the explicit nouns carry the signal.
 */
export const HUMAN_REFERENT = /\b(?:he|him|his|she|her|hers|someone|somebody|(?:a|one|the|another)\s+(?:little |young )?(?:child|boy|girl|kid|toddler|two[- ]year[- ]old)|my\s+(?:little\s+)?(?:boy|girl)|one of (?:them|mine|my))\b/i;

/**
 * Stage 6 — survives de-naming. These narrow the roster with no name present, so
 * substitution does nothing to them. This is the stage most redaction designs omit.
 */
export const SINGULARITY = [
  ['it describes the only child it could be', /\b(?:the only|only one|the one who|the sole)\b/i],
  // The child noun is required. This matched a bare "the new", so "my class loves
  // the new water wall" refused — as would every new rug, topic and display board.
  ['it points at one child by position in the group', /\bthe (?:new|newest|youngest|oldest|tallest|smallest|quietest|biggest|shyest|littlest)\s+(?:boy|girl|child|kid|one|lad|lass|twins?)\b/i],
  // Twins are singular in a room of twelve. Bare "brother"/"sister" is NOT here on
  // purpose: "he told me about his sister's puppy" is ordinary, and refusing it would
  // spend the false-block budget on the most common sentence shape she writes.
  ['twins identify a family', /\b(?:twins?|triplets?)\b/i],
  // A birthday rule was here and is removed. "Child D turns 3 next week" is a family
  // note, not a disclosure — everyone in the room already knows, and an exact date of
  // birth is caught at stage 1 anyway. It was refusing ordinary content for no risk.
  ['it names something only one child in a room would have', /\b(?:wheelchair|hearing aid|cochlear|feeding tube|epipen|prosthe\w+|interpreter|birthmark|walking frame|eye patch)\b/i],
  // Built from CARER_WORDS, not a hand-copied subset. The hand-copied version missed
  // "grandmother" — "gran" with a trailing \b cannot match it — and waved through the
  // canary sentence "the child whose grandmother runs the bakery on Mill Road".
  ['a relative clause still singles a child out', new RegExp(`\\b(?:whose|who's)\\s+(?:${CARER_WORDS}|family)\\b`, 'i')],
];
