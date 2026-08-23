# Hostile review ROUND 2 — the FIXES are the target (2026-08-23)

Round 1 (5 seats) found 8 defects. All were fixed. **This round reviews the FIXES.**
A fix is the most likely place for the next bug. Do not re-report round-1 issues as if unfixed —
instead ask: did the fix actually close it, did it open something new, is it complete?

## What round 1 found and how it was fixed

1. `mode=DRY-RUN` printed while free seats ran -> label now describes the SPEND gate only.
2. `ox` (retains prompts) was default-on -> now `premium: true`, requires explicit naming.
3. `grok` seat did not pin SWAN_GROK_MODEL -> now pinned.
4. seed reached Gemini unredacted -> now `redactForEgress`.
5. API key in URL -> now `x-goog-api-key` header.
6. check-7 PATH_RE missed bare names and .cjs/.ts -> anchored on extension.
7. check-7 catch was silent -> now reports that it could not run.
8. header blank lines filtered away -> built conditionally.

## Attack these specifically

- Does the new PATH_RE over-match? False POSITIVES are also a failure (a phantom finding trains operators to ignore the gate).
- Is `premium` now overloaded (money AND data)? Does any code path still treat it as money-only?
- Does the mode label mislead in any remaining case?
- Is redaction now complete across every egress path in these files?

## FILE: scripts/consult-gemini-panel.mjs

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

const prompt = [remit, seedText && `## Prior context\n\n${seedText}`, '---', body]
  .filter(Boolean).join('\n\n');

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

```

## FILE: scripts/hooks/drift-check-gate.mjs (check 7)

```javascript
// SCOPE OF THE MATCHER — hardened 2026-08-23 after three panel seats independently
// found that the first version could report clean while a guard was missing:
//   - it required the path to contain `scripts/` or `.claude/`, so a bare
//     `node lane-session-start.mjs` (literally the file from the incident) matched
//     nothing and the check went silent;
//   - it accepted only .mjs/.js/.sh/.ps1/.py, so renaming a hook to .cjs or .ts
//     reproduced the whole 2026-08-22 outage with a one-character change.
// A completeness checker with unenumerated blind spots is worse than a manual
// checklist, because its "clean" launders confidence. Match any token that looks
// like a script path, anchored on the EXTENSION rather than on a directory prefix.
try {
  const PATH_RE = /(?<![\w./\\-])[A-Za-z0-9_.][A-Za-z0-9_./\\-]*\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)(?![\w-])/g;
  // Tokens that are not repo files: package bins, npm/npx targets, URLs.
  const NOT_A_FILE = /^(?:https?:|npm$|npx$|node$|bash$|sh$|python3?$)/;
  const missing = [];
  const unreadable = [];

  for (const name of ['settings.json', 'settings.local.json']) {
    const cfgPath = join(SS_PT, '.claude', name);
    const raw = read(cfgPath);
    if (raw === null) continue;              // absent is legitimate — settings.local.json is optional

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      // Not fail-open: a settings file the harness cannot parse runs NO hooks at all.
      unreadable.push(name);
      continue;
    }

    const seen = new Set();
    // Defensive iteration: a malformed hooks block (an object where an array is
    // expected, a null group) must not throw. The outer catch would swallow it and
    // the check would go silent — the precise pathology this check exists to kill.
    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      for (const group of Array.isArray(groups) ? groups : []) {
        for (const hook of Array.isArray(group?.hooks) ? group.hooks : []) {
          for (const m of String(hook?.command || '').matchAll(PATH_RE)) {
            const rel = m[0].replace(/\\/g, '/');
            if (NOT_A_FILE.test(rel)) continue;
            const key = `${event}:${rel}`;
            if (seen.has(key)) continue;
            seen.add(key);
            // Absolute paths are used as-is; repo-relative ones resolve from SS_PT.
            const abs = /^(?:[A-Za-z]:|\/)/.test(rel) ? rel : join(SS_PT, rel);
            if (!existsSync(abs)) missing.push(`${rel} (${event}, ${name})`);
          }
        }
      }
    }
  }

  if (unreadable.length) {
    findings.push(
      `.claude/${unreadable.join(' and ')} is not valid JSON — the harness runs NONE of the ` +
      'hooks it declares. Every gate those files register is silently inactive right now.'
    );
  }
  if (missing.length) {
    findings.push(
      `${missing.length} registered hook file(s) DO NOT EXIST: ${missing.join('; ')}. ` +
      'A hook the harness cannot find emits nothing, which is indistinguishable from a ' +
      'hook that ran and found no problems — so this protection is off and reads as on. ' +
      'Restore the file(s) or remove the registration; do not leave a phantom guard.'
    );
  }
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. The first version swallowed its own errors and
  // emitted nothing — which is byte-identical to "no phantom guards found", i.e. the
  // exact ambiguity this check's own header lectures about. Two panel seats caught
  // the hypocrisy 2026-08-23. A guard that cannot run must SAY it could not run;
  // it still must not block session start.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

// ---- Emit: silent when clean ----------------------------------------------

```

## FILE: scripts/lib/panel-seats.mjs

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
  };
}

```

## FILE: scripts/consult-panel.mjs (gate + estimate region)

