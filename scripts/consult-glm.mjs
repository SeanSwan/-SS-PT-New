#!/usr/bin/env node
/**
 * consult-glm.mjs -- single-document consult against Z.ai GLM.
 * Mirrors the consult-kimi.mjs shape. Subscription-billed (no per-token cost),
 * so no spend gate -- but it DOES consume the coding-plan credit budget.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

const document = arg('--document');
const out = arg('--out', 'docs/ai-workflow/AI-HANDOFF/GLM-CONSULT.md');
const remit = arg('--remit', '');
const model = arg('--model', 'glm-5.3');
const maxTokens = Number(arg('--max-tokens', '32000'));

if (!document) { console.error('--document is required'); process.exit(1); }

const key = process.env.ZAI_API_KEY;
if (!key) { console.error('ZAI_API_KEY not set'); process.exit(1); }

const body = readFileSync(document, 'utf8');
const prompt = remit ? `${remit}\n\n---\n\n${body}` : body;

console.log(`[consult-glm] model=${model} doc=${document} chars=${prompt.length}`);
const started = Date.now();

// STREAMING is required, not optional: GLM-5.3 is a reasoning model that can
// think for many minutes before emitting its first token. Node's fetch aborts
// with UND_ERR_HEADERS_TIMEOUT after ~300s of waiting for response headers.
// Streaming returns headers immediately, so the clock never starts.
const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  }),
});

if (!res.ok) {
  console.error(`[consult-glm] HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}

let content = '';
let u = {};
let buffer = '';
let lastTick = Date.now();

const decoder = new TextDecoder();
for await (const chunk of res.body) {
  buffer += decoder.decode(chunk, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const payload = t.slice(5).trim();
    if (payload === '[DONE]') continue;
    try {
      const j = JSON.parse(payload);
      const delta = j.choices?.[0]?.delta?.content;
      if (delta) content += delta;
      if (j.usage) u = j.usage;
    } catch { /* partial frame, ignore */ }
  }
  if (Date.now() - lastTick > 20000) {
    process.stdout.write(`[consult-glm] streaming... ${content.length} chars\n`);
    lastTick = Date.now();
  }
}

if (!content) content = '(empty)';
const wall = ((Date.now() - started) / 1000).toFixed(1);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `# GLM Consult

**Model:** ${model}
**Document:** ${document}
**Tokens:** ${u.prompt_tokens} in / ${u.completion_tokens} out (reasoning: ${u.completion_tokens_details?.reasoning_tokens ?? 'n/a'}) | total ${u.total_tokens}
**Wall:** ${wall}s

---

${content}
`, 'utf8');

console.log(`[consult-glm] done tokens=${u.prompt_tokens}in/${u.completion_tokens}out total=${u.total_tokens} reasoning=${u.completion_tokens_details?.reasoning_tokens ?? 'n/a'} wall=${wall}s`);
console.log(`[consult-glm] saved=${out}`);
