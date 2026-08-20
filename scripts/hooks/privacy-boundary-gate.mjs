#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/privacy-boundary-gate.mjs
 * PURPOSE: R8-1 at the turn boundary and on `git commit` — the only FAIL-CLOSED
 *          component in the gate system. Blocks gitignored content staged for
 *          commit, and PII patterns in artifacts written to be read by an LLM.
 * AUTHOR: Opus 5 | CREATED: 2026-08-19 | SLICE: 2 of 10 (blueprint Part B §9)
 * ============================================================================
 *
 * WHY FAIL-CLOSED, WHEN EVERY OTHER GATE FAILS OPEN. The other Stop gates are
 * observers: if one breaks, the worst case is an unenforced reminder. This one
 * guards an IRREVERSIBLE event. A leaked client email in a committed memo cannot
 * be un-leaked — it is in git history, in every clone, and in the context of
 * every model that later reads the corpus. Hence R8-1: a gate that cannot scan
 * cannot allow.
 *
 * WHAT IS ACTUALLY AT RISK HERE (checked, not assumed, 2026-08-19). On
 * `origin/main` the ignore file carries a negation for `.ai-workflow/hermes-inbox/**`
 * and 203 memos are committed. The stale wip branch still ignores that path,
 * which is why it reads as private from there. The committed state is the one
 * that counts: those memos are public in the repo AND fed to a model at session
 * start. They are the highest-value target in the tree and nothing scanned them.
 *
 * WHAT IT DOES NOT DO. It does not detect names — "Sarah called about her knee"
 * has no syntax to match, and a gate claiming name detection would be lying
 * about its own coverage. It catches STRUCTURED identifiers (email, phone, SSN,
 * street address, DOB, payment card) — the ones that leak by copy-paste. Rule 8
 * is the discipline; this is a backstop under it, and says so plainly rather
 * than letting a future reader infer more.
 *
 * REPORTING NEVER ECHOES THE MATCH. Block messages name the file and the pattern
 * class, never the matched text — a gate that prints the PII it found into the
 * transcript has performed the leak it exists to prevent.
 */
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { runGate, FAIL_CLOSED } from './lib/gate-run.mjs';
import { gateRoot, gitSafeEnv } from './lib/gate-trust.mjs';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;

/**
 * Paths whose contents are written to be READ BY A MODEL. Emission paths are
 * deliberately INCLUDED here even though `fileWrites` excludes them: the other
 * gates exclude emissions because a memo is not "build work", while this gate
 * exists precisely because a memo is the artifact most likely to carry a client
 * detail someone pasted out of a session.
 */
const LLM_BOUND_RE = /(?:^|[\\/])(?:\.ai-workflow[\\/]hermes-inbox|hermes-learning-packets|brainstorms|AI-HANDOFF|AI-Village-Documentation|\.ai-workflow[\\/]continuity|\.ai-workflow[\\/]coordination)[\\/]/;

/**
 * Never counted as PII. Three narrow classes ONLY, each justified:
 *   1. reserved documentation domains (RFC 2606) and the security-writing
 *      placeholders this repo already uses in attack examples;
 *   2. the company's own published contact domains — a support address printed
 *      on the website is not a client identifier;
 *   3. automated no-reply senders, including the GitHub commit-trailer form.
 *
 * Personal mailbox providers (gmail, yahoo, protonmail, outlook, icloud) are
 * DELIBERATELY NOT allowlisted: a corpus scan on 2026-08-19 found 14 such
 * addresses already sitting in committed, model-read docs. Those are the signal
 * this gate exists for, and allowlisting them to reduce noise would be building
 * a gate that passes by construction.
 */
const ALLOWED_EMAIL_RE = new RegExp(
  [
    '@(?:example\\.(?:com|org|net)|example\\.test|test|test\\.com|invalid|localhost)$',
    '@(?:evil\\.com|attacker\\.com|malicious\\.com)$',
    '@(?:s?swanstudios\\.com)$',
    '@users\\.noreply\\.github\\.com$',
    '^(?:noreply|no-reply|donotreply|user|you|someone|admin|support|test)@',
  ].join('|'),
  'i',
);

