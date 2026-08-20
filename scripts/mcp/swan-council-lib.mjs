/**
 * swan-council-lib.mjs — Backend logic for the swan-council MCP shim.
 * ==================================================================
 * Shared, side-effect-light helpers that let a live Claude session call the
 * OTHER brains (Codex, Kimi, Fable) mid-conversation without paste-relay.
 *
 * Design (Sean 2026-07-22): one MCP server, per-tool backend, cost-ordered
 * fallback. Codex/Fable prefer their CLI (subscription, $0) and fall back to
 * OpenRouter only when the CLI is absent/fails; Kimi is OpenRouter-only.
 * Every PAID call is logged (per-call cost + running session total) AND a hard
 * $3/session cap refuses further paid calls once hit. Both, combined, per Sean.
 *
 * This module owns NO transport — it exposes pure-ish functions the server
 * (swan-council-server.mjs) wires to MCP tools. Clock, fetch, spawn, and the
 * ledger path are injectable so the whole thing is unit-testable with ZERO
 * real API spend and ZERO real subprocesses.
 *
 * Privacy (Rule 8/44/59): loads OPENROUTER_API_KEY from .env into env and uses
 * it ONLY in the Authorization header. It is NEVER returned in a tool result,
 * NEVER logged, NEVER placed in an error message. redactKey() is the last line
 * of defense on any string that leaves this module.
 *
 * @module swan-council-lib
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// Registry + spend ledger live in sibling modules (Rule 4: <300 lines each).
// Re-exported here so existing importers of swan-council-lib keep working.
import { BRAINS, DEFAULT_SESSION_CAP_USD } from './swan-council-brains.mjs';
export {
  computeCost, readSpend, writeSpend, checkCap, recordSpend, reserveSpend, settleReservation,
} from './swan-council-spend.mjs';
export { BRAINS, DEFAULT_SESSION_CAP_USD };

// ─────────────────────────────────────────────────────────────────────────────
// Secret hygiene
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load OPENROUTER_API_KEY from .env files into process.env WITHOUT printing it.
 * CRLF-safe (these .env files are CRLF; a bare '\n' split leaves a trailing '\r'
 * that corrupts the value) — mirrors consult-fable/consult-kimi exactly.
 */
