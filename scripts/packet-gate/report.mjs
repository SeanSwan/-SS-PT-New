/**
 * report.mjs — the operator-facing rendering of a gate verdict.
 * =============================================================
 * Split out of packet-gate.mjs to keep both files under the 300-line cap (CLAUDE.md rule 4), and
 * because presentation is genuinely a separate job from deciding: nothing here may change a verdict.
 *
 * Two design rules carried over from the refusal-fatigue analysis:
 *   - Every refusal prints its own remedy. A refusal with no next action is a bug in the gate, not
 *     the operator's problem.
 *   - The size line always shows its breakdown, because the document is not the prompt and an
 *     operator who cannot see the overhead cannot reason about the budget.
 *
 * @module packet-gate/report
 */

const BAR = '='.repeat(78);
const bar = '-'.repeat(78);

/** @returns {number} the process exit code: 0 cleared, 1 refused. */
export function report({ args, findings, warnings, stats, gate0 = false }) {
  if (args.json) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings, warnings, assembled: stats?.assembled ?? null }, null, 2));
    return findings.length ? 1 : 0;
  }
  return findings.length ? renderBlocked(args, findings, gate0) : renderReady(args, warnings, stats);
}

function renderBlocked(args, findings, gate0) {
  console.log(BAR);
  console.log(`BLOCKED — NOTHING SENT${gate0 ? '   (gate 0: the checkers themselves)' : ''}`);
  console.log(`document: ${args.document}`);
  console.log(bar);
  for (const f of findings) {
    console.log(`${f.code} ${f.label.toUpperCase()}`);
    for (const line of String(f.detail).split('\n')) console.log(`   ${line}`);
    console.log(`   → ${f.remedy}`);
    console.log('');
  }
  console.log('This gate will NOT summarize to fit, and will NOT silently redact. Pick a remedy.');
  console.log(BAR);
  return 1;
}

function renderReady(args, warnings, stats) {
  const A = stats.assembled;
  const cited = stats.blocks.filter((b) => b.cited).length;

  console.log(BAR);
  console.log('PACKET READY — NOT SENT');
  console.log(`document: ${args.document}`);
  console.log(bar);
  console.log(`ARTIFACTS   ${cited} cited block(s), all byte-verified against the repo [ok]`);
  console.log(`PREMISES    ${stats.anchors.paths.length} path(s), ${stats.anchors.routes.length} route(s) — all resolved [ok]`);
  console.log(`REMIT       ${stats.aboutCode ? 'about code — cited artifact present [ok]' : 'not code-specific — no code fences present'}`);
  console.log('HYGIENE     secrets/PII scan of document + seed: clean [ok]');
  console.log(`SIZE        ${A.chars.toLocaleString()} chars <= ${args.budgetChars.toLocaleString()} budget [ok]`);
  console.log(`            = doc ${A.doc.toLocaleString()} + seed ${A.seed.toLocaleString()} + transport overhead ${A.overhead.toLocaleString()}`);
  for (const w of warnings) console.log(`WARN        ${w}`);
  console.log(bar);
  console.log('PREFLIGHT (0 model calls)');
  console.log(`   model_calls=0  provider=${args.provider}  prompt_chars=${A.chars}  max_tokens=${args.maxTokens}`);
  if (stats.usd != null) console.log(`   worst_case_usd=~$${stats.usd.toFixed(4)}`);
  console.log(bar);
  console.log('>>> STOPS HERE. Spend approval is human.');

  // If --remit was supplied at gate time it MUST be supplied at send time: otherwise the gate
  // certifies remit A while the model answers remit B, and R4/R5 evaluated text nobody sent.
  const remitArg = args.remit ? ` --remit ${JSON.stringify(args.remit)}` : '';
  const seedArg = args.seed ? ` --seed ${args.seed}` : '';
  console.log(`send: node scripts/consult-${args.provider}.mjs --document ${args.document}${seedArg}${remitArg} --out <reviews/…md>`);
  if (args.remit) console.log('      ^ --remit is REQUIRED at send time: the gate verified THIS remit, not the one in the document.');
  console.log(BAR);
  return 0;
}
