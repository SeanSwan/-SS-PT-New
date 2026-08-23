# Hostile review — ALL WORK THIS SESSION (2026-08-23)

Six seats. Eleven prior rounds covered the drift-check classifier ONLY. **This round covers
everything else built this session, which no seat has reviewed as a whole.**

All files below are COMPLETE. Nothing elided.

## What was built

1. **Panel roster** — Ox Alpha (stealth, free) and Gemini 3.1 Pro seats added; Fable/Sol/Ox made
   `premium` (opt-in, excluded from default roster). TWO gate axes: `paid` = money (--confirm-spend),
   `premium` = must be named. Ox is $0 but an undisclosed provider RETAINS prompts, so it is gated on DATA.
2. **Attribution fix** — consult-grok.mjs is a shared transport for 4 seats; four strings hard-coded
   "Grok 4.6", so 3 seats filed reviews under a 4th seat name AND the default remit told them they WERE Grok.
3. **Gemini seat adapter** — direct Google API (not OpenRouter), key in x-goog-api-key header,
   document+seed+remit all redacted for egress.
4. **drift-check check 7** — registered hooks whose files do not exist. 11 rounds, ~43 defects.
5. **Two property fuzzers** — over the classifier and over the audit walk.

## Attack these

- Is the two-axis gate (`paid` vs `premium`) actually coherent, or does some path still conflate them?
- Can a document still reach an external provider when the operator believes it will not?
- Is egress redaction COMPLETE in consult-gemini-panel.mjs — every string that reaches the wire?
- Do the fuzzers actually prove what they claim, or do their properties have holes?
- Any defect in the seat registry itself (pricing, args, env, labels)?
- **If you find nothing, say so plainly. Do not invent filler.**

## FILE: scripts/lib/panel-seats.mjs (COMPLETE)

