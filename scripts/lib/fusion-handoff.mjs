/**
 * Free Fusion via File Handoff
 * ============================
 * The "pretty much free" tier (Sean 2026-06-15). Runs the Fusion pattern with ZERO
 * API spend by using the flat-rate subscription agents that already pair-code via
 * files — Claude Code ("My Cloud AI") + Codex ("MyCodecs AI"). Each brain writes an
 * INDEPENDENT answer to a file; the Final Decider then reads them all and writes the
 * fused synthesis using the SAME structured contract as the paid judge
 * (fusion-synthesis.mjs) — consensus / contradictions / unique insights / blind
 * spots / fused recommendation. No OpenRouter, no per-token billing.
 *
 * This is the option Sean "pulls up" on top of the normal Claude+Codex pair-coding
 * loop when he is out of credits or just wants a free second opinion:
 *
 *   Paid option  → node scripts/validation-orchestrator.mjs  (full Village + Opus/Fable judge + spend gate)
 *   Free option  → this handoff (Claude + Codex answer to files → Final Decider synthesizes)
 *
 * This module owns only the deterministic FILE MECHANICS (create run, write request,
 * collect answers, save synthesis). The agent-in-the-loop steps — each brain actually
 * answering, and the Decider actually synthesizing — are driven by the
 * `ai-village-fusion` skill, because those are performed by the subscription agents,
 * not by an API call. The synthesis text the Decider produces is guided by
 * buildHandoffJudgePrompt() so the free output matches the paid output's shape.
 *
 * Privacy (Rule 8): handoff files live under the gitignored `.ai-workflow/` tree and
 * carry whatever the caller puts in `task`/`context` — keep client PII out (IDs/roles
 * only), same rule as every other AI surface.
 *
 * @module fusion-handoff
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { buildSynthesisPrompt } from './fusion-synthesis.mjs';

// ── Atomic write (write-temp-then-rename) ──
// Recommended by the triangle's own synthesis: never let a poller read a
// half-flushed file. Node 22 renameSync does an atomic replace on BOTH Windows
// (MoveFileEx REPLACE_EXISTING via libuv) and POSIX, so this is cross-platform.
let _atomicSeq = 0;
export function atomicWrite(filePath, content) {
  const tmp = `${filePath}.${process.pid}.${_atomicSeq++}.tmp`;
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, filePath);
  return filePath;
}

/** Default location for free-fusion runs (gitignored .ai-workflow tree). */
export const DEFAULT_FUSION_ROOT = join('.ai-workflow', 'fusion');

/** The flat-rate subscription brains used for free fusion. */
export const DEFAULT_BRAINS = ['claude', 'codex'];

/** Minimum independent answers needed before a synthesis is worth doing. */
export const MIN_FREE_PANEL = 2;

/** Path to a single run directory. */
export function runDirFor(root, runId) {
  return join(root, runId);
}

/** Path to a brain's answer file inside a run. */
export function answerPath(dir, brain) {
  return join(dir, 'answers', `${brain}.md`);
}

/**
 * Build the request.md the brains read. Pure function — exported for testing.
 * Emphasizes INDEPENDENCE (don't read each other first) which is what gives the
 * panel its diversity lift.
 */
export function buildBrainRequest({ topic, task, context = '', brains = DEFAULT_BRAINS }) {
  return `# Free Fusion Request — ${topic}

> Zero-credit fusion: each brain answers INDEPENDENTLY, then the Final Decider fuses
> all answers. Do NOT read another brain's answer before writing your own — the value
> of a panel comes from independent perspectives.

## How to answer (each brain)
1. Read the Task + Context below.
2. Write your best, complete answer to \`answers/<your-name>.md\` (e.g. \`answers/claude.md\`, \`answers/codex.md\`).
3. Be specific and decisive. Cite files/line numbers where relevant. State assumptions.
4. Do not edit another brain's answer file.

## Task
${task}

## Context
${context || '(none provided)'}

## Brains expected
${brains.map((b) => `- ${b} → ${answerPath('.', b)}`).join('\n')}

## After all answers are in
The Final Decider (strongest available: Fable 5 → Opus → Codex) reads every \`answers/*.md\`
and writes \`synthesis.md\` with these exact sections: Consensus Points, Contradictions,
Partial Coverage, Unique Insights, Blind Spots, Fused Recommendation.
`;
}

/**
 * Create a free-fusion run on disk: request.md, an empty answers/ dir, and meta.json.
 * @returns {{ dir:string, requestPath:string, answersDir:string, metaPath:string, brains:string[] }}
 */
export function createFusionRun({
  root = DEFAULT_FUSION_ROOT,
  runId,
  topic,
  task,
  context = '',
  brains = DEFAULT_BRAINS,
  createdAt,
}) {
  if (!runId) throw new Error('createFusionRun: runId is required');
  if (!task) throw new Error('createFusionRun: task is required');
  const dir = runDirFor(root, runId);
  const answersDir = join(dir, 'answers');
  mkdirSync(answersDir, { recursive: true });

  const requestPath = join(dir, 'request.md');
  atomicWrite(requestPath, buildBrainRequest({ topic, task, context, brains }));

  const metaPath = join(dir, 'meta.json');
  atomicWrite(metaPath, JSON.stringify({
    runId,
    topic: topic || '',
    brains,
    createdAt: createdAt || new Date().toISOString(),
    tier: 'free-handoff',
  }, null, 2));

  return { dir, requestPath, answersDir, metaPath, brains };
}

/** Write (or overwrite) one brain's independent answer. */
export function writeBrainAnswer(dir, brain, text) {
  return atomicWrite(answerPath(dir, brain), String(text ?? ''));
}

/**
 * Collect the brains' answers in the orchestrator result shape so they can flow
 * straight into the synthesis contract. Missing/empty answers are PENDING.
 * @returns {Array<{name:string, model:string, status:'SUCCESS'|'PENDING', text:string}>}
 */
export function listAnswers(dir, brains = DEFAULT_BRAINS) {
  return brains.map((b) => {
    const p = answerPath(dir, b);
    if (!existsSync(p)) return { name: b, model: `subscription:${b}`, status: 'PENDING', text: '' };
    const text = readFileSync(p, 'utf-8').trim();
    return { name: b, model: `subscription:${b}`, status: text ? 'SUCCESS' : 'PENDING', text };
  });
}

/** True once enough independent answers exist to make synthesis worthwhile. */
export function readyToSynthesize(dir, brains = DEFAULT_BRAINS, minPanel = MIN_FREE_PANEL) {
  return listAnswers(dir, brains).filter((a) => a.status === 'SUCCESS').length >= minPanel;
}

/**
 * Build the prompt the Final Decider uses to synthesize the collected answers —
 * the same contract the paid judge uses, so free output matches paid output's shape.
 * Returns null if not enough answers are in yet.
 */
export function buildHandoffJudgePrompt(dir, { topic = '', context = '', brains = DEFAULT_BRAINS, minPanel = MIN_FREE_PANEL } = {}) {
  const analysts = listAnswers(dir, brains).filter((a) => a.status === 'SUCCESS');
  if (analysts.length < minPanel) return null;
  return buildSynthesisPrompt({ analysts, context, topic });
}

/** Persist the Decider's fused synthesis for the run. */
export function writeFreeSynthesis(dir, synthesisMarkdown) {
  return atomicWrite(join(dir, 'synthesis.md'), String(synthesisMarkdown ?? ''));
}
