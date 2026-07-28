/**
 * Fusion Synthesis Judge Module
 * =============================
 * Adds the "synthesis-first ensemble" step that OpenRouter's Fusion API is built
 * around — the single mechanism the SwanStudios AI Village was missing.
 *
 * The AI Village already fans a task out to a diverse panel of analysts in
 * parallel (Phase 1) and then DEBATES topic-by-topic (Phase 2/3). What it never
 * did was run ONE judge across ALL Phase-1 analysts to extract a structured
 * distillation. Per the Fusion benchmarks (~3/4 of the lift comes from this
 * synthesis step, only ~1/4 from raw model diversity), this is the highest-
 * leverage, lowest-cost graft available.
 *
 * The judge is NOT a participant. It does no new research and adds no opinions
 * the analysts did not raise. It reads every analyst response and emits:
 *   1. Consensus Points     — highest-confidence (everyone/most agree)
 *   2. Contradictions       — where analysts disagree, attributed
 *   3. Partial Coverage     — raised by some, not all
 *   4. Unique Insights      — raised by exactly one analyst
 *   5. Blind Spots          — what NONE covered but should have
 *   6. Fused Recommendation — the synthesized best answer, grounded in the above
 *
 * Privacy (CLAUDE.md Rule 8): the judge sees EVERY analyst output — the most
 * sensitive aggregate in the whole run. It MUST be a policy-allowed (US/EU)
 * model. This module fail-closes if handed a disallowed provider, mirroring the
 * orchestrator's `assertNoChineseProviderInPolicyConstrainedTracks` guard.
 *
 * Used by: scripts/validation-orchestrator.mjs (docs / planning / code-review
 * modes), called once per run right after the Phase-1 panel resolves. Designed
 * to be reusable standalone (e.g. a future lightweight "fusion tier" consult).
 *
 * @module fusion-synthesis
 */

/** Minimum successful analysts required before synthesis adds value. */
export const MIN_PANEL = 2;

/**
 * Provider prefixes that must never receive the full analyst aggregate.
 * Kept in sync with DISALLOWED_PROVIDER_PREFIXES in validation-orchestrator.mjs.
 * (Duplicated deliberately so this module stays dependency-free / reusable.)
 */
export const DISALLOWED_JUDGE_PREFIXES = ['minimax/', 'stepfun/', 'qwen/', 'deepseek/', 'z-ai/'];

/**
 * Section contract. The prompt asks the judge for these EXACT level-2 headings;
 * the parser maps each `## ` block back to a key via case-insensitive aliases.
 */
const SECTION_DEFS = [
  { key: 'consensus',           label: 'Consensus Points',     aliases: ['consensus'] },
  { key: 'contradictions',      label: 'Contradictions',       aliases: ['contradiction', 'disagreement', 'key difference'] },
  { key: 'partialCoverage',     label: 'Partial Coverage',     aliases: ['partial coverage', 'partial'] },
  { key: 'uniqueInsights',      label: 'Unique Insights',      aliases: ['unique insight', 'unique'] },
  { key: 'blindSpots',          label: 'Blind Spots',          aliases: ['blind spot', 'blind'] },
  { key: 'fusedRecommendation', label: 'Fused Recommendation', aliases: ['fused recommendation', 'final recommendation', 'fused answer', 'final answer', 'synthesis'] },
];

/** Empty section map (stable shape even when parsing finds nothing). */
function emptySections() {
  return SECTION_DEFS.reduce((acc, d) => { acc[d.key] = ''; return acc; }, {});
}

/**
 * Build the judge prompt from the surviving (SUCCESS) analyst outputs.
 * Pure function — exported for testing.
 *
 * @param {{ analysts: Array<{name:string, model:string, text:string}>, context?: string, topic?: string }} args
 * @returns {string}
 */
