#!/usr/bin/env node
/**
 * packet-gate.mjs — zero-call preflight for the `--document` lane of every outbound model call.
 * ==============================================================================================
 * THE INVARIANT: the model's context contains the real artifact — provably, mechanically — or the
 * call does not happen.
 *
 * WHAT THIS IS NOT. It is not a second packet compiler. `scripts/context-gateway/` already builds
 * packets from the repo mechanically and is byte-exact by construction; this gate deliberately does
 * not re-check that lane. It governs `consult-*.mjs --document <file.md>`, where an arbitrary
 * hand-authored markdown file goes to a paid model with nothing mechanical in between.
 *
 * MAKES NO MODEL CALLS. Ever. It builds the verdict, prints the approval view, and stops.
 * Spend approval is human — that is a settled owner decision, not a default.
 *
 * Exit codes:  0 = cleared for send (a human still has to run the send command)
 *              1 = REFUSED, nothing sent, remedies printed
 *              2 = gate could not run (fail-closed; treated as refusal)
 *
 * Usage:
 *   node scripts/packet-gate.mjs --document docs/…/PACKET.md \
 *        [--remit "…"] [--provider kimi] [--budget-chars 24000] [--max-tokens 60000] [--json]
 *
 * @module packet-gate
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAnchors } from './context-gateway/src/anchors.mjs';
import { getProvider, estimateCost } from './context-gateway/src/providers.mjs';
import { gateSourceHash } from './packet-gate/source-hash.mjs';
import { report } from './packet-gate/report.mjs';
import { GateUnavailable, makeResolver, scanSecrets, loadSelftest, readCitedFile } from './packet-gate/repo-io.mjs';
import { isUnverifiedFence } from './packet-gate/fences.mjs';
import { parseFences, remitFromDoc, checkProvenance, checkArtifact, checkPremises, checkSize, checkHygiene, checkCanary } from './packet-gate/checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The document is NOT the prompt. `context-gateway/src/consult.mjs` assembles
 *   prompt = <provider remit> + <fence scaffolding> + <document> + <seed>
 * and the wrappers prepend a substantial fixed remit — consult-kimi.mjs alone is ~1,738 chars,
 * plus ~250 chars of `=====` section fencing. Measuring only the document under-reports the very
 * quantity R1 exists to bound, and by an UNBOUNDED amount whenever --seed is used.
 *
 * Conservative default with headroom; override with --overhead-chars when a wrapper's remit grows.
 */
const TRANSPORT_OVERHEAD_CHARS = 2_200;

function parseArgs(argv) {
  const a = { budgetChars: 24_000, maxTokens: 60_000, provider: 'kimi', json: false, overheadChars: TRANSPORT_OVERHEAD_CHARS };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--json') { a.json = true; continue; }
    const v = argv[i + 1];
    if (k === '--document') { a.document = v; i += 1; }
    else if (k === '--seed') { a.seed = v; i += 1; }
    else if (k === '--remit') { a.remit = v; i += 1; }
    else if (k === '--provider') { a.provider = v; i += 1; }
    else if (k === '--budget-chars') { a.budgetChars = Number(v); i += 1; }
    else if (k === '--overhead-chars') { a.overheadChars = Number(v); i += 1; }
    else if (k === '--max-tokens') { a.maxTokens = Number(v); i += 1; }
  }
  // A non-numeric flag value would make every comparison false and silently disable the check.
  // maxTokens was unvalidated: `--max-tokens abc` produced NaN, and `NaN != null` is TRUE, so the
  // preflight printed `worst_case_usd=~$NaN` and exited 0 — destroying the single piece of cost
  // information the human approver relies on (Kimi K3 S5, 2026-08-14).
  // NON-NEGATIVE, not merely finite. `--overhead-chars -29000` passed Number.isFinite and SHRANK
  // the assembled total: a 30,003-char document measured as 1,033 and R1 stayed silent. A size gate
  // whose input can go negative is not a size gate (HY3 S5, 2026-08-14).
  const nonNeg = (n) => Number.isFinite(n) && n >= 0;
  if (!nonNeg(a.budgetChars) || !nonNeg(a.overheadChars) || !nonNeg(a.maxTokens)) a.bad = true;
  return a;
}

