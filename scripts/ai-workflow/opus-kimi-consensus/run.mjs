/** High-level preflight and execution pipeline. No paid call without confirmSpend. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSwanContext } from './context.mjs';
import { estimateWorstCaseRun } from './cli-core.mjs';
import { createOpenRouterCaller } from './provider.mjs';
import { runConsensusDebate } from './protocol.mjs';
import { writeRunArtifacts } from './artifacts.mjs';

function loadOpenRouterKey(root, env = process.env) {
  if (env.OPENROUTER_API_KEY || env.OPEN_ROUTER_API_KEY) {
    return env.OPENROUTER_API_KEY || env.OPEN_ROUTER_API_KEY;
  }
  for (const rel of ['.env', 'backend/.env']) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^(OPENROUTER_API_KEY|OPEN_ROUTER_API_KEY)=(.*)$/);
      if (match) return match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

function runId(task) {
  const slug = task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug || 'run'}`;
}

export function prepareConsensusRun(options) {
  const context = buildSwanContext({
    root: options.root,
    mode: options.mode,
    files: options.files,
    maxChars: options.maxContextChars,
  });
  // Include the full context plus room for one candidate packet and one critique.
  const promptChars = Buffer.byteLength(context.text + options.task, 'utf8') + 20_000 + (options.maxTokensPerTurn * 8);
  const estimate = estimateWorstCaseRun({
    promptChars,
    maxRounds: options.maxRounds,
    maxTokensPerTurn: options.maxTokensPerTurn,
  });
  return {
    status: 'preflight',
    context,
    estimate,
    warning: estimate.usd > options.capUsd
      ? `The ${options.maxRounds}-round worst-case estimate exceeds the $${options.capUsd.toFixed(2)} cap; the live run will stop before overspending if consensus takes too long.`
      : null,
  };
}

export async function executeConsensusRun(options) {
  const preflight = prepareConsensusRun(options);
  if (!options.confirmSpend) return preflight;
  if (preflight.context.rejectedFiles.length > 0) {
    throw new Error(`requested context files are blocked by policy: ${preflight.context.rejectedFiles.join(', ')}`);
  }
  if (preflight.context.missingFiles.length > 0) {
    throw new Error(`requested context files do not exist: ${preflight.context.missingFiles.join(', ')}`);
  }

  const apiKey = loadOpenRouterKey(options.root);
  const provider = createOpenRouterCaller({
    apiKey,
    capUsd: options.capUsd,
    maxTokens: options.maxTokensPerTurn,
  });
  const result = await runConsensusDebate({
    task: options.task,
    mode: options.mode,
    maxRounds: options.maxRounds,
    swanContext: preflight.context.text,
    callBrain: provider.call,
    onTurn: options.onTurn,
  });
  const artifacts = writeRunArtifacts({
    outputDir: options.out || join(options.root, '.ai-workflow', 'opus-kimi-consensus'),
    runId: options.runId || runId(options.task),
    task: options.task,
    mode: options.mode,
    context: preflight.context,
    result,
    spend: provider.receipt(),
  });
  return { ...result, preflight, spend: provider.receipt(), artifacts };
}

