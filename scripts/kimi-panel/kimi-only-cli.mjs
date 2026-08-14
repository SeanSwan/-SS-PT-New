/** CLI wrapper for one dry-first, explicitly confirmed Kimi K3 hostile review. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '../context-gateway/src/transport.mjs';
import { sha256 } from '../context-gateway/src/receiptV1.mjs';
import { preparePacket } from './packet.mjs';
import { createReceiptSink } from './receipts.mjs';
import { runKimiOnly } from './kimi-only.mjs';

function args(argv) {
  const out = { document: '', outDir: '', capUsd: NaN, maxTokens: 8_000, confirmSpend: false };
  for (let i = 0; i < argv.length; i += 1) {
    const value = () => { i += 1; if (i >= argv.length) throw new Error('missing argument value'); return argv[i]; };
    if (argv[i] === '--document') out.document = value();
    else if (argv[i] === '--out-dir') out.outDir = value();
    else if (argv[i] === '--cap-usd') out.capUsd = Number(value());
    else if (argv[i] === '--max-tokens') out.maxTokens = Number(value());
    else if (argv[i] === '--confirm-spend') out.confirmSpend = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!out.document || !Number.isFinite(out.capUsd)) throw new Error('--document and --cap-usd are required');
  return out;
}

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
  const options = args(argv);
  const packetMeta = preparePacket({ root, documentPath: options.document });
  const common = { packet: packetMeta.text, documentPath: options.document,
    capUsd: options.capUsd, maxTokens: options.maxTokens };
  const dry = await runKimiOnly({ ...common, confirmed: false });
  const p = dry.preflight;
  console.log(`[kimi-only] status=preflight-only packet_sha256=${p.packetSha256}`);
  console.log(`[kimi-only] model=${p.model} calls=1 executed=0 worst_case_usd=${p.worstCaseUsd.toFixed(4)} cap_usd=${p.sharedCapUsd.toFixed(4)} allowed=${p.allowed}`);
  if (!options.confirmSpend) return dry;
  if (!p.allowed) throw new Error(p.blockReason);

  loadEnv(root, process.env);
  const runId = sha256(`${packetMeta.sha256}:${randomBytes(12).toString('hex')}`).slice(0, 16);
  const receiptSink = createReceiptSink({ root, packetMeta, capUsd: options.capUsd, runId });
  const result = await runKimiOnly({ ...common, confirmed: true, receiptSink, runId });
  const outDir = resolve(root, options.outDir || join('.ai-workflow', 'kimi-panel', 'runs', runId));
  mkdirSync(outDir, { recursive: true });
  const output = join(outDir, 'final-verdict.json');
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[kimi-only] status=complete run_id=${runId} cost_usd=${result.spendUsd.toFixed(4)} verdict=${result.final.verdict}`);
  console.log(`[kimi-only] output=${output}`);
  return result;
}

export function runCli() {
  main().catch((error) => { console.error(`[kimi-only] ${error.message}`); process.exitCode = 1; });
}
