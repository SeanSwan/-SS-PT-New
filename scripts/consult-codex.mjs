#!/usr/bin/env node

/**
 * SwanStudios — Single-target Codex (GPT-5.5) consult
 * ====================================================
 *
 * Bypasses the AI Village orchestrator. Calls openai/gpt-5.5 via OpenRouter
 * for a one-shot review/diff-analysis pass. Same output discipline as
 * consult-gemini.mjs.
 *
 * Use this when:
 *   - You want Codex's review WITHOUT the rest of the Village (no parallel
 *     analysts, no specialty debates, no smart escalation chain).
 *   - You're paying directly for one focused review pass.
 *
 * Usage:
 *   node scripts/consult-codex.mjs --review --files A.mjs,B.mjs
 *   node scripts/consult-codex.mjs --review --diff           (HEAD vs HEAD~1)
 *   node scripts/consult-codex.mjs --ask "your question"
 *   node scripts/consult-codex.mjs --file path/to/receipt.md
 *
 * Output:
 *   - stdout (full response)
 *   - AI-Village-Documentation/codex-consults/latest.md (saved)
 *   - AI-Village-Documentation/codex-consults/<timestamp>.md (archived)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = join(__dirname, '..');

const MODEL = 'openai/gpt-5.5';

// ─────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────

function loadEnv() {
  for (const envPath of [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]) {
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || null;
}

// ─────────────────────────────────────────────
// OpenRouter call (mirrors validation-orchestrator pattern)
// ─────────────────────────────────────────────

/**
 * Is the flat-rate Codex CLI available and logged in?
 *
 * Sean pays a monthly Codex subscription. Until now this script always called
 * the METERED OpenRouter API, so every consult was billed twice over: once by
 * the subscription he already owns, and again per token. Verified 2026-08-11:
 * `codex login status` reports "Logged in using ChatGPT" and `codex exec`
 * returns correctly non-interactively.
 */
function codexCliAvailable() {
  try {
    execSync('codex --version', { stdio: 'pipe', timeout: 15_000 });
    // `codex login status` writes to STDERR, not stdout. Reading only stdout
    // returns an empty string, the regex fails, and this function reports
    // "unavailable" while the subscription is live — silently routing every
    // consult to the METERED API. Verified: stdout is empty, stderr carries
    // "Logged in using ChatGPT". Merge both streams.
    const status = execSync('codex login status 2>&1', {
      stdio: 'pipe', timeout: 15_000, shell: true,
    }).toString();
    return /logged in/i.test(status);
  } catch (e) {
    // A non-zero exit still carries the message on stderr; check it before
    // giving up, otherwise a "not logged in" exit code hides a logged-in state.
    const merged = `${e?.stdout ?? ''}${e?.stderr ?? ''}`;
    return /logged in/i.test(merged);
  }
}