// ---------------------------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.document) {
    console.error('packet-gate: --document <path> is required');
    return 2;
  }
  if (args.bad) {
    console.error('packet-gate: --budget-chars, --overhead-chars and --max-tokens must be non-negative numbers');
    return 2;
  }
  const docPath = path.resolve(ROOT, args.document);
  if (!existsSync(docPath)) {
    console.error(`packet-gate: document not found: ${args.document}`);
    return 2;
  }
  const md = readFileSync(docPath, 'utf8');

  // --- Gate 0: R15. If the gates are not provably working, nothing else here can be believed. ---
  const canary = checkCanary(loadSelftest(ROOT), { sourceHash: gateSourceHash() });
  if (canary.length) return report({ args, findings: canary, warnings: [], stats: null, gate0: true });

  // FAIL-CLOSED on an absent remit. R4 and R5 are both derived from the remit's anchors, so an
  // empty remit does not make them pass — it makes them unevaluable, and a gate that cannot run
  // must never report clean. Without this, "omit the remit" is a one-word bypass of two checks.
  // Exit 2 (gate could not run), not a seventh refusal code: v1 ships exactly six.
  const remit = (args.remit ?? remitFromDoc(md)).trim();
  if (!remit) {
    console.error('packet-gate: no remit found — pass --remit "…" or add a "## Remit" section to the document.');
    console.error('  Refusing to certify: R4 and R5 are unevaluable without a remit, and an unevaluable gate is not a passing gate.');
    return 2;
  }
  const anchors = extractAnchors(remit);
  const blocks = parseFences(md);
  const resolve = makeResolver(ROOT);

  // A remit "asks about code" when it names a concrete code handle. Mechanical, so it is testable
  // and so the judgment lives in exactly one place.
  const aboutCode = (anchors.paths.length + anchors.routes.length + anchors.symbols.length) > 0;

  // THE BYPASS THIS GATE EXISTED TO PREVENT, AND ALMOST SHIPPED WITH.
  // `aboutCode` decides whether the artifact invariant applies AT ALL, and the packet author writes
  // the remit that determines it. So: hand-type fabricated fences with no `path=`, write a remit
  // naming nothing ("Review this module for correctness"), and R4 returned [] unconditionally while
  // R5 had no anchors to resolve — PACKET READY, exit 0, fabricated code on the wire. That is
  // review-2 with extra steps, and it was the DEFAULT outcome for any plainly-worded remit.
  // Kimi K3 S1, 2026-08-14 — the single most valuable finding of the review.
  //
  // Resolution: a packet carrying code whose remit names nothing is UNEVALUABLE, not exempt. Exit 2.
  // A genuinely non-code packet (no code fences at all) is unaffected.
  // ANY uncited fence counts — language is deliberately NOT consulted. The previous version
  // required `b.lang`, so a bare ``` fence (falsy lang) sailed past this guard AND the warning
  // below, reopening the exact bypass round 1 closed. Excluding json/yaml/text was equally wrong:
  // a hand-typed ```yaml config or ```json "API response" is a classic fabrication vehicle.
  //
  // Accepted cost, stated plainly: a strategy packet carrying an illustrative ```text snippet and a
  // remit that names nothing now exits 2. That is a false refusal, and the remedy is one line —
  // name what the remit is about, or cite the source. Erring here is correct: the alternative is a
  // gate that prints "no code fences present" over a packet full of fabricated code, which is what
  // it did before this change.
  const unverifiedFences = blocks.filter(isUnverifiedFence);
  if (!aboutCode && unverifiedFences.length) {
    console.error('packet-gate: the remit names no file, route, or symbol, but the packet contains code fences.');
    console.error('  Refusing to certify: R4 and R5 are unevaluable, so "artifact not required" would be a bypass,');
    console.error('  not a verdict. Name what the remit is about (a path/route/symbol) and re-run.');
    return 2;
  }

  // The assembled prompt, not the document alone — see TRANSPORT_OVERHEAD_CHARS.
  // A NAMED-BUT-MISSING seed used to measure as zero bytes and pass. The send command resolves the
  // seed independently, so if it existed there the real prompt exceeded what R1 measured by an
  // unbounded amount — fail-open on exactly the quantity R1 exists to bound (Kimi K3 S3).
  let seedText = '';
  if (args.seed) {
    const seedPath = path.resolve(ROOT, args.seed);
    if (!existsSync(seedPath)) {
      console.error(`packet-gate: --seed not found: ${args.seed}`);
      console.error('  Refusing to certify: an unmeasured seed makes the size check meaningless.');
      return 2;
    }
    seedText = readFileSync(seedPath, 'utf8');
  }
  const assembled = {
    doc: md.length,
    seed: seedText.length,
    overhead: args.overheadChars,
    chars: md.length + seedText.length + args.overheadChars,
    bytes: Buffer.byteLength(md, 'utf8') + Buffer.byteLength(seedText, 'utf8') + args.overheadChars,
  };

  // The SEED was never scanned: `scanSecrets(ROOT, md)` covered the document only, while the
  // comment above claimed the "assembled packet" and the preflight printed "HYGIENE clean [ok]".
  // A secret in --seed reached the paid model with the gate reporting clean (HY3 S2, 2026-08-14).
  const hygiene = scanSecrets(ROOT, seedText ? `${md}
${seedText}` : md);
  if (hygiene.unavailable) {
    console.error('packet-gate: secret scanner unavailable (bash not found on PATH) — cannot verify hygiene.');
    console.error('  Refusing to certify. This is "the gate could not run", not "the packet is clean".');
    return 2;
  }

  const premises = checkPremises(anchors, resolve);
  const findings = [
    ...premises.findings,
    ...checkArtifact(aboutCode, blocks, anchors.paths),
    ...checkProvenance(blocks, (p) => readCitedFile(ROOT, p)),
    ...checkHygiene(hygiene),
    ...checkSize(assembled.chars, args.budgetChars),
  ];

  // An unknown provider used to be swallowed: no cost estimate (the ONE number the human approver
  // gets) and a printed send command for a script that may not exist — all at exit 0. A misspelled
  // flag must not yield a clean gate (Kimi K3 S5, 2026-08-14).
  let usd = null;
  try {
    usd = estimateCost(getProvider(args.provider), assembled.bytes, args.maxTokens);
  } catch (err) {
    console.error(`packet-gate: unknown provider "${args.provider}" (${err.message}).`);
    console.error('  Refusing to certify: without a known provider there is no cost estimate to approve.');
    return 2;
  }

  // R4 is satisfied by ONE cited block, so a packet can pair real source with hand-typed fences the
  // model will read as equally authoritative. Refusing would punish legitimate illustrative
  // snippets and breed refusal fatigue, so v1 surfaces it instead of blocking — the operator sees
  // exactly how much of what they are sending is unverified. Promote to a refusal only if measured
  // abuse justifies it (blueprint R16, deferred until measured).
  // Same predicate as the guard above — deliberately the SAME variable, not a second filter.
  // Two copies of a security predicate is a drift canary waiting to fire, and it already fired
  // once: the guard and the warning shared a defect, so the bypass produced neither.
  const uncitedCode = unverifiedFences;
  const warnings = [...premises.warnings];
  if (aboutCode && uncitedCode.length) {
    warnings.push(`${uncitedCode.length} uncited fence(s) at line(s) ${uncitedCode.map((b) => b.start).join(', ')} — NOT byte-verified; the model cannot tell them from the cited source`);
  }

  return report({
    args, findings, warnings,
    stats: { assembled, blocks, anchors, aboutCode, usd, remit },
  });
}

// Only run the CLI when this file IS the entry point. Without the guard, any module that imports
// a helper from here (the selftest imports the source hash) would execute the gate and exit.
const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// A checker that cannot run exits 2 — never 1 (a refusal) and never 0 (a pass).
if (isEntry) try {
  process.exit(main());
} catch (err) {
  if (err instanceof GateUnavailable) {
    console.error(`packet-gate: ${err.message}`);
    console.error('  Refusing to certify: a checker could not run, which is not the same as passing.');
    process.exit(2);
  }
  console.error(`packet-gate: unexpected failure — ${err?.stack ?? err}`);
  process.exit(2);
}
