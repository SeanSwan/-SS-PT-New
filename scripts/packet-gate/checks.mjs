/**
 * checks.mjs — remit extraction, R3-uncited, R5, R1, R6 — and the one import surface for all six.
 * ===============================================================================================
 * THE INVARIANT: the model's context contains the real artifact — provably, mechanically —
 * or the call does not happen.
 *
 * WHERE THE CHECKS ACTUALLY LIVE. This file grew to 435 lines in round 4, breaching the 300-line
 * cap (CLAUDE.md rule 4) — a breach the previous handoff reported as compliant, so it is stated
 * plainly here: R3's byte-verification moved to ./provenance.mjs and R4's artifact binding to
 * ./artifact.mjs, both unchanged by the move. This file keeps remit extraction, the uncited-fence
 * refusal, R5, R1 and R6, and re-exports every check so callers still have ONE import surface and
 * do not have to know which file a check lives in.
 *
 * SCOPE, and why it is narrow. `scripts/context-gateway/` already compiles packets from the
 * repo mechanically: safeRead pulls line windows, packet.mjs stamps each with a blob SHA,
 * egress.mjs strips secret VALUES, providers.mjs enforces the sensitivity ceiling. That lane
 * is byte-exact by construction and is NOT re-checked here.
 *
 * This module governs the OTHER lane — `consult-*.mjs --document <file.md>` — where a human or
 * agent hands an arbitrary hand-authored markdown file to a paid model. Nothing mechanical
 * stands between a typed-from-memory code block and the wire. That is the lane where review-2
 * cost $0.0849 for a prose description and returned 1-of-3 verified findings, and where a review
 * spent a finding on `/unblock` — a route that does not exist in this repo.
 *
 * Every function here is PURE: I/O is injected by the caller so each gate can be driven red by
 * the canary suite. A gate that cannot be made to fail is presumed failed (R15).
 *
 * v1 ships exactly six codes. The blueprint lists sixteen; the other ten are deferred until
 * measured, because the top-ranked failure mode of this whole design is operators routing around
 * an expensive gate. Every refusal must therefore be cheap to clear.
 *
 * @module packet-gate/checks
 */

// One source of truth for the codes — ./refusal.mjs — so checks.mjs and canary.mjs cannot drift
// into two vocabularies. Re-exported here because callers import the gate's vocabulary from checks.
import { REFUSALS, finding } from './refusal.mjs';
import { normalizeEol, normPath, splitDocLines } from './normalize.mjs';

// ONE import surface for the gate's vocabulary. The checks themselves live in four files for the
// 300-line cap (rule 4); callers should not have to know which.
export { REFUSALS, normPath, normalizeEol };
export { parseFences, isUnverifiedFence, parseFencesFrom, blockWhere, fenceParseAnomalies } from './fences.mjs';
export { checkProvenance } from './provenance.mjs';         // R3
export { checkArtifact, isCodeBlock, mentions, hasBindingAnchors } from './artifact.mjs'; // R4
export { checkCanary } from './canary.mjs';                 // R15

export { remitFromDoc } from './remit.mjs';

import { isUnverifiedFence, blockWhere } from './fences.mjs';

/**
 * Uncited fences are unproven provenance — a REFUSAL (R3), not a bare `return 2` from the CLI.
 *
 * The behaviour is unchanged in strictness and changed in kind. Round 3 correctly made an uncited
 * fence block the send; it did so by returning 2 straight out of `main()`, which had three costs:
 *   - exit 2 is defined in this gate's header as "the gate could not run". An uncited fence is a
 *     PACKET DEFECT, so automation that distinguishes "refused" from "broken" misfiled the single
 *     most common refusal.
 *   - with `--json` the operator got NO machine-readable output at all — two lines on stderr.
 *   - it ran before every other check, so a packet with an uncited fence AND a phantom premise AND
 *     a secret reported only the fence. The operator fixes one, re-runs, and meets the next: the
 *     refusal-fatigue generator this design says it exists to avoid. Measured, not theorised — a
 *     packet carrying both an uncited fence and a phantom path reported only the fence.
 *
 * As a pure check it is also drivable red by the canary suite, which `return 2` inside `main` was
 * not. R15's rule is that a gate which cannot be made to fail is presumed failed.
 *
 * It stays R3 rather than becoming a seventh code: v1 ships exactly six, and "content whose
 * provenance is unproven" is precisely what R3 governs.
 */
export function checkUncited(blocks, allowUncited = false) {
  if (allowUncited) return [];
  const un = blocks.filter(isUnverifiedFence);
  if (!un.length) return [];
  return [finding('R3', `${un.length} uncited fence(s) at ${un.map(blockWhere).join(', ')} — NOT byte-verified; the model cannot tell them from the cited source, so they are indistinguishable from fabrication`,
    'cite them (```lang path=… lines=…), delete them, or pass --allow-uncited to accept them deliberately')];
}

// ---------------------------------------------------------------------------------------------
// R5 — phantom premise
// ---------------------------------------------------------------------------------------------