```javascript
if (!documentPath) {
  console.error('usage: node scripts/consult-panel.mjs --document <path> [--seed <path>] [--seats kimi,glm,qwen,gemini,grok,dspro,dsflash] [+opt-in: ox,fable,sol] [--confirm-spend]');
  process.exit(1);
}
if (!existsSync(documentPath)) {
  console.error(`document not found: ${documentPath}`);
  process.exit(1);
}

const remit = arg('--remit', DEFAULT_REMIT);

// Seat roster + pricing live in ./lib/panel-seats.mjs (extracted 2026-08-21
// when the two DeepSeek V4 seats pushed this file past the 300-line cap).
const SEATS = buildSeats(remit);

// An EMPTY seat list is an error, not a no-op. `--seats ""` (or a scripted
// `--seats "$VAR"` with VAR unset, or a stray comma) previously fell straight
// through to "nothing was sent, nothing was spent" and exited 0 - a run that
// reviewed NOTHING while reporting success. That is the same silence-looks-like-
// success failure the seat wall-clock cap exists to prevent: the operator is left
// believing a panel covered the document when no seat ever saw it.
if (!requested.length) {
  console.error('no seats requested. Pass --seats with at least one of: ' + Object.keys(SEATS).join(', '));
  process.exit(1);
}

const unknown = requested.filter((s) => !SEATS[s]);
if (unknown.length) {
  console.error(`unknown seat(s): ${unknown.join(', ')} — valid: ${Object.keys(SEATS).join(', ')}`);
  process.exit(1);
}

const document = readFileSync(documentPath, 'utf-8');
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';
// Rough token estimate: ~4 chars/token. Used ONLY for the pre-spend estimate,
// never for billing truth — each seat reports its own real usage.
const promptTok = Math.round((remit.length + document.length + seed.length) / 4);
const ASSUMED_OUT_TOK = 6000;

console.log(`[panel] document=${documentPath} (${document.length} chars, ~${promptTok} tok)`);
console.log(`[panel] seats=${requested.join(', ')}  out-dir=${outDir}`);
// The mode label describes the SPEND gate, never whether anything is sent. Calling
// the un-confirmed state "DRY-RUN" was a lie: `--dry-run` is a separate flag that
// exits before any request, whereas omitting --confirm-spend still RUNS every
// paid:false seat. With ox (an undisclosed provider that RETAINS prompts) and gemini
// (a metered Google key) both free-and-default, an operator reading "DRY-RUN" would
// believe nothing left the machine while the document was already being egressed.
// Found by two independent panel seats, 2026-08-23, and reproduced directly:
// `--seats qwen` with no flags printed "mode=DRY-RUN" and then "running: qwen".
const freeSeats = requested.filter((n) => !SEATS[n].paid);
const modeLabel = confirmSpend
  ? 'LIVE (all requested seats)'
  : `PAID SEATS GATED — ${freeSeats.length} free seat(s) WILL still run and send this document`;
console.log(`[panel] mode=${modeLabel}\n`);

let estimate = 0;
for (const name of requested) {
  const s = SEATS[name];
  const cost = (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
  estimate += cost;
  const billing = s.paid ? `~$${cost.toFixed(4)}` : '$0';
  console.log(`  ${name.padEnd(5)} ${s.label.padEnd(18)} ${billing.padStart(9)}  — ${s.note}`);
}
console.log(`\n[panel] estimated spend for this run: ~$${estimate.toFixed(4)} (assumes ${ASSUMED_OUT_TOK} output tok/seat)`);

// PREMIUM SEATS: priced on EVERY run even when NOT requested. Sean's standing ask
// (2026-08-22) is to be told what Fable and Sol would cost each time so the yes/no is
// informed. Printing unconditionally means the answer is already on screen - no second
// dry-run, no guessing, and no silent omission of the expensive option.
const premiumAvailable = Object.keys(SEATS).filter((n) => SEATS[n].premium && !requested.includes(n));
if (premiumAvailable.length) {
  console.log('\n[panel] PREMIUM seats NOT included - ask Sean before adding:');
  for (const n of premiumAvailable) {
    const ps = SEATS[n];
    const c = (promptTok / 1e6) * ps.inPerM + (ASSUMED_OUT_TOK / 1e6) * ps.outPerM;
    // The hint must be the command that ACTUALLY works for this seat. A free
    // opt-in seat (ox) needs naming but not --confirm-spend; printing the money
    // flag for it teaches a wrong incantation and implies a cost of dollars when
    // the real cost is disclosure. Say what it costs in its own currency.
    const how = ps.paid ? `--seats ...,${n} --confirm-spend` : `--seats ...,${n}`;
    const price = ps.paid ? `would add ~$${c.toFixed(4)}` : 'no $ cost — gated on DATA';
    console.log(`  + ${n.padEnd(6)} ${ps.label.padEnd(18)} ${price.padEnd(26)} (${how})`);
  }
}

// Spend gate. The gate exists to protect MONEY (Rule 16), so it applies to the
// paid seats only — making the free local/subscription seats demand a spend
// confirmation would train the reflex of typing --confirm-spend by habit,
// which is exactly how a real spend gate stops working.
// Premium seats were removed from the DEFAULT roster, so a bare
// `--document X --confirm-spend` can never reach Fable's $10/$50. Naming one is the
// deliberate act that authorises it.
const premiumRequested = requested.filter((n) => SEATS[n].premium);
if (premiumRequested.length && confirmSpend) {
  console.log(`\n[panel] PREMIUM seat(s) explicitly requested and confirmed: ${premiumRequested.join(', ')}`);

```