export function buildSynthesisPrompt({ analysts, context = '', topic = '', deliverable = '' }) {
  const panel = (analysts || [])
    .map((a, i) => `### Analyst ${i + 1}: ${a.name} (${a.model})\n${a.text}`)
    .join('\n\n---\n\n');

  // Optional authoring add-on (Sean 2026-07-08): when the caller supplies a `deliverable`
  // brief, the judge appends ONE grounded build plan (with Mermaid diagrams) after the
  // analysis sections — extracting maximum value from a single paid judge call. Used only
  // on demand, not every run. Empty by default → prompt is byte-identical to the base contract.
  const deliverableBlock = deliverable
    ? `\n\n## Full Build Plan (Final Deliverable)\n${deliverable}`
    : '';

  return `You are the SYNTHESIS JUDGE in a multi-model "fusion" pipeline${topic ? ` for: ${topic}` : ''}.

${context ? `## Context\n${context}\n\n` : ''}## Your job
${(analysts || []).length} independent expert analysts each answered the SAME task in parallel. Their full responses are below. You are NOT a participant — do NOT do new research, do NOT introduce opinions the analysts did not raise, and do NOT simply pick a favorite analyst. Your ONLY job is to read every response and synthesize them into one superior answer, grounded strictly in what the analysts actually said.

## Output format — use these EXACT level-2 markdown headings, in this order:

## Consensus Points
Points where all or most analysts agree. These are the highest-confidence findings.

## Contradictions
Direct disagreements between analysts. For each, name which analyst held which position and which is better supported by their stated evidence.

## Partial Coverage
Important points raised by some analysts but not all.

## Unique Insights
Valuable points raised by exactly ONE analyst that no other analyst mentioned. Attribute each to its analyst — these are the payoff of running a diverse panel.

## Blind Spots
Important aspects of the task that NO analyst addressed but should have, given the context. Reason about gaps in the collective coverage — still without doing new external research.

## Fused Recommendation
The single best answer, synthesized from everything above. Ground every claim in the analysts' contributions. Be decisive and actionable.${deliverableBlock}

---

## Analyst responses
${panel}`;
}

/**
 * Best-effort parse of the judge's markdown into the structured section map.
 * Resilient: unknown/missing headings yield empty strings; the caller always
 * keeps the raw text as source of truth, so imperfect parsing never loses data.
 * Pure function — exported for testing.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseSynthesisSections(text) {
  const sections = emptySections();
  if (!text || typeof text !== 'string') return sections;

  // Split on level-2 headings; `split` drops the "## " marker, so each part
  // begins with the heading text followed by its body.
  const parts = text.split(/^##\s+/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim().toLowerCase();
    const body = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    for (const def of SECTION_DEFS) {
      if (def.aliases.some(a => heading.includes(a))) {
        // First match wins; don't overwrite an already-filled section.
        if (!sections[def.key]) sections[def.key] = body;
        break;
      }
    }
  }
  return sections;
}

/**
 * Run the fusion synthesis judge over a set of Phase-1 analyst results.
 *
 * Non-breaking by contract:
 *   - returns `null` (skip) when fewer than `minPanel` analysts succeeded,
 *   - returns a `status:'ERROR'` result (never throws) when the judge call fails,
 *   - throws ONLY for a programmer/policy error (missing or disallowed judge model).
 *
 * The returned object matches the orchestrator's result shape so it can be
 * spread straight into the `results` array for reporting + cost tracking.
 *
 * @param {Object} args
 * @param {Array<{name:string, model:string, status:string, text:string}>} args.analystResults - raw Phase-1 results
 * @param {(model:string, prompt:string)=>Promise<{text:string, inputTokens?:number, outputTokens?:number, model?:string}>} args.callModel
 * @param {string} args.judgeModel - the model that synthesizes (must be policy-allowed)
 * @param {string} [args.context] - run context (theme/stack/file list)
 * @param {string} [args.topic] - short label for the run
 * @param {number} [args.priceInputPerM=0] - $ per 1M input tokens (for cost tracking)
 * @param {number} [args.priceOutputPerM=0] - $ per 1M output tokens
 * @param {number} [args.minPanel=MIN_PANEL] - minimum successful analysts to proceed
 * @param {(msg:string)=>void} [args.log] - progress logger
 * @returns {Promise<Object|null>}
 */
export async function runFusionSynthesis({
  analystResults,
  callModel,
  judgeModel,
  context = '',
  topic = '',
  deliverable = '',
  priceInputPerM = 0,
  priceOutputPerM = 0,
  maxUsd = 0,
  minPanel = MIN_PANEL,
  log = () => {},
}) {
  const jm = String(judgeModel || '').toLowerCase();
  if (!jm) throw new Error('runFusionSynthesis: judgeModel is required');
  if (DISALLOWED_JUDGE_PREFIXES.some(p => jm.startsWith(p))) {
    throw new Error(
      `runFusionSynthesis: judge model "${judgeModel}" is a disallowed provider — the judge sees every analyst output (the most sensitive aggregate) and must be a policy-allowed model`,
    );
  }
  if (typeof callModel !== 'function') throw new Error('runFusionSynthesis: callModel must be a function');

  const analysts = (analystResults || []).filter(
    (r) => r && r.status === 'SUCCESS' && typeof r.text === 'string' && r.text.trim() && !r.text.startsWith('Error:'),
  );

  if (analysts.length < minPanel) {
    log(`[synthesis] skipped — only ${analysts.length} successful analyst(s); need ${minPanel}+ to fuse`);
    return null;
  }

  const start = Date.now();
  const prompt = buildSynthesisPrompt({ analysts, context, topic, deliverable });

  // Hard per-call dollar cap (Sean 2026-07-08): bound THIS judge call's TOTAL cost by
  // computing the largest output-token budget the dollars allow, given the measured input
  // size and the model's output price. Guarantees the paid judge (e.g. Fable at $10/$50 per M)
  // can never exceed `maxUsd`. 0 = disabled (callModel's own default ceiling applies). The 0.85
  // factor is a ~15% safety margin against tokenizer drift vs the char/4 estimate; the floor
  // keeps a minimal answer possible even if the input alone nears the budget.
  let callMaxTokens; // undefined -> callModel uses its own default ceiling
  if (maxUsd > 0 && priceOutputPerM > 0) {
    const estInputTokens = Math.ceil(prompt.length / 4);
    const inputCost = (estInputTokens / 1_000_000) * priceInputPerM;
    const outputBudgetUSD = Math.max(0, maxUsd - inputCost);
    callMaxTokens = Math.max(1200, Math.floor((outputBudgetUSD / priceOutputPerM) * 1_000_000 * 0.85));
    log(`[synthesis] hard cap $${maxUsd.toFixed(2)} — ~${estInputTokens} input tok ($${inputCost.toFixed(3)}) → output capped at ${callMaxTokens} tok`);
  }
  log(`[synthesis] judging ${analysts.length} analyst outputs via ${judgeModel}...`);

  try {
    const res = await callModel(judgeModel, prompt, callMaxTokens);
    const text = res?.text || '(no response)';
    const inputTokens = res?.inputTokens || 0;
    const outputTokens = res?.outputTokens || 0;
    const costUSD = (inputTokens / 1_000_000 * priceInputPerM) + (outputTokens / 1_000_000 * priceOutputPerM);
    log(`[synthesis] done — ${((Date.now() - start) / 1000).toFixed(1)}s, $${costUSD.toFixed(4)}`);
    return {
      name: 'Fusion Synthesis (Judge)',
      model: res?.model || judgeModel,
      status: 'SUCCESS',
      text,
      sections: parseSynthesisSections(text),
      analystCount: analysts.length,
      judgeModel,
      inputTokens,
      outputTokens,
      costUSD,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    log(`[synthesis] FAILED — ${err.message}`);
    return {
      name: 'Fusion Synthesis (Judge)',
      model: judgeModel,
      status: 'ERROR',
      text: `Error: ${err.message}`,
      sections: emptySections(),
      analystCount: analysts.length,
      judgeModel,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Render the standalone `synthesis.md` artifact ("read me first" file).
 *
 * @param {Object|null} result - a SUCCESS result from runFusionSynthesis
 * @returns {string}
 */
export function formatSynthesisMarkdown(result) {
  if (!result || result.status !== 'SUCCESS') {
    return `# Fusion Synthesis\n\n> The synthesis judge did not produce a result this run.\n`;
  }
  return `# Fusion Synthesis — Judge Verdict

> Fusion-style synthesis: one judge (${result.judgeModel}) read all ${result.analystCount} parallel analyst outputs and extracted consensus, contradictions, unique insights, and blind spots, then wrote a fused recommendation.
> This is the "read me first" artifact — the structured distillation of the whole panel, the part of the Fusion architecture that carries most of the quality lift.

---

${result.text}
`;
}