/** Run the consult through the flat-rate CLI. Zero marginal cost. */
function callCodexCli(prompt) {
  // --skip-git-repo-check so the consult works from any cwd, including a
  // worktree or a scratch dir.
  const out = execSync('codex exec --skip-git-repo-check -', {
    input: prompt,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 900_000,
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
  return {
    text: out.trim() || '(no response)',
    inputTokens: 0,        // not billed per token on the subscription
    outputTokens: 0,
    model: 'codex-cli (flat-rate subscription)',
    billed: false,
  };
}

async function callCodex(prompt) {
  // FLAT-RATE FIRST. The metered API is now an explicit opt-out, not the
  // default — set SWAN_CODEX_FORCE_API=1 to force paid billing.
  const forceApi = process.env.SWAN_CODEX_FORCE_API === '1';
  if (!forceApi && codexCliAvailable()) {
    console.log('[consult-codex] transport=codex-cli billing=FLAT-RATE (subscription, $0 marginal)');
    return callCodexCli(prompt);
  }

  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error('No OPENROUTER_API_KEY found in .env, and the flat-rate Codex CLI is unavailable. '
      + 'Run `codex login` to use the subscription you already pay for.');
  }
  console.log(`[consult-codex] transport=openrouter-api billing=METERED model=${MODEL}`
    + `${forceApi ? ' (forced via SWAN_CODEX_FORCE_API=1)' : ' (CLI unavailable — falling back)'}`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Codex Consult',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 500)}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return {
    text: data.choices?.[0]?.message?.content || '(no response)',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    model: data.model || MODEL,
  };
}

// ─────────────────────────────────────────────
// CLI parsing
// ─────────────────────────────────────────────

function parseArgs(argv) {
  const args = { mode: 'ask', files: [], filePath: null, diff: false, prompt: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--review') args.mode = 'review';
    else if (a === '--ask') { args.mode = 'ask'; if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.prompt = argv[++i]; }
    else if (a === '--files') { const v = argv[++i] || ''; args.files = v.split(',').map(s => s.trim()).filter(Boolean); }
    else if (a === '--file') args.filePath = argv[++i];
    else if (a === '--diff') args.diff = true;
    else if (!args.prompt) args.prompt = a;
  }
  return args;
}

function buildPrompt(args) {
  const blocks = [];

  blocks.push(`You are Codex (GPT-5.5), the third gate in the SwanStudios 3-brain pipeline.
Your job is rigorous, anti-sycophantic review. Be direct. Cite file:line evidence.
If you find a problem, say "FINDING [SEVERITY]: ..." with concrete reproduction steps.
If something is correct, say so plainly without padding.
Use [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN] tags on factual claims.`);

  if (args.diff) {
    let diffText = '';
    try {
      diffText = execSync('git -C "' + ROOT + '" diff HEAD~1..HEAD', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      diffText = `(failed to read git diff: ${err.message})`;
    }
    blocks.push(`## Git diff (HEAD~1..HEAD)\n\n\`\`\`diff\n${diffText.slice(0, 200000)}\n\`\`\``);
  }

  if (args.files.length > 0) {
    for (const f of args.files) {
      try {
        const content = readFileSync(join(ROOT, f), 'utf-8');
        blocks.push(`## File: ${f}\n\n\`\`\`\n${content.slice(0, 60000)}\n\`\`\``);
      } catch (err) {
        blocks.push(`## File: ${f}\n\n(failed to read: ${err.message})`);
      }
    }
  }

  if (args.filePath) {
    try {
      const content = readFileSync(join(ROOT, args.filePath), 'utf-8');
      blocks.push(`## Input document: ${args.filePath}\n\n${content}`);
    } catch (err) {
      blocks.push(`## Input document: ${args.filePath}\n\n(failed to read: ${err.message})`);
    }
  }

  if (args.prompt) {
    blocks.push(`## Specific question / instructions\n\n${args.prompt}`);
  }

  return blocks.join('\n\n---\n\n');
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  const prompt = buildPrompt(args);

  if (!args.diff && args.files.length === 0 && !args.filePath && !args.prompt) {
    console.error('Usage:');
    console.error('  node scripts/consult-codex.mjs --review --diff');
    console.error('  node scripts/consult-codex.mjs --review --files a.mjs,b.mjs');
    console.error('  node scripts/consult-codex.mjs --file path/to/receipt.md "question"');
    console.error('  node scripts/consult-codex.mjs --ask "question text"');
    process.exit(1);
  }

  console.log(`[consult-codex] model: ${MODEL}`);
  console.log(`[consult-codex] prompt size: ${prompt.length} chars`);
  console.log('[consult-codex] calling OpenRouter...');

  const start = Date.now();
  const result = await callCodex(prompt);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[consult-codex] done in ${elapsed}s — tokens in:${result.inputTokens} out:${result.outputTokens}`);
  console.log('');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(result.text);
  console.log('────────────────────────────────────────────────────────────────');

  // Save outputs
  const outDir = join(ROOT, 'AI-Village-Documentation', 'codex-consults');
  mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = join(outDir, `${stamp}.md`);
  const latestPath = join(outDir, 'latest.md');

  const header = [
    `# Codex (GPT-5.5) Consult — ${new Date().toISOString()}`,
    '',
    `**Model:** ${result.model}`,
    `**Tokens:** in=${result.inputTokens} out=${result.outputTokens}`,
    `**Elapsed:** ${elapsed}s`,
    '',
    '---',
    '',
  ].join('\n');

  writeFileSync(archivePath, header + result.text + '\n');
  writeFileSync(latestPath, header + result.text + '\n');

  console.log('');
  console.log(`Saved: ${latestPath}`);
}

main().catch((err) => {
  console.error('[consult-codex] ERROR:', err.message);
  process.exit(2);
});
