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

// One source of truth for the codes — ./refusal.mjs — so checks.mjs and canary.mjs cannot drift
// into two vocabularies. Re-exported here because callers import the gate's vocabulary from checks.
import { REFUSALS } from './refusal.mjs';

export { REFUSALS };

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

  // FENCE-AWARE. A `## Remit` heading or a `remit:` line INSIDE a code fence is sample content,
  // not the packet's question. Without this, a packet that merely documents a remit (a YAML sample,
  // a quoted example) hijacks extraction and the gate evaluates text the model was never asked.
  const outside = [];
  let fence = null;
  for (const line of lines) {
    const m = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (m) {
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === '') fence = null;
      outside.push(null);
      continue;
    }
    outside.push(fence ? null : line);
  }

  const i = outside.findIndex((l) => l !== null && /^#{2,}\s*remit\s*$/i.test(l.trim()));
  if (i !== -1) {
    const rest = outside.slice(i + 1);
    const stop = rest.findIndex((l) => l !== null && /^#{1,6}\s/.test(l));
    return (stop === -1 ? rest : rest.slice(0, stop)).filter((l) => l !== null).join('\n').trim();
  }
  const fm = outside.find((l) => l !== null && /^remit:\s*.+$/i.test(l));
  return fm ? /^remit:\s*(.+)$/i.exec(fm)[1].trim() : '';
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
/** Reject a cited path before it is ever read. `path=""` resolved to the repo ROOT and threw an
 *  uncaught EISDIR — a stack trace instead of a refusal, which is the least diagnosable failure a
 *  gate can produce. `path=../../.env` escaped the repo entirely and would have been read and
 *  diffed. Both found by Kimi K3, 2026-08-14. Lexical check, so it stays pure. */
function badPath(p) {
  if (typeof p !== 'string' || p.trim() === '') return 'empty path';
  const norm = p.replaceAll('\\', '/');
  if (/^([A-Za-z]:)?\//.test(norm)) return 'absolute path';
  if (norm.split('/').includes('..')) return 'path escapes the repo (..)';
  return null;
}

export function checkProvenance(blocks, readFile) {
  const out = [];
  for (const b of blocks.filter((x) => x.cited)) {
    const bad = badPath(b.attrs.path);
    if (bad) {
      out.push(finding('R3', `block at line ${b.start} cites an unusable path (${bad}): ${JSON.stringify(b.attrs.path)}`,
        'cite a repo-relative path inside the repository'));
      continue;
    }
    // The injected reader touches the filesystem and can throw (EISDIR on a directory, EACCES,
    // a FIFO). An I/O error is a refusal with a reason, never an uncaught stack trace.
    let src;
    try {
      src = readFile(b.attrs.path);
    } catch (err) {
      out.push(finding('R3', `block at line ${b.start} cites ${b.attrs.path} — cannot read it (${err.code ?? err.message})`,
        'cite a readable file; the packet claims provenance the gate cannot verify'));
      continue;
    }
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
    // Normalize BOTH sides identically. Normalizing only the packet body made the comparison
    // asymmetric: a file whose cited range ends on a trailing blank line produced an `expected`
    // ending in "\n" that the body — which markdown fences cannot represent — could never match, so
    // R3 refused every full-file citation of such a file. Found by running the packet BUILDER's own
    // output through the gate: it refused a byte-exact extraction it had just produced.
    const expected = norm(all.slice(range.start - 1, range.end).join('\n'));
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
/** A cited block counts as CODE only if it is not prose. Citing `path=docs/notes.md` satisfied the
 *  letter of R4 while carrying zero bytes of code — the one check whose entire purpose is "a
 *  description of code is not code" was cleared by attaching a description. Kimi K3, 2026-08-14. */
const PROSE_EXT = /\.(md|mdx|markdown|txt|rst|adoc)$/i;
const PROSE_LANG = /^(md|mdx|markdown|text|txt|rst|adoc|)$/i;
export const isCodeBlock = (b) => b.cited && !PROSE_EXT.test(b.attrs.path ?? '') && !PROSE_LANG.test(b.lang ?? '');

export function checkArtifact(remitIsAboutCode, blocks, namedPaths = []) {
  if (!remitIsAboutCode) return [];
  const codeBlocks = blocks.filter(isCodeBlock);
  if (!codeBlocks.length) {
    const citedProse = blocks.filter((b) => b.cited).length;
    return [finding('R4', `remit asks about code, but the packet contains no cited CODE block${citedProse ? ` (${citedProse} cited block(s) are prose — markdown/text paths do not satisfy this)` : ' (```lang path=… lines=…)'}`,
      'attach the source itself. A description of code is not code — that is the failure this gate exists to prevent')];
  }

  // BIND THE ARTIFACT TO THE REMIT. One cited block used to satisfy R4 for a remit about a
  // completely different file: cite two real lines of some unrelated util, then hand-type fences
  // purporting to be the file actually under review. R3 verifies the decoy, R4 goes green, and the
  // real source lends credibility to the fabrication. (Kimi K3 round 2, finding 2.)
  if (namedPaths.length) {
    const cite = (p) => String(p).replaceAll('\\', '/');
    const hit = codeBlocks.some((b) => namedPaths.some((n) => {
      const a = cite(b.attrs.path); const w = cite(n);
      return a === w || a.endsWith(`/${w}`) || w.endsWith(`/${a}`);
    }));
    if (!hit) {
      return [finding('R4', `remit names ${namedPaths.join(', ')}, but no cited block quotes any of them (cited: ${codeBlocks.map((b) => b.attrs.path).join(', ')})`,
        'cite the file the remit is actually about — an unrelated real block does not verify the file under review')];
    }
  }
  return [];
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

// R15 lives in ./canary.mjs (rule 4: 300-line cap). Re-exported for one import surface.
export { checkCanary } from './canary.mjs';