export function loadOpenRouterKey(root = process.cwd(), env = process.env) {
  for (const envPath of [join(root, '.env'), join(root, 'backend', '.env')]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env.OPENROUTER_API_KEY || env.OPEN_ROUTER_API_KEY || null;
}

/**
 * Scrub any accidental key/bearer material from a string before it leaves this
 * module. Defense-in-depth: nothing should ever construct a leaking string, but
 * if it does, this catches OpenRouter keys (sk-or-...), generic sk- keys, and
 * "Bearer <token>" fragments. Given the live key too, it redacts that exact value.
 */
export function redactKey(str, key) {
  let s = String(str ?? '');
  if (key) s = s.split(key).join('<REDACTED-KEY>');
  s = s.replace(/sk-or-[A-Za-z0-9_-]{8,}/g, '<REDACTED-KEY>');
  s = s.replace(/\bsk-[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>');
  s = s.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer <REDACTED-KEY>');
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend selection: subscription CLI (preferred, $0) → OpenRouter (fallback, paid)
// ─────────────────────────────────────────────────────────────────────────────

/** Is a brain's subscription CLI present on PATH? Injectable probe for tests. */
export async function cliAvailable(brainKey, { probe } = {}) {
  const b = BRAINS[brainKey];
  if (!b || !b.cli) return false;
  const run = probe || defaultProbe;
  return run(b.cli.cmd, b.cli.probeArgs);
}

function defaultProbe(cmd, args) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    try {
      const child = spawn(cmd, args, { shell: true });
      const timer = setTimeout(() => { try { child.kill(); } catch { /* noop */ } done(false); }, 5000);
      child.on('error', () => { clearTimeout(timer); done(false); });
      child.on('close', (code) => { clearTimeout(timer); done(code === 0); });
    } catch {
      done(false);
    }
  });
}

/**
 * Decide which backend a call should use.
 *   - 'cli'        → subscription CLI present, use it ($0)
 *   - 'openrouter' → CLI absent/unavailable, use the paid API
 * Kimi has no CLI → always 'openrouter'. A brain with no key AND no CLI → 'none'.
 */
export async function selectBackend(brainKey, { probe, hasKey } = {}) {
  const b = BRAINS[brainKey];
  if (!b) return 'none';
  if (b.cli && (await cliAvailable(brainKey, { probe }))) return 'cli';
  if (hasKey) return 'openrouter';
  return 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter call (mirrors the consult-*.mjs fetch; key only in the header)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One OpenRouter chat completion. `fetchImpl` injectable for tests. Returns
 * {text, inTok, outTok, model}. Throws on HTTP/API error with a REDACTED message.
 */
export async function callOpenRouter(brainKey, prompt, {
  apiKey, fetchImpl = fetch, timeoutMs = 180_000, temperature = 0.2, maxTokens, reasoningEffort,
} = {}) {
  const b = BRAINS[brainKey];
  if (!b) throw new Error(`unknown brain '${brainKey}'`);
  if (!apiKey) throw new Error('no OpenRouter key available');

  const body = {
    model: b.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens || b.maxTokens,
    temperature,
  };
  if (reasoningEffort) body.reasoning = { effort: reasoningEffort };

  let res;
  try {
    res = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sswanstudios.com',
        'X-Title': 'SwanStudios Council MCP',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(redactKey(`OpenRouter request failed: ${e.message}`, apiKey));
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(redactKey(`OpenRouter ${res.status}: ${errBody.slice(0, 500)}`, apiKey));
  }
  const data = await res.json();
  if (data.error) throw new Error(redactKey(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`, apiKey));

  return {
    text: data.choices?.[0]?.message?.content || '(no response)',
    inTok: data.usage?.prompt_tokens || 0,
    outTok: data.usage?.completion_tokens || 0,
    model: data.model || b.model,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders (remits mirror the consult-*.mjs scripts)
// ─────────────────────────────────────────────────────────────────────────────

const CODEX_REMIT = `You are Codex (GPT-5.5), the hostile reviewer in the SwanStudios 3-brain pipeline.
Rigorous, anti-sycophantic review. Be direct. Cite file:line evidence.
For a problem: "FINDING [SEVERITY]: ..." with concrete reproduction steps.
If something is correct, say so plainly without padding.
Tag factual claims [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN].`;

const FABLE_REMIT = `You are Fable 5 — the Final Decider for SwanStudios (CLAUDE.md Co-Orchestrator Hierarchy).
You have FINAL authority; your verdict LOCKS the decision. Attack what lesser reviewers missed —
anything that ships the wrong thing, hits a data-truth trap, or violates a house rule. Do NOT hedge
to consensus. Structure: VERDICT (one line: LOCK / LOCK-WITH-CHANGES / SEND-BACK) → concrete rulings
→ single highest risk + how to de-risk it before build.`;

const KIMI_REMIT = `You are Kimi K3 — elite front-end/design brain and a sharp general reviewer for SwanStudios.
Give your real, concrete judgment. Cite specifics. Do NOT hedge to a safe consensus.`;

const GROK_REMIT = `You are Grok 4.6 — a fast, contrarian hostile reviewer for SwanStudios.
Attack correctness, security, and data-truth. Be blunt and specific. Cite file:line where the
material provides it. Do NOT hedge to a safe consensus — give your real engineering judgment.`;

export const REMITS = { codex: CODEX_REMIT, fable: FABLE_REMIT, kimi: KIMI_REMIT, grok: GROK_REMIT };

/** Read up to `max` chars of a repo file for review context; safe on missing files. */
export function readFileSafe(root, rel, max = 60_000) {
  try {
    return readFileSync(join(root, rel), 'utf-8').slice(0, max);
  } catch (e) {
    return `(failed to read ${rel}: ${e.message})`;
  }
}

/** Assemble the review prompt for codex_review from files/diff/question. */
export function buildReviewPrompt({ remit, files = [], diffText = '', question = '', root = process.cwd() }) {
  const blocks = [remit];
  if (diffText) blocks.push(`## Git diff\n\n\`\`\`diff\n${diffText.slice(0, 200_000)}\n\`\`\``);
  for (const f of files) blocks.push(`## File: ${f}\n\n\`\`\`\n${readFileSafe(root, f)}\n\`\`\``);
  if (question) blocks.push(`## Specific question / instructions\n\n${question}`);
  return blocks.join('\n\n---\n\n');
}
