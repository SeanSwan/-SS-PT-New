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

/**
 * Pull the remit out of a packet document: a `## Remit` section, else a `remit:` frontmatter line.
 *
 * Deliberately line-based, not a regex with a lookahead. The first version used
 * `(?=^##\s|\Z)` — but `\Z` is not a JavaScript assertion. Under `/i` it matched the literal
 * letter `z`, so the remit silently truncated at the first "z" in the text ("Is the authori…"),
 * which dropped every anchor after it and silently disabled R4 and R5. The gate reported a clean
 * premise check because it had nothing left to check. That is exactly the decorative-gate failure
 * this module exists to prevent, so the parser is now boring on purpose and canaried below.
 */
export function remitFromDoc(md) {
  // Same CRLF trap as parseFences, and it bit here too: `/^remit:\s*(.+)$/` cannot match a line
  // ending in `\r`, because `.` excludes line terminators — so frontmatter-style remits vanished
  // from every CRLF document, taking R4's and R5's anchors with them.
  const lines = splitDocLines(md);

  // FENCE-AWARE. A `## Remit` heading or a `remit:` line INSIDE a code fence is sample content,
  // not the packet's question. Without this, a packet that merely documents a remit (a YAML sample,
  // a quoted example) hijacks extraction and the gate evaluates text the model was never asked.
  const outside = [];
  let fence = null;
  for (const line of lines) {
    // `[^\n]*`, matching parseFences: `.` excludes Unicode line terminators, so a fence line
    // carrying one would go unnoticed here and a `## Remit` heading inside that fence would hijack
    // extraction — the fence-awareness this loop exists for, silently switched off.
    const m = /^[ \t]*(`{3,}|~{3,})([^\n]*)$/.exec(line);
    if (m) {
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === '') fence = null;
      outside.push(null);
      continue;
    }
    outside.push(fence ? null : line);
  }

  // THE HEADING MAY CARRY THE REMIT INLINE. `/^#{2,}\s*remit\s*$/` required the heading to be the
  // bare word, so `## Remit: review the refund flow` — a completely natural spelling — was not found
  // at all, and the gate exited 2 telling the operator to "add a `## Remit` section" to a document
  // that has one. A remedy the operator has already followed is the refusal-fatigue signature this
  // file names in three other places. (GLM-5.3 round 6, F8.)
  //
  // Trailing punctuation with no text (`## Remit:`) is also accepted; the inline text, when present,
  // becomes the first line of the remit and the following lines still append.
  // The separator must be a COLON, or whitespace before a dash. `\s*[:—–-]` matched `Remit-driven`,
  // `Remit-to-pay`, `Remit-check` — so `## Remit-to-pay reconciliation` anywhere in the document
  // hijacked extraction (findIndex takes the FIRST match), the remit became "to-pay reconciliation"
  // plus that section's body, `aboutCode` went false, and R4 and R5 were both inert while the
  // empty-remit guard stayed silent because the remit was non-empty garbage. That is the exact
  // Category-2 signature the round-5 subheading fix was written about, reintroduced one round later
  // by the inline-remit fix. Both reviewers found it independently. (Kimi K3 F3 / GLM-5.3 F4.)
  // `(?:#+\s*)?` accepts the CLOSED ATX form `## Remit ##`, which is valid CommonMark and was
  // missed — the gate told the operator to add a section the document already had, in a spelling
  // markdown explicitly permits. (Kimi K3 round 8, F3.)
  const HEADING_RE = /^#{2,}\s*remit\s*(?:#+\s*)?(?::\s*(.*)|\s+[—–-]\s*(.*))?$/i;
  const i = outside.findIndex((l) => l !== null && HEADING_RE.test(l.trim()));
  if (i !== -1) {
    // STOP ONLY AT A HEADING OF THE SAME LEVEL OR HIGHER — not at any heading at all.
    //
    // The stop test used `/^#{1,6}\s/`, so a SUBHEADING inside the remit section ended it. A remit
    // written the way people actually write them —
    //     ## Remit
    //     Review the refund flow end to end.
    //     #### In scope
    //     `src/refunds/run.mjs` and its route
    // — extracted only the first sentence. Every anchor below the subheading was dropped before
    // extractAnchors saw it, so `aboutCode` went false, R4 returned [] unconditionally and R5 had
    // nothing to resolve. Both checks silently did not run, which is the Category-2 failure this
    // gate exists to refuse in other people's code, reached through the back door: the fail-closed
    // empty-remit guard never fires because the remit is non-empty, just truncated. A phantom route
    // below the subheading would be blessed. (GLM-5.3 round 5, F3.)
    //
    // This also matches CommonMark, where only a heading of level <= 2 closes a `##` section.
    //
    // Both tests now run on `l.trim()`. They disagreed before — start trimmed, stop did not — so an
    // indented `## path/to/file.mjs` (still an ATX heading in CommonMark at <= 3 spaces) failed the
    // stop test and was ABSORBED into the remit, injecting a real path anchor the operator never
    // wrote and letting R4 be satisfied by citing it instead of the true subject. (Kimi K3 round 5,
    // F6.) One predicate, one spelling, applied at both ends.
    const level = /^(#{2,})/.exec(outside[i].trim())[1].length;
    const rest = outside.slice(i + 1);
    const stop = rest.findIndex((l) => {
      if (l === null) return false;
      const m = /^(#{1,6})\s/.exec(l.trim());
      return Boolean(m) && m[1].length <= level;
    });
    const hm = HEADING_RE.exec(outside[i].trim());
    const inline = (hm?.[1] ?? hm?.[2])?.trim();
    const body = (stop === -1 ? rest : rest.slice(0, stop)).filter((l) => l !== null);
    return [inline || null, ...body].filter((l) => l !== null).join('\n').trim();
  }
  const fm = outside.find((l) => l !== null && /^remit:\s*.+$/i.test(l));
  return fm ? /^remit:\s*(.+)$/i.exec(fm)[1].trim() : '';
}

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
