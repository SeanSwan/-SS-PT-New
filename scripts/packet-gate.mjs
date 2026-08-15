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
import { parseFences, remitFromDoc, checkProvenance, checkArtifact, checkPremises, checkSize, checkHygiene, checkCanary } from './packet-gate/checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = path.join(ROOT, 'out', 'packet-gate', 'selftest.json');

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
  if (!Number.isFinite(a.budgetChars) || !Number.isFinite(a.overheadChars)) a.bad = true;
  return a;
}

/**
 * Repo lookup for R5. Paths resolve on disk; routes and symbols must appear in TRACKED, NON-PROSE
 * content.
 *
 * MARKDOWN IS EXCLUDED ON PURPOSE. A premise must resolve in code, not in a description of code.
 * Verified during the hostile pass: `/api/client/analytics-summary` and
 * `/api/immigration/study-sessions` appear ONLY in markdown under docs/ and exist nowhere in the
 * implementation. Resolving against prose would let R5 bless exactly the phantom it exists to
 * catch — a route that was designed, written up, and never built. Documentation of intent is not
 * evidence of existence.
 *
 * `git grep` also restricts us to TRACKED files, so an untracked scratch file cannot vouch for a
 * premise either.
 *
 * NOTE for future maintainers: this MUST keep spawning git without a shell. Under Git Bash, MSYS
 * path conversion rewrites a leading-slash argument (`/api/sessions`) into a Windows path before
 * git sees it, and every route lookup silently returns "no hit" — turning R5 into a false-refusal
 * machine. `execFileSync` with an argv array bypasses the shell and is not affected. There is a
 * regression test pinning a real route to `true` precisely so this cannot rot back.
 */
const PROSE_EXCLUDES = [':(exclude)*.md', ':(exclude)*.mdx', ':(exclude)*.txt'];

