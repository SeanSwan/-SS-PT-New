/**
 * Deterministic sorter — the no-model path.
 * =========================================
 * Turns one messy teacher brain-dump into typed records using rules only.
 * No LLM, no network, no dependencies. This must remain fully useful when the
 * local model is absent, slow, or evicted — the panel was unanimous that the app
 * has to be a good dumb notepad first and an AI tool second.
 *
 * Contract: sort(text, roster) -> { items: Item[], unmatched: string[] }
 *   Item = { type, childRef, body, due, bucket, confidence, matchedOn }
 *
 * type   ∈ observation | child_followup | parent | supply | prep | idea | admin
 * bucket ∈ must | should | extra
 *
 * Design notes that are load-bearing, not decoration:
 *  - Nothing child-linked is ever emitted with high confidence from rules alone.
 *    A misattributed note about a two-year-old is the unrecoverable error, so the
 *    review UI must always be able to see doubt. (Panel: "wrong child" kill gate.)
 *  - Unclassifiable fragments are RETURNED, never dropped. Silent loss is worse
 *    than an untyped item she can tag in one tap.
 */

/** Clause splitting. Teacher dumps are run-ons; sentence terminators alone are not enough. */
const TERMINATORS = /(?<=[.!?])\s+|\n+/;

/**
 * " and " only splits when what follows looks like a NEW statement, not a list tail.
 * Deliberately NOT case-insensitive: a capitalised token after "and" is the strongest
 * signal of a new clause in this input ("...meltdown at lunch and Priya's dad asked...").
 * With /i that discrimination is lost, which merged two statements into one mis-typed item.
 */
const AND_SPLIT = new RegExp(
  '\\s+(?:and then|and also|and)\\s+(?='
  + '[A-Z][a-z]+(?:\'s)?\\s'          // a name, possibly possessive: "Priya's dad"
  + '|I\\s|i\\s'                       // first person
  + '|(?:we|she|he|they)(?:\'re|\'ve|\'ll|\'d)?\\s'   // contractions: "and we're nearly out of..."
  + '|(?:need|a|the|one|another|mum|mom|dad|parent)\\b'
  + ')',
);

const SUPPLY_NOUNS = [
  'wipes', 'glue', 'glue sticks', 'paper', 'markers', 'crayons', 'tissues', 'paint',
  'sanitizer', 'sanitiser', 'bags', 'plates', 'cups', 'napkins', 'batteries', 'tape',
  'scissors', 'playdough', 'play dough', 'soap', 'towels', 'gloves', 'laminating',
  'cardstock', 'stickers', 'construction paper', 'pipe cleaners', 'cotton balls',
];