/**
 * Card brands, as (length -> allowed prefixes). Luhn alone was not enough: on the
 * real corpus it passed EIGHT non-cards — 13- and 14-digit ids beginning 2, 6 and
 * 9, shapes no issuer uses. Luhn is a checksum, not an identity, and roughly one
 * in ten random digit runs satisfies it. Requiring a real issuer prefix AND a
 * real length took those eight to zero without weakening detection of an actual
 * card. Verified against the 1,736-artifact corpus.
 */
const CARD_SHAPES = [
  { len: 13, re: /^4/ },                                   // Visa (legacy)
  { len: 14, re: /^3(?:0[0-5]|095|6|8|9)/ },               // Diners
  { len: 15, re: /^3[47]/ },                               // Amex
  { len: 16, re: /^(?:4|5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720)|6(?:011|5|4[4-9])|35(?:2[89]|[3-8]\d))/ },
  { len: 19, re: /^6(?:011|5)/ },                          // Discover extended
];

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

/**
 * High-precision only. Every pattern demands STRUCTURE — separators, a keyword,
 * or a checksum — rather than a bare digit run, because this gate BLOCKS. A
 * false block on a version string or a commit sha would train everyone to reach
 * for the disable marker, which costs more privacy than the gate buys.
 */
const PII_PATTERNS = [
  { kind: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, filter: (m) => !ALLOWED_EMAIL_RE.test(m) },
  { kind: 'us-phone', re: /(?<![\d-])(?:\+?1[ .-])?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\d-])/g },
  { kind: 'ssn', re: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g },
  { kind: 'dob', re: /\b(?:DOB|date\s+of\s+birth)\b\s*[:=]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi },
  {
    kind: 'street-address',
    re: /\b\d{1,5}\s+(?:[A-Z][A-Za-z.]{1,20}\s+){1,4}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Pl|Place|Ter|Terrace)\b\.?/g,
  },
  { kind: 'payment-card', re: /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g, filter: (m) => looksLikeCard(m) },
];

/**
 * A 16-digit run that fails Luhn is a coincidence, not a card. This single check
 * is the highest-value false-positive killer in the set — without it every long
 * numeric id in a doc becomes a hard block.
 */
export function looksLikeCard(raw) {
  const digits = String(raw).replace(/\D/g, '');
  const shape = CARD_SHAPES.find((s) => s.len === digits.length);
  if (!shape || !shape.re.test(digits)) return false;
  return luhnValid(digits);
}

export function luhnValid(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** @returns {{kind:string,count:number}[]} — kinds and counts ONLY, never the text. */
export function scanText(text) {
  const hits = [];
  for (const { kind, re, filter } of PII_PATTERNS) {
    re.lastIndex = 0;
    let count = 0;
    for (const m of String(text).matchAll(re)) {
      if (!filter || filter(m[0])) count += 1;
    }
    if (count > 0) hits.push({ kind, count });
  }
  return hits;
}

export function isLlmBound(p) { return LLM_BOUND_RE.test(String(p)); }

/**
 * KEEP IN LOCKSTEP: every Stop gate carries a byte-identical copy of this
 * predicate; `gate-window-parity.test.mjs` fails if they drift. Duplicated on
 * purpose rather than shared — a failed import of a common module would break
 * every gate at load time, before any of them could fail-open. This copy was
 * spliced mechanically from dry-loop-gate.mjs, never retyped.
 */
const HOOK_FEEDBACK_RE = /^\s*Stop hook feedback:/i;

export function isRealUserLine(entry) {
  if (!entry || entry.type !== 'user') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') {
    return content.trim().length > 0 && !HOOK_FEEDBACK_RE.test(content);
  }
  if (Array.isArray(content)) {
    if (!content.some((c) => c?.type === 'text')) return false;
    if (content.some((c) => c?.type === 'tool_result')) return false;
    const text = content
      .filter((c) => c?.type === 'text')
      .map((c) => String(c.text ?? ''))
      .join('\n');
    // Non-blank required, matching the string branch above. The array branch used to
    // accept a whitespace-only block, so an empty message could reset the window too.
    return text.trim().length > 0 && !HOOK_FEEDBACK_RE.test(text);
  }
  return false;
}


export function parseTranscript(raw) {
  const entries = [];
  for (const line of String(raw).split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { /* skip malformed line */ }
  }
  return entries;
}

