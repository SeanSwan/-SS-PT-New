/**
 * Kimi Panel CLI: dry by default, explicit confirmation for the exact printed allocation.
 * ======================================================================================
 * The CLI performs sanitization and reserves thirteen logical seats plus one conditional full-HY3
 * fallback without loading an API key. `--confirm-spend` is the only live boundary.
 *
 * @module kimi-panel/cli
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '../context-gateway/src/transport.mjs';
import { sha256 } from '../context-gateway/src/receiptV1.mjs';
import { MAX_OUTPUT_TOKENS } from './config.mjs';
import { preparePacket } from './packet.mjs';
import { runKimiPanel } from './engine.mjs';
import { createReceiptSink } from './receipts.mjs';

function parseArgs(argv) {
  const options = { document: '', outDir: '', capUsd: NaN, maxTokens: MAX_OUTPUT_TOKENS,
    confirmSpend: false, opusSelfReview: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${flag} requires a value`);
      i += 1; return argv[i];
    };
    if (flag === '--document') options.document = next();
    else if (flag === '--out-dir') options.outDir = next();
    else if (flag === '--cap-usd') options.capUsd = Number(next());
    else if (flag === '--max-tokens') options.maxTokens = Number(next());
    else if (flag === '--confirm-spend') options.confirmSpend = true;
    else if (flag === '--opus-self-review') options.opusSelfReview = true;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!options.help && !options.document) throw new Error('--document is required');
  if (!options.help && !Number.isFinite(options.capUsd)) throw new Error('--cap-usd is required');
  return options;
}

function usage() {
  return 'node scripts/run-kimi-panel.mjs --document <sanitized-design-packet> --cap-usd <0.01-5> [--out-dir <dir>] [--max-tokens 60000] [--opus-self-review] [--confirm-spend]';
}

function printPreflight(preflight) {
  console.log(`[kimi-panel] status=preflight-only packet_sha256=${preflight.packetSha256}`);
  console.log(`[kimi-panel] logical_seats=${preflight.logicalSeatCount} max_metered_calls=${preflight.maxMeteredCallCount} model_calls_executed=0 max_output_tokens=${preflight.maxOutputTokens}`);
  console.log(`[kimi-panel] shared_cap_usd=${preflight.sharedCapUsd.toFixed(4)} total_worst_case_usd=${preflight.totalWorstCaseUsd.toFixed(4)} allowed=${preflight.allowed}`);
  for (const entry of preflight.roster) {
    console.log(`[kimi-panel] stage=${entry.stage} model=${entry.model} tokens=${entry.maxTokens} worst_case_usd=${entry.worstCaseUsd.toFixed(4)}`);
  }
  if (!preflight.allowed) console.log(`[kimi-panel] blocked=${preflight.blockReason}`);
}

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
  const options = parseArgs(argv);
  if (options.help) { console.log(usage()); return; }
  const packetMeta = preparePacket({ root, documentPath: options.document });
  const dry = await runKimiPanel({
    packet: packetMeta.text, documentPath: options.document,
    capUsd: options.capUsd, maxTokens: options.maxTokens, confirmed: false,
  });
  printPreflight(dry.preflight);
  if (!options.confirmSpend) return dry;
  if (!dry.preflight.allowed) throw new Error(dry.preflight.blockReason);

  loadEnv(root, process.env);
  const runId = sha256(`${packetMeta.sha256}:${randomBytes(12).toString('hex')}`).slice(0, 16);
  const receiptSink = createReceiptSink({ root, packetMeta, capUsd: options.capUsd, runId });
  const result = await runKimiPanel({
    packet: packetMeta.text, documentPath: options.document,
    capUsd: options.capUsd, maxTokens: options.maxTokens, confirmed: true,
    opusSelfReview: options.opusSelfReview, receiptSink, runId,
  });
  const outDir = resolve(root, options.outDir || join('.ai-workflow', 'kimi-panel', 'runs', runId));
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'final-verdict.json');
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[kimi-panel] status=complete run_id=${runId} calls=${result.modelCallsExecuted} cost_usd=${result.spendUsd.toFixed(4)}`);
  console.log(`[kimi-panel] verdict=${result.final.verdict} output=${out}`);
  return result;
}

export function runCli() {
  main().catch((error) => {
    console.error(`[kimi-panel] ${error.message}`);
    process.exitCode = 1;
  });
}
