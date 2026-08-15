/**
 * checks.mjs — the six v1 refusal checks for outbound model-call packets.
 * =======================================================================
 * THE INVARIANT: the model's context contains the real artifact — provably, mechanically —
 * or the call does not happen.
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

/** Stable codes so refusals are greppable in logs and git history. */
export const REFUSALS = {
  R1: 'oversize',
  R3: 'provenance',
  R4: 'no-artifact',
  R5: 'phantom-premise',
  R6: 'hygiene',
  R15: 'canary',
};

/** A finding is one refusal reason plus the operator's next action. A refusal with no next
 *  action is a bug in this gate, not the operator's problem (blueprint §5 item 2). */
const finding = (code, detail, remedy) => ({ code, label: REFUSALS[code], detail, remedy });

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
  const lines = String(md).split('\n');
  const i = lines.findIndex((l) => /^#{2,}\s*remit\s*$/i.test(l.trim()));
  if (i !== -1) {
    const rest = lines.slice(i + 1);
    const stop = rest.findIndex((l) => /^#{1,6}\s/.test(l));
    return (stop === -1 ? rest : rest.slice(0, stop)).join('\n').trim();
  }
  const fm = /^remit:\s*(.+)$/im.exec(md);
  return fm ? fm[1].trim() : '';
}

// Fence parsing lives in ./fences.mjs (rule 4: 300-line cap). Re-exported so callers have one
// import surface for the gate's vocabulary.
export { parseFences } from './fences.mjs';

/** Normalize for byte-comparison: CRLF→LF and drop one trailing newline. Windows checkouts and
 *  editors differ on both, and neither difference means someone retyped the code. */
const norm = (s) => String(s).replace(/\r\n/g, '\n').replace(/\n$/, '');

/** Parse `lines=40-118` (or `lines=40`). Returns null when absent/malformed. */
function parseRange(spec) {
  if (!spec) return null;
  const m = /^(\d+)(?:-(\d+))?$/.exec(String(spec).trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : start;
  return end < start || start < 1 ? null : { start, end };
}

// ---------------------------------------------------------------------------------------------
// R3 — provenance
// ---------------------------------------------------------------------------------------------

/**
 * Every cited block must byte-match a fresh re-extraction from the repo.
 *
 * This is the check that makes "hand-typed code wearing a fence" structurally impossible to send.
 * A block that claims `path=` and then disagrees with the file is either stale (the file moved on)
 * or invented (someone typed it from memory) — and the gate cannot tell which, so it refuses and
 * shows the operator both sides.
 *
 * @param {object[]} blocks   from parseFences
 * @param {(p:string)=>string|null} readFile  injected reader; null => file absent
 */
export function checkProvenance(blocks, readFile) {
  const out = [];
  for (const b of blocks.filter((x) => x.cited)) {
    const src = readFile(b.attrs.path);
    if (src == null) {
      out.push(finding('R3', `block at line ${b.start} cites ${b.attrs.path} — file not found in repo`,
        `correct the path, or drop the block: the packet claims provenance it cannot prove`));
      continue;
    }
    const range = parseRange(b.attrs.lines);
    if (!range) {
      out.push(finding('R3', `block at line ${b.start} cites ${b.attrs.path} with no usable lines= range`,
        `add lines=<start>-<end> so the claim can be re-extracted and diffed`));
      continue;
    }
    const all = norm(src).split('\n');
    if (range.end > all.length) {
      out.push(finding('R3', `block at line ${b.start} cites ${b.attrs.path} L${range.start}-${range.end}, but the file has ${all.length} lines`,
        `re-extract at the current commit — the anchor is stale`));
      continue;
    }
    const expected = all.slice(range.start - 1, range.end).join('\n');
    if (norm(b.body) !== expected) {
      out.push(finding('R3', `block at line ${b.start} does not match ${b.attrs.path} L${range.start}-${range.end} (${firstDivergence(norm(b.body), expected)})`,
        `re-extract verbatim; never retype. Someone hand-typed or hand-"improved" this code`));
    }
  }
  return out;
}

/** Report the first differing line so a refusal is diagnosable in 30 seconds — an undiagnosable
 *  refusal becomes an ignored refusal (blueprint §5 item 3, refusal fatigue). */
function firstDivergence(got, want) {
  const g = got.split('\n');
  const w = want.split('\n');
  for (let i = 0; i < Math.max(g.length, w.length); i += 1) {
    if (g[i] !== w[i]) return `first divergence at block line ${i + 1}: packet ${JSON.stringify((g[i] ?? '<missing>').slice(0, 60))} vs repo ${JSON.stringify((w[i] ?? '<missing>').slice(0, 60))}`;
  }
  return 'lengths differ';
}

// ---------------------------------------------------------------------------------------------
// R4 — no artifact
// ---------------------------------------------------------------------------------------------

/**
 * If the remit asks about code, the packet must carry at least one cited code block.
 *
 * This is the rule that makes review-2 structurally unrepeatable. "Is this implementation
 * correct?" answered against a prose description of the implementation is not a review; it is
 * the model agreeing with your summary of yourself.
 *
 * `remitIsAboutCode` is decided by the caller from anchors (a named path/route/symbol) so the
 * judgment stays in one place and is testable.
 */
export function checkArtifact(remitIsAboutCode, blocks) {
  if (!remitIsAboutCode) return [];
  if (blocks.some((b) => b.cited)) return [];
  return [finding('R4', 'remit asks about code, but the packet contains no cited code block (```lang path=… lines=…)',
    'attach the source itself. A description of code is not code — that is the failure this gate exists to prevent')];
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
export function checkPremises(anchors, resolve) {
  const out = [];
  const warnings = [];

  for (const p of anchors.paths ?? []) {
    if (!resolve(p, 'path')) {
      out.push(finding('R5', `remit names path ${p} — 0 hits in repo`,
        `correct the path, or state explicitly that it is to be created`));
    }
  }
  for (const r of anchors.routes ?? []) {
    if (!resolve(r, 'route')) {
      out.push(finding('R5', `remit names route ${r} — 0 hits in repo`,
        `correct the route term. Reviewing phantoms is exactly how a paid review burned a finding on /unblock`));
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

/**
 * R15 — the gates themselves.
 *
 * Default-deny on tooling failure. A broken checker that exits 0 is precisely the "technically
 * green, substantively decorative" disease this whole gate exists to avoid, so a stale or red
 * canary run blocks every send until it is fixed.
 */
export function checkCanary(selftest, { maxAgeDays = 30, now = Date.now() } = {}) {
  if (!selftest) {
    return [finding('R15', 'no canary run on record — gates are presumed broken',
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  if (selftest.red > 0 || selftest.green !== selftest.total) {
    return [finding('R15', `canary suite red: ${selftest.green}/${selftest.total} green, ${selftest.red} red`,
      'fix the failing gate before sending anything. A gate that cannot be made to fail is presumed failed')];
  }
  const ageDays = (now - Date.parse(selftest.ranAt)) / 86_400_000;
  if (!Number.isFinite(ageDays)) {
    return [finding('R15', `canary record has an unparseable ranAt (${selftest.ranAt})`, 'run: node scripts/packet-gate/selftest.mjs')];
  }
  if (ageDays > maxAgeDays) {
    return [finding('R15', `canary run is ${Math.floor(ageDays)} days old (max ${maxAgeDays})`,
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  return [];
}