function makeResolver(root) {
  return (needle, kind) => {
    if (kind === 'path') return existsSync(path.join(root, needle));
    try {
      execFileSync('git', ['grep', '--quiet', '--fixed-strings', '--', needle, '--', ...PROSE_EXCLUDES], { cwd: root, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}

/** Secret/PII scan of the ASSEMBLED packet, via the repo's existing scanner in stdin mode.
 *  Fail-closed: if the scanner cannot run, we do not get to call the packet clean. */
function scanSecrets(root, content) {
  try {
    execFileSync('bash', [path.join(root, 'scripts', 'scan-secrets.sh'), '--stdin'], {
      cwd: root, input: content, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8',
    });
    return { ok: true, lines: [] };
  } catch (err) {
    if (err.code === 'ENOENT') return { ok: false, lines: ['scanner unavailable (bash not found) — failing closed'] };
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    return { ok: false, lines: out ? out.split('\n').filter(Boolean).slice(0, 20) : ['scanner reported a hit (no detail captured)'] };
  }
}

function loadSelftest() {
  if (!existsSync(SELFTEST)) return null;
  try { return JSON.parse(readFileSync(SELFTEST, 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.document) {
    console.error('packet-gate: --document <path> is required');
    return 2;
  }
  if (args.bad) {
    console.error('packet-gate: --budget-chars and --overhead-chars must be numbers');
    return 2;
  }
  const docPath = path.resolve(ROOT, args.document);
  if (!existsSync(docPath)) {
    console.error(`packet-gate: document not found: ${args.document}`);
    return 2;
  }
  const md = readFileSync(docPath, 'utf8');

  // --- Gate 0: R15. If the gates are not provably working, nothing else here can be believed. ---
  const canary = checkCanary(loadSelftest());
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

  // The assembled prompt, not the document alone — see TRANSPORT_OVERHEAD_CHARS.
  const seedText = args.seed && existsSync(path.resolve(ROOT, args.seed)) ? readFileSync(path.resolve(ROOT, args.seed), 'utf8') : '';
  const assembled = {
    doc: md.length,
    seed: seedText.length,
    overhead: args.overheadChars,
    chars: md.length + seedText.length + args.overheadChars,
    bytes: Buffer.byteLength(md, 'utf8') + Buffer.byteLength(seedText, 'utf8') + args.overheadChars,
  };

  const premises = checkPremises(anchors, resolve);
  const findings = [
    ...premises.findings,
    ...checkArtifact(aboutCode, blocks),
    ...checkProvenance(blocks, (p) => (existsSync(path.join(ROOT, p)) ? readFileSync(path.join(ROOT, p), 'utf8') : null)),
    ...checkHygiene(scanSecrets(ROOT, md)),
    ...checkSize(assembled.chars, args.budgetChars),
  ];

  let usd = null;
  try {
    const provider = getProvider(args.provider);
    usd = estimateCost(provider, assembled.bytes, args.maxTokens);
  } catch { /* unknown provider is not a v1 refusal code; the preflight just omits the estimate */ }

  // R4 is satisfied by ONE cited block, so a packet can pair real source with hand-typed fences the
  // model will read as equally authoritative. Refusing would punish legitimate illustrative
  // snippets and breed refusal fatigue, so v1 surfaces it instead of blocking — the operator sees
  // exactly how much of what they are sending is unverified. Promote to a refusal only if measured
  // abuse justifies it (blueprint R16, deferred until measured).
  const uncitedCode = blocks.filter((b) => !b.cited && b.lang && !/^(text|txt|md|markdown|json|yaml|yml)$/i.test(b.lang));
  const warnings = [...premises.warnings];
  if (aboutCode && uncitedCode.length) {
    warnings.push(`${uncitedCode.length} uncited code fence(s) at line(s) ${uncitedCode.map((b) => b.start).join(', ')} — NOT byte-verified; the model cannot tell them from the cited source`);
  }

  return report({
    args, findings, warnings,
    stats: { assembled, blocks, anchors, aboutCode, usd, remit },
  });
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

const BAR = '='.repeat(78);
const bar = '-'.repeat(78);

function report({ args, findings, warnings, stats, gate0 = false }) {
  if (args.json) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings, warnings, assembled: stats?.assembled ?? null }, null, 2));
    return findings.length ? 1 : 0;
  }

  if (findings.length) {
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

  const cited = stats.blocks.filter((b) => b.cited).length;
  console.log(BAR);
  console.log('PACKET READY — NOT SENT');
  console.log(`document: ${args.document}`);
  console.log(bar);
  console.log(`ARTIFACTS   ${cited} cited block(s), all byte-verified against the repo [ok]`);
  console.log(`PREMISES    ${stats.anchors.paths.length} path(s), ${stats.anchors.routes.length} route(s) — all resolved [ok]`);
  console.log(`REMIT       ${stats.aboutCode ? 'about code — cited artifact present [ok]' : 'not code-specific — artifact not required'}`);
  console.log(`HYGIENE     secrets/PII scan: clean [ok]`);
  const A = stats.assembled;
  console.log(`SIZE        ${A.chars.toLocaleString()} chars <= ${args.budgetChars.toLocaleString()} budget [ok]`);
  console.log(`            = doc ${A.doc.toLocaleString()} + seed ${A.seed.toLocaleString()} + transport overhead ${A.overhead.toLocaleString()}`);
  for (const w of warnings) console.log(`WARN        ${w}`);
  console.log(bar);
  console.log('PREFLIGHT (0 model calls)');
  console.log(`   model_calls=0  provider=${args.provider}  prompt_chars=${A.chars}  max_tokens=${args.maxTokens}`);
  if (stats.usd != null) console.log(`   worst_case_usd=~$${stats.usd.toFixed(4)}`);
  console.log(bar);
  console.log('>>> STOPS HERE. Spend approval is human.');
  console.log(`send: node scripts/consult-${args.provider}.mjs --document ${args.document} --out <reviews/…md>`);
  console.log(BAR);
  return 0;
}

process.exit(main());