/**
 * Every concrete handle the remit names must resolve in the repo.
 *
 * PRECISION CHOICE, deliberate: paths and routes REFUSE; bare symbols only WARN.
 * A remit legitimately names symbols that do not exist yet ("add a validatePacket helper"), and
 * refusing on those would train the operator that refusals are noise — which is how the real
 * failure later sails through. Paths and routes are high-precision: `/unblock` was a route, and
 * that is the evidenced failure this check is built from.
 *
 * @param {(needle:string, kind:string)=>boolean} resolve  injected repo lookup
 */
export function checkPremises(anchors, resolve, allowMissing = []) {
  const out = [];
  const warnings = [];
  // BOTH spellings, so the paths branch and the routes branch cannot disagree about one flag.
  // Round 6 added `--allow-missing` for routes and compared it RAW (`allowed.has(String(r))`) while
  // the paths branch compared it NORMALIZED — two comparisons for one flag, in one function, which
  // is the drift hazard this codebase has now paid for five separate times. A route is not a
  // filesystem path (normPath would mangle a leading slash), so instead of forcing one normalizer
  // onto both, the set carries the raw AND normalized form of every allowance and each branch may
  // match either. (Kimi K3 round 6, F5.)
  const allowed = new Set(allowMissing.flatMap((p) => [String(p), normPath(p)]));

  for (const p of anchors.paths ?? []) {
    // A remit may legitimately name a file that does not exist yet ("add src/validate.mjs; here is
    // the call site"). The old remedy said "state explicitly that it is to be created" — but there
    // was NO mechanism to state it. An unactionable remedy is a refusal-fatigue generator, and the
    // symbols branch below had already solved the same problem with a warning (Kimi K3 round 3, M2).
    // `--allow-missing <path>` is that mechanism: explicit, per-path, and visible in the receipt.
    if (allowed.has(String(p)) || allowed.has(normPath(p))) {
      warnings.push(`path ${p} does not exist and was explicitly allowed via --allow-missing`);
      continue;
    }
    if (!resolve(p, 'path')) {
      out.push(finding('R5', `remit names path ${p} — 0 hits in repo`,
        `correct the path, or pass --allow-missing ${p} if the remit is about creating it`));
    }
  }
  for (const r of anchors.routes ?? []) {
    // ROUTES GET THE SAME MECHANISM PATHS HAVE. The remedy here used to be "correct the route term",
    // which is unactionable for the perfectly ordinary remit "review the new handler for POST
    // /api/widget — the route is being added in this change": the route is correct once the change
    // lands. The path-shaped version of that identical packet cleared via one flag while the
    // route-shaped version was a dead end, and an unactionable remedy is what teaches an operator to
    // route around the gate. Same asymmetry the symbols branch already avoided by warning.
    if (allowed.has(String(r)) || allowed.has(normPath(r))) {
      warnings.push(`route ${r} does not resolve and was explicitly allowed via --allow-missing`);
      continue;
    }
    if (!resolve(r, 'route')) {
      out.push(finding('R5', `remit names route ${r} — 0 hits in repo`,
        `correct the route term, or pass --allow-missing ${r} if the remit is about creating it. Reviewing phantoms is exactly how a paid review burned a finding on /unblock`));
    }
  }
  for (const s of anchors.symbols ?? []) {
    if (!resolve(s, 'symbol')) warnings.push(`symbol ${s} — 0 hits (not a refusal: may be intended as new)`);
  }
  return { findings: out, warnings };
}

// ---------------------------------------------------------------------------------------------
// R1 / R6 / R15
// ---------------------------------------------------------------------------------------------

/**
 * R1 — the packet must fit the context budget.
 *
 * OWNER DECISION, settled, do not re-litigate: refuse and make the operator narrow it.
 * NEVER substitute a summary. A summary is the description failure with extra steps.
 *
 * Note this is a *context* budget, not a spend cap: it can bind while cap-usd would clear.
 */
export function checkSize(chars, budgetChars) {
  if (chars <= budgetChars) return [];
  return [finding('R1', `${chars.toLocaleString()} chars > ${budgetChars.toLocaleString()} budget (over by ${(chars - budgetChars).toLocaleString()})`,
    'pick a cut: drop a file, or split the remit. The gate will not summarize to fit')];
}

/**
 * R6 — secrets/PII in the assembled packet.
 *
 * REFUSE; do not auto-redact. This is a deliberate divergence from egress.mjs, which auto-redacts
 * and is correct to do so: egress governs windows the compiler pulled mechanically, where a hit is
 * an accident of the source file. Here a hit means a human put a secret in a document by hand, and
 * silently rewriting their prose can destroy the very lines under review — auth code mentions
 * tokens by nature. Sanitization is an operator decision, then re-run.
 *
 * @param {{ok:boolean, lines:string[]}} scan  result of the injected scanner; lines are locations,
 *   never matched content (Rule 59: never re-emit the value).
 */
export function checkHygiene(scan) {
  if (scan.ok) return [];
  return [finding('R6', `secret/PII scan hit:\n    ${scan.lines.join('\n    ')}`,
    'sanitize the source document yourself, then re-run. This gate will not silently redact your prose')];
}