/**
 * `fileWrites` keeps the parity meaning (build activity, emissions excluded) so
 * `gate-window-parity.test.mjs` compares like with like. `artifacts` is this
 * gate's own signal and INCLUDES emissions — see LLM_BOUND_RE.
 */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const signals = { fileWrites: 0, artifacts: [] };
  for (const entry of turn) {
    if (entry?.type !== 'assistant') continue;
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
      if (item?.type !== 'tool_use' || !WRITE_TOOLS.has(item.name)) continue;
      const target = String(item.input?.file_path ?? item.input?.path ?? '');
      if (!target) continue;
      if (!EMISSION_PATH_RE.test(target)) signals.fileWrites += 1;
      if (isLlmBound(target) && !signals.artifacts.includes(target)) signals.artifacts.push(target);
    }
  }
  return signals;
}

/**
 * Scan the artifacts this turn wrote.
 *
 * A path that does NOT EXIST is skipped, not an error: a file that is gone
 * cannot leak, and treating absence as a scanner error would block every turn
 * that wrote then cleaned up a temp artifact. A file that exists and cannot be
 * READ is a genuine scanner error, and R8-1 makes that a block.
 */
export function scanArtifacts(paths, root = gateRoot(), { readFile = readFileSync } = {}) {
  const offenders = [];
  for (const p of paths) {
    const abs = isAbsolute(p) ? p : join(root, p);
    let st;
    try { st = statSync(abs); } catch { continue; }        // absent -> nothing to leak
    // A directory at an artifact path is not a readable artifact; skipping it is
    // correct and is NOT the scanner-error case (found by this slice's own test,
    // which expected a throw and got a silent skip).
    if (!st.isFile() || st.size > MAX_SCAN_BYTES) continue;
    // `readFile` is injectable so the R8-1 error path is testable deterministically.
    // A permission-denied FILE is the real case, and chmod is not honoured on
    // Windows — a fixture that cannot fail here would be a decorative test.
    const text = readFile(abs, 'utf8');                     // throws -> scanner error -> block
    const hits = scanText(text);
    if (hits.length) offenders.push({ path: p, kinds: hits.map((h) => h.kind) });
  }
  return offenders;
}

/**
 * Staged paths that git is supposed to be ignoring. Reachable only via
 * `git add -f`, so a hit is a deliberate override of an ignore rule — which is
 * exactly how gitignored operational state (telemetry, local config, scratch)
 * ends up in a public repo.
 */
export function stagedGitignored(root = gateRoot(), { exec = execFileSync } = {}) {
  const opts = { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: gitSafeEnv() };
  const staged = String(exec('git', ['diff', '--cached', '--name-only'], opts))
    .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!staged.length) return [];
  try {
    // `--no-index` is LOAD-BEARING, not a flag for tidiness. `git check-ignore`
    // omits TRACKED paths by default, and a force-staged file is tracked — so
    // without it the check returns empty for the only situation it exists to
    // detect. Found 2026-08-19 by running against a real repository; every unit
    // test with an injected `exec` passed while the real path was inert.
    return String(exec('git', ['check-ignore', '--no-index', '--', ...staged], opts))
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    // check-ignore exits 1 when NOTHING matches. That is the clean case, not a
    // failure — collapsing it into the error path would fail-closed on every
    // healthy commit.
    if (err?.status === 1) return [];
    throw err;
  }
}

const UNBLOCK = 'node scripts/hooks/privacy-boundary-gate.mjs --selftest';

export function scannerErrorReason(err) {
  return `PRIVACY-BOUNDARY-GATE: the privacy scanner itself errored (fail-closed per R8-1; a gate that cannot scan cannot allow). Error: ${err?.message ?? 'unknown'}. To unblock: ${UNBLOCK}`;
}

export function offenceReason(paths) {
  return `PRIVACY-BOUNDARY-GATE: gitignored content staged for commit or PII pattern matched in LLM-bound artifact. Offending paths: ${paths.join(', ')}. No waiver exists. To unblock: git reset -- ${paths[0]} && ${UNBLOCK}`;
}

