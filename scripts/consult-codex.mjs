#!/usr/bin/env node

/**
 * SwanStudios — subscription-only Codex consult
 * ===============================================
 *
 * Local, read-only harness around the authenticated Codex CLI. This file has
 * no .env loader, network client, or metered fallback.
 *
 * Use this when:
 *   - You want Codex's review WITHOUT the rest of the Village (no parallel
 *     analysts, no specialty debates, no smart escalation chain).
 *   - You want one focused subscription-backed review pass.
 *
 * Usage:
 *   node scripts/consult-codex.mjs --review --files A.mjs,B.mjs
 *   node scripts/consult-codex.mjs --review --diff           (tracked worktree diff)
 *   node scripts/consult-codex.mjs --ask "your question"
 *   node scripts/consult-codex.mjs --file path/to/receipt.md
 *
 * Output:
 *   - stdout (full response)
 *   - AI-Village-Documentation/codex-consults/latest.md (saved)
 *   - AI-Village-Documentation/codex-consults/<timestamp>.md (archived)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { readForEgress, redactForEgress } from './lib/redact-egress.mjs';
import { runCodexSubscription } from './mcp/swan-council-subscription.mjs';
import { createReportEnvelope, createReviewPacket, writeImmutablePacket } from './mcp/swan-review-packet.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DIFF_LIMIT = 200_000;
const FILE_LIMIT = 60_000;
const SAFE_DIFF_RANGE = /^(?:[A-Za-z0-9._/~^:@-]+)(?:\.\.\.?[A-Za-z0-9._/~^:@-]+)?$/;

export function isSafeDiffRange(range) {
  return typeof range === 'string' && SAFE_DIFF_RANGE.test(range);
}

export function resolveRepoPath(repoPath, root = ROOT) {
  if (typeof repoPath !== 'string' || !repoPath.trim() || isAbsolute(repoPath)) {
    throw new Error('repository-relative path required');
  }
  const absolute = resolve(root, repoPath);
  const outside = relative(resolve(root), absolute);
  if (!outside || outside === '..' || outside.startsWith('..\\') || outside.startsWith('../') || isAbsolute(outside)) {
    throw new Error('path escapes repository root');
  }
  return absolute;
}

function parseArgs(argv) {
  const args = { mode: 'ask', files: [], filePath: null, diff: false, diffRange: 'HEAD', prompt: null, model: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--review') args.mode = 'review';
    else if (value === '--ask') {
      args.mode = 'ask';
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.prompt = argv[++i];
    } else if (value === '--files') {
      args.files = (argv[++i] || '').split(',').map((item) => item.trim()).filter(Boolean);
    } else if (value === '--file') args.filePath = argv[++i] || null;
    else if (value === '--diff') args.diff = true;
    else if (value === '--diff-range') { args.diff = true; args.diffRange = argv[++i] || 'HEAD'; }
    else if (value === '--model') args.model = argv[++i] || null;
    else if (!args.prompt) args.prompt = value;
  }
  return args;
}

function gitDiff(range, root = ROOT) {
  if (!isSafeDiffRange(range)) {
    return { text: `(rejected diff range ${JSON.stringify(range)}: only safe git refs/ranges are allowed)`, truncated: false, rejected: true };
  }
  try {
    const fullText = execFileSync('git', ['-C', root, 'diff', '--no-ext-diff', range], {
      encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
    });
    return { text: fullText.slice(0, DIFF_LIMIT), truncated: fullText.length > DIFF_LIMIT, rejected: false };
  } catch (error) {
    return { text: `(failed to read git diff: ${redactForEgress(error.message).text})`, truncated: false, rejected: false };
  }
}

function scopeBlock(args, diffInfo, fileStates) {
  return [
    '## Review scope',
    `- tracked diff: ${args.diff ? `git diff ${args.diffRange}` : 'not requested'}`,
    '- untracked files: excluded unless explicitly named in --files or --file',
    `- requested files: ${args.files.length ? args.files.join(', ') : 'none'}`,
    `- input document: ${args.filePath || 'none'}`,
    `- diff status: ${args.diff ? (diffInfo.rejected ? 'rejected' : diffInfo.truncated ? 'included with truncation' : 'included') : 'not requested'}`,
    `- file status: ${fileStates.length ? fileStates.join('; ') : 'not requested'}`,
    '- omitted content must not be treated as reviewed evidence',
  ].join('\n');
}

export function buildPrompt(args, { root = ROOT } = {}) {
  const blocks = [];
  const fileStates = [];
  let diffInfo = { text: '', truncated: false, rejected: false };

  blocks.push(`You are the authenticated Codex subscription reviewer for SwanStudios.
Your job is rigorous, anti-sycophantic review. Be direct and cite file:line evidence.
If you find a problem, say "FINDING [SEVERITY]: ..." with concrete reproduction steps.
If something is correct, say so plainly without padding.
Use [VERIFIED] / [LIKELY] / [HYPOTHESIS] / [UNKNOWN] tags on factual claims.
Review only the explicit scope below. Do not infer that omitted or truncated content was reviewed.`);

  if (args.diff) {
    diffInfo = gitDiff(args.diffRange, root);
    const truncationNote = diffInfo.truncated ? `\n\n[scope note: diff truncated at ${DIFF_LIMIT} characters; remainder omitted]` : '';
    blocks.push(`## Git diff (${args.diffRange})\n\n\`\`\`diff\n${diffInfo.text}\n\`\`\`${truncationNote}`);
  }

  if (args.files.length > 0) {
    let fileCount = 0;
    let fileRedactions = 0;
    for (const file of args.files) {
      try {
        const absolute = resolveRepoPath(file, root);
        const { text: content, hits } = redactForEgress(readFileSync(absolute, 'utf8'));
        fileCount += 1;
        fileRedactions += hits.reduce((count, hit) => count + hit.count, 0);
        const truncated = content.length > FILE_LIMIT;
        fileStates.push(`${file}: included${truncated ? ` (truncated at ${FILE_LIMIT})` : ''}`);
        blocks.push(`## File: ${file}\n\n\`\`\`\n${content.slice(0, FILE_LIMIT)}\n\`\`\`${truncated ? `\n\n[scope note: file truncated at ${FILE_LIMIT} characters; remainder omitted]` : ''}`);
      } catch (error) {
        if (String(error.message).includes('[redact-egress] CANARY')) throw error;
        fileStates.push(`${file}: rejected or unreadable`);
        blocks.push(`## File: ${file}\n\n(${redactForEgress(error.message).text})`);
      }
    }
    console.error(`[redact-egress] --files: ${fileCount} file(s), ${fileRedactions} redaction(s) before send`);
  }

  if (args.filePath) {
    try {
      const absolute = resolveRepoPath(args.filePath, root);
      const content = readForEgress(absolute, { label: args.filePath });
      fileStates.push(`${args.filePath}: input document included`);
      blocks.push(`## Input document: ${args.filePath}\n\n${content}`);
    } catch (error) {
      if (String(error.message).includes('[redact-egress] CANARY')) throw error;
      fileStates.push(`${args.filePath}: rejected or unreadable`);
      blocks.push(`## Input document: ${args.filePath}\n\n(${redactForEgress(error.message).text})`);
    }
  }

  blocks.splice(1, 0, scopeBlock(args, diffInfo, fileStates));
  if (args.prompt) blocks.push(`## Specific question / instructions\n\n${args.prompt}`);
  return blocks.join('\n\n---\n\n');
}

function usage() {
  console.error('Usage:');
  console.error('  node scripts/consult-codex.mjs --review --diff [--diff-range HEAD~1..HEAD]');
  console.error('  node scripts/consult-codex.mjs --review --files a.mjs,b.mjs');
  console.error('  node scripts/consult-codex.mjs --file path/to/receipt.md "question"');
  console.error('  node scripts/consult-codex.mjs --ask "question text"');
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.diff && args.files.length === 0 && !args.filePath && !args.prompt) {
    usage();
    return 1;
  }

  const prompt = buildPrompt(args);
  const outDir = join(ROOT, 'AI-Village-Documentation', 'codex-consults');
  const packet = createReviewPacket({
    root: ROOT,
    scope: {
      mode: args.mode,
      diff: args.diff,
      diffRange: args.diff ? args.diffRange : null,
      files: args.files,
      filePath: args.filePath,
    },
    prompt,
  });
  const packetReceipt = writeImmutablePacket(outDir, packet);
  const model = args.model || process.env.SWAN_CODEX_MODEL || null;
  console.log(`[consult-codex] packet: ${packetReceipt.packetId}`);
  console.log(`[consult-codex] requested model: ${model || 'unspecified'}`);
  console.log(`[consult-codex] prompt size: ${prompt.length} chars`);
  console.log('[consult-codex] checking ChatGPT subscription auth; no metered fallback');

  const start = Date.now();
  // `prompt` is RAW here — assembled by buildPrompt() from a diff, files, or --ask,
  // with no redaction step. It is passed as `prompt` so the transport's egress
  // boundary redacts it. Before 2026-09-22 this call site sent the prompt verbatim
  // (Astra R2-A1-02, filed as F3 HIGH on 2026-09-19 and left open).
  //
  // Do not pass `promptRedacted: true` here. This leg has not redacted anything,
  // and asserting otherwise would disable the only control protecting it.
  const result = await runCodexSubscription({ prompt, root: ROOT, model });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (result.status !== 'complete') {
    console.error(`[consult-codex] ${result.status.toUpperCase()}: ${result.error} (packet ${packetReceipt.path})`);
    return 2;
  }

  console.log(`[consult-codex] done in ${elapsed}s — tokens in:${result.inputTokens ?? 'unknown'} out:${result.outputTokens ?? 'unknown'}`);
  console.log('');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(result.text);
  console.log('────────────────────────────────────────────────────────────────');

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = join(outDir, `${stamp}.md`);
  const latestPath = join(outDir, 'latest.md');
  const reportPath = join(outDir, `${stamp}.report.json`);
  const latestReportPath = join(outDir, 'latest.report.json');
  const reportEnvelope = createReportEnvelope({
    packetId: packetReceipt.packetId,
    provider: result.provider,
    billing: result.billing,
    authMode: result.authMode,
    text: result.text,
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  });
  const header = [
    `# Codex Subscription Consult — ${new Date().toISOString()}`,
    '',
    `**Provider:** ${result.provider}`,
    `**Billing:** ${result.billing}`,
    `**Authentication:** ${result.authMode}`,
    `**Transport:** ${result.transport}`,
    `**Requested model:** ${result.requestedModel || 'unspecified'}`,
    `**Served model:** ${result.servedModel || 'unknown'}`,
    `**Tokens:** in=${result.inputTokens ?? 'unknown'} out=${result.outputTokens ?? 'unknown'}`,
    `**Packet:** ${packetReceipt.packetId}`,
    `**Elapsed:** ${elapsed}s`,
    '', '---', '',
  ].join('\n');
  writeFileSync(archivePath, header + result.text + '\n');
  writeFileSync(latestPath, header + result.text + '\n');
  writeFileSync(reportPath, JSON.stringify(reportEnvelope, null, 2) + '\n');
  writeFileSync(latestReportPath, JSON.stringify(reportEnvelope, null, 2) + '\n');
  console.log(`Saved: ${latestPath}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().then((code) => { if (code) process.exitCode = code; }).catch((error) => {
    console.error('[consult-codex] ERROR:', error.message);
    process.exitCode = 2;
  });
}

export { parseArgs };
