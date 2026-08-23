#!/usr/bin/env node

/**
 * consult-gemini-panel.mjs — Gemini 3.1 Pro as a hostile-review PANEL SEAT.
 * =========================================================================
 * WHY THIS EXISTS (and is not just consult-gemini.mjs):
 *   consult-gemini.mjs is the Lead Design Authority console. Its interface is
 *   `--review --file X` / `--ask "..."` — a different contract from the one
 *   consult-panel.mjs speaks (`--document / --out / --remit`). Rather than
 *   bend the design console into two shapes, this is a thin seat adapter that
 *   matches the panel contract exactly, the way consult-qwen.mjs does.
 *
 * WHY THE DIRECT GOOGLE API, NOT OPENROUTER:
 *   Sean's directive 2026-08-22: "Gemini 3.1 Pro — only use that one if it's
 *   via the API, I don't wanna be paying extra for that." Routing Gemini
 *   through OpenRouter would bill OpenRouter credits on top of an API key he
 *   already holds. This talks to generativelanguage.googleapis.com directly.
 *
 * MODEL ID comes from config/MODEL_VERSIONS.md (CLAUDE.md model-ID
 * discipline — never hard-code, never recall from memory).
 *
 * Usage:
 *   node scripts/consult-gemini-panel.mjs --document <path> [--out <path>]
 *     [--remit "<text>"] [--seed <path>] [--model <id>] [--max-tokens 20000]
 *     [--timeout-ms 900000]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModelId } from './lib/model-registry.mjs';
import { readForEgress, redactForEgress } from './lib/redact-egress.mjs';

// Repo root from THIS FILE's location, never process.cwd(). consult-panel.mjs spawns
// each seat as a child that inherits the panel's cwd, so a cwd-relative .env lookup
// makes this seat the only one that dies when the panel is run from a worktree or a
// subdirectory - and it dies with "no API key", which reads like a config problem
// rather than a path problem. Found 2026-08-22 by running this script from a foreign
// cwd. NOTE: scripts/consult-grok.mjs still uses `ROOT = process.cwd()` and has the
// same latent defect; not fixed here because this slice does not own that file.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };

const document = arg('--document');
const out = arg('--out', 'docs/ai-workflow/AI-HANDOFF/GEMINI-PANEL-REVIEW.md');
const remit = arg('--remit', '');
const seed = arg('--seed', '');
const maxTokens = Number(arg('--max-tokens', '20000'));
const timeoutMs = Number(arg('--timeout-ms', '900000'));

// Registry first, flag as override, and a loud failure if neither resolves —
// silently defaulting to some other Gemini is exactly the drift the registry exists to stop.
const model = arg('--model') || getModelId('gemini-31-pro');

if (!document) { console.error('[consult-gemini-panel] --document is required'); process.exit(1); }
if (!model) {
  console.error('[consult-gemini-panel] no model: registry key "gemini-31-pro" missing from config/MODEL_VERSIONS.md and no --model given.');
  process.exit(1);
}
if (String(model).startsWith('TODO: VERIFY_')) {
  console.error(`[consult-gemini-panel] registry entry "gemini-31-pro" is unverified (${model}). Verify against the provider before use.`);
  process.exit(1);
}
if (!Number.isFinite(maxTokens) || maxTokens <= 0) { console.error('--max-tokens must be positive'); process.exit(1); }
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) { console.error('--timeout-ms must be positive'); process.exit(1); }

/**
 * Resolve the key from the environment, falling back to .env.
 * The VALUE is never printed — only its presence and length (CLAUDE.md Rule 59:
 * a tool result that echoes a secret puts a fresh copy in chat context forever).
 */
function resolveKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (process.env.GOOGLE_AI_KEY) return process.env.GOOGLE_AI_KEY.trim();
  // Checks both locations, matching consult-grok.mjs. Splits on CR-optional newlines:
  // these .env files are CRLF, and a `(.+)$` match with the /m flag captures the
  // trailing CR, which would then be sent as part of the API key. A .trim() masks
  // that, but parsing it correctly is better than being saved by luck.
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(GEMINI_API_KEY|GOOGLE_AI_KEY)=(.*)$/);
      if (m) return m[2].replace(/^[\'"]|[\'"]$/g, '').trim();
    }
  }
  return null;
}

const apiKey = resolveKey();
if (!apiKey) {
  console.error('[consult-gemini-panel] no GEMINI_API_KEY / GOOGLE_AI_KEY in env or .env');
  process.exit(1);
}

// Create the output directory BEFORE the API call, not after. A bad --out path
// (missing parent, or a plain FILE sitting where a directory should be) would
// otherwise surface only once the response was already paid for and in hand,
// throwing the reply away after spending for it. Fail before you spend.
try {
  mkdirSync(dirname(out), { recursive: true });
} catch (e) {
  console.error(`[consult-gemini-panel] cannot create output dir for ${out}: ${e.code || e.message}`);
  process.exit(1);
}

const body = readForEgress(document, { label: 'document' });

// The SEED goes over the wire exactly like the document, so it gets exactly the
// same redaction. Three independent panel seats flagged 2026-08-23 that the
// document was passed through readForEgress while the seed was read raw — with
// redactForEgress imported and never called, which is the fossil of a half-applied
// change. A seed is typically prior session notes or a handoff, i.e. the file MOST
// likely to name a real person. Redacting the safer input and not the riskier one
// is worse than redacting neither, because the import makes the file read as
// protected. Egress protection is a property of the request, not of one argument.
// redactForEgress(text) takes ONE argument — no options object. Matches the
// existing call shape used by the sibling seat scripts.
const seedText = seed && existsSync(seed)
  ? redactForEgress(readFileSync(seed, 'utf8'))
  : '';

