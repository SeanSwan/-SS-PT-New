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
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAnchors } from './context-gateway/src/anchors.mjs';
import { getProvider, estimateCost } from './context-gateway/src/providers.mjs';
import { gateSourceHash } from './packet-gate/source-hash.mjs';
import { report } from './packet-gate/report.mjs';
import { GateUnavailable, makeResolver, scanSecrets, loadSelftest, readCitedFile } from './packet-gate/repo-io.mjs';
import { isUnverifiedFence, fenceParseAnomalies } from './packet-gate/fences.mjs';
import { parseFences, remitFromDoc, checkProvenance, checkArtifact, checkPremises, checkSize, checkHygiene, checkCanary, checkUncited, hasBindingAnchors, normPath } from './packet-gate/checks.mjs';
import { parseArgs } from './packet-gate/args.mjs';
import { loadSeed } from './packet-gate/seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.document) {
    console.error('packet-gate: --document <path> is required');
    return 2;
  }
  if (args.unknown.length) {
    console.error(`packet-gate: unrecognized flag(s): ${args.unknown.join(', ')}`);
    console.error('  Refusing to certify: a misspelled flag silently reverts to a default the operator did not choose.');
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

  // PARSE INTEGRITY, before any verdict is computed from the parse.
  // A fence-like line the parser did not consume means a lenient reader (the model, a renderer, a
  // human) and this gate disagree about where the code blocks are. Round 4's critical and three
  // round-5 variants were all that disagreement wearing different code points: `\r`, U+2028, a BOM,
  // a non-breaking space. Whichever direction the disagreement runs, every finding computed from
  // the parse is untrustworthy — so this is exit 2 ("the gate could not run"), not a refusal, and
  // it is deliberately NOT reported alongside other findings that would look authoritative.
  const anomalies = fenceParseAnomalies(md);
  if (anomalies.length) {
    console.error(`packet-gate: fence-like line(s) the parser did not consume, at line(s) ${anomalies.join(', ')}.`);
    console.error('  A hidden character (BOM, non-breaking space, U+2028/U+2029) before the backticks makes a fence');
    console.error('  invisible to this gate while the model still reads the content as code.');
    console.error('  Refusing to certify: delete the hidden character so the delimiter starts the line.');
    return 2;
  }

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

  // THE LAST HOLE THE "WARN, DON'T REFUSE" CHOICE LEFT OPEN.
  // When the remit DID name code, uncited fences were only appended to `warnings` and the gate
  // exited 0. So a packet could carry one real byte-verified block — satisfying R3 and R4 — plus an
  // unlimited amount of hand-typed code the model cannot distinguish from it. The invariant says the
  // model's context contains the real artifact provably; it said nothing about what ELSE is in
  // there, and "what else" was the whole attack. (HY3 round 3, finding 1.)
  //
  // The warning was chosen to avoid false-refusing illustrative snippets. Both concerns are now
  // served by making it an EXPLICIT decision instead of a silent one: refuse by default, with a
  // one-flag acknowledgement that lands in the receipt. Same shape as --allow-missing, same reason
  // as "spend approval is human" — the risky choice is available, but a human has to make it and it
  // leaves a trace. This also gives the non-code-remit case (an illustrative ```text block in a
  // strategy packet) an actionable remedy instead of a dead end.
  // ROUND 4: this guard used to `return 2` from here. It is now `checkUncited` in the findings list
  // below — same predicate, same blocking outcome, but as a first-class R3 REFUSAL (exit 1) that
  // carries a remedy, appears in `--json`, and no longer masks every check queued behind it.
  // See checks.mjs:checkUncited for the full reasoning.

  // The earlier `!aboutCode && unverifiedFences.length` guard lived here and has been REMOVED, not
  // weakened. It is fully subsumed by the check above: if uncited fences exist, that check already
  // decides (refuse, or an explicit --allow-uncited acknowledgement); if none exist, this one could
  // never fire. Keeping both meant two predicates disagreeing about the same flag — --allow-uncited
  // cleared one and the other still blocked, with no way for the operator to tell why. That is the
  // duplicate-security-predicate hazard this codebase has now been bitten by three times; the fix is
  // one predicate, not two that agree today.

  // The assembled prompt, not the document alone — see TRANSPORT_OVERHEAD_CHARS.
  // A NAMED-BUT-MISSING seed used to measure as zero bytes and pass. The send command resolves the
  // seed independently, so if it existed there the real prompt exceeded what R1 measured by an
  // unbounded amount — fail-open on exactly the quantity R1 exists to bound (Kimi K3 S3).
  const seed = loadSeed(ROOT, args.seed);
  if (seed.error) { for (const line of seed.error) console.error(line); return 2; }
  const seedText = seed.text;
  const seedBlocks = seed.blocks;

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

  // ONE normalizer, shared with checkPremises and R4's binding. This filter used a raw
  // `Array.includes`, so `--allow-missing src\validate.mjs` cleared R5 (which folds separators) and
  // did NOT clear this — leaving the path in R4's binding, which then demanded a citation of a file
  // that by definition cannot exist. One check's fix contradicting another's requirement, from
  // comparing the same flag two different ways in two files (round 4).
  const allowedMissing = new Set(args.allowMissing.map(normPath));
  const boundPaths = anchors.paths.filter((p) => !allowedMissing.has(normPath(p)));
  const boundContent = [...anchors.routes, ...anchors.symbols].filter((n) => resolve(n, 'symbol'));

  const premises = checkPremises(anchors, resolve, args.allowMissing);
  const findings = [
    ...premises.findings,
    ...checkUncited([...blocks, ...seedBlocks], args.allowUncited),
    // A path the operator declared as not-yet-existing is excluded from R4's binding too. Clearing
    // R5 alone was not enough: R4 then demanded a citation of a file that by definition cannot be
    // cited, so the legitimate "add this file, here is the call site" packet was still impossible to
    // satisfy — one check's fix contradicting another's requirement.
    ...checkArtifact(aboutCode, blocks, boundPaths, boundContent),
    ...checkProvenance([...blocks, ...seedBlocks], (p) => readCitedFile(ROOT, p)),
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
  const uncitedCode = [...unverifiedFences, ...seedBlocks.filter(isUnverifiedFence)];
  const warnings = [...premises.warnings];
  // Only when the operator ACKNOWLEDGED them: without --allow-uncited this is now an R3 finding, and
  // reporting the same fences as both a refusal and a warning is how an operator learns to skim.
  if (args.allowUncited && uncitedCode.length) {
    warnings.push(`${uncitedCode.length} uncited fence(s) at line(s) ${uncitedCode.map((b) => b.start).join(', ')} — NOT byte-verified; accepted deliberately via --allow-uncited`);
  }
  // A CHECK THAT DID NOT RUN MUST SAY SO. If every anchor the remit names was excluded — all paths
  // allow-missing, no resolvable route or symbol — R4's binding returns early and ANY single cited
  // block satisfies R4. That is defensible (there is nothing in the repo left to bind to), but it
  // was SILENT, which is the Category-2 failure this gate is built to refuse in other people's code.
  if (aboutCode && !hasBindingAnchors(boundPaths, boundContent)) {
    warnings.push('R4 binding did not run: every anchor the remit names is allow-missing or unresolvable, so any one cited block satisfies R4');
  }

  return report({
    args, findings, warnings,
    stats: { assembled, blocks, anchors, aboutCode, usd, remit },
  });
}

/**
 * Only run the CLI when this file IS the entry point — but fail toward RUNNING, never toward
 * silence.
 *
 * The first version compared `path.resolve(process.argv[1])` to this module's path. `path.resolve`
 * does NOT resolve symlinks, so invoking the gate through a symlinked path — an npm-bin shim, a
 * `~/bin` link, a CI wrapper linking the script onto PATH — made the comparison fail, `main()` never
 * ran, and the process exited 0 having printed nothing. Every check in this file becomes decorative
 * and the exit code says "cleared". That is the worst possible failure for a gate, produced by a
 * completely ordinary deployment pattern. (Kimi K3 round 3, C1.)
 *
 * NOTE ON EVIDENCE: the symlink vector could not be reproduced on this machine — Windows refuses
 * symlink creation without elevation (EPERM). `path.resolve` not following symlinks is documented
 * Node behaviour, so the defect is [LIKELY] rather than [VERIFIED] here. A drive-letter-case variant
 * WAS tested and did not reproduce (Node canonicalises argv[1]). Fixed regardless: the cost is three
 * lines and the failure mode is total.
 *
 * Both sides are now realpath-resolved, compared case-insensitively on win32, and ANY error falls
 * back to running. A spurious run prints a refusal at worst; a spurious skip is a silent no-op.
 */
function isEntryPoint() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  const canon = (p) => {
    let out = p;
    try { out = realpathSync(p); } catch { /* not yet on disk — fall back to the raw path */ }
    return process.platform === 'win32' ? out.toLowerCase() : out;
  };
  try {
    return canon(path.resolve(process.argv[1])) === canon(self);
  } catch {
    return true; // undecidable → RUN. Never silently skip every check.
  }
}
const isEntry = isEntryPoint();

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
