/**
 * consult-hive.mjs — one command, many review seats (the "hive mind" harness).
 *
 * Usage:
 *   node scripts/consult-hive.mjs --seat astra|qwen|gemini|glm|kimi --prompt-file <md> --files A,B,C --out <md> [--model <openrouter/id>] [--max-chars 60000]
 *
 * Routes a single hostile-review prompt + concatenated files to the seat's
 * OpenRouter model. Loads .env in-process (never echoes the key — Rule 59).
 * Single call per invocation; no retries (spend discipline). Costs are
 * metered by OpenRouter — keep --max-chars sane.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SEATS = {
  astra: 'openai/gpt-5.5',
  qwen: 'qwen/qwen3.8-max-0902',
  gemini: 'google/gemini-2.5-pro',
  glm: 'z-ai/glm-4.6',
  kimi: 'moonshotai/kimi-k2',
};

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : (i !== -1 ? true : fallback);
}

const seat = arg('seat');
const promptFile = arg('prompt-file');
const out = arg('out');
const files = (arg('files') || '').split(',').filter(Boolean);
const maxChars = Number(arg('max-chars', '60000'));
if (!seat || !SEATS[seat] || !promptFile || !out) {
  console.error('usage: node scripts/consult-hive.mjs --seat astra|qwen|gemini|glm|kimi --prompt-file <md> --out <md> [--files A,B] [--max-chars N]');
  process.exit(2);
}
const model = arg('model', SEATS[seat]);

// Load .env in-process (CRLF-safe; Rule 20/59 — value goes to env, never stdout)
// Worktrees of the main clone share its .env; fall back to it (presence only).
const envCandidates = [join(ROOT, '.env'), join(ROOT, 'backend', '.env'),
  'C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/.env'];
for (const envPath of envCandidates) {
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.error('[consult-hive] OPENROUTER_API_KEY missing'); process.exit(3); }

let body = readFileSync(promptFile, 'utf-8');
if (files.length) {
  body += '\n\n---\n\n# Attached source files\n';
  for (const f of files) {
    const p = join(ROOT, f);
    if (!existsSync(p)) { console.error('[consult-hive] missing file: ' + f); process.exit(2); }
    let content = readFileSync(p, 'utf-8');
    if (content.length > maxChars) content = content.slice(0, maxChars) + '\n…[truncated]';
    body += `\n\n## ${f}\n\n${content}`;
  }
}

console.log(`[consult-hive] seat=${seat} model=${model} prompt=${body.length} chars (files: ${files.length})`);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://sswanstudios.com',
    'X-Title': 'SwanStudios hive review',
  },
  body: JSON.stringify({
    model,
    max_tokens: Number(arg('max-tokens', '8000')),
    messages: [
      { role: 'system', content: 'You are a hostile senior reviewer on the SwanStudios multi-model review hive. Evidence only: file:line + quoted code. Separate REAL DEFECT from UPGRADE SUGGESTION. Rank upgrades by value.' },
      { role: 'user', content: body },
    ],
  }),
});
if (!res.ok) {
  console.error(`[consult-hive] HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(1);
}
const data = await res.json();
const reply = data?.choices?.[0]?.message?.content ?? '';
if (!reply) { console.error('[consult-hive] empty reply: ' + JSON.stringify(data).slice(0, 300)); process.exit(1); }
writeFileSync(out, `<!-- consult-hive seat=${seat} model=${model} -->\n` + reply);
console.log(`[consult-hive] wrote ${out} (${reply.length} chars, usage: ${JSON.stringify(data?.usage ?? {})})`);
