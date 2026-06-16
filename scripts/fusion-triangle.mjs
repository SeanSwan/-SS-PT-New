#!/usr/bin/env node
/**
 * Fusion Triangle launcher (Tier 2 — the everyday workhorse)
 * ==========================================================
 * Zero-credit fusion on flat-rate subscriptions. Drives the subscription agents
 * through the shared polling board (scripts/lib/fusion-board.mjs):
 *   - Claude + Gemini are spawned headless (`claude -p` / `gemini -p`), each
 *     answers INDEPENDENTLY, stdout is captured into answers/<agent>.md.
 *   - Codex has no CLI on PATH, so it joins via the board in its OWN session:
 *     it reads request.md and writes answers/codex.md. The poll loop times it
 *     out and proceeds with whoever's in (≥2 to fuse).
 *   - The Final Decider (Claude) reads all answers and writes synthesis.md.
 *
 * Cost: $0 marginal API — runs on the Claude/Gemini/Codex subscriptions.
 *
 * Usage:
 *   node scripts/fusion-triangle.mjs --task "<question>" [--context "<facts>"]
 *        [--agents claude,gemini,codex] [--run-id <slug>] [--poll-timeout-ms N]
 *
 * The orchestration core (runTriangle) takes an injectable `invoke` so it is
 * unit-testable without spawning real CLIs.
 *
 * Privacy (Rule 8): board files are gitignored — keep task/context to IDs/roles.
 *
 * @module fusion-triangle
 */

import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initBoard, postContribution, pollUntilReady, sealBoard, DEFAULT_POLL_MS,
} from './lib/fusion-board.mjs';
import { listAnswers, buildHandoffJudgePrompt, writeFreeSynthesis, resolveFusionRoot } from './lib/fusion-handoff.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Portability: SWAN_FUSION_ROOT routes output to the invoking project; unset = this repo (unchanged).
const FUSION_ROOT = resolveFusionRoot(process.env, join(__dirname, '..', '.ai-workflow', 'fusion'));

/** Agent → headless CLI spec. Codex intentionally absent (no CLI → board only). */
export const AGENT_CMD = {
  claude: { cmd: 'claude', args: ['-p'] },
  gemini: { cmd: 'gemini', args: ['-o', 'text'] },
};

/** Strip known CLI preamble noise so only the model's answer lands in the file. */
export function stripPreamble(agent, text) {
  const drop = new Set(['Loaded cached credentials.']);
  return String(text || '').split('\n').filter((l) => !drop.has(l.trim())).join('\n').trim();
}

/** The independent-answer prompt each brain gets (blind to the others in round 1). */
export function brainPrompt(task, context) {
  return `${task}\n\nContext:\n${context || '(none)'}\n\nAnswer INDEPENDENTLY and concretely — you have not seen any other model's answer. Cite files/line numbers where relevant, state assumptions, and do not hedge toward a safe consensus. Your distinct perspective is the point.`;
}

/** Spawn a headless CLI agent, write the prompt to stdin, capture stdout. */
/**
 * Gemini model preference chain (BEST-first). Sean's directive: always use the
 * best available Gemini Pro, not flash. We try the canonical Pro first and only
 * fall back when a model is capacity-throttled — so the triangle uses Pro when it
 * can and degrades to flash only when Pro is exhausted.
 *   - SWAN_FUSION_GEMINI_MODELS="a,b,c" → explicit chain
 *   - SWAN_FUSION_GEMINI_MODEL="x"      → single model
 *   - default                           → 3.1-pro-preview → 2.5-pro → 2.5-flash
 * NOTE: "gemini-3.5-pro" is NOT a published model id; the best real Pro is
 * gemini-3.1-pro-preview (the project's CTO/design authority model).
 */
export function geminiModelChain() {
  if (process.env.SWAN_FUSION_GEMINI_MODELS) return process.env.SWAN_FUSION_GEMINI_MODELS.split(',').map((s) => s.trim()).filter(Boolean);
  if (process.env.SWAN_FUSION_GEMINI_MODEL) return [process.env.SWAN_FUSION_GEMINI_MODEL];
  return ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
}