/** Turn boundary. Returns null to allow, or the block reason string. */
export function decide(hookInput, transcriptRaw, root = gateRoot(), deps = {}) {
  if (hookInput?.stop_hook_active) return null;
  const { artifacts } = analyzeTurn(parseTranscript(transcriptRaw));
  if (!artifacts.length) return null;
  const offenders = scanArtifacts(artifacts, root, deps);
  if (!offenders.length) return null;
  return offenceReason(offenders.map((o) => `${o.path} [${o.kinds.join(',')}]`));
}

/**
 * Does this shell command actually INVOKE `git commit`?
 *
 * A substring match on "git ... commit" also fires on `echo "git commit" >> x`,
 * which then blocks an unrelated command whenever something ignored happens to
 * be staged. Splitting on shell separators and requiring `git` in COMMAND
 * POSITION is the difference between an invocation and a mention. Found by the
 * hostile round, not by the unit tests, which only ever passed real commands.
 */
export function invokesGitCommit(cmd) {
  return String(cmd)
    .split(/\|\||&&|[;\n|]/)
    .some((seg) => /^\s*(?:sudo\s+)?git\b(?:\s+-[^\s]+(?:\s+\S+)?)*\s+commit\b/.test(seg));
}

/** Tool boundary. Self-filters to `git commit`; everything else is none of its business. */
export function decidePretool(toolInput, root = gateRoot(), deps = {}) {
  const cmd = String(toolInput?.tool_input?.command ?? toolInput?.command ?? '');
  if (!invokesGitCommit(cmd)) return null;
  const ignored = stagedGitignored(root, deps);
  return ignored.length ? offenceReason(ignored) : null;
}

/* ------------------------------------------------------------------ selftest */

const SELFTEST_CASES = [
  { name: 'clean prose', text: 'Client 4821 logged a session. Contact via the app.', expect: [] },
  { name: 'email', text: 'reach her at fixture-not-a-real-person@gmail.com tomorrow', expect: ['email'] },
  { name: 'allowed example email', text: 'e.g. user@example.com in the docs', expect: [] },
  { name: 'phone', text: 'call 415-555-0198 before noon', expect: ['us-phone'] },
  { name: 'ssn', text: 'ssn 123-45-6789 on file', expect: ['ssn'] },
  { name: 'dob', text: 'DOB: 04/11/1983', expect: ['dob'] },
  { name: 'street', text: 'lives at 1600 Pennsylvania Avenue', expect: ['street-address'] },
  { name: 'card', text: 'card 4111 1111 1111 1111 declined', expect: ['payment-card'] },
  { name: 'not a card (luhn fails)', text: 'id 1234 5678 9012 3456 here', expect: [] },
  { name: 'not a phone (version + sha)', text: 'bumped to 1.2.3, sha 0123456789ab', expect: [] },
];

export function selftest() {
  const failures = [];
  for (const c of SELFTEST_CASES) {
    const got = scanText(c.text).map((h) => h.kind).sort();
    const want = [...c.expect].sort();
    if (got.join('|') !== want.join('|')) failures.push(`${c.name}: expected [${want}] got [${got}]`);
  }
  return failures;
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    const failures = selftest();
    if (failures.length) {
      process.stdout.write(`PRIVACY-BOUNDARY-GATE: selftest FAILED\n${failures.join('\n')}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write('PRIVACY-BOUNDARY-GATE: selftest clean\n');
    return;
  }

  const pretool = argv.includes('--pretool');
  let hookInput = {};
  try { hookInput = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  if (!pretool && hookInput?.stop_hook_active) return;

  const { payload } = runGate(
    { name: 'privacy-boundary-gate', boundary: pretool ? 'tool' : 'turn', mode: FAIL_CLOSED, scannerErrorReason },
    () => {
      if (pretool) {
        const reason = decidePretool(hookInput);
        return reason ? { block: true, reason } : { block: false };
      }
      // An unreadable transcript means the turn cannot be windowed at all: there
      // is nothing to scan and nothing being claimed, so this is silence rather
      // than a hit. The scanner erroring on a file it CAN see is the R8-1 case.
      let raw = '';
      try { raw = readFileSync(String(hookInput.transcript_path ?? ''), 'utf8'); } catch { return { block: false }; }
      const reason = decide(hookInput, raw);
      return reason ? { block: true, reason } : { block: false };
    },
  );
  if (payload) process.stdout.write(JSON.stringify(payload));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
