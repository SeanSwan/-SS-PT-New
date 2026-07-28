#!/usr/bin/env node
/** Dependency-free MCP stdio surface for the consensus brain. */
import { executeConsensusRun } from './run.mjs';
import {
  DEFAULT_MAX_CONTEXT_CHARS,
  DEFAULT_MAX_TOKENS_PER_TURN,
  DEFAULT_RUN_CAP_USD,
  MAX_ROUNDS,
} from './constants.mjs';

const ROOT = process.env.SWAN_CONSENSUS_ROOT || process.cwd();
const TOOL = {
  name: 'opus_kimi_consensus',
  description: 'The Opus Kimi Debate Brain debates a task with Opus 5 and Kimi K3 for up to 7 rounds, grounded in bounded/sanitized Swan doctrine, and emits a builder-exact packet only after mutual same-contract consensus. Dry-run by default; confirm_spend:true is required for any paid call.',
  inputSchema: {
    type: 'object',
    required: ['task'],
    properties: {
      task: { type: 'string' },
      mode: { type: 'string', enum: ['auto', 'analyze', 'review', 'build', 'design'] },
      files: { type: 'array', items: { type: 'string' } },
      max_rounds: { type: 'integer', minimum: 1, maximum: MAX_ROUNDS },
      max_context_chars: { type: 'integer', minimum: 1000 },
      max_tokens_per_turn: { type: 'integer', minimum: 500 },
      cap_usd: { type: 'number', exclusiveMinimum: 0 },
      out: { type: 'string' },
      confirm_spend: { type: 'boolean' },
    },
  },
};

function send(message) { process.stdout.write(JSON.stringify(message) + '\n'); }
function result(id, value) { send({ jsonrpc: '2.0', id, result: value }); }
function failure(id, message) { send({ jsonrpc: '2.0', id, error: { code: -32000, message } }); }

async function callTool(args = {}) {
  if (!args.task?.trim()) throw new Error('task is required');
  const options = {
    root: ROOT,
    task: args.task,
    mode: args.mode || 'auto',
    files: Array.isArray(args.files) ? args.files : [],
    maxRounds: args.max_rounds || MAX_ROUNDS,
    maxContextChars: args.max_context_chars || DEFAULT_MAX_CONTEXT_CHARS,
    maxTokensPerTurn: args.max_tokens_per_turn || DEFAULT_MAX_TOKENS_PER_TURN,
    capUsd: args.cap_usd || DEFAULT_RUN_CAP_USD,
    confirmSpend: args.confirm_spend === true,
    out: args.out || '',
  };
  const run = await executeConsensusRun(options);
  if (run.status === 'preflight') {
    return {
      isError: false,
      text: JSON.stringify({
        status: 'preflight', model_calls: 0, worst_case_usd: run.estimate.usd,
        cap_usd: options.capUsd, max_rounds: options.maxRounds,
        sources: run.context.sources, rejected_files: run.context.rejectedFiles,
        missing_files: run.context.missingFiles,
        warning: run.warning,
        next: run.context.rejectedFiles.length > 0 || run.context.missingFiles.length > 0
          ? 'Replace or remove every missing file path before requesting a paid run.'
          : 'Explicit per-run approval is required before calling again with confirm_spend:true.',
      }, null, 2),
    };
  }
  const summary = `STATUS: ${run.status}\nROUNDS: ${run.rounds}\nSPEND: $${run.spend.spentUsd.toFixed(4)} / $${options.capUsd}\nPACKET: ${run.artifacts.paths.packet}\nTRANSCRIPT: ${run.artifacts.paths.transcript}\nRECEIPT: ${run.artifacts.paths.receipt}`;
  return { isError: run.status !== 'consensus', text: `${summary}\n\n${run.builderPacket || 'No builder authorization: consensus was not reached.'}` };
}

async function handle(message) {
  const { id, method, params } = message;
  if (id === undefined || id === null) return;
  if (method === 'initialize') {
    result(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'opus-kimi-consensus', version: '1.0.0' } });
  } else if (method === 'tools/list') {
    result(id, { tools: [TOOL] });
  } else if (method === 'tools/call') {
    if (params?.name !== TOOL.name) return failure(id, `unknown tool: ${params?.name}`);
    try {
      const output = await callTool(params?.arguments);
      result(id, { content: [{ type: 'text', text: output.text }], isError: output.isError });
    } catch (error) {
      result(id, { content: [{ type: 'text', text: `Consensus run failed: ${error.message}` }], isError: true });
    }
  } else if (method === 'ping') result(id, {});
  else failure(id, `method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch { /* malformed transport input is ignored */ }
  }
});

export { TOOL, callTool, handle };