// The REMIT is operator free-text and goes over the wire exactly like the other two,
// so it gets the same treatment. Round 2 of the panel caught that fixing the seed
// left this third path raw — `--remit "review how <trainer> handled <client>'s
// complaint"` would have egressed names while the redaction imports above made the
// file read as fully protected. That is the same half-applied shape as the seed bug,
// one round later, which is the argument for redacting at the BOUNDARY rather than
// per-input: every string joined into `prompt` is egress, so every one is redacted.
const prompt = [
  remit && redactForEgress(remit),
  seedText && `## Prior context\n\n${seedText}`,
  '---',
  body,
].filter(Boolean).join('\n\n');

console.error(`[consult-gemini-panel] model=${model} doc=${document} chars=${body.length} key=present(${apiKey.length}ch) — direct Google API`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const started = Date.now();

try {
  // Key travels in a HEADER, never the URL. Two panel seats flagged 2026-08-23 that
  // `?key=${apiKey}` puts the secret into a string that leaks by default: proxy and
  // access logs, HAR captures, Node diagnostic channels, and `error.cause` URLs all
  // record the full URI. The local `.split(apiKey)` scrub only covers the two places
  // we hand-wrote — it cannot reach anything the runtime logs on its own. Google
  // supports x-goog-api-key; use the channel that is not designed to be recorded.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    }),
    signal: controller.signal,
  });

  if (!res.ok) {
    // Strip the key out of any echoed URL before it reaches stdout or a log file.
    // Collapse to ONE line before it escapes. consult-panel.mjs captures seat stderr
    // verbatim into INDEX.md's Failures list, and a raw multi-line JSON error body
    // shreds that markdown - INDEX is the coverage record, the artifact that says
    // which seats actually saw the document, so it must stay readable on the worst day.
    // The key is stripped regardless of shape: never let it reach stdout or an artifact.
    const raw = (await res.text()).split(apiKey).join('<REDACTED>')
      .replace(/\s+/g, ' ').trim().slice(0, 300);
    throw new Error(`Gemini responded ${res.status}: ${raw}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p?.text ?? '').join('');
  const finish = cand?.finishReason ?? '?';

  if (!text.trim()) {
    // Three distinct causes that all present as "no text". Naming the wrong one
    // sends the operator down a remediation that cannot work:
    //  - MAX_TOKENS: reasoning ate the output budget (the DeepSeek failure mode)
    //  - promptFeedback.blockReason: the API refused the PROMPT outright. There is
    //    no `candidates` array at all, so finishReason reads '?' and the old code
    //    reported a generic empty response — the operator then raises --max-tokens
    //    and retries into the same block forever. Flagged by a panel seat 2026-08-23.
    //  - anything else: report the raw finishReason rather than guessing.
    const block = data?.promptFeedback?.blockReason;
    const why = block
      ? `PROMPT BLOCKED by the API (blockReason=${block}). Raising --max-tokens will NOT help — the request never ran. Rewrite or narrow the packet.`
      : finish === 'MAX_TOKENS'
        ? `hit maxOutputTokens (${maxTokens}) before emitting visible text — raise --max-tokens`
        : `empty response (finishReason=${finish})`;
    throw new Error(why);
  }

  const u = data.usageMetadata ?? {};
  const wall = ((Date.now() - started) / 1000).toFixed(1);
  const truncated = finish === 'MAX_TOKENS';

  // The blank lines here are STRUCTURAL, not decoration. `.filter(l => l !== '')`
  // was meant to drop the empty truncated-branch but nuked every separator with it,
  // so `**Tokens:** …` ended up adjacent to `---` and markdown parsed that pair as a
  // setext H2 — the metadata line silently became a heading and the rule vanished.
  // Two panel seats caught it 2026-08-23; the literal `\n` welded onto the truncated
  // warning is the fossil of someone half-noticing. Build the optional line
  // conditionally instead of filtering the whole array.
  const header = [
    '# Gemini Panel Review',
    '',
    `**Model:** \`${model}\` via direct Google API (not OpenRouter)`,
    `**Document:** ${document}`,
    `**Tokens:** ${u.promptTokenCount ?? '?'} in / ${u.candidatesTokenCount ?? '?'} out | **Wall:** ${wall}s | **finishReason:** ${finish}`,
    '',
    ...(truncated
      ? ['> ⚠ **TRUNCATED** — hit maxOutputTokens. The tail is NOT a finished thought.', '']
      : []),
    '---',
    '',
  ].join('\n');

  writeFileSync(out, `${header}\n${text}\n`, 'utf8');
  console.error(`[consult-gemini-panel] done ${u.promptTokenCount ?? '?'}in/${u.candidatesTokenCount ?? '?'}out wall=${wall}s finish=${finish}`);
  console.error(`[consult-gemini-panel] saved=${out}`);
  if (truncated) console.error('[consult-gemini-panel] ⚠ TRUNCATED — reply incomplete.');
} catch (error) {
  const msg = error.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : error.message;
  console.error(`[consult-gemini-panel] ${String(msg).split(apiKey).join('<REDACTED>')}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
