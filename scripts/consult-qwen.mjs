#!/usr/bin/env node

/**
 * consult-qwen.mjs — single-document consult against the LOCAL Qwen 3.8 on
 * Sean's RTX 5090 via Ollama. $0, fully private (nothing leaves the machine),
 * no spend gate. Sean's standing directive 2026-08-17: Qwen 3.8 joins every
 * hostile-review panel as the FREE third voice alongside GLM + Kimi — never
 * the lead reviewer, always worth hearing.
 *
 * Usage:
 *   node scripts/consult-qwen.mjs --document <path> [--out <path>] [--remit "<text>"]
 *     [--model qwen3.8:27b-mtp-q4_K_M] [--endpoint http://127.0.0.1:11434]
 *     [--max-tokens 16000] [--timeout-ms 900000]
 *
 * VRAM note: the 27B q4 holds ~17GB resident (keep_alive). Fine beside one
 * mid model; do NOT run while an Unsloth training run needs the card — the
 * ai-agent-tuning launcher preflight owns that rule.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };

const document = arg('--document');
const out = arg('--out', 'docs/ai-workflow/AI-HANDOFF/QWEN-CONSULT.md');
const remit = arg('--remit', '');
const model = arg('--model', 'qwen3.8:27b-mtp-q4_K_M');
const endpoint = arg('--endpoint', 'http://127.0.0.1:11434');
const maxTokens = Number(arg('--max-tokens', '16000'));
const timeoutMs = Number(arg('--timeout-ms', '900000'));

if (!document) { console.error('--document is required'); process.exit(1); }
if (!Number.isFinite(maxTokens) || maxTokens <= 0) { console.error('--max-tokens must be a positive number'); process.exit(1); }
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) { console.error('--timeout-ms must be a positive number'); process.exit(1); }

const body = readFileSync(document, 'utf8');
const prompt = remit ? `${remit}\n\n---\n\n${body}` : body;

console.error(`[consult-qwen] model=${model} doc=${document} chars=${body.length} (local Ollama, $0)`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const started = Date.now();

try {
  const res = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      // Qwen 3.8 is hybrid-reasoning: without think:false it burns the whole
      // num_predict on hidden thinking and returns empty content (observed
      // live 2026-08-17). Consults need answers, not hidden reasoning.
      think: false,
      options: { num_predict: maxTokens, temperature: 0.4 },
    }),
    signal: controller.signal,
  });
  if (!res.ok) throw new Error(`Ollama responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = String(data?.message?.content ?? '');
  if (!text.trim()) throw new Error('empty response — model may have burned num_predict on reasoning; raise --max-tokens');
  const wall = ((Date.now() - started) / 1000).toFixed(1);
  const header = [
    '# Qwen Consult (LOCAL)',
    '',
    `**Model:** \`${model}\` via Ollama (5090, $0, private)`,
    `**Document:** ${document}`,
    `**Tokens (Ollama):** ${data.prompt_eval_count ?? '?'} in / ${data.eval_count ?? '?'} out | **Wall:** ${wall}s | **done_reason:** ${data.done_reason ?? '?'}`,
    '',
    '---',
    '',
  ].join('\n');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, header + text + '\n', 'utf8');
  console.error(`[consult-qwen] done tokens=${data.prompt_eval_count ?? '?'}in/${data.eval_count ?? '?'}out wall=${wall}s`);
  console.error(`[consult-qwen] saved=${out}`);
} catch (error) {
  console.error(`[consult-qwen] ${error.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : error.message}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
