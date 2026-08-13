/**
 * swanPromptSerializers.mjs — how the 12-slot IR becomes a STRING.
 *
 * Split out of `swanPromptCompiler.mjs` at the 300-line cap (rule 4), and the
 * seam is real rather than convenient: the compiler owns WHAT the prompt says
 * (slot assembly, law, aspect), this owns HOW it is rendered for a given
 * provider. Adding a serializer for a new model family should never mean
 * touching slot logic.
 *
 * Also here: strategy selection and budget truncation, because both are
 * questions about rendering rather than about content.
 */

/**
 * SERIALIZATION STRATEGIES.
 *
 * The 12-slot map is the intermediate representation — it is the audit trail
 * (lawChecks can name WHICH slot failed), the diff surface (a facet change is
 * visible), and the capability-gating boundary (negative is separable). That
 * part is substance.
 *
 * How the IR becomes a STRING is a separate, provider-dependent question, and
 * the first implementation joined slots with '. ' — a telegraphic keyword stack.
 * Two independent hostile reviews said the same thing: natural-language image
 * models are trained on captions, and a 12-fragment staccato string carries no
 * syntactic signal about which modifier binds to which subject. Worse, 18 tests
 * asserted that one arbitrary serializer's output, locking the choice in.
 *
 * So: strategies. The IR is unchanged; only the rendering differs.
 */
export const SERIALIZERS = Object.freeze({
  /**
   * Flowing caption for natural-language models (Gemini, GPT-image, MiniMax).
   * Subject and style lead, modifiers attach as clauses. This is the DEFAULT
   * because it matches every provider currently on the roadmap.
   */
  sentence(slots) {
    const lead = [slots.styleAnchor, slots.subject].filter(Boolean)[0] || slots.intent;
    const setting = [slots.composition, slots.optics].filter(Boolean).join(', ');
    const look = [slots.light, slots.palette, slots.material].filter(Boolean).join(', ');
    const parts = [];
    if (slots.medium && lead) parts.push(`A ${slots.medium}: ${lead}`);
    else if (lead) parts.push(lead);
    // A medium with no lead used to vanish entirely, yielding a bare ".".
    else if (slots.medium) parts.push(`A ${slots.medium}`);
    if (setting) parts.push(`Framed ${setting}`);
    if (look) parts.push(`Lit and surfaced with ${look}`);
    if (slots.abstraction) parts.push(slots.abstraction);
    // The output contract MUST reach the model. Dropping it produced a portrait
    // image from a 16:9 brief on the very first real generation — sentence and
    // tag only got the right ratio by luck, inferring it from "cinematic".
    if (slots.output) parts.push(`Composed for a ${slots.output} frame`);
    return `${parts.join('. ')}.`;
  },

  /**
   * Comma-delimited tag stack for CLIP-conditioned models (SDXL-class), which
   * genuinely do better with tags than prose.
   */
  tag(slots) {
    // The personification formula embeds the subject inside styleAnchor, so
    // emitting both duplicates it verbatim. Drop the bare subject when the
    // style anchor already contains it.
    const anchorHasSubject = Boolean(slots.styleAnchor && slots.subject
      && slots.styleAnchor.toLowerCase().includes(slots.subject.toLowerCase().trim()));
    const order = [anchorHasSubject ? null : 'subject', 'styleAnchor', 'medium',
      'composition', 'optics', 'light', 'palette', 'material', 'abstraction', 'output'].filter(Boolean);
    return order.map((k) => slots[k]).filter((v) => v && v.trim()).join(', ');
  },

  /**
   * The original '. '-join. Retained so the behaviour is available and testable
   * rather than deleted — but it is no longer the silent default.
   */
  fragment(slots) {
    const order = ['intent', 'subject', 'styleAnchor', 'medium', 'composition',
      'optics', 'light', 'palette', 'material', 'abstraction', 'output'];
    return `${order.map((k) => slots[k]).filter((v) => v && v.trim()).join('. ')}.`;
  },
});

/**
 * Last-resort name hints. Provider NAMES are marketing, not architecture:
 * "stable-diffusion-3-api" serves SD3, which is caption-trained via T5 and
 * would want prose — the brand says otherwise. So this is a hint of last
 * resort, never the primary signal. Declare `promptStyle` in capabilities.
 */
const TAG_NAME_HINT = /sdxl|comfy|automatic1111|invoke/i;

/**
 * Default when a provider declares nothing.
 *
 * NOT 'sentence'. Under an unknown token limit, a truncated sentence loses
 * grammatical coherence AND its tail content, while a truncated delimited list
 * loses only tail items. The right default is the one with the FLATTEST FAILURE
 * CURVE, not the one that reads best when everything goes right. Promoting
 * 'sentence' to the unknown-provider default turned a cheap unvalidated
 * assumption into an expensive one.
 */
const UNDECLARED_DEFAULT = 'fragment';

/**
 * Pick a strategy. Precedence, strongest signal first:
 *   1. `caps.promptStyle` — a DECLARED capability. This is the real answer.
 *   2. Provider-name hint — marketing string, last resort, tag-family only.
 *   3. `UNDECLARED_DEFAULT` — flattest failure curve.
 * Two of three tiers used to be guesses; now only the bottom one is.
 */
export function strategyFor(caps = {}) {
  if (caps.promptStyle && SERIALIZERS[caps.promptStyle]) return caps.promptStyle;
  if (caps.provider && TAG_NAME_HINT.test(caps.provider)) return 'tag';
  return UNDECLARED_DEFAULT;
}

/**
 * Truncate to a provider's prompt budget by DROPPING TAIL SEGMENTS, never by
 * cutting mid-string. A CLIP-conditioned model with a 77-token window silently
 * drops the overflow, and "why did my materials vanish" is a day of debugging.
 * Segment-wise truncation at least fails legibly.
 */
export function fitToBudget(text, maxChars) {
  if (!Number.isFinite(maxChars) || maxChars <= 0 || text.length <= maxChars) {
    return { text, truncated: false, droppedSegments: 0 };
  }
  const sep = text.includes(', ') && !text.includes('. ') ? ', ' : '. ';
  const segs = text.split(sep);
  let out = [];
  let dropped = 0;
  for (const s of segs) {
    const candidate = [...out, s].join(sep);
    if (candidate.length <= maxChars) out.push(s);
    else dropped += 1;
  }
  if (out.length === 0) return { text: text.slice(0, maxChars), truncated: true, droppedSegments: segs.length };
  return { text: out.join(sep), truncated: true, droppedSegments: dropped };
}

/** Render the IR to a string under a named strategy. */
export function serializeFor(strategy, slots) {
  const fn = SERIALIZERS[strategy];
  if (!fn) {
    const err = new Error(`E_UNKNOWN_SERIALIZER: "${strategy}". Known: ${Object.keys(SERIALIZERS).join(', ')}`);
    err.code = 'E_UNKNOWN_SERIALIZER';
    throw err;
  }
  return fn(slots);
}