/** Detect a Gemini CLI failure (capacity, bad model, API error) vs a real answer. */
export function looksLikeGeminiError(text) {
  return !text || /exhausted your capacity|RESOURCE_EXHAUSTED|\bquota\b|rate.?limit|\b429\b|Error when talking to Gemini|API Error|unexpected critical error/i.test(text);
}

/** One headless CLI invocation: prompt via stdin; capture stdout + stderr SEPARATELY. */
function spawnOnce(cmd, args, prompt, timeoutMs) {
  return new Promise((resolve) => {
    let out = '', err = '', done = false;
    const finish = (r) => { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
    const child = spawn(cmd, args, { shell: true });
    const timer = setTimeout(() => { try { child.kill(); } catch { /* noop */ } finish({ ok: false, stdout: out, stderr: `timeout after ${timeoutMs}ms`, code: null }); }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => finish({ ok: false, stdout: out, stderr: `spawn error: ${e.message}`, code: null }));
    child.on('close', (code) => finish({ ok: code === 0, stdout: out, stderr: err, code }));
    child.stdin.write(prompt); child.stdin.end();
  });
}

/** Spawn a headless CLI agent (Gemini walks its best-first model chain). The
 * ANSWER comes from stdout only (stderr is used solely for error detection), so
 * CLI warnings never pollute a brain's contribution. */
export async function spawnAgentCli(agent, prompt, { timeoutMs = 180_000 } = {}) {
  const spec = AGENT_CMD[agent];
  if (!spec) return { ok: false, text: `no CLI for agent '${agent}'` };

  if (agent === 'gemini') {
    let last = { ok: false, text: 'no gemini model tried' };
    for (const model of geminiModelChain()) {
      const raw = await spawnOnce(spec.cmd, ['-m', model, ...spec.args], prompt, timeoutMs);
      const ans = stripPreamble(agent, raw.stdout);
      // capacity / API errors can land on either stream and gemini may still exit 0
      if (ans && !looksLikeGeminiError(`${raw.stdout}\n${raw.stderr}`)) return { ok: true, text: ans, model };
      last = { ok: false, text: `[${model}] ${(ans || raw.stderr || '').slice(0, 200)}`.trim(), model };
    }
    return last;
  }

  const modelEnv = process.env[`SWAN_FUSION_${agent.toUpperCase()}_MODEL`];
  const args = modelEnv ? ['-m', modelEnv, ...spec.args] : [...spec.args];
  const raw = await spawnOnce(spec.cmd, args, prompt, timeoutMs);
  const ans = stripPreamble(agent, raw.stdout);
  return { ok: raw.ok && !!ans, text: ans || String(raw.stderr || '').trim() || `exit ${raw.code}` };
}

/**
 * Orchestrate one triangle run over the polling board.
 * @param {object} o
 * @param {string} o.runId @param {string} o.task @param {string} [o.context]
 * @param {string[]} [o.cliAgents]   - spawned headless (default claude,gemini)
 * @param {string[]} [o.codexAgents] - board-only, joins in its own session (default codex)
 * @param {Function} [o.invoke]      - (agent, prompt, opts)=>Promise<{ok,text}> (injectable)
 * @param {string} [o.judgeAgent]    - who synthesizes (default claude)
 * @returns {Promise<{dir, ready:string[], synthesized:boolean, synthesisPath?:string, timedOut?:string[]}>}
 */
export async function runTriangle({
  root = FUSION_ROOT, runId, task, context = '',
  cliAgents = ['claude', 'gemini'], codexAgents = ['codex'],
  perAgentTimeoutMs = 180_000, pollTimeoutMs = 5 * 60_000, pollIntervalMs = DEFAULT_POLL_MS,
  judgeAgent = 'claude', invoke = spawnAgentCli, log = console.log, createdAt,
  pollNowFn, pollSleepFn,
}) {
  if (!runId || !task) throw new Error('runTriangle: runId and task are required');
  const agents = [...cliAgents, ...codexAgents];
  const b = initBoard({ root, runId, task, context, agents, createdAt });
  log(`[triangle] board ${b.dir} — agents: ${agents.join(', ')}`);
  for (const cx of codexAgents) log(`[triangle] ${cx}: attach in your session -> read ${join(b.dir, 'request.md')}, write answers/${cx}.md (poll/timeout if absent)`);

  // CLI agents answer independently, concurrently.
  await Promise.all(cliAgents.map(async (a) => {
    const r = await invoke(a, brainPrompt(task, context), { timeoutMs: perAgentTimeoutMs });
    if (r.ok && r.text) { postContribution(b.dir, a, r.text); log(`[triangle] ${a} ✓ (${r.text.length} chars)`); }
    else log(`[triangle] ${a} ✗ ${r.text}`);
  }));

  const poll = await pollUntilReady(b.dir, { agents, intervalMs: pollIntervalMs, timeoutMs: pollTimeoutMs, log, ...(pollNowFn ? { nowFn: pollNowFn } : {}), ...(pollSleepFn ? { sleepFn: pollSleepFn } : {}) });
  if (poll.timedOut) log(`[triangle] timed out on: ${poll.missing.join(', ')} — proceeding with what's in`);

  // Two-phase barrier: close the answer phase before the judge reads anything.
  sealBoard(b.dir, createdAt ? { now: createdAt } : {});
  const ready = listAnswers(b.dir, agents).filter((a) => a.status === 'SUCCESS');
  if (ready.length < 2) { log(`[triangle] only ${ready.length} answer(s) — need ≥2 to fuse; aborting synthesis`); return { dir: b.dir, ready: ready.map((r) => r.name), synthesized: false, timedOut: poll.missing }; }

  const judgePrompt = buildHandoffJudgePrompt(b.dir, { topic: runId, context, brains: agents });
  const jr = await invoke(judgeAgent, judgePrompt, { timeoutMs: perAgentTimeoutMs });
  if (jr.ok && jr.text) {
    const md = `# Fusion Synthesis (Triangle) — Judge Verdict\n\n> ${ready.length} subscription brains (${ready.map((r) => r.name).join(', ')}) -> ${judgeAgent} judge. Zero API spend.\n\n---\n\n${jr.text}\n`;
    const p = writeFreeSynthesis(b.dir, md);
    log(`[triangle] synthesis -> ${p}`);
    return { dir: b.dir, ready: ready.map((r) => r.name), synthesized: true, synthesisPath: p, timedOut: poll.missing };
  }
  log(`[triangle] judge (${judgeAgent}) failed: ${jr.text}`);
  return { dir: b.dir, ready: ready.map((r) => r.name), synthesized: false, timedOut: poll.missing };
}

function parseArgs(argv) {
  const o = { agents: 'claude,gemini,codex' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--task') o.task = argv[++i];
    else if (k === '--context') o.context = argv[++i];
    else if (k === '--agents') o.agents = argv[++i];
    else if (k === '--run-id') o.runId = argv[++i];
    else if (k === '--poll-timeout-ms') o.pollTimeoutMs = Number(argv[++i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.task) { console.error('usage: node scripts/fusion-triangle.mjs --task "<question>" [--context ...] [--agents claude,gemini,codex] [--run-id slug] [--poll-timeout-ms N]'); process.exit(1); }
  const names = o.agents.split(',').map((s) => s.trim()).filter(Boolean);
  const cliAgents = names.filter((n) => AGENT_CMD[n]);
  const codexAgents = names.filter((n) => !AGENT_CMD[n]);
  const runId = o.runId || `triangle-${o.task.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
  const res = await runTriangle({ runId, task: o.task, context: o.context || '', cliAgents, codexAgents, pollTimeoutMs: o.pollTimeoutMs || 5 * 60_000 });
  console.log(`\n[triangle] done — synthesized=${res.synthesized} brains=[${res.ready.join(', ')}]${res.synthesisPath ? ` -> ${res.synthesisPath}` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('[triangle] fatal:', e.message); process.exit(1); });
}