```javascript
/**
 * panel-seats.mjs — the seat registry for consult-panel.mjs.
 * ==========================================================
 * Extracted from consult-panel.mjs 2026-08-21 to keep that file under the
 * 300-line cap (CLAUDE.md Rule 4) when the two DeepSeek V4 seats were added.
 * This is the roster; consult-panel.mjs is the orchestration.
 *
 * Pricing per 1M tokens, OpenRouter catalog re-verified 2026-08-21 via
 *   curl -s https://openrouter.ai/api/v1/models
 * Free seats are 0/0 so the estimator needs no special-casing.
 *
 * Fable has TWO distinct roles and they must not be confused:
 *   1. FINAL DECIDER (unchanged, primary) — reads every reply below and arbitrates.
 *      Run it separately via scripts/consult-fable.mjs AFTER the panel returns.
 *      This is the role CLAUDE.md's Co-Orchestrator Hierarchy + Rule 46 describe.
 *   2. PANEL SEAT (added 2026-08-22 by Sean's directive) — reviews the document
 *      blind, alongside the others, contributing one opinion among many.
 * These are NOT the same thing. A seat-Fable has not seen the other replies, so its
 * output is a PEER REVIEW, not a ruling, and must never be reported as an arbitration.
 * If you want a verdict, run the Final-Decider pass separately.
 *
 * PREMIUM SEATS (`premium: true`) - Fable 5 and GPT-5.6 Sol Pro. Sean's directive
 * 2026-08-22: "ask me each and every time if I want Fable and ChatGPT in it since
 * they're the most expensive ones, and I can say yes or no, or choose one or the
 * other." They are therefore NOT in the default roster - they can only run when
 * named explicitly AND --confirm-spend is passed. consult-panel.mjs still prints
 * what each WOULD cost on every run, so the choice is always informed and never
 * requires guessing or a separate dry-run to price.
 *
 * DeepSeek seats ride consult-grok.mjs (it is a generic OpenRouter streaming
 * client with a SWAN_GROK_MODEL override) rather than getting copy-pasted
 * siblings — one transport, one streaming/idle-watchdog/truncation-guard
 * implementation to keep correct. The 2026-08-21 incident that motivated the
 * 48k default max_tokens was a DeepSeek run: reasoning models spend output
 * budget on hidden thinking, and V4 Flash burned all 16k on reasoning and
 * emitted an EMPTY reply for $0.10. Do not lower the ceiling for these seats.
 */

/** @param {string} remit shared hostile-review remit, injected into every seat's argv. */
export function buildSeats(remit) {
  return {
    sol: {
      label: 'GPT-5.6 Sol Pro', script: 'consult-sol.mjs', paid: true, premium: true,
      inPerM: 2.5, outPerM: 15, out: 'SOL-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // consult-sol.mjs defaults to plain `gpt-5.6-sol`. Sol PRO is the same
      // weights at the SAME price with reasoning.mode=pro, so there is no reason
      // to review on the weaker tier — pin it explicitly for this seat.
      env: { SWAN_SOL_MODEL: 'openai/gpt-5.6-sol-pro' },
      note: 'reasoning.mode=pro, 1.05M ctx',
    },
    kimi: {
      label: 'Kimi K3', script: 'consult-kimi.mjs', paid: true,
      inPerM: 3, outPerM: 15, out: 'KIMI-PANEL-REVIEW.md',
      args: (doc, out) => [
        '--document', doc, '--out', out, '--remit', remit, '--effort', 'high',
        '--max-tokens', '20000', '--cap-usd', '0.40', '--confirm-spend',
      ],
      note: '20k output ceiling; $0.40 hard cap; ONE review per topic',
    },
    glm: {
      label: 'GLM 5.3', script: 'consult-glm.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'GLM-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--model', 'glm-5.3'],
      note: 'Z.ai subscription — no per-token cost, burns coding-plan credit',
    },
    qwen: {
      label: 'Qwen 3.8 (local)', script: 'consult-qwen.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'QWEN-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit],
      note: 'local 5090 via Ollama — $0, fully private, never the lead voice',
    },
    gemini: {
      label: 'Gemini 3.1 Pro', script: 'consult-gemini-panel.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'GEMINI-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--max-tokens', '20000'],
      // paid:false because this rides Sean's OWN Google API key, NOT OpenRouter credits
      // (his directive 2026-08-22: "only via the API, I don't wanna be paying extra").
      // That makes it $0 against the panel's OpenRouter wallet, which is what the spend
      // gate protects — it does NOT mean Google bills nothing. The seat prints real token
      // counts every run so actual usage stays visible rather than assumed.
      note: 'direct Google API (not OpenRouter) — $0 OpenRouter cost; Google-side usage still metered',
    },
    grok: {
      label: 'Grok 4.6', script: 'consult-grok.mjs', paid: true,
      inPerM: 2, outPerM: 6, out: 'GROK-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // PIN THE MODEL EXPLICITLY. consult-grok.mjs falls back to `process.env
      // .SWAN_GROK_MODEL || 'x-ai/grok-4.6'`, and the child inherits the parent
      // environment — so an operator shell carrying SWAN_GROK_MODEL from an earlier
      // manual run would make THIS seat file a different model's review under
      // GROK-PANEL-REVIEW.md, priced at Grok's rates. That is exactly the
      // misattribution class the 2026-08-22 fix eliminated, re-entering ambiently
      // through the environment instead of through a hard-coded string. Every other
      // seat on this transport pins its model; grok was the only one relying on the
      // default. Found by two independent panel seats 2026-08-23.
      env: { SWAN_GROK_MODEL: 'x-ai/grok-4.6' },
      note: 'x-ai/grok-4.6 via OpenRouter — rule-12 repeal (PR #54); model pinned, not inherited',
    },
    dspro: {
      label: 'DeepSeek V4 Pro', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.48, outPerM: 0.96, out: 'DEEPSEEK-PRO-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-pro' },
      note: 'deepseek/deepseek-v4-pro via consult-grok transport',
    },
    ox: {
      label: 'Ox Alpha', script: 'consult-grok.mjs', paid: false, premium: true,
      inPerM: 0, outPerM: 0, out: 'OX-ALPHA-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'stealth/ox-alpha' },
      // premium:true despite paid:false — the gate axis here is DATA, not money.
      // Two panel seats independently flagged 2026-08-23 that ox shipped in the
      // DEFAULT roster while its own note says prompts are RETAINED by an
      // undisclosed provider. Fable and Sol require deliberate opt-in because they
      // cost dollars; ox costs disclosure to an unidentified party, which is the
      // less reversible of the two — and it was the one defaulted ON. Money got
      // opt-in, data got opt-out. `premium` removes it from the default roster, so
      // reaching a stealth provider now takes an explicit `--seats ...,ox`.
      // Free BECAUSE it is a stealth listing: an unnamed lab is evaluating the
      // model and OpenRouter's stealth terms mean prompts are retained and seen
      // by that provider. Zero dollars, NON-zero privacy cost. Only send it
      // packets that are already scrubbed to the standard we would use for any
      // vendor — never raw config, transcripts, or anything with PII.
      // 1.05M ctx / 131k max output, added 2026-08-22 by Sean's directive.
      note: 'stealth/ox-alpha — $0 but prompts are RETAINED by an undisclosed provider',
    },
    fable: {
      label: 'Fable 5', script: 'consult-fable.mjs', paid: true, premium: true,
      inPerM: 10, outPerM: 50, out: 'FABLE-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit],
      // BY FAR the most expensive seat — ~5x Kimi/Sol per token and ~340x dsflash.
      // paid:true means the spend gate skips it unless --confirm-spend is passed, so it
      // appears in the printed estimate on EVERY run but never bills without an explicit yes.
      // Seat-Fable is a PEER review, not a ruling — see the two-roles note at the top.
      note: 'PEER seat, not a ruling. $10/$50 per M — the priciest seat; gated behind --confirm-spend',
    },
    dsflash: {
      label: 'DeepSeek V4 Flash', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.073, outPerM: 0.145, out: 'DEEPSEEK-FLASH-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-flash' },
      note: 'cheapest paid seat; watch for empty replies (reasoning eats output budget)',
    },
    hy3: {
      label: 'HY3 (Tencent)', script: 'consult-hy3-design.mjs', paid: true,
      inPerM: 0.13, outPerM: 0.53, out: 'HY3-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // Added 2026-08-23 by Sean's directive. Slug + pricing verified live against the
      // OpenRouter catalog the same day (tencent/hy3, $0.13/$0.53 per M). It already had
      // a standalone script speaking the panel contract; it was simply never seated.
      //
      // CONTEXT IS 262k, NOT 1M like the other seats. That is the one thing to watch:
      // a packet the 1M seats swallow whole can overflow this one, and an overflow is
      // not a truncated review — it is a review of a different, shorter document, which
      // reads exactly like a real reply. Keep packets well inside the window.
      note: 'tencent/hy3 — cheap; 262k ctx (SMALLER than the other seats — watch packet size)',
    },
  };
}