const RULES = [
  {
    type: 'supply',
    weight: 3,
    patterns: [
      /\b(?:need|out of|running low(?: on)?|more|order|restock|buy|pick up)\b/i,
      new RegExp(`\\b(?:${SUPPLY_NOUNS.join('|')})\\b`, 'i'),
    ],
    require: 2, // needs both a want-verb AND a supply noun, or an explicit low signal
    fallback: [/\b(?:we(?:'re| are) out of|running low)\b/i],
  },
  {
    type: 'parent',
    weight: 3,
    patterns: [
      /\b(?:mum|mom|mother|dad|father|parent|parents|family|grandma|grandpa|guardian)\b/i,
      /\b(?:asked|said|wants to know|wondering|emailed|called|mentioned|complained|requested|told|spoke to|notified|let (?:her|him|them) know)\b/i,
    ],
    require: 2,
  },
  {
    type: 'admin',
    weight: 3,
    patterns: [
      /\b(?:meeting|training|deadline|form|paperwork|director|principal|admin|licensing|inspection|due (?:by|on|friday|monday|tomorrow)|sign(?:ed)? off|policy)\b/i,
    ],
    require: 1,
  },
  {
    type: 'observation',
    weight: 2,
    patterns: [
      /\b(?:counted|stacked|sorted|matched|named|wrote|drew|built|climbed|jumped|balanced|poured|zipped|buttoned|shared|helped|tried|managed|recognis|recogniz|identified)\w*\b/i,
      /\b(?:by (?:her|him)self|on (?:her|his) own|first time|all by|independently|without help|for the first)\b/i,
    ],
    require: 1,
    childLinked: true,
  },
  {
    type: 'child_followup',
    weight: 2,
    patterns: [
      /\b(?:hard time|struggl\w+|cried|crying|upset|meltdown|tantrum|hit|bit|bite|pushed|refused|wouldn'?t|would not|difficult|clingy|unsettled|distressed|inconsolable)\b/i,
    ],
    require: 1,
    childLinked: true,
  },
  {
    type: 'prep',
    weight: 2,
    patterns: [
      // Action verbs ONLY. A bare date is a modifier, not a classifier — including
      // the date pattern here made "we should do X next week" classify as prep
      // instead of idea. Dates are resolved separately by resolveDue().
      /\b(?:print|laminate|cut out|prep|set up|get ready|forgot to|need to make|photocop|prepare|make|assemble)\w*\b/i,
    ],
    require: 1,
    // A dated fragment with no other signal ("apple activity tomorrow", "next week is
    // the letter B") is a plan item. This runs at base weight only, so ANY real rule
    // match outranks it — which is why it belongs in fallback and not in patterns.
    fallback: [/\b(?:tomorrow|monday|tuesday|wednesday|thursday|friday|next week|this week)\b/i],
  },
  {
    type: 'idea',
    // Outranks prep deliberately: "would be cute to make handprint trees" contains a
    // prep verb ("make") but is unambiguously an idea. An explicit idea phrase is a
    // stronger signal than any action verb inside it.
    weight: 3,
    patterns: [
      /\b(?:we should|would be (?:cute|nice|fun|lovely)|maybe we could|idea|want to try|it'?d be|thinking about doing|could do)\b/i,
    ],
    require: 1,
  },
];

const DUE_PATTERNS = [
  [/\btomorrow\b/i, 'tomorrow'],
  [/\btoday\b|\btonight\b/i, 'today'],
  [/\bnext week\b/i, 'next_week'],
  [/\b(monday|tuesday|wednesday|thursday|friday)\b/i, (m) => m[1].toLowerCase()],
];

/** Levenshtein — small closed roster, so an O(n*m) implementation is fine. */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Roster matching. Dictation mangles names, so exact match alone loses too much —
 * but a loose threshold invents children, which is the unrecoverable error. So:
 * exact/nickname → high confidence; fuzzy → LOW confidence and flagged for review.
 */
export function matchChild(fragment, roster) {
  const words = fragment.toLowerCase().match(/\b[a-z][a-z'-]{1,}\b/g) || [];
  let best = null;
  for (const child of roster) {
    const names = [child.name, ...(child.nicknames || [])].map((n) => n.toLowerCase());
    for (const name of names) {
      for (const word of words) {
        if (word === name) return { id: child.id, confidence: 0.98, via: 'exact' };
        const d = editDistance(word, name);
        const sim = 1 - d / Math.max(word.length, name.length);
        if (sim >= 0.75 && (!best || sim > best.confidence)) {
          best = { id: child.id, confidence: Number(sim.toFixed(2)), via: 'fuzzy' };
        }
      }
    }
  }
  return best;
}

/**
 * Minimum words before an "and" for it to be treated as a clause boundary.
 * Guards compound SUBJECTS: "Priya and Rafi both managed the stairs" is one
 * statement about two children, and splitting it silently dropped a child
 * reference — the exact class of error that must never happen.
 */
const MIN_WORDS_BEFORE_AND = 3;

export function splitClauses(text) {
  const out = [];
  for (const sentence of text.split(TERMINATORS)) {
    const parts = sentence.split(AND_SPLIT);
    let buffer = '';
    for (let i = 0; i < parts.length; i += 1) {
      const candidate = buffer ? `${buffer} and ${parts[i]}` : parts[i];
      const wordsSoFar = (buffer || parts[i]).trim().split(/\s+/).filter(Boolean).length;
      // Too short to be a clause on its own → it was a compound subject; re-join.
      if (i < parts.length - 1 && wordsSoFar < MIN_WORDS_BEFORE_AND) {
        buffer = candidate;
        continue;
      }
      const trimmed = candidate.trim().replace(/^[,;:\-\s]+|[,;\s]+$/g, '');
      if (trimmed.length > 2) out.push(trimmed);
      buffer = '';
    }
    if (buffer) {
      const trimmed = buffer.trim().replace(/^[,;:\-\s]+|[,;\s]+$/g, '');
      if (trimmed.length > 2) out.push(trimmed);
    }
  }
  return out;
}

function scoreRule(rule, fragment) {
  const hits = rule.patterns.filter((p) => p.test(fragment)).length;
  if (hits >= (rule.require ?? 1)) return rule.weight + hits;
  if (rule.fallback?.some((p) => p.test(fragment))) return rule.weight;
  return 0;
}

function resolveDue(fragment) {
  for (const [pattern, value] of DUE_PATTERNS) {
    const m = fragment.match(pattern);
    if (m) return typeof value === 'function' ? value(m) : value;
  }
  return null;
}

function bucketFor(type, due) {
  if (type === 'idea') return 'extra';
  if (type === 'parent' || type === 'admin') return 'must';
  if (due === 'today' || due === 'tomorrow') return 'must';
  if (type === 'child_followup') return 'must';
  if (type === 'observation') return 'should';
  return 'should';
}

export function sort(text, roster = []) {
  const items = [];
  const unmatched = [];

  for (const fragment of splitClauses(text)) {
    let bestType = null;
    let bestScore = 0;
    for (const rule of RULES) {
      const score = scoreRule(rule, fragment);
      if (score > bestScore) {
        bestScore = score;
        bestType = rule;
      }
    }

    if (!bestType) {
      // Never drop. An untyped item she tags in one tap beats silent loss.
      unmatched.push(fragment);
      continue;
    }

    const child = bestType.childLinked ? matchChild(fragment, roster) : null;
    const due = resolveDue(fragment);

    // Child-linked items are deliberately capped below certainty so the review UI
    // can always surface doubt. Rules must never assert a child confidently.
    const base = Math.min(0.5 + bestScore * 0.12, 0.92);
    const confidence = bestType.childLinked
      ? Math.min(base, child ? child.confidence : 0.55)
      : base;

    items.push({
      type: bestType.type,
      childRef: child ? child.id : null,
      childVia: child ? child.via : null,
      body: fragment,
      due,
      bucket: bucketFor(bestType.type, due),
      confidence: Number(confidence.toFixed(2)),
      needsReview: bestType.childLinked || confidence < 0.7,
    });
  }

  return { items, unmatched };
}
