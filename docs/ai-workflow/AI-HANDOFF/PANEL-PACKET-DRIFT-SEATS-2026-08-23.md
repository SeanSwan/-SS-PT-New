# Hostile review packet — AI panel roster + drift-check hook integrity (2026-08-23)

Five seats. Find real defects in the code below. Repo-relative paths only.

## What changed and why

1. `consult-gemini-panel.mjs` (NEW) — Gemini 3.1 Pro as a panel seat, direct Google API.
2. `consult-grok.mjs` — shared transport by 4 seats via SWAN_GROK_MODEL; 4 strings were hardcoded "Grok 4.6" so 3 seats filed under a 4th seat name.
3. `panel-seats.mjs` / `consult-panel.mjs` — added ox + gemini seats; fable/sol became `premium` (excluded from default roster, priced every run, require explicit naming + --confirm-spend).
4. `drift-check-gate.mjs` check 7 (NEW) — detect registered hooks whose files do not exist.

## Known-fixed already (do NOT re-report; find what these MISSED)

- cwd-relative .env in the gemini seat
- mkdirSync after the paid API call
- `--seats ""` exiting 0 having reviewed nothing
- multi-line JSON error shredding INDEX.md markdown

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
const seedText = seed && existsSync(seed) ? readFileSync(seed, 'utf8') : '';
const prompt = [remit, seedText && `## Prior context\n\n${seedText}`, '---', body]
  .filter(Boolean).join('\n\n');

console.error(`[consult-gemini-panel] model=${model} doc=${document} chars=${body.length} key=present(${apiKey.length}ch) — direct Google API`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
const started = Date.now();

try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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
    // MAX_TOKENS with no text is the reasoning-ate-the-budget failure the
    // DeepSeek seats taught us to name explicitly rather than report as "empty".
    const why = finish === 'MAX_TOKENS'
      ? `hit maxOutputTokens (${maxTokens}) before emitting visible text — raise --max-tokens`
      : `empty response (finishReason=${finish})`;
    throw new Error(why);
  }

  const u = data.usageMetadata ?? {};
  const wall = ((Date.now() - started) / 1000).toFixed(1);
  const truncated = finish === 'MAX_TOKENS';

  const header = [
    '# Gemini Panel Review',
    '',
    `**Model:** \`${model}\` via direct Google API (not OpenRouter)`,
    `**Document:** ${document}`,
    `**Tokens:** ${u.promptTokenCount ?? '?'} in / ${u.candidatesTokenCount ?? '?'} out | **Wall:** ${wall}s | **finishReason:** ${finish}`,
    '',
    truncated
      ? '> ⚠ **TRUNCATED** — hit maxOutputTokens. The tail is NOT a finished thought.\n'
      : '',
    '---',
    '',
  ].filter((l) => l !== '').join('\n');

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
      note: 'x-ai/grok-4.6 via OpenRouter — rule-12 repeal (PR #54)',
    },
    dspro: {
      label: 'DeepSeek V4 Pro', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.48, outPerM: 0.96, out: 'DEEPSEEK-PRO-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-pro' },
      note: 'deepseek/deepseek-v4-pro via consult-grok transport',
    },
    ox: {
      label: 'Ox Alpha', script: 'consult-grok.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'OX-ALPHA-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'stealth/ox-alpha' },
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

## FILE: scripts/hooks/drift-check-gate.mjs (check 7 region)

```javascript
// ---- 7) Hook-registration integrity: a registered guard whose file is absent ----
//
// THE FAILURE THIS CATCHES (2026-08-22, found by Sean from outside the system):
// `.claude/settings.json` registered `lane-session-start.mjs` (SessionStart) and
// `push-blast-radius.mjs` (PreToolUse). Neither file existed on the branch. The
// harness cannot run a file it cannot find, so it emitted NOTHING — and nothing is
// byte-identical to what a healthy guard that found no problems emits. No error, no
// warning, no degraded mode. Every session read as clean while the Coordination
// Ledger went unread for weeks and pushes went unguarded.
//
// That is the general shape and it is why this check has to be mechanical:
// REGISTRATION IS NOT EXISTENCE, and a guard's silence is ambiguous by construction.
// You cannot notice this from inside a session; the only prior detection was a human
// spotting a second-order symptom (agents ignoring each other's notes).
//
// Also covers the wider version: an unparseable settings file silently disables EVERY
// hook it declares, which is the same failure with a larger blast radius.
try {
  const PATH_RE = /(?:scripts|\.claude)[/\\][A-Za-z0-9_./\\-]+\.(?:mjs|js|sh|ps1|py)/g;
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
    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      for (const group of groups || []) {
        for (const hook of group.hooks || []) {
          for (const m of String(hook.command || '').matchAll(PATH_RE)) {
            const rel = m[0].replace(/\\/g, '/');
            const key = `${event}:${rel}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (!existsSync(join(SS_PT, rel))) missing.push(`${rel} (${event}, ${name})`);
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
} catch { /* never let the integrity check itself break session start — fail-open */ }

// ---- Emit: silent when clean ----------------------------------------------
if (findings.length) {
  process.stdout.write(
    '[drift-check] ⚠ ' + findings.length + ' drift finding(s) — a doc that reads as ' +
    'authoritative may be wrong:\n' +
    findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n') +
    '\nFull procedure (7 checks incl. stale registry, stale index, missing tooling, ' +
    'guard coverage gaps, hook-registration integrity): .claude/skills/drift-check/SKILL.md\n'
  );
}

process.exit(0);

```

## FILE: scripts/consult-panel.mjs (seat resolution + spend gate)

```javascript

const documentPath = arg('--document');
const seedPath = arg('--seed');
const confirmSpend = argv.includes('--confirm-spend');
const dryRun = argv.includes('--dry-run');
const stamp = new Date().toISOString().slice(0, 10);
const outDir = arg('--out-dir', `docs/ai-workflow/AI-HANDOFF/panel-${stamp}`);
// Dedupe: `--seats kimi,kimi` is a typo, but without this it would fire a PAID
// seat twice and bill twice for one review.
const requested = [...new Set(
  arg('--seats', 'kimi,glm,qwen,ox,gemini,grok,dspro,dsflash').split(',').map((s) => s.trim()).filter(Boolean),
)];

if (!documentPath) {
  console.error('usage: node scripts/consult-panel.mjs --document <path> [--seed <path>] [--seats kimi,glm,qwen,ox,gemini,grok,dspro,dsflash] [--confirm-spend]');
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
console.log(`[panel] mode=${confirmSpend ? 'LIVE' : 'DRY-RUN'}\n`);

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
    console.log(`  + ${n.padEnd(6)} ${ps.label.padEnd(18)} would add ~$${c.toFixed(4)}   (--seats ...,${n} --confirm-spend)`);
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
}
const paidRequested = requested.filter((n) => SEATS[n].paid);
const skipped = confirmSpend ? [] : paidRequested;
const seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid);

if (dryRun) {
  console.log('\n[panel] --dry-run — nothing was sent, nothing was spent.');
  process.exit(0);
}
if (skipped.length) {
  console.log(`\n[panel] SKIPPING paid seats (${skipped.join(', ')}) — no --confirm-spend.`);

```