```

## FILE: scripts/consult-gemini-panel.mjs (COMPLETE)

```javascript
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

// Presence only — NOT the length. A panel seat flagged that printing `(39ch)` is a
// small but free gift to anyone reading logs: it fixes the key's exact size and so
// narrows the search space. Presence is the only fact this line needs to convey.
console.error(`[consult-gemini-panel] model=${model} doc=${document} chars=${body.length} key=present — direct Google API`);

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

```

## FILE: scripts/hooks/drift-check-gate.fuzz.mjs (COMPLETE)

```javascript
#!/usr/bin/env node
/**
 * drift-check-gate.fuzz.mjs — property-based round on check 7's classifier.
 * =========================================================================
 * WHY A FUZZER, AFTER NINE PANEL ROUNDS: every round so far was the same vantage —
 * a model reading the file. That found ~43 real defects, but the last two lived
 * INSIDE the previous round's fix, which is a loop feeding itself. Reading cannot
 * escape it. This round changes the instrument.
 *
 * A reader checks cases it thought of. A fuzzer checks PROPERTIES over inputs nobody
 * thought of — which is the only way to attack a bug class whose signature is
 * "some input we did not consider falls through".
 *
 * THE THREE PROPERTIES, each mapping to a failure this loop actually shipped:
 *
 *   P1 TOTALITY      every input yields exactly one of OK|MISSING|UNVERIFIED.
 *                    Rounds 1-5 each shipped an input that yielded nothing, and
 *                    nothing is byte-identical to "checked and healthy".
 *
 *   P2 NO-PHANTOM    MISSING implies the asserted path is genuinely not a file.
 *                    Rounds 2,3,7,9 each reported a healthy registration missing.
 *                    A phantom trains the operator to ignore the gate, which
 *                    restores the original outage by consent.
 *
 *   P3 NO-FALSE-OK   OK implies the asserted path IS a file on disk. Round 9 found
 *                    a command that split to an existing file and returned OK while
 *                    the shell would have failed to exec the real token.
 *
 * Deterministic by seed so a failure is reproducible: `--seed 12345`.
 * Run: node scripts/hooks/drift-check-gate.fuzz.mjs [--iterations N] [--seed S]
 */
import { statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCommand } from '../lib/hook-registration.mjs';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const ITERATIONS = Number(arg('--iterations', '20000'));
const SEED = Number(arg('--seed', '1'));

/** xorshift32 — deterministic, so any failure reproduces from its seed alone. */
let state = SEED >>> 0 || 1;
const rnd = () => {
  state ^= state << 13; state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5; state >>>= 0;
  return state / 0x100000000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const maybe = (p) => rnd() < p;

// A real sandbox: some of these files exist, some do not. The properties below are
// checked against the ACTUAL filesystem, not against expectations.
const root = mkdtempSync(join(tmpdir(), 'hookfuzz-'));
mkdirSync(join(root, 'hooks'), { recursive: true });
mkdirSync(join(root, 'nested', 'deep'), { recursive: true });
writeFileSync(join(root, 'hooks', 'present.mjs'), '// real\n');
writeFileSync(join(root, 'nested', 'deep', 'also.sh'), '# real\n');
mkdirSync(join(root, 'hooks', 'dir-named.mjs'), { recursive: true }); // a DIRECTORY

const INTERPRETERS = ['node', 'npx', 'bash', 'sh', 'python3', 'node --enable-source-maps', ''];
const PATHS = [
  'hooks/present.mjs', './hooks/present.mjs', 'nested/deep/also.sh',
  'hooks/absent.mjs', './hooks/absent.mjs', 'hooks/dir-named.mjs',
  'hooks/present', 'hooks/present.MJS', 'nested/../hooks/present.mjs',
  '/abs/hooks/x.mjs', 'C:/abs/hooks/x.mjs', '../outside/x.mjs',
  'hooks/pre load.mjs', 'hooks/a.mjs:b.mjs', 'FOO=x.mjs',
];
const FLAGS = ['', '--flag', '-r ./hooks/present.mjs', '--import=./hooks/present.mjs',
  '--emit out.mjs', '--ref nested/deep/also.sh', '-e'];
const NOISE = ['', ';echo hi', ' && node b.mjs', ' | tee log', ' # comment',
  ' $VAR', ' ${VAR}', ' %VAR%', ' ~/x', ' *.mjs', ' `id`', ' (sub)'];
const WEIRD_WS = ['', '\u00A0', '\u000B', '\u000C', '\r', '\u2003', '\u3000'];
const QUOTES = ['', '"', "'"];

/**
 * Generate one command.
 *
 * The FIRST version of this generator appended shell noise on nearly every draw, so a
 * 20k run produced 19,896 UNVERIFIED against 39 OK and 65 MISSING — it reported "all
 * properties held" while barely exercising the two properties that matter (P2 and P3
 * only have teeth on the assert path). A fuzzer that green-lights a corpus it never
 * drove is the same silence-looks-like-success failure this module exists to kill,
 * relocated into the instrument.
 *
 * So the corpus is now deliberately WEIGHTED: roughly half plain commands that reach
 * the assert path, half adversarial. The verdict histogram is printed and a run that
 * fails to produce both OK and MISSING declares its own coverage incomplete.
 */
function generate() {
  if (maybe(0.02)) return pick([undefined, null, '', '   ', 42, {}, []]);

  // ~55%: plain, assertable — these are what drive P2 and P3.
  if (maybe(0.55)) {
    const parts = [pick(['node', 'npx', 'bash', 'node --enable-source-maps']), pick(PATHS)];
    if (maybe(0.25)) parts.push('--flag');
    return parts.join(' ');
  }

  // ~45%: adversarial — quoting, weird whitespace, flags, shell noise.
  const q = pick(QUOTES);
  let p = pick(PATHS);
  if (maybe(0.25)) {
    const w = pick(WEIRD_WS);
    if (w) p = p.slice(0, 3) + w + p.slice(3);
  }
  if (q) p = q + p + q;
  const parts = [pick(INTERPRETERS), pick(FLAGS), p].filter(Boolean);
  if (maybe(0.3)) parts.push(pick(FLAGS));
  return parts.join(' ') + pick(NOISE);
}

const KINDS = ['OK', 'MISSING', 'UNVERIFIED'];
const isFile = (rel) => { try { return statSync(resolve(root, rel)).isFile(); } catch { return false; } };

const failures = [];
const record = (prop, cmd, detail) => {
  if (failures.length < 12) failures.push({ prop, cmd, detail });
};

const counts = { OK: 0, MISSING: 0, UNVERIFIED: 0 };

for (let i = 0; i < ITERATIONS; i += 1) {
  const cmd = generate();
  let v;
  try {
    v = classifyCommand(cmd, root);
  } catch (e) {
    record('P1 TOTALITY (threw)', cmd, e?.message || String(e));
    continue;
  }

  // P1 — exactly one legal verdict, always.
  if (!v || !KINDS.includes(v.kind)) {
    record('P1 TOTALITY', cmd, `verdict=${JSON.stringify(v)}`);
    continue;
  }
  counts[v.kind] += 1;

  // P2 — MISSING must name a path that genuinely is not a file. Any MISSING on a
  // real file is a phantom in the loud path.
  if (v.kind === 'MISSING') {
    if (typeof v.path !== 'string' || !v.path) {
      record('P2 NO-PHANTOM (no path)', cmd, `verdict=${JSON.stringify(v)}`);
    } else if (isFile(v.path)) {
      record('P2 NO-PHANTOM', cmd, `reported MISSING but ${v.path} IS a file`);
    }
  }

  // P3 — OK must name a path that IS a file. An OK on a non-file is a false clean,
  // which is the outage this whole module exists to prevent.
  if (v.kind === 'OK') {
    if (typeof v.key !== 'string' || !isFile(v.key)) {
      record('P3 NO-FALSE-OK', cmd, `returned OK but ${v.key} is not a file`);
    }
  }
}

rmSync(root, { recursive: true, force: true });

console.log(`  seed=${SEED}  iterations=${ITERATIONS}`);
console.log(`  verdicts: OK=${counts.OK}  MISSING=${counts.MISSING}  UNVERIFIED=${counts.UNVERIFIED}`);
if (!counts.OK || !counts.MISSING) {
  // A run that never produced an OK or a MISSING proved nothing about P2/P3 — the
  // corpus degenerated. Say so rather than reporting a green that covered nothing.
  console.log('  ⚠ corpus did not exercise both OK and MISSING — P2/P3 coverage is incomplete');
}
if (failures.length) {
  console.log(`\n  ${failures.length} PROPERTY VIOLATION(S):`);
  for (const f of failures) console.log(`    ${f.prop}\n      cmd:    ${JSON.stringify(f.cmd)}\n      detail: ${f.detail}`);
  process.exit(1);
}
console.log('\n  all properties held');
process.exit(0);

```
