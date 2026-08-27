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
import { readForEgress, redactForEgress, fetchForEgress } from './lib/redact-egress.mjs';

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

async function callCodex(prompt) {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error('No OPENROUTER_API_KEY found in .env');
  }

  const res = await fetchForEgress('https://openrouter.ai/api/v1/chat/completions', {
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
    // One summary line for the whole loop — never zero lines (silent redaction
    // is how the previous sanitizer went unexamined for months).
    let fileCount = 0;
    let fileRedactions = 0;
    for (const f of args.files) {
      try {
        const { text: content, hits } = redactForEgress(readFileSync(join(ROOT, f), 'utf-8'));
        fileCount += 1;
        fileRedactions += hits.reduce((n, h) => n + h.count, 0);
        blocks.push(`## File: ${f}\n\n\`\`\`\n${content.slice(0, 60000)}\n\`\`\``);
      } catch (err) {
        // A canary failure is the instrument refusing to certify — never swallow it.
        if (String(err.message).includes('[redact-egress] CANARY')) throw err;
        blocks.push(`## File: ${f}\n\n(failed to read: ${redactForEgress(err.message).text})`);
      }
    }
    console.error(`[redact-egress] --files: ${fileCount} file(s), ${fileRedactions} redaction(s) before send`);
  }

  if (args.filePath) {
    try {
      const content = readForEgress(join(ROOT, args.filePath), { label: args.filePath });
      blocks.push(`## Input document: ${args.filePath}\n\n${content}`);
    } catch (err) {
      if (String(err.message).includes('[redact-egress] CANARY')) throw err;
      blocks.push(`## Input document: ${args.filePath}\n\n(failed to read: ${redactForEgress(err.message).text})`);
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
