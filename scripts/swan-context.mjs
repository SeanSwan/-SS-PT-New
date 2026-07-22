#!/usr/bin/env node
/**
 * swan-context.mjs — CLI for the Swan Context Gateway (dry-run commands only in Phase 1).
 * ========================================================================================
 * Commands:
 *   compile "<question>" [--issue SWA-123] [--budget <chars>] [--out <packet.json>] [--full]
 *       Deterministic dry-run: question → immutable evidence packet. NO network, NO provider
 *       call, $0 by construction. Prints the manifest summary; --out writes the full packet
 *       (windows included) as JSON for later `ask --packet` (Phase 2). --full prints windows.
 *   bench [--case <id>]
 *       Run the Phase 0 historical benchmark against this checkout and print gate verdicts.
 *
 * Provider calls (`ask`, `verify`) are Phase 2 — this file intentionally has no transport.
 *
 * @module swan-context
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileContext } from './context-gateway/src/compile.mjs';
import { gitTrackedFiles } from './context-gateway/src/safeRead.mjs';
import { runBenchmark, runCase } from './context-gateway/src/evaluate.mjs';
import { CASES, GATES } from './context-gateway/bench/cases.mjs';
import { getProvider, enforceCeiling, assertSpend } from './context-gateway/src/providers.mjs';
import { loadEnv, buildPrompt, callProvider } from './context-gateway/src/transport.mjs';
import { reconstructPacket, writeReceipt } from './context-gateway/src/receipt.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, def = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const ROOT = resolve(flag('root', process.cwd()));

function usage() {
  console.log(`usage:
  node scripts/swan-context.mjs compile "<question>" [--issue SWA-N] [--budget chars] [--out packet.json] [--full]
  node scripts/swan-context.mjs bench [--case id]
  node scripts/swan-context.mjs ask --packet packet.json --provider fable|sol|kimi [--max-tokens N] [--effort low|medium|high] [--answer-out path]   (SPENDS — needs SWAN_CONTEXT_MAX_USD)
  node scripts/swan-context.mjs verify --packet packet.json --answer answer.md   ($0)`);
  process.exit(1);
}

function loadPacketFile() {
  const p = flag('packet');
  if (!p) usage();
  return { saved: JSON.parse(readFileSync(p, 'utf-8')), path: p };
}

if (cmd === 'compile') {
  const question = argv.slice(1).find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') === false) ?? argv[1];
  if (!question || question.startsWith('--')) usage();
  const tracked = gitTrackedFiles(ROOT);
  const t0 = Date.now();
  const { packet, manifest, report } = compileContext({
    root: ROOT, question, tracked,
    originatingModel: process.env.SWAN_CONTEXT_MODEL || 'claude-fable-5',
    issue: flag('issue'), budgetChars: Number(flag('budget')) || undefined,
    issueNotes: flag('issue-notes') ? readFileSync(flag('issue-notes'), 'utf-8') : null,
  });
  console.log(`[swan-context] compiled in ${Date.now() - t0}ms — HEAD ${manifest.headSha.slice(0, 12)} — ${manifest.evidenceCount} evidence, ${report.spentChars}/${report.budgetChars} chars`);
  for (const e of manifest.evidence) console.log(`  ${e.id} ${e.tier} ${e.path} L${e.startLine}-L${e.endLine}`);
  if (report.excluded.length) console.log(`excluded: ${report.excluded.length} (${[...new Set(report.excluded.map((x) => x.reason))].join(', ')})`);
  if (flag('out')) {
    const full = { manifest, evidence: packet.getEvidence(), report };
    writeFileSync(flag('out'), JSON.stringify(full, null, 2));
    console.log(`[swan-context] packet -> ${flag('out')}`);
  } else if (argv.includes('--full')) {
    for (const e of packet.getEvidence()) console.log(`\n===== ${e.id} ${e.path} L${e.startLine}-L${e.endLine} (${e.tier}) =====\n${e.content}`);
  }
} else if (cmd === 'bench') {
  const tracked = gitTrackedFiles(ROOT);
  const only = flag('case');
  const cases = only ? CASES.filter((c) => String(c.id) === only) : CASES;
  const t0 = Date.now();
  if (only && cases.length === 1) {
    console.log(JSON.stringify(runCase(cases[0], { root: ROOT, tracked }), null, 2));
  } else {
    const { results, metrics } = runBenchmark(cases, GATES, { root: ROOT, tracked });
    for (const r of results) {
      const s = r.surface ? ` surface ${r.surface.hit}/${r.surface.total} tests ${r.tests.hit}/${r.tests.total}` : '';
      console.log(`  ${String(r.id).padStart(2)} ${r.status.padEnd(8)} ${r.name}${s}${r.status === 'MISS' ? ` — missed: ${[...r.surface.missed, ...r.tests.missed].join(', ')}` : ''}${r.detail ? ` — ${r.detail}` : ''}`);
    }
    console.log(`\n[bench] ${metrics.scored} scored, ${metrics.deferred} deferred, ${metrics.invalid} invalid — ${Date.now() - t0}ms`);
    console.log(`[bench] surface recall ${metrics.surfaceRecall} (gate ≥${GATES.surfaceRecall}: ${metrics.surfaceGate}) — test recall ${metrics.testRecall} (gate ≥${GATES.testRecall}: ${metrics.testGate})`);
    process.exitCode = metrics.surfaceGate === 'PASS' && metrics.testGate === 'PASS' ? 0 : 2;
  }
} else if (cmd === 'ask') {
  const { saved } = loadPacketFile();
  loadEnv(ROOT);
  try {
    const provider = getProvider(flag('provider') ?? usage());
    const packet = reconstructPacket(saved);             // validates manifest/evidence integrity
    enforceCeiling(provider, saved.manifest);            // T10 — throws with offending evidence listed
    const maxTokens = Number(flag('max-tokens')) || 8000;
    const prompt = buildPrompt(provider, saved.manifest, saved.evidence);
    const spend = assertSpend(provider, prompt.length, maxTokens); // T8 — fail-closed without cap
    console.log(`[swan-context] ask ${provider.name} (${provider.model}) — prompt ~${Math.round(prompt.length / 4)} tok, est ~$${spend.estimate.toFixed(4)} (cap $${spend.cap})`);
    const result = await callProvider(provider, prompt, { maxTokens, effort: flag('effort'), manifest: saved.manifest });
    const audit = packet.auditAnswer(result.text);
    const stamp = `${saved.manifest.headSha.slice(0, 12)}-${Date.now()}`;
    const receiptPath = writeReceipt({ root: ROOT, stamp, provider, result, manifest: saved.manifest, audit, spend });
    const answerOut = flag('answer-out', receiptPath.replace(/\.md$/, '.answer.md'));
    writeFileSync(answerOut, result.text, 'utf-8');
    console.log(`[swan-context] ${result.inTok} in / ${result.outTok} out — $${result.cost.toFixed(4)} — ${(result.wallMs / 1000).toFixed(1)}s`);
    console.log(`[swan-context] citations: ${audit.valid} valid / ${audit.invalid.length} invalid${audit.uncited ? ' — UNCITED ANSWER' : ''}`);
    console.log(`[swan-context] answer -> ${answerOut}\n[swan-context] receipt -> ${receiptPath}`);
    if (audit.invalid.length) process.exitCode = 3;
  } catch (e) {
    // Refusals (ceiling/spend/unknown-provider) are expected outcomes, not crashes.
    if (e?.code && ['UNKNOWN_PROVIDER', 'CEILING', 'SPEND_CAP', 'NO_CAP'].includes(e.code)) {
      console.error(`[swan-context] REFUSED ${e.message}`);
      if (Array.isArray(e.detail)) for (const d of e.detail) console.error(`  - ${d}`);
      process.exit(2);
    }
    throw e;
  }
} else if (cmd === 'verify') {
  const { saved } = loadPacketFile();
  const answer = readFileSync(flag('answer') ?? usage(), 'utf-8');
  const audit = reconstructPacket(saved).auditAnswer(answer);
  console.log(JSON.stringify({ valid: audit.valid, invalid: audit.invalid, uncited: audit.uncited }, null, 2));
  process.exitCode = audit.invalid.length || audit.uncited ? 3 : 0;
} else usage();
